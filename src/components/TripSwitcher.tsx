import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../store/useAppStore';
import { DatePicker } from './DatePicker';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';
import type { Trip, TripStatus } from '../data/types';

function fmt(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '—';
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusEmoji(s: TripStatus): string {
  if (s === 'active') return '🟢';
  if (s === 'planning') return '📅';
  return '🏁';
}

export function TripSwitcher() {
  const { trips, activeTripId, setActiveTripId, addTrip } = useAppStore();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const active = trips.find((t) => t.id === activeTripId);

  return (
    <>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={styles.buttonIcon}>🗺️</Text>
        <Text numberOfLines={1} style={styles.buttonTxt}>
          {active ? active.title.replace(' — ', ' · ').slice(0, 32) : 'Pick a trip'}
        </Text>
        <Text style={styles.buttonChev}>›</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bgElevated }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.grabber} />
            {creating ? (
              <NewTripForm
                colors={colors}
                onCancel={() => setCreating(false)}
                onCreate={async (draft) => {
                  try {
                    const t = await addTrip(draft);
                    if (t) {
                      await setActiveTripId(t.id);
                    }
                    setCreating(false);
                    setOpen(false);
                  } catch {
                    /* store handles the error */
                  }
                }}
              />
            ) : (
              <>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Your trips</Text>
                <ScrollView style={{ maxHeight: 420 }}>
                  {trips.length === 0 ? (
                    <Text style={[styles.empty, { color: colors.textMuted }]}>
                      No trips yet. Create one to get started.
                    </Text>
                  ) : (
                    trips.map((t) => {
                      const on = t.id === activeTripId;
                      return (
                        <Pressable
                          key={t.id}
                          style={[
                            styles.tripRow,
                            { borderColor: colors.border, backgroundColor: on ? colors.accentMuted : 'transparent' },
                          ]}
                          onPress={async () => {
                            await setActiveTripId(t.id);
                            setOpen(false);
                          }}
                        >
                          <Text style={styles.tripEmoji}>{statusEmoji(t.status)}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.tripTitle, { color: colors.text }]} numberOfLines={1}>
                              {t.title}
                            </Text>
                            <Text style={[styles.tripDates, { color: colors.textMuted }]}>
                              {fmt(t.startDate)} – {fmt(t.endDate)}
                            </Text>
                          </View>
                          {on ? <Text style={[styles.tripCheck, { color: colors.accent }]}>✓</Text> : null}
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
                <Pressable
                  style={styles.newBtn}
                  onPress={() => setCreating(true)}
                >
                  <LinearGradient
                    colors={['#3A5BD9', '#7C3AED']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.newBtnInner}
                  >
                    <Text style={styles.newBtnTxt}>＋  New trip</Text>
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function NewTripForm({
  colors, onCreate, onCancel,
}: {
  colors: ThemeColors;
  onCreate: (t: Omit<Trip, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
        startDate,
        endDate,
        homeCurrency: 'INR',
        localCurrency: 'THB',
        fxRate: parseFloat(fxRate) || 0,
        coverImageUrl: coverUrl.trim(),
        status: 'planning',
        note: note.trim(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={[styles.sheetTitle, { color: colors.text }]}>New trip</Text>

      <Text style={[styles.label, { color: colors.textSubtle }]}>TITLE</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Japan — Oct 5 to Oct 15, 2026"
        placeholderTextColor={colors.placeholder}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>START</Text>
          <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (!endDate || v > endDate) setEndDate(v); }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>END</Text>
          <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSubtle }]}>FX RATE (INR per local unit)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
        value={fxRate}
        onChangeText={setFxRate}
        placeholder="2.45"
        placeholderTextColor={colors.placeholder}
        keyboardType="decimal-pad"
      />

      <Text style={[styles.label, { color: colors.textSubtle }]}>COVER IMAGE URL (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
        value={coverUrl}
        onChangeText={setCoverUrl}
        placeholder="https://..."
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
      />

      <Text style={[styles.label, { color: colors.textSubtle }]}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border, minHeight: 56 }]}
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Anything to remember"
        placeholderTextColor={colors.placeholder}
      />

      <View style={styles.btnRow}>
        <Pressable style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
          <Text style={[styles.cancelBtnTxt, { color: colors.textMuted }]}>Cancel</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 8 as any,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999,
    maxWidth: 260,
  },
  buttonIcon: { fontSize: 14 },
  buttonTxt: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  buttonChev: { color: '#fff', fontSize: 16, opacity: 0.8 },

  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    maxHeight: '85%',
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  empty: { textAlign: 'center', paddingVertical: 24 },

  tripRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12 as any,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, marginBottom: 8,
    borderWidth: 1,
  },
  tripEmoji: { fontSize: 20 },
  tripTitle: { fontSize: 14, fontWeight: '700' },
  tripDates: { fontSize: 12, marginTop: 2 },
  tripCheck: { fontSize: 18, fontWeight: '700' },

  newBtn: { marginTop: 12 },
  newBtnInner: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  newBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 14, marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 10 as any },

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 as any, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelBtnTxt: { fontSize: 14, fontWeight: '700' },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
