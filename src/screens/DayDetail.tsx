import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { HeroImage } from '../components/HeroImage';
import { Money } from '../components/Money';
import {
  expensesForDay,
  sumExpensesInThb,
  budgetedTotalThb,
} from '../utils/expenseHelpers';
import { themeForCity, CATEGORY_ICONS } from '../data/theme';
import { bookingsForIso, BOOKING_ICONS, BOOKING_LABELS, flightStopsLabel, hotelNights } from '../utils/bookings';
import { dayIsoFromSeed } from '../utils/date';
import type { Booking, FlightExtras, HotelExtras, ActivityExtras, TransferExtras } from '../data/types';

type Props = {
  navigation: { goBack: () => void; navigate: (n: string, p: any) => void };
  route: { params: { dayNum: number } };
};

export function DayDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { days, expenses, bookings, fxInrPerThb, removeBooking } = useAppStore();
  const day = days.find((d) => d.dayNum === route.params.dayNum);

  if (!day) {
    return (
      <View style={styles.empty}>
        <Text>Day not found.</Text>
      </View>
    );
  }

  const theme = themeForCity(day.stayCity);
  const dayExp = expensesForDay(expenses, day.dayNum);
  const spendThb = sumExpensesInThb(dayExp, fxInrPerThb);
  const budgetThb = budgetedTotalThb(day);
  const transit = day.fromCity && day.toCity ? `${day.fromCity} → ${day.toCity}` : null;
  const travelLines = day.travelDetails.split('\n').filter(Boolean);
  const budgetPct = budgetThb > 0 ? Math.min(100, (spendThb / budgetThb) * 100) : 0;

  const dayIso = dayIsoFromSeed(day);
  const dayBookings = dayIso ? bookingsForIso(bookings, dayIso) : [];
  const flights = dayBookings.filter((b) => b.type === 'flight');
  const hotels = dayBookings.filter((b) => b.type === 'hotel');
  const activities = dayBookings.filter((b) => b.type === 'activity');
  const transfers = dayBookings.filter((b) => b.type === 'transfer');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 48 }}>
      <HeroImage
        uri={day.imageUrl}
        gradient={theme.gradient}
        style={styles.hero}
      >
        <Pressable
          style={[styles.back, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>
        <View style={styles.heroContent}>
          <View style={[styles.dayBadge, { backgroundColor: theme.accent }]}>
            <Text style={styles.dayBadgeTxt}>DAY {day.dayNum}</Text>
          </View>
          <Text style={styles.heroCity}>
            {theme.emoji}  {day.stayCity}
          </Text>
          <Text style={styles.heroDate}>{day.date}</Text>
          {transit ? (
            <View style={styles.transitRow}>
              <Text style={styles.transitTxt}>✈  {transit}</Text>
            </View>
          ) : null}
        </View>
      </HeroImage>

      <View style={styles.body}>
        <View style={[styles.card, styles.moneyCard, { borderColor: theme.light }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>Money today</Text>
            {budgetThb > 0 ? (
              <View style={[styles.pctPill, { backgroundColor: theme.light }]}>
                <Text style={[styles.pctTxt, { color: theme.accent }]}>
                  {Math.round(budgetPct)}%
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.moneySplit}>
            <View style={{ flex: 1 }}>
              <Text style={styles.moneyBigLabel}>Spent</Text>
              <Money amount={spendThb} currency="THB" style={styles.moneyBigVal} />
            </View>
            {budgetThb > 0 ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.moneyBigLabel}>Budget</Text>
                <Money amount={budgetThb} currency="THB" style={styles.moneyBigVal} />
              </View>
            ) : null}
          </View>
          {budgetThb > 0 ? (
            <View style={styles.barTrack}>
              <LinearGradient
                colors={theme.gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.barFill, { width: `${budgetPct}%` }]}
              />
            </View>
          ) : null}
          <Pressable
            style={[styles.logBtn, { backgroundColor: theme.accent }]}
            onPress={() => navigation.navigate('LogTab', { dayNum: day.dayNum })}
          >
            <Text style={styles.logBtnTxt}>＋ Log expense / booking</Text>
          </Pressable>
        </View>

        {flights.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{BOOKING_ICONS.flight}  Flights</Text>
            {flights.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        {hotels.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{BOOKING_ICONS.hotel}  Hotels</Text>
            {hotels.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        {activities.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{BOOKING_ICONS.activity}  Activities</Text>
            {activities.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        {transfers.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{BOOKING_ICONS.transfer}  Transfers</Text>
            {transfers.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>🏨  Stay</Text>
          <Text style={styles.stayName}>{day.accommodationName || 'Not booked'}</Text>
          {day.address ? <Text style={styles.stayAddr}>📍  {day.address}</Text> : null}
          {day.agent ? <Text style={styles.agent}>Booking via: {day.agent}</Text> : null}
          {day.paymentStatus ? (
            <View style={[styles.statusPill, day.paymentStatus === 'Paid' ? styles.pillPaid : styles.pillPending]}>
              <Text style={styles.statusTxt}>{day.paymentStatus === 'Paid' ? '✓ Paid' : '⏱  ' + day.paymentStatus}</Text>
            </View>
          ) : null}
        </View>

        {day.summary ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📝  Plan for the day</Text>
            <Text style={styles.summary}>{day.summary}</Text>
          </View>
        ) : null}

        {travelLines.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>🧭  Travel details</Text>
            {travelLines.map((line, i) => (
              <View key={i} style={styles.travelLineRow}>
                <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
                <Text style={styles.travelLine}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {dayExp.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>💸  Logged expenses</Text>
            {dayExp.map((e) => (
              <View key={e.id} style={styles.expRow}>
                <Text style={styles.expIcon}>{CATEGORY_ICONS[e.category]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expCat}>{e.category}</Text>
                  {e.note ? <Text style={styles.expNote}>{e.note}</Text> : null}
                </View>
                <Money amount={e.amount} currency={e.currency} style={styles.expAmt} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function BookingRow({
  booking, accent, onRemove,
}: {
  booking: Booking; accent: string; onRemove: () => void;
}) {
  const subline = subtitleFor(booking);
  const timeLabel = formatTimeLabel(booking);
  return (
    <View style={styles.bkRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.bkHeader}>
          <Text style={styles.bkTitle}>{booking.title || BOOKING_LABELS[booking.type]}</Text>
          {timeLabel ? (
            <View style={[styles.bkTimePill, { backgroundColor: accent + '22' }]}>
              <Text style={[styles.bkTimeTxt, { color: accent }]}>{timeLabel}</Text>
            </View>
          ) : null}
        </View>
        {subline ? <Text style={styles.bkSub}>{subline}</Text> : null}
        {booking.bookingRef ? <Text style={styles.bkMeta}>Ref: {booking.bookingRef}</Text> : null}
        {booking.agent ? <Text style={styles.bkMeta}>via {booking.agent}</Text> : null}
      </View>
      <View style={styles.bkRight}>
        {booking.amount > 0 ? (
          <Money amount={booking.amount} currency={booking.currency} style={styles.bkAmt} />
        ) : null}
        <Pressable onPress={onRemove} style={styles.bkDel}>
          <Text style={styles.bkDelTxt}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

function subtitleFor(b: Booking): string {
  if (b.type === 'flight') {
    const x = (b.extras || {}) as FlightExtras;
    return flightStopsLabel(x);
  }
  if (b.type === 'hotel') {
    const nights = hotelNights(b);
    const x = (b.extras || {}) as HotelExtras;
    return [`${nights} night${nights === 1 ? '' : 's'}`, x.room_type].filter(Boolean).join(' · ');
  }
  if (b.type === 'activity') {
    const x = (b.extras || {}) as ActivityExtras;
    return [x.location, x.operator].filter(Boolean).join(' · ');
  }
  if (b.type === 'transfer') {
    const x = (b.extras || {}) as TransferExtras;
    const route = [x.from_place, x.to_place].filter(Boolean).join(' → ');
    return [route, x.mode].filter(Boolean).join(' · ');
  }
  return '';
}

function formatTimeLabel(b: Booking): string {
  if (b.startTime && b.endTime) return `${b.startTime} – ${b.endTime}`;
  if (b.startTime) return b.startTime;
  if (b.type === 'hotel' && b.endDate && b.endDate !== b.startDate) {
    return `${b.startDate.slice(5)} → ${b.endDate.slice(5)}`;
  }
  return '';
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { height: 340, justifyContent: 'flex-end' },
  heroContent: { padding: 22, paddingBottom: 24 },
  dayBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  dayBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroCity: { color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },
  heroDate: { color: '#fff', fontSize: 14, marginTop: 2, opacity: 0.95, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  transitRow: { marginTop: 10 },
  transitTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  back: {
    position: 'absolute', left: 14, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  backTxt: { color: '#fff', fontSize: 26, lineHeight: 28, marginTop: -2 },

  body: { padding: 14, gap: 12 as any, marginTop: -22 },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardLabel: {
    fontSize: 12, color: '#6B7280', fontWeight: '700', marginBottom: 10, letterSpacing: 0.3,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },

  moneyCard: { borderWidth: 2 },
  moneySplit: { flexDirection: 'row', gap: 10 as any, marginTop: 6 },
  moneyBigLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  moneyBigVal: { fontSize: 16, color: '#0F172A', fontWeight: '700', marginTop: 3 },

  pctPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pctTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  barTrack: { marginTop: 14, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  logBtn: {
    marginTop: 16, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  logBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  stayName: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  stayAddr: { fontSize: 13, color: '#475569', marginTop: 4 },
  agent: { fontSize: 12, color: '#64748B', marginTop: 6 },
  statusPill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillPaid: { backgroundColor: '#D1FAE5' },
  pillPending: { backgroundColor: '#FEF3C7' },
  statusTxt: { fontSize: 11, color: '#374151', fontWeight: '700' },

  summary: { fontSize: 14, color: '#374151', lineHeight: 21 },

  travelLineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8, marginRight: 10 },
  travelLine: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  expRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB',
  },
  expIcon: { fontSize: 20, marginRight: 10 },
  expCat: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  expNote: { fontSize: 12, color: '#64748B', marginTop: 2 },
  expAmt: { fontSize: 13, color: '#0F172A', fontWeight: '600' },

  bkRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  bkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 as any, flexWrap: 'wrap' },
  bkTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  bkTimePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bkTimeTxt: { fontSize: 10, fontWeight: '700' },
  bkSub: { fontSize: 12, color: '#475569', marginTop: 3 },
  bkMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  bkRight: { alignItems: 'flex-end', gap: 8 as any },
  bkAmt: { fontSize: 13, color: '#0F172A', fontWeight: '700' },
  bkDel: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  bkDelTxt: { fontSize: 14, color: '#94A3B8' },
});
