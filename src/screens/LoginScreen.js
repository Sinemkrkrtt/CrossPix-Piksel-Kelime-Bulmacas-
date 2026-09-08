// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { PALETTE, FONT } from '../pixel/PixelKit';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthField, AuthButton, AuthError } from './authUI';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (busy) return;
    setErr('');
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else navigation.replace('CityMap');
  };

  return (
    <AuthShell title="GİRİŞ YAP" navigation={navigation} showBack={false}>
      <AuthError text={err} />
      <AuthField label="E-POSTA" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ornek@mail.com" textContentType="emailAddress" />
      <AuthField label="ŞİFRE" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" textContentType="password" />
      <AuthButton label="GİRİŞ YAP" onPress={onSubmit} loading={busy} />

      <View style={styles.row}>
        <Text style={styles.muted}>Hesabın yok mu?</Text>
        <Pressable onPress={() => navigation.replace('Register')} hitSlop={6}>
          <Text style={styles.link}>KAYIT OL</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  muted: { color: '#AEB6C8', fontFamily: FONT.medium, fontSize: 16, marginRight: 8 },
  link: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 17, letterSpacing: 0.5 },
});
