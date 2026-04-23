import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { formatDual } from '../utils/fx';
import type { Currency } from '../data/types';
import { useAppStore } from '../store/useAppStore';

type Props = {
  amount: number;
  currency: Currency;
  style?: TextStyle;
};

export function Money({ amount, currency, style }: Props) {
  const fx = useAppStore((s) => s.fxInrPerThb);
  return <Text style={[styles.txt, style]}>{formatDual(amount, currency, fx)}</Text>;
}

const styles = StyleSheet.create({
  txt: { fontVariant: ['tabular-nums'] },
});
