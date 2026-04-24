import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { appendRow, readRange, updateRow, deleteRowByIndex, ensureSheetTab, ensureHeaders, SHEETS } from '../lib/sheets';
import { TRIP_COLS } from '../lib/schema';

type TripRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  home_currency: string;
  local_currency: string;
  fx_rate: number;
  cover_image_url: string;
  status: 'planning' | 'active' | 'completed';
  note: string;
  created_at: number;
};

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function parseBody(req: VercelRequest): any {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body ?? {};
}

async function findRowIndexById(id: string): Promise<number | null> {
  const rows = await readRange(`${SHEETS.trips}!A:A`);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] ?? '').toString() === id) return i;
  }
  return null;
}

function validate(body: any, existing?: Partial<TripRow>): TripRow | { error: string } {
  const title = (body?.title ?? existing?.title ?? '').toString().trim();
  if (!title) return { error: 'title required' };

  const start_date = (body?.start_date ?? existing?.start_date ?? '').toString();
  const end_date = (body?.end_date ?? existing?.end_date ?? start_date).toString();
  if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) return { error: 'invalid start_date' };
  if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) return { error: 'invalid end_date' };

  const fx_raw = body?.fx_rate ?? existing?.fx_rate ?? 2.45;
  const fx_rate = parseFloat(String(fx_raw)) || 2.45;

  const status = (body?.status ?? existing?.status ?? 'planning').toString();
  const validStatus = ['planning', 'active', 'completed'].includes(status) ? status : 'planning';

  const suppliedId = (body?.id ?? existing?.id ?? '').toString().trim();
  const id = suppliedId || `${slugify(title)}-${Date.now().toString(36).slice(-4)}`;

  return {
    id,
    title,
    start_date,
    end_date,
    home_currency: (body?.home_currency ?? existing?.home_currency ?? 'INR').toString(),
    local_currency: (body?.local_currency ?? existing?.local_currency ?? 'THB').toString(),
    fx_rate,
    cover_image_url: (body?.cover_image_url ?? existing?.cover_image_url ?? '').toString(),
    status: validStatus as TripRow['status'],
    note: (body?.note ?? existing?.note ?? '').toString(),
    created_at: Number.isFinite(parseInt(body?.created_at)) ? parseInt(body.created_at) : (existing?.created_at || Date.now()),
  };
}

function toRowArray(t: TripRow): (string | number)[] {
  return [
    t.id, t.title, t.start_date, t.end_date,
    t.home_currency, t.local_currency, t.fx_rate,
    t.cover_image_url, t.status, t.note, t.created_at,
  ];
}

async function ensureTripsTab() {
  await ensureSheetTab(SHEETS.trips);
  await ensureHeaders(SHEETS.trips, TRIP_COLS);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'POST') {
      await ensureTripsTab();
      const body = parseBody(req);
      const built = validate(body);
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      await appendRow(SHEETS.trips, toRowArray(built));
      res.status(200).json({ trip: built });
      return;
    }

    if (req.method === 'PATCH') {
      await ensureTripsTab();
      const body = parseBody(req);
      if (!body?.id) {
        res.status(400).json({ error: 'missing id' });
        return;
      }
      const idx = await findRowIndexById(body.id);
      if (idx == null) {
        res.status(404).json({ error: 'trip not found' });
        return;
      }
      // Read existing row so we can merge fields that weren't sent
      const rows = await readRange(`${SHEETS.trips}!A:K`);
      const cur = rows[idx] ?? [];
      const existing: Partial<TripRow> = {
        id: (cur[0] ?? '').toString(),
        title: (cur[1] ?? '').toString(),
        start_date: (cur[2] ?? '').toString(),
        end_date: (cur[3] ?? '').toString(),
        home_currency: (cur[4] ?? '').toString(),
        local_currency: (cur[5] ?? '').toString(),
        fx_rate: parseFloat((cur[6] ?? '0').toString()) || 0,
        cover_image_url: (cur[7] ?? '').toString(),
        status: ((cur[8] ?? 'planning').toString()) as TripRow['status'],
        note: (cur[9] ?? '').toString(),
        created_at: parseInt((cur[10] ?? '0').toString(), 10) || 0,
      };
      const built = validate({ ...body, id: existing.id }, existing);
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      await updateRow(SHEETS.trips, idx + 1, toRowArray(built));
      res.status(200).json({ trip: built });
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
        res.status(404).json({ error: 'trip not found' });
        return;
      }
      await deleteRowByIndex(SHEETS.trips, idx);
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets write failed', details: e?.message ?? String(e) });
  }
}
