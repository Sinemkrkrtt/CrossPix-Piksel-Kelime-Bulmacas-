// src/screens/StoreScreen.js
// Tutarlı, profesyonel market. Sıra: Jokerler (3 yan yana) · Altın paketleri · Temalar.
// Reklam YOK.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE, FONT, PixelArt, IC_MAGNIFIER, IC_WAND, IC_GIFT, jokerIconPalette } from '../pixel/PixelKit';
import { useEconomy } from '../economy/EconomyContext';
import { JOKER_META, JOKER_ORDER } from '../economy/config';
import { getGoldPacks, requestGoldPurchase, restorePurchases } from '../economy/iap';

const COIN = ['.ggg.', 'gYYYg', 'gYWYg', 'gYYYg', '.ggg.'];
const COIN_PAL = { g: '#B8901A', Y: PALETTE.gold, W: PALETTE.cream };
const IPAL = jokerIconPalette();
const JOKER_ICON = { cell: IC_MAGNIFIER, word: IC_WAND, free: IC_GIFT };

function CalmBackground() {
  return (
    <LinearGradient colors={['#A6E3F5', '#82CDEC', '#5FB6DF']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
  );
}

export default function StoreScreen({ navigation }) {
  const {
    coins, buyJoker, creditPurchase, purchaseEvent,
    themes, ownedThemes, equippedTheme, buyTheme, equipTheme,
  } = useEconomy();
  const [packs, setPacks] = useState(null);
  const [busy, setBusy] = useState(null);
  const [flash, setFlash] = useState(null);
  const lastPurchaseRef = useRef(purchaseEvent); // mount'taki eski olayı yok say
  // Çift-dokunma kilidi: senkron alımların (joker/tema) art arda iki kez tetiklenip
  // eksi bakiye / çift alım yapmasını önler.
  const buyLock = useRef(false);
  const lockOnce = () => {
    if (buyLock.current) return false;
    buyLock.current = true;
    setTimeout(() => { buyLock.current = false; }, 350);
    return true;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await getGoldPacks();
      if (!alive) return;
      setPacks(list);
    })();
    return () => { alive = false; };
  }, []);

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 1600); };

  // Gerçek satın alma sonucu (Apple onayı / iptal / hata) dinleyiciden buraya düşer.
  useEffect(() => {
    if (purchaseEvent === lastPurchaseRef.current) return; // mount'taki eski olay değil
    lastPurchaseRef.current = purchaseEvent;
    if (!purchaseEvent) return;
    setBusy(null);
    if (purchaseEvent.ok) showFlash(`+${purchaseEvent.coins} altın eklendi!`);
    else if (!purchaseEvent.cancelled) Alert.alert('Satın alma başarısız', purchaseEvent.error || 'Tekrar dene.');
    // iptal → sessiz geç
  }, [purchaseEvent]);

  const onBuyJoker = (type) => {
    if (!lockOnce()) return;
    const res = buyJoker(type);
    if (res.ok) showFlash(`${JOKER_META[type].name} alındı!`);
    else if (res.reason === 'coins') showFlash('Yetersiz altın');
  };

  const onBuyGold = async (pack) => {
    if (busy) return;
    setBusy(pack.id);
    const res = await requestGoldPurchase(pack.productId);
    if (res.mock) { setBusy(null); creditPurchase(pack.coins); showFlash(`+${pack.coins} altın eklendi! (test)`); return; }
    if (res.cancelled) { setBusy(null); return; }
    if (res.ok === false) { setBusy(null); Alert.alert('Satın alma başarısız', res.error || 'Tekrar dene.'); return; }
    // res.ok === true → Apple satın alma akışı başladı; sonuç (onay/iptal/hata)
    // purchaseEvent dinleyicisine düşer; başarı/hata flash'ı ve busy temizliği orada.
  };

  const onRestore = async () => {
    const res = await restorePurchases();
    showFlash(res.ok ? 'Satın alımlar geri yüklendi.' : 'Geri yükleme başarısız.');
  };

  const onTheme = (t) => {
    if (t.id === equippedTheme) return;
    if (!lockOnce()) return;
    if (ownedThemes.includes(t.id)) { equipTheme(t.id); showFlash(`${t.name} kuşanıldı`); return; }
    // buyTheme artık satın alınca aynı anda kuşanıyor (ayrı equipTheme çağrısına gerek yok).
    const res = buyTheme(t.id);
    if (res.ok) showFlash(`${t.name} alındı ve kuşanıldı`);
    else if (res.reason === 'coins') showFlash('Yetersiz altın');
  };

  return (
    <View style={styles.container}>
      <CalmBackground />

      {/* Başlık */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.titleShadow}>
          <View style={styles.titleInner}><Text style={styles.titleText}>MAĞAZA</Text></View>
        </View>
        <View style={styles.coinBadge}>
          <PixelArt matrix={COIN} pixelSize={4} palette={COIN_PAL} />
          <Text style={styles.coinText}>{coins}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* JOKERLER — en üstte, üçü yan yana */}
        <Text style={styles.section}>JOKERLER</Text>
        <View style={styles.grid3}>
          {JOKER_ORDER.map((type) => {
            const m = JOKER_META[type];
            const afford = coins >= m.price;
            return (
              <Pressable
                key={type}
                onPress={() => onBuyJoker(type)}
                disabled={!afford}
                style={({ pressed }) => [styles.jokerCard, !afford && styles.jokerOff, pressed && afford && styles.pressed]}
              >
                <View style={styles.jokerIcon}><PixelArt matrix={JOKER_ICON[type]} pixelSize={4} palette={IPAL} /></View>
                <Text style={styles.jokerName} numberOfLines={1}>{m.name}</Text>
                <View style={styles.jokerPrice}>
                  <PixelArt matrix={COIN} pixelSize={2} palette={COIN_PAL} />
                  <Text style={styles.jokerPriceText}>{m.price}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ALTIN PAKETLERİ */}
        <Text style={styles.section}>ALTIN PAKETLERİ</Text>
        {packs === null ? (
          <ActivityIndicator color={PALETTE.gold} style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.grid}>
            {packs.map((p) => {
              const best = p.tag === 'EN İYİ' || p.tag === 'MEGA';
              return (
                <Pressable key={p.id} onPress={() => onBuyGold(p)} disabled={!!busy} style={({ pressed }) => [styles.packCard, best && styles.packBest, pressed && !busy && styles.pressed]}>
                  {p.tag ? <View style={[styles.ribbon, best && styles.ribbonBest]}><Text style={[styles.ribbonText, best && styles.ribbonTextBest]}>{p.tag}</Text></View> : <View style={styles.ribbonGap} />}
                  <PixelArt matrix={COIN} pixelSize={8} palette={COIN_PAL} />
                  <Text style={styles.packAmount}>{p.coins.toLocaleString('tr-TR')}</Text>
                  <Text style={styles.packLabel}>ALTIN</Text>
                  <View style={styles.packBuy}>
                    {busy === p.id ? <ActivityIndicator size="small" color={PALETTE.outline} /> : <Text style={styles.packBuyText}>{p.priceString}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* HARİTA TEMASI */}
        <Text style={styles.section}>HARİTA TEMASI</Text>
        <View style={styles.grid}>
          {themes.map((t) => {
            const owned = ownedThemes.includes(t.id);
            const equipped = t.id === equippedTheme;
            return (
              <Pressable key={t.id} onPress={() => onTheme(t)} style={[styles.themeCard, equipped && styles.themeCardOn]}>
                <View style={styles.themeSwatch}>
                  <View style={{ flex: 1, backgroundColor: t.sky }} />
                  <View style={{ height: 18, backgroundColor: t.grass }} />
                </View>
                <View style={styles.themeFoot}>
                  <Text style={styles.themeName} numberOfLines={1}>{t.name}</Text>
                  {equipped ? (
                    <Text style={styles.themeEquipped}>KUŞANILDI</Text>
                  ) : owned ? (
                    <Text style={styles.themeEquip}>KUŞAN</Text>
                  ) : (
                    <View style={styles.goldPill}>
                      <PixelArt matrix={COIN} pixelSize={2} palette={COIN_PAL} />
                      <Text style={styles.goldPillText}>{t.price}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onRestore} style={styles.restoreBtn} hitSlop={6}>
          
        </Pressable>
      </ScrollView>

      {flash && <View style={styles.flash}><Text style={styles.flashText}>{flash}</Text></View>}
    </View>
  );
}

const CARD = PALETTE.card;
const BORDER = PALETTE.cardBorder;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.skyTop },

  // Başlık
  topBar: { marginTop: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 48, height: 48, backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, alignItems: 'center', justifyContent: 'center' },
  backText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 38, lineHeight: 40, marginTop: -8 },
  titleShadow: { flex: 1, marginHorizontal: 10, backgroundColor: PALETTE.outline, padding: 3 },
  titleInner: { backgroundColor: CARD, borderWidth: 3, borderColor: PALETTE.gold, paddingVertical: 12, alignItems: 'center' },
  titleText: { color: PALETTE.gold, fontFamily: FONT.arcade, fontSize: 14, letterSpacing: 1 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 3, borderColor: PALETTE.gold, paddingHorizontal: 8, height: 48 },
  coinText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 19, marginLeft: 6 },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  section: { color: PALETTE.outline, fontFamily: FONT.arcade, fontSize: 12, letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.92 },

  // Grid'ler
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  grid3: { flexDirection: 'row', justifyContent: 'space-between' },

  // Joker kartı (3 yan yana)
  jokerCard: {
    width: '31.5%', backgroundColor: CARD, borderWidth: 2, borderColor: BORDER,
    paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center',
  },
  jokerOff: { opacity: 0.5 },
  jokerIcon: { width: 44, height: 44, backgroundColor: PALETTE.outline, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  jokerName: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 15, marginBottom: 8, textAlign: 'center' },
  jokerPrice: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingHorizontal: 8, paddingVertical: 5 },
  jokerPriceText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 15, marginLeft: 5 },

  // Sağ aksiyon (tema fiyatı)
  goldPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingHorizontal: 9, paddingVertical: 6, marginLeft: 8 },
  goldPillText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 16, marginLeft: 5 },

  // Öne çıkan altın paketi kartı
  packCard: {
    width: '48%', marginBottom: 12, backgroundColor: CARD, borderWidth: 3, borderColor: PALETTE.gold,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.24, shadowRadius: 0,
  },
  packBest: { borderColor: '#FFE87A', backgroundColor: '#2C3550' },
  ribbon: { backgroundColor: PALETTE.cardBorder, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  ribbonBest: { backgroundColor: PALETTE.gold },
  ribbonText: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 11, letterSpacing: 1 },
  ribbonTextBest: { color: PALETTE.outline },
  ribbonGap: { height: 21, marginBottom: 8 },
  packAmount: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 30, marginTop: 8 },
  packLabel: { color: '#AEB6C8', fontFamily: FONT.bold, fontSize: 12, letterSpacing: 2, marginBottom: 12 },
  packBuy: { alignSelf: 'stretch', marginHorizontal: 10, backgroundColor: PALETTE.gold, borderWidth: 2, borderColor: PALETTE.cream, paddingVertical: 9, alignItems: 'center' },
  packBuyText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 16 },

  // Tema kartı (grid)
  themeCard: { width: '48%', marginBottom: 12, backgroundColor: CARD, borderWidth: 2, borderColor: BORDER, padding: 8 },
  themeCardOn: { borderColor: PALETTE.gold, borderWidth: 3 },
  themeSwatch: { width: '100%', height: 62, borderWidth: 2, borderColor: PALETTE.outline, overflow: 'hidden', marginBottom: 8 },
  themeFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  themeName: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 16, flex: 1 },
  themeEquipped: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1 },
  themeEquip: { color: PALETTE.accent, fontFamily: FONT.bold, fontSize: 13, letterSpacing: 1 },

  restoreBtn: { alignSelf: 'center', marginTop: 20, paddingVertical: 6 },
  restoreText: { color: PALETTE.outline, opacity: 0.75, fontFamily: FONT.semi, fontSize: 14, textDecorationLine: 'underline' },

  flash: { position: 'absolute', bottom: 40, alignSelf: 'center', left: 30, right: 30, backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingVertical: 12, paddingHorizontal: 16 },
  flashText: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 17, textAlign: 'center' },
});
