import React, { useState } from 'react';
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
import { HeroImage } from '../components/HeroImage';
import { Money } from '../components/Money';
import {
  expensesForDay,
  sumExpensesInThb,
  budgetedTotalThb,
} from '../utils/expenseHelpers';
import { themeForCity } from '../data/theme';
import { bookingsForIso, BOOKING_LABELS, flightStopsLabel, hotelNights } from '../utils/bookings';
import { Icon, BOOKING_ICON_NAME, CATEGORY_ICON_NAME } from '../components/Icon';
import { dayIsoFromSeed } from '../utils/date';
import type { Booking, Expense, FlightExtras, HotelExtras, ActivityExtras, TransferExtras } from '../data/types';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';
import { BookingForm } from './BookingForm';
import { BookingDetails } from './BookingDetails';
import { ExpenseForm } from './ExpenseForm';
import { openInMaps, dialNumber, extractPhones, stripPhones } from '../utils/links';

type Props = {
  navigation: { goBack: () => void; navigate: (n: string, p: any) => void };
  route: { params: { dayNum: number } };
};

export function DayDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { days, expenses, bookings, fxInrPerThb, removeBooking, removeExpense, updateDayInfo } = useAppStore();
  const day = days.find((d) => d.dayNum === route.params.dayNum);
  const [bookingSheet, setBookingSheet] = useState<
    | { mode: 'view' | 'edit'; booking: Booking }
    | null
  >(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingField, setEditingField] = useState<'summary' | 'travelDetails' | null>(null);

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

  // The stay card prefers a booked hotel for this day; falls back to the
  // static itinerary info.
  const stayBooking = hotels[0] ?? null;
  const stayName = stayBooking?.title || day.accommodationName || 'Not booked';
  const rawStayAddress = stayBooking?.address || day.address || '';
  const stayPhones = extractPhones(rawStayAddress).concat(extractPhones(stayBooking?.note ?? ''));
  const stayAddress = stripPhones(rawStayAddress);
  const stayAgent = stayBooking?.agent || day.agent || '';
  const stayBookingRef = stayBooking?.bookingRef || '';
  const stayStatus = day.paymentStatus;

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
            <SectionLabel icon="flight" color={colors.textSubtle}>Flights</SectionLabel>
            {flights.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onPress={() => setBookingSheet({ mode: 'view', booking: b })} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        {hotels.length > 0 ? (
          <View style={styles.card}>
            <SectionLabel icon="hotel" color={colors.textSubtle}>Hotels</SectionLabel>
            {hotels.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onPress={() => setBookingSheet({ mode: 'view', booking: b })} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        {activities.length > 0 ? (
          <View style={styles.card}>
            <SectionLabel icon="activity" color={colors.textSubtle}>Activities</SectionLabel>
            {activities.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onPress={() => setBookingSheet({ mode: 'view', booking: b })} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        {transfers.length > 0 ? (
          <View style={styles.card}>
            <SectionLabel icon="transfer" color={colors.textSubtle}>Transfers</SectionLabel>
            {transfers.map((b) => (
              <BookingRow key={b.id} booking={b} accent={theme.accent} onPress={() => setBookingSheet({ mode: 'view', booking: b })} onRemove={() => removeBooking(b.id)} />
            ))}
          </View>
        ) : null}

        <Pressable
          style={styles.card}
          onPress={stayBooking ? () => setBookingSheet({ mode: 'view', booking: stayBooking }) : undefined}
        >
          <SectionLabel icon="hotel" color={colors.textSubtle}>Stay</SectionLabel>
          <Text style={styles.stayName}>{stayName}</Text>

          {stayAddress ? (
            <Pressable
              style={styles.addrRow}
              onPress={(e) => { e.stopPropagation?.(); openInMaps(stayAddress); }}
            >
              <View style={styles.addrTextRow}>
                <Icon name="pin" size={14} color={theme.accent} strokeWidth={2} />
                <Text style={styles.stayAddr}>{stayAddress}</Text>
              </View>
              <View style={[styles.mapBtn, { backgroundColor: theme.light }]}>
                <Icon name="map" size={12} color={theme.accent} strokeWidth={2.2} />
                <Text style={[styles.mapBtnTxt, { color: theme.accent }]}>Open map</Text>
              </View>
            </Pressable>
          ) : null}

          {stayPhones.length > 0 ? (
            <View style={styles.phonesWrap}>
              {stayPhones.map((p) => (
                <Pressable
                  key={p}
                  style={[styles.phonePill, { backgroundColor: theme.light }]}
                  onPress={(e) => { e.stopPropagation?.(); dialNumber(p); }}
                >
                  <Icon name="phone" size={12} color={theme.accent} strokeWidth={2.2} />
                  <Text style={[styles.phonePillTxt, { color: theme.accent }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {stayBookingRef ? (
            <Text style={styles.agent}>Ref: {stayBookingRef}</Text>
          ) : null}
          {stayAgent ? <Text style={styles.agent}>Booking via: {stayAgent}</Text> : null}
          {stayBooking?.note ? <Text style={styles.stayNote}>{stayBooking.note}</Text> : null}
          {stayStatus && !stayBooking ? (
            <View style={[styles.statusPill, stayStatus === 'Paid' ? styles.pillPaid : styles.pillPending]}>
              <Text style={styles.statusTxt}>{stayStatus === 'Paid' ? '✓ Paid' : '⏱  ' + stayStatus}</Text>
            </View>
          ) : null}
          {stayBooking ? (
            <Text style={styles.tapHint}>tap to view details</Text>
          ) : null}
        </Pressable>

        <View style={styles.card}>
          <View style={styles.editableSectionHeader}>
            <SectionLabel icon="receipt" color={colors.textSubtle}>Plan for the day</SectionLabel>
            <Pressable
              style={styles.sectionEditBtn}
              onPress={() => setEditingField('summary')}
            >
              <Icon name="edit" size={13} color={colors.textMuted} strokeWidth={2.1} />
            </Pressable>
          </View>
          {day.summary ? (
            <Text style={styles.summary}>{day.summary}</Text>
          ) : (
            <Text style={[styles.summary, { color: colors.textSubtle, fontStyle: 'italic' }]}>
              Tap the pencil to add a plan for this day.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.editableSectionHeader}>
            <SectionLabel icon="map" color={colors.textSubtle}>Travel details</SectionLabel>
            <Pressable
              style={styles.sectionEditBtn}
              onPress={() => setEditingField('travelDetails')}
            >
              <Icon name="edit" size={13} color={colors.textMuted} strokeWidth={2.1} />
            </Pressable>
          </View>
          {travelLines.length > 0 ? (
            travelLines.map((line, i) => (
              <View key={i} style={styles.travelLineRow}>
                <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
                <Text style={styles.travelLine}>{line}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.summary, { color: colors.textSubtle, fontStyle: 'italic' }]}>
              Tap the pencil to add travel notes.
            </Text>
          )}
        </View>

        {dayExp.length > 0 ? (
          <View style={styles.card}>
            <SectionLabel icon="wallet" color={colors.textSubtle}>Logged expenses</SectionLabel>
            {dayExp.map((e) => (
              <Pressable key={e.id} style={styles.expRow} onPress={() => setEditingExpense(e)}>
                <View style={styles.expIconWrap}>
                  <Icon name={CATEGORY_ICON_NAME[e.category] ?? 'sparkles'} size={16} color={colors.textMuted} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expCat}>{e.category}</Text>
                  {e.note ? <Text style={styles.expNote}>{e.note}</Text> : null}
                </View>
                <Money amount={e.amount} currency={e.currency} style={styles.expAmt} />
                <Pressable
                  onPress={(ev) => { ev.stopPropagation?.(); removeExpense(e.id); }}
                  style={styles.expDelBtn}
                >
                  <Icon name="close" size={14} color={colors.textMuted} strokeWidth={2.2} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <Modal
        visible={!!bookingSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setBookingSheet(null)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
            {bookingSheet?.mode === 'view' ? (
              <BookingDetails
                booking={bookingSheet.booking}
                onEdit={() => setBookingSheet({ mode: 'edit', booking: bookingSheet.booking })}
                onDelete={async () => {
                  await removeBooking(bookingSheet.booking.id);
                  setBookingSheet(null);
                }}
                onClose={() => setBookingSheet(null)}
              />
            ) : bookingSheet?.mode === 'edit' ? (
              <BookingForm
                existingBooking={bookingSheet.booking}
                onSaved={() => setBookingSheet(null)}
                onCancel={() => setBookingSheet({ mode: 'view', booking: bookingSheet.booking })}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editingExpense}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingExpense(null)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
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

      <DayInfoEditModal
        visible={!!editingField}
        title={editingField === 'summary' ? 'Plan for the day' : 'Travel details'}
        initialValue={
          editingField === 'summary' ? day.summary :
          editingField === 'travelDetails' ? day.travelDetails : ''
        }
        onSave={async (val) => {
          if (!editingField) return;
          if (editingField === 'summary') {
            await updateDayInfo(day.dayNum, { summary: val });
          } else {
            await updateDayInfo(day.dayNum, { travelDetails: val });
          }
          setEditingField(null);
        }}
        onCancel={() => setEditingField(null)}
      />
    </ScrollView>
  );
}

function DayInfoEditModal({
  visible, title, initialValue, onSave, onCancel,
}: {
  visible: boolean;
  title: string;
  initialValue: string;
  onSave: (v: string) => Promise<void>;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [value, setValue] = React.useState(initialValue);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSave(value);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.bg, height: undefined, maxHeight: '88%' }]}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
            <View style={styles.editHeaderRow}>
              <Text style={styles.editTitle}>{title}</Text>
              <Pressable style={styles.editCloseBtn} onPress={onCancel}>
                <Icon name="close" size={18} color={colors.text} strokeWidth={2.4} />
              </Pressable>
            </View>
            <Text style={styles.editHint}>
              Use new lines for separate points. Travel-details bullets render
              one per line.
            </Text>
            <TextInput
              style={styles.editTextarea}
              value={value}
              onChangeText={setValue}
              multiline
              placeholder="Type here…"
              placeholderTextColor={colors.placeholder}
              autoFocus
            />
            <View style={styles.editActions}>
              <Pressable style={[styles.editCancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
                <Text style={[styles.editCancelTxt, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={submit} disabled={busy}>
                <LinearGradient
                  colors={busy ? ['#94A3B8', '#94A3B8'] : ['#3A5BD9', '#7C3AED']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.editSaveBtn}
                >
                  <Icon name="check" size={14} color="#fff" strokeWidth={2.4} />
                  <Text style={styles.editSaveTxt}>{busy ? 'Saving…' : 'Save'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SectionLabel({ icon, color, children }: { icon: any; color: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 as any, marginBottom: 10 }}>
      <Icon name={icon} size={14} color={color} strokeWidth={2} />
      <Text style={styles.cardLabel}>{children}</Text>
    </View>
  );
}

function BookingRow({
  booking, accent, onPress, onRemove,
}: {
  booking: Booking; accent: string; onPress: () => void; onRemove: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const subline = subtitleFor(booking);
  const timeLabel = formatTimeLabel(booking);
  return (
    <Pressable style={styles.bkRow} onPress={onPress}>
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
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onRemove(); }}
          style={styles.bkDel}
        >
          <Text style={styles.bkDelTxt}>×</Text>
        </Pressable>
      </View>
    </Pressable>
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },

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
    backgroundColor: c.cardBg, borderRadius: 18, padding: 16,
    marginBottom: 12,
    borderWidth: 1, borderColor: c.border,
    shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardLabel: {
    fontSize: 12, color: c.textSubtle, fontWeight: '700', marginBottom: 10, letterSpacing: 0.3,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },

  moneyCard: { borderWidth: 2 },
  moneySplit: { flexDirection: 'row', gap: 10 as any, marginTop: 6 },
  moneyBigLabel: { fontSize: 11, color: c.placeholder, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  moneyBigVal: { fontSize: 16, color: c.text, fontWeight: '700', marginTop: 3 },

  pctPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pctTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  barTrack: { marginTop: 14, height: 8, backgroundColor: c.cardBgAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  logBtn: {
    marginTop: 16, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  logBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  stayName: { fontSize: 17, fontWeight: '700', color: c.text },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 as any, marginTop: 8 },
  addrTextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 as any, flex: 1 },
  stayAddr: { flex: 1, fontSize: 13, color: c.textMuted, lineHeight: 18 },
  mapBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 as any },
  mapBtnTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  phonesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 as any, marginTop: 8 },
  phonePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 as any },
  phonePillTxt: { fontSize: 12, fontWeight: '700' },
  stayNote: { fontSize: 12, color: c.textMuted, marginTop: 8, fontStyle: 'italic' },
  tapHint: { fontSize: 10, color: c.textSubtle, marginTop: 10, fontStyle: 'italic' },
  agent: { fontSize: 12, color: c.textMuted, marginTop: 6 },
  statusPill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillPaid: { backgroundColor: '#D1FAE5' },
  pillPending: { backgroundColor: '#FEF3C7' },
  statusTxt: { fontSize: 11, color: '#374151', fontWeight: '700' },

  summary: { fontSize: 14, color: c.text, lineHeight: 21 },

  travelLineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8, marginRight: 10 },
  travelLine: { flex: 1, fontSize: 13, color: c.text, lineHeight: 20 },

  expRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  expIcon: { fontSize: 20, marginRight: 10 },
  expIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: c.cardBgAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  expCat: { fontSize: 14, fontWeight: '700', color: c.text },
  expNote: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  expAmt: { fontSize: 13, color: c.text, fontWeight: '600' },

  bkRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  bkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 as any, flexWrap: 'wrap' },
  bkTitle: { fontSize: 14, fontWeight: '700', color: c.text },
  bkTimePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bkTimeTxt: { fontSize: 10, fontWeight: '700' },
  bkSub: { fontSize: 12, color: c.textMuted, marginTop: 3 },
  bkMeta: { fontSize: 11, color: c.placeholder, marginTop: 2 },
  bkRight: { alignItems: 'flex-end', gap: 8 as any },
  bkAmt: { fontSize: 13, color: c.text, fontWeight: '700' },
  bkDel: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.cardBgAlt, alignItems: 'center', justifyContent: 'center' },
  bkDelTxt: { fontSize: 14, color: c.textMuted },

  expDelBtn: {
    width: 24, height: 24, marginLeft: 8, borderRadius: 12,
    backgroundColor: c.cardBgAlt, alignItems: 'center', justifyContent: 'center',
  },
  expDelTxt: { fontSize: 14, color: c.textMuted, lineHeight: 16 },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    height: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden',
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },

  editableSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionEditBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: c.cardBgAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },

  editHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editTitle: { fontSize: 22, fontWeight: '800', color: c.text },
  editCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.cardBgAlt, alignItems: 'center', justifyContent: 'center' },
  editHint: { fontSize: 12, color: c.textMuted, marginTop: 6, marginBottom: 12 },
  editTextarea: {
    backgroundColor: c.cardBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: c.text,
    borderWidth: 1, borderColor: c.border,
    minHeight: 200, textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', gap: 10 as any, marginTop: 16, alignItems: 'center' },
  editCancelBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  editCancelTxt: { fontSize: 13, fontWeight: '700' },
  editSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8 as any, paddingVertical: 13, borderRadius: 12,
  },
  editSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
