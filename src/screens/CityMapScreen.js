// src/screens/CityMapScreen.js
// Candy Crush tarzı yatay kaydırılan piksel bahçe haritası. Şehirler bir yol
// boyunca zigzag dizilir; aralar ağaç/çalı/çiçekle dolar. Arı (maskot)
// dokunulan çiçeğe uçar, harita da o şehre kayar; açık şehirse bulmacalara geçer.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import {
  PALETTE,
  FONT,
  PixelArt,
  DETAILED_FLOWER,
  ENDLESS_FLOWER,
  ASYA_FLOWER,
  AMERIKA_FLOWER,
  AFRIKA_FLOWER,
  AVRUPA_FLOWER,
  flowerPalette,
  LEAF_MATRIX,
  TREE_MATRIX,
  BUSH_MATRIX,
  FLOWER_MATRIX,
  lighten,
} from '../pixel/PixelKit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PixiWelcome from './components/PixiWelcome';
import { CITIES, PACKS, getPack, ENDLESS_PACK } from '../data/cities';
import { tierForLevel } from '../data/endless';
import { SOUVENIR_MILESTONES } from '../data/souvenirs';
import { useAuth } from '../auth/AuthContext';
import { useEconomy } from '../economy/EconomyContext';

// Sağ üst düğme ikonu: çıkış (kapı + dışarı ok)
const LOGOUT_ICON = [
  'oooo......',
  'o..o......',
  'o..o..o...',
  'o..o...o..',
  'o..ooooooo',
  'o..o...o..',
  'o..o..o...',
  'o..o......',
  'oooo......',
];
const LOGOUT_PAL = { o: PALETTE.gold };

// Mağaza butonu ikonu (alışveriş çantası)
const STORE_ICON = [
  '.o...o.',
  '.o...o.',
  'ooooooo',
  'ooooooo',
  'ooooooo',
  'ooooooo',
  '.ooooo.',
];
const STORE_PAL = { o: PALETTE.gold };

// Günlük Bulmaca logosu: piksel takvim (üstte halkalar, altın başlık, bugünü işaretli gün ızgarası)
const DAILY_ICON = [
  '.r.....r.',
  '.r.....r.',
  'HHHHHHHHH',
  'HHHHHHHHH',
  'wwwwwwwww',
  'w.d.d.d.w',
  'w.d.X.d.w',
  'w.d.d.d.w',
  'wwwwwwwww',
];
const DAILY_PAL = { r: '#5A3A00', H: PALETTE.gold, w: PALETTE.cream, d: '#8FB56A', X: '#E8611C' };

// Seyahat Defteri logosu: piksel albüm/defter + kurdele
const JOURNAL_ICON = [
  'cccccccc.',
  'cwwwwwwcm',
  'cwccccwcm',
  'cwwwwwwcm',
  'cwccccwc.',
  'cwwwwwwc.',
  'cccccccc.',
];
const JOURNAL_PAL = { c: PALETTE.gold, w: PALETTE.cream, m: '#C88A00' };

const BEE = require('../../assets/Logo.png');
const { width: W, height: H } = Dimensions.get('window');

const BEE_SIZE = 74;
const FLOWER_PIXEL = 5;
const PETAL = DETAILED_FLOWER.length * FLOWER_PIXEL; // 65
const WRAP_W = 148;

// --- Dünya düzeni (içerik yatay kaydırılır) ---
const SKY_H = Math.round(H * 0.34);
const GRASS_TOP = SKY_H;
const NODE_GAP = 236;          // ardışık şehirler arası yatay mesafe
const LEFT_PAD = 150;
const RIGHT_PAD = 170;
// --- Harita akışı (az kalabalık): başlangıç ücretsiz şehirler → (Asya+Afrika elmas) →
//     birkaç ücretsiz → (Amerika+Avrupa elmas) → Sonsuz Diyar kapısı. Aynı anda en çok 2 dal. ---
const CY_MID = GRASS_TOP + 150;   // ana omurga / kavşak çizgisi
const CY_HIGH = CY_MID - 48;      // ücretsiz zigzag üst
const CY_LOW = CY_MID + 48;       // ücretsiz zigzag alt
const CY_TOP = CY_MID - 108;      // dal üst sırası
const CY_BOT = CY_MID + 108;      // dal alt sırası
const PACK_GAP = 200;             // dal içi şehir aralığı

const BASE_CITIES = CITIES.filter((c) => !c.pack);
const START_FREE = BASE_CITIES.slice(0, 15);        // başta ücretsiz şehirler
const MID_FREE = BASE_CITIES.slice(15);             // iki elmas arasında birkaç ücretsiz
const packById = (id) => PACKS.find((p) => p.id === id);
const citiesOf = (id) => (packById(id)?.cities || []).map((cid) => CITIES.find((c) => c.id === cid)).filter(Boolean);

// başlangıç ücretsiz zigzag
const startNodes = START_FREE.map((city, i) => ({
  city, cx: LEFT_PAD + i * NODE_GAP, cy: i % 2 === 0 ? CY_HIGH : CY_LOW,
}));
const startEndX = startNodes.length ? startNodes[startNodes.length - 1].cx : LEFT_PAD;

// Bir elmas: topId üst dalda, botId alt dalda — split'ten açılır, merge'de birleşir.
// dg = elmas grubu (1 veya 2) — görünürlük/kilit aşamaları için.
function buildDiamond(topId, botId, x0, dg) {
  const top = citiesOf(topId).map((city, j) => ({ city, cx: x0 + PACK_GAP * (j + 1), cy: CY_TOP, packId: topId, branch: 'top', dg }));
  const bot = citiesOf(botId).map((city, j) => ({ city, cx: x0 + PACK_GAP * (j + 1), cy: CY_BOT, packId: botId, branch: 'bot', dg }));
  const n = Math.max(top.length, bot.length);
  return { topId, botId, top, bot, split: { cx: x0, cy: CY_MID }, merge: { cx: x0 + PACK_GAP * (n + 1), cy: CY_MID } };
}

const D1 = buildDiamond('asya', 'afrika', startEndX + NODE_GAP, 1);
// İlk elmastan (Asya+Afrika) sonraki ücretsiz şehirler: o iki paket BİTMEDEN açılmaz.
const midNodes = MID_FREE.map((city, i) => ({
  city, cx: D1.merge.cx + NODE_GAP * (i + 1), cy: i % 2 === 0 ? CY_HIGH : CY_LOW, mid: true,
}));
const midEndX = midNodes.length ? midNodes[midNodes.length - 1].cx : D1.merge.cx;
const D2 = buildDiamond('amerika', 'avrupa', midEndX + NODE_GAP, 2);

const DIAMONDS = [D1, D2];
const packNodes = [...D1.top, ...D1.bot, ...D2.top, ...D2.bot];
const NODES = [...startNodes, ...midNodes, ...packNodes];

// Sonsuz Diyar kapısı = ikinci elmasın birleşim noktası (Amerika+Avrupa burada birleşir).
const ENDLESS_NODE = { cx: D2.merge.cx, cy: CY_MID };
const ENDLESS_X = ENDLESS_NODE.cx;
const ENDLESS_CY = CY_MID;
const CONTENT_W = ENDLESS_X + RIGHT_PAD;
const HOME = { x: startNodes[0].cx - BEE_SIZE / 2, y: GRASS_TOP - BEE_SIZE - 6 };

// Paket → kendine özgü çiçek eşlemesi.
const PACK_FLOWER = { asya: ASYA_FLOWER, amerika: AMERIKA_FLOWER, afrika: AFRIKA_FLOWER, avrupa: AVRUPA_FLOWER };

// --- Sonsuz Diyar kapısı (senior seviye piksel çizim) ---
// Işıldayan mor bir portal + taş kemer. Tüm paket dalları burada birleşir.
const PORTAL = [
  '.....kkkkk.....',
  '...kkSSSSSkk...',
  '..kSSSSSSSSSk..',
  '.kSSkgggggkSSk.',
  '.kSkgyyyyygkSk.',
  'kSSkgywwwygkSSk',
  'kSSkgyw.wygkSSk',
  'kSSkgywwwygkSSk',
  'kSSkgyyyyygkSSk',
  'kSSkggggggkkSSk',
  'kSSSkkkkkkkSSSk',
  'kSSSs.....sSSSk',
  'kSSs.......sSSk',
  'kSSs.......sSSk',
  'kSSs.......sSSk',
  'kkss.......sskk',
];
const PORTAL_PAL = { k: '#3A2A52', s: '#6D5B84', S: '#9A86B5', g: '#7A2CD0', y: '#C77DFF', w: '#F3E6FF' };
const PORTAL_PAL_LOCK = { k: '#40404A', s: '#6E6E78', S: '#9A9AA4', g: '#6A6A74', y: '#8C8C96', w: '#C9C9CF' };
const PORTAL_PX = 6;
const PORTAL_H = PORTAL.length * PORTAL_PX;    // 96
const PORTAL_W = PORTAL[0].length * PORTAL_PX; // 90

// --- Ek küçük piksel varlıklar (çeşitlilik için) ---
const GRASS_TUFT = [
  ['.', 'L', '.', '.', 'L', '.'],
  ['L', 'G', 'L', '.', 'G', 'L'],
  ['G', 'G', 'G', 'L', 'G', 'G'],
];
const ROCK = [
  ['.', '.', 'd', 'd', 'd', '.', '.'],
  ['.', 'd', 'R', 'R', 'R', 'd', '.'],
  ['d', 'R', 'L', 'R', 'R', 'R', 'd'],
  ['d', 'd', 'd', 'd', 'd', 'd', 'd'],
];
const TALL_FLOWER = [
  ['.', 'D', 'P', 'D', '.'],
  ['D', 'P', 'C', 'P', 'D'],
  ['.', 'D', 'P', 'D', '.'],
  ['.', '.', 'G', '.', '.'],
  ['.', 'L', 'G', '.', '.'],
  ['.', '.', 'G', 'L', '.'],
];
const MUSHROOM = [
  ['.', 'r', 'r', 'r', '.'],
  ['r', 'W', 'r', 'W', 'r'],
  ['.', 'S', 'S', 'S', '.'],
  ['.', 'S', 'S', 'S', '.'],
];

const FLOWER_TONES = [PALETTE.gold, '#FF6F91', '#FF9F43', '#C56BE8', '#4FB0FF', '#E5539B', '#FF5252', '#FF784F', '#F2F2F2'];

// Deterministik, katmanlı dekor — dünyayı zenginleştirir (arka soluk/küçük, ön büyük).
const buildDecor = (width = CONTENT_W, extraNodeXs = []) => {
  const list = [];
  let s = 20260905;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const nodeXs = [...NODES.map((n) => n.cx), ...extraNodeXs];
  for (let x = 16; x < width - 12; x += 22 + Math.floor(rnd() * 26)) {
    const r = rnd();
    const depth = rnd(); // 0 arka(küçük/soluk) .. 1 ön(büyük)
    let kind;
    if (r < 0.13) kind = 'tree';
    else if (r < 0.28) kind = 'bush';
    else if (r < 0.49) kind = 'flower';
    else if (r < 0.66) kind = 'cluster';
    else if (r < 0.84) kind = 'grass';
    else if (r < 0.94) kind = 'mushroom';
    else kind = 'rock';
    // büyük öğeler düğüm tabelalarına binmesin; küçük öğeler binebilir
    const nearNode = nodeXs.some((nx) => Math.abs(nx - x) < 42);
    if (nearNode && (kind === 'tree' || kind === 'bush')) continue;
    const top = GRASS_TOP + 80 + depth * (H - GRASS_TOP - 132);
    list.push({ x, kind, depth, top, tone: rnd(), jx: rnd() });
  }
  list.sort((a, b) => a.depth - b.depth); // arka katman önce çizilsin
  return list;
};

function Decor({ d, theme }) {
  const op = 0.58 + d.depth * 0.42;
  const petal = FLOWER_TONES[Math.floor(d.tone * FLOWER_TONES.length) % FLOWER_TONES.length];
  const tree = theme && theme.tree; // mevsimlik yaprak paleti (kar/sonbahar)
  if (d.kind === 'tree') {
    const size = 4 + Math.round(d.depth * 3);
    const g = tree ? tree.G : (d.depth < 0.4 ? lighten(PALETTE.grassDark, 0.2) : PALETTE.grassDark);
    const l = tree ? tree.L : PALETTE.grassLight;
    return (
      <View pointerEvents="none" style={[styles.decor, { left: d.x, top: d.top, opacity: op }]}>
        <PixelArt matrix={TREE_MATRIX} pixelSize={size} palette={{ D: PALETTE.outline, G: g, L: l, T: '#7A4A22' }} />
      </View>
    );
  }
  if (d.kind === 'bush') {
    const size = 3 + Math.round(d.depth * 2.5);
    return (
      <View pointerEvents="none" style={[styles.decor, { left: d.x, top: d.top + 24, opacity: op }]}>
        <PixelArt matrix={BUSH_MATRIX} pixelSize={size} palette={{ D: '#1F3D24', G: tree ? tree.G : PALETTE.grassDark, L: tree ? tree.L : PALETTE.grassLight }} />
      </View>
    );
  }
  if (d.kind === 'grass') {
    const size = 3 + Math.round(d.depth * 2);
    return (
      <View pointerEvents="none" style={[styles.decor, { left: d.x, top: d.top + 36, opacity: op }]}>
        <PixelArt matrix={GRASS_TUFT} pixelSize={size} palette={{ G: PALETTE.grassDark, L: lighten(PALETTE.grassLight, 0.12) }} />
      </View>
    );
  }
  if (d.kind === 'mushroom') {
    const size = 3 + Math.round(d.depth * 1.5);
    return (
      <View pointerEvents="none" style={[styles.decor, { left: d.x, top: d.top + 34, opacity: op }]}>
        <PixelArt matrix={MUSHROOM} pixelSize={size} palette={{ r: '#D9483B', W: PALETTE.cream, S: '#E8DCC0' }} />
      </View>
    );
  }
  if (d.kind === 'rock') {
    const size = 3 + Math.round(d.depth * 2);
    return (
      <View pointerEvents="none" style={[styles.decor, { left: d.x, top: d.top + 32, opacity: op }]}>
        <PixelArt matrix={ROCK} pixelSize={size} palette={{ d: '#5A5A55', R: '#8C8C84', L: '#ABABA2' }} />
      </View>
    );
  }
  if (d.kind === 'cluster') {
    const size = 3 + Math.round(d.depth * 2);
    const petal2 = FLOWER_TONES[Math.floor(d.jx * FLOWER_TONES.length) % FLOWER_TONES.length];
    return (
      <View pointerEvents="none" style={[styles.decor, { left: d.x, top: d.top + 28, opacity: op, flexDirection: 'row', alignItems: 'flex-end' }]}>
        <PixelArt matrix={FLOWER_MATRIX} pixelSize={size} palette={{ D: PALETTE.outline, P: petal, C: PALETTE.cream }} />
        <View style={{ width: 2 }} />
        <PixelArt matrix={FLOWER_MATRIX} pixelSize={Math.max(2, size - 1)} palette={{ D: PALETTE.outline, P: petal2, C: PALETTE.cream }} />
      </View>
    );
  }
  // saplı tek çiçek
  const size = 3 + Math.round(d.depth * 2);
  return (
    <View pointerEvents="none" style={[styles.decor, { left: d.x, top: d.top + 24, opacity: op }]}>
      <PixelArt matrix={TALL_FLOWER} pixelSize={size} palette={{ D: PALETTE.outline, P: petal, C: PALETTE.cream, G: PALETTE.grassDark, L: PALETTE.grassLight }} />
    </View>
  );
}

// Sonbahar: yere dağılmış kuru yapraklar (deterministik konumlar).
const FALLEN_LEAF = ['.oo', 'oo.'];
function FallenLeaves({ colors, contentW, groundTop }) {
  const items = useMemo(() => {
    const list = [];
    let s = 987654321;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let x = 14; x < contentW - 14; x += 20 + Math.floor(rnd() * 26)) {
      const y = groundTop + 70 + rnd() * (H - groundTop - 110);
      list.push({ x, y, c: colors[Math.floor(rnd() * colors.length)], sz: 3 + Math.round(rnd() * 2), k: `${x}-${Math.round(y)}` });
    }
    return list;
  }, [colors, contentW, groundTop]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((l) => (
        <View key={l.k} style={{ position: 'absolute', left: l.x, top: l.y }}>
          <PixelArt matrix={FALLEN_LEAF} pixelSize={l.sz} palette={{ o: l.c }} />
        </View>
      ))}
    </View>
  );
}

// Bir elmasın yollarını çizen yardımcı (split→dallar→merge).
function diamondLines(D, di, line, chain) {
  [D.top, D.bot].forEach((br, bi) => {
    if (!br.length) return;
    line(D.split, br[0], `d${di}s${bi}`);
    chain(br, `d${di}c${bi}`);
    line(br[br.length - 1], D.merge, `d${di}m${bi}`);
  });
}

// İki düğüm arasını basamak taşlarıyla bağlayan yol (tüm harita her zaman görünür).
function PathDots() {
  const dots = [];
  const line = (a, b, key) => {
    const steps = Math.max(4, Math.round(Math.hypot(b.cx - a.cx, b.cy - a.cy) / 48));
    for (let t = 1; t < steps; t++) {
      const f = t / steps;
      dots.push({ x: a.cx + (b.cx - a.cx) * f, y: a.cy + PETAL / 2 + 40 + (b.cy - a.cy) * f, key: `${key}-${t}` });
    }
  };
  const chain = (arr, key) => { for (let k = 0; k < arr.length - 1; k++) line(arr[k], arr[k + 1], `${key}${k}`); };

  // başlangıç ücretsiz zincir → Elmas 1 split → 1. elmas
  chain(startNodes, 'sf');
  if (startNodes.length) line(startNodes[startNodes.length - 1], D1.split, 'sd1');
  diamondLines(D1, 0, line, chain);
  // 1. elmas merge → orta ücretsiz zincir → Elmas 2 split → 2. elmas
  if (midNodes.length) { line(D1.merge, midNodes[0], 'm1f'); chain(midNodes, 'mf'); line(midNodes[midNodes.length - 1], D2.split, 'fd2'); }
  else line(D1.merge, D2.split, 'm1d2');
  diamondLines(D2, 1, line, chain);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dots.map((d) => (
        <View key={d.key} style={[styles.pathDot, { left: d.x - 9, top: d.y - 9 }]} />
      ))}
    </View>
  );
}

// Dal başında paket tabelası — ilk şehrin soluna, kavşak tarafına.
function PackGate({ pack, cx, cy, owned }) {
  return (
    <View pointerEvents="none" style={[styles.packGate, { left: cx - 158, top: cy - 15, width: 128 }]}>
      <View style={[styles.packGateInner, owned ? styles.packGateOpen : styles.packGateLocked]}>
        <Text numberOfLines={1} style={[styles.packGateText, owned ? styles.packGateTextOpen : styles.packGateTextLocked]}>
          {owned ? pack.name : `🔒 ${pack.name}`}
        </Text>
      </View>
    </View>
  );
}

function CityFlower({ node, onPress, open }) {
  const { city, cx, cy, packId } = node;
  const pal = flowerPalette(city.petal, !open);
  const matrix = packId ? PACK_FLOWER[packId] || DETAILED_FLOWER : DETAILED_FLOWER;
  return (
    <Pressable
      onPress={() => onPress(node)}
      style={[styles.flowerWrap, { left: cx - WRAP_W / 2, top: cy - PETAL / 2, width: WRAP_W }]}
    >
      <View style={styles.petalShadow}>
        <PixelArt matrix={matrix} pixelSize={FLOWER_PIXEL} palette={pal} />
        {!open && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </View>

      <View style={styles.stem}>
        <View style={styles.stemLeaf}>
          <PixelArt matrix={LEAF_MATRIX} pixelSize={3} palette={{ D: '#1F3D24', G: PALETTE.grassLight }} />
        </View>
      </View>

      <View style={[styles.sign, open ? styles.signOpen : styles.signLocked]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.signText, open ? styles.signTextOpen : styles.signTextLocked]}
        >
          {city.name}
        </Text>
      </View>
    </Pressable>
  );
}

// Haritanın sonundaki Sonsuz Diyar kapısı — bir şehir değil, sonsuz modun girişi.
function EndlessGate({ owned, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.endlessNode, { left: ENDLESS_NODE.cx - WRAP_W / 2, top: ENDLESS_NODE.cy - PORTAL_H / 2, width: WRAP_W }]}
    >
      {owned && <View style={styles.portalGlow} />}
      <View style={styles.petalShadow}>
        <PixelArt matrix={PORTAL} pixelSize={PORTAL_PX} palette={owned ? PORTAL_PAL : PORTAL_PAL_LOCK} />
        {!owned && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </View>
      <View style={[styles.sign, owned ? styles.signOpen : styles.signLocked, styles.endlessSign]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.signText, owned ? styles.signTextOpen : styles.signTextLocked]}
        >
          {ENDLESS_PACK.name}
        </Text>
      </View>
    </Pressable>
  );
}

// --- Sonsuz seviye patikası (Candy Crush tarzı) — kapıdan sonra harita boyunca devam eder ---
const TIER_COLOR = { 1: '#3EA05A', 2: '#3E7AD0', 3: '#8E3BC0' };
const LVL_STEP = 150;                 // ardışık seviye düğümleri arası
const LVL_HI = ENDLESS_CY - 62;       // zigzag üst sıra
const LVL_LO = ENDLESS_CY + 62;       // zigzag alt sıra
const LVL_AHEAD = 12;                 // mevcut seviyeden sonra gösterilecek kilitli seviye
const LVL_WINDOW = 46;                // aynı anda en çok kaç düğüm çizilir
const LVL_PIX = 4;                    // seviye çiçeği piksel boyu
const PETAL_E = ENDLESS_FLOWER.length * LVL_PIX; // 52
const LVL_WRAP = 90;
const ENDLESS_TAIL = 560;             // son seviyeden sonra silikleşen ∞ kuyruğunun genişliği

// Kapıdan başlayıp mevcut seviyeye + birkaç adım ötesine uzanan düğümler.
function buildLevelNodes(current) {
  const end = current + LVL_AHEAD;
  const start = Math.max(1, end - LVL_WINDOW + 1);
  const out = [];
  for (let lvl = start, k = 0; lvl <= end; lvl++, k++) {
    out.push({ level: lvl, cx: ENDLESS_X + LVL_STEP * (k + 1), cy: k % 2 === 0 ? LVL_HI : LVL_LO });
  }
  return out;
}

// Kapı + seviye düğümlerini basamak taşlarıyla bağlayan yol.
function EndlessPath({ nodes }) {
  const dots = [];
  const seg = (a, b, key) => {
    const steps = Math.max(3, Math.round(Math.hypot(b.cx - a.cx, b.cy - a.cy) / 40));
    for (let t = 1; t < steps; t++) {
      const f = t / steps;
      dots.push({ x: a.cx + (b.cx - a.cx) * f, y: a.cy + (b.cy - a.cy) * f, key: `${key}-${t}` });
    }
  };
  let prev = ENDLESS_NODE;
  nodes.forEach((n, i) => { seg(prev, n, `e${i}`); prev = n; });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dots.map((d) => <View key={d.key} style={[styles.pathDot, { left: d.x - 9, top: d.y - 9 }]} />)}
    </View>
  );
}

// Son seviyeden sonra yol silikleşerek ∞'a doğru gider — "harita burada bitmiyor" hissi.
function EndlessTail({ last }) {
  if (!last) return null;
  const SP = 92;
  const N = 5;
  const dots = [];
  for (let i = 1; i <= N; i++) {
    const x = last.cx + SP * i;
    const y = ENDLESS_CY + (last.cy - ENDLESS_CY) * Math.cos(i * 1.1) * (1 - i / (N + 1.5)); // merkeze doğru sönümlenen dalga
    dots.push({ x, y, op: Math.max(0.09, 0.8 * (1 - i / (N + 1))) });
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dots.map((d, i) => (
        <View key={`et-${i}`} style={[styles.pathDot, { left: d.x - 9, top: d.y - 9, opacity: d.op }]} />
      ))}
    </View>
  );
}

// Tek seviye düğümü — şehirlerden farklı bir çiçek (6 yapraklı). Durum: tamamlandı / mevcut / kilitli.
function LevelNode({ node, state, pulse, onPress }) {
  const base = TIER_COLOR[tierForLevel(node.level)];
  const locked = state === 'locked';
  const done = state === 'done';
  const current = state === 'current';
  const pal = flowerPalette(base, locked);
  return (
    <Pressable
      onPress={() => onPress(node, state)}
      style={[styles.lvlWrap, { left: node.cx - LVL_WRAP / 2, top: node.cy - PETAL_E / 2, width: LVL_WRAP }]}
      hitSlop={4}
    >
      {current && (
        <Animated.View
          style={[styles.lvlRing, {
            borderColor: base,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] }) }],
          }]}
        />
      )}
      <View style={styles.petalShadow}>
        <PixelArt matrix={ENDLESS_FLOWER} pixelSize={LVL_PIX} palette={pal} />
        {locked && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
        {done && (
          <View style={styles.lvlCheck}>
            <Text style={styles.lvlCheckTxt}>✓</Text>
          </View>
        )}
      </View>
      <View style={[styles.lvlSign, locked ? styles.lvlSignLocked : { backgroundColor: base }, current && styles.lvlSignCurrent]}>
        <Text style={[styles.lvlSignTxt, locked && styles.lvlSignTxtLocked]}>{node.level}</Text>
      </View>
    </Pressable>
  );
}

// Giriş animasyonu (arı ekran dışından uçarak gelir) yalnızca oyun ilk açıldığında
// oynatılır. Sonraki her dönüşte arı son konduğu yerde kalır. (Modül seviyesinde
// tutulur → uygulama açık kaldığı sürece bir kez.)
let hasEnteredCityMap = false;

export default function CityMapScreen({ navigation }) {
  const { logout, removeAccount } = useAuth();
  const { theme, ownedPacks, buyPack, endlessLevel, rewarded, claimedMilestones } = useEconomy();

  // Şehir tamamlandı mı? (tüm bölümleri çözülmüş mü)
  const cityDone = (city) => Array.isArray(city.puzzles) && city.puzzles.length > 0
    && city.puzzles.every((p) => rewarded[`${city.id}:${p.id}`]);

  // --- İLERLEME KİLİDİ ---
  // Şehirler sırayla açılır (öncekini bitirmeden sonrakine geçilmez). Paketler ancak
  // oraya kadar ilerleyince (kapıya ulaşınca) satın alınabilir.
  const packComplete = (packId) => {
    const p = PACKS.find((x) => x.id === packId);
    if (!p) return false;
    const cs = p.cities.map((cid) => CITIES.find((c) => c.id === cid)).filter(Boolean);
    return cs.length > 0 && cs.every((c) => cityDone(c));
  };
  const d1Buyable = cityDone(START_FREE[START_FREE.length - 1]);            // başlangıç şehirleri bitti → Asya/Afrika alınabilir
  const midOpenBase = packComplete('asya') && packComplete('afrika');       // ara ücretsiz şehirler açılır
  const d2Buyable = cityDone(BASE_CITIES[BASE_CITIES.length - 1]);          // ara şehirler bitti → Amerika/Avrupa alınabilir
  const endlessBuyable = packComplete('amerika') && packComplete('avrupa'); // iki paket bitti → Sonsuz alınabilir

  // Seyahat Defteri: kaç hatıra toplandı + alınabilir kilometre taşı var mı (kırmızı nokta).
  const souvenirCount = CITIES.reduce((n, c) => n + (cityDone(c) ? 1 : 0), 0);
  const milestoneReady = SOUVENIR_MILESTONES.some((m) => souvenirCount >= m.n && !(claimedMilestones || []).includes(m.n));

  // Düğüm açık mı (oynanabilir mi)? — adım adım kilit.
  const isOpen = (node) => {
    if (node.dg) {
      // Paket şehri: paket alınmış OLSA BİLE, ondan önceki aşama bitmeden açılmaz.
      if (!ownedPacks.includes(node.packId)) return false;
      if (node.dg === 1 && !d1Buyable) return false;   // önce başlangıç şehirleri bitmeli
      if (node.dg === 2 && !d2Buyable) return false;   // önce ara ücretsiz şehirler (ve Asya+Afrika) bitmeli
      // + paket içinde sıra gelmiş olmalı.
      const cities = PACKS.find((p) => p.id === node.packId)?.cities || [];
      const idx = cities.indexOf(node.city.id);
      if (idx <= 0) return true;                       // paketin ilk şehri
      const prev = CITIES.find((c) => c.id === cities[idx - 1]);
      return prev ? cityDone(prev) : true;             // önceki şehir bitince açılır
    }
    if (node.mid) {
      // Ara ücretsiz şehirler: önce Asya + Afrika bitmeli, sonra kendi aralarında sıralı.
      if (!midOpenBase) return false;
      const idx = MID_FREE.indexOf(node.city);
      if (idx <= 0) return true;
      return cityDone(MID_FREE[idx - 1]);
    }
    // Başlangıç ücretsiz şehirler: sıralı (istanbul hep açık).
    const idx = START_FREE.indexOf(node.city);
    if (idx <= 0) return true;
    return cityDone(START_FREE[idx - 1]);
  };

  // Sonsuz Diyar açıksa, kapıdan sonra harita boyunca uzanan seviye patikası (Candy Crush gibi).
  const isEndlessOwned = ownedPacks.includes(ENDLESS_PACK.id);
  const endlessNodes = useMemo(
    () => (isEndlessOwned ? buildLevelNodes(endlessLevel) : []),
    [isEndlessOwned, endlessLevel]
  );
  // Harita hep kapıya kadar görünür; sonsuz açıksa ∞ kuyruğuna kadar uzar.
  const contentW = endlessNodes.length
    ? endlessNodes[endlessNodes.length - 1].cx + ENDLESS_TAIL + RIGHT_PAD
    : ENDLESS_X + RIGHT_PAD;
  const beePos = useRef(new Animated.ValueXY(HOME)).current;

  // Pixi karşılaması: ilk açılışta tanıtım, SONRAKİ HER açılışta kısa "tekrar hoş geldin".
  const [welcomeMode, setWelcomeMode] = useState(null); // null | 'intro' | 'daily'
  useEffect(() => {
    let alive = true;
    (async () => {
      let onboarded = null;
      try { onboarded = await AsyncStorage.getItem('pixi_onboarded_v2'); } catch (e) { /* sessiz */ }
      if (alive) setWelcomeMode(onboarded ? 'daily' : 'intro');
    })();
    return () => { alive = false; };
  }, []);
  const closeWelcome = useCallback(async () => {
    setWelcomeMode(null);
    try { await AsyncStorage.setItem('pixi_onboarded_v2', '1'); } catch (e) { /* sessiz */ }
  }, []);

  const toLogin = () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

  const confirmDelete = () => {
    Alert.alert('Hesabı sil', 'Hesabın kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const res = await removeAccount();
          if (res.ok) toLogin();
          else if (res.code === 'auth/requires-recent-login') {
            Alert.alert('Yeniden giriş gerekli', 'Güvenlik için çıkış yapıp tekrar giriş yap, sonra hesabı sil.', [
              { text: 'Tamam', onPress: async () => { await logout(); toLogin(); } },
            ]);
          } else {
            Alert.alert('Silinemedi', res.error);
          }
        },
      },
    ]);
  };

  const openAccountMenu = () => {
    Alert.alert('Hesap', undefined, [
      { text: 'Çıkış Yap', onPress: async () => { await logout(); toLogin(); } },
      { text: 'Hesabı Sil', style: 'destructive', onPress: confirmDelete },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const bob = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current; // 0 gizli → 1 görünür
  const levelPulse = useRef(new Animated.Value(0)).current; // mevcut seviye halkası
  const scrollRef = useRef(null);
  const [flying, setFlying] = useState(false);
  const [toast, setToast] = useState(null);
  // Dekor/gökyüzü öğeleri haritanın TAM genişliğini (sonsuz patika dahil) kaplar.
  const endlessXs = useMemo(
    () => [ENDLESS_NODE.cx, ...endlessNodes.map((n) => n.cx)],
    [endlessNodes]
  );
  const decor = useMemo(() => buildDecor(contentW, endlessXs), [contentW, endlessXs]);
  const clouds = useMemo(() => buildClouds(contentW), [contentW]);
  const hills = useMemo(() => buildHills(contentW), [contentW]);
  const birds = useMemo(() => buildBirds(contentW), [contentW]);

  // Mevcut seviye madalyonunun nabız halkası (yalnızca patika açıkken)
  useEffect(() => {
    if (!isEndlessOwned) return undefined;
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(levelPulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(levelPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    l.start();
    return () => l.stop();
  }, [isEndlessOwned, levelPulse]);

  // Sürekli süzülme (bob) döngüsü
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -7, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  // Ekrana her gelişte: harita yumuşakça belirir + arı ekran dışından uçarak yuvasına iner.
  const runEntrance = useCallback(() => {
    setFlying(true);
    setToast(null);
    entrance.setValue(0);
    beePos.setValue({ x: HOME.x - 90, y: HOME.y - 280 });
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 560, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(beePos, { toValue: HOME, duration: 1050, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setFlying(false); });
  }, [beePos, bob, entrance]);

  useFocusEffect(useCallback(() => {
    if (!hasEnteredCityMap) {
      hasEnteredCityMap = true;
      runEntrance();            // yalnızca oyun ilk açıldığında baştan uç
    } else {
      // Arı son konduğu yerde kalsın; sadece haritayı görünür yap ve durumu sıfırla.
      entrance.setValue(1);
      setFlying(false);
      setToast(null);
    }
  }, [runEntrance, entrance]));

  const flyTo = (node) => {
    if (flying) return;
    setFlying(true);
    setToast(null);

    const { city, cx, cy } = node;
    const target = { x: cx - BEE_SIZE / 2, y: cy - BEE_SIZE * 0.72 };

    // Haritayı tıklanan şehre kaydır.
    const scrollX = Math.max(0, Math.min(cx - W / 2, contentW - W));
    scrollRef.current?.scrollTo({ x: scrollX, animated: true });

    Animated.timing(beePos, {
      toValue: target,
      duration: 820,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (isOpen(node)) {
        navigation.navigate('CityPuzzles', { cityId: city.id });
        return;
      }
      // Kilitli — arı yuvasına döner, sonra (paketse) satın alma sorulur.
      const pack = node.packId ? getPack(node.packId) : null;
      Animated.timing(beePos, {
        toValue: HOME,
        duration: 620,
        delay: 360,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setFlying(false);
        if (pack) {
          if (node.dg === 1 && !d1Buyable) {
            // Kapıya ulaşılmamış (başlangıç şehirleri bitmemiş) — alınmış olsa bile kapalı.
            setToast('Önce başlangıç şehirlerini bitir');
            setTimeout(() => setToast(null), 2400);
          } else if (node.dg === 2 && !d2Buyable) {
            setToast('Önce aradaki ücretsiz şehirleri bitir');
            setTimeout(() => setToast(null), 2400);
          } else if (ownedPacks.includes(node.packId)) {
            // Kapı açık + paket alınmış ama bu şehrin sırası gelmemiş.
            setToast('Önce paketin önceki şehrini bitir');
            setTimeout(() => setToast(null), 2200);
          } else {
            // Kapıya ulaşıldı → satın alma sorulur.
            Alert.alert(
              pack.name,
              `${pack.cities.length} yeni şehir açılır.\n${pack.price} altına satın al?`,
              [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: `${pack.price} altın`,
                  onPress: () => {
                    const res = buyPack(pack.id);
                    if (res.ok) setToast(`${pack.name} açıldı! 🎉`);
                    else if (res.reason === 'coins') setToast('Yetersiz altın — mağazadan altın al');
                    setTimeout(() => setToast(null), 1800);
                  },
                },
              ]
            );
          }
        } else if (node.mid) {
          setToast(midOpenBase ? 'Önce önceki şehri bitir' : 'Önce Asya ve Afrika’yı bitir');
          setTimeout(() => setToast(null), 2400);
        } else {
          setToast('Önce önceki şehri bitir');
          setTimeout(() => setToast(null), 2000);
        }
      });
    });
  };

  // Bir seviye madalyonuna dokun: arı oraya uçar ve bulmacayı DOĞRUDAN açar (ayrı sayfa yok).
  const playLevel = (node, state) => {
    if (flying) return;
    if (state === 'locked') {
      setToast(`Kilitli — önce ${endlessLevel}. seviyeyi bitir`);
      setTimeout(() => setToast(null), 1700);
      return;
    }
    if (state === 'done') {
      setToast(`${node.level}. seviye tamamlandı ✓`);
      setTimeout(() => setToast(null), 1500);
      return;
    }
    setFlying(true);
    setToast(null);
    const target = { x: node.cx - BEE_SIZE / 2, y: node.cy - BEE_SIZE * 0.72 };
    const scrollX = Math.max(0, Math.min(node.cx - W / 2, contentW - W));
    scrollRef.current?.scrollTo({ x: scrollX, animated: true });
    Animated.timing(beePos, {
      toValue: target,
      duration: 780,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setFlying(false);
      navigation.navigate('Puzzle', { endless: true, endlessLevel: node.level });
    });
  };

  // Kapı kilitliyse: arı kapıya uçar, sonra Sonsuz Diyar paketini satın alma sorulur.
  const buyEndless = () => {
    if (flying) return;
    setFlying(true);
    setToast(null);
    const { cx, cy } = ENDLESS_NODE;
    const target = { x: cx - BEE_SIZE / 2, y: cy - BEE_SIZE * 0.72 };
    const scrollX = Math.max(0, Math.min(cx - W / 2, contentW - W));
    scrollRef.current?.scrollTo({ x: scrollX, animated: true });
    Animated.timing(beePos, {
      toValue: target,
      duration: 820,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      Animated.timing(beePos, {
        toValue: HOME,
        duration: 620,
        delay: 360,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setFlying(false);
        // Sonsuz, ancak oraya kadar her şey (Amerika+Avrupa) bitince alınabilir.
        if (!endlessBuyable) {
          setToast('Önce Amerika ve Avrupa’yı bitir');
          setTimeout(() => setToast(null), 2400);
          return;
        }
        Alert.alert(
          ENDLESS_PACK.name,
          `Kapıdan sonra harita boyunca uzanan sınırsız, gitgide zorlaşan seviyeler açılır.\n${ENDLESS_PACK.price} altına satın al?`,
          [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: `${ENDLESS_PACK.price} altın`,
              onPress: () => {
                const res = buyPack(ENDLESS_PACK.id);
                if (res.ok) setToast(`${ENDLESS_PACK.name} açıldı! 🎉`);
                else if (res.reason === 'coins') setToast('Yetersiz altın — mağazadan altın al');
                setTimeout(() => setToast(null), 1800);
              },
            },
          ]
        );
      });
    });
  };

  // Kapıya dokunulunca: açıksa mevcut seviyeye uç ve oyna, kilitliyse satın al.
  const onGate = () => {
    if (isEndlessOwned) {
      const cur = endlessNodes.find((n) => n.level === endlessLevel);
      if (cur) playLevel(cur, 'current');
    } else {
      buyEndless();
    }
  };

  const entranceY = entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={PALETTE.skyTop} />

      <Animated.View style={{ flex: 1, opacity: entrance, transform: [{ translateY: entranceY }] }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{ width: contentW, height: H }}
        scrollEventThrottle={16}
      >
        <View style={{ width: contentW, height: H }}>
          {/* Gökyüzü */}
          <View style={[styles.sky, { width: contentW, height: GRASS_TOP, backgroundColor: theme.sky }]} />
          <View style={[styles.skyBand, { width: contentW, top: GRASS_TOP - 46, backgroundColor: theme.skyBottom }]} />
          {/* Güneş (sağ üst köşe, başlığın dışında) + bulutlar */}
          <View style={[styles.sun, { left: 20 }]}>
            <PixelArt matrix={SUN} pixelSize={8} palette={{ Y: '#FFE58A' }} />
          </View>
          {clouds.map((c, i) => (
            <View key={`cl-${i}`} style={[styles.cloud, { left: c.x, top: c.y }]}>
              <View style={{ width: 42, height: 7, backgroundColor: PALETTE.white, opacity: 0.9, marginLeft: 8 }} />
              <View style={{ width: 60, height: 7, backgroundColor: PALETTE.white, opacity: 0.9 }} />
            </View>
          ))}
          {/* Kuşlar (uzak) */}
          {birds.map((b, i) => (
            <View key={`bd-${i}`} style={[styles.bird, { left: b.x, top: b.y }]}>
              <View style={styles.birdWing} />
              <View style={[styles.birdWing, styles.birdWingR]} />
            </View>
          ))}

          {/* Ufuk tepeleri (derinlik) — çimin arkasında kalır */}
          {hills.map((h, i) => (
            <View
              key={`hl-${i}`}
              style={{ position: 'absolute', left: h.x - h.r, top: GRASS_TOP - h.r, width: h.r * 2, height: h.r * 2, borderRadius: h.r, backgroundColor: h.c, opacity: 0.9 }}
            />
          ))}

          {/* Çim tarlası */}
          <View style={[styles.grass, { width: contentW, top: GRASS_TOP, backgroundColor: theme.grass }]} />
          <View style={[styles.grassEdge, { width: contentW, top: GRASS_TOP - 6 }]}>
            {Array.from({ length: Math.ceil(contentW / 14) }).map((_, i) => (
              <View key={i} style={{ width: 12, height: i % 3 === 0 ? 12 : i % 2 === 0 ? 5 : 8, marginHorizontal: 1, backgroundColor: theme.grass }} />
            ))}
          </View>
          <View style={[styles.grassShadow, { width: contentW, backgroundColor: theme.grassDark }]} />

          {/* Arka dekor: ağaçlar, çalılar, çiçekler (mevsime göre yaprak paleti) */}
          {decor.map((d, i) => (
            <Decor key={`d-${i}`} d={d} theme={theme} />
          ))}

          {/* Sonbahar: yere düşen kuru yapraklar */}
          {theme.fallen && <FallenLeaves colors={theme.fallen} contentW={contentW} groundTop={GRASS_TOP} />}

          {/* Yol */}
          <PathDots />

          {/* Dal başlarında paket tabelaları */}
          {PACKS.map((pack) => {
            const first = packNodes.find((n) => n.packId === pack.id);
            if (!first) return null;
            return <PackGate key={pack.id} pack={pack} cx={first.cx} cy={first.cy} owned={ownedPacks.includes(pack.id)} />;
          })}

          {/* Şehir çiçekleri (hepsi görünür; kilitliler gri + 🔒) */}
          {NODES.map((node) => (
            <CityFlower key={node.city.id} node={node} onPress={flyTo} open={isOpen(node)} />
          ))}

          {/* Haritanın sonu: Sonsuz Diyar kapısı + seviye patikası */}
          {isEndlessOwned && <EndlessPath nodes={endlessNodes} />}
          <EndlessGate owned={isEndlessOwned} onPress={onGate} />
          {endlessNodes.map((n) => (
            <LevelNode
              key={n.level}
              node={n}
              state={n.level < endlessLevel ? 'done' : n.level === endlessLevel ? 'current' : 'locked'}
              pulse={levelPulse}
              onPress={playLevel}
            />
          ))}
          {/* Yol silikleşerek ∞'a gider — harita sonsuz */}
          {isEndlessOwned && <EndlessTail last={endlessNodes[endlessNodes.length - 1]} />}

          {/* Uçan arı (maskot) — dünya koordinatında */}
          <Animated.Image
            source={BEE}
            resizeMode="contain"
            pointerEvents="none"
            style={[styles.bee, { transform: [{ translateX: beePos.x }, { translateY: Animated.add(beePos.y, bob) }] }]}
          />

          {/* Pixi'nin yanında beliren karşılama balonu (arıyı takip eder) */}
          <PixiWelcome visible={!!welcomeMode} mode={welcomeMode} onClose={closeWelcome} anim={beePos} beeSize={BEE_SIZE} />
        </View>
      </ScrollView>

      {/* Sağ üst: Seyahat Defteri (hatıra koleksiyonu) + mağaza + çıkış düğmeleri */}
      <Pressable onPress={() => navigation.navigate('Journal')} style={styles.journalBtn} hitSlop={8}>
        <PixelArt matrix={JOURNAL_ICON} pixelSize={3} palette={JOURNAL_PAL} />
        {milestoneReady && <View style={styles.dailyDot} />}
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Store')} style={styles.storeBtn} hitSlop={8}>
        <PixelArt matrix={STORE_ICON} pixelSize={3} palette={STORE_PAL} />
      </Pressable>
      <Pressable onPress={openAccountMenu} style={styles.accountBtn} hitSlop={8}>
        <PixelArt matrix={LOGOUT_ICON} pixelSize={2} palette={LOGOUT_PAL} />
      </Pressable>

      {/* Zarif alt yönlendirme (emoji yok) */}
      {!toast && (
        <View style={styles.bottomHint} pointerEvents="none">
          <Text style={styles.bottomHintText}>‹ kaydır   ·   çiçeğe dokun ›</Text>
        </View>
      )}

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
      </Animated.View>
    </View>
  );
}

const SUN = [
  ['.', '.', 'Y', 'Y', 'Y', '.', '.'],
  ['.', 'Y', 'Y', 'Y', 'Y', 'Y', '.'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['.', 'Y', 'Y', 'Y', 'Y', 'Y', '.'],
  ['.', '.', 'Y', 'Y', 'Y', '.', '.'],
];
// Bulutlar — el yerleşimli çekirdek + haritanın kalanı boyunca (sonsuz patika dahil) prosedürel.
const BASE_CLOUDS = [
  { x: 540, y: 70 }, { x: 250, y: 158 }, { x: 420, y: 108 }, { x: 760, y: 64 },
  { x: 1050, y: 116 }, { x: 1360, y: 78 }, { x: 1700, y: 96 }, { x: 2050, y: 60 },
  { x: 2400, y: 110 }, { x: 2750, y: 72 },
];
const buildClouds = (width = CONTENT_W) => {
  const arr = BASE_CLOUDS.filter((c) => c.x < width);
  let x = 2980, i = 0;
  while (x < width - 40) {
    arr.push({ x, y: 58 + ((i * 47) % 92) });
    x += 300 + ((i * 83) % 170);
    i++;
  }
  return arr;
};
// Ufuk tepeleri — çim çizgisi boyunca puslu yeşil kubbeler (derinlik)
const buildHills = (width = CONTENT_W) => {
  const arr = [];
  let x = 20, i = 0;
  while (x < width + 40) {
    const r = 40 + ((i * 29) % 34); // 40..73 — yumuşak, alçak kubbeler
    arr.push({ x, r, c: i % 2 ? '#8FD3A2' : '#7FCB94' });
    x += r * 1.6 + 30;
    i++;
  }
  return arr;
};
// Uzak kuşlar (küçük "v" siluetleri)
const buildBirds = (width = CONTENT_W) => {
  const arr = [];
  let x = 120, i = 0;
  while (x < width) {
    arr.push({ x, y: 56 + ((i * 53) % 70) });
    if (i % 3 !== 2) arr.push({ x: x + 26, y: 66 + ((i * 37) % 60) }); // ikişerli sürü
    x += 260 + ((i * 71) % 180);
    i++;
  }
  return arr;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop },

  // --- Dünya arka planı ---
  sky: { position: 'absolute', left: 0, top: 0, backgroundColor: PALETTE.skyTop },
  skyBand: { position: 'absolute', left: 0, height: 46, backgroundColor: PALETTE.skyBottom },
  sun: { position: 'absolute', top: 46 },
  cloud: { position: 'absolute' },
  bird: { position: 'absolute', flexDirection: 'row', width: 18, height: 6 },
  birdWing: { width: 9, height: 3, backgroundColor: 'rgba(44,54,74,0.5)', transform: [{ rotate: '-22deg' }] },
  birdWingR: { transform: [{ rotate: '22deg' }], marginLeft: -1 },
  grass: { position: 'absolute', left: 0, bottom: 0, backgroundColor: PALETTE.grassLight },
  grassEdge: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'flex-end', overflow: 'hidden' },
  grassShadow: { position: 'absolute', left: 0, bottom: 0, height: 46, backgroundColor: PALETTE.grassDark, opacity: 0.4 },
  decor: { position: 'absolute' },
  pathDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8D6A6',
    borderWidth: 2,
    borderColor: '#C9AE73',
  },

  // --- Sabit başlık (kompakt) ---
  header: { position: 'absolute', top: 56, left: 0, right: 0, alignItems: 'center' },
  titleSignShadow: { backgroundColor: PALETTE.outline, padding: 3 },
  titleSign: {
    backgroundColor: PALETTE.card,
    borderWidth: 3,
    borderColor: PALETTE.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleText: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 13 },

  // --- Sağ üst hesap düğmesi ---
  accountBtn: { position: 'absolute', top: 52, right: 14, width: 35, height: 35, backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, alignItems: 'center', justifyContent: 'center' },
  storeBtn: { position: 'absolute', top: 52, right: 57, width: 35, height: 35, backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, alignItems: 'center', justifyContent: 'center' },
  endlessNode: { position: 'absolute', alignItems: 'center' },
  portalGlow: { position: 'absolute', top: 2, width: 116, height: 116, borderRadius: 58, backgroundColor: '#7A2CD0', opacity: 0.22 },
  endlessSign: { marginTop: 8, borderColor: '#4A1A80' },

  // Candy Crush tarzı seviye çiçekleri
  lvlWrap: { position: 'absolute', alignItems: 'center' },
  lvlRing: { position: 'absolute', top: -4, left: (LVL_WRAP - (PETAL_E + 10)) / 2, width: PETAL_E + 10, height: PETAL_E + 10, borderRadius: (PETAL_E + 10) / 2, borderWidth: 4 },
  lvlCheck: { position: 'absolute', right: -2, top: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#2E7D32', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  lvlCheckTxt: { color: '#FFFFFF', fontSize: 11, fontFamily: FONT.bold, lineHeight: 13 },
  lvlSign: { marginTop: 4, minWidth: 30, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 0 },
  lvlSignCurrent: { borderWidth: 3, paddingVertical: 4 },
  lvlSignLocked: { backgroundColor: PALETTE.card, borderColor: PALETTE.cardBorder },
  lvlSignTxt: { fontFamily: FONT.arcade, fontSize: 12, color: '#FFFFFF' },
  lvlSignTxtLocked: { color: PALETTE.muted },
  journalBtn: { position: 'absolute', top: 52, right: 100, width: 35, height: 35, backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, alignItems: 'center', justifyContent: 'center' },
  journalBadge: { position: 'absolute', bottom: -9, alignSelf: 'center', backgroundColor: '#1C3A6A', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1.5, borderColor: PALETTE.gold },
  journalBadgeText: { fontSize: 10, color: '#CFE0FF', fontFamily: FONT.bold },
  dailyDot: { position: 'absolute', top: -5, right: -5, width: 13, height: 13, borderRadius: 7, backgroundColor: '#FF3B30', borderWidth: 2, borderColor: '#FFFFFF' },

  // --- Zarif alt yönlendirme ---
  bottomHint: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomHintText: {
    color: PALETTE.outline,
    fontFamily: FONT.semi,
    fontSize: 14,
    letterSpacing: 1,
    opacity: 0.55,
  },

  // --- Çiçek + tabela ---
  flowerWrap: { position: 'absolute', alignItems: 'center' },
  petalShadow: { shadowColor: '#000', shadowOffset: { width: 2, height: 3 }, shadowOpacity: 0.28, shadowRadius: 0 },
  lockBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -13,
    marginLeft: -13,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,24,32,0.72)',
    borderWidth: 2,
    borderColor: PALETTE.cream,
  },
  lockIcon: { fontSize: 13 },

  stem: { width: 8, height: 26, backgroundColor: PALETTE.grassDark, borderLeftWidth: 2, borderRightWidth: 2, borderColor: PALETTE.outline, marginTop: -3 },
  stemLeaf: { position: 'absolute', right: -14, top: 6 },

  sign: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
  },
  signOpen: { backgroundColor: PALETTE.gold, borderColor: PALETTE.outline },
  signLocked: { backgroundColor: PALETTE.card, borderColor: PALETTE.cardBorder },
  signFlag: { fontSize: 13, marginRight: 5 },
  signText: { fontFamily: FONT.bold, fontSize: 15, letterSpacing: 0.5 },
  signTextOpen: { color: PALETTE.outline },
  signTextLocked: { color: PALETTE.muted },

  // Paket tabelası (dal başı)
  packGate: { position: 'absolute', alignItems: 'center' },
  packGateInner: { borderWidth: 3, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 140 },
  packGateOpen: { backgroundColor: PALETTE.gold, borderColor: PALETTE.outline },
  packGateLocked: { backgroundColor: PALETTE.outline, borderColor: PALETTE.gold },
  packGateText: { fontFamily: FONT.bold, fontSize: 13, letterSpacing: 0.5 },
  packGateTextOpen: { color: PALETTE.outline },
  packGateTextLocked: { color: PALETTE.gold },

  bee: { position: 'absolute', top: 0, left: 0, width: BEE_SIZE, height: BEE_SIZE, zIndex: 20 },

  toast: {
    position: 'absolute',
    bottom: 66,
    left: 28,
    right: 28,
    backgroundColor: PALETTE.outline,
    borderWidth: 2,
    borderColor: PALETTE.gold,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toastText: { color: PALETTE.cream, fontFamily: FONT.semi, fontSize: 14, textAlign: 'center' },
});
