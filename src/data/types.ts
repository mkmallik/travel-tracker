export type Currency = 'THB' | 'INR';

export type ExpenseCategory =
  | 'Flights'
  | 'Hotels'
  | 'Ferry'
  | 'Train'
  | 'Cabs'
  | 'Food'
  | 'Shopping'
  | 'Activities'
  | 'Others';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Flights',
  'Hotels',
  'Ferry',
  'Train',
  'Cabs',
  'Food',
  'Shopping',
  'Activities',
  'Others',
];

export type SeedTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  homeCurrency: Currency;
  localCurrency: Currency;
};

export type BudgetedCosts = {
  hotels: number;
  flights: number;
  ferry: number;
  train: number;
  others: number;
};

export type SeedDay = {
  dayNum: number;
  date: string;
  stayCity: string;
  fromCity: string;
  toCity: string;
  imageUrl: string;
  accommodationName: string;
  address: string;
  location: string;
  agent: string;
  paymentStatus: string;
  travelDetails: string;
  summary: string;
  budgeted: BudgetedCosts;
};

export type Expense = {
  id: string;
  date: string;
  dayNum: number | null;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  note: string;
  createdAt: number;
};
