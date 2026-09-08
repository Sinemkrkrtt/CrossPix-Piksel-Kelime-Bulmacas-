// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { PALETTE, FONT } from '../pixel/PixelKit';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthField, AuthButton, AuthError } from './authUI';

export default function LoginScreen({ navigation }) {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (busy) return;
    setErr('');
    setNote('');
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else navigation.replace('CityMap');
  };

  const onForgot = async () => {
    if (busy) return;
    setErr('');
    setNote('');
    const res = await resetPassword(email);
    if (res.ok) setNote('Şifre sıfırlama bağlantısı e-postana gönderildi.');
    else setErr(res.error);
  };

  return (
    <AuthShell title="GİRİŞ YAP" navigation={navigation} showBack={false}>
      <AuthError text={err} />
      {note ? (
        <View style={styles.noteBox}><Text style={styles.noteText}>{note}</Text></View>
      ) : null}
      <AuthField label="E-POSTA" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ornek@mail.com" textContentType="emailAddress" />
      <AuthField label="ŞİFRE" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" textContentType="password" />
      <AuthButton label="GİRİŞ YAP" onPress={onSubmit} loading={busy} />

      <Pressable onPress={onForgot} hitSlop={6} style={styles.forgotBtn}>
        <Text style={styles.forgot}>Şifremi unuttum?</Text>
      </Pressable>

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
  forgotBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 4 },
  forgot: { color: PALETTE.cream, fontFamily: FONT.semi, fontSize: 15, textDecorationLine: 'underline' },
  noteBox: { backgroundColor: '#1F3D2A', borderWidth: 2, borderColor: '#3E9E5E', paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  noteText: { color: '#B7F0C6', fontFamily: FONT.medium, fontSize: 15, textAlign: 'center' },
});
