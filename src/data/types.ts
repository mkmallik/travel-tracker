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
  tripId?: string;
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
  tripId: string;
  date: string;
  dayNum: number | null;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  note: string;
  createdAt: number;
};

export type TripStatus = 'planning' | 'active' | 'completed';

export type Trip = {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  homeCurrency: Currency;
  localCurrency: Currency;
  fxRate: number;
  coverImageUrl: string;
  status: TripStatus;
  note: string;
  createdAt: number;
};

export type BookingType = 'hotel' | 'flight' | 'activity' | 'transfer';

export const BOOKING_TYPES: BookingType[] = ['hotel', 'flight', 'activity', 'transfer'];

export type FlightStop = {
  airport: string;
  arrive?: string;
  depart?: string;
};

export type FlightExtras = {
  from?: string;
  to?: string;
  stops?: FlightStop[];
};

export type HotelExtras = {
  room_type?: string;
  nights?: number;
};

export type ActivityExtras = {
  location?: string;
  operator?: string;
};

export type TransferExtras = {
  from_place?: string;
  to_place?: string;
  mode?: string;
};

export type BookingExtras =
  | FlightExtras
  | HotelExtras
  | ActivityExtras
  | TransferExtras;

export type Booking = {
  id: string;
  tripId: string;
  type: BookingType;
  title: string;
  bookingRef: string;
  agent: string;
  address: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  amount: number;
  currency: Currency;
  note: string;
  costOn: 'start' | 'end';
  extras: BookingExtras;
  createdAt: number;
};

export const CATEGORY_FOR_BOOKING_TYPE: Record<BookingType, ExpenseCategory> = {
  hotel: 'Hotels',
  flight: 'Flights',
  activity: 'Activities',
  transfer: 'Cabs',
};

export type TripLink = {
  id: string;
  tripId: string;
  name: string;
  url: string;
  note: string;
  createdAt: number;
};
