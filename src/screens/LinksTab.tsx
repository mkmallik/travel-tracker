import React, { useState } from 'react';
import {
  Linking,
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
import type { TripLink } from '../data/types';

export function LinksTab() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { links, addLink, updateLink, removeLink } = useAppStore();
  const [editing, setEditing] = useState<TripLink | null>(null);
  const [creating, setCreating] = useState(false);

  const openLink = (url: string) => {
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  const sorted = [...links].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 90, paddingHorizontal: 18 }}
    >
      <Text style={styles.kicker}>TRIP</Text>
      <Text style={styles.h1}>Links</Text>

      {sorted.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="bag" size={28} color={colors.textSubtle} strokeWidth={1.7} />
          <Text style={styles.emptyH}>No links yet</Text>
          <Text style={styles.emptyP}>
            Stash URLs you want handy during the trip — airline booking portals,
            hotel confirmations, embassy pages, lounge passes, tour vouchers.
          </Text>
        </View>
      ) : (
        sorted.map((l) => (
          <Pressable key={l.id} style={styles.linkCard} onPress={() => openLink(l.url)}>
            <View style={styles.linkIcon}>
              <Icon name="arrowUpRight" size={18} color={colors.accent} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkName} numberOfLines={1}>{l.name}</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{prettyHost(l.url)}</Text>
              {l.note ? <Text style={styles.linkNote} numberOfLines={2}>{l.note}</Text> : null}
            </View>
            <Pressable
              style={styles.editBtn}
              onPress={(e) => { e.stopPropagation?.(); setEditing(l); }}
            >
              <Icon name="edit" size={14} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </Pressable>
        ))
      )}

      <Pressable onPress={() => setCreating(true)} style={{ marginTop: 16 }}>
        <LinearGradient
          colors={['#3A5BD9', '#7C3AED']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.addBtn}
        >
          <Icon name="plus" size={16} color="#fff" strokeWidth={2.4} />
          <Text style={styles.addBtnTxt}>Add link</Text>
        </LinearGradient>
      </Pressable>

      <Modal
        visible={creating || !!editing}
        animationType="slide"
        transparent
        onRequestClose={() => { setCreating(false); setEditing(null); }}
      >
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            <LinkForm
              existing={editing ?? undefined}
              onSave={async (draft) => {
                if (editing) {
                  await updateLink({ ...editing, ...draft });
                } else {
                  await addLink(draft);
                }
                setCreating(false); setEditing(null);
              }}
              onDelete={editing ? async () => {
                await removeLink(editing.id);
                setEditing(null);
              } : undefined}
              onCancel={() => { setCreating(false); setEditing(null); }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function LinkForm({
  existing, onSave, onDelete, onCancel,
}: {
  existing?: TripLink;
  onSave: (d: { name: string; url: string; note: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [name, setName] = useState(existing?.name ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [busy, setBusy] = useState(false);

  const canSave = !!name.trim() && !!url.trim();

  const submit = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), url: url.trim(), note: note.trim() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
      <View style={styles.formHead}>
        <Text style={styles.formH1}>{existing ? 'Edit link' : 'New link'}</Text>
        <Pressable style={styles.closeFormBtn} onPress={onCancel}>
          <Icon name="close" size={18} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      </View>

      <Text style={styles.label}>NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Akasa Air booking"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>URL</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://…"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, { minHeight: 70 }]}
        value={note}
        onChangeText={setNote}
        placeholder="PNR, tips, reminders"
        placeholderTextColor={colors.placeholder}
        multiline
      />

      <View style={styles.formActions}>
        {onDelete ? (
          <Pressable
            style={[styles.deleteBtn, { borderColor: colors.border }]}
            onPress={onDelete}
          >
            <Icon name="trash" size={14} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.deleteBtnTxt, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={submit} disabled={!canSave || busy} style={{ flex: 1 }}>
          <LinearGradient
            colors={canSave && !busy ? ['#3A5BD9', '#7C3AED'] : ['#94A3B8', '#94A3B8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnTxt}>
              {busy ? 'Saving…' : (existing ? 'Save changes' : 'Add link')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname).slice(0, 40);
  } catch {
    return url;
  }
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.bg },
  kicker: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.5 },
  h1: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 2, marginBottom: 18 },

  emptyCard: {
    backgroundColor: c.cardBg, borderRadius: 18, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  emptyH: { fontSize: 17, fontWeight: '700', color: c.text, marginTop: 12 },
  emptyP: { fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 },

  linkCard: {
    backgroundColor: c.cardBg, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: c.border,
    flexDirection: 'row', alignItems: 'center', gap: 12 as any,
  },
  linkIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: c.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  linkName: { fontSize: 15, fontWeight: '700', color: c.text },
  linkUrl: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  linkNote: { fontSize: 11, color: c.textSubtle, marginTop: 4, fontStyle: 'italic' },
  editBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: c.cardBgAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8 as any, paddingVertical: 14, borderRadius: 14,
  },
  addBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '88%', overflow: 'hidden',
  },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  formH1: { fontSize: 22, fontWeight: '800', color: c.text },
  closeFormBtn: {
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

  formActions: { flexDirection: 'row', gap: 10 as any, marginTop: 20, alignItems: 'center' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6 as any,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1,
  },
  deleteBtnTxt: { fontSize: 13, fontWeight: '700' },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
