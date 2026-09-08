# Reklam Kurulumu (AdMob) + Reklamları Kaldır

Ödüllü reklam ("Reklam izle → altın") ve geçiş reklamı (her 3 bölümde bir) **kod olarak
hazır** ve Expo Go'da mock ile çalışıyor. Gerçek reklamlar **derlenmiş sürümde** (dev build)
+ AdMob hesabıyla çalışır. **Firebase Blaze GEREKMEZ.**

> Şu an app.json'da Google'ın **TEST** AdMob app ID'leri var — dev build'de test reklamı
> gösterilir. Yayına çıkarken gerçek ID'lerinle değiştir.

## 1) AdMob hesabı (ücretsiz)
https://admob.google.com → uygulamanı ekle (iOS). Şunları oluştur:
- **App ID** (ca-app-pub-XXXX~YYYY)
- **Ad unit → Rewarded** (ödüllü) → ID
- **Ad unit → Interstitial** (geçiş) → ID

## 2) app.json'a gerçek ID'leri yaz
```json
"react-native-google-mobile-ads": {
  "iosAppId": "ca-app-pub-GERCEK~APPID",
  "androidAppId": "ca-app-pub-GERCEK~APPID"
},
"extra": {
  "admob": {
    "iosRewardedId": "ca-app-pub-GERCEK/REWARDED",
    "iosInterstitialId": "ca-app-pub-GERCEK/INTERSTITIAL"
  }
}
```
(`extra.admob` boş bırakılırsa otomatik TEST birimleri kullanılır — geliştirmede böyle bırak.)

## 3) Dev build al
```bash
npx expo run:ios --device
```
Reklamlar gerçek cihazda görünür (simülatörde de test reklamı çalışır). Onay için
AdMob'da "test cihazı" ekleyebilirsin.

## Reklamları Kaldır (IAP)
- App Store Connect'te **Non-Consumable** ürün: `com.pixeldiorama.removeads`.
- RevenueCat'e ekle (bkz. MAGAZA_SATINALMA.md).
- Kullanıcı satın alınca geçiş reklamları kapanır (`adsRemoved` bayrağı, Firestore'a yazılır).
  Ödüllü reklam (isteğe bağlı, altın veren) açık kalır.

## Nerede kullanılıyor
- **Ödüllü:** Mağaza → "BEDAVA ALTIN → Reklam İzle" (+50 altın).
- **Geçiş:** her 3. bölüm bitişinde bir kez (config: `INTERSTITIAL_EVERY`), reklam kaldırılmadıysa.
- Ödül/sıklık ayarları: `src/economy/config.js` (`AD_REWARD`, `INTERSTITIAL_EVERY`).

## Not (gelir dengesi)
Ödüllü reklam + IAP birlikte en iyi sonucu verir: ücretsiz oyuncular reklamla ilerler,
isteyenler altın satın alır, rahatsız olanlar "Reklamları Kaldır" ile öder.
