import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ItineraryListScreen } from './src/screens/ItineraryList';
import { DayDetailScreen } from './src/screens/DayDetail';
import { LogExpenseScreen } from './src/screens/LogExpense';
import { SummaryScreen } from './src/screens/Summary';
import { LoginScreen } from './src/screens/LoginScreen';
import { bootstrapStore, useAppStore } from './src/store/useAppStore';
import { isLoggedIn } from './src/api/client';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3A5BD9',
          tabBarInactiveTintColor: '#888',
          tabBarStyle: { paddingVertical: 6, height: 60 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Itinerary"
          component={ItineraryStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="🗺️" focused={focused} /> }}
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
      {authed ? <MainApp /> : <LoginScreen onSuccess={handleLogin} />}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  loadingTxt: { marginTop: 12, color: '#666' },
});
