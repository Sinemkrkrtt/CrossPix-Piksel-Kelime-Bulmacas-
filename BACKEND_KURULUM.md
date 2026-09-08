# Backend Kurulumu — Firestore (ÜCRETSİZ Spark planı)

Bu sürüm **tamamen ücretsiz** Firebase Spark planında çalışır. Cloud Functions / Blaze
**gerekmez**. Kullanıcı verisi (altın, joker, ilerleme) **Firestore**'da `users/{uid}`
altında tutulur; uygulama cihazlar arasında senkronlanır.

## Yapman gereken TEK adım: güvenlik kurallarını yayınla

1. Firebase Console → **Firestore Database** → üstteki **Rules** sekmesi.
2. Kutudaki metni sil, aşağıdakini yapıştır:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

3. **Publish** (Yayınla) de. Bitti — backend çalışıyor. ✅

> Alternatif (CLI ile): repo kökünde `firebase deploy --only firestore:rules`.
> Bu komut **ücretsiz** çalışır, Blaze istemez.

Kurallar ne yapıyor: her kullanıcı **yalnızca kendi** belgesine erişir; başkasının
verisini okuyamaz/yazamaz.

---

## Nasıl çalışır (kurallar yayınlandıktan sonra)
- Kayıt/giriş → uygulama `users/{uid}` belgesini oluşturur.
- Oyun içi altın/joker → uygulama doğrudan Firestore'a yazar (canlı senkron).
- Aynı hesapla başka cihaza girince veriler gelir.

## Gerçek para ile satın alma (opsiyonel, sonra)
Altın paketlerini gerçek parayla satmak istediğinde:
1. RevenueCat hesabı (ücretsiz) + API anahtarları → `app.json` → `extra.revenueCat`.
2. App Store Connect / Play Console'da ürünler: `com.pixeldiorama.gold.small/medium/large`.
3. **Development build** al (`npx expo run:ios`) — IAP Expo Go'da çalışmaz.

RevenueCat satın almayı kendi sunucusunda doğrular (sahte satın alma altın vermez),
ardından uygulama altını Firestore'a ekler.

## Güvenlik notu (ücretsiz plan)
Sunucu kodu (Cloud Functions) olmadığından oyun-içi ekonomi tamamen "hile-korumalı"
değildir: teknik bilgili biri kendi cihazında kendi altınını değiştirebilir. Tek
oyunculu bir oyunda bu standart ve kabul edilebilir; kimse **başkasının** verisine
dokunamaz ve **gerçek para** satın almaları RevenueCat ile korunur.

İleride tam sunucu-korumalı ekonomi istersen: Blaze planına geçip repo'daki
`functions/` klasörünü (hazır Cloud Functions kodu) deploy edebilirsin — o zaman altın
yalnızca sunucuda değişir. (Şu an bu klasör kullanılmıyor.)
