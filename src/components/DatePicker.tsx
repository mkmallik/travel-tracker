import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
};

export function DatePicker({ value, onChange, minDate, maxDate }: Props) {
  const { colors, mode } = useTheme();

  if (Platform.OS === 'web') {
    // Raw DOM input — react-native-web passes through intrinsic elements
    // @ts-ignore
    return React.createElement('input', {
      type: 'date',
      value,
      min: minDate,
      max: maxDate,
      onChange: (e: any) => onChange(e.target.value),
      // @ts-ignore — only valid on web
      ['data-color-scheme']: mode,
      style: {
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: colors.cardBg,
        borderRadius: 12,
        padding: '14px 16px',
        fontSize: 16,
        fontWeight: 500,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        outline: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(15,23,42,0.05)',
        colorScheme: mode,
      },
    });
  }

  return <NativeDatePicker value={value} onChange={onChange} minDate={minDate} maxDate={maxDate} />;
}

function NativeDatePicker({ value, onChange, minDate, maxDate }: Props) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const [DateTimePicker, setDTP] = useState<any>(null);

  React.useEffect(() => {
    import('@react-native-community/datetimepicker')
      .then((mod) => setDTP(() => mod.default))
      .catch(() => {});
  }, []);

  const parseDate = (iso: string): Date => {
    if (!iso) return new Date();
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const formatLabel = (iso: string): string => {
    if (!iso) return 'Tap to pick a date';
    const d = parseDate(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.triggerTxt, { color: colors.text }]}>{formatLabel(value)}</Text>
      </Pressable>
      {show && DateTimePicker ? (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minDate ? parseDate(minDate) : undefined}
          maximumDate={maxDate ? parseDate(maxDate) : undefined}
          onChange={(_e: any, date?: Date) => {
            setShow(false);
            if (date) {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              onChange(`${y}-${m}-${d}`);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  triggerTxt: {
    fontSize: 16,
    fontWeight: '500',
  },
});
