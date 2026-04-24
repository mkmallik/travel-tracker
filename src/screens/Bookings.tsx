import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { Money } from '../components/Money';
import {
  BOOKING_ICONS,
  BOOKING_LABELS,
  flightStopsLabel,
  hotelNights,
} from '../utils/bookings';
import { useThemedStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import type {
  ActivityExtras,
  Booking,
  BookingType,
  FlightExtras,
  HotelExtras,
  TransferExtras,
} from '../data/types';
import { toThb, toInr, formatTHB, formatINR } from '../utils/fx';
import { shortDate } from '../utils/date';

const ORDER: BookingType[] = ['flight', 'hotel', 'activity', 'transfer'];

export function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { bookings, fxInrPerThb, removeBooking } = useAppStore();

  const grouped = useMemo(() => {
    const g: Record<BookingType, Booking[]> = { flight: [], hotel: [], activity: [], transfer: [] };
    for (const b of bookings) g[b.type]?.push(b);
    for (const t of ORDER) {
      g[t].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    }
    return g;
  }, [bookings]);

  const totalThb = bookings.reduce((s, b) => s + toThb(b.amount, b.currency, fxInrPerThb), 0);
  const totalInr = bookings.reduce((s, b) => s + toInr(b.amount, b.currency, fxInrPerThb), 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 48, paddingHorizontal: 18 }}
    >
      <Text style={styles.kicker}>TRIP</Text>
      <Text style={styles.h1}>Bookings</Text>

      <View style={styles.totalCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>{bookings.length} booking{bookings.length === 1 ? '' : 's'}</Text>
          <Text style={styles.totalThb}>{formatTHB(totalThb)}</Text>
          <Text style={styles.totalInr}>{formatINR(totalInr)}</Text>
        </View>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎒</Text>
          <Text style={styles.emptyH}>No bookings yet</Text>
          <Text style={styles.emptyP}>
            Add hotels, flights, activities, or transfers from the Log tab.
          </Text>
        </View>
      ) : null}

      {ORDER.map((t) => {
        const rows = grouped[t];
        if (rows.length === 0) return null;
        return (
          <View key={t} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupHeaderTxt}>
                {BOOKING_ICONS[t]}  {BOOKING_LABELS[t]}s
              </Text>
              <Text style={styles.groupCount}>{rows.length}</Text>
            </View>
            {rows.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onRemove={() => removeBooking(b.id)}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function BookingCard({ booking, onRemove }: { booking: Booking; onRemove: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const subtitle = describe(booking);
  const dateLabel = dateRange(booking);
  const timeLabel = timeRange(booking);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {booking.title || BOOKING_LABELS[booking.type]}
        </Text>
        <Pressable onPress={onRemove} style={styles.delBtn}>
          <Text style={styles.delTxt}>×</Text>
        </Pressable>
      </View>
      {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      <View style={styles.metaRow}>
        {dateLabel ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaPillTxt}>📅  {dateLabel}</Text>
          </View>
        ) : null}
        {timeLabel ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaPillTxt}>🕐  {timeLabel}</Text>
          </View>
        ) : null}
      </View>
      {booking.agent || booking.bookingRef ? (
        <View style={styles.metaRow}>
          {booking.agent ? (
            <Text style={styles.faintMeta}>via {booking.agent}</Text>
          ) : null}
          {booking.bookingRef ? (
            <Text style={styles.faintMeta}>Ref {booking.bookingRef}</Text>
          ) : null}
        </View>
      ) : null}
      {booking.note ? <Text style={styles.note}>{booking.note}</Text> : null}
      <View style={styles.amountRow}>
        <Money amount={booking.amount} currency={booking.currency} style={styles.amount} />
      </View>
    </View>
  );
}

function describe(b: Booking): string {
  switch (b.type) {
    case 'flight': {
      const x = (b.extras || {}) as FlightExtras;
      return flightStopsLabel(x);
    }
    case 'hotel': {
      const nights = hotelNights(b);
      const x = (b.extras || {}) as HotelExtras;
      const base = `${nights} night${nights === 1 ? '' : 's'}`;
      const extra = x.room_type ? ` · ${x.room_type}` : '';
      return [base + extra, b.address].filter(Boolean).join(' · ');
    }
    case 'activity': {
      const x = (b.extras || {}) as ActivityExtras;
      return [x.location, x.operator].filter(Boolean).join(' · ');
    }
    case 'transfer': {
      const x = (b.extras || {}) as TransferExtras;
      const route = [x.from_place, x.to_place].filter(Boolean).join(' → ');
      return [route, x.mode].filter(Boolean).join(' · ');
    }
  }
}

function dateRange(b: Booking): string {
  const s = b.startDate || '';
  const e = b.endDate || '';
  if (!s) return '';
  if (!e || e === s) return shortDate(s);
  return `${shortDate(s)} → ${shortDate(e)}`;
}

function timeRange(b: Booking): string {
  if (b.startTime && b.endTime) return `${b.startTime} – ${b.endTime}`;
  if (b.startTime) return b.startTime;
  return '';
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.bg },

  kicker: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.5 },
  h1: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 2, marginBottom: 14 },

  totalCard: {
    backgroundColor: c.cardBg, borderRadius: 16, padding: 16, marginBottom: 18,
    borderWidth: 1, borderColor: c.border,
    flexDirection: 'row', alignItems: 'center',
  },
  totalLabel: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1, textTransform: 'uppercase' },
  totalThb: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 4 },
  totalInr: { fontSize: 14, color: c.textMuted, marginTop: 2 },

  emptyCard: {
    backgroundColor: c.cardBg, borderRadius: 18, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  emptyIcon: { fontSize: 36 },
  emptyH: { fontSize: 17, fontWeight: '700', color: c.text, marginTop: 10 },
  emptyP: { fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18 },

  group: { marginBottom: 22 },
  groupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  groupHeaderTxt: { fontSize: 14, fontWeight: '800', color: c.text },
  groupCount: {
    fontSize: 11, fontWeight: '800', color: c.textSubtle,
    backgroundColor: c.cardBgAlt,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    minWidth: 22, textAlign: 'center',
  },

  card: {
    backgroundColor: c.cardBg, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: c.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 as any },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
  cardSub: { fontSize: 13, color: c.textMuted, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 as any, marginTop: 8 },
  metaPill: {
    backgroundColor: c.cardBgAlt, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  metaPillTxt: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
  faintMeta: { fontSize: 11, color: c.textSubtle },
  note: { fontSize: 12, color: c.textMuted, marginTop: 8, fontStyle: 'italic' },
  amountRow: { marginTop: 10, alignItems: 'flex-end' },
  amount: { fontSize: 14, color: c.text, fontWeight: '800' },
  delBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: c.cardBgAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  delTxt: { fontSize: 16, color: c.textMuted, lineHeight: 18 },
});
