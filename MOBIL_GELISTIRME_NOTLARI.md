# 📱 Mobil Geliştirme Notları

## 🎯 Proje Hedefi
Bu uygulama **mobil uygulama** olarak tasarlanmıştır. Web sadece geliştirme aşamasında test için kullanılmaktadır.

## 🚀 Geliştirme Ortamı

### Komutlar
```bash
# Web'de test (geliştirme için)
npm run web

# Android emülatörde çalıştır
npm run android

# iOS simulator'da çalıştır
npm run ios

# Expo CLI ile başlat
npx expo start
```

### Backend Bağlantısı
- **Development**: `http://localhost:5118` (HTTP - sertifika sorunu yok)
- **Android Emülatör**: `http://10.0.2.2:5118` (Android'de localhost)
- **iOS Simulator**: `http://localhost:5118` (iOS'ta localhost)
- **Web Test**: `http://localhost:5118` (Browser'da test)

## 📱 Platform Özellikleri

### Android
- **Emülatör**: `10.0.2.2` host kullanır
- **Gerçek Cihaz**: IP adresi gerekir
- **HTTP İzinleri**: `android:usesCleartextTraffic="true"`

### iOS
- **Simulator**: `localhost` kullanır
- **Gerçek Cihaz**: IP adresi gerekir
- **ATS**: HTTP için Info.plist ayarları

### Web (Test)
- **Browser**: `localhost` kullanır
- **LocalStorage**: Token saklama
- **Hot Reload**: Hızlı geliştirme

## 🔧 Konfigürasyon

### BASE_URL Ayarları
```typescript
// src/shared/config/env.ts
const USE_HTTPS = false; // Mobil için HTTP tercih edilir
const DEV_HOST = getDevHost(); // Platform bazlı host
const DEV_PORT = 5118; // HTTP port
```

### Token Storage
```typescript
// Mobil'de AsyncStorage, Web'de localStorage
const storage = Platform.OS === 'web' ? localStorage : AsyncStorage;
```

## 🎨 UI/UX Mobil Odaklı

### Renk Paleti
- **Sade ve şık**: Cıvıl cıvıl renkler yerine profesyonel tonlar
- **Erişilebilirlik**: Kontrast oranları uygun
- **Platform uyumlu**: iOS/Android design guidelines

### Bileşenler
- **Touch-friendly**: Minimum 44px dokunma alanı
- **Responsive**: Farklı ekran boyutları
- **Performance**: Optimize edilmiş render

## 📊 Test Stratejisi

### Geliştirme Aşaması
1. **Web Test**: Hızlı prototip ve UI test
2. **iOS Simulator**: iOS uyumluluk testi
3. **Android Emülatör**: Android uyumluluk testi

### Production Öncesi
1. **Gerçek iOS Cihaz**: App Store test
2. **Gerçek Android Cihaz**: Play Store test
3. **Farklı Ekran Boyutları**: Responsive test

## 🔍 Debug ve Test

### Web Debug
- **Browser Console**: API çağrıları
- **Network Tab**: Response kontrolü
- **LocalStorage**: Token kontrolü

### Mobil Debug
- **Expo DevTools**: Metro bundler
- **React Native Debugger**: State kontrolü
- **Flipper**: Platform debug

### API Test
- **Postman**: Backend test
- **Browser**: Web test
- **Mobil**: Gerçek cihaz test

## 📦 Build ve Deploy

### Expo Build
```bash
# Android APK
expo build:android

# iOS IPA
expo build:ios

# Web Build
expo build:web
```

### App Store Deploy
1. **iOS**: App Store Connect
2. **Android**: Google Play Console
3. **Web**: Vercel/Netlify (opsiyonel)

## 🚨 Önemli Notlar

### Mobil Öncelikli
- Web sadece test için
- Mobil UX öncelikli
- Platform-specific optimizasyonlar

### Performance
- Bundle size optimize
- Image optimization
- Lazy loading

### Security
- Token güvenli saklama
- API güvenliği
- Input validation

## 📚 Kaynaklar

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://material.io/design)
