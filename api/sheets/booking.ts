import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { appendRow, readRange, updateRow, deleteRowByIndex, ensureSheetTab, ensureHeaders, SHEETS } from '../lib/sheets';
import { BOOKING_COLS } from '../lib/schema';

const BOOKING_TYPES = new Set(['hotel', 'flight', 'activity', 'transfer']);

type BookingRow = {
  id: string;
  type: 'hotel' | 'flight' | 'activity' | 'transfer';
  title: string;
  booking_ref: string;
  agent: string;
  address: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  amount: number;
  currency: 'THB' | 'INR';
  amount_thb: number;
  amount_inr: number;
  note: string;
  cost_on: 'start' | 'end';
  extras: any;
  created_at: number;
};

function genId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function parseBody(req: VercelRequest): any {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body ?? {};
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

function validate(body: any, fxRate: number): BookingRow | { error: string } {
  const type = (body?.type ?? '').toString();
  if (!BOOKING_TYPES.has(type)) return { error: 'invalid type' };

  const amount = parseFloat(body?.amount);
  if (!Number.isFinite(amount) || amount < 0) return { error: 'invalid amount' };

  const currency = (body?.currency ?? 'THB').toString().toUpperCase();
  if (currency !== 'THB' && currency !== 'INR') return { error: 'invalid currency' };

  const start_date = (body?.start_date ?? '').toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) return { error: 'invalid start_date' };

  const end_date = (body?.end_date ?? '').toString() || start_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date)) return { error: 'invalid end_date' };

  const amount_thb = currency === 'THB' ? amount : (fxRate > 0 ? amount / fxRate : 0);
  const amount_inr = currency === 'INR' ? amount : amount * fxRate;

  return {
    id: body?.id && typeof body.id === 'string' ? body.id : genId(),
    type: type as BookingRow['type'],
    title: (body?.title ?? '').toString(),
    booking_ref: (body?.booking_ref ?? '').toString(),
    agent: (body?.agent ?? '').toString(),
    address: (body?.address ?? '').toString(),
    start_date,
    end_date,
    start_time: (body?.start_time ?? '').toString(),
    end_time: (body?.end_time ?? '').toString(),
    amount,
    currency: currency as 'THB' | 'INR',
    amount_thb: Math.round(amount_thb * 100) / 100,
    amount_inr: Math.round(amount_inr * 100) / 100,
    note: (body?.note ?? '').toString(),
    cost_on: body?.cost_on === 'end' ? 'end' : 'start',
    extras: body?.extras ?? {},
    created_at: Number.isFinite(parseInt(body?.created_at)) ? parseInt(body.created_at) : Date.now(),
  };
}

function toRowArray(b: BookingRow): (string | number)[] {
  return [
    b.id, b.type, b.title, b.booking_ref, b.agent, b.address,
    b.start_date, b.end_date, b.start_time, b.end_time,
    b.amount, b.currency, b.amount_thb, b.amount_inr, b.note,
    b.cost_on, JSON.stringify(b.extras || {}), b.created_at,
  ];
}

async function findRowIndexById(id: string): Promise<number | null> {
  const rows = await readRange(`${SHEETS.bookings}!A:A`);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] ?? '').toString() === id) return i;
  }
  return null;
}

async function ensureBookingsTab(): Promise<void> {
  await ensureSheetTab(SHEETS.bookings);
  await ensureHeaders(SHEETS.bookings, BOOKING_COLS);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'POST') {
      await ensureBookingsTab();
      const body = parseBody(req);
      const fx = await getFxRate();
      const built = validate(body, fx);
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      await appendRow(SHEETS.bookings, toRowArray(built));
      res.status(200).json({ booking: built });
      return;
    }

    if (req.method === 'PATCH') {
      await ensureBookingsTab();
      const body = parseBody(req);
      if (!body?.id) {
        res.status(400).json({ error: 'missing id' });
        return;
      }
      const fx = await getFxRate();
      const built = validate(body, fx);
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      const idx = await findRowIndexById(body.id);
      if (idx == null) {
        res.status(404).json({ error: 'booking not found' });
        return;
      }
      await updateRow(SHEETS.bookings, idx + 1, toRowArray(built));
      res.status(200).json({ booking: built });
      return;
    }

    if (req.method === 'DELETE') {
      const id = (req.query?.id as string) || parseBody(req)?.id;
      if (!id) {
        res.status(400).json({ error: 'missing id' });
        return;
      }
      const idx = await findRowIndexById(id);
      if (idx == null) {
        res.status(404).json({ error: 'booking not found' });
        return;
      }
      await deleteRowByIndex(SHEETS.bookings, idx);
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets write failed', details: e?.message ?? String(e) });
  }
}
