# Bu denetimde alınan ekran görüntüleri hakkında

Bu klasör, `docs/CLAUDE_UI_UX_AUDIT.md` denetimi sırasında yeni ekran görüntüsü **üretilemediği** için boş bırakılmıştır.

Gerekçe (bkz. rapor §22 "Test Edilemeyen Alanlar"):
- Bu ortamda iOS Simulator hiçbir zaman çalıştırılamaz (Windows).
- Bu makinede Android SDK/emulator/adb kurulu değil.
- Web sürümünde uçtan uca oturum açmayı gerektiren ekran görüntüsü akışı (`tests/web-smoke.spec.js`), yerel Docker backend'inde SMTP sırları yapılandırılmadığı için tamamlanamadı (kayıt/doğrulama e-postası gönderilemiyor).

Görsel karşılaştırma bölümü (§8), bunun yerine `docs/implemented-screens/` altında zaten var olan 6 ekran görüntüsü kullanılarak yapılmıştır. Bu kısıt giderilirse (örn. test kullanıcısı + SMTP sırları sağlanırsa, ya da Android/iOS cihaz erişimi açılırsa), Playwright smoke testi yeniden çalıştırılıp buraya güncel ekran görüntüleri eklenebilir.
