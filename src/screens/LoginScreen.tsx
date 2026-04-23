import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { login } from '../api/client';

type Props = {
  onSuccess: () => void;
};

export function LoginScreen({ onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await login(password.trim());
      onSuccess();
    } catch (e: any) {
      setErr(e?.message === 'Wrong password' ? 'Wrong password.' : 'Could not sign in. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0EA5E9', '#7C3AED', '#EC4899']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <Text style={styles.flag}>🇹🇭</Text>
        <Text style={styles.title}>Thailand Trip</Text>
        <Text style={styles.sub}>Enter password to continue</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={(v) => { setPassword(v); setErr(null); }}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable
            style={[styles.btn, (!password.trim() || busy) && styles.btnDisabled]}
            onPress={submit}
            disabled={!password.trim() || busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnTxt}>Enter</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footnote}>Stay signed in for 30 days.</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  flag: { fontSize: 44, marginBottom: 4 },
  title: { color: '#fff', fontSize: 36, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6 },
  sub: { color: '#fff', fontSize: 14, opacity: 0.9, marginTop: 4, marginBottom: 28 },

  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    padding: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
  },
  input: {
    backgroundColor: '#F1F5F9', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: '#0F172A',
  },
  err: { color: '#DC2626', fontSize: 13, marginTop: 10, fontWeight: '600' },
  btn: {
    marginTop: 14, backgroundColor: '#0F172A', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  footnote: { color: '#fff', opacity: 0.8, fontSize: 12, marginTop: 20 },
});
