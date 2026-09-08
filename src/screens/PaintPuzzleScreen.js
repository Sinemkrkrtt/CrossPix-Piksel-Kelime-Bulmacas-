// src/screens/PaintPuzzleScreen.js
// Detaylı piksel resim + kelime oyunu. Resim baştan soluktur; bir bölgeye
// (ör. taç yaprağı) dokunup ipucundaki kelimeyi çözünce o bölge gerçek rengine
// boyanır. Tüm bölgeler bitince resim kutlama animasyonu yapar.
import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { PALETTE, FONT, mix } from '../pixel/PixelKit';
import { getCity } from '../data/cities';
import { getPuzzle } from '../data/puzzles';

const { width: W, height: H } = Dimensions.get('window');
const GREY = '#C9CDD4';
const faded = (c) => mix(c, GREY, 0.6);

const SPARKS = [
  { left: '10%', top: '8%' }, { left: '84%', top: '14%' }, { left: '48%', top: '0%' },
  { left: '18%', top: '82%' }, { left: '80%', top: '86%' }, { left: '50%', top: '94%' },
];

export default function PaintPuzzleScreen({ navigation, route }) {
  const cityId = route?.params?.cityId || 'istanbul';
  const puzzleId = route?.params?.puzzleId || 2;
  const city = getCity(cityId) || getCity('istanbul');
  const puzzle = useMemo(() => getPuzzle(cityId, puzzleId), [cityId, puzzleId]);

  const rows = puzzle.art.length;
  const cols = puzzle.cols || puzzle.art[0].length;
  const CELL = Math.min(
    Math.floor((Math.min(W, 430) - 78) / cols),
    Math.floor((H * 0.4) / rows)
  );
  const GAP = 1;

  const clueByRegion = useMemo(() => {
    const m = {};
    puzzle.clues.forEach((c) => { m[c.region] = c; });
    return m;
  }, [puzzle]);
  const totalRegions = puzzle.clues.length;

  const [activeRegion, setActiveRegion] = useState(null);
  const [inputText, setInputText] = useState('');
  const [solved, setSolved] = useState([]);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(0);

  const regionAnims = useMemo(() => {
    const m = {};
    puzzle.clues.forEach((c) => { m[c.region] = new Animated.Value(0); });
    return m;
  }, [puzzle]);

  const boardScale = useRef(new Animated.Value(1)).current;
  const sparks = useRef(SPARKS.map(() => new Animated.Value(0))).current;

  const celebrate = () => {
    setDone(true);
    Animated.sequence([
      Animated.spring(boardScale, { toValue: 1.06, friction: 3, useNativeDriver: true }),
      Animated.spring(boardScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    sparks.forEach((s, i) => {
      s.setValue(0);
      Animated.loop(
        Animated.timing(s, { toValue: 1, duration: 1500, delay: i * 150, easing: Easing.out(Easing.ease), useNativeDriver: true })
      ).start();
    });
  };

  const pressCell = (region) => {
    if (done || !region || solved.includes(region)) return;
    setActiveRegion(region);
    setInputText('');
  };

  const handleCheck = () => {
    if (!activeRegion) return;
    const clue = clueByRegion[activeRegion];
    const guess = inputText.replace(/i/g, 'İ').toUpperCase().trim();
    if (guess === clue.answer) {
      const next = [...solved, activeRegion];
      setSolved(next);
      Animated.timing(regionAnims[activeRegion], {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      setActiveRegion(null);
      setInputText('');
      if (next.length === totalRegions) setTimeout(celebrate, 560);
    } else {
      setShake((s) => s + 1);
      setTimeout(() => setShake((s) => (s > 0 ? s - 1 : 0)), 380);
    }
  };

  const progress = totalRegions ? solved.length / totalRegions : 0;
  const activeClue = activeRegion ? clueByRegion[activeRegion] : null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Üst bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← ŞEHİR</Text>
        </Pressable>
        <View style={styles.titleSign}>
          <Text style={styles.titleFlag}>{city.flag}</Text>
          <Text style={styles.titleText}>{puzzle.name.toUpperCase()}</Text>
        </View>
        <View style={{ width: 84 }} />
      </View>

      {/* İlerleme */}
      <View style={styles.progressWrap}>
        <View style={styles.progressFrame}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
              <View style={styles.progressGloss} />
            </View>
          </View>
        </View>
        <Text style={styles.progressLabel}>{solved.length}/{totalRegions}</Text>
      </View>

      {/* Resim tahtası */}
      <View style={styles.boardArea}>
        <Animated.View style={[styles.boardFrame, { transform: [{ scale: boardScale }] }]}>
          <View>
            {puzzle.art.map((row, r) => (
              <View key={`r-${r}`} style={styles.row}>
                {Array.from({ length: cols }).map((_, c) => {
                  const ch = row[c] || '.';
                  if (ch === '.') return <View key={`c-${c}`} style={{ width: CELL, height: CELL, margin: GAP }} />;
                  const region = puzzle.regions[ch];
                  const trueColor = puzzle.colors[ch];
                  const anim = regionAnims[region];
                  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [faded(trueColor), trueColor] });
                  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });
                  const isActive = region === activeRegion && !solved.includes(region);
                  return (
                    <Pressable key={`c-${c}`} onPress={() => pressCell(region)}>
                      <Animated.View
                        style={{
                          width: CELL,
                          height: CELL,
                          margin: GAP,
                          backgroundColor: bg,
                          transform: [{ scale }],
                          borderWidth: isActive ? 1.5 : 0,
                          borderColor: isActive ? PALETTE.gold : 'transparent',
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {done &&
            sparks.map((s, i) => (
              <Animated.Text
                key={`spark-${i}`}
                style={[
                  styles.spark,
                  SPARKS[i],
                  {
                    opacity: s.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
                    transform: [
                      { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [0, -32] }) },
                      { scale: s.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.6] }) },
                    ],
                  },
                ]}
              >
                ✦
              </Animated.Text>
            ))}
        </Animated.View>
      </View>

      {/* Etkileşim */}
      <View style={styles.interaction}>
        {done ? (
          <View style={styles.donePanel}>
            <Text style={styles.doneTitle}>🎉 TAMAMLANDI</Text>
            <Text style={styles.doneSub}>{puzzle.name} dioraması renklendi!</Text>
            <Pressable style={styles.doneBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.doneBtnText}>ŞEHRE DÖN</Text>
            </Pressable>
          </View>
        ) : activeClue ? (
          <View style={[styles.activePanel, shake > 0 && styles.panelError]}>
            <View style={styles.clueBadge}>
              <Text style={styles.clueBadgeText}>🎨 BÖLGEYİ BOYA</Text>
            </View>
            <Text style={styles.clueText}>{activeClue.text}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                autoCapitalize="characters"
                placeholder="Cevabı yaz..."
                placeholderTextColor="#6B7386"
                autoFocus
                onSubmitEditing={handleCheck}
              />
              <Pressable style={styles.checkBtn} onPress={handleCheck}>
                <Text style={styles.checkBtnText}>ÇÖZ</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.idlePanel}>
            <Text style={styles.idleIcon}>🎨</Text>
            <Text style={styles.idleText}>Resmin bir parçasına dokun — o bölgenin ipucu açılsın, çözünce boyansın.</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop },

  topBar: { marginTop: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingHorizontal: 10, paddingVertical: 10, width: 84 },
  backText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 13 },
  titleSign: { flex: 1, marginHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.card, borderWidth: 3, borderColor: PALETTE.gold, paddingHorizontal: 12, paddingVertical: 10 },
  titleFlag: { fontSize: 15, marginRight: 7 },
  titleText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 18, letterSpacing: 0.5 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, marginTop: 16 },
  progressFrame: { flex: 1, backgroundColor: PALETTE.outline, padding: 3 },
  progressTrack: { height: 16, backgroundColor: '#0E1220', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PALETTE.gold },
  progressGloss: { height: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  progressLabel: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 15, marginLeft: 10, minWidth: 46, textAlign: 'right' },

  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardFrame: { backgroundColor: PALETTE.card, borderWidth: 4, borderColor: PALETTE.gold, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 0 },
  row: { flexDirection: 'row' },
  spark: { position: 'absolute', color: PALETTE.gold, fontSize: 24 },

  interaction: { paddingHorizontal: 20, paddingBottom: 34, paddingTop: 18, backgroundColor: PALETTE.card, borderTopWidth: 4, borderTopColor: PALETTE.gold },
  activePanel: { alignItems: 'center' },
  panelError: { opacity: 0.65 },
  clueBadge: { backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.accent, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  clueBadgeText: { color: PALETTE.accent, fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1 },
  clueText: { color: PALETTE.cream, fontFamily: FONT.semi, fontSize: 17, marginBottom: 16, textAlign: 'center' },
  inputRow: { flexDirection: 'row', width: '100%' },
  input: { flex: 1, backgroundColor: '#0E1220', color: PALETTE.white, paddingHorizontal: 16, paddingVertical: 14, fontFamily: FONT.bold, fontSize: 18, marginRight: 10, borderWidth: 2, borderColor: '#3A4257' },
  checkBtn: { backgroundColor: PALETTE.gold, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, borderWidth: 2, borderColor: PALETTE.cream },
  checkBtnText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 16, letterSpacing: 1 },

  idlePanel: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  idleIcon: { fontSize: 30, marginBottom: 8 },
  idleText: { color: '#AEB6C8', fontFamily: FONT.medium, fontSize: 15, textAlign: 'center', paddingHorizontal: 10 },

  donePanel: { alignItems: 'center', paddingVertical: 6 },
  doneTitle: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 15, marginBottom: 12 },
  doneSub: { color: PALETTE.cream, fontFamily: FONT.medium, fontSize: 15, textAlign: 'center', marginBottom: 18 },
  doneBtn: { backgroundColor: PALETTE.gold, borderWidth: 2, borderColor: PALETTE.cream, paddingHorizontal: 28, paddingVertical: 12 },
  doneBtnText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 16, letterSpacing: 1 },
});
