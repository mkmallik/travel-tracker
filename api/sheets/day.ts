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

    // Find the row. Col A = trip_id (string), col B = day_num. We match by
    // day_num within the active trip (the trip filter happens client-side
    // via state.activeTripId, so a single-trip lookup is sufficient here).
    const rows = await readRange(`${SHEETS.itinerary}!A:U`);
    let rowIdx = -1;
    const wantTripId = (body?.trip_id ?? '').toString();
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] ?? [];
      const tripId = (r[0] ?? '').toString();
      const n = parseInt((r[1] ?? '').toString(), 10);
      if (n !== dayNum) continue;
      if (wantTripId && tripId !== wantTripId) continue;
      rowIdx = i;
      break;
    }
    if (rowIdx < 0) {
      res.status(404).json({ error: 'day not found' });
      return;
    }

    // Build updated row by merging incoming fields onto existing row
    const current = rows[rowIdx] ?? [];
    const updated = ITINERARY_COLS.map((col, i) => {
      if (col === 'day_num') return dayNum;
      if (col === 'trip_id' && wantTripId) return wantTripId;
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
