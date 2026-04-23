import type { SeedDay } from '../data/types';

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// Parses formats like "Mon, Apr 27, 2026" -> Date
export function parseSeedDate(s: string): Date | null {
  const m = s.match(/([A-Z][a-z]{2}),?\s+([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[2]];
  const day = parseInt(m[3], 10);
  const year = parseInt(m[4], 10);
  if (month == null || isNaN(day) || isNaN(year)) return null;
  return new Date(year, month, day);
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function dayIsoFromSeed(day: SeedDay): string | null {
  const d = parseSeedDate(day.date);
  return d ? toIsoDate(d) : null;
}

export function findDayNumForIso(iso: string, days: SeedDay[]): number | null {
  for (const d of days) {
    if (dayIsoFromSeed(d) === iso) return d.dayNum;
  }
  return null;
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
