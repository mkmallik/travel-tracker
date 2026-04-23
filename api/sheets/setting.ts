import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { readRange, appendRow, updateRow, SHEETS } from '../lib/sheets';

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
    const key = (body?.key ?? '').toString();
    const value = (body?.value ?? '').toString();
    if (!key) {
      res.status(400).json({ error: 'missing key' });
      return;
    }
    const rows = await readRange(`${SHEETS.settings}!A:B`);
    let rowIdx = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i]?.[0] ?? '').toString() === key) { rowIdx = i; break; }
    }
    if (rowIdx < 0) {
      await appendRow(SHEETS.settings, [key, value]);
    } else {
      await updateRow(SHEETS.settings, rowIdx + 1, [key, value]);
    }
    res.status(200).json({ key, value });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets write failed', details: e?.message ?? String(e) });
  }
}
