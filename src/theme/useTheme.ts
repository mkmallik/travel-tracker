import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { colorsFor, type ThemeColors, type ThemeMode } from './colors';

export function useTheme(): { mode: ThemeMode; colors: ThemeColors } {
  const pref = useAppStore((s) => s.themePref);
  const system = useColorScheme();
  const mode: ThemeMode =
    pref === 'auto'
      ? (system === 'dark' ? 'dark' : 'light')
      : pref;
  return { mode, colors: colorsFor(mode) };
}
