// Canonical column orders for each tab in the Google Sheet.
// The sheet's header row MUST match these in order.

export const EXPENSE_COLS = [
  'id',
  'date',
  'day_num',
  'category',
  'amount',
  'currency',
  'amount_thb',
  'amount_inr',
  'note',
  'created_at',
] as const;

export const ITINERARY_COLS = [
  'day_num',
  'date',
  'stay_city',
  'from_city',
  'to_city',
  'image_url',
  'accommodation_name',
  'address',
  'location',
  'agent',
  'payment_status',
  'travel_details',
  'summary',
  'hotels',
  'flights',
  'ferry',
  'train',
  'others',
] as const;

export const SETTING_COLS = ['key', 'value'] as const;

export const BOOKING_COLS = [
  'id',
  'type',
  'title',
  'booking_ref',
  'agent',
  'address',
  'start_date',
  'end_date',
  'start_time',
  'end_time',
  'amount',
  'currency',
  'amount_thb',
  'amount_inr',
  'note',
  'cost_on',
  'extras',
  'created_at',
] as const;

export const SHEETS = {
  itinerary: 'itinerary',
  expenses: 'expenses',
  settings: 'settings',
  bookings: 'bookings',
} as const;
