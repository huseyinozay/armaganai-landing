# Sosyal medya videoları (Instagram / TikTok, dikey 1080×1920)

Videolar gerçek ArmağanAI ekranlarından, kurgusal demo veriyle üretilir; elle çizilmiş arayüz yoktur.
Ekranlar landing çekimiyle aynı yoldan alınır (`scripts/app-screens/fixtures.cjs`), üstüne kamera
hareketi, imleç, vurgu ve metin bu klasördeki sahne dosyasında eklenir.

## Yenileme

```bash
node scripts/social-video/capture.cjs                     # ekranlar → shots/ (+ manifest.json)
node scripts/social-video/render.cjs 01-tebligat          # video → out/01-tebligat.mp4
node scripts/social-video/render.cjs 01-tebligat --stills 0,9.5   # tek kareler (kontrol için)
node scripts/social-video/render.cjs 01-tebligat --serve           # tarayıcıda önizleme adresi
```

Gereksinimler:

- Çekim için app yerelde çalışıyor olmalı: `http://localhost:3002` (`APP_URL` ile değişir).
- Google Chrome kurulu olmalı (Playwright `channel: "chrome"`).
- MP4 için ffmpeg: `brew install ffmpeg` ya da `FFMPEG=/yol/ffmpeg`.

## Nasıl çalışır

- `capture.cjs`: demo "bugünü" sabittir (`DEMO_NOW`, varsayılan Salı 6 Ekim 2026 09.20); hafta sonuna
  duruşma düşmesin, tarihler videodaki metinlerle tutsun diye. Kareler 3× çözünürlükte çekilir
  (yakınlaştırmada keskin kalsın). Tebligatın senkrondan önceki, senkron sırasındaki (eklentinin
  ilerleme mesajıyla) ve işlendikten sonraki hâlleri ayrı karelerdir. Hedef kutuları
  `shots/manifest.json`'a yazılır; sahne kamerayı ve vurguları bunlardan kurar.
- Gerekçeli karar, önizleme panelindeki UDF çiziminin kendisidir (iframe `srcdoc`), tam boy çekilir.
- `kit/`: ortak parçalar (zamana bağlı kamera, dizüstü çerçevesi, Armağan maskotu, imleç, vurgular).
  Her kare yalnızca zamandan hesaplanır; `render.cjs` kareleri tek tek çizip ffmpeg'e verir.
- Sessiz bir ses kanalı eklenir; müzik platformun kendi kütüphanesinden eklenmeli.

## Güvenli alan

Önemli içerik y 200–1440 aralığında, x 60–1020 içinde tutulur: altta platformun açıklama/kullanıcı
adı alanı, sağda beğeni/yorum düğmeleri kalır.
