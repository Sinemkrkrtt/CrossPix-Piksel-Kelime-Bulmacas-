// src/data/souvenirs.js
// Seyahat Defteri — her şehir %100 bitince o şehrin bir HATIRASI (minyatür landmark) açılır.
// Her şehrin kendine ÖZGÜ, tanınabilir tek-mürekkep landmark damgası vardır ('#' dolu,
// '.' boş). Şehir bitince damga gerçek renginde basılır; bitmeden soluk görünür.

import { CITIES, getPackForCity } from './cities';

// --- Her şehir için ikonik landmark silüeti (damga) ---
const SOUVENIR_SPRITE = {
  // 🇹🇷 İstanbul — kubbe + iki minare (cami)
  istanbul: { name: 'Cami', art: [
    '......#......',
    '.....###.....',
    '....#####....',
    '..#.#####.#..',
    '..#.#####.#..',
    '..#.#####.#..',
    '..#.#####.#..',
    '..#########..',
    '..#########..',
    '.###########.',
  ] },
  // 🇫🇷 Paris — Eyfel Kulesi
  paris: { name: 'Eyfel Kulesi', art: [
    '.....#.....',
    '....###....',
    '....#.#....',
    '...#####...',
    '...#.#.#...',
    '..##.#.##..',
    '.##..#..##.',
    '.#..###..#.',
    '#..#...#..#',
    '#.#.....#.#',
  ] },
  // 🇺🇸 New York — Özgürlük Anıtı (taçlı baş + meşale)
  newyork: { name: 'Özgürlük Anıtı', art: [
    '........#..',
    '.......###.',
    '........#..',
    '........#..',
    '..#..#..#..',
    '.#.##.##.#.',
    '...#####...',
    '...#.#.#...',
    '...#####...',
    '..#######..',
    '.#########.',
  ] },
  // 🇯🇵 Tokyo — Fuji Dağı (kar başlıklı)
  tokyo: { name: 'Fuji Dağı', art: [
    '.....#.....',
    '....###....',
    '....#.#....',
    '...##.##...',
    '...#...#...',
    '..#.....#..',
    '..#.....#..',
    '.#.......#.',
    '#....#....#',
    '###########',
  ] },
  // 🇮🇹 Roma — Kolezyum
  roma: { name: 'Kolezyum', art: [
    '..#######..',
    '.#########.',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '#.........#',
    '.#########.',
    '..#######..',
  ] },
  // 🇬🇧 Londra — Big Ben (saat kulesi)
  londra: { name: 'Big Ben', art: [
    '....#....',
    '...###...',
    '..#####..',
    '..#####..',
    '..#.#.#..',
    '..#####..',
    '..#####..',
    '..#####..',
    '..#####..',
    '.#######.',
  ] },
  // 🇪🇸 Barselona — Sagrada Família (sivri kuleler)
  barselona: { name: 'Sagrada Família', art: [
    '..#..#..#..',
    '..#..#..#..',
    '.###.#.###.',
    '.#.#.#.#.#.',
    '.#########.',
    '.#.#.#.#.#.',
    '.#########.',
    '.#########.',
    '.#########.',
  ] },
  // 🇳🇱 Amsterdam — Yel değirmeni
  amsterdam: { name: 'Yel Değirmeni', art: [
    '#.........#',
    '.#...#...#.',
    '..#..#..#..',
    '...#.#.#...',
    '....###....',
    '....#.#....',
    '...##.##...',
    '...#####...',
    '..#######..',
    '.#########.',
  ] },
  // 🇪🇬 Kahire — Piramitler (Giza, düz üçgen)
  kahire: { name: 'Piramitler', art: [
    '.....#.....',
    '....###....',
    '...##.##...',
    '..##...##..',
    '.##..#..##.',
    '##..###..##',
    '###########',
  ] },
  // 🇩🇪 Berlin — Brandenburg Kapısı
  berlin: { name: 'Brandenburg Kapısı', art: [
    '....#.#....',
    '...#####...',
    '.#########.',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '###########',
  ] },
  // 🇦🇪 Dubai — Burj Khalifa (sivrilen kule)
  dubai: { name: 'Burj Khalifa', art: [
    '.....#.....',
    '.....#.....',
    '....###....',
    '....#.#....',
    '...#####...',
    '...#####...',
    '..#######..',
    '..#######..',
    '.#########.',
    '.#########.',
  ] },
  // 🇮🇩 Bali — Candi Bentar (bölünmüş tapınak kapısı)
  bali: { name: 'Tapınak Kapısı', art: [
    '.##.....##.',
    '.##.....##.',
    '.###...###.',
    '.###...###.',
    '.####.####.',
    '.####.####.',
    '.#########.',
    '.#########.',
    '###########',
  ] },
  // 🇮🇸 Reykjavik — Hallgrímskirkja (eğimli çan kulesi)
  reykjavik: { name: 'Hallgrímskirkja', art: [
    '....#....',
    '...###...',
    '...###...',
    '..#####..',
    '.#######.',
    '#..###..#',
    '...###...',
    '...###...',
    '..#####..',
    '..#####..',
  ] },
  // 🇸🇬 Singapur — Marina Bay Sands (üç kule + gökyüzü teknesi)
  singapur: { name: 'Marina Bay Sands', art: [
    '###########',
    '.#...#...#.',
    '.#...#...#.',
    '.#...#...#.',
    '.#...#...#.',
    '.#...#...#.',
    '.#...#...#.',
    '.#...#...#.',
  ] },
  // 🇦🇺 Sidney — Opera Binası (yelken kabuklar)
  sidney: { name: 'Opera Binası', art: [
    '...#...#...',
    '..##..###..',
    '.###.####..',
    '####.#####.',
    '###########',
  ] },
  // 🇷🇺 Moskova — Aziz Vasil (soğan kubbeler)
  moskova: { name: 'Aziz Vasil Katedrali', art: [
    '..#..#..#..',
    '.###.#.###.',
    '.#.#.#.#.#.',
    '.###.#.###.',
    '.#########.',
    '.#.#.#.#.#.',
    '.#########.',
    '.#########.',
  ] },
  // 🇹🇷 Kapadokya — Sıcak hava balonu
  kapadokya: { name: 'Sıcak Hava Balonu', art: [
    '...#####...',
    '..#######..',
    '.#########.',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '.#########.',
    '..#.....#..',
    '...#####...',
    '....#.#....',
  ] },
  // 🇯🇴 Petra — Hazine (El-Hazne cephesi)
  petra: { name: 'Hazine', art: [
    '....#.#....',
    '...#####...',
    '..#.....#..',
    '.#########.',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '#.#.#.#.#.#',
    '#.#.###.#.#',
    '#.#.###.#.#',
  ] },
  // 🇺🇸 Honolulu — Palmiye ağacı
  honolulu: { name: 'Palmiye', art: [
    '#..#.#..#..',
    '.########..',
    '...####....',
    '....##.....',
    '....#......',
    '....##.....',
    '.....#.....',
    '....##.....',
    '...#.......',
  ] },
  // 🇰🇷 Seul — N Seul Kulesi
  seul: { name: 'N Seul Kulesi', art: [
    '.....#.....',
    '.....#.....',
    '....###....',
    '...#####...',
    '....#.#....',
    '....#.#....',
    '....#.#....',
    '...##.##...',
    '..#######..',
    '.#########.',
  ] },
  // 🇨🇳 Pekin — Cennet Tapınağı (katmanlı çatılar)
  pekin: { name: 'Cennet Tapınağı', art: [
    '.....#.....',
    '....###....',
    '.#########.',
    '..#######..',
    '.#########.',
    '..#######..',
    '.#########.',
    '..#######..',
    '...#####...',
  ] },
  // 🇹🇭 Bangkok — Tapınak kulesi (prang)
  bangkok: { name: 'Tapınak Kulesi', art: [
    '....#....',
    '...###...',
    '...#.#...',
    '..#####..',
    '..#.#.#..',
    '.#######.',
    '.#.#.#.#.',
    '#########',
    '#.#.#.#.#',
  ] },
  // 🇻🇳 Hanoi — Pagoda (tek sütun)
  hanoi: { name: 'Pagoda', art: [
    '....#....',
    '..#####..',
    '.#######.',
    '...#.#...',
    '..#####..',
    '.#######.',
    '...#.#...',
    '..#####..',
    '....#....',
    '...###...',
  ] },
  // 🇮🇳 Mumbai — Hindistan Kapısı (kemerli anıt)
  mumbai: { name: 'Hindistan Kapısı', art: [
    '...#####...',
    '..#######..',
    '.####.####.',
    '.#########.',
    '.##.....##.',
    '.##.....##.',
    '.##.....##.',
    '.##.....##.',
    '.#########.',
  ] },
  // 🇧🇷 Rio — Kurtarıcı İsa
  rio: { name: 'Kurtarıcı İsa', art: [
    '.....#.....',
    '.....#.....',
    '###########',
    '.....#.....',
    '.....#.....',
    '....###....',
    '....###....',
    '...#####...',
    '..#######..',
    '.#########.',
  ] },
  // 🇲🇽 Meksiko — Aztek basamaklı piramit
  meksiko: { name: 'Piramit', art: [
    '.....#.....',
    '....###....',
    '...#####...',
    '..##.#.##..',
    '.####.####.',
    '###########',
    '#.#.#.#.#.#',
    '###########',
  ] },
  // 🇨🇦 Toronto — CN Kulesi
  toronto: { name: 'CN Kulesi', art: [
    '....#....',
    '....#....',
    '...###...',
    '...#.#...',
    '..#####..',
    '..#####..',
    '...#.#...',
    '...#.#...',
    '...#.#...',
    '..#####..',
  ] },
  // 🇨🇺 Havana — Klasik araba
  havana: { name: 'Klasik Araba', art: [
    '...........',
    '....#####..',
    '...#######.',
    '.#########.',
    '###########',
    '###########',
    '.##.....##.',
    '.##.....##.',
  ] },
  // 🇵🇪 Lima — Lama
  lima: { name: 'Lama', art: [
    '.##........',
    '.##........',
    '.###.......',
    '..##.......',
    '..#######..',
    '.#########.',
    '.#########.',
    '.##.##.##..',
    '.#..#..#...',
  ] },
  // 🇲🇦 Marakeş — Fener
  marakes: { name: 'Fener', art: [
    '....#....',
    '...###...',
    '..#####..',
    '..#.#.#..',
    '..#.#.#..',
    '..#####..',
    '...###...',
    '....#....',
  ] },
  // 🇰🇪 Nairobi — Zürafa
  nairobi: { name: 'Zürafa', art: [
    '.........##',
    '.........##',
    '........###',
    '........##.',
    '.......##..',
    '......##...',
    '....#####..',
    '...######..',
    '...######..',
    '...#.##.#..',
    '...#.##.#..',
  ] },
  // 🇿🇦 Cape Town — Masa Dağı
  kaapstad: { name: 'Masa Dağı', art: [
    '...........',
    '.#########.',
    '###########',
    '###########',
    '###########',
    '###########',
    '###########',
  ] },
  // 🇳🇬 Lagos — Maske
  lagos: { name: 'Maske', art: [
    '...#####...',
    '..#######..',
    '..#.###.#..',
    '..#.#.#.#..',
    '..#######..',
    '...#.#.#...',
    '...#####...',
    '....#.#....',
    '....###....',
    '.....#.....',
  ] },
  // 🇹🇳 Tunus — Kemerli kapı
  tunus: { name: 'Kemerli Kapı', art: [
    '....#####....',
    '...#######...',
    '..#########..',
    '..##.....##..',
    '..##.....##..',
    '..##.....##..',
    '..##.....##..',
    '..##.....##..',
    '..#########..',
  ] },
  // 🇨🇿 Prag — Gotik kuleler
  prag: { name: 'Gotik Kuleler', art: [
    '..#.....#..',
    '..#.....#..',
    '.###...###.',
    '.###...###.',
    '.###...###.',
    '.#########.',
    '.#########.',
    '.##.#.#.##.',
    '.#########.',
  ] },
  // 🇦🇹 Viyana — Dönme dolap
  viyana: { name: 'Dönme Dolap', art: [
    '....#####....',
    '..##..#..##..',
    '.#...###...#.',
    '.#..#.#.#..#.',
    '.#...###...#.',
    '..##..#..##..',
    '....#####....',
    '......#......',
    '.....###.....',
  ] },
  // 🇵🇹 Lizbon — Tramvay
  lizbon: { name: 'Tramvay', art: [
    '.....###.....',
    '....#####....',
    '.###########.',
    '.###########.',
    '.#.##.##.##.#',
    '.###########.',
    '.###########.',
    '.##.#####.##.',
    '..#.......#..',
  ] },
  // 🇮🇹 Venedik — Gondol
  venedik: { name: 'Gondol', art: [
    '#............',
    '##...........',
    '.##..........',
    '.###.........',
    '..###########',
    '...#########.',
    '....#######..',
  ] },
  // 🇬🇷 Atina — Parthenon
  atina: { name: 'Parthenon', art: [
    '......#......',
    '....#####....',
    '..#########..',
    '#############',
    '#.#.#.#.#.#.#',
    '#.#.#.#.#.#.#',
    '#.#.#.#.#.#.#',
    '#.#.#.#.#.#.#',
    '#############',
  ] },
};

// Silüet string'lerini StampArt'ın çizeceği grid'e çevir (dolu hücre = truthy).
function spriteToGrid(art) {
  return art.map((row) => [...row].map((ch) => (ch === '#' ? 1 : null)));
}

const _cache = {};

// Şehrin hatırası = kendine özgü landmark damgası. Damga tanımlıysa onu kullanırız;
// (tüm 39 şehir için tanımlıdır). Tanımsız kalırsa bayrak damgası (noContent).
export function getSouvenir(cityId) {
  if (_cache[cityId]) return _cache[cityId];
  const city = CITIES.find((c) => c.id === cityId);
  if (!city) return null;
  const pack = getPackForCity(cityId)?.id || null;
  const sp = SOUVENIR_SPRITE[cityId];
  const grid = sp ? spriteToGrid(sp.art) : null;
  return (_cache[cityId] = {
    cityId,
    cityName: city.name,
    flag: city.flag,
    name: sp ? sp.name : null,
    grid,
    cols: grid ? grid[0].length : 0,
    pack,
    noContent: !sp,
  });
}

// Koleksiyon kilometre taşları — biriktikçe altın ödülü (persist edilir, bir kez alınır).
export const SOUVENIR_MILESTONES = [
  { n: 5,  reward: 200 },
  { n: 10, reward: 400 },
  { n: 20, reward: 800 },
  { n: 30, reward: 1200 },
  { n: CITIES.length, reward: 2000 }, // hepsi tamamlanınca altın ödülü
];

export const TOTAL_CITIES = CITIES.length;
