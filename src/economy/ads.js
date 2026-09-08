// src/economy/ads.js
// Reklam katmanı (AdMob / react-native-google-mobile-ads).
// - Native modül yalnızca "development build"te çalışır. Expo Go'da otomatik MOCK'a
//   düşer; böylece reklam akışını (ödül verme, geçiş) geliştirmede test edebilirsin.
// - Gerçek reklam birimi kimlikleri app.json -> extra.admob'dan; boşsa TestIds.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Ads = null;
let initPromise = null;
let usingMock = true;

function unitId(kind) {
  const cfg = Constants.expoConfig?.extra?.admob || {};
  return Platform.select({
    ios: kind === 'rewarded' ? cfg.iosRewardedId : cfg.iosInterstitialId,
    android: kind === 'rewarded' ? cfg.androidRewardedId : cfg.androidInterstitialId,
    default: null,
  });
}

export function initAds() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (isExpoGo) { usingMock = true; return { mock: true, reason: 'expo-go' }; }
    try {
      Ads = require('react-native-google-mobile-ads');
      await Ads.default().initialize();
      usingMock = false;
      return { mock: false };
    } catch (e) {
      usingMock = true;
      return { mock: true, reason: String(e?.message || e) };
    }
  })();
  return initPromise;
}

export function isMockAds() { return usingMock; }

// Ödüllü reklam göster. Ödül hak edildiyse { ok:true } döner.
export async function showRewardedAd() {
  const { mock } = await initAds();
  if (mock) {
    await new Promise((r) => setTimeout(r, 700)); // sahte "izleme" süresi
    return { ok: true, mock: true };
  }
  return new Promise((resolve) => {
    try {
      const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = Ads;
      const id = unitId('rewarded') || TestIds.REWARDED;
      const ad = RewardedAd.createForAdRequest(id, { requestNonPersonalizedAdsOnly: true });
      let earned = false;
      const offLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show());
      const offReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; });
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        offLoaded(); offReward(); offClosed();
        resolve({ ok: earned });
      });
      const offError = ad.addAdEventListener(AdEventType.ERROR, (e) => {
        offLoaded(); offReward(); offClosed(); offError();
        resolve({ ok: false, error: String(e?.message || e) });
      });
      ad.load();
    } catch (e) {
      resolve({ ok: false, error: String(e?.message || e) });
    }
  });
}

// Geçiş reklamı göster (reklamlar kaldırılmadıysa). { ok } döner.
export async function showInterstitial() {
  const { mock } = await initAds();
  if (mock) { return { ok: true, mock: true }; }
  return new Promise((resolve) => {
    try {
      const { InterstitialAd, AdEventType, TestIds } = Ads;
      const id = unitId('interstitial') || TestIds.INTERSTITIAL;
      const ad = InterstitialAd.createForAdRequest(id, { requestNonPersonalizedAdsOnly: true });
      const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => ad.show());
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => { offLoaded(); offClosed(); resolve({ ok: true }); });
      const offError = ad.addAdEventListener(AdEventType.ERROR, () => { offLoaded(); offClosed(); offError(); resolve({ ok: false }); });
      ad.load();
    } catch (e) {
      resolve({ ok: false, error: String(e?.message || e) });
    }
  });
}
