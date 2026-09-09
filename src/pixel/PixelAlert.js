// src/pixel/PixelAlert.js
// Oyunun tasarımına uygun ŞIK pixel uyarı penceresi (native Alert yerine).
// Kullanım: const alert = usePixelAlert();  alert(başlık, mesaj?, butonlar?)
// Butonlar RN Alert ile aynı: [{ text, onPress?, style? }] — style: 'cancel' | 'destructive' | undefined.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Animated, Easing } from 'react-native';
import { PALETTE, FONT } from './PixelKit';

const RED = '#E0483D';
const RED_DARK = '#9E2F27';
const GOLD_DARK = '#C9A400';

const PixelAlertContext = createContext(() => {});

export function PixelAlertProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, buttons }
  const pop = useRef(new Animated.Value(0)).current;

  const show = useCallback((title, message, buttons) => {
    const btns = Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'Tamam' }];
    setState({ title: title || '', message: message || '', buttons: btns });
  }, []);

  useEffect(() => {
    if (!state) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [state, pop]);

  const dismiss = useCallback(() => setState(null), []);

  const onButton = (btn) => {
    dismiss();
    // onPress yeni bir alert açabilir (zincirleme akışlar) — kapatmadan sonra çağır.
    if (btn && typeof btn.onPress === 'function') btn.onPress();
  };

  const buttons = state?.buttons || [];
  const sideBySide = buttons.length === 2;

  return (
    <PixelAlertContext.Provider value={show}>
      {children}
      <Modal visible={!!state} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.shadow,
              {
                opacity: pop,
                transform: [
                  { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.frame}>
              {!!state?.title && <Text style={styles.title}>{state.title}</Text>}
              {!!state?.message && <Text style={styles.message}>{state.message}</Text>}

              <View style={[styles.buttonsWrap, sideBySide && styles.buttonsRow]}>
                {buttons.map((b, i) => (
                  <AlertButton
                    key={`${b.text}-${i}`}
                    label={b.text}
                    kind={b.style}
                    flex={sideBySide}
                    onPress={() => onButton(b)}
                  />
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </PixelAlertContext.Provider>
  );
}

function AlertButton({ label, kind, flex, onPress }) {
  const face =
    kind === 'destructive' ? RED : kind === 'cancel' ? PALETTE.card : PALETTE.gold;
  const border =
    kind === 'destructive' ? RED_DARK : kind === 'cancel' ? PALETTE.cardBorder : GOLD_DARK;
  const color =
    kind === 'destructive' ? PALETTE.cream : kind === 'cancel' ? PALETTE.cream : PALETTE.outline;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        flex && { flex: 1 },
        { backgroundColor: face, borderColor: border },
        pressed && { transform: [{ translateY: 2 }], opacity: 0.92 },
      ]}
    >
      <Text style={[styles.btnText, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{label}</Text>
    </Pressable>
  );
}

export function usePixelAlert() {
  return useContext(PixelAlertContext);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,12,20,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  // Sert (pixel) gölge çerçevesi + altın kenarlıklı kart.
  shadow: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: PALETTE.outline,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 10,
  },
  frame: {
    backgroundColor: PALETTE.card,
    borderWidth: 4,
    borderColor: PALETTE.gold,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: FONT.arcade,
    fontSize: 14,
    color: PALETTE.gold,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  message: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: PALETTE.cream,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  buttonsWrap: { flexDirection: 'column' },
  buttonsRow: { flexDirection: 'row', gap: 10 },
  btn: {
    borderWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnText: {
    fontFamily: FONT.bold,
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
