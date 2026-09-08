// src/screens/JournalScreen.js
// Seyahat Defteri — SADECE damgalar. Her şehir %100 bitince o şehrin damgası basılır.
// Kilometre taşı ödülleri (altın) sessizce, otomatik verilir.
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PALETTE, FONT, GardenBackground } from '../pixel/PixelKit';
import { useEconomy } from '../economy/EconomyContext';
import { CITIES, isCityComplete } from '../data/cities';
import { getSouvenir, SOUVENIR_MILESTONES } from '../data/souvenirs';

const GREEN = '#2E5E3A';
const { width: W } = Dimensions.get('window');
const COLS = 3;
const PAGE_PAD = 14;
const STAMP_W = Math.floor((Math.min(W, 460) - 16 * 2 - PAGE_PAD * 2 - 10 * (COLS - 1)) / COLS);
const ART_BOX = STAMP_W - 20;

const INKS = ['#2A4D8F', '#B23A48', '#2E7D52', '#7A3E9D', '#B06A1E', '#166B6B'];
const FAINT = '#CFC6B0';
const ROT = [-5, 4, -3, 5, -2, 3, -4, 2];

// Landmark silüetini TEK mürekkeple çizer (damga izlenimi).
function StampArt({ grid, cols, ink, box }) {
  const rows = grid.length;
  const px = Math.max(1, Math.min(Math.floor(box / cols), Math.floor((box * 0.8) / rows)));
  return (
    <View style={{ width: cols * px, height: rows * px }}>
      {grid.map((row, r) => (
        <View key={`r${r}`} style={{ flexDirection: 'row' }}>
          {row.map((cell, c) => (
            <View key={`c${c}`} style={{ width: px, height: px, backgroundColor: cell ? ink : 'transparent' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function JournalScreen({ navigation }) {
  const { rewarded, claimedMilestones, claimMilestone } = useEconomy();
  const [, force] = React.useReducer((x) => x + 1, 0);
  const [flash, setFlash] = React.useState(null);

  // Odaklanınca: biriken kilometre taşı ödülünü sessizce ver (her seferinde bir tane).
  useFocusEffect(React.useCallback(() => {
    force();
    const collected = CITIES.filter((c) => isCityComplete(c, rewarded)).length;
    const due = SOUVENIR_MILESTONES.find((m) => collected >= m.n && !claimedMilestones.includes(m.n));
    if (due) {
      const res = claimMilestone(due.n, due.reward, collected, due.themeId);
      if (res.ok) {
        setFlash(`+${due.reward} altın`);
        setTimeout(() => setFlash(null), 2400);
      }
    }
  }, [rewarded, claimedMilestones]));

  return (
    <View style={styles.container}>
      <GardenBackground skyRatio={0.24} />
      <View style={styles.scrim} pointerEvents="none" />

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>SEYAHAT DEFTERİ</Text>
        <View style={styles.backGhost} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.grid}>
            {CITIES.map((city, i) => {
              const s = getSouvenir(city.id);
              const noContent = !!s?.noContent;
              const done = !noContent && isCityComplete(city, rewarded);
              const total = city.puzzles?.length || 0;
              const solved = (city.puzzles || []).filter((p) => rewarded[`${city.id}:${p.id}`]).length;
              const ink = INKS[i % INKS.length];
              const rot = ROT[i % ROT.length];
              return (
                <View key={city.id} style={styles.slot}>
                  <View style={[
                    styles.stamp,
                    { transform: [{ rotate: `${rot}deg` }], borderColor: done ? ink : FAINT },
                    done ? { backgroundColor: ink + '12' } : styles.stampLocked,
                  ]}>
                    <Text numberOfLines={1} style={[styles.stampCity, { color: done ? ink : FAINT }]}>
                      {city.name.toUpperCase()}
                    </Text>
                    <View style={styles.stampArt}>
                      {s?.grid ? <StampArt grid={s.grid} cols={s.cols} ink={done ? ink : FAINT} box={ART_BOX} /> : null}
                    </View>
                    <Text numberOfLines={1} style={[styles.stampFoot, { color: done ? ink : FAINT }]}>
                      {noContent ? 'yakında' : done ? `${city.flag} ✦` : `${solved}/${total}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {flash && (
        <View style={styles.flash} pointerEvents="none">
          <Text style={styles.flashText}>{flash}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop || '#8FD9F2' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF10' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 54, paddingHorizontal: 14, paddingBottom: 4 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFFCC', alignItems: 'center', justifyContent: 'center' },
  backGhost: { width: 42 },
  backText: { fontSize: 34, lineHeight: 34, color: GREEN, fontFamily: FONT.bold },
  title: { flex: 1, textAlign: 'center', fontSize: 14, letterSpacing: 1, color: GREEN, fontFamily: FONT.arcade },

  scroll: { paddingHorizontal: 16, paddingTop: 10 },

  page: { backgroundColor: '#F3EAD6', borderRadius: 16, borderWidth: 2, borderColor: '#E0D4B8', padding: PAGE_PAD },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slot: { width: STAMP_W, marginBottom: 12, alignItems: 'center' },

  stamp: { width: STAMP_W, borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  stampLocked: { backgroundColor: '#FFFFFF55', opacity: 0.9 },
  stampCity: { fontSize: 9, letterSpacing: 1, fontFamily: FONT.bold, marginBottom: 4 },
  stampArt: { height: ART_BOX * 0.78, alignItems: 'center', justifyContent: 'center' },
  stampFoot: { fontSize: 11, fontFamily: FONT.bold, marginTop: 4 },

  flash: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#1F2E1Ecc', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 2, borderColor: PALETTE.gold },
  flashText: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 15 },
});
