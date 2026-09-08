// src/screens/CityPuzzlesScreen.js
// Bir şehrin içindeki 5 bulmaca. Arı çiçeğe konunca buraya gelinir.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { PALETTE, FONT, GardenBackground, PixelArt, DETAILED_FLOWER, flowerPalette } from '../pixel/PixelKit';
import { getCity } from '../data/cities';

const STATUS_LABEL = { active: 'OYNA', solved: 'BİTTİ', locked: 'KİLİTLİ' };

export default function CityPuzzlesScreen({ navigation, route }) {
  const city = getCity(route.params?.cityId) || getCity('istanbul');
  const [toast, setToast] = useState(null);

  const total = city.puzzles.length;
  const solved = city.puzzles.filter((p) => p.status === 'solved').length;

  const openPuzzle = (p) => {
    if (p.status === 'active' || p.status === 'solved') {
      navigation.navigate(p.route || 'Puzzle', { cityId: city.id, puzzleId: p.id });
    } else {
      setToast('Bu bulmaca henüz kilitli — sıradakini çöz 🌸');
      setTimeout(() => setToast(null), 1600);
    }
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
                p.status === 'solved' ? styles.progSegDone : styles.progSegTodo,
                i > 0 && { marginLeft: 4 },
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>{solved} / {total} TAMAMLANDI</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {city.puzzles.map((p, i) => {
          const isOpen = p.status === 'active' || p.status === 'solved';
          return (
            <Pressable
              key={p.id}
              onPress={() => openPuzzle(p)}
              style={[styles.card, isOpen ? styles.cardOpen : styles.cardLocked]}
            >
              <View style={styles.budWrap}>
                <PixelArt
                  matrix={DETAILED_FLOWER}
                  pixelSize={3}
                  palette={p.status === 'locked' ? flowerPalette('#8A93A8', true) : flowerPalette(city.petal, false)}
                />
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.section, !isOpen && styles.dim]}>BÖLÜM {i + 1}</Text>
                <Text style={[styles.puzzleTitle, !isOpen && styles.dim]}>{p.title}</Text>
              </View>

              <View
                style={[
                  styles.badge,
                  p.status === 'active' && styles.badgeActive,
                  p.status === 'solved' && styles.badgeSolved,
                  p.status === 'locked' && styles.badgeLocked,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    p.status === 'active' && { color: PALETTE.outline },
                    p.status === 'locked' && { color: PALETTE.muted },
                  ]}
                >
                  {STATUS_LABEL[p.status]}
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
