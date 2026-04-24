import type { Expense, SeedDay } from '../data/types';
import { EXPENSE_CATEGORIES } from '../data/types';
import { toInr, toThb } from './fx';

// ------ Serialization ------

function esc(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function expensesToCsv(expenses: Expense[], inrPerThb: number): string {
  const header = [
    'date', 'dayNum', 'category', 'amount', 'currency',
    'amountTHB', 'amountINR', 'note', 'createdAt',
  ];
  const rows = expenses.map((e) => [
    e.date,
    e.dayNum ?? '',
    e.category,
    e.amount,
    e.currency,
    toThb(e.amount, e.currency, inrPerThb).toFixed(2),
    toInr(e.amount, e.currency, inrPerThb).toFixed(2),
    e.note,
    e.createdAt,
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export function daysToCsv(days: SeedDay[]): string {
  const header = [
    'Images', 'Stay', 'Day', 'Date', 'From', 'To',
    'Travel Details', "Summary of day's events",
    'Name of Accommodation', 'Address', 'Location', 'Agent',
    'Hotels', 'Payment', 'Flights', 'Ferry', 'Train', 'Others',
  ];
  const rows = days.map((d) => [
    d.imageUrl, d.stayCity, d.dayNum, d.date, d.fromCity, d.toCity,
    d.travelDetails, d.summary,
    d.accommodationName, d.address, d.location, d.agent,
    d.budgeted.hotels, d.paymentStatus,
    d.budgeted.flights, d.budgeted.ferry, d.budgeted.train, d.budgeted.others,
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

// ------ Parsing (RFC 4180-ish: handles quoted fields + embedded newlines) ------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      cur.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function toRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, idx) => (rec[h] = (r[idx] ?? '').trim()));
    return rec;
  });
}

const isValidCategory = (v: string) =>
  (EXPENSE_CATEGORIES as string[]).includes(v);

export type ParsedExpense = Omit<Expense, 'id' | 'createdAt' | 'tripId'>;

export function csvToExpenses(text: string): ParsedExpense[] {
  const records = toRecords(parseCsv(text));
  const out: ParsedExpense[] = [];
  for (const r of records) {
    const amount = parseFloat(r.amount || '');
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const currency = (r.currency || 'THB').toUpperCase();
    if (currency !== 'THB' && currency !== 'INR') continue;
    const category = r.category || '';
    if (!isValidCategory(category)) continue;
    const date = r.date || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const dayNumRaw = r.dayNum ?? '';
    const dayNum = dayNumRaw === '' ? null : parseInt(dayNumRaw, 10) || null;
    out.push({
      amount,
      currency: currency as 'THB' | 'INR',
      category: category as ParsedExpense['category'],
      date,
      dayNum,
      note: r.note || '',
    });
  }
  return out;
}

const num = (v: string) => {
  const n = parseFloat((v || '0').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export function csvToDays(text: string): SeedDay[] {
  const records = toRecords(parseCsv(text));
  const out: SeedDay[] = [];
  for (const r of records) {
    const dayRaw = r.Day || '';
    const dayNum = parseInt(dayRaw, 10);
    if (!Number.isFinite(dayNum)) continue;
    out.push({
      dayNum,
      date: r.Date || '',
      stayCity: r.Stay || '',
      fromCity: r.From || '',
      toCity: r.To || '',
      imageUrl: r.Images || '',
      accommodationName: r['Name of Accommodation'] || '',
      address: r.Address || '',
      location: r.Location || '',
      agent: r.Agent || '',
      paymentStatus: r.Payment || '',
      travelDetails: r['Travel Details'] || '',
      summary: r["Summary of day's events"] || '',
      budgeted: {
        hotels: num(r.Hotels),
        flights: num(r.Flights),
        ferry: num(r.Ferry),
        train: num(r.Train),
        others: num(r.Others),
      },
    });
  }
  out.sort((a, b) => a.dayNum - b.dayNum);
  return out;
}
