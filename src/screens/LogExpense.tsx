import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { themeForCity } from '../data/theme';
import { DatePicker } from '../components/DatePicker';
import { BookingForm } from './BookingForm';
import { ExpenseForm } from './ExpenseForm';
import type { BookingType, Expense } from '../data/types';
import { BOOKING_LABELS } from '../utils/bookings';
import { Icon, BOOKING_ICON_NAME, CATEGORY_ICON_NAME, type IconName } from '../components/Icon';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';
import { Modal } from 'react-native';

type LogMode = 'expense' | BookingType;

type Props = {
  route?: { params?: { dayNum?: number } };
  navigation?: any;
};

export function LogExpenseScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { days, expenses, addExpense, removeExpense } = useAppStore();
  const [logMode, setLogMode] = useState<LogMode>('expense');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const chipListRef = useRef<FlatList<{ iso: string; [k: string]: any }>>(null);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('THB');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [note, setNote] = useState('');

  // Defaults: always start with today's date.
  // - If today is a trip day, show chip strip with today's chip highlighted.
  // - Otherwise, default to "Other date" mode with today pre-filled in the
  //   calendar so users aren't nudged to pick a random trip day.
  const todayOnMount = todayIso();
  const todayIsTripDay = !!findDayNumForIso(todayOnMount, days);
  const [selectedIso, setSelectedIso] = useState<string>(() => {
    if (todayIsTripDay) return todayOnMount;
    const firstIso = days[0] ? dayIsoFromSeed(days[0]) : null;
    return firstIso ?? todayOnMount;
  });
  const [customDate, setCustomDate] = useState(() => todayOnMount);
  const [mode, setMode] = useState<'trip' | 'other'>(todayIsTripDay ? 'trip' : 'other');

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

  // Auto-scroll the chip strip to the selected chip (keeps today's chip
  // or the param-supplied day visible without user scrolling).
  useEffect(() => {
    if (mode !== 'trip' || !chipListRef.current) return;
    const idx = days.findIndex((d) => dayIsoFromSeed(d) === selectedIso);
    if (idx < 0) return;
    const t = setTimeout(() => {
      try {
        chipListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.15 });
      } catch {
        /* onScrollToIndexFailed retries */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [mode, selectedIso, days]);

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

  const modeTabs: Array<{ key: LogMode; icon: IconName; label: string }> = [
    { key: 'expense', icon: 'wallet', label: 'Expense' },
    { key: 'hotel', icon: BOOKING_ICON_NAME.hotel, label: BOOKING_LABELS.hotel },
    { key: 'flight', icon: BOOKING_ICON_NAME.flight, label: BOOKING_LABELS.flight },
    { key: 'activity', icon: BOOKING_ICON_NAME.activity, label: BOOKING_LABELS.activity },
    { key: 'transfer', icon: BOOKING_ICON_NAME.transfer, label: BOOKING_LABELS.transfer },
  ];

  const modeStrip = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.modeTabStrip}
      style={styles.modeTabScroll}
    >
      {modeTabs.map((item) => {
        const on = logMode === item.key;
        return (
          <Pressable
            key={item.key}
            style={[styles.modeTab, on && styles.modeTabOn]}
            onPress={() => setLogMode(item.key)}
          >
            <Icon name={item.icon} size={14} color={on ? colors.bg : colors.textMuted} strokeWidth={2.1} />
            <Text style={[styles.modeTabLabel, on && styles.modeTabLabelOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (logMode !== 'expense') {
    const paramDay = route?.params?.dayNum
      ? days.find((d) => d.dayNum === route.params!.dayNum)
      : undefined;
    const initDate = paramDay ? dayIsoFromSeed(paramDay) ?? undefined : undefined;
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 16, backgroundColor: '#F3F4F6' }}>
        {modeStrip}
        <BookingForm
          key={logMode}
          initialType={logMode}
          initialDate={initDate}
          onSaved={() => setLogMode('expense')}
          onCancel={() => setLogMode('expense')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 56, paddingHorizontal: 18 }}
      keyboardShouldPersistTaps="handled"
    >
      {modeStrip}
      <Text style={styles.kicker}>NEW ENTRY</Text>
      <Text style={styles.h1}>Log expense</Text>

      <View style={styles.amountCard}>
        <View style={styles.amountRow}>
          <Text style={styles.amountCurrencySymbol}>{currency === 'THB' ? '฿' : '₹'}</Text>
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
          ref={chipListRef as any}
          horizontal
          data={chips}
          keyExtractor={(c) => c.iso}
          contentContainerStyle={styles.chipStrip}
          showsHorizontalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              chipListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.1 });
            }, 200);
          }}
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
        <DatePicker value={customDate} onChange={setCustomDate} />
      )}

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="e.g. Taxi from airport"
        placeholderTextColor={colors.placeholder}
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
            <Pressable key={e.id} style={styles.recentRow} onPress={() => setEditingExpense(e)}>
              <View style={styles.recentIconWrap}>
                <Icon name={CATEGORY_ICON_NAME[e.category] ?? 'sparkles'} size={16} color={colors.textMuted} strokeWidth={2} />
              </View>
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
              <Pressable
                onPress={(ev) => { ev.stopPropagation?.(); removeExpense(e.id); }}
                style={styles.delBtn}
              >
                <Icon name="close" size={14} color={colors.textMuted} strokeWidth={2.2} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal
        visible={!!editingExpense}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingExpense(null)}
      >
        <View style={[styles.editBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.editSheet, { backgroundColor: colors.bg }]}>
            {editingExpense ? (
              <ExpenseForm
                existing={editingExpense}
                onSaved={() => setEditingExpense(null)}
                onCancel={() => setEditingExpense(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.bg },

  kicker: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.5 },
  h1: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 2, marginBottom: 16 },
  label: { fontSize: 11, color: c.textSubtle, fontWeight: '800', letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },

  amountCard: {
    backgroundColor: c.cardBg, borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: c.border,
    shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 6 },
  amountCurrencySymbol: { fontSize: 32, color: c.placeholder, fontWeight: '700', marginRight: 4 },
  amountInput: {
    flex: 1, fontSize: 44, fontWeight: '800', color: c.text, paddingVertical: 4,
  },
  curToggle: {
    flexDirection: 'row', backgroundColor: c.cardBgAlt, borderRadius: 12, padding: 4, marginTop: 10,
  },
  curBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  curBtnOn: { backgroundColor: c.cardBg, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
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

  modeRow: { flexDirection: 'row', gap: 8 as any, marginBottom: 10 },
  modeBtn: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border,
  },
  modeBtnOn: { backgroundColor: c.borderStrong, borderColor: c.borderStrong },
  modeTxt: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  modeTxtOn: { color: c.bg },

  chipStrip: { paddingVertical: 4, gap: 8 as any, paddingRight: 20 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border,
    minWidth: 104, marginRight: 8,
  },
  dayChipLabel: { fontSize: 16, fontWeight: '800', color: c.text },
  dayChipLabelOn: { color: '#fff' },
  dayChipCity: { fontSize: 11, color: c.textMuted, marginTop: 3 },
  dayChipCityOn: { color: 'rgba(255,255,255,0.9)' },
  dayChipDate: { fontSize: 10, color: c.placeholder, marginTop: 2 },
  dayChipDateOn: { color: 'rgba(255,255,255,0.8)' },

  dateInput: {
    backgroundColor: c.cardBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, fontWeight: '500', color: c.text,
  },

  noteInput: {
    backgroundColor: c.cardBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: c.text,
    borderWidth: 1, borderColor: c.border,
  },

  summaryLine: { marginTop: 20 },
  summaryText: { color: c.textMuted, fontSize: 13, fontWeight: '500' },

  saveBtn: {
    marginTop: 14, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  recentWrap: { marginTop: 10 },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.cardBg, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: c.border,
    shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  recentIcon: { fontSize: 22, marginRight: 10 },
  recentIconWrap: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.cardBgAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  recentCat: { fontSize: 14, fontWeight: '700', color: c.text },
  recentSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  recentAmt: { fontSize: 13, color: c.text, marginRight: 10, fontWeight: '600' },
  delBtn: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: c.cardBgAlt,
  },
  delTxt: { fontSize: 18, color: c.textMuted, lineHeight: 20 },

  modeTabScroll: { flexGrow: 0, maxHeight: 48, marginBottom: 12 },
  modeTabStrip: { paddingHorizontal: 4, alignItems: 'center' },
  modeTab: {
    backgroundColor: c.cardBg, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
    marginRight: 8,
    height: 36,
  },
  modeTabOn: { backgroundColor: c.borderStrong, borderColor: c.borderStrong },
  modeTabIcon: { fontSize: 15, marginRight: 6 },
  modeTabLabel: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  modeTabLabelOn: { color: c.bg },

  editBackdrop: { flex: 1, justifyContent: 'flex-end' },
  editSheet: { height: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
});
