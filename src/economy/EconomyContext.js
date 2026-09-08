// src/economy/EconomyContext.js
// Firestore ile senkron cüzdan (ücretsiz Spark planı — Cloud Functions YOK).
// Yetkili kaynak = Firestore users/{uid}. İstemci kendi belgesini okur/yazar
// (güvenlik kuralları: herkes yalnızca kendi belgesine erişir → başkasının
// verisine dokunulamaz). Aksiyonlar yerelde hemen uygulanır (akıcı UX) + Firestore'a
// `increment` ile yazılır; canlı snapshot gerçek değeri yansıtır.
// NOT: Oyun-içi altın ekonomisi istemci taraflıdır. Gerçek para satın almalar
// Apple makbuz doğrulamasıyla (react-native-iap) korunur. Tam sunucu-otoriter güvenlik
// istersen Blaze'e geç, functions/index.js'i deploy et ve aksiyonları oradaki
// Cloud Functions'a bağla (kod hazır).
// AsyncStorage yalnızca çevrimdışı GÖSTERİM önbelleği.
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc, increment, arrayUnion, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../auth/AuthContext';
import { getPack, getCity, isCityComplete } from '../data/cities';
import { setPurchaseListeners, finishPurchase, PRODUCT_COINS } from './iap';
import {
  STARTING_COINS, STARTING_JOKERS, JOKER_META, REWARD_FIRST_SOLVE, REWARD_CITY_COMPLETE, DAILY_BONUS,
  THEMES, DEFAULT_THEME, getTheme,
  ENDLESS_BASE_REWARD, ENDLESS_LEVEL_STEP, ENDLESS_LEVEL_CAP,
} from './config';

const EconomyContext = createContext(null);
const cacheKey = (uid) => `pd.economy.${uid}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

// Joker sayıları asla 0'ın altına düşmesin (eski/bozuk veriyi de temizler).
const normJokers = (j) => {
  const m = { ...STARTING_JOKERS, ...(j || {}) };
  return {
    cell: Math.max(0, Number(m.cell) || 0),
    word: Math.max(0, Number(m.word) || 0),
    free: Math.max(0, Number(m.free) || 0),
  };
};
const hasNegativeJoker = (j) => !!j && ['cell', 'word', 'free'].some((k) => (Number(j[k]) || 0) < 0);

export function EconomyProvider({ children }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [jokers, setJokers] = useState(STARTING_JOKERS);
  const [rewarded, setRewarded] = useState({});
  const [lastDaily, setLastDaily] = useState(null);
  const [ownedThemes, setOwnedThemes] = useState([DEFAULT_THEME]);
  const [equippedTheme, setEquippedTheme] = useState(DEFAULT_THEME);
  const [ownedPacks, setOwnedPacks] = useState([]);
  const [endlessLevel, setEndlessLevel] = useState(1);  // sonsuz mod güncel seviye
  const [claimedMilestones, setClaimedMilestones] = useState([]); // alınan hatıra kilometre taşları (n)
  // Bölüm-içi ilerleme: { "cityId:puzzleId": [çözülmüş ipucu id'leri] } — bulmacadan
  // çıkıp tekrar girince çözülen kelimeler yerinde kalsın + bölüm yüzdesi hesaplansın.
  const [puzzleProgress, setPuzzleProgress] = useState({});
  const [purchaseEvent, setPurchaseEvent] = useState(null); // { ok, coins?, cancelled?, error? } — StoreScreen dinler

  useEffect(() => {
    if (!user) {
      setReady(false);
      setCoins(STARTING_COINS); setJokers(STARTING_JOKERS); setRewarded({}); setLastDaily(null);
      setOwnedThemes([DEFAULT_THEME]); setEquippedTheme(DEFAULT_THEME); setOwnedPacks([]);
      setEndlessLevel(1); setClaimedMilestones([]); setPuzzleProgress({});
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
          if (s.jokers) setJokers(normJokers(s.jokers));
          if (s.rewarded) setRewarded(s.rewarded);
          if (s.lastDaily) setLastDaily(s.lastDaily);
          if (Array.isArray(s.ownedThemes) && s.ownedThemes.length) setOwnedThemes(s.ownedThemes);
          if (s.equippedTheme) setEquippedTheme(s.equippedTheme);
          if (Array.isArray(s.ownedPacks)) setOwnedPacks(s.ownedPacks);
          if (typeof s.endlessLevel === 'number') setEndlessLevel(s.endlessLevel);
          if (Array.isArray(s.claimedMilestones)) setClaimedMilestones(s.claimedMilestones);
          if (s.puzzleProgress && typeof s.puzzleProgress === 'object') setPuzzleProgress(s.puzzleProgress);
        }
      } catch (e) { /* yoksay */ }

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
              ownedThemes: [DEFAULT_THEME],
              equippedTheme: DEFAULT_THEME,
              ownedPacks: [],
              endlessLevel: 1,
              claimedMilestones: [],
              puzzleProgress: {},
              createdAt: serverTimestamp(),
            }).catch(() => {});
            setReady(true);
            return; // oluşturma yeni snapshot tetikler
          }
          const d = snap.data();
          setCoins(d.coins || 0);
          setJokers(normJokers(d.jokers));
          // Eskiden eksiye düşmüş joker verisi varsa Firestore'da bir kez onar.
          if (hasNegativeJoker(d.jokers)) setDoc(ref, { jokers: normJokers(d.jokers) }, { merge: true }).catch(() => {});
          setRewarded(d.rewarded || {});
          setLastDaily(d.lastDaily || null);
          setOwnedThemes(Array.isArray(d.ownedThemes) && d.ownedThemes.length ? d.ownedThemes : [DEFAULT_THEME]);
          setEquippedTheme(d.equippedTheme || DEFAULT_THEME);
          setOwnedPacks(Array.isArray(d.ownedPacks) ? d.ownedPacks : []);
          setEndlessLevel(typeof d.endlessLevel === 'number' ? d.endlessLevel : 1);
          setClaimedMilestones(Array.isArray(d.claimedMilestones) ? d.claimedMilestones : []);
          setPuzzleProgress(d.puzzleProgress && typeof d.puzzleProgress === 'object' ? d.puzzleProgress : {});
          setReady(true);
          AsyncStorage.setItem(cacheKey(user.uid), JSON.stringify({
            coins: d.coins, jokers: d.jokers, rewarded: d.rewarded, lastDaily: d.lastDaily,
            ownedThemes: d.ownedThemes, equippedTheme: d.equippedTheme, ownedPacks: d.ownedPacks,
            endlessLevel: d.endlessLevel,
            claimedMilestones: d.claimedMilestones,
            puzzleProgress: d.puzzleProgress,
          })).catch(() => {});
        },
        () => { if (alive) setReady(true); }
      );
    })();
    return () => { alive = false; unsub(); };
  }, [user]);

  // Satın alma dinleyicisi: Apple satın almayı onaylayınca altını Firebase'e yaz +
  // işlemi kapat (finishTransaction). Uygulama açılışında bekleyen işlemler de düşer.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    let cleanup = () => {};
    (async () => {
      const off = await setPurchaseListeners({
        onPurchase: async (purchase) => {
          // Yalnızca gerçekten SATIN ALINMIŞ (onaylanmış) işlemler altın verir.
          // Bekleyen ("Ask to Buy" / deferred) işlemler onaylanana kadar geçilir
          // ve finishTransaction YAPILMAZ (onaylanınca dinleyici tekrar tetiklenir).
          if (purchase && purchase.purchaseState && purchase.purchaseState !== 'purchased') {
            // Beklemede: mağaza ekranındaki "işleniyor" kilidini sessizce serbest bırak.
            if (alive) setPurchaseEvent({ ok: false, pending: true });
            return;
          }
          const amount = PRODUCT_COINS[purchase && purchase.productId];
          const txId = (purchase && (purchase.transactionId || purchase.id)) || null;
          if (amount && txId) {
            try {
              // Idempotency: aynı işlem (transactionId) iki kez altın vermesin.
              // iOS bitmeyen işlemleri her açılışta tekrar gönderir; atomik kontrol+yaz.
              const ref = doc(db, 'users', user.uid);
              const already = await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                const d = snap.exists() ? snap.data() : {};
                if (d.processedTx && d.processedTx[txId]) return true;
                tx.set(ref, { coins: increment(amount), processedTx: { [txId]: true } }, { merge: true });
                return false;
              });
              if (!already && alive) {
                setCoins((c) => c + amount);
                setPurchaseEvent({ ok: true, coins: amount });
              }
            } catch (e) {
              return; // yazılamadı → finishTransaction YAPMA (iOS tekrar dener)
            }
          } else if (amount && !txId) {
            // transactionId yoksa (nadir): idempotency uygulanamaz ama altın MUTLAKA
            // Firestore'a yazılmalı; yoksa bir sonraki snapshot'ta yerel artış silinir.
            write({ coins: increment(amount) });
            if (alive) {
              setCoins((c) => c + amount);
              setPurchaseEvent({ ok: true, coins: amount });
            }
          }
          await finishPurchase(purchase);
        },
        onError: (err) => {
          // İptal/hata UI'a bildirilir (StoreScreen dinler).
          const code = String((err && err.code) || '');
          const cancelled = code === 'E_USER_CANCELLED' || code.toUpperCase().includes('CANCEL');
          if (alive) setPurchaseEvent({ ok: false, cancelled, error: String((err && err.message) || err || '') });
        },
      });
      if (alive) cleanup = off; else off();
    })();
    return () => { alive = false; cleanup(); };
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
    setJokers((j) => ({ ...j, [type]: Math.max(0, (j[type] || 0) - 1) }));
    write({ jokers: { [type]: increment(-1) } });
    return true;
  };

  // Bir bölüm çözülünce: tek bölüm için altın YOK (REWARD_FIRST_SOLVE=0). Ama bu çözüm
  // ŞEHRİ %100 bitiriyorsa +REWARD_CITY_COMPLETE (20) altın verilir (yalnızca ilk kez).
  const rewardPuzzle = (cityId, puzzleId) => {
    const key = `${cityId}:${puzzleId}`;
    if (rewarded[key]) return 0;
    const nextRewarded = { ...rewarded, [key]: true };
    setRewarded(nextRewarded);
    const city = getCity(cityId);
    const cityJustCompleted = !!city && isCityComplete(city, nextRewarded);
    const gold = REWARD_FIRST_SOLVE + (cityJustCompleted ? REWARD_CITY_COMPLETE : 0);
    if (gold > 0) setCoins((c) => c + gold);
    write({
      rewarded: { [key]: true },
      ...(gold > 0 ? { coins: increment(gold) } : {}),
    });
    return gold;
  };

  // Bölüm-içi ilerlemeyi (çözülmüş ipucu id'leri) kaydet — bulmacadan çıkıp tekrar
  // girince çözülen kelimeler yerinde kalır; bölüm listesinde yüzde de buradan gelir.
  const savePuzzleProgress = (cityId, puzzleId, solvedIds) => {
    if (!cityId || !puzzleId) return;
    const key = `${cityId}:${puzzleId}`;
    const arr = Array.isArray(solvedIds) ? solvedIds : [];
    setPuzzleProgress((p) => ({ ...p, [key]: arr }));
    write({ puzzleProgress: { [key]: arr } });
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

  // Satın alma sonrası altın (mock/test için). Gerçekte Apple onayı dinleyicide işlenir.
  const creditPurchase = (amount) => {
    if (!amount) return;
    setCoins((c) => c + amount);
    write({ coins: increment(amount) });
  };

  // Tema satın al (ALTIN ile).
  const buyTheme = (themeId) => {
    const t = getTheme(themeId);
    if (!t) return { ok: false, reason: 'unknown' };
    if (ownedThemes.includes(themeId)) return { ok: true, already: true };
    if (coins < t.price) return { ok: false, reason: 'coins' };
    setCoins((c) => c - t.price);
    setOwnedThemes((o) => (o.includes(themeId) ? o : [...o, themeId]));
    setEquippedTheme(themeId); // satın alınca aynı anda kuşan (stale closure sorunu yok)
    write({ coins: increment(-t.price), ownedThemes: arrayUnion(themeId), equippedTheme: themeId });
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
    setOwnedPacks((o) => (o.includes(packId) ? o : [...o, packId]));
    write({ coins: increment(-p.price), ownedPacks: arrayUnion(packId) });
    return { ok: true };
  };
  const packOwned = (packId) => ownedPacks.includes(packId);

  // Hatıra kilometre taşı ödülünü al (bir kez). n = eşik, collected = o an biriken hatıra sayısı.
  const claimMilestone = (n, reward, collected, themeId) => {
    if (claimedMilestones.includes(n)) return { ok: false, reason: 'already' };
    if (collected < n) return { ok: false, reason: 'locked' };
    setCoins((c) => c + reward);
    setClaimedMilestones((m) => (m.includes(n) ? m : [...m, n]));
    const patch = { coins: increment(reward), claimedMilestones: arrayUnion(n) };
    let gotTheme = null;
    if (themeId && !ownedThemes.includes(themeId)) {
      gotTheme = themeId;
      setOwnedThemes((o) => (o.includes(themeId) ? o : [...o, themeId]));
      patch.ownedThemes = arrayUnion(themeId);
    }
    write(patch);
    return { ok: true, reward, theme: gotTheme };
  };

  return (
    <EconomyContext.Provider
      value={{
        ready, coins, jokers, purchaseEvent,
        buyJoker, useJoker, rewardPuzzle, canClaimDaily, claimDaily, creditPurchase,
        themes: THEMES, ownedThemes, equippedTheme, theme, buyTheme, equipTheme,
        ownedPacks, buyPack, packOwned,
        rewarded,
        puzzleProgress, savePuzzleProgress,
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
