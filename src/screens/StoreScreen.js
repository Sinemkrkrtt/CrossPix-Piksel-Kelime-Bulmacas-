// src/screens/StoreScreen.js
// Tutarlı, profesyonel market: tüm satın alınabilir öğeler AYNI satır düzeninde
// (ikon · ad/açıklama · fiyat). Öne çıkan "reklam izle" banner. Temalar seçici şerit.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE, FONT, PixelArt, IC_MAGNIFIER, IC_WAND, IC_GIFT, jokerIconPalette } from '../pixel/PixelKit';
import { useEconomy } from '../economy/EconomyContext';
import { JOKER_META, JOKER_ORDER, AD_REWARD } from '../economy/config';
import { getGoldPacks, purchaseGold, purchaseRemoveAds, getRemoveAdsPrice, restorePurchases } from '../economy/iap';
import { showRewardedAd } from '../economy/ads';

const COIN = ['.ggg.', 'gYYYg', 'gYWYg', 'gYYYg', '.ggg.'];
const COIN_PAL = { g: '#B8901A', Y: PALETTE.gold, W: PALETTE.cream };
const IPAL = jokerIconPalette();
const JOKER_ICON = { cell: IC_MAGNIFIER, word: IC_WAND, free: IC_GIFT };

function CalmBackground() {
  return (
    <LinearGradient colors={['#A6E3F5', '#82CDEC', '#5FB6DF']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
  );
}

// Ortak satır: [ikon] [ad + açıklama (+rozet)] [sağ aksiyon]
function ShopRow({ icon, title, subtitle, badge, right, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.row, disabled && styles.rowOff, pressed && !disabled && styles.pressed]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

// Oyun-içi altın fiyatı (jetonlu pill)
const GoldPrice = ({ value }) => (
  <View style={styles.goldPill}>
    <PixelArt matrix={COIN} pixelSize={3} palette={COIN_PAL} />
    <Text style={styles.goldPillText}>{value}</Text>
  </View>
);
// Gerçek para fiyatı (dolgu gold buton)
const MoneyPrice = ({ label, busy }) => (
  <View style={styles.moneyBtn}>{busy ? <ActivityIndicator size="small" color={PALETTE.outline} /> : <Text style={styles.moneyBtnText}>{label}</Text>}</View>
);

export default function StoreScreen({ navigation }) {
  const {
    coins, buyJoker, creditPurchase, addCoins,
    adsRemoved, removeAds,
    themes, ownedThemes, equippedTheme, buyTheme, equipTheme,
  } = useEconomy();
  const [packs, setPacks] = useState(null);
  const [busy, setBusy] = useState(null);
  const [adBusy, setAdBusy] = useState(false);
  const [removeAdsPrice, setRemoveAdsPrice] = useState('');
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await getGoldPacks();
      const rap = await getRemoveAdsPrice();
      if (!alive) return;
      setPacks(list);
      setRemoveAdsPrice(rap);
    })();
    return () => { alive = false; };
  }, []);

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 1600); };

  const onBuyJoker = (type) => {
    const res = buyJoker(type);
    if (res.ok) showFlash(`${JOKER_META[type].name} alındı!`);
    else if (res.reason === 'coins') showFlash('Yetersiz altın');
  };

  const onBuyGold = async (pack) => {
    if (busy) return;
    setBusy(pack.id);
    const res = await purchaseGold(pack);
    setBusy(null);
    if (res.ok) { creditPurchase(res.coins); showFlash(`+${res.coins} altın eklendi!`); }
    else if (!res.cancelled) Alert.alert('Satın alma başarısız', res.error || 'Tekrar dene.');
  };

  const onRestore = async () => {
    const res = await restorePurchases();
    showFlash(res.ok ? 'Satın alımlar geri yüklendi.' : 'Geri yükleme başarısız.');
  };

  const onWatchAd = async () => {
    if (adBusy) return;
    setAdBusy(true);
    const res = await showRewardedAd();
    setAdBusy(false);
    if (res.ok) { addCoins(AD_REWARD); showFlash(`+${AD_REWARD} altın kazandın!`); }
    else showFlash('Reklam yüklenemedi, tekrar dene.');
  };

  const onRemoveAds = async () => {
    if (busy) return;
    setBusy('removeads');
    const res = await purchaseRemoveAds();
    setBusy(null);
    if (res.ok) { removeAds(); showFlash('Reklamlar kaldırıldı!'); }
    else if (!res.cancelled) Alert.alert('Satın alma başarısız', res.error || 'Tekrar dene.');
  };

  const onTheme = (t) => {
    if (t.id === equippedTheme) return;
    if (ownedThemes.includes(t.id)) { equipTheme(t.id); showFlash(`${t.name} kuşanıldı`); return; }
    if (t.reward) { showFlash('Tüm damgaları topla → açılır'); return; } // satın alınamaz, %100 ödülü
    const res = buyTheme(t.id);
    if (res.ok) { equipTheme(t.id); showFlash(`${t.name} alındı ve kuşanıldı`); }
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
        {/* Öne çıkan: reklam izle → bedava altın */}
        <Pressable onPress={onWatchAd} disabled={adBusy} style={({ pressed }) => [styles.hero, pressed && !adBusy && styles.pressed]}>
          <View style={styles.heroIcon}><Text style={styles.heroPlay}>▶</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Bedava Altın</Text>
            <Text style={styles.heroSub}>Kısa bir reklam izle, altın kazan</Text>
          </View>
          <View style={styles.heroReward}>
            {adBusy ? <ActivityIndicator color={PALETTE.outline} /> : (
              <><PixelArt matrix={COIN} pixelSize={3} palette={COIN_PAL} /><Text style={styles.heroRewardText}>+{AD_REWARD}</Text></>
            )}
          </View>
        </Pressable>

        {/* ALTIN PAKETLERİ — öne çıkan grid (ana gelir) */}
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

        {/* HARİTA TEMASI — görünür grid */}
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
                  ) : t.reward ? (
                    <Text style={styles.themeReward}>👑 %100</Text>
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

        {/* JOKERLER — kompakt (altınla) */}
        <Text style={styles.section}>JOKERLER</Text>
        {JOKER_ORDER.map((type) => {
          const m = JOKER_META[type];
          const afford = coins >= m.price;
          return (
            <ShopRow
              key={type}
              icon={<PixelArt matrix={JOKER_ICON[type]} pixelSize={4} palette={IPAL} />}
              title={m.name}
              subtitle={m.desc}
              right={<GoldPrice value={m.price} />}
              disabled={!afford}
              onPress={() => onBuyJoker(type)}
            />
          );
        })}

        {/* Reklamları kaldır */}
        {!adsRemoved && (
          <>
            <Text style={styles.section}>EKSTRALAR</Text>
            <ShopRow
              icon={<Text style={styles.noAds}>⊘</Text>}
              title="Reklamları Kaldır"
              subtitle="Geçiş reklamları bir daha çıkmaz"
              right={<MoneyPrice label={removeAdsPrice || '—'} busy={busy === 'removeads'} />}
              onPress={onRemoveAds}
            />
          </>
        )}

        <Pressable onPress={onRestore} style={styles.restoreBtn} hitSlop={6}>
          <Text style={styles.restoreText}>Satın alımları geri yükle</Text>
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

  // Öne çıkan (hero) reklam
  hero: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: CARD, borderWidth: 3, borderColor: '#5BC98B',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 0,
  },
  heroIcon: { width: 46, height: 46, backgroundColor: '#1F7A4D', borderWidth: 2, borderColor: '#5BC98B', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroPlay: { color: PALETTE.cream, fontSize: 22, marginLeft: 2 },
  heroTitle: { color: '#7BE3A6', fontFamily: FONT.bold, fontSize: 20 },
  heroSub: { color: '#AEB6C8', fontFamily: FONT.medium, fontSize: 14, marginTop: 1 },
  heroReward: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5BC98B', borderWidth: 2, borderColor: PALETTE.cream, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8, minWidth: 58, justifyContent: 'center' },
  heroRewardText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 17, marginLeft: 4 },

  // Ortak satır
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10,
    backgroundColor: CARD, borderWidth: 2, borderColor: BORDER,
  },
  rowOff: { opacity: 0.5 },
  rowIcon: { width: 46, height: 46, backgroundColor: PALETTE.outline, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 19 },
  rowSub: { color: '#AEB6C8', fontFamily: FONT.medium, fontSize: 14, marginTop: 1 },
  badge: { color: PALETTE.outline, backgroundColor: PALETTE.gold, fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 8 },
  noAds: { color: '#FF6F91', fontSize: 26, fontWeight: '900' },

  // Sağ aksiyonlar
  goldPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingHorizontal: 9, paddingVertical: 6, marginLeft: 8 },
  goldPillText: { color: PALETTE.gold, fontFamily: FONT.bold, fontSize: 16, marginLeft: 5 },
  moneyBtn: { backgroundColor: PALETTE.gold, borderWidth: 2, borderColor: PALETTE.cream, paddingHorizontal: 12, paddingVertical: 9, marginLeft: 8, minWidth: 92, alignItems: 'center' },
  moneyBtnText: { color: PALETTE.outline, fontFamily: FONT.bold, fontSize: 16 },

  // Grid (altın paketleri + temalar)
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

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
  themeReward: { color: '#D4A017', fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1 },

  restoreBtn: { alignSelf: 'center', marginTop: 20, paddingVertical: 6 },
  restoreText: { color: PALETTE.outline, opacity: 0.75, fontFamily: FONT.semi, fontSize: 14, textDecorationLine: 'underline' },

  flash: { position: 'absolute', bottom: 40, alignSelf: 'center', left: 30, right: 30, backgroundColor: PALETTE.outline, borderWidth: 2, borderColor: PALETTE.gold, paddingVertical: 12, paddingHorizontal: 16 },
  flashText: { color: PALETTE.cream, fontFamily: FONT.bold, fontSize: 17, textAlign: 'center' },
});
