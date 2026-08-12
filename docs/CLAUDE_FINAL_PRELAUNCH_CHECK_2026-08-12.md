# Roomora — iOS Canlı Öncesi Son Kontrol

**Tarih:** 2026-08-12
**Bağlam:** Kullanıcı bu turu "canlıya alıp iOS'ta gerçek kullanıcılara açmadan önceki son test" olarak tanımladı. Benim son commit'imden (`c5e7bac` / backend `93bf9d4`) sonra hem kendim hem de kullanıcının kullandığı başka bir araç (commit yazarı `taopato`, muhtemelen Codex) tarafından yapılan ek değişiklikler oldu. Bu denetim, o değişiklikler dahil **güncel HEAD**'i sıfırdan, önceki turlardaki metodolojiyle (kod okuma + gerçek build/test + Docker'da canlı HTTP testi) doğruladı.

---

## Genel Sonuç: **CONDITIONAL GO** (test/iç dağıtım için hazır; gerçek mağaza yayını için değil)

Kod tabanı sağlıklı, en riskli yeni değişiklik (fazla ödeme/kredi desteği) doğru ve güvenli tasarlanmış ve canlı olarak doğrulandı. Hiçbir yeni Kritik/Yüksek güvenlik açığı bulunmadı. Tek kalıcı engel — üç turdur değişmeyen — Gizlilik Politikası/Kullanım Koşulları'nda gerçek şirket bilgisinin hâlâ eksik olması (bu, App Store/Play Store başvurusunu engeller, ama şu an yaptığın iç test dağıtımını engellemez).

---

## Bu Turda İncelenen Yeni Değişiklikler

### 1. Backend: "Fazla ödeme / alacak kredisi" desteği (`91d28bb`)
Önceki turlarda ben bizzat ekleyip canlı doğruladığım "ödeme açık borcu aşamaz" kısıtlaması **kasıtlı olarak kaldırılmış** ve yerine daha iyi bir tasarım konmuş: borcu aşan kısım artık reddedilmiyor, borçlunun lehine **ters yönlü yeni bir ledger satırı (kredi/avans)** olarak kaydediliyor.

**Canlı test edildi** (gerçek Docker ortamında, gerçek kullanıcılarla):
- Alpha, Beta'ya 100 TL borçluyken 250 TL ödeme bildirdi → **201** (kabul edildi, eskiden 400 verirdi).
- Beta onayladı → **200**. DB'de kontrol: orijinal 100 TL'lik borç satırı tam kapandı (`PaidAmount=100, IsClosed=1`), **yeni bir 150 TL'lik ters kredi satırı** oluştu (`FromUserId=Beta, ToUserId=Alpha, SourcePaymentId=1002, PaidAmount=0`) — yani sistem artık "Beta, Alpha'ya 150 TL borçlu" diyor. Tam olarak amaçlandığı gibi.
- Bu yeni kredi satırının tekrar ödemesi de test edildi (30 TL) → doğru şekilde `PaidAmount` güncellendi, mükerrer satır oluşmadı.
- `LedgerLines.SourcePaymentId` üzerinde **filtrelenmiş unique index** var — aynı ödeme için iki kez kredi satırı oluşmasını DB seviyesinde imkânsız kılıyor.
- Regresyon kontrolleri: negatif tutar → 400, sıfır tutar → 400, zaten onaylı ödemeyi tekrar onaylama → temiz 400, ev üyesi olmayan biri ödeme oluşturmaya/görmeye çalışınca → 403. Hepsi hâlâ doğru.
- Eşzamanlılık: aynı ödemeyi paralel iki istekle onaylatmayı tekrar denedim; bu seferki zamanlamada ikinci istek DB-seviyesi 409 yerine iş-kuralı seviyesi temiz 400 aldı (ikisi de "çift işlem yapılmadı" anlamına gelir) — DB'de tek kayıt, mükerrer kredi satırı yok, doğrulandı.

**Mobil taraf** (`RoomoraFinance.js`, yeni `paymentOutcome.js`) backend'le tam uyumlu güncellenmiş: eski "en fazla X TL" kısıtlayıcı uyarısı kaldırılmış, yerine "Onaylandığında ₺X alacağın oluşur" gibi öngörü metni eklenmiş. Yeni `getPaymentOutcome()` fonksiyonu için domain testleri de eklenmiş (`scripts/test-domain.mjs`) ve geçiyor.

**Sonuç: Bu değişiklik önceki turlarda kapatılan güvenlik açığının geri gelmesi değil — kasıtlı, iyi tasarlanmış bir ürün özelliği.**

### 2. Splash ekranı sadeleştirmesi (`347dd1a`)
Tam ekran `splash.png` yerine küçük, ortalı `mark-navy.png`/`mark-white.png` (açık/koyu tema) + `#F7F9FC`/`#12181D` arka plan kullanılıyor artık. Benim `App.js`'e eklediğim `preventAutoHideAsync`/`hideAsync` mantığına dokunulmamış, birlikte sorunsuz çalışıyor.

### 3. Diğer küçük backend değişiklikleri
- `fix: persist bill posting and due dates` — `CreateExpenseCommand`'a 2 alan eklenmiş, düşük risk.
- `feat: persist recurring charge notes` — yeni migration + entity alanı, düşük risk.
- E-posta şablonu/marka güncellemeleri (`MailService.cs`, `RoomoraEmailTemplate.cs`) — güvenlik/finansal mantığı etkilemiyor.
- `JwtHelper.cs`'teki 64-byte anahtar guard'ı hâlâ yerinde — kontrol edildi.

---

## Genel Sağlık Kontrolleri (Güncel HEAD)

| Kontrol | Sonuç |
|---|---|
| `npm ci` | ✅ (23 npm audit uyarısı var — RN ekosisteminde yaygın, transitive/dev bağımlılıklarda; şu an engelleyici değil ama not edildi) |
| `npm test` | ✅ Geçti (yeni `getPaymentOutcome` testleri dahil) |
| `npm run doctor` | ✅ 20/20 |
| `npm run export:ios` | ✅ Başarılı bundle |
| `npm run export:android` | ✅ Başarılı bundle |
| `dotnet build EvArkadasim.sln` | ✅ 0 hata, 0 uyarı |
| Docker'da güncel kodla migration uygulama | ✅ Sorunsuz (yeni "AddPaymentOriginatedLedgerCredits", "AddRecurringChargeNote" migration'ları dahil) |
| `CryptoDemoController`/`GetAllUsers`/`AddPaymentWithAllocations` hâlâ yok mu? | ✅ Swagger'da yok (regresyon kontrolü) |
| Benim önceki UI/tema/Notlar düzeltmelerim hâlâ duruyor mu? | ✅ `git diff` ile doğrulandı — sonraki commit'ler bu dosyalara hiç dokunmamış |
| Git commit hijyeni | ✅ Her iki repo da temiz (`git status` boş), her şey commit edilmiş |

---

## Hâlâ Açık Olan Tek Kalıcı Madde

**Gizlilik Politikası / Kullanım Koşulları** (`SettingsInfo.js`) hâlâ gerçek şirket/veri sorumlusu unvanı ve adresi içermiyor — yalnızca destek e-postası var. Bu, üç turdur aynı: mühendislik tarafında yapılabilecek bir şey yok, hukuki/ürün girdisi gerekiyor. **Şu an yaptığın iç test dağıtımını (EAS preview/iOS ad-hoc) engellemiyor**, ama gerçek App Store/Play Store başvurusundan önce mutlaka tamamlanmalı.

---

## Test Edilemeyen / Bu Turda Kapsam Dışı Kalanlar
- Gerçek bir iPhone'da uçtan uca elle test (dokunma, klavye davranışı, gerçek Apple bildirim/ödeme akışı) — bu, senin şu an yapmakta olduğun kısım.
- Production/staging ortamındaki gerçek verilerle test (yalnızca yerel Docker + sahte test verisiyle test edildi, üretim verisine hiç dokunulmadı).
- E-posta şablonu değişikliklerinin gerçek bir posta kutusunda görsel doğrulaması yapılmadı (kod incelemesiyle sınırlı).
