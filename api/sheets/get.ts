import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { readRange } from '../lib/sheets';
import {
  EXPENSE_COLS, ITINERARY_COLS, SETTING_COLS, BOOKING_COLS, TRIP_COLS, SHEETS,
} from '../lib/schema';

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

  const tripFilter = (req.query?.trip_id as string) || '';

  try {
    const [tripRows, itinRows, expRows, settingsRows, bookingRows] = await Promise.all([
      readRange(`${SHEETS.trips}!A:K`).catch(() => [] as string[][]),
      readRange(`${SHEETS.itinerary}!A:S`),
      readRange(`${SHEETS.expenses}!A:K`),
      readRange(`${SHEETS.settings}!A:B`),
      readRange(`${SHEETS.bookings}!A:S`).catch(() => [] as string[][]),
    ]);

    const trips = toRecords(tripRows, TRIP_COLS).map((r) => ({
      id: r.id,
      title: r.title,
      start_date: r.start_date,
      end_date: r.end_date,
      home_currency: r.home_currency || 'INR',
      local_currency: r.local_currency || 'THB',
      fx_rate: parseFloat(r.fx_rate || '0') || 0,
      cover_image_url: r.cover_image_url || '',
      status: r.status || 'planning',
      note: r.note || '',
      created_at: r.created_at ? parseInt(r.created_at, 10) || 0 : 0,
    })).filter((t) => !!t.id);

    const allItinerary = toRecords(itinRows, ITINERARY_COLS).map((r) => ({
      trip_id: r.trip_id || '',
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

    const itinerary = tripFilter
      ? allItinerary.filter((d) => d.trip_id === tripFilter)
      : allItinerary;

    const allExpenses = toRecords(expRows, EXPENSE_COLS).map((r) => ({
      id: r.id,
      trip_id: r.trip_id || '',
      date: r.date,
      day_num: r.day_num ? parseInt(r.day_num, 10) : null,
      category: r.category,
      amount: parseFloat(r.amount || '0') || 0,
      currency: (r.currency || 'THB') as 'THB' | 'INR',
      note: r.note || '',
      created_at: r.created_at ? parseInt(r.created_at, 10) || Date.parse(r.created_at) || 0 : 0,
    })).filter((e) => !!e.id && e.amount > 0);

    const expenses = tripFilter
      ? allExpenses.filter((e) => e.trip_id === tripFilter)
      : allExpenses;

    const settings: { [k: string]: string } = {};
    for (const r of toRecords(settingsRows, SETTING_COLS)) {
      if (r.key) settings[r.key] = r.value;
    }

    const allBookings = toRecords(bookingRows, BOOKING_COLS).map((r) => {
      let extras: any = {};
      try { extras = r.extras ? JSON.parse(r.extras) : {}; } catch { extras = {}; }
      return {
        id: r.id,
        trip_id: r.trip_id || '',
        type: r.type,
        title: r.title || '',
        booking_ref: r.booking_ref || '',
        agent: r.agent || '',
        address: r.address || '',
        start_date: r.start_date || '',
        end_date: r.end_date || r.start_date || '',
        start_time: r.start_time || '',
        end_time: r.end_time || '',
        amount: parseFloat(r.amount || '0') || 0,
        currency: (r.currency || 'THB') as 'THB' | 'INR',
        note: r.note || '',
        cost_on: (r.cost_on === 'end' ? 'end' : 'start') as 'start' | 'end',
        extras,
        created_at: r.created_at ? parseInt(r.created_at, 10) || 0 : 0,
      };
    }).filter((b) => !!b.id && !!b.type);

    const bookings = tripFilter
      ? allBookings.filter((b) => b.trip_id === tripFilter)
      : allBookings;

    res.status(200).json({ trips, itinerary, expenses, settings, bookings });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets read failed', details: e?.message ?? String(e) });
  }
}
