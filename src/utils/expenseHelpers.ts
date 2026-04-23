import type { Expense, SeedDay } from '../data/types';
import { toThb, toInr } from './fx';

export function sumExpensesInThb(expenses: Expense[], fx: number): number {
  return expenses.reduce((s, e) => s + toThb(e.amount, e.currency, fx), 0);
}

export function sumExpensesInInr(expenses: Expense[], fx: number): number {
  return expenses.reduce((s, e) => s + toInr(e.amount, e.currency, fx), 0);
}

export function expensesForDay(expenses: Expense[], dayNum: number): Expense[] {
  return expenses.filter((e) => e.dayNum === dayNum);
}

export function budgetedTotalThb(day: SeedDay): number {
  const b = day.budgeted;
  return b.hotels + b.flights + b.ferry + b.train + b.others;
}
