// src/data/cities.js
// Bahçedeki şehirler + her şehrin 5 bulmacası. Tek gerçek kaynak; hem
// CityMap hem de CityPuzzles buradan okur.
import { PALETTE } from '../pixel/PixelKit';

// Kilitli şehirler için 5 bulmacayı tek satırda üretir (hepsi kilitli).
const lockedSet = (titles) =>
  titles.map((title, i) => ({ id: i + 1, title, status: 'locked' }));

// Paket şehirleri: paket alınınca oynanabilir (aktif). İçerik henüz eklenmediği
// için getPuzzle bunlar için yer tutucu (İstanbul) bulmacaları döndürür.
const packSet = (titles) =>
  titles.map((title, i) => ({ id: i + 1, title, status: 'active', route: 'Puzzle' }));

export const CITIES = [
  {
    id: 'istanbul',
    name: 'İstanbul',
    flag: '🇹🇷',
    petal: PALETTE.gold,
    unlocked: true,
    x: 0.5,
    y: 0.44,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Çay Bardağı', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Galata Kulesi', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Vapur', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Simit', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Kedi', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Lale', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Nazar Boncuğu', status: 'active', route: 'Puzzle' },
    ],
  },
  {
    id: 'paris',
    name: 'Paris',
    flag: '🇫🇷',
    petal: '#E8639A',
    unlocked: true,
    x: 0.17,
    y: 0.40,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Ressam Paleti', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Eyfel Kulesi', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Makaron', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Kruvasan', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Akordeon', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Kahve', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Bere', status: 'active', route: 'Puzzle' },
    ],
  },
  {
    id: 'newyork',
    name: 'New York',
    flag: '🇺🇸',
    petal: '#4FB0FF',
    unlocked: true,
    x: 0.83,
    y: 0.42,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Kaset', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Sarı Taksi', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Beyzbol Şapkası', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Brooklyn Köprüsü', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Özgürlük Heykeli', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Sosisli', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'İtfaiye Musluğu', status: 'active', route: 'Puzzle' },
    ],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    flag: '🇯🇵',
    petal: '#9B5DE5',
    unlocked: true,
    x: 0.30,
    y: 0.62,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Sakura', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Suşi', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Torii Kapısı', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Ramen', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Maneki Neko', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Fuji Dağı', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Pagoda', status: 'active', route: 'Puzzle' },
    ],
  },
  {
    id: 'roma',
    name: 'Roma',
    flag: '🇮🇹',
    petal: '#E63946',
    unlocked: true,
    x: 0.70,
    y: 0.63,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Panteon', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Vespa', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Gladyatör Miğferi', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Pizza', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Gelato', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Trevi Çeşmesi', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Kolezyum', status: 'active', route: 'Puzzle' },
    ],
  },

  // --- Yakında açılacak şehirler (kilitli) ---
  {
    id: 'londra',
    name: 'Londra',
    flag: '🇬🇧',
    petal: '#08CAD1',
    unlocked: true,
    x: 0.2,
    y: 0.3,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Kraliyet Tacı', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Kırmızı Otobüs', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Çaydanlık', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Big Ben', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Şemsiye', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Muhafız Şapkası', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Telefon Kulübesi', status: 'active', route: 'Puzzle' },
    ],
  },
  {
    id: 'barselona',
    name: 'Barselona',
    flag: '🇪🇸',
    petal: '#FB8500',
    unlocked: true,
    x: 0.4,
    y: 0.3,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Flamenko Yelpazesi', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Gaudí Kertenkelesi', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Sagrada Familia', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Paella', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Boğa', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'İspanyol Gitarı', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Futbol Topu', status: 'active', route: 'Puzzle' },
    ],
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    flag: '🇳🇱',
    petal: '#1FB56A',
    unlocked: true,
    x: 0.6,
    y: 0.3,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Bisiklet', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Yel Değirmeni', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Patates Kızartması', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Takunya', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Delft Vazosu', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Kanal Evi', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Peynir', status: 'active', route: 'Puzzle' },
    ],
  },
  {
    id: 'kahire',
    name: 'Kahire',
    flag: '🇪🇬',
    petal: '#2E3FC9',
    unlocked: true,
    x: 0.8,
    y: 0.3,
    // kolaydan zora sıralı
    puzzles: [
      { id: 1, title: 'Nil Teknesi', status: 'active', route: 'Puzzle' },
      { id: 2, title: 'Palmiye', status: 'active', route: 'Puzzle' },
      { id: 3, title: 'Kobra', status: 'active', route: 'Puzzle' },
      { id: 4, title: 'Piramit', status: 'active', route: 'Puzzle' },
      { id: 5, title: 'Firavun Maskesi', status: 'active', route: 'Puzzle' },
      { id: 6, title: 'Sfenks', status: 'active', route: 'Puzzle' },
      { id: 7, title: 'Deve', status: 'active', route: 'Puzzle' },
    ],
  },
  // --- Kahire'den sonra ek ÜCRETSİZ şehirler (oyun daha uzun sürsün) ---
  { id: 'berlin',    name: 'Berlin',    flag: '🇩🇪', petal: '#A3E635', unlocked: true, puzzles: packSet(['Currywurst', 'TV Kulesi', 'Ampelmann', 'Bretzel', 'Brandenburg Kapısı', 'Bira', 'Ayı']) },
  { id: 'dubai',     name: 'Dubai',     flag: '🇦🇪', petal: '#E5009E', unlocked: true, puzzles: packSet(['Cin Lambası', 'Burj Al Arab', 'Şahin', 'Cami', 'Burj Khalifa', 'Altın Külçe', 'Dubai Çerçevesi']) },
  { id: 'bali',      name: 'Bali',      flag: '🇮🇩', petal: '#5D0FD3', unlocked: true, puzzles: packSet(['Sörf Tahtası', 'Volkan', 'Barong', 'Lotus', 'Pirinç Terası', 'Pura Kapısı', 'Tapınak Şemsiyesi']) },
  { id: 'reykjavik', name: 'Reykjavik', flag: '🇮🇸', petal: '#00FF85', unlocked: true, puzzles: packSet(['Balina', 'Gayzer', 'Şelale', 'Puffin', 'Viking Gemisi', 'Hallgrímskirkja', 'Kuzey Işıkları']) },
  { id: 'singapur',  name: 'Singapur',  flag: '🇸🇬', petal: '#FF6600', unlocked: true, puzzles: packSet(['Çili Yengeci', 'Durian', 'Merlion', 'Supertree', 'Orkide', 'Singapore Flyer', 'Marina Bay Sands']) },
  { id: 'sidney',    name: 'Sidney',    flag: '🇦🇺', petal: '#00E0D0', unlocked: true, puzzles: packSet(['Bumerang', 'Liman Köprüsü', 'Kanguru', 'Timsah', 'Koala', 'Opera Binası', 'Uluru']) },
  { id: 'moskova',   name: 'Moskova',   flag: '🇷🇺', petal: '#C1004F', unlocked: true, puzzles: packSet(['Kremlin Kulesi', 'Semaver', 'Balalayka', 'Roket', 'Matruşka', 'Aziz Vasil Katedrali', 'Fabergé Yumurtası']) },
  { id: 'kapadokya', name: 'Kapadokya', flag: '🇹🇷', petal: '#8A00E0', unlocked: true, puzzles: packSet(['Kaya Ev', 'At', 'Peri Bacası', 'Üzüm Salkımı', 'Testi', 'Sıcak Hava Balonu', 'Türk Halısı']) },
  { id: 'petra',     name: 'Petra',     flag: '🇯🇴', petal: '#FF3E6E', unlocked: true, puzzles: packSet(['Akrep', 'Keçi', 'Çöl Gülü', 'Amfora', 'Roma Tiyatrosu', 'Bedevi Çadırı', 'Hazine']) },
  { id: 'honolulu',  name: 'Honolulu',  flag: '🇺🇸', petal: '#FFE400', unlocked: true, puzzles: packSet(['Deniz Kaplumbağası', 'Ananas', 'Dalga', 'Ukulele', 'Tiki', 'Aloha Gömleği', 'Diamond Head']) },

  // --- Paket şehirleri (ana yol bitince 4 dala ayrılan bölgesel paketler) ---
  // Paket alınana kadar kilitli; alınca paketin TÜM şehirleri açılır.
  // ASYA PAKETİ
  { id: 'seul',    name: 'Seul',    flag: '🇰🇷', petal: '#6C63FF', unlocked: false, pack: 'asya', puzzles: packSet(['Yelpaze', 'N Seoul Tower', 'Taegeuk', 'Pagoda', 'Gyeongbokgung Sarayı', 'Kore Kaplanı', 'Hanbok']) },
  { id: 'pekin',   name: 'Pekin',   flag: '🇨🇳', petal: '#6ABE30', unlocked: false, pack: 'asya', puzzles: packSet(['Ejderha', 'Panda', 'Çin Feneri', 'Terracotta Savaşçı', 'Cennet Tapınağı', 'Çin Seddi', 'Bambu']) },
  { id: 'bangkok', name: 'Bangkok', flag: '🇹🇭', petal: '#C400E0', unlocked: false, pack: 'asya', puzzles: packSet(['Tuk-tuk', 'Khon Maskesi', 'Fil', 'Chedi', 'Kraliyet Kayığı', 'Buda Heykeli', 'Wat Arun']) },
  { id: 'hanoi',   name: 'Hanoi',   flag: '🇻🇳', petal: '#FF66C4', unlocked: false, pack: 'asya', puzzles: packSet(['Tek Sütun Pagodası', 'Konik Şapka', 'Manda', 'Pho Kasesi', 'Su Kuklası', 'Vietnam Kahvesi', 'Ha Long Koyu']) },
  { id: 'mumbai',  name: 'Mumbai',  flag: '🇮🇳', petal: '#FF8A5C', unlocked: false, pack: 'asya', puzzles: packSet(['Diya', 'Taç Mahal', 'Sitar', 'Tabla', 'Gateway of India', 'Tavus Kuşu', 'Rangoli']) },
  // AMERİKA PAKETİ
  { id: 'rio',     name: 'Rio',     flag: '🇧🇷', petal: '#9B30FF', unlocked: false, pack: 'amerika', puzzles: packSet(['Tukan', 'Kurtarıcı İsa', 'Samba Başlığı', 'Futbol Topu', 'Şeker Somunu Dağı', 'Maracanã Stadyumu', 'Copacabana Dalgası']) },
  { id: 'meksiko', name: 'Meksiko', flag: '🇲🇽', petal: '#FF0080', unlocked: false, pack: 'amerika', puzzles: packSet(['Nopal Kaktüsü', 'Mariachi Gitarı', 'Aztek Güneş Taşı', 'Şeker Kafatası', 'Sombrero', 'Kukulkan Piramidi', 'Papel Picado']) },
  { id: 'toronto', name: 'Toronto', flag: '🇨🇦', petal: '#EEFF66', unlocked: false, pack: 'amerika', puzzles: packSet(['Buz Hokeyi', 'Kunduz', 'CN Kulesi', 'Akçaağaç Yaprağı', 'TTC Tramvayı', 'Casa Loma Şatosu', 'Toronto Silüeti']) },
  { id: 'havana',  name: 'Havana',  flag: '🇨🇺', petal: '#A5FFFF', unlocked: false, pack: 'amerika', puzzles: packSet(['Küba Purosu', 'El Morro Feneri', 'Kraliyet Palmiyesi', 'Konga Davulları', 'Klasik Amerikan Arabası', 'El Capitolio', 'Kolonyal Cephe']) },
  { id: 'lima',    name: 'Lima',    flag: '🇵🇪', petal: '#FFB3D9', unlocked: false, pack: 'amerika', puzzles: packSet(['İnti Güneşi', 'Nazca Kolibri', 'Lama', 'Lima Katedrali', 'Zampoña', 'Machu Picchu', 'And Tekstili']) },
  // AFRİKA PAKETİ
  { id: 'marakes', name: 'Marakeş', flag: '🇲🇦', petal: '#1A3CFF', unlocked: false, pack: 'afrika', puzzles: packSet(['Deve', 'Tajine', 'Nane Çayı', 'Fas Feneri', 'Bab Agnaou', 'Koutoubia', 'Berber Halısı']) },
  { id: 'nairobi', name: 'Nairobi', flag: '🇰🇪', petal: '#FF2400', unlocked: false, pack: 'afrika', puzzles: packSet(['Zürafa', 'Afrika Davulu', 'Aslan', 'Zebra', 'Akasya', 'Kenyatta Kulesi', 'Maasai Kalkanı']) },
  { id: 'kaapstad', name: 'Cape Town', flag: '🇿🇦', petal: '#0080FF', unlocked: false, pack: 'afrika', puzzles: packSet(['Afrika Pengueni', 'Kral Protea', 'Balina', 'Cape Dutch Evi', 'Deniz Feneri', 'Masa Dağı', 'Bo-Kaap Evleri']) },
  { id: 'lagos',   name: 'Lagos',   flag: '🇳🇬', petal: '#A0006D', unlocked: false, pack: 'afrika', puzzles: packSet(['Palmiye', 'Konuşan Davul', 'Kartal', 'Lekki Köprüsü', 'Benin Maskesi', 'Jollof Pirinci', 'Ankara Kumaşı']) },
  { id: 'tunus',   name: 'Tunus',   flag: '🇹🇳', petal: '#E0A800', unlocked: false, pack: 'afrika', puzzles: packSet(['Fenek Tilkisi', 'Zeytin Ağacı', 'Kairouan Camii', 'Nabeul Çömleği', 'Sidi Bou Said Kapısı', 'El Djem', 'Mergoum Kilimi']) },
  // AVRUPA PAKETİ (en alt dal) — oyunda olmayan Avrupa şehirleri
  { id: 'prag',    name: 'Prag',    flag: '🇨🇿', petal: '#B84808', unlocked: false, pack: 'avrupa', puzzles: packSet(['Marionet', 'Çek Birası', 'Aziz Vitus Katedrali', 'Charles Köprüsü', 'Golem', 'Astronomik Saat', 'Prag Cephesi']) },
  { id: 'viyana',  name: 'Viyana',  flag: '🇦🇹', petal: '#0000B8', unlocked: false, pack: 'avrupa', puzzles: packSet(['Lipizzaner Atı', 'Stephansdom', 'Prater Dev Dönme Dolap', 'Keman', 'Sachertorte', 'Schönbrunn Sarayı', 'Klimt Altın Deseni']) },
  { id: 'lizbon',  name: 'Lizbon',  flag: '🇵🇹', petal: '#F8C088', unlocked: false, pack: 'avrupa', puzzles: packSet(['Barcelos Horozu', '25 Nisan Köprüsü', 'Karavela', 'Pastel de Nata', 'Lizbon Tramvayı', 'Belém Kulesi', 'Azulejo Karo']) },
  { id: 'venedik', name: 'Venedik', flag: '🇮🇹', petal: '#B030A8', unlocked: false, pack: 'avrupa', puzzles: packSet(['Gondol', 'Çan Kulesi', 'Kanatlı Aslan', 'Karnaval Maskesi', 'Rialto Köprüsü', 'San Marco Bazilikası', 'Venedik Sarayı']) },
  { id: 'atina',   name: 'Atina',   flag: '🇬🇷', petal: '#42FCF0', unlocked: false, pack: 'avrupa', puzzles: packSet(['Amfora', 'Olimpiyat Meşalesi', 'Korint Miğferi', 'Athena Baykuşu', 'Kariatid', 'Parthenon', 'Meander Deseni']) },
];

// --- İçerik paketleri (bölgesel, altınla açılır) — her biri 5 şehir ---
// Sıra dal seviyelerini belirler: ilk = üst dal, son = en alt dal (Avrupa).
export const PACKS = [
  { id: 'asya',    name: 'Asya Paketi',    price: 500, cities: ['seul', 'pekin', 'bangkok', 'hanoi', 'mumbai'] },
  { id: 'amerika', name: 'Amerika Paketi', price: 500, cities: ['rio', 'meksiko', 'toronto', 'havana', 'lima'] },
  { id: 'afrika',  name: 'Afrika Paketi',  price: 500, cities: ['marakes', 'nairobi', 'kaapstad', 'lagos', 'tunus'] },
  { id: 'avrupa',  name: 'Avrupa Paketi',  price: 500, cities: ['prag', 'viyana', 'lizbon', 'venedik', 'atina'] },
];

// Sonsuz Diyar — haritanın en sonunda, tüm dalların birleştiği son durak.
// Bir paket gibi altınla açılır; açılınca Sonsuz Mod'un kilidi kalkar.
export const ENDLESS_PACK = { id: 'sonsuz', name: 'Sonsuz Diyar', price: 2000, cities: [] };

// Bir şehir "bitti" mi? = tüm bulmacaları çözülmüş (rewarded'da). rewarded anahtarı `${cityId}:${puzzleId}`.
export const isCityComplete = (city, rewarded) =>
  !!city && Array.isArray(city.puzzles) && city.puzzles.length > 0 &&
  city.puzzles.every((p) => rewarded && rewarded[`${city.id}:${p.id}`]);

export const getCity = (id) => CITIES.find((c) => c.id === id);
export const getPack = (id) => (id === ENDLESS_PACK.id ? ENDLESS_PACK : PACKS.find((p) => p.id === id));
export const getPackForCity = (cityId) => PACKS.find((p) => p.cities.includes(cityId));
