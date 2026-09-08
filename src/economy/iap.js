// src/economy/iap.js
// Gerçek para ile altın satın alma — DOĞRUDAN Apple StoreKit (react-native-iap v16 / OpenIAP).
// RevenueCat YOK, 3. parti YOK. Expo Go'da veya native modül yokken MOCK moda düşer.
//
// Akış: requestGoldPurchase(productId) Apple satın alma popup'ını açar. Sonuç
// purchaseUpdatedListener'a düşer (bkz. EconomyContext); orada altın Firebase'e yazılır
// ve finishTransaction ile işlem kapatılır (tüketilebilir → isConsumable:true).
import Constants from 'expo-constants';
import { GOLD_PACKS, PLACEHOLDER_PRICES } from './config';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let RNIap = null;
let initPromise = null;
let usingMock = true;

export function isMockIAP() { return usingMock; }

// Ürün kimliği -> verilecek altın (dinleyici bununla altını belirler).
export const PRODUCT_COINS = GOLD_PACKS.reduce((acc, p) => {
  acc[p.productId] = p.coins + (p.bonus || 0);
  return acc;
}, {});

const SKUS = GOLD_PACKS.map((p) => p.productId);

// StoreKit bağlantısını bir kez kur. { mock } döner.
export function initIAP() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (isExpoGo) { usingMock = true; return { mock: true, reason: 'expo-go' }; }
    try {
      RNIap = require('react-native-iap');
      await RNIap.initConnection();
      usingMock = false;
      return { mock: false };
    } catch (e) {
      usingMock = true;
      return { mock: true, reason: String(e?.message || e) };
    }
  })();
  return initPromise;
}

// Mağazadaki altın paketleri; fiyat Apple'dan. [{ ...pack, priceString, available }]
export async function getGoldPacks() {
  const { mock } = await initIAP();
  // Expo Go (mock): paketler sahte fiyatla "satın alınabilir" görünür (mock akışı).
  if (mock) return GOLD_PACKS.map((p) => ({ ...p, priceString: PLACEHOLDER_PRICES[p.id] || '—', available: true }));
  try {
    const products = (await RNIap.fetchProducts({ skus: SKUS, type: 'in-app' })) || [];
    return GOLD_PACKS.map((p) => {
      const prod = products.find((x) => x && x.id === p.productId);
      return prod
        ? { ...p, priceString: prod.displayPrice || '—', available: true }
        : { ...p, priceString: '—', available: false };
    });
  } catch (e) {
    return GOLD_PACKS.map((p) => ({ ...p, priceString: '—', available: false }));
  }
}

// Satın alma popup'ını başlatır. Sonuç purchaseUpdatedListener'a düşer.
// { ok } | { cancelled } | { mock } | { ok:false, error }
export async function requestGoldPurchase(productId) {
  const { mock } = await initIAP();
  if (mock) return { mock: true };
  try {
    await RNIap.requestPurchase({
      request: { apple: { sku: productId }, google: { skus: [productId] } },
      type: 'in-app',
    });
    return { ok: true };
  } catch (e) {
    if (RNIap.isUserCancelledError && RNIap.isUserCancelledError(e)) return { cancelled: true };
    if (e && e.code === 'E_USER_CANCELLED') return { cancelled: true };
    return { ok: false, error: String((e && e.message) || e) };
  }
}

// Satın alma / hata dinleyicileri (uygulama başında bir kez kurulur). Temizleyici döner.
export async function setPurchaseListeners({ onPurchase, onError }) {
  const { mock } = await initIAP();
  if (mock || !RNIap) return () => {};
  const sub1 = RNIap.purchaseUpdatedListener((purchase) => { onPurchase && onPurchase(purchase); });
  const sub2 = RNIap.purchaseErrorListener((err) => { onError && onError(err); });
  return () => { try { sub1.remove(); sub2.remove(); } catch (e) { /* yoksay */ } };
}

// Apple'a "altını verdim, işlemi kapat" der. Tüketilebilir → tekrar alınabilsin.
export async function finishPurchase(purchase) {
  if (!RNIap) return;
  try { await RNIap.finishTransaction({ purchase, isConsumable: true }); } catch (e) { /* yoksay */ }
}

// Tüketilebilir altında geri yüklenecek bir şey yoktur; API uyumu için tutulur.
export async function restorePurchases() {
  const { mock } = await initIAP();
  if (mock) return { ok: true, mock: true };
  try { await RNIap.getAvailablePurchases(); return { ok: true }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
