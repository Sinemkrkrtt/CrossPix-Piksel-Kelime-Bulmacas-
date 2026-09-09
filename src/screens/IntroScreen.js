// src/screens/IntroScreen.js
//
// Not: Logo.png arka planı şeffaf hale getirilmiş sürümdür (beyaz kaldırıldı).
// Farklı bir klasöre koyduysan sadece LOGO_SOURCE satırındaki yolu güncelle.

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOGO_SOURCE = require('../../assets/Logo.png');
const LOADING_DURATION = 2600; // ms — barın dolma süresi

// Piksel barın kaç bloğa bölüneceği + retro readout için monospace font
const PROGRESS_SEGMENTS = 16;
const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

// ---- Renk paleti (logo ile uyumlu: bal sarısı, amber, lacivert, çim yeşili) ----
const PALETTE = {
  skyTop: '#8FD9F2',
  skyBottom: '#CFF3D6',
  grassLight: '#5FC17E',
  grassDark: '#3E9E5E',
  outline: '#20242F',
  card: '#232B45',
  cardBorder: '#FFD93D',
  gold: '#FFD93D',
  cream: '#FFF6DD',
  accent: '#31C7D8',
  white: '#FFFFFF',
};

// ---- Piksel-art çizim motoru: küçük bir matrisi kare bloklara çevirir ----
const PixelArt = ({ matrix, palette, pixelSize }) => (
  <View>
    {matrix.map((row, ri) => (
      <View key={`r-${ri}`} style={{ flexDirection: 'row' }}>
        {row.map((cell, ci) => (
          <View
            key={`c-${ri}-${ci}`}
            style={{
              width: pixelSize,
              height: pixelSize,
              backgroundColor: cell === '.' ? 'transparent' : palette[cell],
            }}
          />
        ))}
      </View>
    ))}
  </View>
);

const FLOWER_MATRIX = [
  ['.', '.', 'D', 'D', 'D', '.', '.'],
  ['.', 'D', 'P', 'P', 'P', 'D', '.'],
  ['D', 'P', 'P', 'P', 'P', 'P', 'D'],
  ['D', 'P', 'P', 'C', 'P', 'P', 'D'],
  ['D', 'P', 'P', 'P', 'P', 'P', 'D'],
  ['.', 'D', 'P', 'P', 'P', 'D', '.'],
  ['.', '.', 'D', 'D', 'D', '.', '.'],
];

const LEAF_MATRIX = [
  ['.', '.', 'D', 'D', '.'],
  ['.', 'D', 'G', 'G', 'D'],
  ['D', 'G', 'G', 'G', 'D'],
  ['D', 'G', 'G', 'D', '.'],
  ['.', 'D', 'D', '.', '.'],
];

const SUN_MATRIX = [
  ['.', '.', 'Y', 'Y', 'Y', '.', '.'],
  ['.', 'Y', 'Y', 'Y', 'Y', 'Y', '.'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['.', 'Y', 'Y', 'Y', 'Y', 'Y', '.'],
  ['.', '.', 'Y', 'Y', 'Y', '.', '.'],
];

// Yapraklı ağaç (D:kontur, G:koyu yaprak, L:açık yaprak, T:gövde)
const TREE_MATRIX = [
  ['.', '.', '.', 'D', 'D', 'D', 'D', '.', '.', '.'],
  ['.', '.', 'D', 'L', 'L', 'G', 'G', 'D', '.', '.'],
  ['.', 'D', 'L', 'L', 'G', 'G', 'G', 'G', 'D', '.'],
  ['D', 'L', 'L', 'G', 'G', 'L', 'G', 'G', 'G', 'D'],
  ['D', 'L', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D'],
  ['D', 'G', 'G', 'L', 'G', 'G', 'G', 'L', 'G', 'D'],
  ['.', 'D', 'G', 'G', 'G', 'G', 'G', 'G', 'D', '.'],
  ['.', '.', 'D', 'G', 'G', 'G', 'G', 'D', '.', '.'],
  ['.', '.', '.', 'D', 'T', 'T', 'D', '.', '.', '.'],
  ['.', '.', '.', 'D', 'T', 'T', 'D', '.', '.', '.'],
  ['.', '.', '.', 'D', 'T', 'T', 'D', '.', '.', '.'],
  ['.', '.', '.', 'D', 'T', 'T', 'D', '.', '.', '.'],
];

// Çalı / funda
const BUSH_MATRIX = [
  ['.', '.', 'D', 'D', '.', '.', 'D', 'D', '.', '.'],
  ['.', 'D', 'L', 'G', 'D', 'D', 'L', 'G', 'D', '.'],
  ['D', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D'],
  ['D', 'G', 'L', 'G', 'G', 'G', 'G', 'L', 'G', 'D'],
  ['.', 'D', 'G', 'G', 'G', 'G', 'G', 'G', 'D', '.'],
  ['.', '.', 'D', 'D', 'D', 'D', 'D', 'D', '.', '.'],
];

const Flower = ({ petalColor, top, bottom, left, right, size = 5 }) => (
  <View
    pointerEvents="none"
    style={[styles.decorItem, { top, bottom, left, right }]}
  >
    <PixelArt
      matrix={FLOWER_MATRIX}
      pixelSize={size}
      palette={{ D: PALETTE.outline, P: petalColor, C: PALETTE.cream }}
    />
  </View>
);

const Leaf = ({ top, bottom, left, right, size = 5 }) => (
  <View
    pointerEvents="none"
    style={[styles.decorItem, { top, bottom, left, right }]}
  >
    <PixelArt
      matrix={LEAF_MATRIX}
      pixelSize={size}
      palette={{ D: '#1F3D24', G: PALETTE.grassLight }}
    />
  </View>
);

const Tree = ({ bottom, left, right, size = 6 }) => (
  <View
    pointerEvents="none"
    style={[styles.decorItem, { bottom, left, right }]}
  >
    <PixelArt
      matrix={TREE_MATRIX}
      pixelSize={size}
      palette={{
        D: PALETTE.outline,
        G: PALETTE.grassDark,
        L: PALETTE.grassLight,
        T: '#7A4A22',
      }}
    />
  </View>
);

const Bush = ({ bottom, left, right, size = 5 }) => (
  <View
    pointerEvents="none"
    style={[styles.decorItem, { bottom, left, right }]}
  >
    <PixelArt
      matrix={BUSH_MATRIX}
      pixelSize={size}
      palette={{
        D: '#1F3D24',
        G: PALETTE.grassDark,
        L: PALETTE.grassLight,
      }}
    />
  </View>
);

const Cloud = ({ top, left, size = 9 }) => (
  <View pointerEvents="none" style={[styles.decorItem, { top, left }]}>
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: size, height: size }} />
      <View
        style={{
          width: size * 3,
          height: size,
          backgroundColor: PALETTE.white,
          opacity: 0.9,
        }}
      />
    </View>
    <View style={{ flexDirection: 'row' }}>
      <View
        style={{
          width: size * 5,
          height: size,
          backgroundColor: PALETTE.white,
          opacity: 0.9,
        }}
      />
    </View>
  </View>
);

const FLOWERS = [
  { petalColor: PALETTE.gold, bottom: 20, left: '6%', size: 5 },
  { petalColor: '#FF6F91', bottom: 58, left: '20%', size: 4 },
  { petalColor: '#FF9F43', bottom: 16, left: '40%', size: 6 },
  { petalColor: PALETTE.gold, bottom: 50, left: '64%', size: 4 },
  { petalColor: '#FF6F91', bottom: 18, left: '82%', size: 5 },
  { petalColor: '#FF9F43', bottom: 54, left: '93%', size: 4 },
];

const LEAVES = [
  { bottom: 8, left: '13%', size: 5 },
  { bottom: 34, left: '50%', size: 4 },
  { bottom: 10, left: '72%', size: 5 },
  { bottom: 40, left: '2%', size: 4 },
];

// Ağaçlar çimin üstünde, ilerleme çubuğunun sağ/sol dışında dursun diye
// kenarlara yaslandı; büyükten küçüğe derinlik hissi verir.
const TREES = [
  { bottom: 96, left: -6, size: 7 },
  { bottom: 104, right: -8, size: 8 },
  { bottom: 132, left: '20%', size: 4 },
  { bottom: 128, right: '22%', size: 5 },
];

const BUSHES = [
  { bottom: 80, left: '30%', size: 5 },
  { bottom: 84, right: '30%', size: 4 },
  { bottom: 150, left: '46%', size: 3 },
];

export default function IntroScreen({ navigation }) {
  const { ready } = useAuth();
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const [percent, setPercent] = useState(0);
  const navigatedRef = useRef(false);
  // Misafir modu: herkes (girişli ya da değil) doğrudan haritaya girer; oyunu görür.
  // Oynamaya/satın almaya gelince ilgili ekran giriş/kayıt ister.
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const wantRef = useRef(false);

  const tryProceed = () => {
    if (navigatedRef.current) return;
    if (!wantRef.current || !readyRef.current) return;
    navigatedRef.current = true;
    navigation.replace('CityMap');
  };
  const goToCityMap = () => {
    wantRef.current = true;
    tryProceed();
  };

  // Oturum durumu geç çözülürse, hazır olunca bekleyen geçişi tamamla.
  useEffect(() => { tryProceed(); }, [ready]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.35,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -12,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    pulseLoop.start();
    floatLoop.start();

    const listenerId = progress.addListener(({ value }) => {
      setPercent(Math.min(100, Math.round(value)));
    });

    const progressAnim = Animated.timing(progress, {
      toValue: 100,
      duration: LOADING_DURATION,
      easing: Easing.linear,
      useNativeDriver: false, // genişlik (%) animasyonu native driver desteklemez
    });

    progressAnim.start(({ finished }) => {
      if (finished) goToCityMap();
    });

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      progressAnim.stop();
      progress.removeListener(listenerId);
    };
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <Pressable style={styles.container} onPress={goToCityMap}>
      <StatusBar barStyle="dark-content" backgroundColor={PALETTE.skyTop} />

      {/* ---------- ARKA PLAN: gökyüzü + bahçe ---------- */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.skyTop} />
        <View style={styles.skyTransition} />

        <View style={[styles.decorItem, { top: 46, right: 34 }]}>
          <PixelArt matrix={SUN_MATRIX} pixelSize={8} palette={{ Y: '#FFE58A' }} />
        </View>
        <Cloud top={92} left={SCREEN_WIDTH * 0.08} size={8} />
        <Cloud top={140} left={SCREEN_WIDTH * 0.55} size={7} />

        <View style={styles.grassBand} />
        <View style={styles.grassShadow} />
        <View style={styles.grassEdgeRow}>
          {Array.from({ length: Math.ceil(SCREEN_WIDTH / 14) }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 12,
                height: i % 3 === 0 ? 12 : i % 2 === 0 ? 5 : 8,
                marginHorizontal: 1,
                backgroundColor: PALETTE.grassLight,
              }}
            />
          ))}
        </View>

        {TREES.map((t, i) => (
          <Tree key={`tree-${i}`} {...t} />
        ))}
        {BUSHES.map((b, i) => (
          <Bush key={`bush-${i}`} {...b} />
        ))}
        {FLOWERS.map((f, i) => (
          <Flower key={`flower-${i}`} {...f} />
        ))}
        {LEAVES.map((l, i) => (
          <Leaf key={`leaf-${i}`} {...l} />
        ))}
      </View>

      {/* ---------- ÖN PLAN: içerik ---------- */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <View style={styles.topSpacer} />

        <View style={styles.centerArea}>
          <Animated.View style={{ transform: [{ translateY: floatY }] }}>
            <Image source={LOGO_SOURCE} style={styles.logoImage} resizeMode="contain" />
          </Animated.View>

          <View style={styles.titleWrap}>
            <Text style={styles.logoTitle}>CROSSPIX</Text>
            <Text style={styles.logoSubtitle} numberOfLines={1} adjustsFontSizeToFit>PİKSEL KELİME BULMACASI</Text>
          </View>

          <View style={styles.progressFrame}>
            <View style={styles.progressPanel}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>HARİTA YÜKLENİYOR</Text>
                <Text style={styles.progressPercent}>{percent}%</Text>
              </View>

              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: barWidth }]}>
                  <View style={styles.progressFillHighlight} />
                </Animated.View>

                {/* barı ayrık piksel bloklarına bölen dikey oluklar */}
                <View style={styles.segmentOverlay} pointerEvents="none">
                  {Array.from({ length: PROGRESS_SEGMENTS }).map((_, i) => (
                    <View
                      key={`seg-${i}`}
                      style={[
                        styles.segmentCell,
                        i === PROGRESS_SEGMENTS - 1 && styles.segmentCellLast,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.flexSpacer} />

        <View style={styles.bottomArea}>
          <Animated.Text style={[styles.startText, { opacity: pulseOpacity }]}>
            DEVAM ETMEK İÇİN DOKUN
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const GRASS_HEIGHT = 230;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.skyTop,
    overflow: 'hidden',
  },
  decorItem: {
    position: 'absolute',
  },

  // --- gökyüzü / bahçe katmanları ---
  skyTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: GRASS_HEIGHT + 46,
    backgroundColor: PALETTE.skyTop,
  },
  skyTransition: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: GRASS_HEIGHT,
    height: 46,
    backgroundColor: PALETTE.skyBottom,
  },
  grassBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: GRASS_HEIGHT,
    backgroundColor: PALETTE.grassLight,
  },
  grassShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
    backgroundColor: PALETTE.grassDark,
    opacity: 0.6,
  },
  grassEdgeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: GRASS_HEIGHT - 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },

  // --- ön plan içerik ---
  content: {
    flex: 1,
    paddingTop: 50,
  },
  // topSpacer + flexSpacer eşit esner: içerik yığınını çim bandının ÜSTÜNDEKİ
  // gökyüzü alanına ortalar, böylece panel asla yeşilliği kapatmaz.
  topSpacer: {
    flex: 1,
  },
  flexSpacer: {
    flex: 1,
  },
  centerArea: {
    alignItems: 'center',
  },
  logoImage: {
    width: 240,
    height: 240,
  },
  titleWrap: {
    alignItems: 'center',
    marginTop: 22,
  },
  logoTitle: {
    color: PALETTE.gold,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  logoSubtitle: {
    color: PALETTE.accent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  bottomArea: {
    height: GRASS_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 26,
  },
  // --- Piksel-art yükleme paneli (çift çerçeve: dış kontur + iç altın kenar) ---
  progressFrame: {
    width: '86%',
    marginTop: 30,
    alignSelf: 'center',
    backgroundColor: PALETTE.outline,
    padding: 4,
    // sert piksel gölgesi
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 6,
  },
  progressPanel: {
    backgroundColor: PALETTE.card,
    borderWidth: 2,
    borderColor: PALETTE.gold,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    color: PALETTE.cream,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  progressPercent: {
    color: PALETTE.outline,
    backgroundColor: PALETTE.gold,
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  progressTrack: {
    height: 22,
    backgroundColor: '#0E1220',
    borderWidth: 3,
    borderColor: PALETTE.outline,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PALETTE.gold,
  },
  progressFillHighlight: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  segmentOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  segmentCell: {
    flex: 1,
    borderRightWidth: 2,
    borderRightColor: '#0E1220',
  },
  segmentCellLast: {
    borderRightWidth: 0,
  },

  startText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 16,
  },
});