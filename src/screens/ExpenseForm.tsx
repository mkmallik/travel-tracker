import React, { useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DatePicker } from '../components/DatePicker';
import { useAppStore } from '../store/useAppStore';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';
import type { Currency, Expense, ExpenseCategory } from '../data/types';
import { EXPENSE_CATEGORIES } from '../data/types';
import { Icon, CATEGORY_ICON_NAME } from '../components/Icon';
import { findDayNumForIso, todayIso } from '../utils/date';

type Props = {
  existing?: Expense;
  initialDate?: string;
  onSaved: () => void;
  onCancel: () => void;
};

export function ExpenseForm({ existing, initialDate, onSaved, onCancel }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { days, addExpense, updateExpense } = useAppStore();

  const isEditing = !!existing;

  const [amount, setAmount] = useState(existing?.amount ? String(existing.amount) : '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'THB');
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? 'Food');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(
    existing?.date || initialDate || todayIso()
  );

  const [busy, setBusy] = useState(false);

  const resolvedDayNum = useMemo(() => findDayNumForIso(date, days), [date, days]);
  const canSave = parseFloat(amount) > 0 && date.length === 10;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const amt = parseFloat(amount);
      if (existing) {
        await updateExpense({
          ...existing,
          amount: amt,
          currency,
          category,
          note: note.trim(),
          date,
          dayNum: resolvedDayNum,
        });
      } else {
        await addExpense({
          amount: amt,
          currency,
          category,
          note: note.trim(),
          date,
          dayNum: resolvedDayNum,
        });
      }
      onSaved();
    } catch (e: any) {
      alert(`Save failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{isEditing ? 'Edit expense' : 'Log expense'}</Text>
        <Pressable style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelTxt}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>AMOUNT</Text>
      <View style={styles.amountCard}>
        <View style={styles.amountRow}>
          <Text style={styles.amountSymbol}>{currency === 'THB' ? '฿' : '₹'}</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={styles.curToggle}>
          {(['THB', 'INR'] as Currency[]).map((c) => (
            <Pressable
              key={c}
              style={[styles.curBtn, currency === c && styles.curBtnOn]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.curBtnTxt, currency === c && styles.curBtnTxtOn]}>
                {c === 'THB' ? '฿ THB' : '₹ INR'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.label}>CATEGORY</Text>
      <View style={styles.catWrap}>
        {EXPENSE_CATEGORIES.map((c) => {
          const on = category === c;
          return (
            <Pressable
              key={c}
              style={[styles.catChip, on && styles.catChipOn]}
              onPress={() => setCategory(c)}
            >
              <Icon name={CATEGORY_ICON_NAME[c] ?? 'sparkles'} size={14} color={on ? colors.bg : colors.textMuted} strokeWidth={2.1} />
              <Text style={[styles.catTxt, on && styles.catTxtOn]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>DATE</Text>
      <DatePicker value={date} onChange={setDate} />
      {resolvedDayNum ? (
        <Text style={styles.dayHint}>Linked to Day {resolvedDayNum}</Text>
      ) : null}

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, { minHeight: 60 }]}
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Taxi from airport"
        placeholderTextColor={colors.placeholder}
        multiline
      />

      <Pressable onPress={save} disabled={!canSave || busy}>
        <LinearGradient
          colors={canSave && !busy ? ['#3A5BD9', '#7C3AED'] : ['#CBD5E1', '#CBD5E1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.saveBtn}
        >
          <Text style={styles.saveTxt}>
            {busy ? 'Saving…' : (isEditing ? '✓  Save changes' : '＋  Save expense')}
          </Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { padding: 18, paddingBottom: 60 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { fontSize: 26, fontWeight: '800', color: c.text },
  cancel: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.cardBgAlt, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontSize: 22, color: c.text, fontWeight: '600', lineHeight: 24 },

  label: { fontSize: 11, color: c.textSubtle, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },

  amountCard: {
    backgroundColor: c.cardBg, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: c.border,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 6 },
  amountSymbol: { fontSize: 28, color: c.placeholder, fontWeight: '700', marginRight: 4 },
  amountInput: {
    flex: 1, fontSize: 36, fontWeight: '800', color: c.text, paddingVertical: 2,
  },
  curToggle: {
    flexDirection: 'row', backgroundColor: c.cardBgAlt, borderRadius: 12, padding: 4, marginTop: 10,
  },
  curBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  curBtnOn: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border },
  curBtnTxt: { color: c.textMuted, fontWeight: '600', fontSize: 13 },
  curBtnTxtOn: { color: c.text },

  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6 as any,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999,
    backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border,
  },
  catChipOn: { backgroundColor: c.borderStrong, borderColor: c.borderStrong },
  catIcon: { fontSize: 15 },
  catTxt: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
  catTxtOn: { color: c.bg },

  input: {
    backgroundColor: c.cardBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: c.text,
    borderWidth: 1, borderColor: c.border,
  },

  dayHint: { fontSize: 12, color: c.textMuted, marginTop: 6 },

  saveBtn: { marginTop: 22, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
