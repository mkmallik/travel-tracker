import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { HeroImage } from '../components/HeroImage';
import {
  expensesForDay,
  sumExpensesInThb,
  budgetedTotalThb,
} from '../utils/expenseHelpers';
import { themeForCity } from '../data/theme';
import type { SeedDay } from '../data/types';
import { formatTHB } from '../utils/fx';

type Props = {
  navigation: { navigate: (screen: string, params: object) => void };
};

export function ItineraryListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { trip, days } = useAppStore();

  const cities = Array.from(new Set(days.map((d) => d.stayCity)));
  const firstDay = days[0];

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View>
          <HeroImage
            uri={firstDay?.imageUrl ?? ''}
            gradient={['#0EA5E9', '#7C3AED']}
            style={[styles.topHero, { paddingTop: insets.top + 24 }]}
          >
            <View style={styles.topHeroInner}>
              <Text style={styles.kicker}>🇹🇭  YOUR TRIP</Text>
              <Text style={styles.heroTitle}>Thailand</Text>
              <Text style={styles.heroDates}>Apr 27 – May 9, 2026</Text>
              <View style={styles.chipRow}>
                {cities.map((c) => {
                  const t = themeForCity(c);
                  return (
                    <View
                      key={c}
                      style={[styles.cityChip, { backgroundColor: t.accent }]}
                    >
                      <Text style={styles.cityChipTxt}>{t.emoji}  {c}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.statsRow}>
                <Stat label="Days" value={String(days.length)} />
                <Stat label="Cities" value={String(cities.length)} />
                <Stat label="Flights" value="2" />
              </View>
            </View>
          </HeroImage>
          <Text style={styles.sectionTitle}>Itinerary</Text>
        </View>
      }
      data={days}
      keyExtractor={(d) => String(d.dayNum)}
      renderItem={({ item }) => (
        <DayCard
          day={item}
          onPress={() =>
            navigation.navigate('DayDetail', { dayNum: item.dayNum })
          }
        />
      )}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DayCard({ day, onPress }: { day: SeedDay; onPress: () => void }) {
  const { expenses, fxInrPerThb } = useAppStore();
  const theme = themeForCity(day.stayCity);
  const dayExp = expensesForDay(expenses, day.dayNum);
  const spendThb = sumExpensesInThb(dayExp, fxInrPerThb);
  const budgetThb = budgetedTotalThb(day);
  const transit = day.fromCity && day.toCity ? `${day.fromCity} → ${day.toCity}` : null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <HeroImage
        uri={day.imageUrl}
        gradient={theme.gradient}
        style={styles.cardHero}
      >
        <View style={styles.cardHeroTop}>
          <View style={[styles.dayBadge, { backgroundColor: theme.accent }]}>
            <Text style={styles.dayBadgeTxt}>DAY {day.dayNum}</Text>
          </View>
          {transit ? (
            <View style={styles.transitBadge}>
              <Text style={styles.transitTxt}>✈  {transit}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardHeroBottom}>
          <Text style={styles.cardCity}>
            {theme.emoji}  {day.stayCity}
          </Text>
          <Text style={styles.cardDate}>{day.date}</Text>
        </View>
      </HeroImage>

      <View style={styles.cardFooter}>
        <Text numberOfLines={2} style={styles.cardSummary}>
          {day.summary || day.accommodationName || 'Plan TBD'}
        </Text>
        <View style={styles.cardFooterRow}>
          <View style={[styles.moneyPill, { backgroundColor: theme.light }]}>
            <Text style={[styles.moneyLabel, { color: theme.accent }]}>SPENT</Text>
            <Text style={styles.moneyValue}>{formatTHB(spendThb)}</Text>
          </View>
          {budgetThb > 0 ? (
            <View style={styles.moneyPill}>
              <Text style={styles.moneyLabel}>BUDGET</Text>
              <Text style={styles.moneyValue}>{formatTHB(budgetThb)}</Text>
            </View>
          ) : null}
          <View style={styles.arrowPill}>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#F3F4F6' },

  topHero: { height: 280, justifyContent: 'flex-end' },
  topHeroInner: { padding: 20, paddingBottom: 22 },
  kicker: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.8, opacity: 0.9 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4 },
  heroDates: { color: '#fff', fontSize: 13, opacity: 0.95, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 as any, marginTop: 12 },
  cityChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  cityChipTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 18 as any },
  stat: {},
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#fff', fontSize: 10, letterSpacing: 1, opacity: 0.8, textTransform: 'uppercase' },

  sectionTitle: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10,
    fontSize: 13, fontWeight: '800', color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase',
  },

  card: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.09, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardHero: { height: 170, justifyContent: 'space-between' },
  cardHeroTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  cardHeroBottom: { padding: 14 },
  dayBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  dayBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  transitBadge: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  transitTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardCity: { color: '#fff', fontSize: 24, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  cardDate: { color: '#fff', fontSize: 12, opacity: 0.95, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },

  cardFooter: { padding: 14, paddingTop: 12 },
  cardSummary: { fontSize: 13, color: '#475569', lineHeight: 18 },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 as any, marginTop: 12 },

  moneyPill: {
    backgroundColor: '#F3F4F6', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  moneyLabel: { fontSize: 9, color: '#6B7280', fontWeight: '700', letterSpacing: 0.8 },
  moneyValue: { fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 1 },
  arrowPill: {
    marginLeft: 'auto', width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  arrow: { fontSize: 22, color: '#64748B', fontWeight: '700', lineHeight: 24 },
});
