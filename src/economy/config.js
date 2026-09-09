// src/economy/config.js
// Oyun ekonomisi ayarları — tek kaynak.
//
// ÖNEMLİ (Apple/Google): Gerçek PARA fiyatları burada TUTULMAZ. Altın paketlerinin
// fiyatı çalışma anında mağazadan (App Store Connect / Play Console)
// çekilir. Burada yalnızca oyun-içi tasarım değerleri (altın miktarı, joker fiyatı)
// bulunur; bunlar sanal para olduğu için koda yazılabilir.

// --- Jokerler: oyun-içi ALTIN ile fiyatlandırılır ---
export const JOKER_META = {
  cell: { key: 'cell', name: 'Tek Harf', desc: 'Seçili kutuyu açar', price: 100 },
  free: { key: 'free', name: 'Bedava Kelime', desc: 'Rastgele kelimeyi çözer', price: 150 },
  word: { key: 'word', name: 'Kelime', desc: 'Seçili kelimeyi çözer', price: 250 },
};
export const JOKER_ORDER = ['cell', 'free', 'word'];

// --- Yeni oyuncu başlangıcı ---
export const STARTING_COINS = 100;      // hoş geldin hediyesi: 100 altın
export const STARTING_JOKERS = { cell: 1, word: 1, free: 1 }; // her jokerden 1'er hediye

// --- Altın kazanma yolları (oyun-içi, ücretsiz) ---
export const REWARD_FIRST_SOLVE = 0;    // tek bir bölüm çözünce altın YOK
export const REWARD_CITY_COMPLETE = 20; // bir şehir %100 bitince +20 altın
export const DAILY_BONUS = 40;          // günde bir kez giriş bonusu (şu an bağlı değil)

// --- Sonsuz Mod (üreticiden, seviye çıktıkça zorluk artar) ---
export const ENDLESS_BASE_REWARD = 12;  // temel altın
export const ENDLESS_LEVEL_STEP = 2;    // seviye başına ek altın
export const ENDLESS_LEVEL_CAP = 40;    // ödül ölçeklemesinin üst sınırı (seviye)

// --- Kozmetikler: harita arka plan temaları (altınla alınır, kuşanılır) ---
// classic ücretsiz ve herkeste var; diğerleri altınla açılır.
// tree: ağaç/çalı yaprak paleti override'ı (G koyu, L açık). fallen: yere düşen
// yaprak renkleri (sonbahar). Verilmezse klasik yeşil dekor kullanılır.
// Fiyat merdiveni TUTARLI: klasik ücretsiz, sonrası eşit +150 adım (150→750). Düşük
// giriş fiyatı (Bahar 150) ilk alımı kolaylaştırır; her tema bir öncekinden 150 pahalı
// → "hepsini topla" dürtüsü; Gece (750) premium çapa. Adım = joker/paket ile aynı 150 dilimi.
export const THEMES = [
  { id: 'classic', name: 'Klasik',     price: 0,   sky: '#8FD9F2', skyBottom: '#CFF3D6', grass: '#5FC17E', grassDark: '#3E9E5E' },
  { id: 'spring',  name: 'Bahar',      price: 150, sky: '#F6C9E0', skyBottom: '#FCE6F2', grass: '#86DB90', grassDark: '#5BB268' },
  { id: 'sunset',  name: 'Gün Batımı', price: 300, sky: '#FF9466', skyBottom: '#FFC98C', grass: '#A56B4E', grassDark: '#7A4A38' },
  { id: 'autumn',  name: 'Sonbahar',   price: 450, sky: '#F0B570', skyBottom: '#F7D9A8', grass: '#C67A3C', grassDark: '#94571F',
    tree: { G: '#C0662A', L: '#E4953A' }, fallen: ['#C4622A', '#E0973E', '#A8442A', '#D9832F'] },
  { id: 'winter',  name: 'Kış',        price: 600, sky: '#CFE8F4', skyBottom: '#EDF7FC', grass: '#DCEBEF', grassDark: '#AFC8D2',
    tree: { G: '#BBD4DE', L: '#FFFFFF' } },
  { id: 'night',   name: 'Gece',       price: 750, sky: '#2C3E6B', skyBottom: '#48688F', grass: '#2E7D5B', grassDark: '#1F5E43' },
];
export const DEFAULT_THEME = 'classic';
export const getTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

// --- Gerçek PARA ile satılan altın paketleri ---
// coins/bonus = verilecek altın (oyun tasarımı). productId = mağaza ürün kimliği.
// FİYAT burada yok; mağazadan gelir (bkz. iap.js -> priceString).
// productId = App Store Connect'teki BİREBİR ürün kimliği (bundle id'den bağımsız).
export const GOLD_PACKS = [
  { id: 'gold_small',  productId: 'com.devast.developerteam.crosspix.gold1000',  coins: 1000,  bonus: 0, tag: null },
  { id: 'gold_medium', productId: 'com.devast.developerteam.crosspix.gold2000',  coins: 2000,  bonus: 0, tag: 'POPÜLER' },
  { id: 'gold_large',  productId: 'com.devast.developerteam.crosspix.gold5000',  coins: 5000,  bonus: 0, tag: 'EN İYİ' },
  { id: 'gold_mega',   productId: 'com.devast.developerteam.crosspix.gold10000', coins: 10000, bonus: 0, tag: 'MEGA' },
];

// Yer tutucu fiyatlar — SADECE mağaza bağlı değilken (Expo Go / ürün eklenmeden)
// gösterilir. Yayında gerçek fiyat mağazadan (StoreKit) gelir, bunlar kullanılmaz.
export const PLACEHOLDER_PRICES = { gold_small: '₺29,99', gold_medium: '₺54,99', gold_large: '₺99,99', gold_mega: '₺199,99' };
