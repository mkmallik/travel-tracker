import './src/theme/fonts';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View, Text, ActivityIndicator, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ItineraryListScreen } from './src/screens/ItineraryList';
import { DayDetailScreen } from './src/screens/DayDetail';
import { LogExpenseScreen } from './src/screens/LogExpense';
import { SummaryScreen } from './src/screens/Summary';
import { LoginScreen } from './src/screens/LoginScreen';
import { BookingsScreen } from './src/screens/Bookings';
import { bootstrapStore, useAppStore } from './src/store/useAppStore';
import { isLoggedIn } from './src/api/client';
import { useTheme } from './src/theme/useTheme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const APP_MAX_WIDTH = 480;

function ItineraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ItineraryList" component={ItineraryListScreen} />
      <Stack.Screen name="DayDetail" component={DayDetailScreen} />
    </Stack.Navigator>
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4 }}>{label}</Text>;
}

function MainApp() {
  const { colors } = useTheme();
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarStyle: {
            paddingVertical: 6,
            height: 60,
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Itinerary"
          component={ItineraryStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="🗺️" focused={focused} /> }}
        />
        <Tab.Screen
          name="Bookings"
          component={BookingsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="🧳" focused={focused} /> }}
        />
        <Tab.Screen
          name="LogTab"
          component={LogExpenseScreen}
          options={{ title: 'Log', tabBarIcon: ({ focused }) => <TabIcon label="＋" focused={focused} /> }}
        />
        <Tab.Screen
          name="Summary"
          component={SummaryScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="📊" focused={focused} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// On wide screens (desktop), constrain the app to a portrait column
// centered horizontally. On mobile (width <= 480px), fill the screen.
function Responsive({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const constrain = Platform.OS === 'web' && width > APP_MAX_WIDTH;
  return (
    <View style={[styles.responsiveOuter, { backgroundColor: constrain ? colors.bgElevated : 'transparent' }]}>
      <View
        style={[
          styles.responsiveInner,
          constrain
            ? {
                maxWidth: APP_MAX_WIDTH,
                width: APP_MAX_WIDTH,
                backgroundColor: colors.bg,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                // @ts-ignore — react-native-web passes through CSS
                boxShadow: '0 0 32px rgba(0,0,0,0.12)',
              }
            : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export default function App() {
  // null = checking, false = show login, true = show app
  const [authed, setAuthed] = useState<boolean | null>(null);
  const hydrated = useAppStore((s) => s.hydrated);
  const syncError = useAppStore((s) => s.syncError);

  useEffect(() => {
    (async () => {
      const logged = await isLoggedIn();
      if (logged) {
        await bootstrapStore();
        setAuthed(true);
      } else {
        setAuthed(false);
      }
    })();
  }, []);

  // If the server rejects our token, bounce back to login.
  useEffect(() => {
    if (syncError && /unauthorized/i.test(syncError)) {
      setAuthed(false);
    }
  }, [syncError]);

  const handleLogin = async () => {
    await bootstrapStore();
    setAuthed(true);
  };

  if (authed === null || (authed && !hydrated)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3A5BD9" />
        <Text style={styles.loadingTxt}>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Responsive>
        {authed ? <MainApp /> : <LoginScreen onSuccess={handleLogin} />}
      </Responsive>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  loadingTxt: { marginTop: 12, color: '#666' },
  responsiveOuter: {
    flex: 1,
    alignItems: 'center',
  },
  responsiveInner: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
});
