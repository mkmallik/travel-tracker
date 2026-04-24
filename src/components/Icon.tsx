// Thin wrapper over lucide-react-native that gives us:
//   • A semantic name space that matches our app concepts (flight, hotel, map,
//     phone, ...), so swapping to a different icon for a concept is a one-line
//     change here.
//   • Consistent defaults (size 18, stroke 2) and theme-colored by default.

import React from 'react';
import {
  Plane,
  BedDouble,
  Ticket,
  Car,
  Map as MapIcon,
  Luggage,
  Plus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  MapPin,
  Phone,
  Calendar,
  Clock,
  Utensils,
  ShoppingBag,
  Ship,
  Train,
  Sparkles,
  BarChart3,
  Receipt,
  Wallet,
  Pencil,
  Trash2,
  Sun,
  Moon,
  MonitorSmartphone,
  Search,
  Filter,
  Download,
  Upload,
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';

export type IconName =
  | 'flight'
  | 'hotel'
  | 'activity'
  | 'transfer'
  | 'map'
  | 'luggage'
  | 'plus'
  | 'close'
  | 'check'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'arrowRight'
  | 'arrowUpRight'
  | 'arrowDown'
  | 'arrowUp'
  | 'refresh'
  | 'pin'
  | 'phone'
  | 'calendar'
  | 'clock'
  | 'utensils'
  | 'bag'
  | 'ship'
  | 'train'
  | 'sparkles'
  | 'chart'
  | 'receipt'
  | 'wallet'
  | 'edit'
  | 'trash'
  | 'sun'
  | 'moon'
  | 'auto'
  | 'search'
  | 'filter'
  | 'download'
  | 'upload';

const MAP: Record<IconName, React.ComponentType<LucideProps>> = {
  flight: Plane,
  hotel: BedDouble,
  activity: Ticket,
  transfer: Car,
  map: MapIcon,
  luggage: Luggage,
  plus: Plus,
  close: X,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  arrowRight: ArrowRight,
  arrowUpRight: ArrowUpRight,
  arrowDown: ArrowDown,
  arrowUp: ArrowUp,
  refresh: RefreshCw,
  pin: MapPin,
  phone: Phone,
  calendar: Calendar,
  clock: Clock,
  utensils: Utensils,
  bag: ShoppingBag,
  ship: Ship,
  train: Train,
  sparkles: Sparkles,
  chart: BarChart3,
  receipt: Receipt,
  wallet: Wallet,
  edit: Pencil,
  trash: Trash2,
  sun: Sun,
  moon: Moon,
  auto: MonitorSmartphone,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,
};

type Props = Omit<LucideProps, 'ref'> & {
  name: IconName;
};

export function Icon({ name, size = 18, strokeWidth = 2, color, ...rest }: Props) {
  const { colors } = useTheme();
  const Cmp = MAP[name];
  return <Cmp size={size} strokeWidth={strokeWidth} color={color ?? colors.text} {...rest} />;
}

// Semantic exports for category → icon mapping used elsewhere
export const CATEGORY_ICON_NAME: Record<string, IconName> = {
  Flights: 'flight',
  Hotels: 'hotel',
  Ferry: 'ship',
  Train: 'train',
  Cabs: 'transfer',
  Food: 'utensils',
  Shopping: 'bag',
  Activities: 'activity',
  Others: 'sparkles',
};

export const BOOKING_ICON_NAME = {
  flight: 'flight' as const,
  hotel: 'hotel' as const,
  activity: 'activity' as const,
  transfer: 'transfer' as const,
};
