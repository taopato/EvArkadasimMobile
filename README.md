# Ev Arkadaşım Mobile

Expo tabanlı mobil istemci. Uygulama; ev grupları, ortak harcamalar, düzenli giderler, borç/alacak özeti ve ödeme onayı akışlarını yönetir.

## Başlatma

```bash
npm install
npm start
```

Alternatif:

```bash
npx expo start --lan
```

## Gereksinimler

- Node.js 20+
- Expo Go
- Aynı ağda çalışan backend API

## Önemli Dosyalar

- `App.js`: Ana navigation ve provider yapısı
- `src/services/api.js`: Aktif frontend API katmanı
- `src/context/AuthContext.js`: Oturum ve varsayılan ev yönetimi
- `src/shared/theme/`: Tema sistemi
- `app.json`: Expo config ve Google client ID alanları

## Google Login

Google giriş akışı kod tarafında hazırdır. Çalıştırmak için aşağıdaki alanların doldurulması gerekir:

- `app.json > expo.extra.GOOGLE_WEB_CLIENT_ID`
- `app.json > expo.extra.GOOGLE_IOS_CLIENT_ID`
- `app.json > expo.extra.GOOGLE_ANDROID_CLIENT_ID`
- backend `appsettings.json > GoogleAuth:ClientIds`

## Durum

- Auth akışı aktif
- Borç/alacak ekranları backend ile hizalı
- Tema sistemi aktif
- QR ile Expo Go üzerinden test edilebilir
