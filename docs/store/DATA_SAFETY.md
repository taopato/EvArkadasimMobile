# Veri Güvenliği Beyan Taslağı

Bu belge mağaza formları doldurulurken kontrol listesi olarak kullanılmalıdır. Nihai cevaplar, üretimde etkin olan servislerle tekrar doğrulanmalıdır.

## İşlenen Veriler

- Ad, e-posta, telefon ve profil fotoğrafı
- Ev üyeliği ve davet bilgileri
- Harcama, fatura, ödeme, IBAN ve ev notları
- Kullanıcının yüklediği fiş ve ev fotoğrafları
- Oturum ve güvenlik için gerekli teknik kayıtlar

## Kullanım Amaçları

- Hesap ve ortak ev yönetimi
- Borç/alacak hesaplama ve ödeme onayı
- Fiş okuma ve kullanıcı tarafından istenen içerik işleme
- Güvenlik, hata giderme ve destek

## Mağaza Kontrolleri

- Veriler aktarım sırasında HTTPS ile şifrelenmeli.
- Reklam veya veri satışı yapılmıyorsa mağaza formunda paylaşım beyan edilmemeli.
- Kamera ve galeri yalnızca kullanıcı eylemiyle açılmalı.
- Uygulama içi `Hesabımı Sil` akışı ve herkese açık web silme sayfası çalışmalı.
- Gizlilik politikasındaki saklama/silme açıklaması backend davranışıyla aynı olmalı.
