import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
};

export function DatePicker({ value, onChange, minDate, maxDate }: Props) {
  if (Platform.OS === 'web') {
    // Raw DOM input — react-native-web passes through intrinsic elements
    // @ts-ignore
    return React.createElement('input', {
      type: 'date',
      value,
      min: minDate,
      max: maxDate,
      onChange: (e: any) => onChange(e.target.value),
      style: {
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        fontSize: 16,
        fontWeight: 500,
        color: '#0F172A',
        border: '1px solid #E2E8F0',
        outline: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
      },
    });
  }

  // Native (iOS/Android): lazy-load DateTimePicker to keep web bundle clean
  return <NativeDatePicker value={value} onChange={onChange} minDate={minDate} maxDate={maxDate} />;
}

function NativeDatePicker({ value, onChange, minDate, maxDate }: Props) {
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
      <Pressable style={styles.trigger} onPress={() => setShow(true)}>
        <Text style={styles.triggerTxt}>{formatLabel(value)}</Text>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  triggerTxt: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
});
