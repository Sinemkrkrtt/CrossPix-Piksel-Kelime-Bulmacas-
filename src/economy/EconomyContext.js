// src/economy/EconomyContext.js
// Firestore ile senkron cüzdan (ücretsiz Spark planı — Cloud Functions YOK).
// Yetkili kaynak = Firestore users/{uid}. İstemci kendi belgesini okur/yazar
// (güvenlik kuralları: herkes yalnızca kendi belgesine erişir → başkasının
// verisine dokunulamaz). Aksiyonlar yerelde hemen uygulanır (akıcı UX) + Firestore'a
// `increment` ile yazılır; canlı snapshot gerçek değeri yansıtır.
// AsyncStorage yalnızca çevrimdışı GÖSTERİM önbelleği.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../auth/AuthContext';
import { getPack } from '../data/cities';
import { setIapUser } from './iap';
import {
  STARTING_COINS, STARTING_JOKERS, JOKER_META, REWARD_FIRST_SOLVE, DAILY_BONUS,
  THEMES, DEFAULT_THEME, getTheme, INTERSTITIAL_EVERY,
  ENDLESS_BASE_REWARD, ENDLESS_LEVEL_STEP, ENDLESS_LEVEL_CAP,
} from './config';

const EconomyContext = createContext(null);
const cacheKey = (uid) => `pd.economy.${uid}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

export function EconomyProvider({ children }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [jokers, setJokers] = useState(STARTING_JOKERS);
  const [rewarded, setRewarded] = useState({});
  const [lastDaily, setLastDaily] = useState(null);
  const [adsRemoved, setAdsRemoved] = useState(false);
  const [ownedThemes, setOwnedThemes] = useState([DEFAULT_THEME]);
  const [equippedTheme, setEquippedTheme] = useState(DEFAULT_THEME);
  const [ownedPacks, setOwnedPacks] = useState([]);
  const [endlessLevel, setEndlessLevel] = useState(1);  // sonsuz mod güncel seviye
  const [claimedMilestones, setClaimedMilestones] = useState([]); // alınan hatıra kilometre taşları (n)
  const solveTick = useRef(0); // geçiş reklamı sayacı

  useEffect(() => {
    if (!user) {
      setReady(false);
      setCoins(STARTING_COINS); setJokers(STARTING_JOKERS); setRewarded({}); setLastDaily(null);
      setAdsRemoved(false); setOwnedThemes([DEFAULT_THEME]); setEquippedTheme(DEFAULT_THEME); setOwnedPacks([]);
      setEndlessLevel(1); setClaimedMilestones([]);
      return;
    }
    let alive = true;
    let unsub = () => {};
    const ref = doc(db, 'users', user.uid);
    (async () => {
      // 1) Çevrimdışı gösterim için önbellek
      try {
        const raw = await AsyncStorage.getItem(cacheKey(user.uid));
        if (alive && raw) {
          const s = JSON.parse(raw);
          if (typeof s.coins === 'number') setCoins(s.coins);
          if (s.jokers) setJokers({ ...STARTING_JOKERS, ...s.jokers });
          if (s.rewarded) setRewarded(s.rewarded);
          if (s.lastDaily) setLastDaily(s.lastDaily);
          if (typeof s.adsRemoved === 'boolean') setAdsRemoved(s.adsRemoved);
          if (Array.isArray(s.ownedThemes) && s.ownedThemes.length) setOwnedThemes(s.ownedThemes);
          if (s.equippedTheme) setEquippedTheme(s.equippedTheme);
          if (Array.isArray(s.ownedPacks)) setOwnedPacks(s.ownedPacks);
          if (typeof s.endlessLevel === 'number') setEndlessLevel(s.endlessLevel);
          if (Array.isArray(s.claimedMilestones)) setClaimedMilestones(s.claimedMilestones);
        }
      } catch (e) { /* yoksay */ }

      setIapUser(user.uid); // RevenueCat kimliğini kullanıcıya bağla (satın alma ilişkisi)

      // 2) Sunucu belgesini canlı dinle; yoksa oluştur.
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (!alive) return;
          if (!snap.exists()) {
            setDoc(ref, {
              email: user.email || null,
              displayName: user.displayName || null,
              coins: STARTING_COINS,
              jokers: STARTING_JOKERS,
              rewarded: {},
              lastDaily: null,
              adsRemoved: false,
              ownedThemes: [DEFAULT_THEME],
              equippedTheme: DEFAULT_THEME,
              ownedPacks: [],
              endlessLevel: 1,
              claimedMilestones: [],
              createdAt: serverTimestamp(),
            }).catch(() => {});
            setReady(true);
            return; // oluşturma yeni snapshot tetikler
          }
          const d = snap.data();
          setCoins(d.coins || 0);
          setJokers({ ...STARTING_JOKERS, ...(d.jokers || {}) });
          setRewarded(d.rewarded || {});
          setLastDaily(d.lastDaily || null);
          setAdsRemoved(!!d.adsRemoved);
          setOwnedThemes(Array.isArray(d.ownedThemes) && d.ownedThemes.length ? d.ownedThemes : [DEFAULT_THEME]);
          setEquippedTheme(d.equippedTheme || DEFAULT_THEME);
          setOwnedPacks(Array.isArray(d.ownedPacks) ? d.ownedPacks : []);
          setEndlessLevel(typeof d.endlessLevel === 'number' ? d.endlessLevel : 1);
          setClaimedMilestones(Array.isArray(d.claimedMilestones) ? d.claimedMilestones : []);
          setReady(true);
          AsyncStorage.setItem(cacheKey(user.uid), JSON.stringify({
            coins: d.coins, jokers: d.jokers, rewarded: d.rewarded, lastDaily: d.lastDaily,
            adsRemoved: d.adsRemoved, ownedThemes: d.ownedThemes, equippedTheme: d.equippedTheme, ownedPacks: d.ownedPacks,
            endlessLevel: d.endlessLevel,
            claimedMilestones: d.claimedMilestones,
          })).catch(() => {});
        },
        () => { if (alive) setReady(true); }
      );
    })();
    return () => { alive = false; unsub(); };
  }, [user]);

  // Firestore'a birleştirmeli (merge) yaz — belge yoksa oluşturur, increment 0'dan başlar.
  const write = (data) => {
    if (!user) return;
    setDoc(doc(db, 'users', user.uid), data, { merge: true }).catch(() => {});
  };

  // --- Aksiyonlar: yerelde HEMEN uygula + Firestore'a yaz ---
  const buyJoker = (type) => {
    const meta = JOKER_META[type];
    if (!meta) return { ok: false, reason: 'unknown' };
    if (coins < meta.price) return { ok: false, reason: 'coins' };
    setCoins((c) => c - meta.price);
    setJokers((j) => ({ ...j, [type]: (j[type] || 0) + 1 }));
    write({ coins: increment(-meta.price), jokers: { [type]: increment(1) } });
    return { ok: true };
  };

  const useJoker = (type) => {
    if ((jokers[type] || 0) <= 0) return false;
    setJokers((j) => ({ ...j, [type]: j[type] - 1 }));
    write({ jokers: { [type]: increment(-1) } });
    return true;
  };

  const rewardPuzzle = (cityId, puzzleId) => {
    const key = `${cityId}:${puzzleId}`;
    if (rewarded[key]) return 0;
    setRewarded((r) => ({ ...r, [key]: true }));
    setCoins((c) => c + REWARD_FIRST_SOLVE);
    write({ coins: increment(REWARD_FIRST_SOLVE), rewarded: { [key]: true } });
    return REWARD_FIRST_SOLVE;
  };

  // --- Sonsuz Mod: bir seviye çözülünce ödül + bir sonraki seviyeye ilerle ---
  const solveEndless = (level) => {
    const nextLevel = level + 1;
    const reward = ENDLESS_BASE_REWARD + Math.min(level, ENDLESS_LEVEL_CAP) * ENDLESS_LEVEL_STEP;
    setEndlessLevel(nextLevel);
    setCoins((c) => c + reward);
    write({ coins: increment(reward), endlessLevel: nextLevel });
    return { got: reward, level: nextLevel };
  };

  const canClaimDaily = ready && lastDaily !== todayStr();
  const claimDaily = () => {
    if (lastDaily === todayStr()) return 0;
    const today = todayStr();
    setLastDaily(today);
    setCoins((c) => c + DAILY_BONUS);
    write({ coins: increment(DAILY_BONUS), lastDaily: today });
    return DAILY_BONUS;
  };

  // Satın alma sonrası altın ekle (RevenueCat doğruladıktan sonra).
  const creditPurchase = (amount) => {
    if (!amount) return;
    setCoins((c) => c + amount);
    write({ coins: increment(amount) });
  };

  // Genel altın ekleme (ödüllü reklam vb.).
  const addCoins = (amount) => {
    if (!amount) return;
    setCoins((c) => c + amount);
    write({ coins: increment(amount) });
  };

  // Reklamları kaldır (IAP doğrulandıktan sonra).
  const removeAds = () => {
    setAdsRemoved(true);
    write({ adsRemoved: true });
  };

  // Tema satın al (ALTIN ile).
  const buyTheme = (themeId) => {
    const t = getTheme(themeId);
    if (!t) return { ok: false, reason: 'unknown' };
    if (ownedThemes.includes(themeId)) return { ok: true, already: true };
    if (coins < t.price) return { ok: false, reason: 'coins' };
    setCoins((c) => c - t.price);
    setOwnedThemes((o) => [...o, themeId]);
    write({ coins: increment(-t.price), ownedThemes: [...ownedThemes, themeId] });
    return { ok: true };
  };

  const equipTheme = (themeId) => {
    if (!ownedThemes.includes(themeId)) return false;
    setEquippedTheme(themeId);
    write({ equippedTheme: themeId });
    return true;
  };

  const theme = getTheme(equippedTheme);

  // İçerik paketi satın al (ALTIN ile) — paketin tüm şehirlerini açar.
  const buyPack = (packId) => {
    const p = getPack(packId);
    if (!p) return { ok: false, reason: 'unknown' };
    if (ownedPacks.includes(packId)) return { ok: true, already: true };
    if (coins < p.price) return { ok: false, reason: 'coins' };
    setCoins((c) => c - p.price);
    setOwnedPacks((o) => [...o, packId]);
    write({ coins: increment(-p.price), ownedPacks: [...ownedPacks, packId] });
    return { ok: true };
  };
  const packOwned = (packId) => ownedPacks.includes(packId);

  // Hatıra kilometre taşı ödülünü al (bir kez). n = eşik, collected = o an biriken hatıra sayısı.
  const claimMilestone = (n, reward, collected, themeId) => {
    if (claimedMilestones.includes(n)) return { ok: false, reason: 'already' };
    if (collected < n) return { ok: false, reason: 'locked' };
    setCoins((c) => c + reward);
    setClaimedMilestones((m) => [...m, n]);
    const patch = { coins: increment(reward), claimedMilestones: [...claimedMilestones, n] };
    let gotTheme = null;
    if (themeId && !ownedThemes.includes(themeId)) {
      gotTheme = themeId;
      setOwnedThemes((o) => [...o, themeId]);
      patch.ownedThemes = [...ownedThemes, themeId];
    }
    write(patch);
    return { ok: true, reward, theme: gotTheme };
  };

  // Bölüm bitince çağrılır; geçiş reklamı zamanı geldi mi? (reklamlar kaldırıldıysa asla)
  const shouldShowInterstitial = () => {
    if (adsRemoved) return false;
    solveTick.current += 1;
    return solveTick.current % INTERSTITIAL_EVERY === 0;
  };

  return (
    <EconomyContext.Provider
      value={{
        ready, coins, jokers,
        buyJoker, useJoker, rewardPuzzle, canClaimDaily, claimDaily, creditPurchase, addCoins,
        adsRemoved, removeAds, shouldShowInterstitial,
        themes: THEMES, ownedThemes, equippedTheme, theme, buyTheme, equipTheme,
        ownedPacks, buyPack, packOwned,
        rewarded,
        claimedMilestones, claimMilestone,
        endlessLevel, solveEndless,
      }}
    >
      {children}
    </EconomyContext.Provider>
  );
}

export function useEconomy() {
  const ctx = useContext(EconomyContext);
  if (!ctx) throw new Error('useEconomy, EconomyProvider içinde kullanılmalı');
  return ctx;
}
