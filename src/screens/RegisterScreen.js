// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { PALETTE, FONT } from '../pixel/PixelKit';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthField, AuthButton, AuthError } from './authUI';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (busy) return;
    setErr('');
    if (password.length < 6) { setErr('Şifre en az 6 karakter olmalı.'); return; }
    if (password !== password2) { setErr('Şifreler eşleşmiyor.'); return; }
    setBusy(true);
    const res = await register(email, password, name);
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else navigation.replace('CityMap'); // kayıt sonrası otomatik giriş → haritaya
  };

  return (
    <AuthShell title="KAYIT OL" navigation={navigation} showBack={false}>
      <AuthError text={err} />
      <AuthField label="AD (isteğe bağlı)" value={name} onChangeText={setName} placeholder="Adın" autoCapitalize="words" />
      <AuthField label="E-POSTA" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ornek@mail.com" textContentType="emailAddress" />
      <AuthField label="ŞİFRE" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" textContentType="newPassword" />
      <AuthField label="ŞİFRE (TEKRAR)" value={password2} onChangeText={setPassword2} secureTextEntry placeholder="Şifreni tekrar gir" />
      <AuthButton label="KAYIT OL" onPress={onSubmit} loading={busy} />

      <View style={styles.row}>
        <Text style={styles.muted}>Zaten hesabın var mı?</Text>
        <Pressable onPress={() => navigation.replace('Login')} hitSlop={6}>
          <Text style={styles.link}>GİRİŞ YAP</Text>
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
