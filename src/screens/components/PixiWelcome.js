// src/screens/components/PixiWelcome.js
//
// Pixi (haritadaki gerçek arı) YANINDA beliren küçük konuşma balonu.
// Karanlık overlay YOK, ayrı arı YOK — balon arının pozisyonunu (anim=beePos)
// takip eder, kuyruğu sola (arıya) bakar. Haritayı kapatmaz.
//   mode 'intro' -> ilk açılışta oyunu tanıtan çok sayfalı hoş geldin
//   mode 'daily' -> sonraki açılışlarda kısa "tekrar hoş geldin"

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { PALETTE, FONT } from '../../pixel/PixelKit';

const INTRO_PAGES = [
  'Merhaba! Ben Pixi, CrossPix’in rehber arısı.',
  'Hoş geldin hediyen hazır: 100 altın ve 3 jokerin her birinden 1’er tane! 🎁',
  'Her çiçek bir şehir — dokun, sana doğru uçarım.',
  'Şehirlerde kelime bulmacaları çözersin; her kelime piksel resmi aydınlatır.',
  'Bir şehri tamamen bitirince 20 altın ve bir hatıra kazanırsın. Hadi başlayalım!',
];

const DAILY_LINES = [
  'Tekrar hoş geldin! Bugün nereyi keşfedelim?',
  'Seni yine görmek güzel! Bir çiçeğe dokun.',
  'Merhaba yine! Uçmaya hazırım.',
  'Hoş geldin! Hangi şehri aydınlatalım?',
];

export default function PixiWelcome({ visible, mode, onClose, anim, beeSize = 74 }) {
  const pages = useMemo(() => {
    if (mode === 'daily') return [DAILY_LINES[Math.floor(Math.random() * DAILY_LINES.length)]];
    return INTRO_PAGES;
  }, [mode]);

  const [page, setPage] = useState(0);
  const [shown, setShown] = useState('');
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setPage(0);
    setShown('');
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [visible, pop]);

  // Daktilo efekti
  useEffect(() => {
    if (!visible) return;
    const full = pages[page] || '';
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [visible, page, pages]);

  if (!visible || !anim) return null;

  const full = pages[page] || '';
  const typing = shown.length < full.length;
  const isLast = page >= pages.length - 1;

  const advance = () => {
    if (typing) { setShown(full); return; }
    if (isLast) { onClose && onClose(); }
    else { setPage((p) => p + 1); }
  };

  const btnLabel = isLast ? 'Başla' : 'İleri';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: [{ translateX: anim.x }, { translateY: anim.y }],
        zIndex: 30,
      }}
    >
      {/* Balon, arının SAĞINDA; kuyruk sola bakar */}
      <Animated.View
        style={{
          position: 'absolute',
          left: beeSize - 10,
          top: Math.round(beeSize * 0.18),
          opacity: pop,
          transform: [
            { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        }}
      >
        <Pressable onPress={advance} style={styles.bubble}>
          {/* sola bakan kuyruk */}
          <View style={styles.tailOuter} />
          <View style={styles.tailInner} />

          <Text style={styles.name}>PIXI</Text>
          <Text style={styles.body}>{shown}</Text>

          <View style={styles.footer}>
            {pages.length > 1 ? (
              <View style={styles.dots}>
                {pages.map((_, i) => (
                  <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
                ))}
              </View>
            ) : (
              <View />
            )}
            <View style={[styles.btn, typing && styles.btnGhost]}>
              <Text style={styles.btnTxt}>{typing ? 'devam' : btnLabel}</Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: 200,
    backgroundColor: PALETTE.cream,
    borderWidth: 3,
    borderColor: PALETTE.outline,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 9,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 3 },
    elevation: 6,
  },
  name: { fontFamily: FONT.arcade, fontSize: 9, color: '#C88A00', letterSpacing: 1, marginBottom: 5 },
  body: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 18, color: '#2A2E3A', minHeight: 54 },
  footer: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, marginRight: 4, backgroundColor: '#CDBE93' },
  dotOn: { backgroundColor: PALETTE.gold, borderWidth: 1, borderColor: PALETTE.outline },
  btn: { backgroundColor: PALETTE.gold, borderWidth: 2, borderColor: PALETTE.outline, paddingHorizontal: 12, paddingVertical: 4 },
  btnGhost: { backgroundColor: '#EADFBE' },
  btnTxt: { fontFamily: FONT.bold, fontSize: 14, color: '#2A2E3A', letterSpacing: 0.5 },

  // Sola bakan kuyruk (arıya işaret eder) — dış outline + iç cream
  tailOuter: {
    position: 'absolute',
    left: -16,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderRightWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: PALETTE.outline,
  },
  tailInner: {
    position: 'absolute',
    left: -10,
    top: 23,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: PALETTE.cream,
  },
});
