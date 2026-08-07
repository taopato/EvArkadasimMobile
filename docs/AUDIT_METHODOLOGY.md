# Bağımsız Denetim Metodolojisi (Codex / başka bir AI ajanına verilecek talimat)

Bu doküman, Roomora projesinde (mobil + backend) yapılan üç turluk bağımsız güvenlik/UX denetiminde izlenen yöntemi tarif eder. Amaç: bir AI ajanına (Codex, Claude Code, vb.) "şu raporu/düzeltmeyi bağımsız olarak yeniden denetle" görevi verildiğinde, yüzeysel bir kod okumasıyla yetinmemesini, gerçek kanıt üretmesini sağlamak.

Bunu doğrudan görev tanımının başına yapıştırabilirsin.

---

## Temel İlke: Hiçbir iddiaya güvenme

Bir düzeltme raporu, commit mesajı veya geliştiricinin kendi beyanı **kanıt değildir**. Her iddia için:
- Ya gerçek kaynak kodu okuyup dosya:satır ile kanıtla,
- Ya da sistemi gerçekten çalıştırıp canlı bir istekle/komutla kanıtla.

"Kod mantıklı görünüyor" bir sonuç değildir. "Şu dosyanın şu satırında şu kontrol var, işte alıntı" bir sonuçtur.

## 1. Statik okuma yetmez — sistemi gerçekten çalıştır

Mümkün olan her yerde kodu değil, **çalışan sistemi** test et:
- Backend/servis varsa, **güncel kaynak koddan yeniden derleyip** (eski/cache'lenmiş bir build ile değil) ayağa kaldır.
- Gerçek bir veritabanı/ortam gerekiyorsa, **zararsız, tamamen sahte test verisi** oluştur (sahte kullanıcı, sahte kayıt vb.). **Üretim verisine veya üretim sırlarına asla dokunma.**
- Test bittiğinde oluşturduğun tüm sahte veriyi sil, ortamı bulduğun haline geri döndür (örn. container'ı orijinal yapılandırmayla yeniden başlat).
- Kimlik doğrulama gerekiyorsa gerçek login akışından gerçek bir token/oturum al; mümkünse token'ı elle uydurma, sistemin kendi ürettiği token'ı kullan (daha güvenilir bir kanıt).
- Gerçek HTTP isteklerini (curl, httpie, vs.) at ve **dönen kodu/gövdeyi** kanıt olarak raporla.

## 2. Negatif senaryoları özellikle ara

Bir şeyin "çalıştığını" göstermek kolaydır; asıl değerli olan kırılma noktalarını bulmaktır. Her özellik için şunları dene:
- **Yetkilendirme atlatma (IDOR):** Bir kullanıcı, kendisine ait olmayan bir kaynağa (başka bir kullanıcının/grubun ID'sini tahmin ederek) erişebiliyor mu? Üye olmayan biriyle dene, beklenen 403/401 mi geliyor kontrol et.
- **Sınır değerleri:** Negatif, sıfır, aşırı büyük, boş, geçersiz formatlı girdiler.
- **Tekrar/çift gönderim:** Aynı işlem iki kez art arda gönderilirse sistem çift işlem yapıyor mu?
- **Gerçek eşzamanlılık:** İki isteği **gerçekten paralel** (arka planda `&` ile aynı anda) ateşleyip race condition'ı fiilen tetikle. Kodda "kilit/concurrency token var" yazısını okumak yetmez — gerçekten iki isteği aynı anda gönderip sonucu gözlemle.
- **Bozuk/eksik konfigürasyon:** Sistemin, hatalı bir ortam değişkeni/anahtar/ayarla başlatıldığında ne yaptığını kasıtlı olarak dene (örn. çok kısa bir güvenlik anahtarıyla başlatmayı deneyip sistemin anlamlı bir hatayla mı yoksa sessizce mi bozulduğunu gör).
- **Kimlik doğrulama vs yetkilendirme ayrımı:** Token yok / geçersiz token / geçerli ama yetkisiz kullanıcı — üçü de farklı ve doğru HTTP koduna mı düşüyor (genelde 401 vs 403)?

## 3. Her bulguda somut kanıt zorunlu — genel ifade yasak

"Güvenlik açığı var", "performans sorunlu" gibi cümleler tek başına değersizdir. Her bulgu şu kalıpta olmalı:
- **Nerede:** dosya yolu + satır numarası (veya endpoint/route)
- **Ne yapıldı:** tam olarak hangi istek/adım denendi
- **Beklenen:** doğru davranış ne olmalıydı
- **Gerçekleşen:** gerçekte ne oldu (kanıt: curl çıktısı, kod alıntısı, ekran görüntüsü)
- **Önem derecesi:** Kritik/Yüksek/Orta/Düşük ve neden

## 4. Kapsam büyükse, bağımsız "gözlere" böl

Kod tabanı büyükse tek bir geçişte yüzeysel kalma riski var. Bunun yerine:
- Farklı alanları (örn. backend güvenlik / mobil UI / mobil servis katmanı) birbirinden bağımsız, paralel görevlere böl.
- Her görevde açıkça "şüpheci ol, hiçbir iddiayı kanıtlamadan kabul etme, dosya:satır ile kanıtla" talimatını tekrar et.
- Sonunda bulguları birleştirip çelişkileri/örtüşmeleri kendin gözden geçir.

## 5. Test edemediğini açıkça söyle, uydurma

Bir ortam kısıtı yüzünden (simulator yok, sır dosyasına erişim yasak, üretim ortamına dokunulamıyor vb.) bir şeyi test edemiyorsan, bunu **ayrı bir bölümde açıkça** yaz: "şu sebeple test edilemedi, bu nedenle bu iddia doğrulanmadı — sadece geliştiricinin beyanı olarak not edildi." Asla "muhtemelen sorun yoktur" diye geçiştirme.

## 6. Süreç/hijyen kontrollerini unutma

Kod doğru olsa bile şunları kontrol et, çünkü bunlar da gerçek risk taşır:
- Değişiklikler **commit edilmiş mi**, yoksa sadece çalışma dizininde mi duruyor? (`git status`) — commit edilmemiş bir güvenlik düzeltmesi, bir `git checkout`/temiz clone ile sessizce kaybolabilir.
- Kaldırıldığı iddia edilen bir dosya/endpoint gerçekten silinmiş mi, yoksa sadece bağlantısı mı kesilmiş (dead code olarak duruyor, yarın yanlışlıkla geri bağlanabilir)?
- Silinen bir şeye hâlâ dangling import/referans var mı? (grep ile tüm kod tabanında ara)

## 7. Rapor formatı

Denetim sonunda üç liste halinde özetle:
- **A. Mağazaya/üretime çıkmadan kesin çözülmesi gerekenler**
- **B. Sonraki sürüme bırakılabilecekler**
- **C. Ürün/hukuk kararı gerektirenler** (mühendisliğin karar veremeyeceği, ama tespit etmesi gereken şeyler — örn. eksik yasal metin, marka kararı)

Ayrıca "Genel Sonuç: GO / CONDITIONAL GO / NO-GO" gibi net bir final karar cümlesi ver ve gerekçesini bir-iki cümleyle açıkla.

---

## Codex'e verilecek örnek görev şablonu

```
Aşağıdaki [X] projesini/deposunu bağımsız olarak denetle.
Önce şu belge(ler)i oku: [önceki rapor/düzeltme kaydı yolları]
Bu belgelerdeki hiçbir iddiayı doğru kabul etme — her birini kaynak koddan
ve mümkünse sistemi gerçekten çalıştırarak bağımsız doğrula.

Metodoloji için şu dosyayı takip et: docs/AUDIT_METHODOLOGY.md

Özellikle şunları doğrula: [madde madde liste]

Kodu değiştirme (READ-ONLY). Test verisi oluşturursan işlem sonunda temizle.
Her bulguda dosya:satır ve somut kanıt ver, genel ifade kullanma.
Sonuçta A/B/C listeleri ve net bir GO/CONDITIONAL GO/NO-GO kararı ver.
```
