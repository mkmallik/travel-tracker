import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, Expense, SeedDay, SeedTrip } from '../data/types';
import { SEED_TRIP, SEED_DAYS } from '../data/seedTrip';
import { DEFAULT_INR_PER_THB } from '../utils/fx';
import type { ThemePreference } from '../theme/colors';
import * as api from '../api/client';

type State = {
  trip: SeedTrip;
  days: SeedDay[];
  expenses: Expense[];
  bookings: Booking[];
  fxInrPerThb: number;
  themePref: ThemePreference;
  hydrated: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  online: boolean;
};

type CachePayload = {
  trip: SeedTrip;
  days: SeedDay[];
  expenses: Expense[];
  bookings: Booking[];
  fxInrPerThb: number;
  themePref: ThemePreference;
};

const CACHE_KEY = 'travel-tracker.cache.v2';

let state: State = {
  trip: SEED_TRIP,
  days: SEED_DAYS,
  expenses: [],
  bookings: [],
  fxInrPerThb: DEFAULT_INR_PER_THB,
  themePref: 'auto',
  hydrated: false,
  syncing: false,
  lastSyncedAt: null,
  syncError: null,
  online: true,
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  notify();
}

async function saveCache() {
  const payload: CachePayload = {
    trip: state.trip,
    days: state.days,
    expenses: state.expenses,
    bookings: state.bookings,
    fxInrPerThb: state.fxInrPerThb,
    themePref: state.themePref,
  };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('cache save failed:', e);
  }
}

async function loadCache(): Promise<CachePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachePayload;
  } catch { return null; }
}

// --- mappers between server snapshot and UI types ---

function serverToDay(s: any): SeedDay {
  return {
    dayNum: s.day_num,
    date: s.date,
    stayCity: s.stay_city,
    fromCity: s.from_city,
    toCity: s.to_city,
    imageUrl: s.image_url,
    accommodationName: s.accommodation_name,
    address: s.address,
    location: s.location,
    agent: s.agent,
    paymentStatus: s.payment_status,
    travelDetails: s.travel_details,
    summary: s.summary,
    budgeted: s.budgeted || { hotels: 0, flights: 0, ferry: 0, train: 0, others: 0 },
  };
}

function serverToExpense(s: any): Expense {
  return {
    id: s.id,
    date: s.date,
    dayNum: s.day_num,
    amount: s.amount,
    currency: s.currency,
    category: s.category,
    note: s.note || '',
    createdAt: Number(s.created_at) || 0,
  };
}

function serverToBooking(s: any): Booking {
  return {
    id: s.id,
    type: s.type,
    title: s.title || '',
    bookingRef: s.booking_ref || '',
    agent: s.agent || '',
    address: s.address || '',
    startDate: s.start_date || '',
    endDate: s.end_date || s.start_date || '',
    startTime: s.start_time || '',
    endTime: s.end_time || '',
    amount: s.amount ?? 0,
    currency: (s.currency || 'THB') as 'THB' | 'INR',
    note: s.note || '',
    costOn: s.cost_on === 'end' ? 'end' : 'start',
    extras: s.extras || {},
    createdAt: Number(s.created_at) || 0,
  };
}

function bookingToServer(b: Booking | Omit<Booking, 'id' | 'createdAt'>) {
  return {
    type: b.type,
    title: b.title,
    booking_ref: b.bookingRef,
    agent: b.agent,
    address: b.address,
    start_date: b.startDate,
    end_date: b.endDate,
    start_time: b.startTime,
    end_time: b.endTime,
    amount: b.amount,
    currency: b.currency,
    note: b.note,
    cost_on: b.costOn,
    extras: b.extras,
  };
}

function settingsToTripPatch(settings: { [k: string]: string }): Partial<SeedTrip> {
  const patch: Partial<SeedTrip> = {};
  if (settings.trip_title) patch.title = settings.trip_title;
  if (settings.trip_start) patch.startDate = settings.trip_start;
  if (settings.trip_end) patch.endDate = settings.trip_end;
  return patch;
}

// --- bootstrap + sync ---

export async function bootstrapStore(): Promise<void> {
  // 1. Load cache for instant first paint (while offline or before network answers)
  const cached = await loadCache();
  if (cached) {
    setState({
      trip: cached.trip || SEED_TRIP,
      days: cached.days?.length ? cached.days : SEED_DAYS,
      expenses: cached.expenses || [],
      bookings: cached.bookings || [],
      fxInrPerThb: cached.fxInrPerThb || DEFAULT_INR_PER_THB,
      themePref: cached.themePref || 'auto',
    });
  }
  setState({ hydrated: true });

  // 2. Kick off network sync (non-blocking)
  void syncFromServer();
}

export async function syncFromServer(): Promise<void> {
  if (!(await api.isLoggedIn())) return;
  setState({ syncing: true, syncError: null });
  try {
    const snap = await api.fetchSnapshot();
    const days = snap.itinerary.map(serverToDay).sort((a, b) => a.dayNum - b.dayNum);
    const expenses = snap.expenses.map(serverToExpense);
    const bookings = (snap.bookings || []).map(serverToBooking);
    const fxRaw = parseFloat(snap.settings['fx_inr_per_thb'] || '');
    const fxInrPerThb = Number.isFinite(fxRaw) && fxRaw > 0 ? fxRaw : state.fxInrPerThb;
    const tripPatch = settingsToTripPatch(snap.settings);

    setState((s) => ({
      trip: { ...s.trip, ...tripPatch },
      days: days.length ? days : s.days,
      expenses,
      bookings,
      fxInrPerThb,
      lastSyncedAt: Date.now(),
      syncing: false,
      online: true,
    }));
    await saveCache();
  } catch (e: any) {
    setState({
      syncing: false,
      syncError: e?.message ?? 'Sync failed',
      online: e?.status !== 401,
    });
    if (e?.status === 401) {
      await api.logout();
    }
  }
}

// --- mutators (optimistic local + server call, server wins on reload) ---

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const actions = {
  async addExpense(e: Omit<Expense, 'id' | 'createdAt'>) {
    const optimistic: Expense = { ...e, id: genId(), createdAt: Date.now() };
    setState((s) => ({ expenses: [...s.expenses, optimistic] }));
    void saveCache();
    try {
      const { expense } = await api.addExpense({
        date: e.date,
        day_num: e.dayNum,
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        note: e.note,
      } as any);
      // swap optimistic for server-returned record
      setState((s) => ({
        expenses: s.expenses.map((x) =>
          x.id === optimistic.id ? serverToExpense(expense) : x
        ),
      }));
      await saveCache();
    } catch (e: any) {
      console.warn('addExpense failed:', e?.message);
      setState({ syncError: e?.message ?? 'Save failed' });
    }
  },

  async removeExpense(id: string) {
    const snapshot = state.expenses;
    setState((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) }));
    void saveCache();
    try {
      await api.deleteExpense(id);
    } catch (e: any) {
      setState({ expenses: snapshot, syncError: e?.message ?? 'Delete failed' });
    }
  },

  async setFxRate(rate: number) {
    const prev = state.fxInrPerThb;
    const next = rate > 0 ? rate : DEFAULT_INR_PER_THB;
    setState({ fxInrPerThb: next });
    void saveCache();
    try {
      await api.updateSetting('fx_inr_per_thb', String(next));
    } catch (e: any) {
      setState({ fxInrPerThb: prev, syncError: e?.message ?? 'Save failed' });
    }
  },

  async replaceExpenses(items: Omit<Expense, 'id' | 'createdAt'>[]) {
    // This is a client-only convenience for CSV import; server stays authoritative
    // on reload. For now, we just add them one by one.
    for (const item of items) await actions.addExpense(item);
  },

  async appendExpenses(items: Omit<Expense, 'id' | 'createdAt'>[]) {
    for (const item of items) await actions.addExpense(item);
  },

  replaceDays(newDays: SeedDay[]) {
    // Itinerary edits go via updateDay on the server (Phase 2). For now just update local.
    setState({ days: newDays });
    void saveCache();
  },

  async refresh() {
    await syncFromServer();
  },

  setThemePref(pref: ThemePreference) {
    setState({ themePref: pref });
    void saveCache();
  },

  async addBooking(input: Omit<Booking, 'id' | 'createdAt'>) {
    const optimistic: Booking = { ...input, id: genId(), createdAt: Date.now() };
    setState((s) => ({ bookings: [...s.bookings, optimistic] }));
    void saveCache();
    try {
      const { booking } = await api.addBooking(bookingToServer(input) as any);
      setState((s) => ({
        bookings: s.bookings.map((x) => (x.id === optimistic.id ? serverToBooking(booking) : x)),
      }));
      await saveCache();
    } catch (e: any) {
      console.warn('addBooking failed:', e?.message);
      setState({ syncError: e?.message ?? 'Save failed' });
    }
  },

  async updateBooking(b: Booking) {
    const snapshot = state.bookings;
    setState((s) => ({ bookings: s.bookings.map((x) => (x.id === b.id ? b : x)) }));
    void saveCache();
    try {
      const { booking } = await api.updateBooking({ ...bookingToServer(b), id: b.id, created_at: b.createdAt } as any);
      setState((s) => ({
        bookings: s.bookings.map((x) => (x.id === b.id ? serverToBooking(booking) : x)),
      }));
      await saveCache();
    } catch (e: any) {
      setState({ bookings: snapshot, syncError: e?.message ?? 'Update failed' });
    }
  },

  async removeBooking(id: string) {
    const snapshot = state.bookings;
    setState((s) => ({ bookings: s.bookings.filter((x) => x.id !== id) }));
    void saveCache();
    try {
      await api.deleteBooking(id);
    } catch (e: any) {
      setState({ bookings: snapshot, syncError: e?.message ?? 'Delete failed' });
    }
  },

  async logout() {
    await api.logout();
    setState({
      expenses: [],
      bookings: [],
      fxInrPerThb: DEFAULT_INR_PER_THB,
      lastSyncedAt: null,
      syncError: null,
    });
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
const getSnapshot = () => state;

export function useAppStore<T>(selector: (s: State) => T): T;
export function useAppStore(): State & typeof actions;
export function useAppStore<T>(selector?: (s: State) => T) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (selector) return selector(snap);
  return { ...snap, ...actions };
}
