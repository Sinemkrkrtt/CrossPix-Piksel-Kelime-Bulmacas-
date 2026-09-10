// src/screens/PixelPuzzleScreen.js
// Veri güdümlü piksel-boyama bulmacası. Şekil baştan soluk görünür; kelime
// çözüldükçe o kısım gerçek rengine kavuşur, hepsi bitince kutlar.
// Giriş: sistem klavyesi YOK — kendi piksel klavyemiz (Türkçe) + harf kutucukları.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Dimensions, Modal, ScrollView } from 'react-native';
import { PALETTE, FONT, mix, GardenBackground, PixelArt, DETAILED_FLOWER, flowerPalette, IC_BULB, IC_MAGNIFIER, IC_WAND, IC_GIFT, jokerIconPalette } from '../pixel/PixelKit';
import { getCity } from '../data/cities';
import { getPuzzle } from '../data/puzzles';
import { getEndlessPuzzle } from '../data/endless';
import { getSouvenir } from '../data/souvenirs';
import { useEconomy } from '../economy/EconomyContext';
import { useAuth } from '../auth/AuthContext';
import { usePixelAlert } from '../pixel/PixelAlert';
import SouvenirCelebration from './components/SouvenirCelebration';

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const FADE = '#EFEEE8';
const unsolvedColor = (c) => mix(c, FADE, 0.92);

// İpucu metninden "(N Harf)" ekini temizle — kutucuklar zaten sayıyı gösteriyor.
const cleanClue = (t) => (t || '').replace(/\s*\(\s*\d+\s*[Hh]arf\s*\)\s*$/u, '').trim();

const textOn = (hex) => {
  const s = hex.replace('#', '');
  const r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? PALETTE.outline : PALETTE.cream;
};

const SPARKS = [
  { left: '12%', top: '10%' }, { left: '82%', top: '16%' }, { left: '50%', top: '2%' },
  { left: '20%', top: '78%' }, { left: '76%', top: '82%' }, { left: '46%', top: '92%' },
];

// Türkçe klavye düzeni (Q). ⌫ = sil, ⏎ = çöz.
const KB_ROWS = [
  ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
  ['⌫', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', '⏎'],
];

function MiniFlower({ petal, size = 5 }) {
  return <PixelArt matrix={DETAILED_FLOWER} pixelSize={size} palette={flowerPalette(petal, false)} />;
}

// --- Joker menüsü ---
const IPAL = jokerIconPalette();
const COIN = ['.ggg.', 'gYYYg', 'gYWYg', 'gYYYg', '.ggg.'];
const COIN_PAL = { g: '#B8901A', Y: PALETTE.gold, W: PALETTE.cream };

function JokerRow({ icon, name, desc, count, disabled, onPress }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.jokerRow, disabled && { opacity: 0.4 }, pressed && !disabled && { backgroundColor: PALETTE.cardBorder }]}>
      <View style={styles.jokerRowIcon}><PixelArt matrix={icon} pixelSize={4} palette={IPAL} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.jokerRowName}>{name}</Text>
        <Text style={styles.jokerRowDesc}>{desc}</Text>
      </View>
      <View style={[styles.jokerRowCount, count <= 0 && styles.jokerRowCountEmpty]}>
        <Text style={styles.jokerRowCountText}>{count}</Text>
      </View>
    </Pressable>
  );
}

export default function PixelPuzzleScreen({ navigation, route }) {
  const endless = route?.params?.endless || false;    // → sonsuz mod
  const endlessLevel = route?.params?.endlessLevel || 1;
  const cityId = route?.params?.cityId || 'istanbul';
  const puzzleId = route?.params?.puzzleId || 1;
  const city = getCity(cityId) || getCity('istanbul');
  const puzzle = useMemo(
    () => (endless ? getEndlessPuzzle(endlessLevel) : getPuzzle(cityId, puzzleId)),
    [endless, endlessLevel, cityId, puzzleId]
  );
  const petal = endless
    ? (puzzle.grid.flat().find((c) => c?.color)?.color || PALETTE.gold)
    : (city.petal || PALETTE.gold);
  const GRID = puzzle.grid;
  const CLUES = puzzle.clues;
  const totalClues = Object.keys(CLUES).length;
  const shape = puzzle.shape;

  const cols = GRID[0].length;
  const rows = GRID.length;
  const CELL = Math.min(
    Math.floor((Math.min(W, 430) - 66) / cols),
    Math.floor((SCREEN_H * 0.36) / rows)
  );
  const GAP = 1;
  const LETTER = Math.round(CELL * 0.74);
  const SHAPE_CELL = shape
    ? Math.min(Math.floor((Math.min(W, 430) - 96) / shape.cols), Math.floor((SCREEN_H * 0.3) / shape.art.length))
    : 0;


  const { coins, jokers, useJoker, rewardPuzzle, solveEndless, rewarded, puzzleProgress, savePuzzleProgress } = useEconomy();
  const { user } = useAuth();
  const showAlert = usePixelAlert();
  const progressKey = `${cityId}:${puzzleId}`;

  // Misafir modu: oyunu görebilir ama OYNAYAMAZ. Kelime yazma/çözme/joker'e gelince
  // giriş/kayıt iste (App Store: indirince önce oyunu görsün, oynamak için üye olsun).
  const requireAuth = () => {
    if (user) return true;
    showAlert(
      'Oynamak için giriş yap',
      'Kelimeleri çözmek için hesabına giriş yap ya da ücretsiz kayıt ol.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş / Kayıt', onPress: () => navigation.navigate('Login') },
      ]
    );
    return false;
  };
  // Izgaranın GERÇEK boyutu (onLayout ile ölçülür) — zoom-ScrollView tam ona göre
  // boyutlanır ki çerçeve ızgarayı sımsıkı sarsın (fazladan boşluk olmasın).
  const [boardBox, setBoardBox] = useState(null);

  // Bu bölümde daha önce çözülmüş kelimeler (bulmacadan çıkıp girince yerinde kalsın).
  // Bölüm %100 bittiyse (rewarded) hepsi açık; değilse kaydedilen kısmi ilerleme.
  const initialSolved = () => {
    if (endless) return [];
    if (rewarded[progressKey]) return Object.keys(CLUES).map(Number);
    const saved = puzzleProgress[progressKey];
    return Array.isArray(saved) ? saved.filter((id) => CLUES[id]) : [];
  };

  const [activeClueId, setActiveClueId] = useState(null);
  // Her kutu için harf ('' = boş). Kesişen çözülmüş kelimelerden gelen harfler
  // otomatik dolar; kullanıcı yalnızca boş kutulara yazar.
  const [slots, setSlots] = useState([]);
  const [solvedClues, setSolvedClues] = useState(initialSolved);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(0);
  const [jokerMenu, setJokerMenu] = useState(false);
  const [souvenir, setSouvenir] = useState(null); // şehir %100 bitince kutlama hatırası
  const [earned, setEarned] = useState(0); // bu oturumda bu bölümden kazanılan altın

  const cellAnims = useMemo(() => {
    const m = {};
    GRID.forEach((row, r) => row.forEach((cell, c) => { if (cell?.value) m[`${r}-${c}`] = new Animated.Value(0); }));
    return m;
  }, [puzzle]);
  const animatedCells = useRef(new Set()).current;
  const boardScale = useRef(new Animated.Value(1)).current;
  const shapePulse = useRef(new Animated.Value(1)).current;
  const sparks = useRef(SPARKS.map(() => new Animated.Value(0))).current;

  // Her ipucunun hücreleri (her kutunun hangi ipuçlarına ait olduğu) — kapsama kontrolü için.
  const clueCells = useMemo(() => {
    const m = {};
    GRID.forEach((row) => row.forEach((cell) => {
      if (cell?.value && Array.isArray(cell.clueIds)) {
        cell.clueIds.forEach((id) => { (m[id] = m[id] || []).push(cell.clueIds); });
      }
    }));
    return m;
  }, [puzzle]);

  // Çözülmüş listeyi genişlet: bütün harfleri kesişen BAŞKA çözülmüş kelimelerden
  // açığa çıkan kelimeleri de otomatik "çözüldü" say (zincirleme). Böylece kullanıcı
  // kendiliğinden dolan bir kelimeyi tekrar aramak zorunda kalmaz.
  const expandSolved = (list) => {
    const solved = new Set(list);
    let changed = true;
    while (changed) {
      changed = false;
      for (const idStr of Object.keys(clueCells)) {
        const id = Number(idStr);
        if (solved.has(id)) continue;
        const cells = clueCells[id];
        const covered = cells.length > 0 && cells.every((cids) => cids.some((cid) => cid !== id && solved.has(cid)));
        if (covered) { solved.add(id); changed = true; }
      }
    }
    return [...solved];
  };

  // Mount: daha önce çözülmüş kelimelerin hücrelerini (animasyonsuz) hemen göster.
  useLayoutEffect(() => {
    if (!solvedClues.length) return;
    GRID.forEach((row, r) => row.forEach((cell, c) => {
      const k = `${r}-${c}`;
      if (cell?.value && cellAnims[k] && cell.clueIds?.some((id) => solvedClues.includes(id))) {
        cellAnims[k].setValue(1);
        animatedCells.add(k);
      }
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // solvedClues değişince kısmi ilerlemeyi kaydet (ilk mount hariç). Sonsuz modda kaydetme.
  const didSaveMount = useRef(false);
  useEffect(() => {
    if (endless) return;
    if (!didSaveMount.current) { didSaveMount.current = true; return; }
    savePuzzleProgress(cityId, puzzleId, solvedClues);
  }, [solvedClues]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aktif kelimenin sıralı hücreleri (yön: soldan sağa / yukarıdan aşağı).
  const activeCells = useMemo(() => {
    if (!activeClueId) return [];
    const cells = [];
    GRID.forEach((row, r) => row.forEach((cell, c) => { if (cell?.clueIds?.includes(activeClueId) && cell.value) cells.push({ r, c, v: cell.value, cell }); }));
    const dir = CLUES[activeClueId]?.dir;
    cells.sort((a, b) => (dir === 'D' ? a.r - b.r : a.c - b.c));
    return cells;
  }, [activeClueId]);

  // Aktif ipucunun hedef cevabı (kutucuk sayısı + kontrol için).
  const activeAnswer = useMemo(() => activeCells.map((x) => x.v).join(''), [activeCells]);

  // Hangi kutular kesişmeden zaten biliniyor? (Bu kutu, çözülmüş BAŞKA bir
  // kelimeye de ait ise harfi bellidir → otomatik dolar ve kilitli gösterilir.)
  const locked = useMemo(
    () => activeCells.map((x) => !!x.cell.clueIds?.some((id) => id !== activeClueId && solvedClues.includes(id))),
    [activeCells, solvedClues, activeClueId]
  );

  const revealSolvedCells = (solvedList) => {
    GRID.forEach((row, r) =>
      row.forEach((cell, c) => {
        const key = `${r}-${c}`;
        if (!cell?.value || animatedCells.has(key)) return;
        if (cell.clueIds?.some((id) => solvedList.includes(id))) {
          animatedCells.add(key);
          Animated.timing(cellAnims[key], { toValue: 1, duration: 460, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
        }
      })
    );
  };

  const celebrate = () => {
    setDone(true);
    // Sonsuz mod → seviye ilerlet; şehir → bölüm ödülü.
    const got = endless
      ? solveEndless(endlessLevel).got
      : rewardPuzzle(cityId, puzzleId);
    if (got > 0) setEarned(got);
    // Bu çözüm şehri %100 bitiriyor mu? → hatıra kutlaması (yalnızca şehir modunda, ilk kez).
    if (!endless && !rewarded[`${cityId}:${puzzleId}`]) {
      const nowComplete = (city.puzzles || []).every((p) => p.id === puzzleId || rewarded[`${cityId}:${p.id}`]);
      if (nowComplete) setTimeout(() => setSouvenir(getSouvenir(cityId)), 900);
    }
    Animated.sequence([
      Animated.spring(boardScale, { toValue: 1.12, friction: 3, useNativeDriver: true }),
      Animated.spring(boardScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(shapePulse, { toValue: 1.05, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shapePulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    sparks.forEach((s, i) => {
      s.setValue(0);
      Animated.loop(Animated.timing(s, { toValue: 1, duration: 1600, delay: i * 160, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
    });
  };

  const handleCellPress = (cell) => {
    if (!cell.value || done) return;
    const available = cell.clueIds.filter((id) => !solvedClues.includes(id));
    if (available.length === 0) return;
    if (activeClueId && available.includes(activeClueId)) {
      const idx = available.indexOf(activeClueId);
      setActiveClueId(available[(idx + 1) % available.length]);
    } else {
      setActiveClueId(available[0]);
    }
    // slots, aktif kelime değişince efektle (kesişme harfleriyle) sıfırlanır.
  };

  const submit = (finalGuess) => {
    if (!activeClueId) return;
    if (finalGuess === activeAnswer) {
      const next = expandSolved([...solvedClues, activeClueId]);
      setSolvedClues(next);
      setActiveClueId(null);
      revealSolvedCells(next);
      if (next.length === totalClues) setTimeout(celebrate, 520);
    } else {
      setShake((s) => s + 1);
      setTimeout(() => setShake((s) => (s > 0 ? s - 1 : 0)), 380);
    }
  };

  // Aktif kelime seçilince kutuları hazırla: kesişen çözülmüş kelimelerden gelen
  // harfleri OTOMATİK doldur (kilitli), gerisini boş bırak. Tüm kutular zaten
  // kesişmelerden biliniyorsa kelimeyi kendiliğinden çöz.
  useLayoutEffect(() => {
    if (!activeClueId) { setSlots([]); return; }
    const init = activeCells.map((x, i) => (locked[i] ? x.v : ''));
    setSlots(init);
    if (init.length && !init.includes('')) setTimeout(() => submit(init.join('')), 220);
  }, [activeClueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = (letter) => {
    if (!requireAuth()) return; // misafir → giriş/kayıt iste
    if (!activeClueId) return;
    const i = slots.findIndex((s) => s === '');
    if (i === -1) return; // boş kutu yok
    const next = [...slots];
    next[i] = letter;
    setSlots(next);
    if (!next.includes('')) setTimeout(() => submit(next.join('')), 120);
  };

  // Geri sil: kilitli olmayan en son dolu kutuyu boşaltır (kesişme harfleri silinmez).
  const handleBackspace = () =>
    setSlots((arr) => {
      const nx = [...arr];
      for (let i = nx.length - 1; i >= 0; i--) {
        if (!locked[i] && nx[i] !== '') { nx[i] = ''; break; }
      }
      return nx;
    });

  // Bir kelimeyi tamamen çözer (joker yardımcısı).
  const solveClue = (id) => {
    const next = expandSolved([...solvedClues, id]);
    setSolvedClues(next);
    if (activeClueId === id) setActiveClueId(null);
    revealSolvedCells(next);
    if (next.length === totalClues) setTimeout(celebrate, 520);
  };

  const cellUsable = !!activeClueId && jokers.cell > 0 && slots.includes('') && !done;
  const wordUsable = !!activeClueId && jokers.word > 0 && !done;
  const freeUsable = jokers.free > 0 && !done && Object.keys(CLUES).some((id) => !solvedClues.includes(Number(id)));

  // Joker 1 — Tek Harf: aktif kelimede ilk boş kutuyu doğru harfle açar.
  const jokerCell = () => {
    if (!requireAuth()) return;
    if (!cellUsable) return;
    setJokerMenu(false);
    if (!useJoker('cell')) return;
    const i = slots.findIndex((s) => s === '');
    if (i === -1) return;
    const next = [...slots];
    next[i] = activeAnswer[i];
    setSlots(next);
    if (!next.includes('')) setTimeout(() => submit(next.join('')), 140);
  };

  // Joker 2 — Tüm Kelime: aktif (seçili) kelimeyi tamamen açar.
  const jokerWord = () => {
    if (!requireAuth()) return;
    if (!wordUsable) return;
    setJokerMenu(false);
    if (!useJoker('word')) return;
    solveClue(activeClueId);
  };

  // Joker 3 — Bedava Kelime: rastgele çözülmemiş bir kelimeyi çözer.
  const jokerFree = () => {
    if (!requireAuth()) return;
    if (!freeUsable) return;
    setJokerMenu(false);
    const unsolved = Object.keys(CLUES).map(Number).filter((id) => !solvedClues.includes(id));
    if (!useJoker('free')) return;
    solveClue(unsolved[Math.floor(Math.random() * unsolved.length)]);
  };

  const totalJokers = jokers.cell + jokers.word + jokers.free;

  const progress = totalClues ? solvedClues.length / totalClues : 0;

  // Piksel ızgarası (oynanış görünümü) — ayrı değişken, çünkü hem ölçüm hem zoom
  // aşamasında AYNI içerik kullanılır.
  const gridBoard = (
    <View>
      {GRID.map((row, r) => (
        <View key={`r-${r}`} style={styles.row}>
          {row.map((cell, c) => {
            if (!cell) return <View key={`c-${c}`} style={{ width: CELL, height: CELL, margin: GAP }} />;
            if (cell.art) return <View key={`c-${c}`} style={{ width: CELL, height: CELL, margin: GAP, backgroundColor: cell.color }} />;
            if (!cell.value) return <View key={`c-${c}`} style={{ width: CELL, height: CELL, margin: GAP }} />;
            const key = `${r}-${c}`;
            const anim = cellAnims[key];
            const active = cell.clueIds?.includes(activeClueId);
            const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [unsolvedColor(cell.color), cell.color] });
            const scaleC = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.16, 1] });
            return (
              <Pressable key={`c-${c}`} onPress={() => handleCellPress(cell)}>
                <Animated.View
                  style={[
                    styles.cell,
                    { width: CELL, height: CELL, margin: GAP, backgroundColor: bg, transform: [{ scale: scaleC }], borderColor: active ? PALETTE.gold : 'rgba(20,24,32,0.5)', borderWidth: active ? 3 : 1 },
                    active && styles.cellActive,
                  ]}
                >
                  <Animated.Text style={{ fontFamily: FONT.bold, fontSize: LETTER, color: textOn(cell.color), opacity: anim, width: '100%', textAlign: 'center' }}>
                    {cell.value}
                  </Animated.Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <GardenBackground skyRatio={0.44} />

      {/* Üst bar — çift çerçeveli plaka */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.titlePlaque}>
          <View style={styles.titleShadow}>
            <View style={styles.titleInner}>
              <Text style={styles.titleText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {puzzle.name.toUpperCase()}
              </Text>
              <View style={[styles.titleUnderline, { backgroundColor: petal }]} />
            </View>
          </View>
        </View>

        {/* Sağ üst: joker logosu */}
        <Pressable onPress={() => setJokerMenu((v) => !v)} style={styles.iconBtn} hitSlop={6}>
          <PixelArt matrix={IC_BULB} pixelSize={4} palette={IPAL} />
          <View style={styles.jokerTotal}><Text style={styles.jokerTotalText}>{totalJokers}</Text></View>
        </Pressable>
      </View>

      {/* İlerleme */}
      <View style={styles.progressWrap}>
        <View style={styles.progressFrameShadow}>
          <View style={styles.progressFrame}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(progress * 100, progress > 0 ? 6 : 0)}%` }]}>
                <View style={styles.progressGloss} />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{solvedClues.length}/{totalClues}</Text>
        </View>
      </View>

      {/* Tahta — çerçeve SABİT kalır; parmakla yakınlaştırınca yalnızca içindeki
          pikseller büyür (zoom çerçeve içinde, klavyeye taşmaz). */}
      <View style={styles.boardArea}>
        <Animated.View style={[styles.boardShadow, { transform: [{ scale: boardScale }] }]}>
          <View style={styles.boardFrame}>
            {done && shape ? (
              // Kutlama: bitmiş şekil (zoom yok, kendi nabız animasyonu var).
              <Animated.View style={{ transform: [{ scale: shapePulse }] }}>
                {shape.art.map((rowStr, sr) => (
                  <View key={`sr-${sr}`} style={styles.row}>
                    {Array.from({ length: shape.cols }).map((_, sc) => {
                      const ch = rowStr[sc] || '.';
                      return <View key={`sc-${sc}`} style={{ width: SHAPE_CELL, height: SHAPE_CELL, backgroundColor: ch === '.' ? 'transparent' : shape.colors[ch] }} />;
                    })}
                  </View>
                ))}
              </Animated.View>
            ) : boardBox ? (
              // 2. aşama: ızgara ölçüldü → tam o boyutta, kırpan bir kap; içinde zoom-ScrollView.
              // Çerçeve SABİT kalır, yalnızca pikseller büyür; zoom kap içinde kırpılır.
              <View style={{ width: boardBox.w, height: boardBox.h, overflow: 'hidden' }}>
                <ScrollView
                  style={{ flex: 1 }}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  bouncesZoom
                  centerContent
                  pinchGestureEnabled
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                >
                  {gridBoard}
                </ScrollView>
              </View>
            ) : (
              // 1. aşama: ızgarayı doğrudan çiz + gerçek boyutunu ölç.
              <View onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setBoardBox({ w: width, h: height });
              }}>
                {gridBoard}
              </View>
            )}

            {done &&
              sparks.map((s, i) => (
                <Animated.Text
                  key={`spark-${i}`}
                  style={[styles.spark, SPARKS[i], {
                    opacity: s.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
                    transform: [
                      { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) },
                      { scale: s.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.6] }) },
                    ],
                  }]}
                >
                  ✦
                </Animated.Text>
              ))}
          </View>
        </Animated.View>
      </View>

      {/* Alt panel */}
      <View style={styles.panelShadow}>
        <View style={styles.panel}>
          {done ? (
            <View style={styles.donePanel}>
              <View style={styles.doneFlowers}>
                <MiniFlower petal={petal} size={4} />
                <View style={{ width: 10 }} />
                <MiniFlower petal={PALETTE.gold} size={5} />
                <View style={{ width: 10 }} />
                <MiniFlower petal={petal} size={4} />
              </View>
              <Text style={styles.doneTitle}>{endless ? `SEVİYE ${endlessLevel} ✓` : 'TAMAMLANDI'}</Text>
              <Text style={styles.doneSub}>{endless ? 'Bir sonraki seviye seni bekliyor!' : `${puzzle.name} tamamen renklendi!`}</Text>
              {earned > 0 && (
                <View style={styles.earnBadge}>
                  <PixelArt matrix={COIN} pixelSize={4} palette={COIN_PAL} />
                  <Text style={styles.earnText}>+{earned} ALTIN</Text>
                </View>
              )}
              {endless ? (
                <>
                  <Pressable style={styles.primaryBtnShadow} onPress={() => navigation.replace('Puzzle', { endless: true, endlessLevel: endlessLevel + 1 })}>
                    <View style={styles.primaryBtn}><Text style={styles.primaryBtnText}>SIRADAKİ SEVİYE →</Text></View>
                  </Pressable>
                  <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginTop: 10 }}>
                    <Text style={styles.exitLink}>Çık</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.primaryBtnShadow} onPress={() => navigation.goBack()}>
                  <View style={styles.primaryBtn}><Text style={styles.primaryBtnText}>ŞEHRE DÖN</Text></View>
                </Pressable>
              )}
            </View>
          ) : activeClueId ? (
            <View style={[styles.activePanel, shake > 0 && styles.panelError]}>
              <View style={styles.clueBadge}>
                <View style={styles.dirDot} />
                <Text style={styles.clueBadgeText}>{CLUES[activeClueId].dir === 'D' ? 'YUKARIDAN AŞAĞI' : 'SOLDAN SAĞA'}</Text>
              </View>
              <Text style={styles.clueText}>{cleanClue(CLUES[activeClueId].text)}</Text>

              {/* Harf kutucukları (yazılan cevap) — imleç ilk boş kutuda */}
              <View style={styles.tileRow}>
                {slots.map((ch, i) => {
                  const isCursor = i === slots.findIndex((s) => s === '');
                  return (
                    <View
                      key={i}
                      style={[
                        styles.tile,
                        isCursor && styles.tileCursor,
                        ch && styles.tileFilled,
                        locked[i] && styles.tileLocked,
                      ]}
                    >
                      <Text style={[styles.tileText, locked[i] && styles.tileTextLocked]}>{ch || ''}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Piksel klavye */}
              <View style={styles.keyboard}>
                {KB_ROWS.map((krow, ri) => (
                  <View key={ri} style={styles.keyRow}>
                    {krow.map((k) => {
                      if (k === '⌫') return <Key key={k} label="SİL" flex={1.5} onPress={handleBackspace} />;
                      if (k === '⏎') return <Key key={k} label="ÇÖZ" flex={1.5} gold onPress={() => { if (requireAuth()) submit(slots.join('')); }} />;
                      return <Key key={k} label={k} onPress={() => handleKey(k)} />;
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.idlePanel}>
              <MiniFlower petal={petal} size={5} />
              <Text style={styles.idleText}>Bir kareye dokun — soldan sağa ve yukarıdan aşağı ipuçları açılsın.</Text>
            </View>
          )}
        </View>
      </View>

      {/* Joker menüsü — Modal ile her şeyin üstünde, sağ üstte açılır */}
      <Modal visible={jokerMenu} transparent animationType="fade" onRequestClose={() => setJokerMenu(false)}>
        <Pressable style={styles.jokerBackdrop} onPress={() => setJokerMenu(false)}>
          <View style={styles.jokerMenuShadow}>
            <Pressable style={styles.jokerMenu} onPress={() => {}}>
              <View style={styles.jokerMenuHead}>
                <Text style={styles.jokerMenuTitle}>JOKERLER</Text>
                <View style={styles.jokerCoin}>
                  <PixelArt matrix={COIN} pixelSize={3} palette={COIN_PAL} />
                  <Text style={styles.jokerCoinText}>{coins}</Text>
                </View>
              </View>
              {!activeClueId && <Text style={styles.jokerMenuHint}>Tek harf / kelime için önce bir kelime seç.</Text>}
              <JokerRow icon={IC_MAGNIFIER} name="TEK HARF" desc="Seçili kutuyu açar" count={jokers.cell} disabled={!cellUsable} onPress={jokerCell} />
              <JokerRow icon={IC_WAND} name="KELİME" desc="Seçili kelimeyi çözer" count={jokers.word} disabled={!wordUsable} onPress={jokerWord} />
              <JokerRow icon={IC_GIFT} name="BEDAVA" desc="Rastgele kelime çözer" count={jokers.free} disabled={!freeUsable} onPress={jokerFree} />
              <Pressable onPress={() => { setJokerMenu(false); navigation.navigate('Store'); }} style={styles.jokerStoreRow}>
                <Text style={styles.jokerStorePlus}>+</Text>
                <Text style={styles.jokerStoreText}>Mağazadan joker al</Text>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Şehir %100 bitince: hatıra damgası kutlaması */}
      {souvenir && (
        <SouvenirCelebration
          souvenir={souvenir}
          onClose={() => setSouvenir(null)}
          onJournal={() => { setSouvenir(null); navigation.navigate('Journal'); }}
        />
      )}
    </View>
  );
}

function Key({ label, flex = 1, gold, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.keyWrap, { flex }, pressed && { opacity: 0.6, transform: [{ translateY: 1 }] }]}>
      <View style={[styles.key, gold && styles.keyGold]}>
        <Text style={[styles.keyText, gold && styles.keyTextGold]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop },

  topBar: { marginTop: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 20, elevation: 20 },
  backBtn: { width: 48, height: 48, backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, alignItems: 'center', justifyContent: 'center' },
  backBtnGhost: { width: 48, height: 48 },
  backText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 40, lineHeight: 42, marginTop: -8 },
  titlePlaque: { flex: 1, marginHorizontal: 12 },
  titleShadow: { backgroundColor: PALETTE.outline, padding: 3 },
  titleInner: { backgroundColor: PALETTE.card, borderWidth: 3, borderColor: PALETTE.gold, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center' },
  titleText: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 13, letterSpacing: 1 },
  titleUnderline: { height: 3, alignSelf: 'stretch', marginTop: 8, marginHorizontal: 10 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 14 },
  progressFrameShadow: { flex: 1, backgroundColor: PALETTE.outline, padding: 3 },
  progressFrame: { backgroundColor: PALETTE.card, borderWidth: 2, borderColor: PALETTE.gold, padding: 3 },
  progressTrack: { height: 14, backgroundColor: '#0E1220', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PALETTE.gold },
  progressGloss: { height: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  countBadge: { marginLeft: 10, backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingHorizontal: 8, paddingVertical: 4, minWidth: 56, alignItems: 'center' },
  countText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 18 },

  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardShadow: { backgroundColor: PALETTE.outline, padding: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 0 },
  boardFrame: { backgroundColor: PALETTE.card, borderWidth: 4, borderColor: PALETTE.gold, padding: 8 },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  cellActive: { shadowColor: PALETTE.gold, shadowOpacity: 0.9, shadowRadius: 6, zIndex: 10 },
  spark: { position: 'absolute', color: PALETTE.gold, fontSize: 26 },

  // --- Alt panel ---
  panelShadow: { backgroundColor: PALETTE.gold, paddingTop: 4 },
  panel: { paddingHorizontal: 12, paddingBottom: 26, paddingTop: 16, backgroundColor: PALETTE.card, borderTopWidth: 3, borderTopColor: PALETTE.outline },

  // --- Sağ üst: joker logosu ---
  iconBtn: { width: 46, height: 48, backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, alignItems: 'center', justifyContent: 'center' },
  jokerTotal: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FF6F91', borderWidth: 2, borderColor: PALETTE.outline, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1 },
  jokerTotalText: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 14 },

  // --- Joker menüsü (sağ üstte, düğmenin hemen altında) ---
  jokerBackdrop: { flex: 1, backgroundColor: 'rgba(20,24,32,0.28)' },
  jokerMenuShadow: { position: 'absolute', top: 106, right: 16, backgroundColor: PALETTE.outline, padding: 3 },
  jokerMenu: { width: 278, backgroundColor: PALETTE.card, borderWidth: 3, borderColor: PALETTE.gold, padding: 10 },
  jokerMenuHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  jokerMenuTitle: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 12, letterSpacing: 1 },
  jokerCoin: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingHorizontal: 6, paddingVertical: 2 },
  jokerCoinText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 16, marginLeft: 4 },
  jokerMenuHint: { color: PALETTE.accent, fontFamily: FONT.medium, fontSize: 14, textAlign: 'center', marginBottom: 8, lineHeight: 16 },
  jokerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.cardBorder, padding: 8, marginBottom: 8 },
  jokerRowIcon: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  jokerRowName: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 18 },
  jokerRowDesc: { color: '#AEB6C8', fontFamily: FONT.medium, fontSize: 14, marginTop: 1 },
  jokerRowCount: { backgroundColor: PALETTE.gold, borderWidth: 2, borderColor: PALETTE.outline, minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  jokerRowCountEmpty: { backgroundColor: PALETTE.cardBorder, borderColor: PALETTE.muted },
  jokerRowCountText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 16 },
  jokerStoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: PALETTE.cardBorder, paddingTop: 10, marginTop: 2 },
  jokerStorePlus: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 22, marginRight: 6 },
  jokerStoreText: { color: PALETTE.cream, fontFamily: FONT.medium, fontSize: 15 },

  activePanel: { alignItems: 'center' },
  panelError: { opacity: 0.6 },
  clueBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.accent, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  dirDot: { width: 9, height: 9, marginRight: 8, backgroundColor: PALETTE.accent },
  clueBadgeText: { color: PALETTE.accent, fontFamily: FONT.bold, fontSize: 15, letterSpacing: 1 },
  clueText: { color: PALETTE.cream, fontFamily: FONT.semi, fontSize: 20, marginBottom: 12, textAlign: 'center', lineHeight: 22, paddingHorizontal: 6 },

  // Harf kutucukları
  tileRow: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  tile: { width: 30, height: 34, backgroundColor: '#0E1220', borderWidth: 2, borderColor: '#3A4257', marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' },
  tileFilled: { borderColor: PALETTE.cream },
  tileCursor: { borderColor: PALETTE.gold },
  tileLocked: { backgroundColor: '#2A2410', borderColor: PALETTE.gold },
  tileText: { color: PALETTE.white, fontFamily: FONT.bold, fontSize: 24, width: '100%', textAlign: 'center' },
  tileTextLocked: { color: PALETTE.gold },

  // Piksel klavye
  keyboard: { width: '100%' },
  keyRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 5 },
  keyWrap: { marginHorizontal: 2, backgroundColor: PALETTE.outline, padding: 2 },
  key: { height: 40, backgroundColor: PALETTE.cardBorder, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4A536B' },
  keyGold: { backgroundColor: PALETTE.gold, borderColor: PALETTE.cream },
  keyText: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 22 },
  keyTextGold: { color: PALETTE.outline, fontSize: 18 },

  idlePanel: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, minHeight: 120 },
  idleText: { color: '#AEB6C8', fontFamily: FONT.medium, fontSize: 18, textAlign: 'center', paddingHorizontal: 12, marginTop: 12, lineHeight: 20 },

  donePanel: { alignItems: 'center', paddingVertical: 12, minHeight: 120 },
  doneFlowers: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  doneTitle: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 16, marginBottom: 10, letterSpacing: 1 },
  doneSub: { color: PALETTE.cream, fontFamily: FONT.medium, fontSize: 18, textAlign: 'center', marginBottom: 12 },
  earnBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  earnText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 18, marginLeft: 8, letterSpacing: 1 },
  primaryBtnShadow: { backgroundColor: PALETTE.outline, padding: 2 },
  primaryBtn: { backgroundColor: PALETTE.gold, borderWidth: 2, borderColor: PALETTE.cream, paddingHorizontal: 28, paddingVertical: 12 },
  primaryBtnText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 20, letterSpacing: 1 },
  exitLink: { color: PALETTE.cream, fontFamily: FONT.medium, fontSize: 16, opacity: 0.8, textDecorationLine: 'underline' },
});
