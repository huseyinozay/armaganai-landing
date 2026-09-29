# Landing ürün ekranları

Landing'deki bütün ürün görselleri gerçek ArmağanAI arayüzünden, kurgusal demo veriyle çekilir.
Elle çizilmiş arayüz kullanılmaz.

## Yenileme

```bash
npm run screens              # app kareleri (açık + koyu tema) ve odak ölçümleri
npm run screens -- bell home # yalnız belirli kareler
npm run screens:extension    # Chrome eklentisi açılır penceresi
```

Gereksinimler:

- App yerelde çalışıyor olmalı: `http://localhost:3002` (docker `dev-app`; farklıysa `APP_URL=...`).
- Sistemde Google Chrome kurulu olmalı (Playwright, `channel: "chrome"` ile onu kullanır).
- Eklenti karesi için `../armaganai-chrome-extension/dist` derlenmiş olmalı (`EXTENSION_DIST` ile değişir).

## Nasıl çalışır

- `capture.cjs` app'i sahte bir oturum çereziyle açar. Tarayıcının bütün `/api` istekleri
  `fixtures.cjs`'teki demo veriyle yanıtlanır; backend'e, soketlere ve depolamaya hiçbir istek gitmez.
- Chrome eklentisi bağlıymış gibi davranılır (üst bardaki UYAP/UETS göstergeleri, dosyadaki
  Senkron / Evrakları İndir düğmeleri).
- Her karede önce app'in IndexedDB'sine (`armaganai-crypto`) yalnız o çekim için üretilmiş
  oturum anahtarları yazılır. Böylece “Güvenlik oturumun sona erdi” penceresi açılmaz; dışa
  aktarma ve PDF indirme gibi anahtar isteyen işlemler de çalışır. Anahtarların sunucuyla ilgisi yoktur.
- Evrak önizlemesindeki gerekçeli karar, `udf.cjs` ile üretilen kurgusal bir UDF dosyasıdır
  (`/demo-files/...` yolundan verilir, şifresizdir).
- Önizleme karesinde yalnız sayfa kırpılır: panelin üstündeki “AI Özeti (yakında)” satırı,
  henüz olmayan bir özelliği vaat etmesin diye landing'e girmez.
- Çıktılar:
  - `src/assets/landing/app/{light,dark}/<kare>.webp` ve kırpımlar `<kare>--<hedef>.webp`
  - `src/components/landing/screens/manifest.json`: odak hedeflerinin konumları ve demo tarihleri

Tarihler çekim gününe göre üretilir; kareler yenilenince landing'deki tarih metinleri de manifestten güncellenir.
Kareler birbirine gönderme yaptığı için (ör. hero'daki son gün takvimde ve görevlerde) hepsini aynı gün,
tek seferde çekin.

## Kare tanımı (`FRAMES`)

- Adımlar: `click` (Playwright seçici; gizli kopyalar için `:visible`), `hover`, `type: [seçici, metin]`,
  `wheel: piksel` (sayfayı kaydırır, fareyi kenara çeker), `mouse: [x, y]`, `scrollText`, `wait: ms`.
- Hedefler: `{ selector }`, `{ text, up?, closest? }`, `{ union: [...] }`, `{ from, to }`,
  `{ rect: { x, y, w, h } }` (görüntü alanına oranla). Her hedefe `xs: [sol, sağ]` (yatay sınırlar)
  ve `grow` (üst/alt pay) eklenebilir; `crop: pay` verilen hedef ayrıca kırpılmış dosya olarak kaydedilir.

App'in arayüzü değişirse `FRAMES` içindeki seçiciler ve adımlar güncellenmelidir.
