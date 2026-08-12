# Roomora — Bağımsız Yeniden Denetim #2 (İkinci Düzeltme Turu Sonrası)

**Tarih:** 2026-07-28
**Kapsam:** `EvArkadasimMobile` + `EvArkadasimBackend`
**Referans belgeler:** `docs/CLAUDE_REAUDIT_2026-07-27.md` (round-1 yeniden denetim), `docs/AUDIT_REMEDIATION_2_2026-07-28.md` (bu turun düzeltme kaydı)
**Yöntem:** Düzeltme raporundaki 16+ iddianın hiçbiri olduğu gibi kabul edilmedi. Backend, güncel koddan Docker'da yeniden derlenip gerçek HTTP istekleriyle canlı test edildi (kısa JWT anahtarıyla başlatma denemesi, gerçek kullanıcılarla giriş, gerçek bir borç/ödeme senaryosu üzerinden yetkilendirme testleri). Mobil tarafta kod satır satır okundu ve `npm test`/`doctor`/`export:android`/`export:ios` yeniden çalıştırıldı. Kodda hiçbir değişiklik yapılmadı; test verisi (6 kullanıcı, 2 ev, 2 harcama, 2 ledger satırı, 3 ödeme — üç turun toplamı) oluşturulup her turun sonunda tamamen silindi.

---

## Genel Sonuç: **CONDITIONAL GO** (önceki turdan bir adım ileride)

16 iddianın **15'i tam doğrulandı**, 1'i (radius birleştirme) neredeyse tam ama tek bir kalıntı değerle "kısmen doğru". Bu turda **hiçbir yeni Kritik veya Yüksek öncelikli güvenlik açığı bulunmadı** — bu, ilk iki turdaki bulguların gerçekten kapatıldığını gösteriyor. Ancak iki **süreçsel** bulgu ortaya çıktı: (1) üç turun **tüm** güvenlik/finansal düzeltmeleri her iki repoda da **hâlâ commit edilmemiş** durumda (RE2-001); (2) önceki turda bulunan `GetAllUsersQuery` artık kod kalıntısı bu turda da ele alınmamış (RE2-002). Gizlilik Politikası/Kullanım Koşulları konusu hâlâ aynı: ekip dürüstçe "gerçek şirket unvanı/adresi eksik" diyor ve bu doğru.

---

## A. Backend Doğrulama Sonuçları

| # | İddia | Sonuç | Kanıt |
|---|---|---|---|
| 1 | Yerel varsayılan JWT anahtarı ≥64 byte (79 byte iddiası) | ✅ Doğrulandı | `compose.local.yml:36` — varsayılan değer 79 UTF-8 byte. |
| 2 | Kısa anahtar uygulama **başlangıcında** (ilk login'de değil) engelleniyor | ✅ Doğrulandı, canlı test edildi | Kod: `Program.cs:81-85`, `builder.Build()`'dan (satır 235) ve `app.Run()`'dan (satır 371) **önce** çalışıyor. **Canlı test:** `TokenOptions__SecurityKey=TOO_SHORT_KEY_2026` ile container başlatıldığında: `Unhandled exception. System.InvalidOperationException: TokenOptions:SecurityKey must be at least 64 bytes for HS512. at Program.<Main>$ ... Program.cs:line 83` — process anında çöküyor, hiçbir istek kabul etmiyor. İkinci bir savunma katmanı `JwtHelper.cs:34-38`'de de mevcut. |
| 3 | Production/staging anahtar uzunlukları uzaktan (değer yazdırılmadan) kontrol edildi, ikisi de 128 byte | ⚠️ Ekibin iddiası — **bu denetim tarafından bağımsız olarak doğrulanamadı** (production/staging sırlarına bu denetimde erişim/istek yapılmadı, talimatlara uygun olarak). Yalnızca yerel ortamdaki mekanizmanın (fail-fast guard) gerçek ve etkili olduğu doğrulandı; production değerinin gerçekten 128 byte olduğunu üçüncü bir göz olarak teyit etmek için ayrı, yetkilendirilmiş bir kanaldan (ör. ekip üyesinin ekranını paylaşması) doğrulama önerilir. |
| 4 | `ApprovePayment`/`RejectPayment` controller'da alacaklı kontrolü + handler'da da korunuyor | ✅ Doğrulandı, canlı test edildi | Kod: `PaymentsController.cs:143-158` (`if (payment.AlacakliUserId != currentUserId.Value) return Forbid();` — mediator'a gitmeden önce), handler'da da aynı kontrol korunmuş (`ApprovePaymentCommandHandler.cs:44-45`, `RejectPaymentCommandHandler.cs:29-30`). **Canlı test:** gerçek bir ev + 100 TL borç + ödeme kaydı kurulup — borçlu (alacaklı değil) onaylamaya çalıştı → **403**; hiç ilgisi olmayan bir kullanıcı onaylamaya çalıştı → **403**; gerçek alacaklı onayladı → **200 + ledger doğru güncellendi**. Reddetme için de aynı: borçlu reddetmeye çalıştı → **403**. |
| 5 | `ForbiddenAccessException` gerçek/ayrı bir tip; yetki hataları 403, kimlik doğrulama hataları 401 | ✅ Doğrulandı, canlı test edildi | Kod: `Core/Exceptions/ForbiddenAccessException.cs:3` (gerçek `sealed class`), `Program.cs:304-309` → 403 eşlemesi, `Program.cs:311-316` → `UnauthorizedAccessException` hâlâ 401'e eşleniyor (artık yalnızca gerçek kimlik/login hataları için kullanılıyor). **Canlı test:** token yok → **401**; geçersiz/bozuk token → **401**; geçerli ama yetkisiz kullanıcı (yanlış taraf) → **403**. Üç durum da beklenen şekilde ayrıştı. |
| 6 | `DeletePayment`, `ApprovePayment`/`RejectPayment`, ev ayrılma/üye çıkarma, ev silme artık `ForbiddenAccessException` kullanıyor | ✅ Doğrulandı | `DeletePaymentCommandHandler.cs:23`, `ApprovePaymentCommandHandler.cs:45`, `RejectPaymentCommandHandler.cs:30`, `LeaveHouseCommandHandler.cs:34`, `DeleteHouseCommandHandler.cs:24` — beşi de artık `ForbiddenAccessException` fırlatıyor. |
| 7 | `dotnet build EvArkadasim.sln --no-restore` | ✅ 0 hata, 0 uyarı | Bağımsız olarak yeniden çalıştırıldı, sonuç aynı. |
| 8 | `git diff --check` | ✅ Yalnızca satır sonu (LF/CRLF) uyarıları, gerçek boşluk hatası yok | Doğrulandı. |

### Bu turda yeni bulunanlar (backend)

**RE2-001 — [Süreç, Yüksek önem] Üç turun tüm güvenlik/finansal düzeltmeleri her iki repoda da commit edilmemiş**
- **Kanıt:** `git status --porcelain` her iki repoda da (backend + mobil) `CryptoDemoController.cs` silinmesi, `ForbiddenAccessException`, JWT anahtar uzunluğu kontrolü, concurrency token migration'ı, tüm IDOR düzeltmeleri, mobil dashboard hata ayrıştırması, silinen `Odemeler.js`/`premiumTheme.js`/`Button.tsx`/`Card.tsx` dahil **her şey** `M`/`D`/`??` (staged olmayan, commit edilmemiş) durumda.
- **Kullanıcı etkisi:** Bu değişiklikler yalnızca bu makinenin çalışma dizininde var. `git checkout .`, `git reset --hard`, disk arızası, farklı bir makineden fresh clone, veya CI/CD'nin git'ten deploy alması gibi herhangi bir senaryo **üç turluk tüm güvenlik düzeltmesini sessizce sıfırlar** — geri dönüş, orijinal Kritik açıkların (CryptoDemoController, yetkisiz ödeme onayı vb.) yeniden canlıya çıkması anlamına gelir.
- **Önerilen çözüm:** Bu değişiklikler **mağazaya çıkmadan önce** anlamlı commit(ler) halinde repoya işlenmeli ve push edilmeli.
- **Önem:** Yüksek (kod hatası değil ama tek başına tüm güvenlik çalışmasını riske atan bir süreç boşluğu).

**RE2-002 — `GetAllUsersQuery`/`GetAllUsersQueryHandler` kalıntısı hâlâ duruyor**
- Önceki round-1 yeniden denetimde bulunmuştu ("route kaldırıldı ama handler/DTO silinmedi"), bu round-2 düzeltme raporunda hiç bahsedilmemiş ve kod hâlâ aynı: `Application/Features/Users/Queries/GetAllUsers/GetAllUsersQuery.cs` ve `GetAllUsersQueryHandler.cs` mevcut, hiçbir controller tarafından çağrılmıyor ama MediatR tarafından hâlâ keşfedilebilir durumda.
- **Önem:** Düşük (bugün istismar edilemiyor) ama gelecekte biri yanlışlıkla yeniden bağlarsa tüm kullanıcı dizinini sızdıran endpoint sessizce geri döner.

**RE2-003 — `HousesController`'da artık tetiklenemeyen ölü `catch (UnauthorizedAccessException)` blokları**
- `HousesController.cs:268` (`RemoveMember`) ve `:298` (`DeleteHouse`) hâlâ `catch (UnauthorizedAccessException) { return Forbid(); }` içeriyor, ama sarmaladıkları handler'lar (`LeaveHouseCommandHandler`, `DeleteHouseCommandHandler`) artık `ForbiddenAccessException` fırlatıyor — bu catch blokları asla tetiklenemez. **Dışarıdan gözlemlenen davranış hâlâ doğru** (exception global handler'a düşüp doğru şekilde 403'e çevriliyor) ama kod kalıntısı kafa karıştırıcı.
- **Önem:** Düşük (kozmetik/temizlik).

---

## B. Mobil Doğrulama Sonuçları

| # | İddia | Sonuç | Kanıt |
|---|---|---|---|
| 1 | Dashboard 4 ayrı hata bayrağı tutuyor (expenses/debt/pendingPayments/scheduled) | ✅ Doğrulandı | `useRoomoraDashboard.js:61-66` — `Promise.allSettled` ile her kaynağın ayrı `errors.{expenses,debt,pendingPayments,scheduled}` alanı var. |
| 2 | Ana Sayfa yalnızca expense/debt hatasında engelleniyor | ✅ Doğrulandı | `RoomoraHome.js:49` → `data.errors?.expenses \|\| data.errors?.debt`. |
| 3 | Giderler/Harcama Özeti yalnızca expense hatasına tepki veriyor | ✅ Doğrulandı | `RoomoraExpenses.js:42`, `HarcamaOzeti.js:31` → `data.errors?.expenses`. |
| 4 | Faturalar expense VEYA scheduled hatasına tepki veriyor | ✅ Doğrulandı | `RoomoraBills.js:38` → `data.errors?.expenses \|\| data.errors?.scheduled`. |
| 5 | Başarısız kaynakta "₺0,00" yerine "—" gösteriliyor | ✅ Doğrulandı | `RoomoraExpenses.js:89`, `HarcamaOzeti.js:69`, `RoomoraBills.js:107-109` — üçü de `screenError ? '—' : ...` deseni kullanıyor. |
| 6 | `Odemeler.js` silindi, sıfır import referansı | ✅ Doğrulandı (küçük kalıntıyla) | Dosya yok, hiçbir import yok. **Yeni bulgu:** `PremiumBottomNav.js` (kendisi de ölü/kullanılmayan bir dosya) hâlâ `screen: 'Odemeler'` string'ini içeriyor — import değil ama silinmiş ekrana isim referansı bırakıyor. |
| 7 | `premiumTheme.js` silindi, sıfır import | ✅ Doğrulandı | Dosya yok, grep temiz. |
| 8 | Mükerrer `Button.tsx`/`Card.tsx` kaldırıldı, dangling import yok | ✅ Doğrulandı (yeniden yönlendirme ile) | Eski dosyalar artık `premium/Button.tsx`/`premium/Card.tsx`'e delege eden ince re-export sarmalayıcılar; hiçbir çağıran kırılmamış. |
| 9 | Radius `theme.radius.sm` (8px) olarak birleştirildi | ⚠️ **Kısmen doğrulandı** — neredeyse tamamı 8px'e çekilmiş ama **tek bir kalıntı** var | `CanonicalUI.js`, `premium/Button.tsx`, `premium/Card.tsx`, `CommonStyles.js`, `DateField.js/.web.js`, `HeroHeader.tsx`, `MainTabBar.js`, `PrimaryActionCard.js` (kart konteyneri) — hepsi `theme.radius.sm` kullanıyor. **Ama** `PrimaryActionCard.js:53` — `iconWrap: { borderRadius: 10 }` hâlâ hardcoded 10 (token değil, 8 de değil). Daire/pill şekilleri (avatar, rozet — `size/2` veya `999`) meşru şekilde 8px dışında, regresyon değil. |
| 10 | ~10 ölü ekran hâlâ `CommonStyles.js` import ediyor | ✅ Doğrulandı (beklenen — düzeltme raporu bunu zaten "yapılmadı" olarak işaretlememiş, yalnızca CommonStyles'ın kendisinin token'landığını iddia etmiş) | 10 dosya (`AlacakBorcIcmi.js`, `Alacaklarim.js`, vb.) hâlâ import ediyor, hiçbiri `App.js`'ten erişilebilir değil (`GirisYap.js` hariç, o canlı). |
| 11 | Gizlilik/Koşullar: saklama, silme/anonimleştirme, iletişim eklendi; hukuki-inceleme uyarısı kaldırıldı; gerçek şirket adı/adresi hâlâ yok | ✅ Doğrulandı | `SettingsInfo.js:19-40` — saklama (satır 25), silme/anonimleştirme (satır 26), destek e-postası `info.ev.arkadasim@gmail.com` (satır 27) eklenmiş. Eski uyarı metni (`"yayın öncesinde hukuki kontrolden..."`) koddan tamamen kaldırılmış (yalnızca eski rapor dosyalarında kalıntı olarak duruyor). **Gerçek şirket/veri sorumlusu unvanı veya fiziksel/tescilli adres hâlâ hiçbir yerde yok** — yalnızca destek e-postası ve "Roomora" ürün adı var. |
| 12 | Mobil API interceptor yalnızca 401'de oturumu kapatıyor, 403'te kapatmıyor | ✅ Doğrulandı | `src/services/api.js:76` — yalnızca `status === 401` kontrolü var; 403 hiçbir token temizleme tetiklemeden `Promise.reject`'e düşüyor. |
| 13-16 | `npm test`, `npm run doctor`, `export:android`, `export:ios` | ✅ Dördü de geçti | Bağımsız olarak yeniden çalıştırıldı, sonuçlar tutarlı (test geçti, doctor 20/20, iki export de başarılı). |

### Bu turda yeni bulunanlar (mobil)

**RE2-004 — `PrimaryActionCard.js:53` hâlâ hardcoded `borderRadius: 10` kullanıyor**
- Diğer tüm bileşenler `theme.radius.sm` (8px) kullanırken bu ikon-çip'i tek başına 10px'te kalmış. Görsel olarak çok küçük bir tutarsızlık (bir ikon kutusu), fonksiyonel etkisi yok.
- **Önem:** Düşük.

**RE2-005 — `PremiumBottomNav.js` (ölü kod) silinmiş `Odemeler` ekranına isim referansı taşıyor**
- Bu dosyanın kendisi hiçbir yerden import edilmiyor (ölü kod), dolayısıyla derleme zamanı bir risk yok. Ama "Odemeler.js kaldırıldığında sıfır referans kaldı" iddiası tam anlamıyla doğru değil — bir string referansı ölü bir dosyada hâlâ duruyor.
- **Önem:** Çok düşük (kozmetik).

---

## C. Gizlilik Politikası / Kullanım Koşulları — Durum Değişmedi, Netleştirme

Metin somut olarak iyileşti (veri saklama, hesap silme/anonimleştirme davranışı ve destek iletişim adresi artık var, kendi kendini işaretleyen "hukuki incelemeye muhtaç" uyarısı kaldırıldı). **Ancak** hâlâ eksik olan, ve düzeltme raporunun da kendisinin açıkça kabul ettiği tek şey: **gerçek veri sorumlusu/işletmeci unvanı ve tescilli/fiziksel adres.** Bu, bir mühendislik denetiminin dolduramayacağı bir bilgi — şirketin gerçek ticari unvanı, adresi ve varsa MERSİS/vergi kimlik bilgisi olmadan bu metin KVKK'nın aydınlatma yükümlülüğünü karşılamaz. **Bu rapor da aynı şekilde teyit eder: bu, mühendislik hatası değil, mağaza başvurusu öncesi doldurulması gereken bir ürün/hukuk girdisidir.**

---

## Sonuç Listeleri

### A. Mağazaya çıkmadan kesinlikle çözülmesi gerekenler
- **RE2-001**: Üç turun tüm güvenlik/finansal düzeltmelerinin her iki repoda da commit edilip push edilmesi — bu olmadan hiçbir düzeltme "kalıcı" sayılamaz.
- **Gizlilik Politikası / Kullanım Koşulları**: gerçek veri sorumlusu unvanı ve tescilli adres eklenmeli (hukuki inceleme + ürün kararı, kod değişikliği değil).
- Production/staging JWT anahtar uzunluğunun (128 byte iddiası) bağımsız bir kanaldan (ör. ikinci bir yetkili kişi tarafından, değer okunmadan yalnızca uzunluk teyidi ile) doğrulanması önerilir — bu denetim bunu bağımsız olarak teyit edemedi.

### B. v1.0 sonrasına bırakılabilecekler
- **RE2-002**: `GetAllUsersQuery`/`GetAllUsersQueryHandler` kalıntı kodunun silinmesi.
- **RE2-003**: `HousesController`'daki ölü `catch (UnauthorizedAccessException)` bloklarının `catch (ForbiddenAccessException)` ile değiştirilmesi veya kaldırılması.
- **RE2-004**: `PrimaryActionCard.js`'teki hardcoded `borderRadius: 10` değerinin `theme.radius.sm`'e çekilmesi.
- **RE2-005**: Ölü `PremiumBottomNav.js` dosyasının (ve içindeki eski `Odemeler` referansının) tamamen silinmesi.
- Önceki iki raporun B listesindeki, bu turda değişmemiş maddeler (10 ölü ekranın `CommonStyles` ile birlikte silinmesi, FlatList dönüşümü, tam erişilebilirlik geçişi, backend otomatik test projesi eklenmesi) geçerliliğini koruyor.

### C. Ürün veya hukuk kararı gerektirenler
- Gizlilik Politikası/Kullanım Koşulları'nın nihai hukuki metni (yukarıda tekrar vurgulandı).
- Önceki raporlardan taşınan, değişmemiş karar noktaları (Notlar'ın Stitch konseptine genişletilmesi, Expo slug'ının korunması).

---

## Test Edilemeyen / Bu Turda Kapsam Dışı Kalan Alanlar
- Production/staging ortamındaki gerçek JWT anahtar uzunluğu bu denetimden bağımsız olarak doğrulanamadı (talimatlara uygun olarak sır değerlerine erişilmedi/istenmedi) — yalnızca ekibin beyanı olarak rapora geçti.
- iOS Simulator / Android emulator testi yine yapılamadı (ortam kısıtı, önceki iki raporla aynı).
- Mobil tarafın 403 durumunu kullanıcıya nasıl gösterdiği (ör. "Bu işlem için yetkiniz yok" gibi bir UI mesajı var mı) ayrıca görsel/cihaz testiyle doğrulanmadı — yalnızca interceptor'ın oturumu **yanlışlıkla sonlandırmadığı** doğrulandı, kullanıcıya gösterilen mesajın kalitesi değerlendirilmedi.
