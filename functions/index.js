// functions/index.js
// Pixel Diorama — sunucu tarafı ekonomi (tam güvenli).
// TÜM altın/joker değişiklikleri BURADA olur; istemci Firestore'a yazamaz.
// Böylece satın alınan altın taklit edilemez.
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// --- Ekonomi sabitleri (client src/economy/config.js ile AYNI tutulmalı) ---
const STARTING_COINS = 0;
const STARTING_JOKERS = { cell: 1, word: 1, free: 1 };
const REWARD_FIRST_SOLVE = 30;
const DAILY_BONUS = 40;
const JOKER_PRICES = { cell: 100, word: 150, free: 250 };
// Mağaza ürün kimliği -> verilecek altın
const GOLD_PACKS = {
  'com.pixeldiorama.gold.small': 250,
  'com.pixeldiorama.gold.medium': 500,
  'com.pixeldiorama.gold.large': 1000,
  'com.pixeldiorama.gold.mega': 5000,
};

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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  return ref;
}

// Kullanıcı belgesini oluştur (yoksa). Giriş/kayıt sonrası istemci çağırır.
exports.ensureUser = onCall(async (req) => {
  const uid = requireAuth(req);
  await ensureUserDoc(uid, req.auth.token);
  return { ok: true };
});

// Bölüm İLK kez çözülünce altın ödülü (tekrar vermez).
exports.claimReward = onCall(async (req) => {
  const uid = requireAuth(req);
  const cityId = String((req.data && req.data.cityId) || '');
  const puzzleId = String((req.data && req.data.puzzleId) || '');
  if (!cityId || !puzzleId) throw new HttpsError('invalid-argument', 'cityId/puzzleId gerekli.');
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

// RevenueCat webhook → DOĞRULANMIŞ satın almada altın ver.
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
  if (!coins) { res.status(200).send('unknown product'); return; }

  const ref = userRef(uid);
  const evtRef = db.collection('processedEvents').doc(eventId);
  try {
    await db.runTransaction(async (tx) => {
      const evt = await tx.get(evtRef);
      if (evt.exists) return; // idempotent — aynı olayı iki kez işleme
      const s = await tx.get(ref);
      if (s.exists) {
        tx.update(ref, { coins: (s.data().coins || 0) + coins });
      } else {
        tx.set(ref, {
          coins: STARTING_COINS + coins,
          jokers: STARTING_JOKERS,
          rewarded: {},
          lastDaily: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      tx.set(evtRef, { uid, productId, coins, at: admin.firestore.FieldValue.serverTimestamp() });
    });
    res.status(200).send('ok');
  } catch (e) {
    console.error('webhook error', e);
    res.status(500).send('error');
  }
});
