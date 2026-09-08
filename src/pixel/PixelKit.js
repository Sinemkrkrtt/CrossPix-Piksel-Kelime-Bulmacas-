// src/pixel/PixelKit.js
// Ortak piksel-art araç kutusu: paletler, matrisler, PixelArt motoru ve
// tüm bahçe ekranlarında yeniden kullanılan GardenBackground.
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PALETTE = {
  skyTop: '#8FD9F2',
  skyBottom: '#CFF3D6',
  grassLight: '#5FC17E',
  grassDark: '#3E9E5E',
  outline: '#20242F',
  card: '#232B45',
  cardBorder: '#3A4257',
  gold: '#FFD93D',
  cream: '#FFF6DD',
  accent: '#31C7D8',
  muted: '#8A93A8',
  white: '#FFFFFF',
};

// Piksel fontlar (Türkçe glifleri tam): arcade başlıklar + VT323 retro gövde.
// VT323 tek ağırlıklı, blokumsu bir terminal pikseli — tüm gövde/UI metni bununla.
export const FONT = {
  arcade: 'PressStart2P_400Regular',
  bold: 'VT323_400Regular',
  semi: 'VT323_400Regular',
  medium: 'VT323_400Regular',
  pixel: 'VT323_400Regular',
};

// ---- Renk tonlama yardımcıları (highlight/shade üretmek için) ----
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const toRgb = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const toHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
export const lighten = (hex, amt) => {
  const [r, g, b] = toRgb(hex);
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
};
export const darken = (hex, amt) => {
  const [r, g, b] = toRgb(hex);
  return toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
};
// İki rengi t oranında karıştırır (t=0 -> a, t=1 -> b)
export const mix = (a, b, t) => {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
};

// ---- Piksel matrisi -> kare bloklar ----
// matrix satırları dizi (['.', 'D', ...]) ya da string ('..D..') olabilir.
export const PixelArt = ({ matrix, palette, pixelSize }) => (
  <View>
    {matrix.map((row, ri) => {
      const cells = typeof row === 'string' ? row.split('') : row;
      return (
        <View key={`r-${ri}`} style={{ flexDirection: 'row' }}>
          {cells.map((cell, ci) => (
            <View
              key={`c-${ri}-${ci}`}
              style={{
                width: pixelSize,
                height: pixelSize,
                backgroundColor: cell === '.' || cell === ' ' ? 'transparent' : (palette[cell] || 'transparent'),
              }}
            />
          ))}
        </View>
      );
    })}
  </View>
);

// --- Joker piksel ikonları (string satır destekli) ---
export const IC_BULB = ['..YYY..', '.YYYYY.', 'YYYWYYY', 'YYYYYYY', '.YYYYY.', '..ggg..', '..ggg..', '...g...'];
export const IC_MAGNIFIER = ['.bbbb..', 'b....b.', 'b.WW.b.', 'b....b.', '.bbbbd.', '.....dd', '......d'];
export const IC_WAND = ['.....YY', '....YYY', '.....Y.', '....p..', '...p...', '..p....', 'p......'];
export const IC_GIFT = ['.r....r.', '.rr..rr.', '..rWWr..', 'gggggggg', 'gg.rr.gg', 'gg.rr.gg', 'gggggggg'];
export const jokerIconPalette = () => ({
  Y: PALETTE.gold, W: PALETTE.cream, g: '#8A93A8', b: PALETTE.accent, d: '#5A4632', p: '#9B5DE5', r: '#FF6F91',
});

export const FLOWER_MATRIX = [
  ['.', '.', 'D', 'D', 'D', '.', '.'],
  ['.', 'D', 'P', 'P', 'P', 'D', '.'],
  ['D', 'P', 'P', 'P', 'P', 'P', 'D'],
  ['D', 'P', 'P', 'C', 'P', 'P', 'D'],
  ['D', 'P', 'P', 'P', 'P', 'P', 'D'],
  ['.', 'D', 'P', 'P', 'P', 'D', '.'],
  ['.', '.', 'D', 'D', 'D', '.', '.'],
];

// ---- Detaylı, gölgeli çiçek (8 taç yaprağı) — deterministik üretim ----
function makeFlower(size, petals, petalBase, petalAmp, centerR) {
  const c = (size - 1) / 2;
  const grid = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const petalR = petalBase + petalAmp * Math.abs(Math.cos((petals * ang) / 2));
      let s = '.';
      if (dist <= centerR) {
        s = 'C';
        if (dx < -0.3 && dy < -0.3 && dist > centerR - 1.6) s = 'W'; // merkez ışık
        else if (dx > 0.5 && dy > 0.5 && dist > centerR - 1.6) s = 'K'; // merkez gölge
      } else if (dist <= petalR) {
        if (dist > petalR - 1.0) s = 'D'; // taç yaprağı konturu
        else if (dx + dy < -1.4) s = 'L'; // sol-üst highlight
        else if (dx + dy > 1.8) s = 'S'; // sağ-alt gölge
        else s = 'P';
      }
      row.push(s);
    }
    grid.push(row);
  }
  return grid;
}

export const DETAILED_FLOWER = makeFlower(13, 8, 3.9, 2.5, 2.4);

// Sonsuz Diyar seviyeleri için FARKLI bir çiçek — 6 iri taç yaprağı, daha küçük göbek.
export const ENDLESS_FLOWER = makeFlower(13, 6, 3.3, 3.0, 2.0);

// Her paketin KENDİNE ÖZGÜ çiçeği (yaprak sayıları birbirinden ve şehir/sonsuzdan farklı).
export const ASYA_FLOWER = makeFlower(13, 5, 3.5, 2.9, 2.1);    // 5 yaprak (sakura)
export const AMERIKA_FLOWER = makeFlower(13, 7, 3.4, 3.0, 2.1); // 7 yaprak (yıldızsı)
export const AFRIKA_FLOWER = makeFlower(13, 12, 4.0, 1.7, 2.2); // 12 yaprak (kadife/ayçiçeği)
export const AVRUPA_FLOWER = makeFlower(13, 4, 3.1, 3.2, 2.0);  // 4 yaprak (yonca)

// Çiçek için renk paleti (açık şehir renkli, kilitli şehir taş grisi/uyuyan)
export const flowerPalette = (petal, locked) =>
  locked
    ? { D: PALETTE.outline, P: '#8A93A8', L: '#A7AEBE', S: '#6C7486', C: '#C2C7D2', W: '#DEE2E8', K: '#8A93A8' }
    : {
        D: PALETTE.outline,
        P: petal,
        L: lighten(petal, 0.34),
        S: darken(petal, 0.26),
        C: '#FFE08A',
        W: PALETTE.cream,
        K: '#E0A63C',
      };

export const LEAF_MATRIX = [
  ['.', '.', 'D', 'D', '.'],
  ['.', 'D', 'G', 'G', 'D'],
  ['D', 'G', 'G', 'G', 'D'],
  ['D', 'G', 'G', 'D', '.'],
  ['.', 'D', 'D', '.', '.'],
];

export const SUN_MATRIX = [
  ['.', '.', 'Y', 'Y', 'Y', '.', '.'],
  ['.', 'Y', 'Y', 'Y', 'Y', 'Y', '.'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['.', 'Y', 'Y', 'Y', 'Y', 'Y', '.'],
  ['.', '.', 'Y', 'Y', 'Y', '.', '.'],
];

export const TREE_MATRIX = [
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

export const BUSH_MATRIX = [
  ['.', '.', 'D', 'D', '.', '.', 'D', 'D', '.', '.'],
  ['.', 'D', 'L', 'G', 'D', 'D', 'L', 'G', 'D', '.'],
  ['D', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'D'],
  ['D', 'G', 'L', 'G', 'G', 'G', 'G', 'L', 'G', 'D'],
  ['.', 'D', 'G', 'G', 'G', 'G', 'G', 'G', 'D', '.'],
  ['.', '.', 'D', 'D', 'D', 'D', 'D', 'D', '.', '.'],
];

const Cloud = ({ top, left, size = 8 }) => (
  <View pointerEvents="none" style={[styles.abs, { top, left }]}>
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: size, height: size }} />
      <View style={{ width: size * 3, height: size, backgroundColor: PALETTE.white, opacity: 0.9 }} />
    </View>
    <View style={{ width: size * 5, height: size, backgroundColor: PALETTE.white, opacity: 0.9 }} />
  </View>
);

const Tree = ({ bottom, left, right, size = 6 }) => (
  <View pointerEvents="none" style={[styles.abs, { bottom, left, right }]}>
    <PixelArt
      matrix={TREE_MATRIX}
      pixelSize={size}
      palette={{ D: PALETTE.outline, G: PALETTE.grassDark, L: PALETTE.grassLight, T: '#7A4A22' }}
    />
  </View>
);

const Bush = ({ bottom, left, right, size = 5 }) => (
  <View pointerEvents="none" style={[styles.abs, { bottom, left, right }]}>
    <PixelArt
      matrix={BUSH_MATRIX}
      pixelSize={size}
      palette={{ D: '#1F3D24', G: PALETTE.grassDark, L: PALETTE.grassLight }}
    />
  </View>
);

const AmbientFlower = ({ bottom, left, right, petal, size = 4 }) => (
  <View pointerEvents="none" style={[styles.abs, { bottom, left, right }]}>
    <PixelArt
      matrix={FLOWER_MATRIX}
      pixelSize={size}
      palette={{ D: PALETTE.outline, P: petal, C: PALETTE.cream }}
    />
  </View>
);

// Gökyüzü + geniş çim tarlası. skyRatio = ekranın ne kadarı gökyüzü (0..1).
export const GardenBackground = ({ skyRatio = 0.34 }) => {
  const grassHeight = Math.round(SCREEN_HEIGHT * (1 - skyRatio));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.skyFill, { backgroundColor: PALETTE.skyTop, bottom: grassHeight }]} />
      <View style={[styles.skyBand, { bottom: grassHeight - 1, backgroundColor: PALETTE.skyBottom }]} />

      {/* Güneş + bulutlar (gökyüzü şeridi) */}
      <View style={[styles.abs, { top: 46, right: 30 }]}>
        <PixelArt matrix={SUN_MATRIX} pixelSize={7} palette={{ Y: '#FFE58A' }} />
      </View>
      <Cloud top={70} left={SCREEN_WIDTH * 0.08} size={7} />
      <Cloud top={120} left={SCREEN_WIDTH * 0.6} size={6} />

      {/* Çim tarlası */}
      <View style={[styles.grassBand, { height: grassHeight, backgroundColor: PALETTE.grassLight }]} />
      <View style={styles.grassShadow} />
      <View style={[styles.grassEdge, { bottom: grassHeight - 1 }]}>
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

      {/* Zemin dekoru: ağaçlar, çalılar, dağınık çiçekler */}
      <Tree bottom={grassHeight - 60} left={-8} size={6} />
      <Tree bottom={grassHeight - 40} right={-10} size={7} />
      <Bush bottom={26} left={'34%'} size={4} />
      <Bush bottom={40} right={'12%'} size={4} />
      <AmbientFlower bottom={16} left={'8%'} petal={PALETTE.gold} size={4} />
      <AmbientFlower bottom={30} left={'52%'} petal={'#FF6F91'} size={4} />
      <AmbientFlower bottom={12} right={'26%'} petal={'#FF9F43'} size={4} />
      <AmbientFlower bottom={44} left={'22%'} petal={'#FF6F91'} size={3} />
    </View>
  );
};

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  skyFill: { position: 'absolute', top: 0, left: 0, right: 0 },
  skyBand: { position: 'absolute', left: 0, right: 0, height: 46 },
  grassBand: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grassShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
    backgroundColor: PALETTE.grassDark,
    opacity: 0.55,
  },
  grassEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
});
