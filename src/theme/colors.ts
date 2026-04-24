export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'auto' | 'light' | 'dark';

export type ThemeColors = {
  bg: string;              // screen background
  bgElevated: string;      // elevated surface (modal, top card)
  cardBg: string;          // card background
  cardBgAlt: string;       // secondary card background (e.g. chip row, subtle panel)
  inputBg: string;         // text input background
  border: string;          // card/chip borders and separators
  borderStrong: string;    // stronger borders (focused / selected)
  text: string;            // primary text
  textMuted: string;       // secondary text
  textSubtle: string;      // tertiary text (hints, labels)
  placeholder: string;     // input placeholder text
  onAccent: string;        // text over the accent color
  accent: string;          // primary brand color
  accentMuted: string;     // tinted accent for subtle fills
  danger: string;          // error text / delete buttons
  overlay: string;         // full-screen scrim behind modals
  shadow: string;          // shadow color for cards
};

export const LIGHT: ThemeColors = {
  bg: '#F3F4F6',
  bgElevated: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBgAlt: '#F1F5F9',
  inputBg: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#0F172A',
  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#6B7280',
  placeholder: '#94A3B8',
  onAccent: '#FFFFFF',
  accent: '#3A5BD9',
  accentMuted: '#E0E7FF',
  danger: '#DC2626',
  overlay: 'rgba(0,0,0,0.45)',
  shadow: '#0F172A',
};

export const DARK: ThemeColors = {
  bg: '#0B1220',
  bgElevated: '#131A2B',
  cardBg: '#1A2233',
  cardBgAlt: '#111827',
  inputBg: '#0F172A',
  border: '#1F2937',
  borderStrong: '#E2E8F0',
  text: '#F1F5F9',
  textMuted: '#CBD5E1',
  textSubtle: '#94A3B8',
  placeholder: '#475569',
  onAccent: '#FFFFFF',
  accent: '#60A5FA',
  accentMuted: '#1E3A8A',
  danger: '#F87171',
  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000000',
};

export function colorsFor(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? DARK : LIGHT;
}
