# Roomora — Bağımsız Yeniden Denetim (Remediation Sonrası)

**Tarih:** 2026-07-27 (aynı gün, düzeltmelerden sonra)
**Kapsam:** `EvArkadasimMobile` + `EvArkadasimBackend`, önceki rapor `CLAUDE_UI_UX_AUDIT.md` ve düzeltme kaydı `AUDIT_REMEDIATION_2026-07-27.md`
**Yöntem:** Bu denetim, düzeltme raporundaki hiçbir iddiayı olduğu gibi kabul etmedi. Her madde şu üç yoldan en az biriyle bağımsız doğrulandı: (1) güncel kaynak kodun satır satır okunması, (2) backend'in Docker'da **güncel koddan yeniden derlenip** çalıştırılması ve gerçek HTTP istekleriyle canlı test edilmesi, (3) mobil tarafta `npm test`/`expo-doctor`/export komutlarının yeniden çalıştırılması. Kodda hiçbir değişiklik yapılmadı; yalnızca yerel test verisi (3 kullanıcı, 1 ev, 1 harcama, 1 ledger satırı, 1 ödeme) eklenip test sonunda tamamen silindi.

**Önceki raporu tekrar etmeme kuralına uyuldu:** Aşağıda yalnızca (a) düzeltme iddialarının doğrulama sonucu ve (b) bu denetimde **yeni bulunan** sorunlar yer alıyor.

---

## Genel Sonuç: **CONDITIONAL GO**

Önceki 3 Kritik bulgunun üçü de gerçekten ve etkili biçimde kapatılmış (canlı olarak doğrulandı). Ancak bu yeniden denetim, düzeltme sürecinde **daha önce keşfedilmemiş yeni bir Kritik bulgu** ortaya çıkardı (RE-001 — yerel varsayılan JWT anahtarı HS512 için çok kısa, giriş tamamen çöküyor) ve düzeltme raporunun bazı maddelerinin iddia edildiği kadar tam olmadığını gösterdi (özellikle radius/tema tutarlılığı ve `ApprovePayment`/`RejectPayment`'ta controller-seviyesi yetki kontrolü eksikliği). Gizlilik/Kullanım Koşulları metinleri hâlâ mağazaya çıkmaya hazır değil.

---

## A. Doğrulama Sonuçları — Düzeltme Raporundaki 14 Madde

### 1. CryptoDemo / GetAllUsers / AddPaymentWithAllocations kaldırıldı mı?

| Yüzey | Doğrulama | Sonuç |
|---|---|---|
| `CryptoDemoController` | Dosya solution'da yok (`EvArkadasim.API/Controllers/` içinde 10 controller var, CryptoDemo yok). `EvArkadasim.sln` 5 proje listeliyor, ayrı bir demo projesi yok. Canlı: `curl /api/CryptoDemo/seed-user` → **404**. | ✅ Tamamen kaldırılmış |
| `GetAllUsers` | `UsersController.cs`'te action yok. Canlı: `curl -H Authorization ... /api/Users/GetAllUsers` → **404**. | ✅ Route kaldırılmış, **ancak** ⚠️ handler kodu hâlâ duruyor: `Application/Features/Users/Queries/GetAllUsers/GetAllUsersQuery.cs`, `GetAllUsersQueryHandler.cs`, `Application/Features/Users/Dtos/GetAllUsersDto.cs` silinmemiş — MediatR tarafından hâlâ keşfedilebilir durumda. Bugün hiçbir controller çağırmıyor ama gelecekte biri `_mediator.Send(new GetAllUsersQuery())` yazarsa aynı güvenlik açığı sessizce geri döner. |
| `AddPaymentWithAllocations` | `PaymentsController.cs`'te action yok, `Application/Features/Payments/**` içinde command/handler yok. Canlı: swagger'da yol yok; `POST /api/Payments/AddPaymentWithAllocations` çağrısı **405** dönüyor (yol `Payments/{id}` route şablonuyla eşleşiyor ama sadece DELETE tanımlı olduğu için 405 — bu route'un varlığı değil, ASP.NET'in genel path-matching davranışıdır). Mobil `src/services/api.js`'te fallback çağrısı da yok. | ✅ Tamamen kaldırılmış (mobil + backend) |

### 2. Houses/Payments/LedgerLines: JWT kimliği + ev üyeliği kontrolleri

Hem kod okuması hem **canlı HTTP testiyle** (gerçek giriş yapılmış JWT'lerle, ev üyesi olmayan bir kullanıcı ile) doğrulandı:

| Endpoint | Canlı test sonucu |
|---|---|
| `GET /api/Houses/{id}` | Üye → **200**, üye olmayan → **403** ✅ |
| `GET /api/Houses/{id}/members` | Üye olmayan → **403** ✅ |
| `GET /api/Houses/GetUserHouses/{userId}` | Kendisi olmayan userId → **403** ✅ |
| `GET /api/Payments/GetPayments/{houseId}` | Üye olmayan → **403** ✅ |
| `GET /api/Payments/GetPendingPayments/{userId}` | Kendisi olmayan userId → **403** ✅ |
| `GET /api/LedgerLines/ByHouse/{houseId}` | Üye olmayan → **403** ✅ |

Kod incelemesiyle ayrıca doğrulanan diğer Houses action'ları (`SendInvitation`, `GetUserDebts`, `GetUserDebtBetween`) da artık `IsActiveMemberAsync`/self-check içeriyor.

**⚠️ Yeni bulunan gedik (RE-002):** `PaymentsController.ApprovePayment`/`RejectPayment` action'larında **controller seviyesinde hiçbir yetki kontrolü yok** — `GetCurrentUserId()` çağrısı bile yapılmıyor. Yetki kontrolü tamamen `ApprovePaymentCommandHandler`/`RejectPaymentCommandHandler` içine gömülü (`payment.AlacakliUserId != currentUserId` kontrolü). Bugün bu çalışıyor (canlı testte doğrulandı — bkz. aşağı) çünkü handler sıkı, ama kod tabanındaki **tek tutarlı örüntü** "controller'da kontrol et, handler'da savunma amaçlı tekrarla" iken bu iki action bunu sessizce bozuyor — ileride handler'ı değiştirmeden yeni bir çağıran (ör. bir batch job, farklı bir controller) eklenirse hiçbir derleme zamanı uyarısı olmadan kontrol atlanabilir.

Canlı doğrulama: Evin/ödemenin hiçbir tarafı olmayan bir kullanıcı `POST /api/Payments/ApprovePayment/1` çağırdığında **401** (`"Bu ödemeyi onaylama yetkiniz yok"`) döndü — engelleniyor, ama **403 değil 401** dönüyor (bkz. RE-003).

### 3. Ödeme tutarı validasyonu (pozitif, taraflar farklı, açık borcu aşmama)

**Canlı olarak test edildi** (gerçek DB'de bir ev + 100 TL'lik açık borç ledger satırı kurulup):

| Senaryo | Beklenen | Gerçekleşen |
|---|---|---|
| Tutar = -50 | 400 | ✅ `{"message":"Ödeme tutarı sıfırdan büyük olmalıdır."}` HTTP 400 |
| Tutar = 0 | 400 | ✅ Aynı mesaj, HTTP 400 |
| Tutar = 500 (açık borç 100 iken) | 400, kalan borcu belirten mesaj | ✅ `{"message":"Ödeme tutarı açık borçtan büyük olamaz. En fazla 100.00 TL ödeyebilirsiniz."}` HTTP 400 |
| Borçlu olmayan biri kendini `BorcluUserId` olarak spoof etmeye çalışırsa | 403 | ✅ HTTP 403 |
| Geçerli kısmi ödeme (100 borçtan 40 TL) | 201 + kayıt | ✅ HTTP 201, `Payments` tablosuna `Tutar=40, Status=Pending(1)` yazıldığı DB'de doğrulandı |

`CreatePaymentCommandHandler.cs` içindeki `outstanding` hesabının gerçekten o borçlu/alacaklı **çiftine özgü** açık ledger toplamı olduğu (ev geneli değil) hem kod hem canlı testle doğrulandı.

### 4. Ödeme onayı: borç yeniden doğrulanıyor mu, tek commit mi?

Kod okuması: `ApprovePaymentCommandHandler.cs` onay anında açık ledger satırlarını **yeniden** çekip `outstanding`'i tekrar hesaplıyor (stale veriyle çalışmıyor), FIFO ile `LedgerLine.PaidAmount`/`IsClosed`, `PaymentAllocation` kayıtları ve `Payment.Status` güncellemelerinin hepsi **tek bir `SaveChangesAsync()` çağrısında** birleştirilmiş (önceki "her satır için ayrı commit" örüntüsü değiştirilmiş).

**Canlı doğrulama:** Onay sonrası DB kontrolünde `LedgerLines.PaidAmount = 40.00`, `Payments.Status = 2 (Approved)` — tutarlı. ✅

### 5. Concurrency token + 409 Conflict

**Bu, en güçlü şekilde canlı test edilen madde oldu.** Aynı ödeme kaydı için **gerçekten eşzamanlı** iki `ApprovePayment` isteği arka planda paralel gönderildi:

```
[req1] HTTP:200  → {"success":true,"message":"Ödeme başarıyla onaylandı",...}
[req2] HTTP:409  → {"message":"Bu kayıt başka bir işlem tarafından güncellendi. Verileri yenileyip tekrar deneyin."}
```

✅ **Tam olarak iddia edildiği gibi çalışıyor** — birisi kazanıyor, diğeri temiz bir 409 alıyor, ledger'da çift düşüş yok. `Payments`/`LedgerLines` tablolarında `RowVersion timestamp` kolonlarının varlığı DB şemasında doğrudan sorgulanarak da teyit edildi. Migration dosyası (`20260727175907_AddFinancialConcurrencyTokens.cs`) her iki tabloya da `rowversion` tipinde kolon ekliyor ve `Down()` metodu geri alınabilir şekilde yazılmış.

**Ek doğrulama:** Zaten onaylanmış bir ödemeyi tekrar onaylamaya/reddetmeye çalışmak 500 değil temiz 400 hatası veriyor (`"Ödeme zaten onaylanmış."` / `"Onaylanmış ödeme reddedilemez."`) — düzgün durum makinesi koruması.

### 6. Mobil: Ödeme bildirme ekranı — açık borç yokken engelleme + kısmi ödeme

Kod: `RoomoraFinance.js` içinde `if (maxAmount <= 0) return Alert.alert('Açık borç yok', ...)` ve `if (numericAmount > maxAmount) ...` — eski "maxAmount=0 iken kontrol atlanıyor" hatası (orijinal denetimde UX-008 olarak bulunmuştu) **düzeltilmiş**: artık `<=0` kontrolü kısa devre sorununu ortadan kaldırıyor. Tam borç kadar ödeme (`numericAmount === maxAmount`) engellenmeden geçiyor — off-by-one regresyonu yok.

### 7. Harcama Ekle — kişi başı tutar hesabı

`HarcamaEkle.js`: `sharedAmountForSummary = Math.max(0, amountNum - personalTotalForSummary)`, ekranda gösterilen "Kişi başı" değeri artık `sharedAmountForSummary / participantIds.length` — **kişisel kalemler düşüldükten sonra** hesaplanıyor (eski UX-006 düzeltilmiş).

### 8. Düzenli gider — çift gönderim koruması

`DuzenliGiderEkle.js`: `saving` state var, `onSave` içinde en başta `if (saving) return;` senkron koruması var, `setSaving(true)` async çağrıdan önce set ediliyor, kaydet butonu `disabled={saving}` (eski UX-007 düzeltilmiş).

### 9. Notlar — son seçilen liste/görünüm hatırlama

`EvNotlari.js`: `AsyncStorage` anahtarı **ev bazında** namespace'lenmiş (`roomora:notes:${houseId}:view`) — bu önemli, çünkü aynı kullanıcı birden fazla evde farklı listeler seçmiş olabilir; ev-bazlı anahtarlama olmasaydı bir evin seçili listesi diğerine sızabilirdi. Bu regresyon **kontrol edildi ve bulunmadı** (eski UX-009 düzeltilmiş).

### 10. Sessiz hata durumları (GrupListesi + Dashboard ekranları)

`GrupListesi.js`: artık `loadError` state'i var, ayrı bir "Tekrar Dene" empty-state'i render ediliyor (eski UX-010 düzeltilmiş).

`useRoomoraDashboard.js`: `Promise.allSettled` ile 4 çağrının durumunu takip edip `error` alanını hesaplıyor; bu alan artık **4 ekranın tamamında** (`RoomoraHome`, `RoomoraExpenses`, `RoomoraBills`, `HarcamaOzeti`) okunup `ErrorState` olarak render ediliyor, başarısız borç verisi artık "₺0,00" gibi görünmüyor (eski UX-004 büyük ölçüde kapatılmış).

**⚠️ Küçük eksik (RE-004):** Hook, 4 çağrıdan **hangisinin** başarısız olduğunu ayırt etmiyor — ör. yalnızca "bekleyen ödemeler" isteği başarısız olsa bile ekranın tamamı genel bir hata durumuna düşüyor, borç verisi başarıyla gelmiş olsa dahi gösterilmiyor. Fonksiyonel bir kırılma değil, gereğinden kaba bir granülerlik.

### 11. Faturalar — dönemsel ödeme + kişi bazlı ödendi/ödenmedi

`RoomoraBills.js` artık `toggleShare`/`toggleExternal` fonksiyonlarını `scheduledChargesApi.setSharePaid/setExternalPaid`'e bağlıyor; `ScheduledChargeCard.js` bu aksiyonları gerçek dokunulabilir satır/buton olarak render ediyor (eski UX-005 kapatılmış — daha önce bu API'ler backend'de hazır ama hiçbir canlı ekrandan çağrılmıyordu).

### 12. BrandMark `variant="mark"` + koyu temada beyaz logo

`BrandMark.js`: `variant === 'mark'` artık tanınıyor; `tone==='auto' && theme.mode!=='light'` durumunda `mark-white.png` otomatik seçiliyor — bileşen seviyesinde **gerçekten düzeltilmiş**. Mobil export çıktısında da artık hem `mark-navy.png` hem `mark-white.png`'nin bundle'landığı doğrulandı (önceki export'ta yalnızca navy vardı).

**⚠️ Not (RE-005, düşük önem):** Orijinal bulgunun somut örneği olan `Odemeler.js` (koyu lacivert kahraman kartında görünmez logo) ekranı **App.js'te hiçbir route'a bağlı değil** — yani bu spesifik ekran zaten ölü kod olduğu için "düzeltildi mi" diye canlı olarak yeniden doğrulanamıyor; düzeltme, bileşenin kendisinde (doğru) yapılmış ama orijinal bulgunun işaret ettiği ekran hâlâ erişilemez durumda duruyor.

### 13. Splash rengi

`app.config.js` → `backgroundColor: '#F7F9FC'` — doğrulandı, eski `#eef4fa` değeri değişmiş. ✅

### 14. iOS ikonu opaklığı

`src/assets/icon.png` PNG header'ı doğrudan okunarak kontrol edildi: `colorType: 2` (truecolor **RGB**, alfa kanalı formatın kendisinde yok) — bu, "sampled alpha minimum 255" iddiasından daha güçlü bir garanti: format yapısal olarak şeffaflığı imkânsız kılıyor. ✅ Doğrulandı.

---

## B. Bu Denetimde Yeni Bulunan Sorunlar

### RE-001 — [Kritik, sadece yerel/varsayılan yapılandırma] `compose.local.yml`'deki varsayılan JWT anahtarı HS512 için çok kısa; giriş tamamen çöküyor
- **Ekran/Akış:** Tüm giriş/kayıt akışları (backend-only, ortam yapılandırmasına bağlı)
- **Kaynak dosya:** `EvArkadasimBackend/compose.local.yml` — `TokenOptions__SecurityKey: ${TOKEN_SECURITY_KEY:-ROOMORA_LOCAL_ONLY_SECURITY_KEY_CHANGE_BEFORE_PRODUCTION_2026}` (61 karakter = 488 bit); imzalama algoritması `Persistence/Security/JWT/JwtHelper.cs:39` → `SigningCredentialsHelper.CreateSigningCredentials` → `HmacSha512Signature` (HS512, minimum 512 bit/64 byte anahtar gerektirir).
- **Tekrarlama adımları:** Bu repodaki `compose.local.yml`'i hiçbir override olmadan `docker compose up` ile ayağa kaldırın, herhangi bir kullanıcıyla `POST /api/Auth/Login` çağırın.
- **Beklenen:** Doğru şifreyle giriş başarılı olmalı, JWT dönmeli.
- **Gerçekleşen:** `{"message":"Giris tokeni olusturulamadi: IDX10720: Unable to create KeyedHashAlgorithm for algorithm '...hmac-sha512', the key size must be greater than: '512' bits, key has '488' bits."}` — **login endpoint'i her zaman 500 benzeri bir hata döndürüyor, hiçbir kullanıcı bu varsayılan yapılandırmayla giriş yapamıyor.**
- **Kullanıcı etkisi:** Bu tam olarak varsayılan yerel geliştirme yapılandırmasıyla karşılaşılacak bir durum — yeni bir geliştirici `compose.local.yml`'i olduğu gibi çalıştırırsa hiçbir hesaba giriş yapamaz. **Üretim ortamındaki gerçek `TokenOptions:SecurityKey` değerinin uzunluğu bu denetimde okunmadı/kontrol edilmedi** (sır dosyalarına dokunulmadı) — ancak üretimde de benzer şekilde kısa bir anahtar kullanılıyorsa bu, **tüm kullanıcı tabanı için toplam bir kimlik doğrulama kesintisi** anlamına gelir. Bu, mutlaka üretim ortamında (kod okunmadan, sadece "anahtar en az 64 byte mı" diye) doğrulanmalı.
- **Nasıl bulundu:** Canlı test sırasında gerçek bir `/api/Auth/Login` çağrısı yapılınca ortaya çıktı; yalnızca kod okuyarak yakalanamazdı.
- **Önerilen çözüm:** `compose.local.yml`'deki varsayılan anahtarı en az 64 byte (86+ karakter rastgele Base64) yapın; `JwtHelper` constructor'ına anahtar uzunluğu kontrolü ekleyip 64 byte'tan kısa anahtarlarla **başlangıçta** (runtime'da ilk login denemesinde değil) net bir hata fırlatın — bu, yanlış yapılandırılmış bir ortamın sessizce/geç fark edilmesini önler. Üretim `TokenOptions:SecurityKey` değerinin uzunluğu operasyon ekibi tarafından doğrulanmalı.
- **Çözüm için tahmini risk:** Düşük (yerel config dosyası değişikliği + opsiyonel bir constructor guard).
- **Regresyon testi:** Düzeltme sonrası `docker compose up` + gerçek kullanıcıyla login akışının uçtan uca çalıştığını doğrulayın.

### RE-002 — `ApprovePayment`/`RejectPayment` controller'da yetki kontrolü yok, sadece handler'da var
Bkz. yukarıda madde 2 altındaki detay. **Önem:** Orta (bugün istismar edilemiyor, mimari tutarsızlık + gelecekte kırılgan).
- **Kaynak:** `PaymentsController.cs` — `ApprovePayment`/`RejectPayment` action'ları (satır aralığı ~140-152)
- **Önerilen çözüm:** Diğer tüm endpoint'lerdeki örüntüyle tutarlı olacak şekilde, controller'da da `GetCurrentUserId()` + ödemenin `AlacakliUserId`'si ile eşleşme kontrolünü tekrarlayın (savunma amaçlı, handler'daki kontrolü kaldırmadan).

### RE-003 — Yetkisiz-ama-kimliği-doğrulanmış istekler 403 yerine 401 dönüyor
- **Kaynak:** `Program.cs` içindeki global exception handler, `UnauthorizedAccessException`'ı 401'e eşliyor (satır ~298-303)
- **Kanıt:** Canlı test — evin/ödemenin hiçbir tarafı olmayan ama geçerli bir JWT'ye sahip bir kullanıcı `ApprovePayment` çağırdığında **401** döndü (403 beklenirdi).
- **Önem:** Düşük (güvenlik açığı değil, HTTP semantiği hatası — mobil client tarafında 401'i "oturum sonlandır" olarak yorumlayan bir interceptor varsa (`src/services/api.js:57-87`), bu durumda kullanıcı yanlışlıkla oturumdan atılabilir — **bu ihtimal doğrulanmalı**, çünkü mobil taraftaki 401 interceptor'ı gerçek bir yetkisizlik durumunu "token geçersiz" sanıp kullanıcıyı login ekranına düşürebilir.)
- **Önerilen çözüm:** `UnauthorizedAccessException` için 403, gerçek kimlik doğrulama hataları için ayrı bir exception tipi/401 kullanın.

### RE-004 — `useRoomoraDashboard` hangi veri kaynağının başarısız olduğunu ayırt etmiyor
Bkz. yukarıda madde 10. **Önem:** Düşük.

### RE-005 — Orijinal "koyu logo" bulgusunun somut örneği hâlâ ölü kod içinde duruyor
Bkz. yukarıda madde 12. **Önem:** Düşük (temizlik/tutarlılık).

### RE-006 — Radius/shadow tutarsızlığı iddia edilenden daha az düzeltilmiş
Düzeltme raporu "Canonical shared cards/buttons use the 8 px radius token" diyor. Bağımsız doğrulama:
- `CanonicalUI.js` kartları gerçekten `theme.radius.sm` (8px) kullanıyor.
- **Ama** `CanonicalUI.js`'in kendi `primaryButton` tanımı hardcoded `borderRadius: 12` (8px değil, token da değil).
- Gerçekte **yaygın olarak kullanılan** `PremiumButton`/`PremiumCard` (`src/shared/ui/premium/Button.tsx`, `Card.tsx` — `src/shared/ui/Button.js`/`Card.js` bunları re-export ediyor) varsayılan olarak `theme.radius.md` (**12px**) kullanıyor, 8px değil.
- `premiumTheme.js` hâlâ üçüncü bir radius ölçeği tanımlıyor (`sm:10, md:14, lg:18`) — kullanılmıyor ama silinmemiş.
- `CommonStyles.js` (4. sistem, hardcoded 8px) hâlâ 11 dosya tarafından import ediliyor; bunlardan yalnızca `GirisYap.js` canlı, geri kalan 10'u (`Faturalar.js`, `TumHarcamalar.js`, `Borclar.js`, `Dogrulama.js`, `OdemeEkle.js`, `SifreSifirla.js`, `Alacaklarim.js`, `BorcAlacakOzeti.js`, `SifremiUnuttum.js`, `AlacakBorcIcmi.js`) ölü ekranlar.
- **Sonuç:** 4 farklı radius sisteminin **hiçbiri silinmedi**; yalnızca bazı kart yüzeyleri tesadüfen 8px'te birleşti. Asıl canlı Button/Card bileşenleri hâlâ 12px varsayılan kullanıyor.
- **Önem:** Düşük (görsel tutarlılık, fonksiyonel değil) ama düzeltme raporundaki ifade abartılı.

---

## C. Yeniden Doğrulanan Ama Hâlâ Kapanmamış Maddeler (Önceki Raporun C Listesi)

### Gizlilik Politikası / Kullanım Koşulları — **hâlâ üretime hazır değil**
`src/screens/SettingsInfo.js:130-146` doğrudan okundu. Metin artık önceki placeholder'dan daha gerçekçi/dolu (gerçek başlıklar altında anlamlı cümleler var — "Topladığımız bilgiler", "Paylaşım ve saklama", "Haklarınız" vb.) **ancak:**
- Şirketin/veri sorumlusunun **gerçek unvanı, adresi veya iletişim bilgisi hiçbir yerde yok**.
- Veri saklama süresi, KVKK/GDPR'a atıf, şikayet/başvuru mercii bilgisi yok.
- Satır 136: `"Son güncelleme: 26.07.2026"` **hâlâ sabit kodlanmış** bir tarih (dinamik değil).
- Satır 143: **Metin hâlâ kendi içinde şu uyarıyı taşıyor**: `"Bu metin yayın öncesinde hukuki kontrolden geçirilmelidir."` — yani kodun kendisi bile bu içeriğin nihai olmadığını söylüyor.

**Bu rapor, kullanıcının özellikle istediği gibi açıkça belirtir: bu iki ekran, gerçek şirket adı/unvanı, iletişim adresi, veri saklama politikası ve yasal onay olmadan mağaza başvurusuna çıkacak şekilde üretime hazır kabul edilemez.** Bu bir mühendislik/kod bulgusu değil, bir hukuk/ürün kararı gerektiren açık bir boşluktur.

---

## Sonuç Listeleri

### A. Mağazaya çıkmadan kesinlikle çözülmesi gerekenler
- **Gizlilik Politikası / Kullanım Koşulları**: gerçek şirket unvanı, iletişim adresi, veri saklama süresi ve hukuki onay ile tamamlanmalı (kod değişikliği değil, içerik + hukuki inceleme).
- **RE-001**: Üretim ortamındaki gerçek `TokenOptions:SecurityKey` uzunluğunun en az 64 byte olduğu operasyon ekibi tarafından doğrulanmalı (bu denetim üretim sırrını okumadı/okuyamadı — yalnızca yerel varsayılanın bozuk olduğunu kanıtladı, aynı riskin üretimde olmadığından emin olunmalı).
- **RE-002**: `ApprovePayment`/`RejectPayment` controller'larına da diğer endpoint'lerle tutarlı şekilde açık yetki kontrolü eklenmeli (savunma amaçlı, bugün istismar edilmiyor olsa da).

### B. v1.0 sonrasına bırakılabilecekler
- RE-003 (401→403 HTTP semantiği düzeltmesi + mobil 401-interceptor'ın yanlışlıkla tetiklenip tetiklenmediğinin doğrulanması)
- RE-004 (dashboard hata granülerliği)
- RE-005 (ölü `Odemeler.js` ekranının silinmesi)
- RE-006 (4 radius sisteminin tek bir tokene indirgenmesi — `CanonicalUI.primaryButton`, `PremiumButton`/`PremiumCard` varsayılanı, `premiumTheme.js`'in silinmesi, `CommonStyles.js`'i hâlâ import eden 10 ölü ekranın temizlenmesi)
- Orijinal raporun B listesindeki maddeler (FlatList dönüşümü, tam erişilebilirlik geçişi, backend entegrasyon/güvenlik test projesi eklenmesi — hâlâ yok, doğrulandı) geçerliliğini koruyor.

### C. Ürün kapsamı dışında veya ürün/hukuk kararı gerektirenler
- Notlar ekranının Stitch'teki sosyal-pano konseptine genişletilip genişletilmeyeceği (önceki rapordan taşınan, değişmemiş karar noktası).
- Mevcut Expo slug'ının (`ev-arkadasim`) korunması — EAS proje geçişi olmadan değiştirilmemeli (düzeltme raporuyla aynı görüş).
- Gizlilik/Kullanım Koşulları'nın nihai hukuki metni — mühendislik denetiminin karar veremeyeceği bir alan; yalnızca "hazır değil" tespiti bu raporun kapsamındadır.

---

## Test Edilemeyen / Bu Turda Kapsam Dışı Kalan Alanlar
- iOS Simulator ve Android emulator/gerçek cihaz testi yine yapılamadı (ortam kısıtı önceki raporla aynı).
- Mobil UI'ın yeni backend davranışıyla (409 Conflict, yeni hata mesajları) gerçek bir cihaz/tarayıcıda uçtan uca görsel testi yapılmadı — yalnızca backend'in doğru HTTP kodlarını döndürdüğü doğrulandı; mobil tarafın 409'u kullanıcıya nasıl gösterdiği (`retry` mesajı var mı) ayrıca görsel olarak doğrulanmalı.
- Backend'de hâlâ hiçbir otomatik test projesi (xUnit/NUnit/MSTest) yok — bu denetimdeki tüm canlı doğrulamalar elle yazılmış tek seferlik `curl` istekleriydi; bunların kalıcı bir regresyon test paketine dönüştürülmesi önerilir.
