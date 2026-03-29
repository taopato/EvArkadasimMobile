# Google Login Kurulum Notu

Google ile giriş kod tarafında hazır. Canlı çalışması için Google Cloud Console üzerinden istemci kimliklerini üretip hem frontend hem backend'e yazman gerekiyor.

## 1. Google Cloud'da yapman gerekenler

1. Google Cloud Console'da bir proje aç.
2. `APIs & Services > OAuth consent screen` kısmında uygulamayı oluştur.
3. `Credentials > Create Credentials > OAuth client ID` ile gerekli client ID'leri üret.

Gerekenler:
- `Web application` client
- `Android` client
- `iOS` client kullanacaksan iOS client
- Expo Go ile test edeceksen ayrıca Expo için kullandığın web client ID'yi `GOOGLE_EXPO_CLIENT_ID` olarak da yaz

Expo Go notu:
- `Authorized JavaScript origins` alanına mobil backend adresi yazılmaz.
- Expo Go senaryosunda Google tarafında `Authorized redirect URIs` içine su adres de eklenmelidir:
  `https://auth.expo.io/@taopato/ev-arkadasim`

## 2. Frontend'e yazılacak yer

[app.json](C:/EvArkadasimProje/Frontend/ev-arkadasim-frontend-son-hali/app.json) içindeki alanları doldur:

```json
"extra": {
  "GOOGLE_WEB_CLIENT_ID": "xxx.apps.googleusercontent.com",
  "GOOGLE_IOS_CLIENT_ID": "xxx.apps.googleusercontent.com",
  "GOOGLE_ANDROID_CLIENT_ID": "xxx.apps.googleusercontent.com",
  "GOOGLE_EXPO_CLIENT_ID": "xxx.apps.googleusercontent.com"
}
```

Not:
- Expo Go ile telefonda test edeceksen `GOOGLE_EXPO_CLIENT_ID` zorunlu.
- Android APK/AAB alırsan `GOOGLE_ANDROID_CLIENT_ID` zorunlu.
- Web test edeceksen `GOOGLE_WEB_CLIENT_ID` zorunlu.

## 3. Backend'e yazılacak yer

[appsettings.json](C:/EvArkadasimProje/Backend/EvArkadasim/EvArkadasim.API/appsettings.json) içindeki `GoogleAuth:ClientIds` listesine frontend'de kullandığın tüm ilgili client ID'leri ekle:

```json
"GoogleAuth": {
  "ClientIds": [
    "WEB_CLIENT_ID",
    "ANDROID_CLIENT_ID",
    "IOS_CLIENT_ID",
    "EXPO_CLIENT_ID"
  ]
}
```

Backend gelen `id_token` içindeki `audience` değerini bu listedeki ID'lerle doğruluyor. O yüzden kullandığın client ID burada da olmalı.

## 4. Android için dikkat

Android OAuth client oluştururken şu bilgiler gerekir:
- package name: Expo/EAS build'de kullandığın Android package
- SHA-1 fingerprint: debug veya release keystore SHA-1

Expo Go ile ilk testte bunun yerine `GOOGLE_EXPO_CLIENT_ID` ile ilerlemek daha pratik olur.

## 5. Şu an sende yapılacak net işler

1. Google Cloud'dan client ID'leri üret.
2. [app.json](C:/EvArkadasimProje/Frontend/ev-arkadasim-frontend-son-hali/app.json) içine yerleştir.
3. [appsettings.json](C:/EvArkadasimProje/Backend/EvArkadasim/EvArkadasim.API/appsettings.json) içine aynı ID'leri ekle.
4. Backend'i yeniden başlat.
5. Expo'yu yeniden aç.

## Akış

- Frontend Google'dan `id_token` alır.
- Backend bu token'ı doğrular.
- Backend kendi JWT token'ını üretir.
- Kullanıcı uygulamaya giriş yapmış olur.
