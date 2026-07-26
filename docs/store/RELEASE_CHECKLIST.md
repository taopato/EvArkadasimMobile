# Roomora Yayın Kontrol Listesi

## Ortak

- [x] Uygulama adı `Roomora`
- [x] iOS bundle ve Android package: `com.taopato.roomora`
- [x] 1024x1024 uygulama ikonları
- [x] Sürüm `1.0.0`
- [x] Hesap silme uygulama içinden erişilebilir
- [x] Gizlilik, destek ve web hesap silme sayfaları backend içinde hazır
- [ ] Üretim API alan adı ve geçerli HTTPS sertifikası
- [ ] Google iOS/Android istemci kimlikleri
- [ ] Gerçek cihazda kamera, galeri, bildirim ve giriş testleri
- [ ] Mağaza ekran görüntüleri ve destek iletişim adresi

## Apple

- [ ] Apple Developer üyeliği ve App Store Connect kaydı
- [ ] `com.taopato.roomora` App ID
- [ ] Sign in with Apple ve gerekli sertifikalar
- [ ] App Privacy formu
- [ ] İnceleme hesabı ve App Review notları
- [ ] TestFlight testi

## Google Play

- [ ] Play Console geliştirici hesabı ve kimlik doğrulaması
- [ ] Uygulama oluşturma ve Play App Signing
- [ ] Data safety, içerik derecelendirmesi ve hedef kitle formları
- [ ] Kapalı test gereksinimi uygulanıyorsa 12 testçiyle 14 gün
- [ ] Android App Bundle (`.aab`) üretimi

## EAS Komutları

```bash
npx eas-cli login
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform android --profile production
npx eas-cli submit --platform ios --profile production
```

EAS Submit yalnızca imzalı paketi yükler; mağaza metinleri, ekran görüntüleri ve formlar mağaza panellerinde ayrıca tamamlanır.
