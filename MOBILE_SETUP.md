# Mobil Kurulum Rehberi

## Hızlı Başlangıç

1. Backend'i çalıştır.
2. Frontend klasöründe:

```bash
npm install
npm start
```

3. Expo Go ile QR okut.

## Gereksinimler

- Node.js 20+
- Expo Go
- Aynı ağda çalışan backend

## Backend Adresi

Mobil uygulama backend adresini öncelikle `app.json` içindeki `EXPO_PUBLIC_API_URL` alanından alır.

Örnek:

```json
"extra": {
  "EXPO_PUBLIC_API_URL": "http://192.168.1.150:5118"
}
```

## Faydalı Komutlar

```bash
npx expo start --lan
npx expo start --tunnel
npx expo start --port 8082
```

## Sorun Giderme

- Telefon ve bilgisayar aynı Wi-Fi ağında olmalı.
- Backend gerçekten ilgili IP ve portta açık olmalı.
- QR açılmazsa önce `--lan`, sonra `--tunnel` dene.
- Expo cache için:

```bash
npx expo start -c
```

## Google Login

Google butonu görünür ama gerçek kimlik doğrulama için client ID alanları doldurulmalıdır.
