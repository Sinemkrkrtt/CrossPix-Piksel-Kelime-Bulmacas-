// src/screens/EndlessScreen.js
// Sonsuz Mod — üreticiden gelen, seviye çıktıkça zorlaşan sonsuz bulmaca akışı.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PALETTE, FONT, GardenBackground, PixelArt } from '../pixel/PixelKit';
import { useEconomy } from '../economy/EconomyContext';
import { tierForLevel, difficultyLabel } from '../data/endless';
import { ENDLESS_BASE_REWARD, ENDLESS_LEVEL_STEP, ENDLESS_LEVEL_CAP } from '../economy/config';

const GREEN = '#2E5E3A';
const TIER_COLOR = { 1: '#3EA05A', 2: '#3E7AD0', 3: '#A02CC0' };

// Piksel sonsuz (∞) logosu.
const INF = [
  '.oo...oo.',
  'oyyo.oyyo',
  'oy.o.o.yo',
  'oyyo.oyyo',
  '.oo...oo.',
];
const INF_PAL = { o: '#7A2CD0', y: '#C77DFF' };
const COIN = ['.eeeee.', 'egggghe', 'egsgghe', 'egsggge', 'egsggge', 'egggghe', '.eeeee.'];
const COIN_PAL = { e: '#B8860B', g: '#F5C518', h: '#FFE9A8', s: '#B8860B' };

export default function EndlessScreen({ navigation }) {
  const { endlessLevel } = useEconomy();
  const [, force] = React.useReducer((x) => x + 1, 0);
  useFocusEffect(React.useCallback(() => { force(); }, []));

  const level = endlessLevel;
  const tier = tierForLevel(level);
  const tierColor = TIER_COLOR[tier];
  const reward = ENDLESS_BASE_REWARD + Math.min(level, ENDLESS_LEVEL_CAP) * ENDLESS_LEVEL_STEP;

  // Bir sonraki zorluk hangi seviyede?
  const nextThreshold = level <= 4 ? 5 : level <= 10 ? 11 : null;

  const play = () => navigation.navigate('Puzzle', { endless: true, endlessLevel: level });

  return (
    <View style={styles.container}>
      <GardenBackground skyRatio={0.42} />
      <View style={styles.scrim} pointerEvents="none" />

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>SONSUZ MOD</Text>
        <View style={styles.backGhost} />
      </View>

      <View style={styles.body}>
        {/* Sonsuz logosu */}
        <View style={styles.infoWrap}>
          <PixelArt matrix={INF} pixelSize={9} palette={INF_PAL} />
        </View>

        {/* Seviye */}
        <Text style={styles.levelLbl}>SEVİYE</Text>
        <Text style={styles.levelNum}>{level}</Text>

        {/* Zorluk rozeti */}
        <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.tierText}>{difficultyLabel(level).toUpperCase()}</Text>
        </View>
        {nextThreshold ? (
          <Text style={styles.nextText}>Seviye {nextThreshold}'de zorluk artacak</Text>
        ) : (
          <Text style={styles.nextText}>En zorlu katmandasın — sınır yok!</Text>
        )}

        {/* Oyna */}
        <Pressable onPress={play} style={[styles.playBtn, { backgroundColor: tierColor }]}>
          <Text style={styles.playText}>OYNA</Text>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardText}>+{reward}</Text>
            <PixelArt matrix={COIN} pixelSize={3} palette={COIN_PAL} />
          </View>
        </Pressable>

        <Text style={styles.hint}>Her çözüm bir seviye ilerletir. Bulmacalar sonsuza kadar taze!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop || '#8FD9F2' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF14' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 54, paddingHorizontal: 14, paddingBottom: 4 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFFCC', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  backGhost: { width: 42 },
  backText: { fontSize: 34, lineHeight: 34, color: GREEN, fontFamily: FONT.bold },
  title: { flex: 1, textAlign: 'center', fontSize: 15, letterSpacing: 1, color: GREEN, fontFamily: FONT.arcade },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: 22 },
  infoWrap: { marginTop: 34, marginBottom: 8 },
  levelLbl: { fontSize: 13, letterSpacing: 3, color: GREEN, fontFamily: FONT.arcade, marginTop: 14 },
  levelNum: { fontSize: 78, color: '#7A2CD0', fontFamily: FONT.bold, marginTop: -6, marginBottom: 6 },

  tierBadge: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20, marginTop: 2 },
  tierText: { fontSize: 15, letterSpacing: 2, color: '#FFFFFF', fontFamily: FONT.arcade },
  nextText: { fontSize: 14, color: GREEN, fontFamily: FONT.semi, marginTop: 14, opacity: 0.85 },

  playBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 44, borderRadius: 18, marginTop: 30, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  playText: { fontSize: 20, letterSpacing: 2, color: '#FFFFFF', fontFamily: FONT.arcade },
  rewardPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF33', borderRadius: 10, paddingLeft: 10, paddingRight: 7, paddingVertical: 4 },
  rewardText: { fontSize: 17, color: '#FFFFFF', fontFamily: FONT.bold },

  hint: { fontSize: 14, color: GREEN, fontFamily: FONT.semi, marginTop: 26, textAlign: 'center', opacity: 0.85, paddingHorizontal: 14 },
});
