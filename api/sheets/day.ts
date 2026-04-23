import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { readRange, updateRow, SHEETS } from '../lib/sheets';
import { ITINERARY_COLS } from '../lib/schema';

const EDITABLE_FIELDS = new Set<string>(ITINERARY_COLS as unknown as string[]);

function parseBody(req: VercelRequest): any {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body ?? {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = parseBody(req);
    const dayNum = parseInt(String(body?.day_num ?? ''), 10);
    if (!Number.isFinite(dayNum) || dayNum <= 0) {
      res.status(400).json({ error: 'invalid day_num' });
      return;
    }

    // Find the row
    const rows = await readRange(`${SHEETS.itinerary}!A:R`);
    let rowIdx = -1;
    for (let i = 1; i < rows.length; i++) {
      const n = parseInt((rows[i]?.[0] ?? '').toString(), 10);
      if (n === dayNum) { rowIdx = i; break; }
    }
    if (rowIdx < 0) {
      res.status(404).json({ error: 'day not found' });
      return;
    }

    // Build updated row by merging incoming fields onto existing row
    const current = rows[rowIdx] ?? [];
    const updated = ITINERARY_COLS.map((col, i) => {
      if (col === 'day_num') return dayNum;
      if (col in (body?.updates ?? {}) && EDITABLE_FIELDS.has(col)) {
        return (body.updates[col] ?? '').toString();
      }
      return (current[i] ?? '').toString();
    });

    await updateRow(SHEETS.itinerary, rowIdx + 1, updated);
    res.status(200).json({ day_num: dayNum, updates: body?.updates ?? {} });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets write failed', details: e?.message ?? String(e) });
  }
}
