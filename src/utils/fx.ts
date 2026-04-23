import type { Currency } from '../data/types';

export const DEFAULT_INR_PER_THB = 2.45;

export function toThb(amount: number, currency: Currency, inrPerThb: number): number {
  if (currency === 'THB') return amount;
  return inrPerThb > 0 ? amount / inrPerThb : 0;
}

export function toInr(amount: number, currency: Currency, inrPerThb: number): number {
  if (currency === 'INR') return amount;
  return amount * inrPerThb;
}

export function formatTHB(n: number): string {
  return '฿' + Math.round(n).toLocaleString('en-IN');
}

export function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function formatDual(amount: number, currency: Currency, inrPerThb: number): string {
  const thb = toThb(amount, currency, inrPerThb);
  const inr = toInr(amount, currency, inrPerThb);
  return `${formatTHB(thb)} · ${formatINR(inr)}`;
}
