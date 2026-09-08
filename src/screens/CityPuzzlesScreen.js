// src/screens/CityPuzzlesScreen.js
// Bir şehrin içindeki 7 bulmaca. Arı çiçeğe konunca buraya gelinir.
// Çözülmüş durum ekonomideki `rewarded`'dan okunur (statik status DEĞİL).
// Şehir haritada açıksa 7 bölüm de oynanabilir; çözülen "BİTTİ" olur.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { PALETTE, FONT, GardenBackground, PixelArt, DETAILED_FLOWER, flowerPalette } from '../pixel/PixelKit';
import { getCity } from '../data/cities';
import { getPuzzle } from '../data/puzzles';
import { useEconomy } from '../economy/EconomyContext';

export default function CityPuzzlesScreen({ navigation, route }) {
  const city = getCity(route.params?.cityId) || getCity('istanbul');
  const { rewarded, puzzleProgress } = useEconomy();
  const [toast, setToast] = useState(null);

  const isSolved = (p) => !!rewarded[`${city.id}:${p.id}`];
  const total = city.puzzles.length;
  const solved = city.puzzles.filter(isSolved).length;

  // Bir bölümün yüzde kaçı tamamlandı? Bitmişse %100; değilse çözülen ipucu / toplam ipucu.
  const percentOf = (p) => {
    if (isSolved(p)) return 100;
    const puz = getPuzzle(city.id, p.id);
    const totalClues = puz && puz.clues ? Object.keys(puz.clues).length : 0;
    if (!totalClues) return 0;
    const doneClues = (puzzleProgress[`${city.id}:${p.id}`] || []).length;
    return Math.max(0, Math.min(100, Math.round((doneClues / totalClues) * 100)));
  };

  const openPuzzle = (p) => {
    navigation.navigate(p.route || 'Puzzle', { cityId: city.id, puzzleId: p.id });
  };

  return (
    <View style={styles.container}>
      <GardenBackground skyRatio={0.3} />

      {/* Üst bar — sade, bayraksız plaka */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.titlePlaque}>
          <View style={styles.titleShadow}>
            <View style={styles.titleInner}>
              <Text style={styles.titleText}>{city.name.toUpperCase()}</Text>
              <View style={styles.titleUnderline} />
            </View>
          </View>
        </View>

        <View style={styles.backBtnGhost} />
      </View>

      {/* İlerleme çubuğu */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          {city.puzzles.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.progSeg,
                isSolved(p) ? styles.progSegDone : styles.progSegTodo,
                i > 0 && { marginLeft: 4 },
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>{solved} / {total} TAMAMLANDI</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {city.puzzles.map((p, i) => {
          const done = isSolved(p);
          const percent = percentOf(p);
          return (
            <Pressable
              key={p.id}
              onPress={() => openPuzzle(p)}
              style={[styles.card, styles.cardOpen]}
            >
              <View style={styles.budWrap}>
                <PixelArt
                  matrix={DETAILED_FLOWER}
                  pixelSize={3}
                  palette={flowerPalette(city.petal, false)}
                />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.section}>BÖLÜM {i + 1}</Text>
                <Text style={styles.puzzleTitle}>{p.title}</Text>
                <View style={styles.miniRow}>
                  <View style={styles.miniTrack}>
                    <View style={[styles.miniFill, { width: `${percent}%` }, done && styles.miniFillDone]} />
                  </View>
                  <Text style={styles.miniPercent}>%{percent}</Text>
                </View>
              </View>

              <View style={[styles.badge, done ? styles.badgeSolved : styles.badgeActive]}>
                <Text style={[styles.badgeText, !done && { color: PALETTE.outline }]}>
                  {done ? 'BİTTİ' : 'OYNA'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop },

  topBar: {
    marginTop: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 50,
    height: 50,
    backgroundColor: PALETTE.outline,
    borderWidth: 3,
    borderColor: PALETTE.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnGhost: { width: 50, height: 50 },
  backText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 34, lineHeight: 36, marginTop: -6 },

  // Ortadaki başlık plakası (çift çerçeveli, bayraksız)
  titlePlaque: { flex: 1, marginHorizontal: 12 },
  titleShadow: { backgroundColor: PALETTE.outline, padding: 3 },
  titleInner: {
    backgroundColor: PALETTE.card,
    borderWidth: 3,
    borderColor: PALETTE.gold,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  titleText: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 14, letterSpacing: 1 },
  titleUnderline: { height: 3, alignSelf: 'stretch', marginTop: 9, marginHorizontal: 10, backgroundColor: PALETTE.accent },

  // İlerleme çubuğu
  progressWrap: { alignItems: 'center', marginTop: 16, marginBottom: 2 },
  progressTrack: { flexDirection: 'row' },
  progSeg: { width: 30, height: 9, borderWidth: 2, borderColor: PALETTE.outline },
  progSegDone: { backgroundColor: PALETTE.grassLight },
  progSegTodo: { backgroundColor: PALETTE.card },
  progressText: { marginTop: 8, color: PALETTE.outline, fontFamily: FONT.bold, letterSpacing: 1.5, fontSize: 12 },

  list: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 14,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 0,
  },
  cardOpen: { backgroundColor: PALETTE.card, borderColor: PALETTE.gold },
  cardLocked: { backgroundColor: 'rgba(35,43,69,0.9)', borderColor: PALETTE.cardBorder },
  budWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  section: { color: PALETTE.gold, fontFamily: FONT.semi, fontSize: 13, letterSpacing: 1 },
  puzzleTitle: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 19, marginTop: 2 },
  dim: { color: PALETTE.muted },

  // Bölüm ilerleme çubuğu (kart içi) — yüzde çubuğun hemen yanında
  miniRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  miniTrack: { width: 150, height: 8, backgroundColor: PALETTE.outline, borderWidth: 1, borderColor: PALETTE.cardBorder, marginRight: 8 },
  miniFill: { height: '100%', backgroundColor: PALETTE.gold },
  miniFillDone: { backgroundColor: PALETTE.grassLight },
  miniPercent: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 12 },

  badge: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 2 },
  badgeActive: { backgroundColor: PALETTE.gold, borderColor: PALETTE.cream },
  badgeSolved: { backgroundColor: PALETTE.grassDark, borderColor: PALETTE.grassLight },
  badgeLocked: { backgroundColor: 'transparent', borderColor: PALETTE.cardBorder },
  badgeText: { fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1, color: PALETTE.cream },

  toast: {
    position: 'absolute',
    bottom: 58,
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
