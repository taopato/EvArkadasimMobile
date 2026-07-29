# Roomora — Bağımsız UI/UX, Kullanıcı Akışı, İş Algoritması ve Release-Readiness Denetimi

**Denetim tarihi:** 2026-07-27
**Denetleyen:** Claude Code (statik kod analizi + yerel ortam çalıştırma testleri)
**Kapsam:** `EvArkadasimMobile` (React Native/Expo) + `EvArkadasimBackend` (.NET/EF Core)
**Metodoloji:** Kaynak kod tam okuma (screens, services, navigation, backend Controllers/Application/Domain), yerel Docker backend + SQL Server ile canlı endpoint/güvenlik doğrulaması, `docs/implemented-screens` ekran görüntülerinin `docs/design-reference/stitch-final-light` referanslarıyla piksel-piksel karşılaştırılması, otomatik test/build komutlarının çalıştırılması. Kodda hiçbir değişiklik yapılmamıştır.

---

## 1. Executive Summary

Roomora, kod tabanı olarak olgun ve büyük ölçüde çalışır durumda bir uygulama (63 ekran dosyası, 45'i aktif olarak yönlendirilmiş, backend'de 9 controller, CQRS/MediatR mimarisi). Otomatik testler (`npm test`, `expo-doctor`, Android/iOS export) sorunsuz geçiyor ve para/tarih biçimlendirme, Hanken Grotesk font yükleme, ana renk paleti gibi temel tasarım-sistemi kuralları doğru uygulanmış durumda.

Ancak denetim, **mağazaya çıkmadan mutlaka kapatılması gereken çok sayıda kritik güvenlik açığı** ortaya çıkardı: en başta, kimlik doğrulaması olmayan bir "kripto dersi" controller'ı gerçek `Users` tablosuna yazabiliyor ve imzalama anahtarını sızdırıyor; ayrıca `AddPaymentWithAllocations` endpoint'i herhangi bir yetki kontrolü yapmadan herhangi bir evin ledger (borç/alacak) kayıtlarını "ödendi" olarak işaretleyebiliyor. Bunlara ek olarak `HousesController` ve `PaymentsController` içinde 10'dan fazla IDOR (Insecure Direct Object Reference) açığı tespit edildi — kullanıcılar `houseId`/`userId` tahmin ederek başka evlerin üye listesini, borç/alacak verilerini ve ödeme geçmişini görebiliyor.

Ürün tarafında en büyük bulgu: **Notlar (Ev Notları) ekranı, Stitch tasarımından tamamen farklı, çok daha basit bir "checklist" uygulaması olarak inşa edilmiş** — Stitch'teki zengin, kategorili, beğeni/fotoğraf destekli "ev duyuru panosu" konsepti hiç uygulanmamış. Ayrıca kod tabanında **14 tamamen ölü (kullanılmayan) ekran dosyası** var; bunlardan biri (`OdemeEkle.js`) aktif olsaydı hatalı ondalık ayracı ayrıştırması ve eksik fazla-ödeme koruması içeriyor.

### Rakamlarla durum
- ✅ `npm test`, `npm run doctor`, `expo export --platform android/ios` → hepsi geçti
- ❌ iOS Simulator: Windows ortamında hiçbir zaman çalıştırılamaz
- ❌ Android emulator/adb: bu makinede kurulu değil, gerçek cihaz/emulator testi yapılamadı
- ❌ Uçtan uca (E2E) canlı UI testi: yerel backend SMTP sırları yapılandırılmamış olduğu için kayıt akışı tamamlanamadı (bkz. §22)
- 🔴 **3 Kritik, 9 Yüksek, ~15 Orta, ~10 Düşük** öncelikli bulgu (bkz. §3-6)

---

## 2. Public Release Verdict: **NO-GO**

Gerekçe: UX-A05 (yetkisiz ödeme/ledger manipülasyonu) ve SEC-A01 (CryptoDemoController'ın canlı Users tablosuna kimlik doğrulamasız yazması) üretim ortamında deploy edilirse, saldırganların (a) rastgele kullanıcı hesapları oluşturup gerçek JWT imzalama anahtarını ele geçirmesine ve (b) herhangi bir evin finansal kayıtlarını sahtelemesine izin verir. Bu ikisi tek başına NO-GO için yeterlidir. Ayrıca gizlilik politikası/kullanım koşulları ekranları hâlâ placeholder metin içeriyor ("bu metin yayın öncesinde hukuki kontrolden geçirilmelidir") — bu da mağaza gönderimini ayrıca engeller.

**Kritik ve Yüksek öncelikli bulgular (§3-4) düzeltilip yeniden doğrulandıktan sonra CONDITIONAL GO değerlendirilebilir.**

---

## 3. Kritik Bulgular (Critical)

### SEC-001 — CryptoDemoController canlı Users tablosuna kimlik doğrulamasız yazıyor ve JWT imzalama anahtarını sızdırıyor
- **Önem:** Critical
- **Ekran/Akış:** N/A (backend-only, tüm kullanıcıları etkiler)
- **Kaynak dosya:** `EvArkadasim.API/Controllers/CryptoDemoController.cs:19-216` (`SeedUser` 29-75, `Login` 77-138, `Profile` 140-171, `VerifyToken` 173-188)
- **Tekrarlama adımları:** Kimlik doğrulaması olmadan `POST /api/CryptoDemo/seed-user` çağrılır → gerçek `AppDbContext.Users` tablosuna hardcoded şifreli (`KriptoDemo2026!`) bir satır yazılır/üzerine yazılır ve yanıt gövdesinde tam şifre hash'i + salt döner. `POST /api/CryptoDemo/login` çağrıldığında yanıt, sabit-kodlanmış HS256 imzalama anahtarını (`DemoSecret`) düz metin olarak döner.
- **Beklenen:** Bu tür eğitim amaçlı endpoint'lerin production build'inde bulunmaması veya en azından `[Authorize(Roles="Admin")]` + ayrı bir demo tablosu kullanması.
- **Gerçekleşen:** Controller hiçbir yetkilendirme gerektirmiyor, gerçek kullanıcı tablosuna yazıyor, gerçek JWT imzalama anahtarını sızdırıyor.
- **Kullanıcı etkisi:** Saldırgan, sızdırılan `DemoSecret` ile (eğer bu anahtar gerçek `TokenOptions:SecurityKey` ile aynıysa doğrulanmalı) sahte JWT üretebilir veya en azından gerçek kullanıcı tablosuna kontrolsüz satır ekleyip DB bütünlüğünü bozabilir.
- **Kaynak:** `EvArkadasim.API/Controllers/CryptoDemoController.cs`
- **Backend endpoint:** `api/CryptoDemo/*` (tüm action'lar)
- **Önerilen çözüm:** Bu controller'ı production build'inden tamamen çıkarın (ayrı bir `#if DEBUG` derleme sembolü veya ayrı proje/environment kontrolü ile), ya da yayından tamamen kaldırın.
- **Risk:** Düşük (kaldırmak sadece bir eğitim demosunu siler, üretim işlevselliğini etkilemez).
- **Regresyon testi:** `api/CryptoDemo/*` route'larının 404 döndüğünü doğrulayın.

### SEC-002 — `AddPaymentWithAllocations`: herhangi bir kimlik doğrulanmış kullanıcı, herhangi bir evin ledger kayıtlarını "ödendi" işaretleyebiliyor
- **Önem:** Critical
- **Ekran/Akış:** Ödeme bildirme (backend'de kullanılan fallback path)
- **Kaynak dosya:** `EvArkadasim.API/Controllers/PaymentsController.cs:131-136`, `Application/Features/Payments/Commands/AddPaymentWithAllocations/AddPaymentWithAllocationsCommandHandler.cs:30-84`
- **Tekrarlama adımları:** Kimlik doğrulanmış herhangi bir kullanıcı `POST /api/Payments/AddPaymentWithAllocations` çağırır; body'de `HouseId`, `BorcluUserId`, `AlacakliUserId` ve `Allocations[].LedgerLineId` alanlarını rastgele/tahmin edilen değerlerle doldurur.
- **Beklenen:** Sadece ev üyeleri kendi evlerinin ödemelerini oluşturabilmeli; ledger satırları yalnızca gerçek onay akışı (Pending→Approve) üzerinden kapatılmalı.
- **Gerçekleşen:** Handler, `Status = Approved` ile doğrudan bir `Payment` oluşturuyor ve verilen `LedgerLineId`'lerin `PaidAmount`/`IsClosed` alanlarını hiçbir ev üyeliği/yetki kontrolü yapmadan güncelliyor.
- **Kullanıcı etkisi:** Herhangi bir kullanıcı, hiç üyesi olmadığı bir evin borç/alacak bakiyesini sıfırlayabilir veya sahte "onaylanmış" ödeme kayıtları üretebilir — finansal veri bütünlüğü tamamen bozulabilir.
- **Kaynak:** `PaymentsController.cs:131-136`, `AddPaymentWithAllocationsCommandHandler.cs:35-73`
- **Backend endpoint:** `POST /api/Payments/AddPaymentWithAllocations`
- **Önerilen çözüm:** Handler'a `IsActiveMemberAsync(HouseId, callerUserId)` kontrolü ekleyin; `BorcluUserId`/`AlacakliUserId`'nin gerçekten o ev üyeleri olduğunu doğrulayın; `LedgerLineId`'lerin gerçekten `HouseId`'ye ait olduğunu doğrulayın; ya da bu endpoint'i tamamen kaldırıp tek onay yolunu Pending→Approve akışına indirin.
- **Risk:** Orta (mobil client bu endpoint'i sadece 404/405/415 fallback'i olarak çağırıyor — `src/services/api.js:281-296` — birincil yol multipart `CreatePayment`; düzeltme mobil tarafı bozmaz).
- **Regresyon testi:** Ev üyesi olmayan bir kullanıcı ile endpoint'i çağırıp 403 dönmesini doğrulayın; sonra gerçek üye ile normal akışın çalışmaya devam ettiğini doğrulayın.

### UX-001 — Notlar ekranı Stitch tasarımıyla temelden farklı; planlanan özellik seti uygulanmamış
- **Önem:** Critical (ürün kapsamı sapması, kod hatası değil)
- **Ekran/Akış:** Notlar (`EvNotlari.js`)
- **Tekrarlama adımları:** Notlar sekmesine gidin.
- **Beklenen (Stitch `L13-ev-notlar.png`):** "Ev Notları" başlığı, üstte "+ Yeni Not Ekle" butonu; her not bir kategori etiketi (Acil/Alışveriş/Kural/Duyuru), yazar adı + göreli zaman ("2 saat önce"), başlık, açıklama metni, opsiyonel checklist maddeleri (üstü çizili tamamlanan), opsiyonel fotoğraf, "kim gördü" avatarları, beğeni sayacı ve "Detay" linki içeren zengin bir sosyal-pano kartı.
- **Gerçekleşen:** Kategori adı = liste adı (ör. "Market"), tek bir listenin maddelerini gösteren düz bir checklist arayüzü (`EvNotlari.js`); kategori etiketleri, yazar/zaman bilgisi, fotoğraf, beğeni, "kim gördü" özellikleri backend'de de (`HouseNoteItem`/`HouseNoteSection` entity'lerinde, bkz. §12) hiç mevcut değil.
- **Kullanıcı etkisi:** Ürün beklentisiyle uygulanan özellik arasında büyük fark var; kullanıcı "duyuru panosu" bekleyip basit bir alışveriş listesi bulacak.
- **Kaynak dosya ve satır:** `src/screens/EvNotlari.js` (tüm dosya); backend `Domain/Entities/HouseNoteItem.cs`, `HouseNoteSection.cs`
- **İlgili backend endpoint:** `GET/POST /api/HouseNotes/*`
- **Stitch referans dosyası:** `docs/design-reference/stitch-final-light/l13_ev_notlar.png`
- **Önerilen çözüm:** Ürün sahibiyle kapsamı netleştirin — ya Stitch'i "gelecek sürüm" olarak işaretleyin ya da mevcut basit checklist'i kategori/yazar/zaman/beğeni alanlarıyla genişletin (backend şema değişikliği gerektirir).
- **Çözüm için tahmini risk:** Yüksek (yeni entity alanları + migration + UI yeniden tasarımı gerektirir).
- **Regresyon testi:** Yeniden tasarım sonrası mevcut liste/madde CRUD akışlarının bozulmadığını doğrulayın.

---

## 4. Yüksek Öncelikli Bulgular (High)

### SEC-003 — `HousesController`: 6 farklı IDOR açığı
- **Önem:** High
- **Ekran/Akış:** Ev bilgileri, Ev üyeleri, Evlerim, Borçlarım/Alacaklarım, Kişi detayı
- **Kaynak dosya:** `EvArkadasim.API/Controllers/HousesController.cs`
- **Detaylar (her biri ayrı bulgu sayılabilir, tek madde altında listelenmiştir):**
  1. `GetById` (satır 50) — üyelik kontrolü yok; herhangi bir `houseId` ile ev adı/kapak fotoğrafı okunabiliyor.
  2. `SendInvitation` (satır 145) — çağıranın o evin üyesi olduğu hiç doğrulanmıyor; herhangi biri herhangi bir eve rastgele e-postayla davet gönderebiliyor.
  3. `GetHouseMembers` (satır 221) — üyelik kontrolü yok; herhangi bir evin üye listesi + borç/alacak bakiyeleri sızdırılıyor.
  4. `GetUserHouses/{userId}` (satır 289) — `userId`'nin çağıranla eşleştiği kontrol edilmiyor; herhangi bir kullanıcının ev listesi okunabiliyor.
  5. `GetUserDebts/{userId}/{houseId}` (satır 297) — üyelik/kendisi-mi kontrolü yok.
  6. `GetUserDebtBetween` (satır 304) — üyelik kontrolü yok; iki rastgele kullanıcı arasındaki borç detayı + son harcamalar sızdırılıyor.
- **Beklenen:** Her endpoint, çağıranın ilgili evin aktif üyesi olduğunu (`IsActiveMemberAsync`) veya sorgulanan `userId`'nin çağıranın kendisi olduğunu doğrulamalı — tıpkı aynı controller'daki `UploadCoverImage`, `RemoveMember`, `DeleteHouse` action'larının doğru yaptığı gibi.
- **Gerçekleşen:** Yukarıdaki 6 action, `[Authorize]` dışında hiçbir ek kontrol yapmıyor.
- **Kullanıcı etkisi:** Herhangi bir kayıtlı kullanıcı, hiç üyesi olmadığı evlerin üye listesini, finansal verilerini ve kişisel borç/alacak detaylarını görebilir — ciddi bir mahremiyet/veri sızıntısı.
- **Önerilen çözüm:** Her action'ın başına `if (!await _houseRepository.IsActiveMemberAsync(houseId, callerId)) return Forbid();` (veya `userId==callerId`) ekleyin — `HouseNotesController`/`ReceiptsController`'daki doğru örüntüyü referans alın.
- **Çözüm için tahmini risk:** Düşük (mevcut doğru örüntü aynı çözümde zaten var, kopyalanabilir).
- **Regresyon testi:** Üye olmayan kullanıcı ile her 6 endpoint için 403 beklenmeli; gerçek üye için normal davranış korunmalı.

### SEC-004 — `PaymentsController`: `DeletePayment` ve `GetPendingPayments` client-supplied kimlikle yetkilendirme yapıyor
- **Önem:** High
- **Kaynak dosya:** `PaymentsController.cs:102-107` (`GetPendingPayments/{userId}`), `PaymentsController.cs:125-129` + `DeletePaymentCommandHandler.cs:17-22` (`DeletePayment`)
- **Tekrarlama adımları:** `GET /api/Payments/GetPendingPayments/{başkasınınId}` çağrılır → başkasının bekleyen ödeme kutusu (tutar, isim, dekont URL'si) görülür. `DELETE /api/Payments/{id}?requestingUserId=<kurbanınId>` çağrılır → handler sadece `payment.BorcluUserId == requestingUserId` kontrolü yapıyor, `requestingUserId`'nin JWT'deki gerçek kullanıcı olduğunu hiç doğrulamıyor.
- **Beklenen:** `requestingUserId` JWT'den (`GetCurrentUserId()`) alınmalı, query param'dan değil.
- **Gerçekleşen:** Query param client tarafından serbestçe belirleniyor.
- **Kullanıcı etkisi:** Bir saldırgan başka bir kullanıcının ödeme kaydını silebilir (soft-delete) veya bekleyen ödeme kutusunu gözetleyebilir.
- **Önerilen çözüm:** `DeletePaymentCommandHandler` ve `GetPendingPayments` action'ını `GetCurrentUserId()`'den alınan JWT kimliğini kullanacak şekilde değiştirin; `PaymentsController.cs:110-123`'teki `ApprovePayment`/`RejectPayment` action'larının doğru yaptığı örüntüyü izleyin.
- **Risk:** Düşük — sadece kimlik kaynağı değişiyor, mobil client zaten kendi kullanıcı ID'sini gönderiyor.
- **Regresyon testi:** Kendi ödemesini silme/görme akışının bozulmadığını doğrulayın.

### SEC-005 — `LedgerLinesController` ve `CreatePayment`/`GetPayments`: ev üyeliği kontrolü yok
- **Önem:** High
- **Kaynak dosya:** `LedgerLinesController.cs:26-39` (`ByExpense`, `ByHouse`), `PaymentsController.cs:49-93` (`CreatePayment`), `PaymentsController.cs:95-100` (`GetPayments`)
- **Gerçekleşen:** Hiçbiri çağıranın evin üyesi olduğunu doğrulamıyor — herhangi bir `houseId`/`expenseId` ile tüm ödeme/ledger geçmişi okunabiliyor veya (CreatePayment için) rastgele iki kullanıcı arasında ödeme kaydı oluşturulabiliyor.
- **Önerilen çözüm:** SEC-003 ile aynı örüntü — `IsActiveMemberAsync` kontrolü ekleyin.
- **Risk:** Düşük. **Regresyon testi:** SEC-003 ile aynı.

### SEC-006 — `UsersController.GetAllUsers`: tüm kullanıcı dizini herkese açık
- **Önem:** High
- **Kaynak dosya:** `UsersController.cs:33-39`
- **Gerçekleşen:** Herhangi bir kimlik doğrulanmış kullanıcı, sistemdeki **tüm kullanıcıların** ad/soyad/e-posta bilgisini dökebiliyor — ev üyeliğiyle sınırlı değil.
- **Kullanıcı etkisi:** Toplu e-posta/spam hedeflemesi veya kullanıcı numaralandırma saldırısı için kullanılabilir.
- **Önerilen çözüm:** Bu endpoint'in gerçek bir kullanım senaryosu yoksa kaldırın; varsa sonuçları çağıranın ortak evi olan kullanıcılarla sınırlayın.
- **Risk:** Orta (mobil client'ta bu fonksiyonun bir çağrısı bulunamadı — muhtemelen ölü/kullanılmayan bir endpoint, kaldırmak güvenli).

### SEC-007 — Ödeme tutarında üst/alt sınır doğrulaması yok (backend)
- **Önem:** High
- **Kaynak dosya:** `Application/Features/Payments/Commands/CreatePayment/CreatePaymentCommandHandler.cs:65-78`, `AddPaymentWithAllocationsCommandHandler.cs`
- **Gerçekleşen:** `Tutar` alanı hiçbir `>0` veya "borçtan fazla olamaz" kontrolünden geçmeden doğrudan kaydediliyor. Onay anında (`ApprovePaymentCommandHandler.cs:61-91`) FIFO algoritması, ödenen tutar açık ledger satırlarının toplamını aşarsa **fazlalığı sessizce siliyor** (ne hataya düşüyor ne de bir yere yansıtıyor).
- **Kullanıcı etkisi:** Kullanıcı 0 veya negatif olmayan ama anlamsız derecede büyük bir tutar girip onaylatabilir; fazla ödenen kısım kaybolur (ne borçluya iade, ne alacaklıya yansır).
- **Önerilen çözüm:** `CreatePaymentCommandHandler`'a `Tutar > 0` validasyonu ekleyin; `ApprovePaymentCommandHandler`'da toplam açık ledger tutarını aşan kısmı reddedin veya "fazla ödeme" olarak ayrı bir bakiyeye yazın.
- **Risk:** Orta. **Regresyon testi:** Tam/kısmi/fazla ödeme senaryolarını backend testleriyle doğrulayın.

### SEC-008 — Ödeme onaylama işlemi race condition'a ve atomik-olmayan yazmaya açık
- **Önem:** High
- **Kaynak dosya:** `ApprovePaymentCommandHandler.cs:46-49` (durum kontrolü), `:84-91` (her ledger satırı için ayrı `SaveChangesAsync`), `:98-104` (payment durumu ayrı commit)
- **Gerçekleşen:** "Zaten onaylı mı?" kontrolü ile asıl durum güncellemesi arasında transaction/concurrency token yok; `Payment` entity'sinde `RowVersion`/`[ConcurrencyCheck]` alanı yok. İki eşzamanlı `ApprovePayment` çağrısı aynı ödemeyi çift onaylayıp ledger'a çift uygulayabilir.
- **Kullanıcı etkisi:** Aynı ödemenin çift tıklanması (ağ gecikmesi + tekrar deneme) durumunda ledger'da çift düşüş riski.
- **Önerilen çözüm:** `Payment`'a `[Timestamp] byte[] RowVersion` ekleyin; `ApprovePaymentCommandHandler`'ı tek bir DB transaction içine alın.
- **Risk:** Orta (migration gerektirir). **Regresyon testi:** Eşzamanlı iki onay isteğinin sadece birinin başarılı olduğunu doğrulayan bir entegrasyon testi ekleyin.

### SEC-009 — Hiçbir entity'de concurrency-token yok (last-write-wins)
- **Önem:** High
- **Kaynak dosya:** `House`, `HouseMember`, `HouseNoteItem`, `HouseNoteSection`, `Invitation`, `Receipt`, `Payment`, `LedgerLine` entity'leri
- **Gerçekleşen:** Hiçbirinde `RowVersion`/`ConcurrencyCheck` yok; tüm güncellemeler "oku-sonra-yaz" ile son yazan kazanır mantığında.
- **Kullanıcı etkisi:** İki kullanıcının aynı notu/ödemeyi eşzamanlı düzenlemesi durumunda sessiz veri kaybı riski (madde J39/İ ile örtüşüyor).
- **Önerilen çözüm:** En azından finansal entity'lere (`Payment`, `LedgerLine`, `Expense`) concurrency token ekleyin.
- **Risk:** Orta-Yüksek (migration + tüm update handler'ların gözden geçirilmesi gerekir).

### UX-002 — `DavetiyeKabul` (davet kabul) ekranı oturum açıkken erişilemiyor
- **Önem:** High
- **Ekran/Akış:** Daveti kabul et (madde E13)
- **Kaynak dosya:** `App.js` — `DavetiyeKabul` route'u sadece unauth branch'te (satır ~210) kayıtlı; authenticated branch'te (satır 213-259) yok. Ancak `linking.config.screens.DavetiyeKabul` (App.js:121-128) global tanımlı ve `DavetiyeKabul.js` (satır 166) zaten oturum açık kullanıcı senaryosunu (hesap değiştirme dahil) kodlamış durumda.
- **Tekrarlama adımları:** Oturum açık bir kullanıcı `https://evarkadasim.co/davetiye-kabul?...` linkine tıklar.
- **Beklenen:** `DavetiyeKabul` ekranı açılıp daveti kabul etme/hesap değiştirme seçeneği sunulmalı.
- **Gerçekleşen:** Route mevcut stack'te tanımlı olmadığı için react-navigation ya sessizce hiçbir şey yapmaz ya da uyarı/hata verir.
- **Kullanıcı etkisi:** Zaten oturum açmış bir kullanıcı arkadaşının davet linkine tıkladığında eve katılamaz — davet akışının en yaygın kullanım senaryosu bu olabilir (uygulamayı zaten kullanan biri yeni bir eve davet edilir).
- **Önerilen çözüm:** `DavetiyeKabul` route'unu authenticated stack'e de ekleyin (App.js:213-259 arasına).
- **Risk:** Düşük (tek satır route ekleme). **Regresyon testi:** Oturum açıkken ve kapalıyken davet linkiyle deep-link açma senaryolarının ikisini de test edin.

### UX-003 — Legal/Gizlilik ekranları placeholder içerik ile mağazaya gidiyor
- **Önem:** High (release blocker, kod hatası değil)
- **Ekran/Akış:** Ayarlar > Gizlilik Politikası / Kullanım Koşulları
- **Kaynak dosya:** `src/screens/SettingsInfo.js:143` (metnin kendisi "Bu metin yayın öncesinde hukuki kontrolden geçirilmelidir" uyarısını içeriyor), satır 136 ("son güncelleme" tarihi `26.07.2026` olarak sabitlenmiş)
- **Önerilen çözüm:** Hukuk ekibinden onaylı nihai metni alıp yerleştirin; "son güncelleme" tarihini dinamik/gerçek tarihle değiştirin.
- **Risk:** Düşük (içerik değişikliği, kod riski yok).

### UX-004 — Ekranların büyük kısmında API hatası sessizce yutuluyor
- **Önem:** High
- **Ekran/Akış:** Ana Sayfa, Giderler, Faturalar, Harcama Özeti, Borçlarım, Alacaklarım, Ödemeler, Bekleyen Ödemeler, Kişi Detayı, Ev Üyeleri, Bildirimler, Fiş Geçmişi, Evlerim — toplam 13+ ekran
- **Kaynak dosya:** `src/hooks/useRoomoraDashboard.js:69-71` (hesaplanan `error` alanı hiçbir tüketici tarafından okunmuyor); ayrıca `RoomoraFinance.js` içindeki `useDebtSummary` (satır 111-113), `PaymentsScreen` (satır 255), `PersonDetailScreen` (satır 373), `EvUyeleri.js:53-54`, `Bildirimler.js:42-43`, `FisGecmisi.js:30-31` — hepsi `catch { setX([]) }` ile sessiz.
- **Tekrarlama adımları:** İnternet bağlantısını kesin veya backend'i durdurun, ilgili ekranı açın.
- **Beklenen:** "Bağlantı hatası, tekrar dene" gibi ayırt edici bir hata durumu.
- **Gerçekleşen:** Ekran, "veri yok" boş durumuyla birebir aynı görünür — kullanıcı ağ sorunu mu yoksa gerçekten hiç verisi mi olmadığını ayırt edemez.
- **Kullanıcı etkisi:** Zayıf bağlantıda kullanıcı yanlışlıkla "hiç borcum/harcamam yok" sanabilir.
- **Önerilen çözüm:** `useRoomoraDashboard`'ın zaten hesapladığı `error` alanını her tüketici ekranda `ErrorState` bileşeniyle render edin (CanonicalUI'da zaten `EmptyState`/`LoadingState` var, aynı ailede bir `ErrorState` eklenebilir).
- **Risk:** Düşük-Orta (13+ ekranda tekrarlayan ama mekanik bir değişiklik).
- **Regresyon testi:** Her etkilenen ekranı offline modda açıp ayırt edici hata mesajı göründüğünü doğrulayın.

### UX-005 — `RoomoraBills.js` (canlı Faturalar ekranı) düzenli gider payını "ödendi" işaretleme arayüzü içermiyor
- **Önem:** High
- **Ekran/Akış:** Faturalar > Planlı Ödemeler
- **Kaynak dosya:** `src/services/api.js:338-341` (`setSharePaid`/`setExternalPaid`), bu fonksiyonların tek çağıranı **ölü** `Faturalar.js` dosyası; canlı `RoomoraBills.js` sadece salt-okunur liste sunuyor (satır 106-128).
- **Beklenen:** Kullanıcı bir kira/aidat payını "ödedim" olarak işaretleyebilmeli (backend `PUT /api/RecurringCharges/cycles/{cycleId}/shares/{userId}` zaten hazır ve doğru yetkilendirilmiş).
- **Gerçekleşen:** Bu işlevi tetikleyecek hiçbir buton/aksiyon canlı ekranda yok.
- **Kullanıcı etkisi:** Kira/aidat ödeme takibi (H maddesi, "Kira ödeme takibi") fiilen eksik — kullanıcı düzenli gideri backend'de var olan mekanizmayla kapatamıyor.
- **Önerilen çözüm:** `RoomoraBills.js`'e her plan satırına "Payımı öde/işaretle" aksiyonu ekleyin.
- **Risk:** Orta (yeni UI + var olan API'yi bağlama).

### PERF-001 — Ana liste ekranları FlatList yerine ScrollView+.map() kullanıyor
- **Önem:** High (uzun listelerde, orta önem genel kullanımda)
- **Ekran/Akış:** Giderler listesi, Faturalar listesi, Fiş Geçmişi, Evlerim
- **Kaynak dosya:** `src/screens/roomora/RoomoraExpenses.js:76` (ana `ScrollView`), `roomora/RoomoraBills.js:63`, `FisGecmisi.js:42-61` (`items.map(...)` bir `ScrollView` içinde), `GrupListesi.js:79-139`
- **Doğrulama:** `grep -rl FlatList src/screens` → sadece 5 dosya; 45 ekran dosyasının geri kalanı virtualize olmayan `ScrollView`/`.map()` kullanıyor.
- **Kullanıcı etkisi:** Çok sayıda harcama/fatura/fiş biriken bir evde (100+ kayıt) bu ekranlar tüm satırları aynı anda render eder — kaydırma performansı düşer, bellek kullanımı artar.
- **Önerilen çözüm:** Bu 4 ekranı `FlatList`'e taşıyın (zaten `roomora/RoomoraFinance.js` içindeki bazı listelerde `FlatList` kullanılmış, örnek alınabilir).
- **Risk:** Düşük-Orta (mevcut sayfalama/gruplama mantığı FlatList `renderItem`'a taşınmalı).

---

## 5. Orta Öncelikli Bulgular (Medium)

| ID | Özet | Kaynak | Önerilen çözüm |
|---|---|---|---|
| UX-006 | `HarcamaEkle.js:544` — "kişi başı" özet etiketi kişisel kalem düşülmeden önceki tam tutarı bölüyor, gönderilen `sharedAmount` doğru ama gösterim yanlış | `HarcamaEkle.js:544` vs `:213` | Etiketi `sharedAmount / participantIds.length` kullanacak şekilde düzeltin |
| UX-007 | `DuzenliGiderEkle.js` "Planı Kaydet" butonunda çift-gönderim koruması yok (diğer tüm create ekranlarında var) | `DuzenliGiderEkle.js:92-181,348` | `saving` state + `disabled` prop ekleyin |
| UX-008 | `RoomoraFinance.js:455` — bilinen bir borç seçilmediğinde (`maxAmount===0`) fazla-ödeme sınırı devre dışı kalıyor (`if (maxAmount && ...)` kısa devre) | `RoomoraFinance.js:448-455` | `maxAmount != null` şeklinde `0` durumunu da kapsayan bir kontrole geçin |
| UX-009 | Notlar ekranında son seçilen liste/mod (Aktif/Geçmiş) uygulama yeniden başlatıldığında hatırlanmıyor | `EvNotlari.js` (AsyncStorage kullanılmıyor) | `HarcamaEkle.js:80-92`'deki AsyncStorage örüntüsünü örnek alın |
| UX-010 | `GrupListesi.js` ev listesi yüklemesinde `try/catch` yok, sadece `finally` var — reddedilen promise yakalanmıyor | `GrupListesi.js:39-48` | `try/catch` ekleyin |
| UX-011 | Ödemeler ekranında (koyu lacivert `primary[900]` kahraman kartı) lacivert `mark-navy.png` logosu neredeyse görünmez, doğru varyant (`mark-white.png`) hiç kullanılmıyor | `Odemeler.js:216,269` | `BrandMark` bileşenine arka plan rengine göre `mark-white`/`mark-navy` seçen bir `tone` prop'u ekleyin |
| UX-012 | `BrandMark` bileşeni `variant="mark"` değerini tanımıyor, sessizce dolgulu `adaptive-icon.png`'ye düşüyor (küçük/donuk görünüm) | `src/components/BrandMark.js`, kullanım: `RoomoraAuthFlows.js:30` | `BrandMark.js`'e `"mark"` case'i ekleyip `mark-navy.png`'ye yönlendirin |
| UX-013 | Splash ekranı: `splash.png` tam kare (1242×2436, %0 şeffaf kenar boşluğu) ama `app.config.js` onu 220pt genişliğe küçültüp `#eef4fa` arka plan üstünde ortalıyor — asset/konfig uyumsuz | `app.config.js:21-29`, `src/assets/splash.png` | Ya `imageWidth`'i kaldırıp tam ekran gösterin ya da 220pt'lik gerçek bir logo-only asset üretin |
| UX-014 | Splash arka planı (`#eef4fa`) tasarım sisteminin `background`(#F7F9FC)/`surface`(#FFFFFF) tokenlarından farklı üçüncü bir mavi | `app.config.js:26` | `#F7F9FC` ile değiştirin |
| UX-015 | `app.json` slug'ı hâlâ eski marka adını taşıyor: `"slug": "ev-arkadasim"` | `app.json:5` | EAS proje geçiş planı yapılmadan değiştirilmemeli — en azından takip edilecek bir borç olarak not edilmeli |
| UX-016 | 4 farklı border-radius/shadow sistemi eşzamanlı var (`theme.radius`, `premium/*`, `CommonStyles.js`, `CanonicalUI.js`) — 6/8/10/12/14/16/18/19/22/23/32/999 gibi en az 12 farklı radius değeri | `src/shared/ui/CommonStyles.js`, `CanonicalUI.js`, `premium/Button.tsx`, `premium/Card.tsx` | Tek bir `theme.radius` kaynağına konsolide edin |
| UX-017 | `letterSpacing:0` kuralı 6 dosyada ihlal ediliyor (0.6-0.8 arası değerler + iki OTP input'ta `8`) | `Ayarlar.js:325`, `AnaSayfa.js:515,529`, `Odemeler.js:277`, `Dogrulama.js:186`, `RoomoraAuthFlows.js:165` | OTP input'lardaki `8` değeri görsel okunabilirlik için kasıtlı olabilir — ürünle onaylanmalı; diğerleri `0`'a çekilmeli |
| UX-018 | `AnaSayfa.js`, `Ayarlar.js`, `Odemeler.js` (ölü dosyalar) ve bazı canlı stiller `fontWeight` set edip `fontFamily` set etmiyor → Hanken Grotesk yerine sistem fontuna düşme riski | Çok sayıda satır, bkz. tema ajanı raporu | Global bir themed `Text` bileşeni zorunlu kılınmalı (`Text.defaultProps` yerine wrapper component) |
| UX-019 | `CanonicalUI.js` (neredeyse her Roomora ekranında kullanılan paylaşılan bileşen) 10+ hardcoded hex renk içeriyor, theme tokenlarını bypass ediyor | `CanonicalUI.js:243,330,341,343,345,351,354,356,362,411,465` | Tüm hex'leri `theme.colors.*` referanslarına çevirin |
| UX-020 | `FisDetayi.js` içinde yeşil/kırmızı renkler semantik olmayan (kişi ayırt etme, "ortak" kategori) bağlamlarda kullanılıyor | `FisDetayi.js:33-39,685,739` | Kategori ayrımı için nötr/marka renk paleti (mavi tonları) kullanın, yeşil/kırmızıyı sadece borç/alacak için saklayın |
| UX-021 | `premiumTheme.js` — spec'i her eksende (renk, font, letter-spacing) ihlal eden, ölü ama tek import uzaklıkta olan bir tema dosyası | `src/shared/theme/premiumTheme.js` | Dosyayı silin veya açıkça `@deprecated` işaretleyip CI'da import edilmediğini doğrulayan bir lint kuralı ekleyin |
| UX-022 | `palettes.js`'teki `forest`/`teal` alternatif paletleri, `primary` rengini yeşile çekiyor — `success` de yeşil olduğu için marka rengi ile "alacak" semantiğinin renk çakışması riski | `palettes.js:26-43,83-100` | Palet seçiminde `success`/`error` renklerinin her palette'te sabit kalmasını garanti edin (zaten öyle görünüyor) ama `primary` yeşil tonlarını paletlerden çıkarın |
| UX-023 | `icon.png` (iOS ana ikon) tam kanvası dolduran, alfa kanallı (şeffaf) bir PNG — Apple iOS ikonlarında şeffaflık önerilmez | `src/assets/icon.png` (1024×1024, RGBA) | Şeffaflığı kaldırıp opak arka planla dışa aktarın |
| PERF-002 | `useRoomoraDashboard` hook'u Ana Sayfa, Giderler, Faturalar, Harcama Özeti ekranlarının her birinde ayrı ayrı çağrılıyor gibi görünüyor — ekranlar arası veri paylaşımı/cache yok | `src/hooks/useRoomoraDashboard.js` + 4 ekran | Ekranlar arası geçişte gereksiz tekrar fetch'i azaltmak için bir query-cache katmanı (React Query vb.) değerlendirin |
| A11Y-001 | 45 ekran dosyasından sadece 12'sinde `accessibilityLabel`/`accessibilityRole` kullanılıyor (~%27 kapsama) | grep sonucu, bkz. §16 | Özellikle ikon-only butonlar (geri, sil, favori) için erişilebilirlik etiketleri eklenmeli |

---

## 6. Düşük Öncelikli Bulgular (Low)

| ID | Özet | Kaynak |
|---|---|---|
| UX-024 | 14 ölü ekran dosyası repo'da duruyor (bkz. §7, dead-code tablosu) — gelecekte yanlışlıkla yeniden bağlanma riski | `src/screens/*.js` (14 dosya) |
| UX-025 | Ölü `OdemeEkle.js` dosyasında ondalık ayrıştırma hatası (`replace(',', '.')` sadece ilk virgülü değiştiriyor, "1.234,56" yanlış parse ediliyor) ve fazla-ödeme sınırı hiç yok — şu an çalışmadığı için risksiz ama silinmeli | `src/screens/OdemeEkle.js:112,146-151` |
| UX-026 | `ReceiptsController` action'ları üyelik kontrolünden **önce** DB'den fiş kaydını çekiyor — 404 vs 403 zamanlama farkı düşük şiddetli bir bilgi sızıntısı oluşturuyor | `ReceiptsController.cs:158-161` |
| UX-027 | Hesap silme (AccountDeletion) token'ı tek kullanımlık olarak işaretlenmiyor (15 dk boyunca teorik olarak tekrar kullanılabilir) ama hesap ilk kullanımda zaten pasif hale geldiği için pratikte istismar edilemiyor | `AccountDeletionController.cs` |
| UX-028 | `LedgerEntry` adında backend'de kullanılmayan (DbSet olarak kayıtlı olmayan) ölü bir entity var | `Domain/Entities/LedgerEntry.cs`, `AppDbContext.cs:28` |
| UX-029 | `getUserDebtsSafe` ve `scheduledChargesApi.getMyDue`/`remove` gibi bazı mobil servis fonksiyonları hiç çağrılmıyor (ölü kod) | `src/services/api.js:377-386,341-344` |
| UX-030 | Standalone `Button.tsx`/`Card.tsx` (canlı `premium/*` versiyonlarından farklı padding/radius'a sahip, kullanılmayan ikinci bir bileşen seti) | `src/shared/ui/Button.tsx`, `Card.tsx` |

---

## 7. Ekran Envanteri

**Yöntem notu:** `src/navigation` klasörü yok; tüm route ağacı `App.js` içinde tek bir `NativeStackNavigator` + `BottomTabNavigator` olarak tanımlı. Aşağıdaki envanter her ekran dosyasının gerçekten `App.js`'ten erişilebilir olup olmadığı doğrulanarak çıkarılmıştır (sadece dosya var diye "hazır" sayılmamıştır).

### 7.1 Aktif (yönlendirilmiş) ekranlar

| Ekran adı | Kaynak dosya | Navigasyon yolu | API bağımlılığı | Loading | Empty | Error | Light | Dark | Durum |
|---|---|---|---|---|---|---|---|---|---|
| Giriş Yap | `GirisYap.js` | RootStack›Login | authApi.login/googleLogin/appleLogin, houseApi.* | ✅ buton-local | n/a | ✅ Alert | ✅ | ✅ (tema tokenları) | Hazır |
| Kayıt Ol | `KayitOlForm.js` (via `KayitOl.js`) | RootStack›Register/SignupScreen | authApi.sendVerificationCode | ✅ | n/a | ✅ | ✅ | ✅ | Hazır |
| Şifremi Unuttum | `RoomoraAuthFlows.js:ForgotPasswordScreen` | RootStack›ForgotPasswordScreen | authApi.sendVerificationCode | ✅ (label swap) | n/a | ✅ | ✅ | ✅ | Hazır |
| Şifre Sıfırla | `RoomoraAuthFlows.js:ResetPasswordScreen` | RootStack›ResetPasswordScreen | authApi.resetPassword | ✅ | n/a | ✅ | ✅ | ✅ | Hazır |
| Doğrulama Kodu | `RoomoraAuthFlows.js:VerificationScreen` | RootStack›VerificationScreen | authApi.verifyCodeAndRegister/sendVerificationCode | ✅ | n/a | ✅ | ✅ | ✅ | Hazır |
| Daveti Kabul Et | `DavetiyeKabul.js` | RootStack›DavetiyeKabul (**yalnızca unauth branch — bkz. UX-002**) | houseApi.acceptInvitation/getById, authApi.verifyCodeAndRegister | ✅ | ✅ | ✅ | ✅ | ⚠ hardcoded `#ffffff` (satır 191,254,328,343,401) | Kısmen hazır |
| Ana Sayfa | `roomora/RoomoraHome.js` | MainTabs›Home | useRoomoraDashboard (expenses/debts/payments/charges), houseApi.getUserHouses | ✅ | ✅ | ❌ (UX-004) | ✅ | ✅ | Kısmen hazır |
| Giderler (liste) | `roomora/RoomoraExpenses.js` | MainTabs›TumHarcamalar (+alias `HarcamaListesi`/`ExpenseListScreen`) | useRoomoraDashboard | ✅ | ✅ | ❌ (UX-004) | ✅ | ✅ | Kısmen hazır (+ PERF-001) |
| Harcama Ekle | `HarcamaEkle.js` | Stack›HarcamaEkle | houseApi.getMembers, expensesApi.create, receiptsApi.scan | ⚠ üye yüklemede yok | ⚠ 0 üye durumu yok | ✅ (Alert/Toast) | ✅ | ✅ | Kısmen hazır |
| Harcama Detayı | `HarcamaDetayi.js` | Stack›ExpenseDetail/HarcamaDetayi | expensesApi.getById/update/remove, ledgerApi.byExpense | ✅ | ✅ | ⚠ (empty ile karışıyor) | ✅ | ✅ | Kısmen hazır |
| Harcama Özeti | `HarcamaOzeti.js` | Stack›HarcamaOzeti | useRoomoraDashboard | ✅ | ✅ | ❌ (UX-004) | ✅ | ✅ | Kısmen hazır |
| Düzenli/Taksitli Gider Ekle | `DuzenliGiderEkle.js` | Stack›DuzenliGiderEkle (+3 alias) | houseApi.getMembers, expensesApi.create, scheduledChargesApi.create | ❌ | ❌ | ✅ (Alert) | ✅ | ✅ | Kısmen hazır (+ UX-007) |
| Faturalar (liste) | `roomora/RoomoraBills.js` | MainTabs›Faturalar (+alias `BillsOverviewScreen`) | useRoomoraDashboard | ✅ | ✅ | ❌ (UX-004) | ✅ | ✅ | Kısmen hazır (+ UX-005, PERF-001) |
| Fatura Ekle | `FaturaEkle.js` | Stack›FaturaEkle | houseApi.getMembers, expensesApi.getById/create/update | ✅ | n/a | ✅ (Toast) | ✅ | ✅ | Hazır |
| Fatura Detayı | `FaturaDetayi.js` | Stack›FaturaDetayi/BillDetail | expensesApi.getById/remove | ✅ | ✅ | ✅ (Toast) | ✅ | ✅ | Hazır |
| Borç/Alacak Özeti | `RoomoraFinance.js:DebtSummaryScreen` | Stack›DebtSummaryScreen | houseApi.getUserDebts/getMembers | ✅ | ✅ | ❌ | ✅ | ✅ | Kısmen hazır |
| Borçlarım | `RoomoraFinance.js:DebtsScreen` | Stack›Borclar | (paylaşımlı hook) | ✅ | ✅ | ❌ | ✅ | ✅ | Kısmen hazır |
| Alacaklarım | `RoomoraFinance.js:ReceivablesScreen` | Stack›Alacaklarim | (paylaşımlı hook) | ✅ | ✅ | ❌ | ✅ | ✅ | Kısmen hazır |
| Ödemeler | `RoomoraFinance.js:PaymentsScreen` | Stack›PaymentsScreen | paymentsApi.getByHouse | ✅ | ✅ | ❌ | ✅ | ✅ | Kısmen hazır |
| Bekleyen Ödemeler | `RoomoraFinance.js:PendingPaymentsScreen` | Stack›PendingPaymentsScreen/BekleyenOdemeler | paymentsApi.getPendingPayments/approve/reject | ✅ | ✅ | ⚠ (sadece action hatası) | ✅ | ✅ | Kısmen hazır |
| Kişi Detayı | `RoomoraFinance.js:PersonDetailScreen` | Stack›KisiDetayi/AlacakBorcIcmi | houseApi.getUserDebtBetween, paymentsApi.getByHouse | ✅ | ✅ | ❌ | ✅ | ✅ | Kısmen hazır |
| Ödeme Bildir | `RoomoraFinance.js:PaymentReportScreen` | Stack›OdemeEkle | houseApi.getMembers, paymentsApi.create | ✅ | n/a | ✅ (Alert) | ✅ | ✅ | Hazır (UX-008 ile kısmen) |
| Evlerim | `GrupListesi.js` | Stack›GrupListesi | houseApi.getUserHouses | ✅ | ✅ | ❌ (UX-010) | ✅ | ✅ | Kısmen hazır |
| Yeni Ev Oluştur | `YeniEvGrubu.js` | Stack›YeniEvGrubu | houseApi.createHouse | ✅ | n/a | ✅ | ✅ | ✅ | Hazır |
| Ev Üyeleri | `EvUyeleri.js` | Stack›EvUyeleri | houseApi.getMembers/getById/uploadCoverImage | ✅ | ✅ | ⚠ | ✅ | ✅ | Kısmen hazır |
| Arkadaş Davet Et | `DavetEt.js` | Stack›DavetEt | houseApi.sendInvitation | ✅ | n/a | ✅ | ✅ | ⚠ hardcoded `#ffffff` | Kısmen hazır |
| Bildirimler | `Bildirimler.js` | Stack›Bildirimler | paymentsApi.getPendingPayments | ✅ | ✅ | ⚠ (sessiz) | ✅ | ✅ | Kısmen hazır |
| Notlar | `EvNotlari.js` | MainTabs›Notlar (+Stack›EvNotlari) | houseNotesApi.* | ✅ | ✅ | ✅ (Alert) | ✅ | ✅ | Kod-kalitesi olarak Hazır, **ürün-kapsamı olarak Kritik sapma (UX-001)** |
| Fiş Geçmişi | `FisGecmisi.js` | Stack›FisGecmisi | receiptsApi.getByHouse | ✅ | ✅ | ❌ (sessiz) | ✅ | ✅ | Kısmen hazır |
| Fiş Detayı/Tarama Sonucu | `FisDetayi.js` | Stack›FisDetayi | receiptsApi.* , houseApi.getMembers | ✅ | ⚠ (yok, bkz. tablo notu) | ⚠ | ⚠ çok sayıda hardcoded hex | ⚠ | Kısmen hazır |
| Ayarlar (ana) | `roomora/RoomoraSettings.js` | MainTabs›Ayarlar | yok (sadece context) | n/a | n/a | n/a | ✅ | ✅ | Hazır |
| Profili Düzenle | `ProfilDuzenle.js` | Stack›ProfilDuzenle | authApi.uploadProfileImage/updateProfile | ✅ | n/a | ✅ | ✅ | ✅ | Hazır |
| IBAN Bilgileri | `IbanBilgileri.js` | Stack›IbanBilgileri | authApi.updateProfile | ✅ | n/a | ✅ | ✅ | ✅ | Hazır |
| Tema Ayarları | `TemaAyarlari.js` | Stack›ThemeSettingsScreen | yok (local) | n/a | n/a | n/a | ✅ | ✅ | Hazır |
| Dil Ayarları | `DilAyarlari.js` | Stack›LanguageSettings | yok (AsyncStorage) | n/a | n/a | ✅ | ✅ | ✅ | Hazır (yalnızca TR seçeneği var) |
| Bildirim Ayarları | `SettingsInfo.js:NotificationSettingsScreen` | Stack›NotificationSettings | yok (AsyncStorage) | n/a | n/a | ⚠ sessiz | ✅ | ✅ | Hazır |
| Güvenlik | `SettingsInfo.js:SecuritySettingsScreen` | Stack›SecuritySettings | yok | n/a | n/a | n/a | ✅ | ✅ | Hazır |
| Gizlilik Politikası/Kullanım Koşulları | `SettingsInfo.js:LegalDocumentScreen` | Stack›LegalDocument | yok | n/a | n/a | n/a | ✅ | ✅ | **İçerik placeholder (UX-003)** |
| Hakkında | `SettingsInfo.js:AboutScreen` | Stack›About | yok | n/a | n/a | n/a | ✅ | ✅ | Hazır |
| Hesabımı Sil | `HesabiSil.js` | Stack›HesabiSil | authApi.deleteAccount | ✅ | n/a | ✅ | ✅ | ✅ | Hazır |
| Grup Listesi araçları | `GrupListesi.js` (aynı dosya, "favori ev" mantığı) | — | houseApi.getUserHouses | — | — | — | — | — | Hazır |

### 7.2 Ölü / erişilemeyen ekran dosyaları (14 adet)

Hiçbiri `App.js` veya başka bir dosya tarafından import edilmiyor (repo genelinde grep ile doğrulandı):

| Dosya | Yerini alan canlı ekran |
|---|---|
| `src/screens/AnaSayfa.js` | `roomora/RoomoraHome.js` |
| `src/screens/Ayarlar.js` | `roomora/RoomoraSettings.js` |
| `src/screens/TumHarcamalar.js` | `roomora/RoomoraExpenses.js` |
| `src/screens/Faturalar.js` | `roomora/RoomoraBills.js` |
| `src/screens/BekleyenOdemeler.js` | `RoomoraFinance.js:PendingPaymentsScreen` |
| `src/screens/BorcAlacakOzeti.js` | `RoomoraFinance.js:DebtSummaryScreen` |
| `src/screens/Borclar.js` | `RoomoraFinance.js:DebtsScreen` |
| `src/screens/Alacaklarim.js` | `RoomoraFinance.js:ReceivablesScreen` |
| `src/screens/AlacakBorcIcmi.js` | `RoomoraFinance.js:PersonDetailScreen` |
| `src/screens/KisiDetayi.js` | `RoomoraFinance.js:PersonDetailScreen` |
| `src/screens/OdemeEkle.js` | `RoomoraFinance.js:PaymentReportScreen` |
| `src/screens/Odemeler.js` | `RoomoraFinance.js:PaymentsScreen` |
| `src/screens/Dogrulama.js` | `RoomoraAuthFlows.js:VerificationScreen` |
| `src/screens/SifreSifirla.js` | `RoomoraAuthFlows.js:ResetPasswordScreen` |
| `src/screens/SifremiUnuttum.js` | `RoomoraAuthFlows.js:ForgotPasswordScreen` |

**Öneri:** Mağazaya çıkmadan önce bu 14 dosyayı silin (bkz. UX-024).

### 7.3 Bottom tab bar denetimi

`src/shared/ui/MainTabBar.js` + `App.js:152-156` → sıralama: **Ana Sayfa, Giderler, Notlar, Faturalar, Ayarlar** — ✅ istenen sırayla birebir eşleşiyor. İç ekranlarda yanlışlıkla ikinci bir tab bar render edilmediği doğrulandı (sadece `App.js` `MainTabBar`'ı import ediyor).

---

## 8. Stitch Karşılaştırma Tablosu

**Kapsam notu:** `docs/implemented-screens` klasöründe yalnızca 6 ekran görüntüsü mevcuttur (home, expenses, bills, notes, quick-expense, settings) — bunlar gerçek çalışan bir simulator/emulator olmadan alınmış görsellerdir. Bu 6 ekran, karşılık gelen Stitch referanslarıyla piksel bazında karşılaştırılmıştır. Kalan ~57 Stitch referans görseli için canlı ekran görüntüsü mevcut olmadığından karşılaştırma kod-tabanlı (bileşen/renk/metin analizi) yapılmıştır; bu farkla açıkça işaretlenmiştir.

| # | Ekran | Stitch dosyası | Uygulama görüntüsü | Sonuç |
|---|---|---|---|---|
| 1 | Ana Sayfa | `l07_ana_sayfa.png` | `implemented-screens/home.png` | **Kısmen farklı.** Stitch'te ay seçici dropdown ("Temmuz 2026 ▾") var, uygulamada yok — ev adı ("Kadikoy Evi") statik metin olarak gösteriliyor. Stitch'te motive edici alt başlık ("Harcamaların bu ay kontrol altında.") var, uygulamada "Roomora — Ortak yaşamın kolay hali" marka satırı var (farklı ama kabul edilebilir). **Not:** Stitch mockup'ının kendi alt navigasyonu ürün spesifikasyonuyla çelişiyor (Notlar sekmesi yok, ortada FAB var) — uygulamanın gerçek tab sırası (Ana Sayfa/Giderler/Notlar/Faturalar/Ayarlar) asıl ürün spesifikasyonuyla eşleşiyor, bu yüzden bu spesifik Stitch mock'u güncel kabul edilmemeli. ₺ sembolünün render'ı incelenmeli (bkz. not aşağıda). |
| 2 | Giderler (liste) | `l14_giderler.png` | `implemented-screens/expenses.png` | **Yapısal olarak farklı.** Stitch, kişi başına toplam kartları (Tarık ₺1.500,00 / Tufan ₺1.250,00) + ayrı "Harcamalar" bölümü gösteriyor; uygulama tek bir toplam kart + arama çubuğu + kategori/tarih filtre chip'leri + "Harcama Geçmişi" listesi gösteriyor. Uygulamanın tasarımı işlevsel olarak daha zengin (arama+filtre) ama kişi-bazlı döküm Stitch'te var, uygulamada yok. |
| 3 | Faturalar (liste) | `l22_faturalar.png` | `implemented-screens/bills.png` | **Kısmen farklı.** Stitch'te "Ödenen"/"Bekleyen" ayrı renkli (yeşil/kırmızı) özet kartları ve ay seçici var; uygulamada bunun yerine "Aktif"/"Planlı gider" sayaçları var, ödenen/bekleyen tutar dökümü yok. Bu bilgi backend'de mevcut (`RecurringCharges` cycle durumu) ama UI'a yansıtılmamış. |
| 4 | Notlar | `l13_ev_notlar.png` | `implemented-screens/notes.png` | **Temelden farklı — bkz. UX-001 (Kritik).** Stitch zengin, kategorili, sosyal bir pano; uygulama düz bir checklist. |
| 5 | Hızlı Seçim Ekle (modal) | `l17_h_zl_se_im_ekle.png` | `implemented-screens/quick-expense.png` (ana Harcama Ekle formu, modal'ın kendisi görüntülenmemiş) | Yapısal olarak uyumlu görünüyor — ana formdaki "Hızlı seçimler" chip satırı + "+ Yeni" butonu, Stitch'teki modal'ı tetiklemek için doğru yerde. Modal'ın kendisi test edilemedi (ekran görüntüsü yok). |
| 6 | Ayarlar (ana liste) | *(Stitch referans setinde doğrudan bir "ana ayarlar listesi" görseli yok — yalnızca alt sayfalar: L48-L57)* | `implemented-screens/settings.png` | Karşılaştırma yapılamadı — Stitch referans eksikliği. Kod-tabanlı inceleme: bölüm başlıkları (Hesap / Tercihler / Güvenlik ve Destek) ve öğe sırası ürün spesifikasyonuyla tutarlı görünüyor. |

**Kod-tabanlı karşılaştırma yapılan diğer önemli Stitch referansları (canlı ekran görüntüsü olmadan):**
- `L33-L37` (bekleyen ödemeler, kısmi/reddedilen ödeme durumları) → `RoomoraFinance.js:PendingPaymentsScreen`/`PaymentsScreen`'deki durum rozetleri (Bekliyor/Onaylandı/Reddedildi) kavramsal olarak eşleşiyor; kesin renk/metin eşleşmesi görsel doğrulama gerektirir.
- `L58-L63` (yükleniyor, boş durum, internet yok, sunucu hatası, form hatası, işlem başarılı) → uygulamada genel bir `LoadingState`/`EmptyState` bileşeni var (`CanonicalUI.js`) ama **ayrı bir "internet yok" / "sunucu hatası" bileşeni yok** (bkz. UX-004) — bu Stitch ekranlarının büyük kısmı hiç uygulanmamış durumda.
- `L48-L57` (profil düzenle, IBAN, bildirim/tema/dil ayarları, güvenlik, hakkında) → ekran envanterinde (§7) "Hazır" olarak işaretlenen ekranlarla genel yapı olarak örtüşüyor.

**Genel değerlendirme:** Mevcut 6 örnekte tutarlı bir örüntü var — uygulama Stitch'in *bilgi mimarisini* değil *genel görsel dilini* (renkler, kartlar, tipografi) takip ediyor; birebir layout kopyası hiçbir örnekte yok. Bu, ürün kararı mı yoksa kaçırılmış detay mı olduğu netleştirilmeli.

---

## 9. Logo ve Marka Ölçüm Raporu

| Dosya | Piksel boyutu | Renk tipi | Alfa | Dosya boyutu |
|---|---|---|---|---|
| `src/assets/icon.png` | 1024×1024 | RGBA | Var (tam kanvas, kenar boşluksuz) | 30.310 B |
| `src/assets/adaptive-icon.png` | 1024×1024 | RGBA | Var | 17.155 B |
| `src/assets/mark-navy.png` | 512×512 | RGBA | Var | 9.719 B |
| `src/assets/mark-white.png` | 512×512 | RGBA | Var | 10.163 B |
| `src/assets/wordmark.png` | 1100×340 | RGBA | Var | 8.734 B |
| `src/assets/splash.png` | 1242×2436 | RGBA | Var (tam kanvas, kenar boşluksuz) | 43.431 B |

- **Android adaptive icon güvenli alan:** İçerik sınırlayıcı kutusu `[322,340]`–`[702,721]` (1024×1024 kanvas üzerinde) → içerik **381×382px = kanvasın %37,2×%37,3'ü**. Android'in standart iç güvenli alanı (~%61) ile karşılaştırıldığında **fazlasıyla güvenli** (belki gereğinden fazla küçük görünebilir, stil tercihi). Yatay ortalama tam (321-322px); dikey ortalama ~38px kayık (üstte 340px, altta 302px boşluk) — gözle fark edilmez düzeyde.
- **iOS ana ikon (`icon.png`):** Tam kanvas dolu + alfa kanalı mevcut. Apple, iOS ana ikonlarında şeffaflığı önermez (bazı bağlamlarda siyah/tanımsız katmanla composite edilir). **Öneri: opak arka planla yeniden export edin.**
- **`app.json` ikon/splash konfigürasyonu:**
  - `expo.icon`: `./src/assets/icon.png`
  - `expo.android.adaptiveIcon.foregroundImage`: `./src/assets/adaptive-icon.png`, `backgroundColor: "#F7F9FC"` — ✅ tasarım sistemi arka planıyla birebir eşleşiyor
  - `app.config.js` splash: `image: splash.png, imageWidth: 220, resizeMode: 'contain', backgroundColor: '#eef4fa'` — ⚠ arka plan rengi spec'teki `#F7F9FC`/`#FFFFFF`'den farklı üçüncü bir mavi (UX-014); ayrıca `splash.png`'nin kendisi 220pt'e küçültülmeye uygun değil (tam ekran/kenar boşluksuz asset — UX-013)

### Logo kullanım noktaları (dosya:satır)

| Dosya:satır | Ekran | variant | Boyut (px) | Çözülen asset | Arka plan | Doğru mu? |
|---|---|---|---|---|---|---|
| `AnaSayfa.js:272` | Ana Sayfa (ölü) | `"logo"` | 62 | mark-navy.png | açık | ✅ |
| `Bildirimler.js:81` | Bildirimler | `"logo"` | 170 | mark-navy.png | açık (primary[50]) | ✅ |
| `Faturalar.js:688` | Faturalar (ölü) | `"logo"` | 190 | mark-navy.png | açık | ✅ |
| `Odemeler.js:216` | Ödemeler (ölü) | `"logo"` | 110 | mark-navy.png | **koyu lacivert `primary[900]` (#172839)** | ❌ **Bug (UX-011)** — lacivert logo koyu lacivert zemin üstünde neredeyse görünmez |
| `SettingsInfo.js:156` | Ayarlar>Hakkında | `"logo"` | 156 | mark-navy.png | açık | ✅ |
| `RoomoraAuthFlows.js:30` | Giriş/Kayıt akışları | `"mark"` | 62 | **BrandMark bu variant'ı tanımıyor → adaptive-icon.png'ye düşüyor** | açık | ❌ **Bug (UX-012)** — 62px kutuda ~%37 dolgu oranı yüzünden yalnızca ~23px görünür içerik kalıyor |
| `TumHarcamalar.js:599` | Tüm Harcamalar (ölü) | `"logo"` | 180 | mark-navy.png | açık | ✅ |
| `RoomoraHome.js:102` | Ana Sayfa (canlı) | `"logo"` | 40 | mark-navy.png | açık | ✅ |
| `GirisYap.js:403` | Giriş Yap | doğrudan require | 84×84 | mark-navy.png | açık | ✅ |

**`mark-white.png` ve `wordmark.png` kodda hiçbir yerde kullanılmıyor** — ikisi de yetim asset. `mark-white.png`'nin var olması ama hiç seçilmemesi, tam olarak UX-011'deki Ödemeler ekranı bug'ının kök nedeni.

### Eski marka kalıntıları
- `app.json:5` → `"slug": "ev-arkadasim"` (EAS proje slug'ı, kullanıcıya görünmez ama URL/build kimliğinde kalıcı)
- `src/shared/config/env.ts:78` → `evarkadasim.co` eski domain yönlendirme kontrolü (muhtemelen kasıtlı geriye dönük uyumluluk)
- `"EvArkadaşım"`, tek başına `"EA"` gibi kullanıcıya görünen metin kalıntısı **bulunamadı** — marka adı metinlerde tutarlı şekilde "Roomora".

---

## 10. Kullanıcı Akış Testleri

Aşağıdaki akışlar kod üzerinden uçtan uca izlenmiştir (bkz. §22 için canlı UI testinin neden tam yapılamadığının gerekçesi). Her akış için: Başlangıç → Adımlar → Beklenen → Gerçekleşen → API → Bulgu.

| # | Akış | Başlangıç | API endpoint(leri) | Bulgu / durum |
|---|---|---|---|---|
| 1 | Kayıt olma | GirisYap > "Hesap Oluştur" | `POST /Auth/SendVerificationCode` → `POST /Auth/VerifyCodeAndRegister` | Kod çalışıyor; **yerel ortamda SMTP sırları eksik olduğu için gerçek e-posta gönderimi doğrulanamadı** (bkz. §22). |
| 2 | Doğrulama kodu | Kayıt sonrası otomatik yönlendirme | `VerificationScreen` → `VerifyCodeAndRegister` | 10 dakikalık kod geçerliliği backend'de doğru uygulanmış (`SendVerificationCodeCommandHandler.cs:50`). |
| 3 | Giriş yapma | GirisYap | `POST /Auth/Login` | 401 için özel alt mesajlar var (`GirisYap.js:316-334`) — iyi UX. |
| 4 | Şifremi unuttum / sıfırlama | GirisYap > "Şifremi Unuttum" | `SendVerificationCode(purpose=reset)` → `ResetPassword` | Sorunsuz kodlanmış. |
| 5 | Google ile giriş | GirisYap | `POST /Auth/GoogleLogin` | Backend, `clientIds` boşsa 500 dönüyor (`AuthController.cs:123-124`) — config eksikse kullanıcıya "sunucu hatası" görünür, daha açıklayıcı olabilirdi. |
| 6 | Apple ile giriş | GirisYap | `POST /Auth/AppleLogin` | Apple JWKS doğrulaması doğru uygulanmış. |
| 7 | Yeni ev oluşturma | GrupListesi > "Yeni Ev" | `POST /Houses` | `CreatorUserId` sunucuda JWT'den set ediliyor (spoofing engellenmiş) — doğru. |
| 8 | Favori evin otomatik açılması | Giriş sonrası | `GET /Houses/GetUserHouses/{userId}` | `GirisYap.js:229` çağrısı var; "favori ev" seçim mantığı `GrupListesi.js`'de. Kod incelemesinde açık bir "favori" alanı/flag bulunamadı — muhtemelen sadece ilk/son ev seçiliyor; ürünle netleştirilmeli. |
| 9 | Ev değiştirme | Ana Sayfa/Evlerim | `GET /Houses/GetUserHouses/{userId}` | Çalışıyor görünüyor. |
| 10 | Ev fotoğrafı ekleme | EvUyeleri | `POST /Houses/{houseId}/CoverImage` | Doğru yetkilendirilmiş (`IsActiveMemberAsync`), dosya boyutu/uzantı/magic-byte kontrolü var. |
| 11 | Profil fotoğrafı ekleme | ProfilDuzenle | `POST /Users/{userId}/ProfileImage` | Self-check var, doğru. |
| 12 | Ev arkadaşı davet etme | DavetEt | `POST /Houses/{houseId}/invitations` | **SEC-003.2**: gönderen kişinin evin üyesi olduğu doğrulanmıyor. |
| 13 | Daveti kabul etme | DavetiyeKabul (deep link) | `POST /Houses/AcceptInvitation` | E-posta eşleşmesi kontrolü doğru; ancak **UX-002**: oturum açıkken erişilemiyor. |
| 14 | Ev üyesi ayrıntısı | EvUyeleri | `GET /Houses/{houseId}/members` | **SEC-003.3**: üyelik kontrolü yok. |
| 15 | Evden üye çıkarma/ayrılma | EvUyeleri | `DELETE /Houses/{houseId}/members/{userId}` | Doğru yetkilendirilmiş (kendisi veya kurucu). |
| 16-19 | Harcama ekleme/düzenleme/silme/detay | HarcamaEkle/HarcamaDetayi | `POST/PUT/DELETE /Expenses/*` | §11'de detaylı. |
| 20 | Gider listesi, arama, filtre | RoomoraExpenses | `GET /Expenses/GetExpenses/{houseId}` | Çalışıyor; **PERF-001** (FlatList değil). |
| 21-22 | Not listesi/madde CRUD | EvNotlari | `HouseNotes/*` | Çalışıyor ama **UX-001** kapsam sapması var. |
| 23-24 | Fatura ekleme/düzenleme | FaturaEkle/FaturaDetayi | `Expenses/CreateIrregular`, `UpdateExpense` | Çalışıyor. |
| 25-26 | Düzenli/taksitli gider oluşturma | DuzenliGiderEkle | `POST /RecurringCharges`, `POST /Expenses` | §12'de detaylı; **UX-007** çift-gönderim koruması eksik. |
| 27-28 | Kira ödeme takibi / ödeme bildirme | RoomoraBills / PaymentReportScreen | `RecurringCharges/*`, `Payments/CreatePayment` | **UX-005**: canlı ekranda "payımı öde" aksiyonu yok. |
| 29 | Kısmi ödeme | PaymentReportScreen | `Payments/CreatePayment` | Destekleniyor; **UX-008** ile sınırlı. |
| 30 | Ödeme onaylama/reddetme | PendingPaymentsScreen | `Payments/ApprovePayment/RejectPayment` | Doğru yetkilendirilmiş, çift-onay engelleniyor (durum kontrolüyle, ama race condition riski — **SEC-008**). |
| 31 | Borçlarım/alacaklarım/hesap hareketleri | DebtsScreen/ReceivablesScreen/PersonDetailScreen | `Houses/GetUserDebts*` | **SEC-003.5/.6** ile sınırlı. |
| 32-34 | Fiş tarama/düzenleme/harcamaya dönüştürme | FisDetayi | `Receipts/Scan/Update/ConvertToExpense` | Doğru yetkilendirilmiş; ancak "fiş bulunamadı" için ayrı bir hata ekranı yok (fallback string ile devam ediyor). |
| 35 | IBAN ekleme/düzenleme | IbanBilgileri | `authApi.updateProfile` | Çalışıyor. |
| 36 | Bildirim/tema/dil/güvenlik ayarları | SettingsInfo/TemaAyarlari/DilAyarlari | yerel/AsyncStorage | Çalışıyor; dil ayarında yalnızca Türkçe seçeneği var (ürün TR-only). |
| 37 | Hesap silme | HesabiSil | `DELETE /Users/{userId}/Account` | Backend cascade mantığı sağlam (anonymize + transaction) — §12.E. |
| 38 | Çıkış yapma | Ayarlar | (yerel token temizleme) | İncelenmedi ayrıca, standart AsyncStorage temizliği bekleniyor. |
| 39 | İnternet yok / sunucu hatası / yetkisiz oturum | Genel | — | **UX-004**: çoğu ekranda ayrı bir "internet yok"/"sunucu hatası" durumu yok, boş durumla karışıyor. 401 interceptor (`api.js:57-87`) token'ı temizleyip `auth:unauthorized` yayınlıyor — bu kısım doğru. |
| 40 | Light/dark tema geçişi | TemaAyarlari | yerel | Çalışıyor; ama **CanonicalUI.js**'deki hardcoded renkler (UX-019) dark modda tutarsızlık riski taşıyor. |
| 41 | Türkçe/İngilizce dil geçişi | DilAyarlari | yerel | **Uygulanabilir değil** — yalnızca Türkçe seçeneği var, İngilizce dil desteği kod tabanında bulunamadı. Ürün spesifikasyonu zaten "kullanıcıya görünen metinler Türkçe olmalı" dediği için bu bir eksiklik değil, sadece dil ayarı ekranının "geçiş" değil "tek seçenek" olduğunun netleştirilmesi gerekiyor. |

---

## 11. Harcama Algoritması Testleri

Kaynak: `HarcamaEkle.js` (client) + `Application/Features/Expenses/Commands/CreateExpense/CreateExpenseCommandHandler.cs` (backend).

| Senaryo | Sonuç |
|---|---|
| Ödeyen Tarık, katılımcılar yalnızca Tufan+Berdan | ✅ Destekleniyor — `toggleParticipant` ile serbestçe seçilebiliyor. |
| Seçilmeyen kişiye kişisel kalem eklenememesi | ✅ **Doğru uygulanmış** — deselect edilince `personal[id]` siliniyor, input disabled placeholder'a dönüyor (`HarcamaEkle.js:163-167,503-534`), backend payload da filtreleniyor (satır 199-206). |
| Seçilmeyen üyelerin pasif/etkileşimsiz görünmesi | ✅ Chip UI üzerinden doğrulandı. |
| 1/2/tüm üye seçimi | ✅ Son kalan katılımcı çıkarılamıyor (en az 1 kişi zorunlu, satır 162). |
| Tüm üyeler seçilince "Ortak" durumu | ✅ `allSelected` hesaplanıp "Ortak" etiketi/chip'i doğru gösteriliyor (satır 156,466,475,543). |
| Eşit bölüşüm | ✅ Uygulanıyor (tek split modu bu). |
| **Özel tutarlı (custom-amount) bölüşüm** | ❌ **Uygulanmamış** — sadece eşit bölüşüm + opsiyonel kişisel kalem var; "40/60 gibi özel oran" özelliği hiç yok. |
| Kişisel kalemler | ✅ Doğru çalışıyor, toplamdan düşülüp kalan eşit bölünüyor. |
| Yuvarlama farkları | ⚠ **Client-side hesaplanmıyor** — client sadece `ortakHarcamaTutari`'yi (toFixed(2)) gönderiyor, bölüşüm backend'de yapılıyor. Backend'de `BuildEqualShares` (bkz. aşağı) kalan kuruşu ilk katılımcıya veriyor — bu doğru ve toplamın tutarla eşit kalmasını garanti ediyor, ama **client'ta gösterilen "kişi başı" özet rakamı bu yuvarlamayı yansıtmıyor** (UX-006). |
| Toplam payların harcama toplamına eşitliği | ✅ Backend'de garanti ediliyor (`CreateExpenseCommandHandler.cs:141-158`, kalan tutar ilk katılımcıya ekleniyor). |
| Harcama düzenlendiğinde ledger güncellemesi | ✅ Eski ledger satırları soft-delete ediliyor, yenileri oluşturuluyor (`UpdateExpenseCommandHandler.cs`) — **ama** `PaidAmount>0` olan bir ledger satırı varsa (yani kısmen ödenmiş bir harcama) düzenleme tamamen engelleniyor (satır 47-55) — bu güvenli bir tasarım ama kullanıcıya UI'da neden düzenleyemediği açıkça anlatılmıyor olabilir, ekran bazında doğrulanmalı. |
| Harcama silindiğinde borç/alacak düzelmesi | ✅ Aynı kural — ödeme yapılmışsa silme engelleniyor (`DeleteExpenseCommandHandler.cs:22-29`). |
| Aynı işlemin iki kere gönderilmesi | ⚠ **Yalnızca UI-level koruma var** (buton disable), **backend'de idempotency key/unique constraint yok** — ağ tekrar denemesi (retry) durumunda çift harcama/ledger kaydı oluşabilir. |
| Negatif/sıfır/çok büyük/geçersiz tutar | ✅ Negatif girilemiyor (input sadece rakam/virgül/nokta kabul ediyor); sıfır/boş engelleniyor (satır 179); **üst sınır yok** (çok büyük tutarlar kabul ediliyor — kasıtlı olabilir ama backend'de de bir üst sınır kontrolü yok). |
| Virgül/nokta ile para girişi | ✅ `src/shared/format/money.js` Türkçe locale'e uygun şekilde doğru ayrıştırıyor (son görülen `,`/`.` ondalık ayracı kabul ediliyor). |
| Aynı anda iki kullanıcının işlem yapması | ⚠ Concurrency-token yok (SEC-009) — teorik olarak eşzamanlı iki düzenleme birbirini ezebilir, test edilemedi (çoklu client gerektirir). |

**Orphaned bulgu:** `Application/Features/ExpensesUnified/**` ve `Application/Features/Bills/**` namespace'leri backend'de var ama hiçbir controller tarafından referans edilmiyor — tamamen ölü kod, temizlenmeli.

---

## 12. Fatura/Kira/Düzenli Gider Testleri

Kaynak: `RecurringChargesController.cs`, `DuzenliGiderEkle.js`, `RoomoraBills.js`.

| Kural | Doğrulama |
|---|---|
| Kira gibi sabit tahsilatların normal harcamalardan ayrı yönetilmesi | ✅ Ayrı bir `RecurringCharges`/`ChargeCycle` entity ailesi var, `Expense` tablosundan bağımsız. |
| Ödeme günü 15 ise kira ayın 10'unda görünmeye başlamalı | ✅ **Doğru uygulanmış** — `canonicalStartDay = Math.Max(1, DueDay - 5)` (`RecurringChargesController.cs:175-180`), yani DueDay=15 için başlangıç=10. |
| Tahsilat penceresi 10-15 arası olmalı | ✅ Pencere tam olarak `[DueDay-5, DueDay]` olarak kodlanmış (5 günlük pencere). |
| Zamanında ödendiyse gereksiz şekilde borçta kalmaması | ✅ `SetSharePaid`/`SetExternalPaid` ile pay kapatılabiliyor (backend hazır) — **ama UX-005: canlı UI'da bu aksiyon yok**, dolayısıyla pratikte kullanıcı bunu tetikleyemiyor. |
| Ödenmediyse pencere sonrası borca yansıması | ✅ `RefreshCycleStatus` cycle'ı `Overdue`'ya çeviriyor (satır 321-339). |
| Gelecek ayların kiralarının aynı anda görünmemesi | ✅ `EnsureCurrentCycleAsync` sadece cari dönem için cycle üretiyor (`if (StartMonth > period) return null`, satır 271) — gelecek aylar için proaktif üretim yok. |
| Elektrik/su gibi değişken faturaların normal ortak hesap mantığıyla çalışması | ✅ `FaturaEkle.js` + `expensesApi.createIrregular` üzerinden normal harcama/ledger akışını kullanıyor. |
| Taksitli giderlerin toplam/kalan taksit bilgisiyle girilebilmesi | ⚠ **Kısmen** — `DuzenliGiderEkle.js`'de yalnızca "kalan taksit sayısı" alanı var (3/6/12/özel chip'ler, satır 267-304); **orijinal toplam taksit sayısı veya kaç taksidin geçtiği** hiçbir yerde tutulmuyor/gösterilmiyor. Backend `RecurringCharge`/`ChargeCycle` entity'lerinde de böyle bir alan yok (installment kavramı bu tabloda tanımlı değil — yalnızca `Expense` özelliğinde ayrı ve bu tabloyla entegre olmayan bir taksit mekanizması var, bkz. backend ajanı notu). |
| 6 taksidin 4'ü kalmışken sisteme başlanabilmesi | ✅ UI metni bunu açıkça destekliyor ("Plan daha önce başladıysa yalnızca kalan tutarı ve kalan ay sayısını gir", satır 305-307) — ama yukarıdaki gibi orijinal toplamın hiçbir yerde saklanmaması, ileride "X/6 taksit kaldı" gibi bir özet gösterimini imkânsız kılıyor. |
| Dönem üretiminin mükerrer kayıt oluşturmaması | ✅ **Çift güvenceli**: hem "önce kontrol et sonra oluştur" mantığı (satır 273-275) hem de DB'de `(ContractId, Period)` üzerinde unique index (`AppDbContext.cs:224-231`) var — yarış durumunda bile mükerrer kayıt DB seviyesinde engelleniyor (uygulama seviyesinde try/catch olmasa da). |
| Zaman dilimi/ay sonu geçişleri | ✅ `TurkeyNow()` (UTC+3) tutarlı şekilde kullanılıyor (`RecurringChargesController.cs:55,468`). |
| Arka planda otomatik dönem üretimi (zamanlanmış iş) | ❌ **Yok** — `IHostedService`/`BackgroundService`/Quartz/Hangfire repo genelinde bulunamadı; dönem üretimi tamamen "ilk istek geldiğinde tembel oluşturma" mantığıyla çalışıyor. Kullanıcı ayın başında hiç bir plan ekranını açmazsa o ayın cycle'ı geç oluşabilir — işlevsel olarak çalışır ama bir arka plan job'u daha sağlam olurdu. |

---

## 13. Ödeme Algoritması Testleri

| Kural | Doğrulama |
|---|---|
| Toplam borcun tamamını ödeme zorunluluğu olmaması | ✅ `PaymentReportScreen` "Kısmi veya tam ödeme yapabilirsin" metniyle açıkça destekliyor. |
| ₺3.000 borcu olan ₺2.500 bildirebilmeli | ✅ Miktar alanı serbestçe düzenlenebiliyor, ön-doldurulan tam tutar değiştirilebiliyor. |
| Borçtan fazla ödemenin engellenmesi | ⚠ **Kısmen** — bilinen bir borç seçiliyken sınır var (`RoomoraFinance.js:455`), ama bilinen borç yoksa (`maxAmount===0`) kontrol devre dışı kalıyor (UX-008); backend'de de hiçbir üst sınır kontrolü yok (SEC-007). |
| Ödeme öncesi/sonrası kalan borcun görünmesi | ✅ `DebtSummaryScreen`/`PersonDetailScreen` güncel bakiyeyi ayrı gösteriyor. |
| Kime borçlu / kimden alacaklı ayrımının açık olması | ✅ Net şekilde ayrı kartlar/etiketlerle gösteriliyor. |
| Bekleyen ödemenin bakiyeyi erken değiştirmemesi | ✅ **Doğru** — ledger sadece `Approve` anında güncelleniyor (`ApprovePaymentCommandHandler.cs:84-88`), `Pending` durumunda dokunulmuyor. |
| Ödemenin yalnızca onaylandıktan sonra kesinleşmesi | ✅ Doğrulandı. |
| Reddedilen ödemenin bakiyeyi değiştirmemesi | ✅ Doğrulandı — reddetmede ledger'a hiç dokunulmuyor (zaten mutasyon yok). |
| Aynı ödemenin iki kere onaylanamaması | ⚠ **Uygulama seviyesinde kontrol var ama atomik değil** — SEC-008'de detaylandırılan race condition riski. |
| Geçmiş ödemelerin bulunabilir olması | ✅ `PaymentsScreen` (Ödemeler) hem gönderilen hem alınan ödemeleri durum rozetleriyle listeliyor. |
| Ledger/PaymentAllocation tutarlılığı | ⚠ FIFO onay algoritması tutarlı çalışıyor **ama** `AddPaymentWithAllocations` yolu (SEC-002) bu tutarlılığı tamamen bypass edip client'ın verdiği rastgele allocation'ları doğrulamadan uyguluyor. |

---

## 14. Notlar Testleri

| Kontrol | Sonuç |
|---|---|
| Son seçilen aktif listenin hatırlanması | ❌ **Yok** (UX-009) — her açılışta ilk liste seçili geliyor, mod her zaman "Aktif"e dönüyor. |
| Liste yoksa "Yeni liste oluştur" durumu | ✅ Var (empty-state kartı). |
| Klavye açıldığında ekranın bozulmaması | ✅ `KeyboardAvoidingView` doğru yapılandırılmış (context'e göre farklı `keyboardVerticalOffset`, `keyboardShouldPersistTaps="handled"`). |
| Maddenin hızlı eklenmesi | ✅ Tek input + buton, anlık ekleme. |
| Aktif/Geçmiş kontrollerinin az yer kaplaması | ✅ Kompakt segmented control. |
| Liste silme — küçük güvenli onay akışı | ✅ Confirm dialog var (`confirmAction`, web'de `window.confirm`, native'de `Alert`). |
| Birden fazla kullanıcının aynı listeyi güncellemesi | ⚠ Concurrency-token yok (SEC-009 ile aynı kök neden) — iki kullanıcı aynı anda aynı maddeyi tamamlayıp silerse son yazan kazanır, çakışma tespiti yok. |
| Tamamlanan maddelerin geçmişi | ✅ `IsCompleted`+`CompletedAt`+`CompletedByUserId` alanlarıyla tam destekleniyor. |
| Empty/loading/error durumları | ✅ Üçü de var (bu, §4 UX-004'teki "sessiz hata" örüntüsünün **istisnası** — Notlar ekranı hata durumunu doğru gösteren birkaç ekrandan biri). |
| **Ürün kapsamı (kategori/yazar/beğeni/fotoğraf)** | ❌ **UX-001 — Kritik sapma, bkz. §3.** |

---

## 15. API Sözleşmesi ve Güvenlik Bulguları

Kapsamlı IDOR/yetkilendirme listesi için bkz. §3-4 (SEC-001 — SEC-009). Ek sözleşme bulguları:

- **Mobil→Backend DTO uyumu:** `src/services/api.js` içindeki tüm istek gövdeleri backend DTO'larıyla alan adı bazında karşılaştırıldı; kritik bir alan uyuşmazlığı bulunamadı (ör. `CreatePayment` form alanları `CreatePaymentForm` ile birebir eşleşiyor).
- **Kullanılmayan/eksik entegrasyon:** `scheduledChargesApi.getMyDue/setSharePaid/setExternalPaid/remove` fonksiyonları backend'de doğru yetkilendirilmiş halde hazır ama hiçbir **canlı** ekran tarafından çağrılmıyor (UX-005). Ayrıca `houseApi.getAll`, `houseApi.addMember`, `houseApi.removeMember`, `houseApi.getHouseDebts`, `expensesApi.addExpense`, `ledgerApi.byHouse`, `authApi.verifyCodeForReset`, `getUserDebtsSafe` — hiçbiri hiçbir ekrandan çağrılmıyor (ölü kod, UX-029).
- **Foto/fiş yükleme kontrolleri:** `ReceiptsController.Scan`, `HousesController.UploadCoverImage`, `UsersController.UploadProfileImage` — üçü de dosya boyutu, uzantı ve **magic-byte** (gerçek dosya imzası) kontrolü yapıyor — bu iyi bir güvenlik pratiği, tutarlı uygulanmış.
- **Token yenileme / 401 davranışı:** `src/services/api.js:57-87` — 401 alınca token+user AsyncStorage'dan temizlenip `auth:unauthorized` event'i yayınlanıyor; ancak **otomatik refresh-token mekanizması yok** — kullanıcı süre dolduğunda doğrudan login'e düşüyor (kabul edilebilir bir tasarım, ama "sessiz yenileme" beklentisi varsa eksik).
- **Rate limiting:** Repo genelinde `AspNetCoreRateLimit` veya benzeri bir middleware bulunamadı — `SendVerificationCode`, `Login`, `CryptoDemo/*` gibi brute-force'a açık endpoint'lerde rate limiting yok (AccountDeletion'daki 2 dakikalık `IMemoryCache` throttle'ı hariç, bu tek iyi örnek).
- **Validation:** MediatR pipeline'ında FluentValidation kullanıldığı görülüyor (`SendVerificationCodeCommandValidator.cs` vb.) ama `CreatePaymentCommand`/`AddPaymentWithAllocationsCommand` için tutar validasyonu eksik (SEC-007).
- **Hataların Türkçe/güvenli gösterimi:** Genel olarak iyi — backend exception mesajları zaten Türkçe (`"Bu e-posta zaten kayıtlı..."` vb.) ve stack trace client'a sızdırılmıyor (`Login` action'ı `UnauthorizedAccessException`'ı yakalayıp temiz mesaj döndürüyor).

---

## 16. Accessibility Bulguları

- **Etiketleme kapsamı düşük:** 45 ekran dosyasından yalnızca 12'sinde (`grep -rl "accessibilityLabel\|accessibilityRole"`) erişilebilirlik özniteliği kullanılıyor (**A11Y-001**, ~%27 kapsama). Özellikle ikon-only butonlar (geri, sil, favori, kapat) ekran okuyucu kullanıcıları için isimsiz kalıyor.
- **Dokunma alanı (44×44):** Sistematik bir ölçüm yapılamadı (gerçek cihaz/simulator olmadan piksel-doğru dokunma alanı ölçülemez) — bu madde **test edilemedi**, kod incelemesinde bazı ikon butonların (`Odemeler.js`, `FisDetayi.js` içindeki küçük ikonlar) `padding` olmadan doğrudan 20-24px ikon boyutunda render edildiği gözlemlendi; bu ikonların dokunma alanı 44×44'ün altında kalma riski taşıyor — gerçek cihazda ölçülmeli.
- **Kontrast:** Tasarım sistemi tokenları (`#2F6FA8` üzerine beyaz metin, `#F7F9FC` üzerine `#172839` koyu metin) WCAG AA için yeterli kontrast oranına sahip görünüyor (hesaplanan kontrast oranı ~4.6:1 ve üzeri) — ancak `CanonicalUI.js`'deki hardcoded pastel renkler (`#eaf3fb` üzerine `#355069` gibi) tek tek doğrulanmadı.
- **Dark mode:** Tema sistemi mevcut ve genel olarak tutarlı ama `CanonicalUI.js`, `FisDetayi.js`'deki hardcoded hex renkler (UX-019, UX-020) dark modda kontrast/uyum sorunlarına yol açabilir — gerçek cihazda dark mode açıp bu bileşenlerin göründüğü ekranlar (Ana Sayfa bakiye kartı, Faturalar özet kartı) özellikle kontrol edilmeli.

---

## 17. Performans Bulguları

Bkz. PERF-001, PERF-002 (§4-5). Ek gözlemler:
- Ana finansal veri (`useRoomoraDashboard`) 4 farklı ekranda (Ana Sayfa, Giderler, Faturalar, Harcama Özeti) ayrı ayrı çağrılıyor; ekranlar arası geçişte paylaşımlı bir cache/query katmanı yok, bu da her sekme değişiminde gereksiz yeniden-fetch'e yol açabilir.
- Profil/ev fotoğrafı için özel bir cache-busting veya CDN stratejisi kodda görülmedi (basit URL tabanlı `<Image source={{uri}}>` kullanımı) — React Native'in varsayılan image cache'ine güveniliyor, bu genelde yeterli ama fotoğraf güncellendiğinde eski görselin bir süre görünmeye devam etmesi riski var.
- Optimistic update kalıbı hiçbir ekranda gözlenmedi (tüm mutasyonlar await + re-fetch) — bu, hatalı optimistic-update riskini ortadan kaldırıyor ama algılanan hızı düşürüyor (kabul edilebilir bir trade-off).
- Zayıf bağlantı/offline davranışı ayrı bir strateji ile ele alınmamış (UX-004 ile aynı kök neden — hata sessizce yutuluyor).

---

## 18. iOS Release Riskleri

1. **Test edilemedi** — Windows ortamında iOS Simulator hiçbir zaman çalıştırılamaz; bu denetimde iOS'a özgü hiçbir gerçek-cihaz/simulator testi yapılamamıştır.
2. `icon.png` şeffaflık içeriyor — App Store Connect ikon işleme sürecinde sorun çıkarabilir (UX-023).
3. Apple ile giriş akışı (`AppleLogin`) kod incelemesinde doğru görünüyor (JWKS doğrulama, issuer/audience kontrolü) ama gerçek bir Apple Developer hesabı + gerçek cihazla test edilmedi.
4. `expo export --platform ios` başarıyla tamamlandı (bkz. §22) — bundle/asset düzeyinde bir sorun yok.

---

## 19. Android Release Riskleri

1. **Test edilemedi** — bu makinede Android emulator/adb kurulu değil; gerçek cihaz/emulator testi yapılamadı.
2. Adaptive icon güvenli alanı ölçüldü ve spec'e uygun bulundu (§9).
3. `expo export --platform android` başarıyla tamamlandı.
4. Google ile giriş için `GoogleAuth:ClientIds` config eksikse backend 500 dönüyor (`AuthController.cs:123-124`) — Android/iOS client ID'lerinin production ortamında doğru yapılandırıldığından emin olunmalı.

---

## 20. Önerilen Düzeltme Sırası

1. **SEC-001** (CryptoDemoController kaldırma) — en yüksek risk, en düşük çaba.
2. **SEC-002** (AddPaymentWithAllocations yetkilendirmesi) — finansal veri bütünlüğü riski.
3. **SEC-003, SEC-004, SEC-005, SEC-006** (IDOR düzeltmeleri, hepsi aynı `IsActiveMemberAsync` örüntüsüyle çözülüyor — toplu bir PR'da yapılabilir).
4. **UX-003** (legal içerik) — kod değişikliği değil ama mağaza gönderimini engelliyor, paralel yürütülebilir.
5. **UX-002** (DavetiyeKabul route eksikliği) — tek satırlık düzeltme, yüksek kullanıcı etkisi.
6. **SEC-007, SEC-008, SEC-009** (ödeme validasyonu, concurrency) — migration gerektirdiği için bir sonraki sprint'e planlanabilir.
7. **UX-001** (Notlar kapsam kararı) — ürün ekibiyle netleştirilmeli, teknik değil kapsam kararı.
8. **UX-004** (sessiz hata durumları) — mekanik ama geniş kapsamlı, tek bir `ErrorState` bileşeni + 13 ekranda entegrasyon.
9. **UX-024** (14 ölü dosyanın silinmesi) — düşük risk, bakım borcu azaltır.
10. Kalan Orta/Düşük öncelikli bulgular (UX-006 — UX-030, PERF-002, A11Y-001) — v1.0 sonrasına planlanabilir (bkz. §21 listeleri).

---

## 21. Regresyon Test Planı

- **Güvenlik düzeltmeleri sonrası:** Her IDOR bulgusu için "üye olmayan kullanıcı → 403" ve "gerçek üye → normal davranış" testlerini otomatikleştiren bir entegrasyon test paketi eklenmeli (şu an backend'de bu senaryoları kapsayan görünür bir test projesi bulunamadı — `EvArkadasim.API.Tests` gibi bir proje repo kökünde yok).
- **Ödeme akışı:** Tam ödeme, kısmi ödeme, fazla ödeme (sınır olmadan), çift onaylama denemesi, eşzamanlı iki onay isteği senaryolarını kapsayan testler.
- **Harcama algoritması:** Eşit bölüşüm + kişisel kalem kombinasyonlarında toplamın her zaman harcama tutarına eşit kaldığını doğrulayan testler (mevcut `scripts/test-domain.mjs` bu senaryoları kapsıyor mu incelenmeli — şu anki kapsamı sınırlı görünüyor).
- **Navigasyon:** `DavetiyeKabul` düzeltmesi sonrası hem oturum açık hem kapalıyken deep-link testi.
- **UI regresyon:** 14 ölü dosya silindikten sonra `npm run doctor` + `expo export` (bu denetimde kullanılan komutlar) tekrar çalıştırılmalı.

---

## 22. Test Edilemeyen Alanlar ve Nedenleri

| Alan | Neden test edilemedi |
|---|---|
| iOS Simulator üzerinde gerçek çalıştırma | Windows ortamında iOS Simulator hiçbir zaman mevcut değildir. |
| Android emulator/gerçek cihaz üzerinde çalıştırma | Bu makinede Android SDK/emulator/adb kurulu değil. |
| Uçtan uca kayıt/giriş akışının canlı UI'da (Playwright) test edilmesi | Mevcut `tests/web-smoke.spec.js` bir `ROOMORA_TEST_EMAIL`/`ROOMORA_TEST_PASSWORD` gerektiriyor; yerel Docker backend'i ayağa kaldırıp (`compose.local.yml`) test kullanıcısı oluşturmaya çalışıldı, ancak kayıt akışı gerçek bir SMTP gönderimi gerektiriyor ve `MailService.cs` yapılandırılmış `SmtpSettings:SenderEmail`/`Password` olmadan (yerel compose'da tanımlı değil) istisna fırlatıyor. Talimatlar gereği `.env`/sır değerlerini okumak veya gerçek SMTP kimlik bilgilerini yapılandırmak istenmediğinden, bu akış canlı olarak tamamlanamadı; bulgular tamamen kod analizine dayanmaktadır. |
| Gerçek cihazda dokunma alanı (44×44) ölçümü | Simulator/emulator erişimi olmadan piksel-doğru ölçüm yapılamaz. |
| 63 Stitch referansının tamamının canlı ekran görüntüsüyle karşılaştırılması | `docs/implemented-screens` yalnızca 6 ekran görüntüsü içeriyor; kalan ~57 karşılaştırma kod-tabanlı (metin/bileşen/renk) yapılmıştır, piksel-bazlı değildir. |
| Çoklu kullanıcı eşzamanlılık senaryoları (aynı anda iki kullanıcı işlem yapması) | Gerçek eşzamanlı istek testi için birden fazla kimlik doğrulanmış oturum + zamanlama kontrolü gerekir; statik kod analiziyle yalnızca "concurrency-token eksik" tespiti yapılabildi, gerçek bir yarış durumu tetiklenip gözlemlenmedi. |
| Push bildirim uçtan uca testi | Kod tabanında ayrı bir push-token kayıt endpoint'i bulunamadı (§15); bu nedenle test edilecek bir uçtan uca akış tespit edilemedi — bu bizzat bir bulgu olabilir, ürünle netleştirilmeli. |

---

## Sonuç Listeleri

### A. Mağazaya çıkmadan kesinlikle çözülmesi gerekenler
- SEC-001 (CryptoDemoController)
- SEC-002 (AddPaymentWithAllocations yetkilendirmesi)
- SEC-003, SEC-004, SEC-005, SEC-006 (tüm IDOR bulguları)
- UX-002 (DavetiyeKabul deep-link erişilemezliği)
- UX-003 (placeholder legal içerik)
- SEC-007 (ödeme tutarı validasyonu — en azından backend `>0` ve borç-üstü ödeme kuralı netleştirilmeli)

### B. v1.0 sonrasına bırakılabilecekler
- SEC-008, SEC-009 (concurrency/race-condition sertleştirmeleri)
- UX-004 (sessiz hata durumlarının ErrorState ile değiştirilmesi — geniş kapsamlı ama kritik değil)
- UX-005 (RecurringCharges "payımı öde" UI'ı)
- UX-006 — UX-023 (görsel/UI tutarlılık bulguları)
- PERF-001, PERF-002 (FlatList geçişi, query-cache)
- A11Y-001 (erişilebilirlik etiketleme kapsamının artırılması)
- UX-024 — UX-030 (ölü kod temizliği)

### C. Ürün kapsamı dışında bırakılması gerekenler (veya ürünle netleştirilmesi gerekenler)
- UX-001 (Notlar'ın Stitch'teki zengin sosyal-pano tasarımına genişletilip genişletilmeyeceği — bu bir "eksik" değil, kapsam kararıdır)
- Akış #9 "favori ev otomatik açılma" — kodda açık bir "favori" mekanizması bulunamadı, ürünle ne kastedildiği netleştirilmeli
- Akış #41 "Türkçe/İngilizce dil geçişi" — ürün spesifikasyonu zaten TR-only dediği için İngilizce desteğinin gerçekten kapsamda olup olmadığı netleştirilmeli
- Push bildirim akışı — kodda böyle bir mekanizmanın var olup olmaması gerektiği ürünle netleştirilmeli
