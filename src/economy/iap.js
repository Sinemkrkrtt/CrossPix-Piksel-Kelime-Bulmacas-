// src/economy/iap.js
// Gerçek para ile altın satın alma katmanı (RevenueCat / react-native-purchases).
//
// - Native modül yalnızca "development build"te çalışır. Expo Go'da veya anahtar
//   yokken otomatik olarak MOCK (sahte) sağlayıcıya düşer; böylece uygulama
//   geliştirme sırasında çökmeden çalışır.
// - Fiyatlar HER ZAMAN mağazadan (RevenueCat offerings -> product.priceString)
//   okunur; koda gömülmez. Mock modda sadece açıkça "DEV" etiketli yer tutucular.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { GOLD_PACKS, PLACEHOLDER_PRICES } from './config';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Purchases = null;
let initPromise = null;
let usingMock = true;

function apiKey() {
  const rc = Constants.expoConfig?.extra?.revenueCat || {};
  return Platform.select({ ios: rc.iosKey, android: rc.androidKey, default: null });
}

// RevenueCat'i bir kez başlat. { mock: bool } döner.
export function initIAP() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (isExpoGo) { usingMock = true; return { mock: true, reason: 'expo-go' }; }
    try {
      const mod = require('react-native-purchases');
      Purchases = mod.default || mod;
      const key = apiKey();
      if (!key) { usingMock = true; return { mock: true, reason: 'no-api-key' }; }
      await Purchases.configure({ apiKey: key });
      usingMock = false;
      return { mock: false };
    } catch (e) {
      usingMock = true;
      return { mock: true, reason: String(e?.message || e) };
    }
  })();
  return initPromise;
}

export function isMockIAP() {
  return usingMock;
}

// RevenueCat kullanıcı kimliğini Firebase uid'ine bağla. Böylece webhook,
// satın almayı doğru kullanıcının Firestore belgesine yazabilir.
export async function setIapUser(uid) {
  const { mock } = await initIAP();
  if (mock || !uid) return;
  try { await Purchases.logIn(uid); } catch (e) { /* yoksay */ }
}

// Mağazadaki altın paketleri. priceString mağazadan gelir.
// [{ ...pack, priceString, available, pkg? }]
export async function getGoldPacks() {
  const { mock } = await initIAP();
  if (mock) {
    return GOLD_PACKS.map((p) => ({ ...p, priceString: PLACEHOLDER_PRICES[p.id] || '—', available: false }));
  }
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings?.current?.availablePackages || [];
    return GOLD_PACKS.map((p) => {
      const pkg = pkgs.find((k) => k?.product?.identifier === p.productId);
      return pkg
        ? { ...p, priceString: pkg.product.priceString, available: true, pkg }
        : { ...p, priceString: '—', available: false };
    });
  } catch (e) {
    return GOLD_PACKS.map((p) => ({ ...p, priceString: '—', available: false }));
  }
}

// Satın alma. Başarılıysa { ok:true, coins } (bonus dahil) döner.
export async function purchaseGold(pack) {
  const { mock } = await initIAP();
  const coins = pack.coins + (pack.bonus || 0);
  if (mock) {
    // DEV: sahte satın alma — yalnızca geliştirme için.
    await new Promise((r) => setTimeout(r, 450));
    return { ok: true, coins, mock: true };
  }
  try {
    await Purchases.purchasePackage(pack.pkg);
    return { ok: true, coins, mock: false };
  } catch (e) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: String(e?.message || e) };
  }
}

// Önceki satın alımları geri yükle (App Store gereği "Restore" butonu için).
export async function restorePurchases() {
  const { mock } = await initIAP();
  if (mock) return { ok: true, mock: true };
  try {
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
