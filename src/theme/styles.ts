import { useMemo } from 'react';
import { useTheme } from './useTheme';
import type { ThemeColors } from './colors';

// Hook: pass a factory, get back a theme-aware styles object.
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors]);
}
