// Trips home screen — a beautiful card list of every trip on the
// account. Tapping a card sets it active and bounces over to the
// Itinerary tab. The first tab in the bottom nav.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { Icon } from '../components/Icon';
import { HeroImage } from '../components/HeroImage';
import { DatePicker } from '../components/DatePicker';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';
import type { Trip, TripStatus } from '../data/types';
import { formatINR } from '../utils/fx';

const FALLBACK_GRADIENT: [string, string] = ['#3A5BD9', '#7C3AED'];

function fmtRange(start: string, end: string): string {
  const parse = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const s = parse(start);
  const e = parse(end);
  if (!s || !e) return `${start || '—'} – ${end || '—'}`;
  const monthDay = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const sameYear = s.getFullYear() === e.getFullYear();
  return sameYear
    ? `${monthDay(s)} – ${monthDay(e)}, ${e.getFullYear()}`
    : `${monthDay(s)} ${s.getFullYear()} – ${monthDay(e)} ${e.getFullYear()}`;
}

// Status is derived from dates first (so a finished trip auto-flips from
// "active" → "completed" the morning after it ends, with no need to
// manually edit the sheet). The stored `t.status` field is honoured only
// for trips that are clearly in the future ("planning") or when dates
// are missing entirely.
function statusFor(t: { startDate: string; endDate: string; status: TripStatus }): {
  label: string;
  color: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  const hasDates = /^\d{4}-\d{2}-\d{2}$/.test(t.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(t.endDate);
  if (hasDates) {
    if (today > t.endDate)   return { label: 'COMPLETED', color: '#94A3B8' };
    if (today >= t.startDate) return { label: 'ACTIVE',    color: '#10B981' };
    // today < startDate → upcoming
    return { label: 'UPCOMING', color: '#3B82F6' };
  }
  // No dates — fall back to the stored status.
  if (t.status === 'active')   return { label: 'ACTIVE',    color: '#10B981' };
  if (t.status === 'planning') return { label: 'PLANNING',  color: '#3B82F6' };
  return { label: 'COMPLETED', color: '#94A3B8' };
}

function tripDays(start: string, end: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 0;
  const s = new Date(start), e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export function TripsTab() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { trips, activeTripId, tripTotals, setActiveTripId, addTrip } = useAppStore();
  const [creating, setCreating] = useState(false);

  // Order: active first, then upcoming/planning by start date asc, then
  // completed by end date desc (most recent past first).
  const sorted = [...trips].sort((a, b) => {
    const today = new Date().toISOString().slice(0, 10);
    const isActive = (t: Trip) => t.startDate <= today && t.endDate >= today;
    const aActive = isActive(a), bActive = isActive(b);
    if (aActive !== bActive) return aActive ? -1 : 1;
    const aPast = a.endDate && a.endDate < today;
    const bPast = b.endDate && b.endDate < today;
    if (aPast !== bPast) return aPast ? 1 : -1; // upcoming before past
    if (!aPast && !bPast) return a.startDate.localeCompare(b.startDate);
    return b.endDate.localeCompare(a.endDate); // past — most recent first
  });

  const goToTrip = async (id: string) => {
    if (id !== activeTripId) await setActiveTripId(id);
    // Bounce to the Itinerary tab so the user lands somewhere useful.
    try { nav.navigate('Itinerary'); } catch { /* ignore */ }
  };

  return (
    <View style={styles.scroll}>
      {/* Sticky header — sits above the scrollable card list and never moves. */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.kicker}>YOUR TRAVELS</Text>
        <Text style={styles.h1}>Trips</Text>
        <Text style={styles.sub}>
          {trips.length === 0
            ? 'Create your first trip to get started.'
            : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} on file. Tap one to make it active.`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 110, paddingHorizontal: 18 }}
      >
      {sorted.map((t) => {
        const isActive = t.id === activeTripId;
        const total = tripTotals?.[t.id] || 0;
        const days = tripDays(t.startDate, t.endDate);
        // Derive a nice gradient from the first city's theme if we can,
        // otherwise the default purple→blue.
        const gradient = FALLBACK_GRADIENT;
        return (
          <Pressable
            key={t.id}
            onPress={() => goToTrip(t.id)}
            style={[
              styles.card,
              isActive && { borderColor: colors.accent, borderWidth: 2.5 },
            ]}
          >
            <HeroImage uri={t.coverImageUrl} gradient={gradient} style={styles.hero}>
              {/* Top-left — status, auto-derived from dates */}
              <View style={styles.heroTopRow}>
                {(() => {
                  const s = statusFor(t);
                  return (
                    <View style={[styles.statusPill, { backgroundColor: s.color }]}>
                      <Text style={styles.statusTxt}>{s.label}</Text>
                    </View>
                  );
                })()}
                {isActive ? (
                  <View style={styles.activePill}>
                    <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                    <Text style={styles.activeTxt}>Selected</Text>
                  </View>
                ) : null}
              </View>

              {/* Bottom — title + dates + spend */}
              <View style={styles.heroBottom}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {t.title}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Icon name="calendar" size={12} color="rgba(255,255,255,0.95)" strokeWidth={2.2} />
                    <Text style={styles.metaTxt}>{fmtRange(t.startDate, t.endDate)}</Text>
                  </View>
                  {days > 0 ? (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaTxt}>{days} {days === 1 ? 'day' : 'days'}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.spendRow}>
                  <View>
                    <Text style={styles.spendLabel}>TOTAL SPEND</Text>
                    <Text style={styles.spendValue}>{formatINR(total)}</Text>
                  </View>
                  <View style={styles.curBadge}>
                    <Text style={styles.curTxt}>{t.localCurrency}</Text>
                  </View>
                </View>
              </View>
            </HeroImage>
          </Pressable>
        );
      })}

      <Pressable onPress={() => setCreating(true)} style={styles.newBtn}>
        <LinearGradient
          colors={['#3A5BD9', '#7C3AED']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.newBtnInner}
        >
          <Icon name="plus" size={16} color="#fff" strokeWidth={2.6} />
          <Text style={styles.newBtnTxt}>New trip</Text>
        </LinearGradient>
      </Pressable>

      </ScrollView>

      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.bgElevated }]}>
            <NewTripForm
              onCancel={() => setCreating(false)}
              onCreate={async (draft) => {
                try {
                  const t = await addTrip(draft);
                  if (t) await setActiveTripId(t.id);
                  setCreating(false);
                  try { nav.navigate('Itinerary'); } catch {}
                } catch { /* store handles it */ }
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NewTripForm({
  onCreate, onCancel,
}: {
  onCreate: (t: Omit<Trip, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [localCurrency, setLocalCurrency] = useState('THB');
  const [fxRate, setFxRate] = useState('1');
  const [coverUrl, setCoverUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const canSave = title.trim().length > 0 && !!startDate && !!endDate && startDate <= endDate;

  const submit = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await onCreate({
        title: title.trim(),
        startDate, endDate,
        homeCurrency: 'INR',
        localCurrency: (localCurrency || 'THB').trim().toUpperCase(),
        fxRate: parseFloat(fxRate) || 0,
        coverImageUrl: coverUrl.trim(),
        status: 'planning',
        note: note.trim(),
      });
    } finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <View style={styles.formHead}>
        <Text style={styles.formH1}>New trip</Text>
        <Pressable style={styles.closeBtn} onPress={onCancel}>
          <Icon name="close" size={18} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      </View>

      <Text style={styles.label}>TITLE</Text>
      <TextInput
        style={styles.input}
        value={title} onChangeText={setTitle}
        placeholder="e.g. Japan — Oct 5 to Oct 15, 2026"
        placeholderTextColor={colors.placeholder}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>START</Text>
          <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (!endDate || v > endDate) setEndDate(v); }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>END</Text>
          <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>LOCAL CURRENCY</Text>
          <TextInput
            style={styles.input}
            value={localCurrency} onChangeText={setLocalCurrency}
            placeholder="THB"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters" maxLength={3}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>FX (INR PER UNIT)</Text>
          <TextInput
            style={styles.input}
            value={fxRate} onChangeText={setFxRate}
            placeholder="2.45"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>COVER IMAGE URL (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        value={coverUrl} onChangeText={setCoverUrl}
        placeholder="https://..."
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
      />

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, { minHeight: 60 }]}
        value={note} onChangeText={setNote}
        multiline placeholder="Anything to remember"
        placeholderTextColor={colors.placeholder}
      />

      <View style={styles.btnRow}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={[styles.cancelTxt, { color: colors.textMuted }]}>Cancel</Text>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={submit} disabled={!canSave || busy}>
          <LinearGradient
            colors={canSave && !busy ? ['#3A5BD9', '#7C3AED'] : ['#94A3B8', '#94A3B8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.submitBtn}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>Create trip</Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.bg },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: c.bg,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  kicker: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.5 },
  h1: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 2 },
  sub: { fontSize: 13, color: c.textMuted, marginTop: 4, lineHeight: 19 },

  card: {
    borderRadius: 22, marginBottom: 16,
    backgroundColor: c.cardBg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  hero: {
    height: 220,
    justifyContent: 'space-between',
    padding: 14,
  },

  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  statusTxt: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5 as any,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  heroBottom: { gap: 8 as any },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 24 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 as any },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5 as any,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  metaTxt: { color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: '700' },
  spendRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 4,
  },
  spendLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  spendValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  curBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
  },
  curTxt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  newBtn: { marginTop: 4 },
  newBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8 as any, paddingVertical: 14, borderRadius: 14,
  },
  newBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '88%', overflow: 'hidden',
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formH1: { fontSize: 22, fontWeight: '800', color: c.text },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.cardBgAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11, color: c.textSubtle, fontWeight: '800', letterSpacing: 1.2, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: c.cardBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: c.text,
    borderWidth: 1, borderColor: c.border,
  },
  row: { flexDirection: 'row', gap: 10 as any },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 as any, marginTop: 22 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  cancelTxt: { fontSize: 14, fontWeight: '700' },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
