// src/data/souvenirs.js
// Seyahat Defteri — her şehir %100 bitince o şehrin bir HATIRASI (minyatür landmark) açılır.
// Hatıra görseli için yeni çizim yok: şehrin en detaylı bulmaca GRID'ini (renkli silüet)
// küçük bir minyatür olarak kullanırız — "çözdüğün eser hatıran olur".

import { CITIES, getPackForCity } from './cities';
import { getPuzzle, hasPuzzles } from './puzzles';

// Bulmacası HENÜZ yapılmamış şehirler (Amerika/Afrika/Avrupa paketleri) için kendine özel
// landmark silüetleri (tek mürekkep, damga). '#' dolu, '.' boş.
const SOUVENIR_SPRITE = {
  rio:     { name: 'Kurtarıcı İsa', art: ['......#......','.....###.....','######.######','.....###.....','......#......','......#......','.....###.....','....#####....','...#######...','..#########..'] },
  meksiko: { name: 'Piramit',       art: ['.....###.....','....#####....','...#######...','...#######...','..#########..','.###########.','.###########.','#############'] },
  toronto: { name: 'CN Kulesi',     art: ['......#......','......#......','.....###.....','.....#.#.....','....#####....','....#####....','.....###.....','......#......','......#......','......#......','.....###.....'] },
  havana:  { name: 'Gitar',         art: ['.....##......','.....##......','.....##......','...######....','..########...','.####..####..','.###....###..','.####..####..','..########...','...######....'] },
  lima:    { name: 'Lama',          art: ['.##..........','.##..........','.###.........','..##.........','..#######....','.#########...','.#########...','.##.##.##.#..','.#..#..#..#..'] },
  marakes: { name: 'Fener',         art: ['......#......','.....###.....','....#####....','...##.#.##...','...#.###.#...','...##.#.##...','...#.###.#...','....#####....','.....###.....'] },
  nairobi: { name: 'Zürafa',        art: ['.........##..','.........##..','........###..','........##...','.......##....','......##.....','....#####....','...######....','...######....','...#.##.#....','...#.##.#....'] },
  kaapstad:{ name: 'Masa Dağı',     art: ['.............','..#########..','.###########.','.###########.','############.','#############','#############'] },
  lagos:   { name: 'Maske',         art: ['...#######...','..#########..','..#.#####.#..','..#.#.#.#.#..','..#########..','...#.#.#.#...','...#######...','....#.#.#....','....#####....','.....###.....'] },
  tunus:   { name: 'Kemerli Kapı',  art: ['....#####....','...#######...','..#########..','..##.....##..','..##.....##..','..##.....##..','..##.....##..','..##.....##..','..#########..'] },
  prag:    { name: 'Gotik Kuleler', art: ['..#.......#..','..#.......#..','.###.....###.','.###.....###.','.###.....###.','.###########.','.###########.','.##.##.##.##.','.###########.'] },
  viyana:  { name: 'Dönme Dolap',   art: ['....#####....','..##..#..##..','.#...###...#.','.#..#.#.#..#.','.#...###...#.','..##..#..##..','....#####....','......#......','.....###.....'] },
  lizbon:  { name: 'Tramvay',       art: ['.....###.....','....#####....','.###########.','.###########.','.#.##.##.##.#','.###########.','.###########.','.##.#####.##.','..#.......#..'] },
  venedik: { name: 'Gondol',        art: ['#............','##...........','.##..........','.###.........','..###########','...#########.','....#######..'] },
  atina:   { name: 'Parthenon',     art: ['......#......','....#####....','..#########..','#############','#.#.#.#.#.#.#','#.#.#.#.#.#.#','#.#.#.#.#.#.#','#.#.#.#.#.#.#','#############'] },
};

// Silüet string'lerini StampArt'ın çizeceği grid'e çevir (dolu hücre = truthy).
function spriteToGrid(art) {
  return art.map((row) => [...row].map((ch) => (ch === '#' ? 1 : null)));
}

// Bir grid'in silüet bilgisi: dolu hücre sayısı + sınırlayıcı kutuya dolgu oranı.
function shapeInfo(grid) {
  let filled = 0, minR = 1e9, maxR = -1, minC = 1e9, maxC = -1;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
    if (grid[r][c]) { filled++; if (r < minR) minR = r; if (r > maxR) maxR = r; if (c < minC) minC = c; if (c > maxC) maxC = c; }
  }
  const br = maxR - minR + 1, bc = maxC - minC + 1;
  return { filled, ratio: filled / Math.max(1, br * bc) };
}

const _cache = {};
// Şehrin hatırası. Kendi bulmacası yoksa (Amerika/Afrika/Avrupa paketleri henüz yapılmadı)
// landmark yerine BAYRAK damgası kullanılır (noContent). Varsa en "şekilli" (karakteristik)
// silüeti seçeriz — yoğun dikdörtgen dolgular yerine tanınabilir siluet.
export function getSouvenir(cityId) {
  if (_cache[cityId]) return _cache[cityId];
  const city = CITIES.find((c) => c.id === cityId);
  if (!city) return null;
  const pack = getPackForCity(cityId)?.id || null;

  // Bulmacası olmayan şehir → kendine özel landmark silüeti (yakında).
  if (!hasPuzzles(cityId)) {
    const sp = SOUVENIR_SPRITE[cityId];
    const grid = sp ? spriteToGrid(sp.art) : null;
    return (_cache[cityId] = {
      cityId, cityName: city.name, flag: city.flag,
      name: sp ? sp.name : null, noContent: true, pack,
      grid, cols: grid ? grid[0].length : 0,
    });
  }

  const cand = [];
  for (const p of city.puzzles || []) {
    const puz = getPuzzle(cityId, p.id);
    if (!puz || !puz.grid) continue;
    const info = shapeInfo(puz.grid);
    cand.push({ grid: puz.grid, cols: puz.grid[0].length, name: puz.name || p.title, ...info });
  }
  if (!cand.length) return (_cache[cityId] = { cityId, cityName: city.name, flag: city.flag, name: null, noContent: true, pack });

  // Görünür boyuttakiler (>=18 dolu) arasından EN DÜŞÜK dolgu oranı = en karakteristik silüet.
  const big = cand.filter((x) => x.filled >= 18);
  const pool = big.length ? big : cand;
  const best = pool.reduce((b, x) => (!b || x.ratio < b.ratio ? x : b), null);

  return (_cache[cityId] = { cityId, cityName: city.name, flag: city.flag, name: best.name, grid: best.grid, cols: best.cols, pack });
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
