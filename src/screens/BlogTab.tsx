// Blog tab: a per-day journal of the trip. Each day is a long-form entry
// pre-filled by inferBlogContent.js (curated narrative based on bookings +
// expenses) and editable via the pencil. Independent from `day_summary`
// which lives on Day Detail as a short recap.

import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
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
import { Icon } from '../components/Icon';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';
import type { SeedDay } from '../data/types';
import { themeForCity } from '../data/theme';

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

export function BlogTab() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { days, updateDayInfo } = useAppStore();
  const [editing, setEditing] = useState<SeedDay | null>(null);

  const sorted = useMemo(() => [...days].sort((a, b) => a.dayNum - b.dayNum), [days]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 90, paddingHorizontal: 18 }}
    >
      <Text style={styles.kicker}>TRIP BLOG</Text>
      <Text style={styles.h1}>The journal</Text>
      <Text style={styles.sub}>
        A day-by-day record of the trip. Tap any day's pencil to edit the entry.
      </Text>

      {sorted.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="book" size={28} color={colors.textSubtle} strokeWidth={1.7} />
          <Text style={styles.emptyH}>No days yet</Text>
          <Text style={styles.emptyP}>
            Once your itinerary loads, each day will appear here as its own blog entry.
          </Text>
        </View>
      ) : (
        sorted.map((d) => {
          const theme = themeForCity(d.stayCity);
          return (
            <View key={d.dayNum} style={styles.entryCard}>
              <LinearGradient
                colors={theme.gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.entryHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryKicker}>DAY {d.dayNum} · {d.stayCity || '—'}</Text>
                  <Text style={styles.entryDate}>{formatDate(d.date)}</Text>
                </View>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => setEditing(d)}
                  hitSlop={10}
                >
                  <Icon name="edit" size={14} color="#fff" strokeWidth={2.2} />
                </Pressable>
              </LinearGradient>
              <View style={styles.entryBody}>
                {d.blog ? (
                  d.blog.split(/\n\n+/).map((para, i) => (
                    <Text key={i} style={[styles.para, i > 0 && { marginTop: 12 }]}>
                      {para.trim()}
                    </Text>
                  ))
                ) : (
                  <Text style={[styles.para, styles.placeholder]}>
                    No entry yet. Tap the pencil to write the story of this day.
                  </Text>
                )}
              </View>
            </View>
          );
        })
      )}

      <Modal
        visible={!!editing}
        animationType="slide"
        transparent
        onRequestClose={() => setEditing(null)}
      >
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            {editing ? (
              <BlogEditor
                day={editing}
                onSave={async (text) => {
                  await updateDayInfo(editing.dayNum, { blog: text });
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function BlogEditor({
  day, onSave, onCancel,
}: {
  day: SeedDay;
  onSave: (text: string) => Promise<void>;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [text, setText] = useState(day.blog ?? '');
  const [busy, setBusy] = useState(false);
  const ref = useRef<TextInput | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSave(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <View style={styles.formHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.formKicker}>DAY {day.dayNum} · {day.stayCity || '—'}</Text>
          <Text style={styles.formH1}>{formatDate(day.date)}</Text>
        </View>
        <Pressable style={styles.closeFormBtn} onPress={onCancel}>
          <Icon name="close" size={18} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      </View>

      <Text style={styles.label}>BLOG ENTRY</Text>
      <TextInput
        ref={ref}
        style={[styles.input, { minHeight: 240, textAlignVertical: 'top' as any }]}
        value={text}
        onChangeText={setText}
        placeholder="What happened today? The places you saw, the food you ate, the people you met…"
        placeholderTextColor={colors.placeholder}
        multiline
        autoFocus={Platform.OS !== 'web'}
      />

      <View style={styles.formActions}>
        <Pressable onPress={submit} disabled={busy} style={{ flex: 1 }}>
          <LinearGradient
            colors={busy ? ['#94A3B8', '#94A3B8'] : ['#3A5BD9', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnTxt}>{busy ? 'Saving…' : 'Save entry'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.bg },
  kicker: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.5 },
  h1: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 2 },
  sub: { fontSize: 13, color: c.textMuted, marginTop: 4, marginBottom: 18, lineHeight: 19 },

  emptyCard: {
    backgroundColor: c.cardBg, borderRadius: 18, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  emptyH: { fontSize: 17, fontWeight: '700', color: c.text, marginTop: 12 },
  emptyP: { fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 },

  entryCard: {
    backgroundColor: c.cardBg, borderRadius: 18, marginBottom: 16,
    borderWidth: 1, borderColor: c.border,
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12 as any,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  entryKicker: {
    color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5,
  },
  entryDate: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  editBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  entryBody: { paddingVertical: 16, paddingHorizontal: 18 },
  para: { fontSize: 14.5, color: c.text, lineHeight: 22 },
  placeholder: { color: c.textSubtle, fontStyle: 'italic' },

  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '92%', overflow: 'hidden',
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  formKicker: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.5 },
  formH1: { fontSize: 22, fontWeight: '800', color: c.text, marginTop: 2 },
  closeFormBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.cardBgAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11, color: c.textSubtle, fontWeight: '800', letterSpacing: 1.2, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: c.cardBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: c.text, lineHeight: 22,
    borderWidth: 1, borderColor: c.border,
  },
  formActions: { flexDirection: 'row', gap: 10 as any, marginTop: 20, alignItems: 'center' },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
