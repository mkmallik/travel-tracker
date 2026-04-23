import type { ExpenseCategory } from './types';

export type CityTheme = {
  key: string;
  accent: string;
  light: string;
  gradient: [string, string];
  emoji: string;
};

export const CITY_THEMES: Record<string, CityTheme> = {
  Phuket: {
    key: 'Phuket',
    accent: '#0EA5E9',
    light: '#E0F2FE',
    gradient: ['#0EA5E9', '#14B8A6'],
    emoji: '🏝️',
  },
  Krabi: {
    key: 'Krabi',
    accent: '#F97316',
    light: '#FFEDD5',
    gradient: ['#F97316', '#FB923C'],
    emoji: '⛵',
  },
  'Koh Samui': {
    key: 'Koh Samui',
    accent: '#10B981',
    light: '#D1FAE5',
    gradient: ['#10B981', '#059669'],
    emoji: '🌴',
  },
  Bangkok: {
    key: 'Bangkok',
    accent: '#7C3AED',
    light: '#EDE9FE',
    gradient: ['#7C3AED', '#EC4899'],
    emoji: '🛕',
  },
};

export const DEFAULT_THEME: CityTheme = {
  key: 'Default',
  accent: '#3A5BD9',
  light: '#E0E7FF',
  gradient: ['#3A5BD9', '#6366F1'],
  emoji: '✈️',
};

export function themeForCity(city: string): CityTheme {
  return CITY_THEMES[city] ?? DEFAULT_THEME;
}

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Flights: '✈️',
  Hotels: '🏨',
  Ferry: '⛴️',
  Train: '🚆',
  Cabs: '🚕',
  Food: '🍜',
  Shopping: '🛍️',
  Activities: '🎫',
  Others: '✨',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Flights: '#6366F1',
  Hotels: '#0EA5E9',
  Ferry: '#14B8A6',
  Train: '#10B981',
  Cabs: '#F59E0B',
  Food: '#F97316',
  Shopping: '#EC4899',
  Activities: '#8B5CF6',
  Others: '#64748B',
};
