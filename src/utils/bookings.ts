import type { Booking, BookingType, FlightExtras, HotelExtras, ActivityExtras, TransferExtras } from '../data/types';
import { CATEGORY_FOR_BOOKING_TYPE } from '../data/types';
import { toInr, toThb } from './fx';

export const BOOKING_LABELS: Record<BookingType, string> = {
  hotel: 'Hotel',
  flight: 'Flight',
  activity: 'Activity',
  transfer: 'Transfer',
};

export const BOOKING_ICONS: Record<BookingType, string> = {
  hotel: '🏨',
  flight: '✈️',
  activity: '🎫',
  transfer: '🚕',
};

// True if booking spans the given ISO date (inclusive).
export function bookingCoversDate(b: Booking, iso: string): boolean {
  if (!iso) return false;
  const start = b.startDate;
  const end = b.endDate || b.startDate;
  return iso >= start && iso <= end;
}

// Bookings to show on a given day. For hotels we include all overlapping days;
// for single-day types we match only the start date.
export function bookingsForIso(bookings: Booking[], iso: string): Booking[] {
  return bookings.filter((b) => {
    if (b.type === 'hotel') return bookingCoversDate(b, iso);
    return b.startDate === iso;
  });
}

// Which ISO date should the cost count against?
export function costIsoForBooking(b: Booking): string {
  return b.costOn === 'end' && b.endDate ? b.endDate : b.startDate;
}

export function totalsByCategoryFromBookings(
  bookings: Booking[],
  fx: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of bookings) {
    const cat = CATEGORY_FOR_BOOKING_TYPE[b.type];
    out[cat] = (out[cat] || 0) + toThb(b.amount, b.currency, fx);
  }
  return out;
}

export function flightStopsLabel(extras: FlightExtras): string {
  const from = extras.from || '?';
  const to = extras.to || '?';
  const stops = extras.stops || [];
  if (stops.length === 0) return `${from} → ${to}`;
  return [from, ...stops.map((s) => s.airport), to].join(' → ');
}

export function hotelNights(b: Booking): number {
  if (b.type !== 'hotel') return 0;
  const start = new Date(b.startDate + 'T00:00:00');
  const end = new Date((b.endDate || b.startDate) + 'T00:00:00');
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}
