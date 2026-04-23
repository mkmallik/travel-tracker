import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { Money } from '../components/Money';
import { EXPENSE_CATEGORIES } from '../data/types';
import type { Currency, ExpenseCategory } from '../data/types';
import {
  dayIsoFromSeed,
  findDayNumForIso,
  shortDate,
  todayIso,
} from '../utils/date';
import { themeForCity, CATEGORY_ICONS } from '../data/theme';

type Props = {
  route?: { params?: { dayNum?: number } };
  navigation?: any;
};

export function LogExpenseScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { days, expenses, addExpense, removeExpense } = useAppStore();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('THB');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [note, setNote] = useState('');
  const [selectedIso, setSelectedIso] = useState<string>(() => {
    const today = todayIso();
    const firstDayIso = days[0] ? dayIsoFromSeed(days[0]) : null;
    if (findDayNumForIso(today, days)) return today;
    return firstDayIso ?? today;
  });
  const [customDate, setCustomDate] = useState('');
  const [mode, setMode] = useState<'trip' | 'other'>('trip');

  useEffect(() => {
    const param = route?.params?.dayNum;
    if (param) {
      const d = days.find((x) => x.dayNum === param);
      const iso = d ? dayIsoFromSeed(d) : null;
      if (iso) {
        setSelectedIso(iso);
        setMode('trip');
      }
    }
  }, [route?.params?.dayNum, days]);

  const chips = useMemo(
    () =>
      days
        .map((d) => ({ dayNum: d.dayNum, iso: dayIsoFromSeed(d), label: `D${d.dayNum}`, city: d.stayCity }))
        .filter((c) => !!c.iso) as { dayNum: number; iso: string; label: string; city: string }[],
    [days]
  );

  const effectiveIso = mode === 'trip' ? selectedIso : customDate;
  const resolvedDayNum = useMemo(
    () => (effectiveIso ? findDayNumForIso(effectiveIso, days) : null),
    [effectiveIso, days]
  );
  const resolvedDay = resolvedDayNum ? days.find((d) => d.dayNum === resolvedDayNum) : null;
  const resolvedTheme = resolvedDay ? themeForCity(resolvedDay.stayCity) : null;

  const canSave =
    parseFloat(amount) > 0 && effectiveIso.length === 10 && !!category;

  const save = () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    addExpense({
      amount: amt,
      currency,
      category,
      date: effectiveIso,
      dayNum: resolvedDayNum,
      note: note.trim(),
    });
    setAmount('');
    setNote('');
  };

  const recent = [...expenses].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 56, paddingHorizontal: 18 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.kicker}>NEW ENTRY</Text>
      <Text style={styles.h1}>Log expense</Text>

      <View style={styles.amountCard}>
        <View style={styles.amountRow}>
          <Text style={styles.amountCurrencySymbol}>{currency === 'THB' ? '฿' : '₹'}</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor="#CBD5E1"
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
              <Text style={styles.catIcon}>{CATEGORY_ICONS[c]}</Text>
              <Text style={[styles.catTxt, on && styles.catTxtOn]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>DATE</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, mode === 'trip' && styles.modeBtnOn]}
          onPress={() => setMode('trip')}
        >
          <Text style={[styles.modeTxt, mode === 'trip' && styles.modeTxtOn]}>📅 Trip day</Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === 'other' && styles.modeBtnOn]}
          onPress={() => setMode('other')}
        >
          <Text style={[styles.modeTxt, mode === 'other' && styles.modeTxtOn]}>Other date</Text>
        </Pressable>
      </View>

      {mode === 'trip' ? (
        <FlatList
          horizontal
          data={chips}
          keyExtractor={(c) => c.iso}
          contentContainerStyle={styles.chipStrip}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const on = selectedIso === item.iso;
            const theme = themeForCity(item.city);
            return (
              <Pressable
                style={[
                  styles.dayChip,
                  on && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => setSelectedIso(item.iso)}
              >
                <Text style={[styles.dayChipLabel, on && styles.dayChipLabelOn]}>{item.label}</Text>
                <Text style={[styles.dayChipCity, on && styles.dayChipCityOn]}>
                  {theme.emoji} {item.city}
                </Text>
                <Text style={[styles.dayChipDate, on && styles.dayChipDateOn]}>
                  {shortDate(item.iso)}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : (
        <TextInput
          style={styles.dateInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#CBD5E1"
          value={customDate}
          onChangeText={setCustomDate}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="e.g. Taxi from airport"
        placeholderTextColor="#CBD5E1"
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.summaryLine}>
        <Text style={styles.summaryText}>
          {effectiveIso ? `Logging for ${shortDate(effectiveIso)}` : 'No date'}
          {resolvedDay ? `  ·  ${resolvedTheme?.emoji} Day ${resolvedDay.dayNum}, ${resolvedDay.stayCity}` : ''}
        </Text>
      </View>

      <Pressable
        onPress={save}
        disabled={!canSave}
      >
        <LinearGradient
          colors={canSave ? ['#3A5BD9', '#7C3AED'] : ['#CBD5E1', '#CBD5E1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.saveBtn}
        >
          <Text style={styles.saveTxt}>＋  Save expense</Text>
        </LinearGradient>
      </Pressable>

      {recent.length > 0 ? (
        <View style={styles.recentWrap}>
          <Text style={styles.label}>RECENT</Text>
          {recent.map((e) => (
            <View key={e.id} style={styles.recentRow}>
              <Text style={styles.recentIcon}>{CATEGORY_ICONS[e.category]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentCat}>
                  {e.category}
                  {e.dayNum ? `  ·  Day ${e.dayNum}` : ''}
                </Text>
                <Text style={styles.recentSub}>
                  {shortDate(e.date)}
                  {e.note ? ` · ${e.note}` : ''}
                </Text>
              </View>
              <Money amount={e.amount} currency={e.currency} style={styles.recentAmt} />
              <Pressable onPress={() => removeExpense(e.id)} style={styles.delBtn}>
                <Text style={styles.delTxt}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },

  kicker: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5 },
  h1: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 2, marginBottom: 16 },
  label: { fontSize: 11, color: '#6B7280', fontWeight: '800', letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },

  amountCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 6 },
  amountCurrencySymbol: { fontSize: 32, color: '#94A3B8', fontWeight: '700', marginRight: 4 },
  amountInput: {
    flex: 1, fontSize: 44, fontWeight: '800', color: '#0F172A', paddingVertical: 4,
  },
  curToggle: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginTop: 10,
  },
  curBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  curBtnOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  curBtnTxt: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  curBtnTxtOn: { color: '#0F172A' },

  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6 as any,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
  },
  catChipOn: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  catIcon: { fontSize: 15 },
  catTxt: { color: '#334155', fontSize: 13, fontWeight: '600' },
  catTxtOn: { color: '#fff' },

  modeRow: { flexDirection: 'row', gap: 8 as any, marginBottom: 10 },
  modeBtn: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
  },
  modeBtnOn: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  modeTxt: { fontSize: 13, color: '#334155', fontWeight: '600' },
  modeTxtOn: { color: '#fff' },

  chipStrip: { paddingVertical: 4, gap: 8 as any, paddingRight: 20 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    minWidth: 104, marginRight: 8,
  },
  dayChipLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  dayChipLabelOn: { color: '#fff' },
  dayChipCity: { fontSize: 11, color: '#475569', marginTop: 3 },
  dayChipCityOn: { color: 'rgba(255,255,255,0.9)' },
  dayChipDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  dayChipDateOn: { color: 'rgba(255,255,255,0.8)' },

  dateInput: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, fontWeight: '500',
  },

  noteInput: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15,
  },

  summaryLine: { marginTop: 20 },
  summaryText: { color: '#64748B', fontSize: 13, fontWeight: '500' },

  saveBtn: {
    marginTop: 14, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  recentWrap: { marginTop: 10 },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  recentIcon: { fontSize: 22, marginRight: 10 },
  recentCat: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  recentSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  recentAmt: { fontSize: 13, color: '#0F172A', marginRight: 10, fontWeight: '600' },
  delBtn: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: '#F1F5F9',
  },
  delTxt: { fontSize: 18, color: '#94A3B8', lineHeight: 20 },
});
