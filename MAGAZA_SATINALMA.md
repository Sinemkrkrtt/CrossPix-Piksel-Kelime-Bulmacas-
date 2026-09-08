# Gerçek Para ile Satın Alma (App Store IAP)

Market **kod olarak tamamen hazır** ve Expo Go'da (geliştirme modunda) sorunsuz çalışıyor:
altın al → bakiye artar, jokerleri altınla al → düşer. Aşağıdaki adımlar yalnızca
**gerçek kart ödemesini** açmak içindir. (Firebase Blaze GEREKMEZ — altını istemci ekliyor.)

> **Önemli:** Gerçek IAP **simülatörde çalışmaz**; **gerçek bir iPhone**'da (dev build
> veya TestFlight) sandbox test hesabıyla test edilir.

## 1) App Store Connect — ürünleri oluştur
https://appstoreconnect.apple.com → uygulaman → **Monetization → In-App Purchases**.
3 adet **Consumable** (tüketilebilir) ürün ekle. **Product ID'ler tam olarak şunlar olmalı**
(kodla eşleşiyor):

| Product ID | İçerik | Örnek fiyat |
|---|---|---|
| `com.pixeldiorama.gold.small`  | 250 altın  | ₺29,99 |
| `com.pixeldiorama.gold.medium` | 500 altın  | ₺54,99 |
| `com.pixeldiorama.gold.large`  | 1000 altın | ₺99,99 |

(İstersen fiyatları App Store Connect'ten değiştir — uygulama fiyatı oradan çeker.)
Ayrıca **Agreements, Tax, and Banking** bölümünde "Paid Apps" sözleşmesini onayla,
yoksa ürünler görünmez.

## 2) RevenueCat (ücretsiz) — App Store'a bağla
https://app.revenuecat.com (ücretsiz hesap):
1. **Create project** → iOS app ekle (Bundle ID = `app.json`'daki `ios.bundleIdentifier`).
2. App Store Connect **App-Specific Shared Secret**'i RevenueCat'e gir (ASC → App → App Information).
3. **Products**: yukarıdaki 3 product ID'yi ekle.
4. **Offerings → Current offering** içine bu 3 ürünü paket olarak ekle
   (kod `offerings.current` üzerinden okuyor).
5. **API Keys → Public app-specific key (Apple)** değerini kopyala (`appl_...`).

## 3) Anahtarı uygulamaya ekle — `app.json`
```json
"extra": {
  "revenueCat": { "iosKey": "appl_BURAYA_YAPISTIR", "androidKey": "" }
}
```

## 4) Gerçek cihazda derle ve test et
```bash
npx expo run:ios --device      # iPhone'unu USB ile bağlı seç
```
(veya `eas build -p ios --profile development` → TestFlight)
- App Store Connect → **Sandbox → Testers**'ta bir sandbox test hesabı oluştur.
- iPhone'da **Ayarlar → App Store → Sandbox Account** ile o hesaba gir.
- Uygulamada altın paketine dokun → Apple'ın ödeme ekranı çıkar → sandbox ile "satın al"
  → altın hesabına eklenir (ücret alınmaz, test).

## Nasıl çalışıyor
- Uygulama fiyatları RevenueCat/App Store'dan çeker (`iap.js → getGoldPacks`).
- Kullanıcı satın alınca RevenueCat makbuzu **kendi sunucusunda doğrular** (sahte satın alma
  altın vermez).
- Doğrulanınca uygulama altını Firestore'a ekler (`creditPurchase`) — cihazlar arası senkron.

## Not
- Product ID ⇄ altın eşleşmesi `src/economy/config.js` (`GOLD_PACKS`) içinde. Ürün ekler/çıkarırsan orayı güncelle.
- Android (Google Play) için de aynı mantık: Play Console'da ürünler + RevenueCat Google API key + `androidKey`.
