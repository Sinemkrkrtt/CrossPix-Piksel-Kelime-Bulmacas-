// src/screens/authUI.js
// Giriş / Kayıt / Hesap ekranlarının ortak piksel arayüz parçaları.
import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE, FONT, PixelArt } from '../pixel/PixelKit';

// Küçük piksel arı/maskot yerine sade bir çiçek amblemi
const EMBLEM = [
  '..P..',
  '.PPP.',
  'PPCPP',
  '.PPP.',
  '..D..',
  '..D..',
];
const EMBLEM_PAL = { P: PALETTE.gold, C: PALETTE.cream, D: '#3E9E5E' };

export function AuthShell({ title, navigation, children, showBack = true }) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#A6E3F5', '#82CDEC', '#5FB6DF']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {showBack && navigation && (
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
          )}

          <View style={styles.emblemWrap}><PixelArt matrix={EMBLEM} pixelSize={9} palette={EMBLEM_PAL} /></View>

          <View style={styles.titleShadow}>
            <View style={styles.titleInner}>
              <Text style={styles.titleText}>{title}</Text>
              <View style={styles.titleUnderline} />
            </View>
          </View>

          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function AuthField({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldShadow}>
        <TextInput
          style={styles.field}
          placeholderTextColor="#7C87A0"
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
      </View>
    </View>
  );
}

export function AuthButton({ label, onPress, loading, kind = 'primary', disabled }) {
  const isDanger = kind === 'danger';
  const isGhost = kind === 'ghost';
  if (isGhost) {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={styles.ghostBtn} hitSlop={6}>
        <Text style={styles.ghostText}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.btnShadow, (disabled || loading) && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}>
      <View style={[styles.btn, isDanger && styles.btnDanger]}>
        {loading ? <ActivityIndicator color={isDanger ? PALETTE.cream : PALETTE.outline} /> : <Text style={[styles.btnText, isDanger && styles.btnTextDanger]}>{label}</Text>}
      </View>
    </Pressable>
  );
}

export function AuthError({ text }) {
  if (!text) return null;
  return (
    <View style={styles.errorBox}><Text style={styles.errorText}>{text}</Text></View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 70 },
  backBtn: { position: 'absolute', top: 46, left: 16, width: 48, height: 48, backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, alignItems: 'center', justifyContent: 'center' },
  backText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 38, lineHeight: 40, marginTop: -8 },

  emblemWrap: { marginBottom: 16 },
  titleShadow: { backgroundColor: PALETTE.outline, padding: 3, marginBottom: 20 },
  titleInner: { backgroundColor: PALETTE.card, borderWidth: 3, borderColor: PALETTE.gold, paddingVertical: 12, paddingHorizontal: 26, alignItems: 'center' },
  titleText: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 15, letterSpacing: 1 },
  titleUnderline: { height: 3, alignSelf: 'stretch', marginTop: 9, marginHorizontal: 8, backgroundColor: PALETTE.gold },

  card: { width: '100%', maxWidth: 380, backgroundColor: PALETTE.card, borderWidth: 3, borderColor: PALETTE.gold, padding: 18 },

  fieldLabel: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 16, marginBottom: 6, letterSpacing: 0.5 },
  fieldShadow: { backgroundColor: PALETTE.outline, padding: 2 },
  field: { backgroundColor: '#0E1220', borderWidth: 2, borderColor: PALETTE.cardBorder, color: PALETTE.white, fontFamily: FONT.bold, fontSize: 20, paddingHorizontal: 12, paddingVertical: 12 },

  btnShadow: { backgroundColor: PALETTE.outline, padding: 2, marginTop: 4 },
  btn: { backgroundColor: PALETTE.gold, borderWidth: 2, borderColor: PALETTE.cream, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 20, letterSpacing: 1 },
  btnDanger: { backgroundColor: '#C0392B', borderColor: '#E8A5A5' },
  btnTextDanger: { color: PALETTE.cream },

  ghostBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  ghostText: { color: PALETTE.cream, fontFamily: FONT.medium, fontSize: 17 },

  errorBox: { backgroundColor: '#3A1E22', borderWidth: 2, borderColor: '#C0392B', paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  errorText: { color: '#FFB4A8', fontFamily: FONT.medium, fontSize: 16, textAlign: 'center' },
});
