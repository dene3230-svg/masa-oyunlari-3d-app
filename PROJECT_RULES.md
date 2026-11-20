# Masa Oyunları 3D — Kalıcı Proje Kuralları

Bu projedeki her geliştirme, tasarım güncellemesi ve hata düzeltmesi komutunda aşağıdaki kurallar **otomatik ve zorunlu** olarak uygulanır:

## 1. Hedef Dosyalar (Kök Dizin Önceliği)
- Uygulamanın ana menüsü ve tüm oyunları `src/` klasöründen **DEĞİL**, doğrudan kök dizindeki tek dosyalık HTML sayfalarından çalışır:
  - `./index.html` (Ana Menü, Giriş Ekranı, Profil, Ayarlar, Güncellemeler)
  - `./okey-101.html` (101 Okey)
  - `./tavla.html` (Tavla)
  - `./pis-yedili.html` (Pis Yedili)
- Tüm özellik, arayüz ve mantık değişiklikleri doğrudan kök dizindeki ilgili dosyalara uygulanmalıdır.

## 2. Zorunlu Sürüm Artışı ve Yama Notları (`./version.json`)
- Herhangi bir yenilik, tasarım değişikliği veya hata düzeltmesi yapıldığında kök dizindeki `./version.json` dosyası mutlaka güncellenmelidir:
  - `"version"` değeri bir üst sürüme yükseltilmelidir (ör. `4.2` -> `4.3`).
  - `"message"` alanı yapılan yeni özelliği veya düzeltmeyi kısa ve net biçimde özetlemelidir.
  - `"history"` dizisinin **en başına** yeni sürüm numarası, tarihi ve yapılan yeniliklerin madde madde listesi eklenmelidir.

## 3. Önbellek Senkronizasyonu (`./sw.js`)
- Her sürüm artışında kök dizindeki `./sw.js` dosyasındaki `CACHE_NAME` değeri yeni sürüm numarasına göre güncellenmelidir (ör. `masa-oyunlari-v4-3`).

## 4. Tema ve Profil Uyumluluğu
- Eklenen her yeni ekran, pencere, kart veya oyun içi bileşen `localStorage` üzerindeki paylaşılan yapılarla tam uyumlu olmalıdır:
  - `"app_theme"`: Siyah (VIP Koyu) ve Beyaz (Mermer & Meşe) tema desteği eksiksiz uygulanmalıdır.
  - `"user_session"`: Google ve Misafir kullanıcı oturumu (ad, avatar, sağlayıcı bilgisi) ile uyumlu çalışmalıdır.
  - `"player_gold"` ve `"player_rank_xp"`: Kalıcı bakiye ve rütbe sistemiyle senkronize olmalıdır.
