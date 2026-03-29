# Feature-Sliced Design (FSD) Mimari Rehberi - Mobil Odaklı

## 🏗️ Mimari Yapısı

```
src/
├── app/                    # Bootstrap, router, global providers
├── screens/                # Route seviyesinde bileşenler (mobil)
├── features/               # Her use-case tekil paket
│   ├── auth/
│   │   └── login/
│   │       ├── api.ts      # POST /Auth/Login
│   │       ├── hooks.ts    # useLogin()
│   │       └── model.ts    # tipler/zod şeması
│   ├── houses/
│   │   └── get-user-houses/
│   └── expenses/
├── entities/               # Domain modelleri
│   ├── user/
│   ├── house/
│   └── expense/
└── shared/                 # Ortak kod
    ├── api/
    ├── auth/
    ├── config/
    └── ui/
```

## 🎨 Yeni Renk Paleti

### Ana Renkler
- **Primary**: Mavi tonları (#0ea5e9)
- **Success**: Yeşil (#22c55e)
- **Warning**: Turuncu (#f59e0b)
- **Error**: Kırmızı (#ef4444)

### Nötr Renkler
- **Background**: Beyaz (#ffffff)
- **Surface**: Açık gri (#f8fafc)
- **Text**: Koyu gri tonları

## 📱 Mobil Özel Ayarları

### BASE_URL Yapılandırması
```typescript
// src/shared/config/env.ts
import { Platform } from 'react-native';

// Mobil emülatör için host ayarları
const HOST_DEV_ANDROID = '10.0.2.2'; // Android Emülatör'de "localhost"
const HOST_DEV_IOS = 'localhost';
const HOST_DEV_WEB = 'localhost';

// Platform bazlı host seçimi
const getDevHost = () => {
  if (Platform.OS === 'android') return HOST_DEV_ANDROID;
  if (Platform.OS === 'ios') return HOST_DEV_IOS;
  return HOST_DEV_WEB; // Web için test
};

// Mobil için HTTP önerisi (sertifika sorunları olmaz)
const USE_HTTPS = false;
const DEV_HOST = getDevHost();
const DEV_PORT = USE_HTTPS ? 7118 : 5118;

export const BASE_URL = __DEV__ 
  ? `${USE_HTTPS ? 'https' : 'http'}://${DEV_HOST}:${DEV_PORT}`
  : (process.env.EXPO_PUBLIC_API_URL as string) || DEV_HTTPS;
```

### Token Storage (Mobil + Web Test Uyumlu)
```typescript
// src/shared/auth/token.ts
// Mobil'de AsyncStorage, Web'de localStorage kullanır
const getStorage = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage; // Web test için
  }
  return AsyncStorage; // Mobil için
};
```

## 🔄 Geçiş Planı

### 1. Tamamlanan Adımlar ✅
- [x] Yeni renk paleti oluşturuldu
- [x] Shared klasörleri oluşturuldu
- [x] Entities modelleri tanımlandı
- [x] Auth/Login feature'ı oluşturuldu
- [x] Houses/GetUserHouses feature'ı oluşturuldu
- [x] Shared UI bileşenleri oluşturuldu
- [x] HomeScreen sade tasarımla güncellendi
- [x] LoginScreen sade tasarımla güncellendi
- [x] Mobil için BASE_URL optimize edildi
- [x] Token storage mobil uyumlu hale getirildi
- [x] TextInput bileşeni eklendi

### 2. Sıradaki Adımlar 📋
- [ ] Expenses feature'ları oluştur
- [ ] Diğer ekranları sade tasarımla güncelle
- [ ] Eski api.js dosyasını kaldır

## 🎯 FSD Kuralları

### Bağımlılık Yönü
```
shared → entities → features → screens
```

### Import Sınırları
- `shared/` → Herkes kullanabilir
- `entities/` → features ve screens kullanabilir
- `features/` → Sadece screens kullanabilir
- `screens/` → En üst seviye, başka hiçbir şey kullanamaz

### Hook Kullanımı
```typescript
// ✅ Doğru
const { data, isLoading } = useUserHouses(userId);

// ❌ Yanlış - API'yi doğrudan çağırma
const response = await api.get('/houses');
```

## 🧩 Feature Yapısı

Her feature şu dosyaları içerir:

```typescript
// api.ts - API çağrıları
export async function getUserHouses(userId: number) {
  const { data } = await api.get(endpoints.houses.getUserHouses(userId));
  return data;
}

// hooks.ts - React Query hooks
export function useUserHouses(userId: number) {
  return useQuery({
    queryKey: ['houses', 'user', userId],
    queryFn: () => getUserHouses(userId),
    enabled: !!userId,
  });
}

// model.ts - TypeScript tipleri (gerekirse)
export interface HouseSummary {
  id: number;
  name: string;
  memberCount: number;
}
```

## 🎨 UI Bileşenleri

### Button
```typescript
<Button
  title="Giriş Yap"
  onPress={handleLogin}
  variant="primary"
  size="medium"
  loading={isLoading}
/>
```

### Card
```typescript
<Card padding="medium" elevation="small">
  <Text>İçerik</Text>
</Card>
```

### TextInput
```typescript
<TextInput
  value={email}
  onChangeText={setEmail}
  placeholder="E-posta adresinizi girin"
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

## 🚀 Avantajlar

1. **Temiz Kod**: Her feature kendi sorumluluğuna sahip
2. **Test Edilebilirlik**: İzole edilmiş feature'lar kolay test edilir
3. **Ölçeklenebilirlik**: Yeni feature'lar kolayca eklenir
4. **Bakım**: Kod değişiklikleri sınırlı alanlarda yapılır
5. **Ekip Çalışması**: Farklı geliştiriciler farklı feature'larda çalışabilir
6. **Mobil + Web Test**: Aynı kod hem mobil hem web test'te çalışır

## 📱 Mobil Geliştirme Notları

### Emülatör Bağlantısı
- **Android**: `http://10.0.2.2:5118` (Android Emülatör'de localhost)
- **iOS**: `http://localhost:5118` (iOS Simulator'da localhost)
- **Web Test**: `http://localhost:5118` (Browser'da test için)

### Platform Özellikleri
- **AsyncStorage**: Mobil'de token ve veri saklama
- **HTTP Tercih**: Sertifika sorunları olmaz
- **Platform API**: Platform.OS ile platform algılama

### Test Stratejisi
- **Geliştirme**: Web'de hızlı test
- **Mobil Test**: iOS/Android emülatörde
- **Gerçek Cihaz**: Production test

## 📝 Notlar

- Eski `api.js` dosyası şimdilik korunuyor
- Kademeli geçiş yapılıyor
- Her feature tamamlandığında eski kod kaldırılacak
- Tüm ekranlar yeni renk paletiyle güncellenecek
- Mobil odaklı geliştirme yapılıyor
- Web sadece test için kullanılıyor
- iOS ve Android uyumluluğu sağlanıyor
