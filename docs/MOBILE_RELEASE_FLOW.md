# Roomora Mobil Surum Akisi

## Branch Akisi

- `development`: Gunluk gelistirme, yerel test ve preview OTA.
- `main`: Magazaya gidebilecek release candidate kodu.
- `main` push'u, sistem etkinlestirildiginde iOS ve Android production
  binary'lerini EAS'te olusturur; TestFlight ve Google Play Internal Testing'e
  yukler. Uygulamayi son kullanicilara otomatik acmaz.

## Bir Defalik Kurulum

1. Apple Developer ve Google Play Developer hesaplarini ac.
2. App Store Connect ve Play Console'da `com.taopato.roomora` uygulamasini olustur.
3. EAS kimlik bilgilerini bagla:

```powershell
npx eas-cli login
npx eas-cli credentials --platform ios
npx eas-cli credentials --platform android
```

4. Google Play service account anahtarini EAS Submit icin tanimla.
5. GitHub `mobile-staging`, `mobile-preview` ve `mobile-production`
   environment'larini olustur. `mobile-production` icin required reviewer ekle.
6. GitHub secret'larini ekle:
   - `EXPO_TOKEN`
   - `ASC_APP_ID`
7. GitHub repository variable'larini ilk kurulum bittikten sonra ac:
   - `MOBILE_RELEASE_ENABLED=true`
   - `MOBILE_OTA_ENABLED=true`
8. EAS development, preview ve production ortamlarinda su public degerleri tanimla:
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`

Production API degeri HTTPS kullanan canli Roomora API adresi olmalidir.
EAS icindeki teknik slug geriye donuk uyumluluk icin `ev-arkadasim` olarak
kalir; magazada ve telefonda gorunen uygulama adi yine Roomora'dir.

## Yeni Magaza Surumu

Ornek: `1.0.0` surumunden `1.1.0` surumune gecis:

```powershell
git switch development
npm run version:set -- 1.1.0
npm run release:check
git add app.json package.json package-lock.json
git commit -m "chore: prepare Roomora 1.1.0"
git push origin development
```

Preview testleri tamamlaninca `development`, pull request ile `main` branch'ine
birlestirilir. GitHub Actions production AAB/IPA olusturur ve su alanlara yollar:

- iOS: App Store Connect > TestFlight
- Android: Play Console > Internal testing

Test bittikten sonra ayni build:

- App Store Connect'te App Review'a gonderilir.
- Play Console'da production track'e promote edilir.

Her yeni magaza yuklemesinde gorunen `version` artirilir. EAS, iOS
`buildNumber` ve Android `versionCode` degerlerini otomatik artirir.

## OTA Guncellemesi

OTA sadece JavaScript, stil ve uygulama asset degisiklikleri icindir. Native
kutuphane, Expo SDK, izin, config plugin, bundle identifier veya native ayar
degisikliginde yeni store build gerekir.

1. Degisiklik `development` uzerinde preview kanalina gider.
2. Preview build ile test edilir.
3. GitHub Actions > `Mobile Production OTA` elle calistirilir.
4. Ilk dagitim yuzdesi `10` secilir.
5. Sorun yoksa EAS'te rollout yuzdesi kademeli olarak artirilir.

Yanlis OTA yayininda:

```powershell
npx eas-cli update:rollback
```

## Yerel ve Preview Test

Yerel Expo:

```powershell
npm start
```

Development client:

```powershell
npm run build:development
```

Magaza disi preview build:

```powershell
npm run build:preview
```

## Onemli Sinir

Backend deploy'u kullanici telefonundaki binary'yi degistirmez. Yeni backend,
eski mobil surumlerle bir sure birlikte calisabilmelidir. API alanlari once
geriye uyumlu eklenmeli, eski mobil surumlerin kullandigi endpoint'ler hemen
silinmemelidir.
