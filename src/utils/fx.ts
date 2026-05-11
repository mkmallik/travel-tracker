import type { Currency } from '../data/types';

export const DEFAULT_INR_PER_THB = 2.45;

// The historic naming `inrPerThb` is preserved for backwards compat at every
// call site, but the SEMANTICS are now: "INR per 1 unit of the active trip's
// LOCAL currency" — for Bali that's INR/IDR (~0.0051), Vietnam INR/VND, etc.
// For Thailand it's still INR/THB. So `toThb` actually returns "amount in
// the active trip's local currency" — the function name lies, but every
// caller is generic enough that it works correctly.

export function toThb(amount: number, currency: Currency, inrPerThb: number): number {
  if (currency === 'THB') return amount;
  return inrPerThb > 0 ? amount / inrPerThb : 0;
}

export function toInr(amount: number, currency: Currency, inrPerThb: number): number {
  if (currency === 'INR') return amount;
  return amount * inrPerThb;
}

// Module-local current local-currency code. Updated by useAppStore whenever
// the active trip changes. Lets formatTHB pick the right symbol without
// having to thread a `localCurrency` prop through 20+ call sites.
let LOCAL_CODE: string = 'THB';
export function setActiveLocalCurrency(code: string | undefined | null) {
  LOCAL_CODE = (code || 'THB').toUpperCase();
}
export function getActiveLocalCurrency(): string { return LOCAL_CODE; }

// Glyph + spacing per currency. Single-glyph symbols hug the number ("₹100");
// multi-letter codes like "Rp" and Arabic-script "د.إ" get a thin gap so they
// don't run into the digits.
const SYMBOL_MAP: Record<string, { sym: string; spaced: boolean }> = {
  THB: { sym: '฿',   spaced: false },
  INR: { sym: '₹',   spaced: false },
  IDR: { sym: 'Rp',  spaced: true  },
  VND: { sym: '₫',   spaced: false },
  EUR: { sym: '€',   spaced: false },
  USD: { sym: '$',   spaced: false },
  GBP: { sym: '£',   spaced: false },
  JPY: { sym: '¥',   spaced: false },
  AED: { sym: 'د.إ', spaced: true  },
};

export function symbolFor(code: string): string {
  const c = (code || '').toUpperCase();
  const m = SYMBOL_MAP[c];
  if (!m) return `${c} `; // unknown code → print the ISO letters with a space
  return m.spaced ? `${m.sym} ` : m.sym;
}

export function formatLocal(n: number, code: string = LOCAL_CODE): string {
  return symbolFor(code) + Math.round(n).toLocaleString('en-IN');
}

// formatTHB is kept as the historical name (used in 6+ call sites) but now
// renders whichever local currency is active for the trip. For Thailand
// trips it still shows '฿'; for Bali it shows 'Rp', etc.
export function formatTHB(n: number): string {
  return formatLocal(n, LOCAL_CODE);
}

export function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// INR is the primary readout (home currency); local currency is the
// reference secondary value, formatted with the active trip's symbol.
export function formatDual(amount: number, currency: Currency, inrPerThb: number): string {
  const local = toThb(amount, currency, inrPerThb);
  const inr = toInr(amount, currency, inrPerThb);
  return `${formatINR(inr)} · ${formatLocal(local)}`;
}
