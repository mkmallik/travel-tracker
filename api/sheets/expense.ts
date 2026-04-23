import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { appendRow, readRange, updateRow, deleteRowByIndex, SHEETS } from '../lib/sheets';
import { EXPENSE_COLS } from '../lib/schema';

type Expense = {
  id: string;
  date: string;
  day_num: number | null;
  category: string;
  amount: number;
  currency: 'THB' | 'INR';
  amount_thb: number;
  amount_inr: number;
  note: string;
  created_at: number;
};

const ALLOWED_CATEGORIES = new Set([
  'Flights', 'Hotels', 'Ferry', 'Train', 'Cabs', 'Food', 'Shopping', 'Activities', 'Others',
]);

function genId(): string {
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  );
}

function toRowArray(e: Expense): (string | number)[] {
  return [
    e.id,
    e.date,
    e.day_num == null ? '' : e.day_num,
    e.category,
    e.amount,
    e.currency,
    e.amount_thb,
    e.amount_inr,
    e.note,
    e.created_at,
  ];
}

function parseBody(req: VercelRequest): any {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body ?? {};
}

async function findRowIndexById(id: string): Promise<number | null> {
  // rows[0] = header; data starts at index 1, which is row 2 in sheet (1-based)
  const rows = await readRange(`${SHEETS.expenses}!A:A`);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] ?? '').toString() === id) return i; // 0-based offset incl. header
  }
  return null;
}

function validate(body: any, fxRate: number): Expense | { error: string } {
  const amount = parseFloat(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'invalid amount' };

  const currency = (body?.currency ?? 'THB').toString().toUpperCase();
  if (currency !== 'THB' && currency !== 'INR') return { error: 'invalid currency' };

  const category = (body?.category ?? '').toString();
  if (!ALLOWED_CATEGORIES.has(category)) return { error: 'invalid category' };

  const date = (body?.date ?? '').toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'invalid date (need YYYY-MM-DD)' };

  const dayNumRaw = body?.day_num;
  const day_num =
    dayNumRaw === null || dayNumRaw === undefined || dayNumRaw === ''
      ? null
      : parseInt(String(dayNumRaw), 10);

  const amount_thb = currency === 'THB' ? amount : (fxRate > 0 ? amount / fxRate : 0);
  const amount_inr = currency === 'INR' ? amount : amount * fxRate;

  return {
    id: body?.id && typeof body.id === 'string' ? body.id : genId(),
    date,
    day_num: Number.isFinite(day_num as number) ? (day_num as number) : null,
    category,
    amount,
    currency: currency as 'THB' | 'INR',
    amount_thb: Math.round(amount_thb * 100) / 100,
    amount_inr: Math.round(amount_inr * 100) / 100,
    note: (body?.note ?? '').toString(),
    created_at: Number.isFinite(parseInt(body?.created_at)) ? parseInt(body.created_at) : Date.now(),
  };
}

async function getFxRate(): Promise<number> {
  const rows = await readRange(`${SHEETS.settings}!A:B`);
  for (const r of rows.slice(1)) {
    if ((r?.[0] ?? '').toString() === 'fx_inr_per_thb') {
      const n = parseFloat((r?.[1] ?? '0').toString());
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 2.45;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'POST') {
      const body = parseBody(req);
      const fx = await getFxRate();
      const built = validate(body, fx);
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      await appendRow(SHEETS.expenses, toRowArray(built));
      res.status(200).json({ expense: built });
      return;
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req);
      const id = body?.id;
      if (!id) {
        res.status(400).json({ error: 'missing id' });
        return;
      }
      const fx = await getFxRate();
      const built = validate({ ...body, id }, fx);
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      const idx = await findRowIndexById(id);
      if (idx == null) {
        res.status(404).json({ error: 'expense not found' });
        return;
      }
      await updateRow(SHEETS.expenses, idx + 1, toRowArray(built));
      res.status(200).json({ expense: built });
      return;
    }

    if (req.method === 'DELETE') {
      const id =
        (req.query?.id as string) || parseBody(req)?.id;
      if (!id) {
        res.status(400).json({ error: 'missing id' });
        return;
      }
      const idx = await findRowIndexById(id);
      if (idx == null) {
        res.status(404).json({ error: 'expense not found' });
        return;
      }
      await deleteRowByIndex(SHEETS.expenses, idx);
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets write failed', details: e?.message ?? String(e) });
  }
}
