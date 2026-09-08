// functions/index.js
// CrossPix — sunucu tarafı ekonomi (tam güvenli, otoriter kaynak).
// TÜM altın/joker/paket/tema/reklamsız değişiklikleri BURADA olur.
// Firestore güvenlik kuralları istemcinin users/{uid} belgesine YAZMASINI ENGELLER;
// bütün mutasyonlar bu Cloud Functions üzerinden (Admin SDK) yapılır. Böylece
// satın alınan altın/paket taklit edilemez.
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// --- Ekonomi sabitleri (client src/economy/config.js + data ile AYNI tutulmalı) ---
const STARTING_COINS = 0;
const STARTING_JOKERS = { cell: 1, word: 1, free: 1 };
const REWARD_FIRST_SOLVE = 30;
const DAILY_BONUS = 40;
const AD_REWARD = 20;
const AD_REWARDS_PER_DAY = 25; // ödüllü reklam günlük üst sınır (farmı sınırlar)

const JOKER_PRICES = { cell: 100, free: 150, word: 250 };

// Sonsuz mod ödülü: BASE + min(level, CAP) * STEP
const ENDLESS_BASE_REWARD = 12;
const ENDLESS_LEVEL_STEP = 2;
const ENDLESS_LEVEL_CAP = 40;

// Temalar (altınla alınır). classic ücretsiz; kasif SATIN ALINAMAZ (yalnız ödül).
const THEME_PRICES = { spring: 150, sunset: 300, autumn: 450, winter: 600, night: 750 };
const ALL_THEME_IDS = ['classic', 'spring', 'sunset', 'autumn', 'winter', 'night', 'kasif'];

// İçerik paketleri (altınla alınır).
const PACK_PRICES = { asya: 500, amerika: 500, afrika: 500, avrupa: 500, sonsuz: 2000 };

// Seyahat Defteri kilometre taşları (hatıra eşiği -> ödül).
const MILESTONES = [
  { n: 5, reward: 200 },
  { n: 10, reward: 400 },
  { n: 20, reward: 800 },
  { n: 30, reward: 1200 },
  { n: 39, reward: 2000, themeId: 'kasif' },
];

// Hatıra sayımı için: geçerli şehir kimlikleri + şehir başına bölüm sayısı (hepsi 7).
const CITY_IDS = [
  'istanbul', 'paris', 'newyork', 'tokyo', 'roma', 'londra', 'barselona', 'amsterdam',
  'kahire', 'berlin', 'dubai', 'bali', 'reykjavik', 'singapur', 'sidney', 'moskova',
  'kapadokya', 'petra', 'honolulu', 'seul', 'pekin', 'bangkok', 'hanoi', 'mumbai',
  'rio', 'meksiko', 'toronto', 'havana', 'lima', 'marakes', 'nairobi', 'kaapstad',
  'lagos', 'tunus', 'prag', 'viyana', 'lizbon', 'venedik', 'atina',
];
const CITY_ID_SET = new Set(CITY_IDS);
const PUZZLES_PER_CITY = 7;

// Gerçek PARA ile alınan altın paketleri (RevenueCat ürün kimliği -> altın).
const GOLD_PACKS = {
  'com.pixeldiorama.gold.small': 500,
  'com.pixeldiorama.gold.medium': 1000,
  'com.pixeldiorama.gold.large': 2000,
  'com.pixeldiorama.gold.mega': 5000,
};
const REMOVE_ADS_PRODUCT = 'com.pixeldiorama.removeads';

// RevenueCat webhook yetki başlığı (RevenueCat panelinde ayarladığın gizli değer).
const REVENUECAT_AUTH = defineSecret('REVENUECAT_AUTH');

const userRef = (uid) => db.collection('users').doc(uid);
const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function requireAuth(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');
  return req.auth.uid;
}

async function ensureUserDoc(uid, token) {
  const ref = userRef(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: (token && token.email) || null,
      displayName: (token && token.name) || null,
      coins: STARTING_COINS,
      jokers: STARTING_JOKERS,
      rewarded: {},
      lastDaily: null,
      adsRemoved: false,
      ownedThemes: ['classic'],
      equippedTheme: 'classic',
      ownedPacks: [],
      endlessLevel: 1,
      claimedMilestones: [],
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  return ref;
}

// Kaç şehir %100 tamamlandı (tüm 7 bölümü ödüllenmiş)?
function souvenirCount(rewarded) {
  const r = rewarded || {};
  let n = 0;
  for (const cityId of CITY_IDS) {
    let all = true;
    for (let p = 1; p <= PUZZLES_PER_CITY; p++) {
      if (!r[`${cityId}:${p}`]) { all = false; break; }
    }
    if (all) n++;
  }
  return n;
}

// Kullanıcı belgesini oluştur (yoksa). Giriş/kayıt sonrası istemci çağırır.
exports.ensureUser = onCall(async (req) => {
  const uid = requireAuth(req);
  await ensureUserDoc(uid, req.auth.token);
  return { ok: true };
});

// Bölüm İLK kez çözülünce altın ödülü (tekrar vermez). Girdiler doğrulanır.
exports.claimReward = onCall(async (req) => {
  const uid = requireAuth(req);
  const cityId = String((req.data && req.data.cityId) || '');
  const puzzleId = parseInt((req.data && req.data.puzzleId), 10);
  if (!CITY_ID_SET.has(cityId) || !(puzzleId >= 1 && puzzleId <= PUZZLES_PER_CITY)) {
    throw new HttpsError('invalid-argument', 'Geçersiz bölüm.');
  }
  const key = `${cityId}:${puzzleId}`;
  const ref = await ensureUserDoc(uid, req.auth.token);
  const awarded = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    if (d.rewarded && d.rewarded[key]) return 0;
    tx.update(ref, { coins: (d.coins || 0) + REWARD_FIRST_SOLVE, [`rewarded.${key}`]: true });
    return REWARD_FIRST_SOLVE;
  });
  return { ok: true, awarded };
});

// Joker satın al (ALTIN ile). Sunucu bakiyeyi kontrol eder.
exports.buyJoker = onCall(async (req) => {
  const uid = requireAuth(req);
  const type = String((req.data && req.data.type) || '');
  const price = JOKER_PRICES[type];
  if (!price) throw new HttpsError('invalid-argument', 'Geçersiz joker.');
  const ref = await ensureUserDoc(uid, req.auth.token);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    if ((d.coins || 0) < price) return { ok: false, reason: 'coins' };
    tx.update(ref, {
      coins: d.coins - price,
      [`jokers.${type}`]: ((d.jokers && d.jokers[type]) || 0) + 1,
    });
    return { ok: true };
  });
});

// Joker kullan (oyun içinde tüketim).
exports.useJoker = onCall(async (req) => {
  const uid = requireAuth(req);
  const type = String((req.data && req.data.type) || '');
  if (!['cell', 'word', 'free'].includes(type)) throw new HttpsError('invalid-argument', 'Geçersiz joker.');
  const ref = await ensureUserDoc(uid, req.auth.token);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const have = (d.jokers && d.jokers[type]) || 0;
    if (have <= 0) return { ok: false, reason: 'empty' };
    tx.update(ref, { [`jokers.${type}`]: have - 1 });
    return { ok: true };
  });
});

// Günlük giriş bonusu (günde bir kez).
exports.claimDaily = onCall(async (req) => {
  const uid = requireAuth(req);
  const ref = await ensureUserDoc(uid, req.auth.token);
  const today = todayStr();
  const awarded = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    if (d.lastDaily === today) return 0;
    tx.update(ref, { coins: (d.coins || 0) + DAILY_BONUS, lastDaily: today });
    return DAILY_BONUS;
  });
  return { ok: true, awarded };
});

// Sonsuz mod: sunucu kendi tuttuğu seviyeye göre ödül verir ve bir seviye ilerletir.
// (İstemcinin gönderdiği seviye YOK SAYILIR → keyfi seviye ödülü alınamaz.)
exports.solveEndless = onCall(async (req) => {
  const uid = requireAuth(req);
  const ref = await ensureUserDoc(uid, req.auth.token);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const level = typeof d.endlessLevel === 'number' ? d.endlessLevel : 1;
    const reward = ENDLESS_BASE_REWARD + Math.min(level, ENDLESS_LEVEL_CAP) * ENDLESS_LEVEL_STEP;
    tx.update(ref, { coins: (d.coins || 0) + reward, endlessLevel: level + 1 });
    return { ok: true, got: reward, level: level + 1 };
  });
});

// Ödüllü reklam altını (günlük üst sınırlı — farmı önler). Miktar SUNUCUDA sabittir.
exports.grantAdReward = onCall(async (req) => {
  const uid = requireAuth(req);
  const ref = await ensureUserDoc(uid, req.auth.token);
  const today = todayStr();
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const day = d.adRewardDay === today ? (d.adRewardCount || 0) : 0;
    if (day >= AD_REWARDS_PER_DAY) return { ok: false, reason: 'limit' };
    tx.update(ref, {
      coins: (d.coins || 0) + AD_REWARD,
      adRewardDay: today,
      adRewardCount: day + 1,
    });
    return { ok: true, awarded: AD_REWARD };
  });
});

// Tema satın al (ALTIN ile). Sunucu fiyat + bakiye kontrol eder.
exports.buyTheme = onCall(async (req) => {
  const uid = requireAuth(req);
  const themeId = String((req.data && req.data.themeId) || '');
  const price = THEME_PRICES[themeId];
  if (!price) throw new HttpsError('invalid-argument', 'Geçersiz tema.'); // kasif/classic satın alınamaz
  const ref = await ensureUserDoc(uid, req.auth.token);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const owned = Array.isArray(d.ownedThemes) ? d.ownedThemes : ['classic'];
    if (owned.includes(themeId)) return { ok: true, already: true };
    if ((d.coins || 0) < price) return { ok: false, reason: 'coins' };
    tx.update(ref, { coins: d.coins - price, ownedThemes: [...owned, themeId] });
    return { ok: true };
  });
});

// Tema kuşan (yalnızca sahip olunan tema).
exports.equipTheme = onCall(async (req) => {
  const uid = requireAuth(req);
  const themeId = String((req.data && req.data.themeId) || '');
  if (!ALL_THEME_IDS.includes(themeId)) throw new HttpsError('invalid-argument', 'Geçersiz tema.');
  const ref = await ensureUserDoc(uid, req.auth.token);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const owned = Array.isArray(d.ownedThemes) ? d.ownedThemes : ['classic'];
    if (!owned.includes(themeId)) return { ok: false, reason: 'not-owned' };
    tx.update(ref, { equippedTheme: themeId });
    return { ok: true };
  });
});

// İçerik paketi satın al (ALTIN ile). Sunucu fiyat + bakiye kontrol eder.
exports.buyPack = onCall(async (req) => {
  const uid = requireAuth(req);
  const packId = String((req.data && req.data.packId) || '');
  const price = PACK_PRICES[packId];
  if (!price) throw new HttpsError('invalid-argument', 'Geçersiz paket.');
  const ref = await ensureUserDoc(uid, req.auth.token);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const owned = Array.isArray(d.ownedPacks) ? d.ownedPacks : [];
    if (owned.includes(packId)) return { ok: true, already: true };
    if ((d.coins || 0) < price) return { ok: false, reason: 'coins' };
    tx.update(ref, { coins: d.coins - price, ownedPacks: [...owned, packId] });
    return { ok: true };
  });
});

// Hatıra kilometre taşı ödülü (bir kez). Sunucu hatıra sayısını DOĞRULAR.
exports.claimMilestone = onCall(async (req) => {
  const uid = requireAuth(req);
  const n = parseInt((req.data && req.data.n), 10);
  const milestone = MILESTONES.find((m) => m.n === n);
  if (!milestone) throw new HttpsError('invalid-argument', 'Geçersiz kilometre taşı.');
  const ref = await ensureUserDoc(uid, req.auth.token);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const claimed = Array.isArray(d.claimedMilestones) ? d.claimedMilestones : [];
    if (claimed.includes(n)) return { ok: false, reason: 'already' };
    if (souvenirCount(d.rewarded) < n) return { ok: false, reason: 'locked' };
    const patch = {
      coins: (d.coins || 0) + milestone.reward,
      claimedMilestones: [...claimed, n],
    };
    let gotTheme = null;
    if (milestone.themeId) {
      const owned = Array.isArray(d.ownedThemes) ? d.ownedThemes : ['classic'];
      if (!owned.includes(milestone.themeId)) {
        gotTheme = milestone.themeId;
        patch.ownedThemes = [...owned, milestone.themeId];
      }
    }
    tx.update(ref, patch);
    return { ok: true, reward: milestone.reward, theme: gotTheme };
  });
});

// RevenueCat webhook → DOĞRULANMIŞ satın almada altın ver / reklamsızı aç.
// RevenueCat panelinde: Integrations → Webhooks → URL = bu fonksiyonun URL'i,
// Authorization header = REVENUECAT_AUTH gizli değeri.
exports.revenueCatWebhook = onRequest({ secrets: [REVENUECAT_AUTH] }, async (req, res) => {
  const expected = REVENUECAT_AUTH.value();
  if (!expected || req.get('Authorization') !== expected) {
    res.status(401).send('unauthorized');
    return;
  }
  const event = req.body && req.body.event;
  if (!event) { res.status(400).send('no event'); return; }

  const CREDIT_TYPES = ['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE'];
  const uid = event.app_user_id;         // Purchases.logIn(uid) sayesinde = Firebase uid
  const productId = event.product_id;
  const eventId = String(event.id || '');
  if (!CREDIT_TYPES.includes(event.type) || !uid || !productId || !eventId) {
    res.status(200).send('ignored');
    return;
  }

  const coins = GOLD_PACKS[productId];
  const isRemoveAds = productId === REMOVE_ADS_PRODUCT;
  if (!coins && !isRemoveAds) { res.status(200).send('unknown product'); return; }

  const ref = userRef(uid);
  const evtRef = db.collection('processedEvents').doc(eventId);
  try {
    await db.runTransaction(async (tx) => {
      const evt = await tx.get(evtRef);
      if (evt.exists) return; // idempotent — aynı olayı iki kez işleme
      const s = await tx.get(ref);
      const patch = {};
      if (coins) patch.coins = ((s.exists && s.data().coins) || 0) + coins;
      if (isRemoveAds) patch.adsRemoved = true;
      if (s.exists) {
        tx.update(ref, patch);
      } else {
        tx.set(ref, {
          coins: STARTING_COINS + (coins || 0),
          jokers: STARTING_JOKERS,
          rewarded: {},
          lastDaily: null,
          adsRemoved: !!isRemoveAds,
          ownedThemes: ['classic'],
          equippedTheme: 'classic',
          ownedPacks: [],
          endlessLevel: 1,
          claimedMilestones: [],
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      tx.set(evtRef, { uid, productId, coins: coins || 0, removeAds: !!isRemoveAds, at: FieldValue.serverTimestamp() });
    });
    res.status(200).send('ok');
  } catch (e) {
    console.error('webhook error', e);
    res.status(500).send('error');
  }
});
