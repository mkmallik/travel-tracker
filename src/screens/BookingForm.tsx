import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DatePicker } from '../components/DatePicker';
import { useAppStore } from '../store/useAppStore';
import { BOOKING_LABELS } from '../utils/bookings';
import { Icon, BOOKING_ICON_NAME } from '../components/Icon';
import { todayIso, findDayNumForIso, dayIsoFromSeed } from '../utils/date';
import type {
  Booking,
  BookingExtras,
  BookingType,
  Currency,
  FlightExtras,
  FlightStop,
  HotelExtras,
  ActivityExtras,
  TransferExtras,
} from '../data/types';
import { BOOKING_TYPES } from '../data/types';
import { useThemedStyles } from '../theme/styles';
import { useTheme } from '../theme/useTheme';
import type { ThemeColors } from '../theme/colors';

type Props = {
  initialType?: BookingType;
  initialDate?: string;
  existingBooking?: Booking;
  onSaved: () => void;
  onCancel: () => void;
};

export function BookingForm({
  initialType = 'hotel', initialDate, existingBooking, onSaved, onCancel,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { addBooking, updateBooking, days } = useAppStore();

  const isEditing = !!existingBooking;

  const defaultStart = existingBooking?.startDate || initialDate ||
    (findDayNumForIso(todayIso(), days) ? todayIso() : (days[0] ? dayIsoFromSeed(days[0]) || todayIso() : todayIso()));

  const [type, setType] = useState<BookingType>(existingBooking?.type ?? initialType);
  const [title, setTitle] = useState(existingBooking?.title ?? '');
  const [bookingRef, setBookingRef] = useState(existingBooking?.bookingRef ?? '');
  const [agent, setAgent] = useState(existingBooking?.agent ?? '');
  const [address, setAddress] = useState(existingBooking?.address ?? '');
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(existingBooking?.endDate || defaultStart);
  const [startTime, setStartTime] = useState(existingBooking?.startTime ?? '');
  const [endTime, setEndTime] = useState(existingBooking?.endTime ?? '');
  const [amount, setAmount] = useState(existingBooking?.amount ? String(existingBooking.amount) : '');
  const [currency, setCurrency] = useState<Currency>(existingBooking?.currency ?? 'THB');
  const [note, setNote] = useState(existingBooking?.note ?? '');
  const [costOn, setCostOn] = useState<'start' | 'end'>(existingBooking?.costOn ?? 'start');

  // Type-specific state
  const existingFlight = existingBooking?.type === 'flight' ? (existingBooking.extras as FlightExtras) : null;
  const existingHotel = existingBooking?.type === 'hotel' ? (existingBooking.extras as HotelExtras) : null;
  const existingActivity = existingBooking?.type === 'activity' ? (existingBooking.extras as ActivityExtras) : null;
  const existingTransfer = existingBooking?.type === 'transfer' ? (existingBooking.extras as TransferExtras) : null;

  const [flightFrom, setFlightFrom] = useState(existingFlight?.from ?? '');
  const [flightTo, setFlightTo] = useState(existingFlight?.to ?? '');
  const [flightStops, setFlightStops] = useState<FlightStop[]>(existingFlight?.stops ?? []);
  const [roomType, setRoomType] = useState(existingHotel?.room_type ?? '');
  const [activityLocation, setActivityLocation] = useState(existingActivity?.location ?? '');
  const [activityOperator, setActivityOperator] = useState(existingActivity?.operator ?? '');
  const [transferFrom, setTransferFrom] = useState(existingTransfer?.from_place ?? '');
  const [transferTo, setTransferTo] = useState(existingTransfer?.to_place ?? '');
  const [transferMode, setTransferMode] = useState(existingTransfer?.mode ?? '');

  const [busy, setBusy] = useState(false);

  const canSave = !!title.trim() && !!startDate;

  const buildExtras = (): BookingExtras => {
    switch (type) {
      case 'flight':
        return {
          from: flightFrom.trim(),
          to: flightTo.trim(),
          stops: flightStops.filter((s) => s.airport.trim()),
        } satisfies FlightExtras;
      case 'hotel':
        return { room_type: roomType.trim() } satisfies HotelExtras;
      case 'activity':
        return {
          location: activityLocation.trim(),
          operator: activityOperator.trim(),
        } satisfies ActivityExtras;
      case 'transfer':
        return {
          from_place: transferFrom.trim(),
          to_place: transferTo.trim(),
          mode: transferMode.trim(),
        } satisfies TransferExtras;
    }
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const shared = {
        type,
        title: title.trim(),
        bookingRef: bookingRef.trim(),
        agent: agent.trim(),
        address: address.trim(),
        startDate,
        endDate: endDate || startDate,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        amount: parseFloat(amount) || 0,
        currency,
        note: note.trim(),
        costOn,
        extras: buildExtras(),
      };
      if (existingBooking) {
        await updateBooking({
          ...existingBooking,
          ...shared,
        });
      } else {
        await addBooking(shared);
      }
      onSaved();
    } catch (e: any) {
      alert(`Save failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{isEditing ? 'Edit booking' : 'New booking'}</Text>
        <Pressable style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelTxt}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>TYPE</Text>
      <View style={styles.typeRow}>
        {BOOKING_TYPES.map((t) => {
          const on = type === t;
          return (
            <Pressable
              key={t}
              style={[styles.typeBtn, on && styles.typeBtnOn]}
              onPress={() => setType(t)}
            >
              <Icon name={BOOKING_ICON_NAME[t]} size={22} color={on ? colors.bg : colors.text} strokeWidth={1.9} />
              <Text style={[styles.typeLabel, on && styles.typeLabelOn]}>{BOOKING_LABELS[t]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>TITLE</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={placeholderForTitle(type)}
        placeholderTextColor={colors.placeholder}
      />

      {/* Type-specific fields */}
      {type === 'flight' ? (
        <FlightFields
          flightFrom={flightFrom}
          setFlightFrom={setFlightFrom}
          flightTo={flightTo}
          setFlightTo={setFlightTo}
          flightStops={flightStops}
          setFlightStops={setFlightStops}
        />
      ) : null}

      {type === 'hotel' ? (
        <>
          <Text style={styles.label}>ROOM TYPE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={roomType}
            onChangeText={setRoomType}
            placeholder="e.g. Deluxe Double"
            placeholderTextColor={colors.placeholder}
          />
        </>
      ) : null}

      {type === 'activity' ? (
        <>
          <Text style={styles.label}>LOCATION</Text>
          <TextInput
            style={styles.input}
            value={activityLocation}
            onChangeText={setActivityLocation}
            placeholder="e.g. Ao Nang pier"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={styles.label}>OPERATOR</Text>
          <TextInput
            style={styles.input}
            value={activityOperator}
            onChangeText={setActivityOperator}
            placeholder="e.g. Klook, Hotel desk"
            placeholderTextColor={colors.placeholder}
          />
        </>
      ) : null}

      {type === 'transfer' ? (
        <>
          <View style={styles.splitRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>FROM</Text>
              <TextInput
                style={styles.input}
                value={transferFrom}
                onChangeText={setTransferFrom}
                placeholder="e.g. Phuket airport"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>TO</Text>
              <TextInput
                style={styles.input}
                value={transferTo}
                onChangeText={setTransferTo}
                placeholder="e.g. Patong hotel"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>
          <Text style={styles.label}>MODE</Text>
          <View style={styles.modeChipRow}>
            {['Taxi', 'Van', 'Shared', 'Private', 'Ferry', 'Train', 'Bus'].map((m) => {
              const on = transferMode === m;
              return (
                <Pressable
                  key={m}
                  style={[styles.smallChip, on && styles.smallChipOn]}
                  onPress={() => setTransferMode(m)}
                >
                  <Text style={[styles.smallChipTxt, on && styles.smallChipTxtOn]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Common fields */}
      <Text style={styles.label}>BOOKING REF / CONFIRMATION</Text>
      <TextInput
        style={styles.input}
        value={bookingRef}
        onChangeText={setBookingRef}
        placeholder="PNR / booking code"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>AGENT / VENDOR</Text>
      <TextInput
        style={styles.input}
        value={agent}
        onChangeText={setAgent}
        placeholder="e.g. Booking.com, Akasa Air, Klook"
        placeholderTextColor={colors.placeholder}
      />

      {type === 'hotel' || type === 'activity' ? (
        <>
          <Text style={styles.label}>ADDRESS</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Street / area"
            placeholderTextColor={colors.placeholder}
          />
        </>
      ) : null}

      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{type === 'hotel' ? 'CHECK-IN' : 'START DATE'}</Text>
          <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (type !== 'hotel') setEndDate(v); else if (v > endDate) setEndDate(v); }} />
        </View>
        {type === 'hotel' ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CHECK-OUT</Text>
            <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} />
          </View>
        ) : type === 'activity' ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>END DATE (OPT.)</Text>
            <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} />
          </View>
        ) : null}
      </View>

      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{type === 'hotel' ? 'CHECK-IN TIME' : 'START TIME'}</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{type === 'hotel' ? 'CHECK-OUT TIME' : 'END TIME'}</Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
          />
        </View>
      </View>

      <Text style={styles.label}>AMOUNT</Text>
      <View style={styles.amountRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
        />
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

      {type === 'hotel' && startDate !== endDate ? (
        <>
          <Text style={styles.label}>COST COUNTS ON</Text>
          <View style={styles.modeChipRow}>
            <Pressable
              style={[styles.smallChip, costOn === 'start' && styles.smallChipOn]}
              onPress={() => setCostOn('start')}
            >
              <Text style={[styles.smallChipTxt, costOn === 'start' && styles.smallChipTxtOn]}>Check-in day</Text>
            </Pressable>
            <Pressable
              style={[styles.smallChip, costOn === 'end' && styles.smallChipOn]}
              onPress={() => setCostOn('end')}
            >
              <Text style={[styles.smallChipTxt, costOn === 'end' && styles.smallChipTxtOn]}>Check-out day</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, { minHeight: 60 }]}
        value={note}
        onChangeText={setNote}
        placeholder="Anything to remember"
        placeholderTextColor={colors.placeholder}
        multiline
      />

      <Pressable onPress={save} disabled={!canSave || busy}>
        <LinearGradient
          colors={canSave && !busy ? ['#3A5BD9', '#7C3AED'] : ['#CBD5E1', '#CBD5E1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.saveBtn}
        >
          <Text style={styles.saveTxt}>{busy ? 'Saving…' : (isEditing ? '✓  Save changes' : '＋  Save booking')}</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

function placeholderForTitle(type: BookingType): string {
  switch (type) {
    case 'hotel': return 'e.g. Patong Beach Resort';
    case 'flight': return 'e.g. Akasa Air QP 1337';
    case 'activity': return 'e.g. Phi Phi speedboat tour';
    case 'transfer': return 'e.g. Airport taxi';
  }
}

function FlightFields({
  flightFrom, setFlightFrom, flightTo, setFlightTo, flightStops, setFlightStops,
}: {
  flightFrom: string; setFlightFrom: (v: string) => void;
  flightTo: string; setFlightTo: (v: string) => void;
  flightStops: FlightStop[]; setFlightStops: (v: FlightStop[]) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const updateStop = (i: number, patch: Partial<FlightStop>) => {
    setFlightStops(flightStops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const addStop = () => setFlightStops([...flightStops, { airport: '', arrive: '', depart: '' }]);
  const removeStop = (i: number) => setFlightStops(flightStops.filter((_, idx) => idx !== i));

  return (
    <>
      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>FROM</Text>
          <TextInput
            style={styles.input}
            value={flightFrom}
            onChangeText={setFlightFrom}
            placeholder="BLR"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>TO</Text>
          <TextInput
            style={styles.input}
            value={flightTo}
            onChangeText={setFlightTo}
            placeholder="HKT"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <Text style={styles.label}>STOPOVERS</Text>
      {flightStops.map((s, i) => (
        <View key={i} style={styles.stopRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={s.airport}
            onChangeText={(v) => updateStop(i, { airport: v })}
            placeholder="DXB"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={s.arrive ?? ''}
            onChangeText={(v) => updateStop(i, { arrive: v })}
            placeholder="Arr HH:MM"
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={s.depart ?? ''}
            onChangeText={(v) => updateStop(i, { depart: v })}
            placeholder="Dep HH:MM"
            placeholderTextColor={colors.placeholder}
          />
          <Pressable onPress={() => removeStop(i)} style={styles.removeStop}>
            <Text style={styles.removeStopTxt}>×</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addStop} style={styles.addStopBtn}>
        <Text style={styles.addStopTxt}>＋ Add stopover</Text>
      </Pressable>
    </>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { padding: 18, paddingBottom: 60 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { fontSize: 26, fontWeight: '800', color: c.text },
  cancel: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.cardBgAlt, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontSize: 22, color: c.text, fontWeight: '600', lineHeight: 24 },

  label: { fontSize: 11, color: c.textSubtle, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },

  typeRow: { flexDirection: 'row', gap: 8 as any, flexWrap: 'wrap' },
  typeBtn: {
    flex: 1, minWidth: 76,
    backgroundColor: c.cardBg, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  typeBtnOn: { backgroundColor: c.borderStrong, borderColor: c.borderStrong },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600', marginTop: 4 },
  typeLabelOn: { color: c.bg },

  input: {
    backgroundColor: c.cardBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: c.text,
    borderWidth: 1, borderColor: c.border,
  },

  splitRow: { flexDirection: 'row', gap: 10 as any },

  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 as any },
  curToggle: { flexDirection: 'row', backgroundColor: c.cardBgAlt, borderRadius: 10, padding: 2 },
  curBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8 },
  curBtnOn: { backgroundColor: c.borderStrong },
  curBtnTxt: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
  curBtnTxtOn: { color: c.bg },

  modeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 as any },
  smallChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border,
  },
  smallChipOn: { backgroundColor: c.borderStrong, borderColor: c.borderStrong },
  smallChipTxt: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
  smallChipTxtOn: { color: c.bg },

  stopRow: { flexDirection: 'row', gap: 6 as any, marginBottom: 6, alignItems: 'flex-end' },
  removeStop: { width: 34, height: 42, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  removeStopTxt: { fontSize: 18, color: '#DC2626', fontWeight: '700' },
  addStopBtn: { marginTop: 4, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: c.accentMuted },
  addStopTxt: { color: c.accent, fontSize: 13, fontWeight: '700' },

  saveBtn: { marginTop: 22, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
