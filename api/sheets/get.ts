import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { readRange } from '../lib/sheets';
import { EXPENSE_COLS, ITINERARY_COLS, SETTING_COLS, SHEETS } from '../lib/schema';

type Record = { [k: string]: string };

function toRecords(rows: string[][], cols: readonly string[]): Record[] {
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => {
    const rec: Record = {};
    cols.forEach((c, i) => (rec[c] = (r[i] ?? '').toString()));
    return rec;
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const [itinRows, expRows, settingsRows] = await Promise.all([
      readRange(`${SHEETS.itinerary}!A:R`),
      readRange(`${SHEETS.expenses}!A:J`),
      readRange(`${SHEETS.settings}!A:B`),
    ]);

    const itinerary = toRecords(itinRows, ITINERARY_COLS).map((r) => ({
      day_num: parseInt(r.day_num || '0', 10),
      date: r.date || '',
      stay_city: r.stay_city || '',
      from_city: r.from_city || '',
      to_city: r.to_city || '',
      image_url: r.image_url || '',
      accommodation_name: r.accommodation_name || '',
      address: r.address || '',
      location: r.location || '',
      agent: r.agent || '',
      payment_status: r.payment_status || '',
      travel_details: r.travel_details || '',
      summary: r.summary || '',
      budgeted: {
        hotels: parseFloat(r.hotels || '0') || 0,
        flights: parseFloat(r.flights || '0') || 0,
        ferry: parseFloat(r.ferry || '0') || 0,
        train: parseFloat(r.train || '0') || 0,
        others: parseFloat(r.others || '0') || 0,
      },
    })).filter((d) => d.day_num > 0).sort((a, b) => a.day_num - b.day_num);

    const expenses = toRecords(expRows, EXPENSE_COLS).map((r) => ({
      id: r.id,
      date: r.date,
      day_num: r.day_num ? parseInt(r.day_num, 10) : null,
      category: r.category,
      amount: parseFloat(r.amount || '0') || 0,
      currency: (r.currency || 'THB') as 'THB' | 'INR',
      note: r.note || '',
      created_at: r.created_at ? parseInt(r.created_at, 10) || Date.parse(r.created_at) || 0 : 0,
    })).filter((e) => !!e.id && e.amount > 0);

    const settings: { [k: string]: string } = {};
    for (const r of toRecords(settingsRows, SETTING_COLS)) {
      if (r.key) settings[r.key] = r.value;
    }

    res.status(200).json({ itinerary, expenses, settings });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets read failed', details: e?.message ?? String(e) });
  }
}
