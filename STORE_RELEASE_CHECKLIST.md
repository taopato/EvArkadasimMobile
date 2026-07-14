# Roomora Store Release Checklist

## Kodda Hazirlananlar

- Uygulama adi ve kimlikleri: `Roomora`, `com.taopato.roomora`
- Android AAB ve iOS production EAS profilleri
- Kamera ve fotograf izin aciklamalari
- Apple ile giris yetenegi ve hesap silme ekrani
- Herkese acik gizlilik ve hesap silme sayfalari
- Production API adresi: `https://api.evarkadasim.co`
- Android/iOS Hermes export ve Expo Doctor kontrolleri

## Hesaplarda Tamamlanacaklar

- [ ] Node.js `22.13+` ve guncel EAS CLI kurulu olmali.
- [ ] `https://api.evarkadasim.co/privacy.html` ve `/account-deletion.html` production sunucuda acilmali.
- [ ] `api.evarkadasim.co` icin 443 portu ve TLS sertifikasi dis agdan erisilebilir olmali.
- [ ] Google Cloud'da Android OAuth istemcisi `com.taopato.roomora` ve EAS imza SHA-1'i ile olusturulmali.
- [ ] Google Cloud'da iOS OAuth istemcisi `com.taopato.roomora` icin olusturulmali.
- [ ] `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` ve `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` EAS ortamlarina eklenmeli.
- [ ] Apple Developer'da App ID icin Sign in with Apple acilmali.
- [ ] Play Console Data Safety ve App Store App Privacy formlari gercek veri kullanimiyla doldurulmali.
- [ ] Destek URL'si, gizlilik URL'si ve hesap silme URL'si magazalara girilmeli.
- [ ] Gercek cihazlarda kayit, giris, sifre sifirlama, profil, harcama, fatura, odeme, fis ve hesap silme testleri tamamlanmali.

## Derleme

```powershell
npm ci
npm test
npx expo-doctor
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Android derlemesi Play Console internal testing kanalina, iOS derlemesi once TestFlight'a yuklenmeli. Son kontrol sonrasinda ayni onayli binary production incelemesine gonderilmeli.
