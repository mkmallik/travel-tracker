import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Money } from '../components/Money';
import { Icon, BOOKING_ICON_NAME } from '../components/Icon';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';
import type {
  ActivityExtras,
  Booking,
  FlightExtras,
  FlightStop,
  HotelExtras,
  TransferExtras,
} from '../data/types';
import { BOOKING_LABELS, hotelNights } from '../utils/bookings';
import { shortDate } from '../utils/date';
import { openInMaps, dialNumber, extractPhones, stripPhones } from '../utils/links';

type Props = {
  booking: Booking;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function BookingDetails({ booking, onEdit, onDelete, onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const label = BOOKING_LABELS[booking.type];
  const rawAddress = booking.address || '';
  const phones = extractPhones(rawAddress).concat(extractPhones(booking.note));
  const cleanAddress = stripPhones(rawAddress);

  const typeSpecific = (() => {
    switch (booking.type) {
      case 'flight': {
        const x = (booking.extras || {}) as FlightExtras;
        return <FlightBody extras={x} styles={styles} colors={colors} />;
      }
      case 'hotel': {
        const x = (booking.extras || {}) as HotelExtras;
        const nights = hotelNights(booking);
        return (
          <>
            <Row styles={styles} label="Nights" value={`${nights}`} />
            {x.room_type ? <Row styles={styles} label="Room" value={x.room_type} /> : null}
          </>
        );
      }
      case 'activity': {
        const x = (booking.extras || {}) as ActivityExtras;
        return (
          <>
            {x.location ? <Row styles={styles} label="Location" value={x.location} /> : null}
            {x.operator ? <Row styles={styles} label="Operator" value={x.operator} /> : null}
          </>
        );
      }
      case 'transfer': {
        const x = (booking.extras || {}) as TransferExtras;
        const route = [x.from_place, x.to_place].filter(Boolean).join(' → ');
        return (
          <>
            {route ? <Row styles={styles} label="Route" value={route} /> : null}
            {x.mode ? <Row styles={styles} label="Mode" value={x.mode} /> : null}
          </>
        );
      }
    }
  })();

  const dateRange = (() => {
    const s = booking.startDate, e = booking.endDate;
    if (!s) return '';
    if (!e || e === s) return shortDate(s);
    return `${shortDate(s)} → ${shortDate(e)}`;
  })();
  const timeRange = (() => {
    if (booking.startTime && booking.endTime) return `${booking.startTime} – ${booking.endTime}`;
    if (booking.startTime) return booking.startTime;
    return '';
  })();

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={[colors.accent, '#7C3AED']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Icon name="close" size={20} color="#fff" strokeWidth={2.4} />
        </Pressable>
        <View style={styles.heroIconWrap}>
          <Icon name={BOOKING_ICON_NAME[booking.type]} size={28} color="#fff" strokeWidth={2} />
        </View>
        <Text style={styles.kicker}>{label.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>{booking.title || label}</Text>
        {dateRange ? (
          <View style={styles.heroMeta}>
            <Icon name="calendar" size={14} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            <Text style={styles.heroMetaTxt}>{dateRange}</Text>
            {timeRange ? (
              <>
                <View style={styles.heroDot} />
                <Icon name="clock" size={14} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                <Text style={styles.heroMetaTxt}>{timeRange}</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {booking.amount > 0 ? (
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>AMOUNT</Text>
            <Money amount={booking.amount} currency={booking.currency} style={styles.amountValue} />
          </View>
        ) : null}

        {typeSpecific ? <View style={styles.card}>{typeSpecific}</View> : null}

        {cleanAddress ? (
          <View style={styles.card}>
            <Pressable style={styles.addrRow} onPress={() => openInMaps(cleanAddress)}>
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 as any, alignItems: 'flex-start' }}>
                <Icon name="pin" size={16} color={colors.accent} strokeWidth={2} />
                <Text style={styles.addrTxt}>{cleanAddress}</Text>
              </View>
              <View style={[styles.mapPill, { backgroundColor: colors.accentMuted }]}>
                <Icon name="map" size={12} color={colors.accent} strokeWidth={2.2} />
                <Text style={[styles.mapPillTxt, { color: colors.accent }]}>Map</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {phones.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>CONTACT</Text>
            <View style={styles.phoneRow}>
              {phones.map((p) => (
                <Pressable
                  key={p}
                  style={[styles.phonePill, { backgroundColor: colors.accentMuted }]}
                  onPress={() => dialNumber(p)}
                >
                  <Icon name="phone" size={12} color={colors.accent} strokeWidth={2.2} />
                  <Text style={[styles.phonePillTxt, { color: colors.accent }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {(booking.agent || booking.bookingRef) ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>BOOKING</Text>
            {booking.bookingRef ? <Row styles={styles} label="Reference" value={booking.bookingRef} /> : null}
            {booking.agent ? <Row styles={styles} label="Agent" value={booking.agent} /> : null}
          </View>
        ) : null}

        {booking.note ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>NOTE</Text>
            <Text style={styles.noteTxt}>{booking.note}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky action bar */}
      <View style={styles.actions}>
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Icon name="trash" size={16} color={colors.danger} strokeWidth={2} />
          <Text style={[styles.deleteBtnTxt, { color: colors.danger }]}>Delete</Text>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={onEdit}>
          <LinearGradient
            colors={['#3A5BD9', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.editBtn}
          >
            <Icon name="edit" size={14} color="#fff" strokeWidth={2.2} />
            <Text style={styles.editBtnTxt}>Edit</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function FlightBody({ extras, styles, colors }: { extras: FlightExtras; styles: any; colors: ThemeColors }) {
  const from = extras.from || '—';
  const to = extras.to || '—';
  const stops = extras.stops || [];

  return (
    <View>
      <Text style={styles.sectionLabel}>ROUTE</Text>
      <View style={styles.flightRoute}>
        <View style={styles.airportBox}>
          <Text style={styles.airportCode}>{from}</Text>
          <Text style={styles.airportLabel}>Origin</Text>
        </View>
        <View style={styles.routeLine}>
          <View style={[styles.routeDash, { backgroundColor: colors.border }]} />
          <Icon name="flight" size={16} color={colors.accent} strokeWidth={2} />
          <View style={[styles.routeDash, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.airportBox}>
          <Text style={styles.airportCode}>{to}</Text>
          <Text style={styles.airportLabel}>Destination</Text>
        </View>
      </View>

      {stops.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionLabel}>STOPOVERS</Text>
          {stops.map((s: FlightStop, i: number) => (
            <View key={i} style={styles.stopRowV}>
              <View style={[styles.stopDot, { backgroundColor: colors.accent }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stopCode}>{s.airport}</Text>
                <Text style={styles.stopTime}>
                  {s.arrive ? `Arr ${s.arrive}` : ''}
                  {s.arrive && s.depart ? '  ·  ' : ''}
                  {s.depart ? `Dep ${s.depart}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Row({ styles, label, value }: { styles: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  hero: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  kicker: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 as any, marginTop: 12 },
  heroMetaTxt: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600' },
  heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 4 },

  body: { padding: 16, paddingBottom: 100 },

  amountCard: {
    backgroundColor: c.cardBg, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.border,
  },
  amountLabel: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.2 },
  amountValue: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: 4 },

  card: {
    backgroundColor: c.cardBg, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.border,
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: c.textSubtle, letterSpacing: 1.2, marginBottom: 10 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 as any },
  rowLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
  rowValue: { flex: 1, fontSize: 14, color: c.text, fontWeight: '600', textAlign: 'right' },

  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 10 as any },
  addrTxt: { flex: 1, fontSize: 14, color: c.text, lineHeight: 20 },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 5 as any, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mapPillTxt: { fontSize: 11, fontWeight: '700' },

  phoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 as any },
  phonePill: { flexDirection: 'row', alignItems: 'center', gap: 6 as any, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  phonePillTxt: { fontSize: 13, fontWeight: '700' },

  noteTxt: { fontSize: 14, color: c.text, lineHeight: 21 },

  flightRoute: { flexDirection: 'row', alignItems: 'center', gap: 8 as any },
  airportBox: { alignItems: 'center' },
  airportCode: { fontSize: 22, fontWeight: '800', color: c.text, letterSpacing: 0.5 },
  airportLabel: { fontSize: 10, color: c.textSubtle, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  routeLine: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 as any },
  routeDash: { flex: 1, height: 1 },

  stopRowV: { flexDirection: 'row', alignItems: 'center', gap: 10 as any, paddingVertical: 8 },
  stopDot: { width: 8, height: 8, borderRadius: 4 },
  stopCode: { fontSize: 15, fontWeight: '700', color: c.text },
  stopTime: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  actions: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 16,
    backgroundColor: c.bgElevated,
    borderTopWidth: 1, borderTopColor: c.border,
    flexDirection: 'row', gap: 10 as any, alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6 as any,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: c.border,
  },
  deleteBtnTxt: { fontSize: 13, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8 as any,
    paddingVertical: 14, borderRadius: 12,
  },
  editBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
