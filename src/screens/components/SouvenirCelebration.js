// src/screens/components/SouvenirCelebration.js
// Bir şehir %100 bitince: hatıra damgası "güm" diye basılır + konfeti + kutlama.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { PALETTE, FONT } from '../../pixel/PixelKit';

const INK = '#2A4D8F';
const CONFETTI = ['#F2C94C', '#EB5757', '#2F80ED', '#27AE60', '#9B51E0', '#F2994A'];

// Hatıra silüetini tek mürekkeple çizer.
function Silhouette({ grid, cols, box }) {
  const rows = grid.length;
  const px = Math.max(3, Math.min(Math.floor(box / cols), Math.floor((box * 0.8) / rows)));
  return (
    <View style={{ width: cols * px, height: rows * px }}>
      {grid.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((cell, c) => (
            <View key={c} style={{ width: px, height: px, backgroundColor: cell ? INK : 'transparent' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function SouvenirCelebration({ souvenir, onClose, onJournal }) {
  const back = useRef(new Animated.Value(0)).current;
  const slam = useRef(new Animated.Value(0)).current;   // 0 (havada, büyük) → 1 (basılı)
  const ring = useRef(new Animated.Value(0)).current;   // darbe halkası
  const conf = useRef(new Animated.Value(0)).current;   // konfeti
  const text = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i, x: ((i * 53) % 220) - 110, dy: 130 + ((i * 37) % 150),
      rot: (i * 61) % 360, c: CONFETTI[i % CONFETTI.length], s: 5 + (i % 3) * 3,
    })),
    []
  );

  useEffect(() => {
    Animated.timing(back, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(slam, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(120),
      Animated.timing(ring, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(160),
      Animated.timing(conf, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(text, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [back, slam, ring, conf, text]);

  const stampStyle = {
    opacity: slam.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { scale: slam.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) },
      { rotate: slam.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '-4deg'] }) },
    ],
  };
  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.7] }) }],
  };
  const textStyle = {
    opacity: text,
    transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: back }]}>
      {/* Konfeti */}
      <View style={styles.confettiWrap} pointerEvents="none">
        {pieces.map((p) => (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              width: p.s, height: p.s, borderRadius: 1, backgroundColor: p.c,
              opacity: conf.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: conf.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                { translateY: conf.interpolate({ inputRange: [0, 1], outputRange: [-10, p.dy] }) },
                { rotate: conf.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
              ],
            }}
          />
        ))}
      </View>

      <Animated.View style={textStyle}>
        <Text style={styles.kicker}>HATIRA KAZANILDI</Text>
      </Animated.View>

      <View style={styles.stampStage}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.stamp, stampStyle]}>
          <Text numberOfLines={1} style={styles.stampCity}>{souvenir.cityName?.toUpperCase()}</Text>
          <View style={styles.stampArt}>
            {souvenir.grid ? <Silhouette grid={souvenir.grid} cols={souvenir.cols} box={120} /> : null}
          </View>
          <Text numberOfLines={1} style={styles.stampName}>{souvenir.name || 'Hatıra'} ✦</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, textStyle]}>
        <Text style={styles.sub}>{souvenir.cityName} damgası defterine eklendi</Text>
        <View style={styles.btnRow}>
          <Pressable onPress={onJournal} style={[styles.btn, styles.btnGhost]}>
            <Text style={styles.btnGhostText}>DEFTERE BAK</Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.btn, styles.btnMain]}>
            <Text style={styles.btnMainText}>DEVAM</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#12203Bee', alignItems: 'center', justifyContent: 'center', zIndex: 50, paddingHorizontal: 24 },
  confettiWrap: { position: 'absolute', top: '30%', left: '50%', width: 0, height: 0 },
  kicker: { fontSize: 16, letterSpacing: 3, color: PALETTE.gold, fontFamily: FONT.arcade, marginBottom: 18, textAlign: 'center' },

  stampStage: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  ring: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 6, borderColor: PALETTE.gold },
  stamp: { width: 168, backgroundColor: '#F3EAD6', borderWidth: 3, borderStyle: 'dashed', borderColor: INK, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center' },
  stampCity: { fontSize: 11, letterSpacing: 1, color: INK, fontFamily: FONT.bold, marginBottom: 6 },
  stampArt: { height: 104, alignItems: 'center', justifyContent: 'center' },
  stampName: { fontSize: 13, color: INK, fontFamily: FONT.semi, marginTop: 6 },

  footer: { alignItems: 'center' },
  sub: { fontSize: 14, color: '#EDE7D8', fontFamily: FONT.semi, textAlign: 'center', marginBottom: 16, opacity: 0.9 },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: '#FFFFFF22', borderWidth: 2, borderColor: '#FFFFFF55' },
  btnGhostText: { color: '#FFFFFF', fontFamily: FONT.arcade, fontSize: 12, letterSpacing: 1 },
  btnMain: { backgroundColor: PALETTE.gold },
  btnMainText: { color: PALETTE.outline, fontFamily: FONT.arcade, fontSize: 12, letterSpacing: 1 },
});
