import React, { useMemo, useState } from 'react';
import {
  Modal,
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
import {
  formatDual,
  formatTHB,
  formatINR,
  toThb,
  toInr,
} from '../utils/fx';
import { EXPENSE_CATEGORIES } from '../data/types';
import type { ExpenseCategory } from '../data/types';
import { shortDate } from '../utils/date';
import {
  expensesToCsv,
  daysToCsv,
  csvToExpenses,
  csvToDays,
} from '../utils/csv';
import { exportCsv, importCsv, confirm, alertMessage } from '../utils/fileIo';
import {
  CATEGORY_COLORS,
  themeForCity,
} from '../data/theme';
import { Icon, CATEGORY_ICON_NAME } from '../components/Icon';
import { CATEGORY_FOR_BOOKING_TYPE } from '../data/types';
import { costIsoForBooking } from '../utils/bookings';
import { findDayNumForIso } from '../utils/date';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';

export function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { mode, colors } = useTheme();
  const {
    expenses, days, bookings, fxInrPerThb,
    setFxRate, replaceExpenses, appendExpenses, replaceDays,
    refresh, logout, syncing, lastSyncedAt, syncError,
    themePref, setThemePref,
  } = useAppStore();

  const [fxOpen, setFxOpen] = useState(false);
  const [fxInput, setFxInput] = useState(String(fxInrPerThb));
  const [busy, setBusy] = useState(false);

  const stamp = () => new Date().toISOString().slice(0, 10);

  const handleExportExpenses = async () => {
    if (expenses.length === 0) {
      alertMessage('Nothing to export', 'You have not logged any expenses yet.');
      return;
    }
    setBusy(true);
    try {
      const csv = expensesToCsv(expenses, fxInrPerThb);
      await exportCsv(`thailand-expenses-${stamp()}.csv`, csv);
    } catch (e) {
      alertMessage('Export failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleExportItinerary = async () => {
    setBusy(true);
    try {
      const csv = daysToCsv(days);
      await exportCsv(`thailand-itinerary-${stamp()}.csv`, csv);
    } catch (e) {
      alertMessage('Export failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleImportExpenses = async () => {
    setBusy(true);
    try {
      const text = await importCsv();
      if (!text) return;
      const parsed = csvToExpenses(text);
      if (parsed.length === 0) {
        alertMessage('Import failed', 'No valid expense rows found. Columns needed: date, dayNum, category, amount, currency, note.');
        return;
      }
      let mode: 'replace' | 'append' = 'append';
      if (expenses.length > 0) {
        const replace = await confirm(
          `Import ${parsed.length} expenses`,
          `You have ${expenses.length} existing expenses.\n\nOK = REPLACE all expenses.\nCancel = APPEND to the existing list.`
        );
        mode = replace ? 'replace' : 'append';
      } else {
        mode = 'replace';
      }
      if (mode === 'replace') replaceExpenses(parsed);
      else appendExpenses(parsed);
      alertMessage('Import complete', `${mode === 'replace' ? 'Replaced with' : 'Appended'} ${parsed.length} expense${parsed.length === 1 ? '' : 's'}.`);
    } catch (e) {
      alertMessage('Import failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleImportItinerary = async () => {
    setBusy(true);
    try {
      const text = await importCsv();
      if (!text) return;
      const parsed = csvToDays(text);
      if (parsed.length === 0) {
        alertMessage('Import failed', 'No valid day rows found. Expected columns: Day, Date, Stay, etc.');
        return;
      }
      const ok = await confirm(
        `Import ${parsed.length} days`,
        'This will replace the current itinerary. Logged expenses are kept.'
      );
      if (!ok) return;
      replaceDays(parsed);
      alertMessage('Itinerary updated', `Loaded ${parsed.length} days.`);
    } catch (e) {
      alertMessage('Import failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const totals = useMemo(() => {
    const expThb = expenses.reduce((s, e) => s + toThb(e.amount, e.currency, fxInrPerThb), 0);
    const bookingsThb = bookings.reduce((s, b) => s + toThb(b.amount, b.currency, fxInrPerThb), 0);
    const totalThb = expThb + bookingsThb;

    const expInr = expenses.reduce((s, e) => s + toInr(e.amount, e.currency, fxInrPerThb), 0);
    const bookingsInr = bookings.reduce((s, b) => s + toInr(b.amount, b.currency, fxInrPerThb), 0);
    const totalInr = expInr + bookingsInr;

    const byCategory: Record<ExpenseCategory, number> = Object.fromEntries(
      EXPENSE_CATEGORIES.map((c) => [c, 0])
    ) as Record<ExpenseCategory, number>;
    for (const e of expenses) {
      byCategory[e.category] += toThb(e.amount, e.currency, fxInrPerThb);
    }
    for (const b of bookings) {
      const cat = CATEGORY_FOR_BOOKING_TYPE[b.type];
      byCategory[cat] += toThb(b.amount, b.currency, fxInrPerThb);
    }

    const maxCat = Math.max(1, ...EXPENSE_CATEGORIES.map((c) => byCategory[c]));

    const byDay = days.map((d) => {
      const dayExpThb = expenses
        .filter((e) => e.dayNum === d.dayNum)
        .reduce((s, e) => s + toThb(e.amount, e.currency, fxInrPerThb), 0);
      const dayBookingThb = bookings
        .filter((b) => findDayNumForIso(costIsoForBooking(b), days) === d.dayNum)
        .reduce((s, b) => s + toThb(b.amount, b.currency, fxInrPerThb), 0);
      return { dayNum: d.dayNum, city: d.stayCity, thb: dayExpThb + dayBookingThb };
    });
    const maxDay = Math.max(1, ...byDay.map((d) => d.thb));

    return { totalThb, totalInr, byCategory, maxCat, byDay, maxDay, entriesCount: expenses.length + bookings.length };
  }, [expenses, bookings, days, fxInrPerThb]);

  const saveFx = () => {
    const n = parseFloat(fxInput);
    if (Number.isFinite(n) && n > 0) {
      setFxRate(n);
      setFxOpen(false);
    }
  };

  const topCategory = useMemo(() => {
    let best: { cat: ExpenseCategory; amt: number } | null = null;
    for (const c of EXPENSE_CATEGORIES) {
      const amt = totals.byCategory[c];
      if (amt > 0 && (!best || amt > best.amt)) best = { cat: c, amt };
    }
    return best;
  }, [totals]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 56, paddingHorizontal: 18 }}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>TRIP SPEND</Text>
          <Text style={styles.h1}>Summary</Text>
        </View>
        <Pressable style={styles.fxBtn} onPress={() => setFxOpen(true)}>
          <Text style={styles.fxLabel}>FX</Text>
          <Text style={styles.fxBtnTxt}>{fxInrPerThb.toFixed(2)}</Text>
        </Pressable>
      </View>

      <LinearGradient
        colors={['#3A5BD9', '#7C3AED', '#EC4899']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.totalCard}
      >
        <Text style={styles.totalLabel}>TOTAL SPENT</Text>
        <Text style={styles.totalThb}>{formatTHB(totals.totalThb)}</Text>
        <Text style={styles.totalInr}>{formatINR(totals.totalInr)}</Text>
        <View style={styles.totalFooter}>
          <View style={styles.totalFoot}>
            <Text style={styles.totalFootLabel}>Entries</Text>
            <Text style={styles.totalFootValue}>{totals.entriesCount}</Text>
          </View>
          {topCategory ? (
            <View style={styles.totalFoot}>
              <Text style={styles.totalFootLabel}>Top category</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 as any, marginTop: 3 }}>
                <Icon name={CATEGORY_ICON_NAME[topCategory.cat] ?? 'sparkles'} size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.totalFootValue}>{topCategory.cat}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.totalFoot}>
            <Text style={styles.totalFootLabel}>Days</Text>
            <Text style={styles.totalFootValue}>{days.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.sectionH}>By category</Text>
      <View style={styles.card}>
        {EXPENSE_CATEGORIES.map((c, i) => {
          const amt = totals.byCategory[c];
          const pct = totals.maxCat > 0 ? (amt / totals.maxCat) * 100 : 0;
          const color = CATEGORY_COLORS[c];
          return (
            <View key={c} style={[styles.catRow, i === 0 && { marginTop: 0 }]}>
              <View style={styles.catLabelRow}>
                <View style={styles.catHeader}>
                  <Icon name={CATEGORY_ICON_NAME[c] ?? 'sparkles'} size={15} color={color} strokeWidth={2} />
                  <Text style={styles.catName}>{c}</Text>
                </View>
                <Text style={styles.catAmt}>{formatDual(amt, 'THB', fxInrPerThb)}</Text>
              </View>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${pct}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionH}>By day</Text>
      <View style={styles.card}>
        {totals.byDay.map((d, i) => {
          const pct = totals.maxDay > 0 ? (d.thb / totals.maxDay) * 100 : 0;
          const theme = themeForCity(d.city);
          return (
            <View key={d.dayNum} style={[styles.catRow, i === 0 && { marginTop: 0 }]}>
              <View style={styles.catLabelRow}>
                <View style={styles.catHeader}>
                  <Text style={styles.catIcon}>{theme.emoji}</Text>
                  <Text style={styles.catName}>
                    Day {d.dayNum} · {d.city}
                  </Text>
                </View>
                <Text style={styles.catAmt}>{formatTHB(d.thb)}</Text>
              </View>
              <View style={styles.bar}>
                <LinearGradient
                  colors={theme.gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${pct}%` }]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionH}>Sync</Text>
      <View style={styles.card}>
        <View style={styles.syncRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncStatus}>
              {syncing
                ? 'Syncing…'
                : lastSyncedAt
                ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                : 'Not synced yet'}
            </Text>
            {syncError ? <Text style={styles.syncErr}>{syncError}</Text> : null}
          </View>
          <Pressable
            style={[styles.syncBtn, syncing && styles.dataBtnDisabled]}
            onPress={refresh}
            disabled={syncing}
          >
            <Icon name="refresh" size={14} color={colors.bg} strokeWidth={2.4} />
            <Text style={styles.syncBtnTxt}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionH}>Appearance</Text>
      <View style={styles.card}>
        <View style={styles.themeRow}>
          {([
            { key: 'auto', label: 'Auto', icon: 'auto' as const },
            { key: 'light', label: 'Light', icon: 'sun' as const },
            { key: 'dark', label: 'Dark', icon: 'moon' as const },
          ] as const).map((opt) => {
            const on = themePref === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.themeBtn, on && styles.themeBtnOn]}
                onPress={() => setThemePref(opt.key)}
              >
                <Icon name={opt.icon} size={14} color={on ? colors.bg : colors.text} strokeWidth={2} />
                <Text style={[styles.themeBtnTxt, on && styles.themeBtnTxtOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionH}>Data</Text>
      <View style={styles.card}>
        <Text style={styles.dataHint}>
          Back up local expenses or swap in a new trip itinerary as CSV. Edits made here write to your Google Sheet.
        </Text>
        <View style={styles.dataGrid}>
          <DataBtn icon="⬇" label="Export expenses" onPress={handleExportExpenses} busy={busy} />
          <DataBtn icon="⬆" label="Import expenses" onPress={handleImportExpenses} busy={busy} />
          <DataBtn icon="⬇" label="Export itinerary" onPress={handleExportItinerary} busy={busy} />
          <DataBtn icon="⬆" label="Import itinerary" onPress={handleImportItinerary} busy={busy} />
        </View>
      </View>

      <Pressable
        style={styles.signout}
        onPress={async () => {
          const ok = await confirm('Sign out?', 'You will need to enter the password again to return.');
          if (ok) await logout();
        }}
      >
        <Text style={styles.signoutTxt}>Sign out</Text>
      </Pressable>

      <Modal visible={fxOpen} transparent animationType="fade" onRequestClose={() => setFxOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFxOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.modalH}>Exchange rate</Text>
            <Text style={styles.modalSub}>INR per 1 THB</Text>
            <TextInput
              style={styles.fxInput}
              keyboardType="decimal-pad"
              value={fxInput}
              onChangeText={setFxInput}
              autoFocus
            />
            <Text style={styles.modalHint}>e.g. 2.45 means ฿100 ≈ ₹245</Text>
            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancel} onPress={() => setFxOpen(false)}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={saveFx}>
                <Text style={styles.modalSaveTxt}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function DataBtn({
  icon, label, onPress, busy,
}: {
  icon: string; label: string; onPress: () => void; busy: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.dataBtn, busy && styles.dataBtnDisabled]}
      onPress={onPress}
      disabled={busy}
    >
      <Text style={styles.dataBtnIcon}>{icon}</Text>
      <Text style={styles.dataBtnLabel}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.bg },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  kicker: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.5 },
  h1: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 2 },

  fxBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6 as any,
    backgroundColor: c.cardBg, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: c.border,
  },
  fxLabel: { fontSize: 10, color: c.textSubtle, fontWeight: '800', letterSpacing: 1 },
  fxBtnTxt: { fontSize: 13, fontWeight: '700', color: c.text },

  totalCard: {
    borderRadius: 22, padding: 22, marginBottom: 22,
    shadowColor: '#7C3AED', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  totalLabel: { color: '#E0E7FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  totalThb: { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  totalInr: { color: '#E0E7FF', fontSize: 20, fontWeight: '700', marginTop: 4 },
  totalFooter: { flexDirection: 'row', marginTop: 20, gap: 18 as any },
  totalFoot: {},
  totalFootLabel: { color: '#C7D2FE', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  totalFootValue: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 3 },

  sectionH: {
    fontSize: 13, fontWeight: '800', color: c.textSubtle, marginBottom: 10,
    letterSpacing: 1, textTransform: 'uppercase',
  },

  card: {
    backgroundColor: c.cardBg, borderRadius: 18, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: c.border,
    shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },

  catRow: { marginTop: 12 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 as any },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  catAmt: { fontSize: 12, color: c.text, fontWeight: '700' },
  bar: { height: 8, backgroundColor: c.cardBgAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  backdrop: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: c.bgElevated, borderRadius: 18, padding: 22, width: '100%', maxWidth: 360 },
  modalH: { fontSize: 18, fontWeight: '800', color: c.text },
  modalSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },
  fxInput: {
    marginTop: 14, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 24, fontWeight: '800', color: c.text,
    borderWidth: 1, borderColor: c.border,
  },
  modalHint: { fontSize: 12, color: c.placeholder, marginTop: 8 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 as any, marginTop: 18 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 10 },
  modalCancelTxt: { color: c.textMuted, fontWeight: '700' },
  modalSave: { backgroundColor: '#3A5BD9', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  modalSaveTxt: { color: '#fff', fontWeight: '800' },

  dataHint: { fontSize: 12, color: c.textMuted, marginBottom: 12 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any },
  dataBtn: {
    flexBasis: '48%', flexGrow: 1,
    backgroundColor: c.cardBgAlt, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10 as any,
    borderWidth: 1, borderColor: c.border,
  },
  dataBtnDisabled: { opacity: 0.5 },
  dataBtnIcon: { fontSize: 17, color: c.accent, fontWeight: '700' },
  dataBtnLabel: { fontSize: 13, color: c.text, fontWeight: '700' },

  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10 as any },
  syncStatus: { fontSize: 13, color: c.text, fontWeight: '600' },
  syncErr: { fontSize: 11, color: c.danger, marginTop: 4 },
  syncBtn: {
    backgroundColor: c.borderStrong, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6 as any,
  },
  syncBtnTxt: { color: c.bg, fontSize: 13, fontWeight: '700' },

  signout: {
    alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 22,
    marginTop: 10, marginBottom: 4,
  },
  signoutTxt: { color: c.textMuted, fontSize: 13, fontWeight: '600' },

  themeRow: { flexDirection: 'row', gap: 6 as any },
  themeBtn: {
    flex: 1,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: c.cardBgAlt, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6 as any,
  },
  themeBtnOn: { backgroundColor: c.borderStrong, borderColor: c.borderStrong },
  themeBtnTxt: { fontSize: 13, color: c.text, fontWeight: '600' },
  themeBtnTxtOn: { color: c.bg },
});
