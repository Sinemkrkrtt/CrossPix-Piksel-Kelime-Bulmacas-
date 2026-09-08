// src/screens/AccountScreen.js
// Oturum açıkken: profil + Çıkış Yap + Hesabı Sil.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { PALETTE, FONT } from '../pixel/PixelKit';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthButton } from './authUI';

export default function AccountScreen({ navigation }) {
  const { user, logout, removeAccount } = useAuth();
  const [busy, setBusy] = useState(false);

  const toLogin = () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

  const onLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    toLogin();
  };

  const onDelete = () => {
    Alert.alert(
      'Hesabı sil',
      'Hesabın kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const res = await removeAccount();
            setBusy(false);
            if (res.ok) {
              toLogin();
            } else if (res.code === 'auth/requires-recent-login') {
              Alert.alert('Yeniden giriş gerekli', 'Güvenlik için çıkış yapıp tekrar giriş yap, sonra hesabı sil.', [
                { text: 'Tamam', onPress: async () => { await logout(); toLogin(); } },
              ]);
            } else {
              Alert.alert('Silinemedi', res.error);
            }
          },
        },
      ]
    );
  };

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Oyuncu');

  return (
    <AuthShell title="HESABIM" navigation={navigation}>
      <View style={styles.info}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email || '—'}</Text>
      </View>

      <AuthButton label="ÇIKIŞ YAP" onPress={onLogout} loading={busy} />
      <View style={{ height: 12 }} />
      <AuthButton label="HESABI SİL" onPress={onDelete} kind="danger" disabled={busy} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  info: { alignItems: 'center', marginBottom: 20 },
  name: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 24, marginBottom: 4 },
  email: { color: '#AEB6C8', fontFamily: FONT.medium, fontSize: 16 },
});
