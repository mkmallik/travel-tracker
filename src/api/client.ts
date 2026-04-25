import AsyncStorage from '@react-native-async-storage/async-storage';

type Exp = {
  id: string;
  trip_id: string;
  date: string;
  day_num: number | null;
  category: string;
  amount: number;
  currency: 'THB' | 'INR';
  note: string;
  created_at: number;
};

type ServerTrip = {
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

type DayRow = {
  trip_id?: string;
  day_num: number;
  date: string;
  stay_city: string;
  from_city: string;
  to_city: string;
  image_url: string;
  accommodation_name: string;
  address: string;
  location: string;
  agent: string;
  payment_status: string;
  travel_details: string;
  summary: string;
  budgeted: {
    hotels: number; flights: number; ferry: number; train: number; others: number;
  };
};

type ServerBooking = {
  id: string;
  trip_id: string;
  type: 'hotel' | 'flight' | 'activity' | 'transfer';
  title: string;
  booking_ref: string;
  agent: string;
  address: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  amount: number;
  currency: 'THB' | 'INR';
  note: string;
  cost_on: 'start' | 'end';
  extras: any;
  created_at: number;
};

type ServerLink = {
  id: string;
  trip_id: string;
  name: string;
  url: string;
  note: string;
  created_at: number;
};

export type SheetsSnapshot = {
  trips: ServerTrip[];
  itinerary: DayRow[];
  expenses: Exp[];
  settings: { [k: string]: string };
  bookings: ServerBooking[];
  links: ServerLink[];
};

const TOKEN_KEY = 'travel-tracker.token';

// API base — set via env for production, defaults to relative ("" means same-origin on web)
const API_BASE =
  // @ts-ignore — expo reads EXPO_PUBLIC_* at build time
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE) || '';

async function authHeader(): Promise<Record<string, string>> {
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { /* ignore */ }
    const err: any = new Error(body?.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json() as Promise<T>;
}

// --- auth ---

export async function login(password: string): Promise<{ token: string }> {
  const body = await request<{ token: string; expiresInSeconds: number }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ password }) }
  );
  await AsyncStorage.setItem(TOKEN_KEY, body.token);
  return body;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  return !!t;
}

// --- sheets ---

export function fetchSnapshot(tripId?: string): Promise<SheetsSnapshot> {
  const qs = tripId ? `?trip_id=${encodeURIComponent(tripId)}` : '';
  return request<SheetsSnapshot>(`/api/sheets/get${qs}`, { method: 'GET' });
}

// --- trips ---

type TripInput = Omit<ServerTrip, 'id' | 'created_at'> & { id?: string };

export function addTrip(t: TripInput): Promise<{ trip: ServerTrip }> {
  return request<{ trip: ServerTrip }>('/api/sheets/trip', {
    method: 'POST',
    body: JSON.stringify(t),
  });
}

export function updateTrip(t: ServerTrip): Promise<{ trip: ServerTrip }> {
  return request<{ trip: ServerTrip }>('/api/sheets/trip', {
    method: 'PATCH',
    body: JSON.stringify(t),
  });
}

export function deleteTrip(id: string): Promise<{ deleted: true }> {
  return request<{ deleted: true }>('/api/sheets/trip?id=' + encodeURIComponent(id), {
    method: 'DELETE',
  });
}

export function addExpense(e: Omit<Exp, 'id' | 'created_at'>): Promise<{ expense: Exp }> {
  return request<{ expense: Exp }>('/api/sheets/expense', {
    method: 'POST',
    body: JSON.stringify(e),
  });
}

export function updateExpense(e: Exp): Promise<{ expense: Exp }> {
  return request<{ expense: Exp }>('/api/sheets/expense', {
    method: 'PATCH',
    body: JSON.stringify(e),
  });
}

export function deleteExpense(id: string): Promise<{ deleted: true }> {
  return request<{ deleted: true }>('/api/sheets/expense?id=' + encodeURIComponent(id), {
    method: 'DELETE',
  });
}

export function updateDay(day_num: number, updates: Partial<DayRow>): Promise<any> {
  return request('/api/sheets/day', {
    method: 'PATCH',
    body: JSON.stringify({ day_num, updates }),
  });
}

export function updateSetting(key: string, value: string): Promise<any> {
  return request('/api/sheets/setting', {
    method: 'PATCH',
    body: JSON.stringify({ key, value }),
  });
}

// --- bookings ---

type BookingInput = Omit<ServerBooking, 'id' | 'created_at'>;

export function addBooking(b: BookingInput): Promise<{ booking: ServerBooking }> {
  return request<{ booking: ServerBooking }>('/api/sheets/booking', {
    method: 'POST',
    body: JSON.stringify(b),
  });
}

export function updateBooking(b: ServerBooking): Promise<{ booking: ServerBooking }> {
  return request<{ booking: ServerBooking }>('/api/sheets/booking', {
    method: 'PATCH',
    body: JSON.stringify(b),
  });
}

export function deleteBooking(id: string): Promise<{ deleted: true }> {
  return request<{ deleted: true }>('/api/sheets/booking?id=' + encodeURIComponent(id), {
    method: 'DELETE',
  });
}

// --- links ---

type LinkInput = Omit<ServerLink, 'id' | 'created_at'>;

export function addLink(l: LinkInput): Promise<{ link: ServerLink }> {
  return request<{ link: ServerLink }>('/api/sheets/link', {
    method: 'POST',
    body: JSON.stringify(l),
  });
}

export function updateLink(l: ServerLink): Promise<{ link: ServerLink }> {
  return request<{ link: ServerLink }>('/api/sheets/link', {
    method: 'PATCH',
    body: JSON.stringify(l),
  });
}

export function deleteLink(id: string): Promise<{ deleted: true }> {
  return request<{ deleted: true }>('/api/sheets/link?id=' + encodeURIComponent(id), {
    method: 'DELETE',
  });
}
