// Landing'deki ürün karelerini gerçek ArmağanAI arayüzünden, demo veriyle çeker.
//
// Gereksinim: app yerelde çalışıyor olmalı (varsayılan http://localhost:3002, APP_URL ile değişir).
// Tarayıcının /api istekleri fixtures.cjs'teki demo veriyle yanıtlanır; backend'e, soketlere ve
// depolamaya hiçbir istek gitmez. Chrome eklentisi bağlıymış gibi davranılır (üst bardaki
// UYAP/UETS göstergeleri). Çekim için sistemdeki Google Chrome kullanılır.
//
// Kullanım: npm run screens            (yalnız bazı kareler: npm run screens -- home bell)

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");
const sharp = require("sharp");
const { createDemo } = require("./fixtures.cjs");

const APP = (process.env.APP_URL || "http://localhost:3002").replace(/\/$/, "");
// App'in kendi duvar kâğıtlarından; hero arka planıyla karışmasın diye farklı seçildi.
const WALLPAPER = { light: process.env.LIGHT_WALL || "kumsal", dark: process.env.DARK_WALL || "zaman-cizgisi" };
const VIEWPORT = { width: 1440, height: 900 };
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "src/assets/landing/app");
const MANIFEST = path.join(ROOT, "src/components/landing/screens/manifest.json");

const openRecord = [{ click: "button[title]:has(svg.lucide-calendar-clock)" }, { wait: 3000 }];
const openCalendarAt = [
  { click: '[aria-label="Takvim"]' },
  { wait: 3000 },
  { click: 'button:has-text("Sonraki dönem")' },
  { wait: 1200 },
  { click: 'button:has-text("Sonraki dönem")' },
  { wait: 2500 },
  // Haftalık ızgara çekim saatine kayar; önce gece yarısına, sonra saat 08.00'e getir.
  { wheel: -2000 },
  { wait: 600 },
  { wheel: 520 },
  { wait: 1200 },
];

// Her kare: sayfa, tebligatın durumu, açılışta yapılacaklar ve ölçülecek odak hedefleri.
// Hedef: { selector } | { text, up?, closest? } | { union: [hedef, ...] } | { rect: {x,y,w,h} }
//        | { from: hedef, to: hedef } (from'un kutusu, alt kenarı to'nunki)
// `crop: pay` verilen hedefler ayrıca kırpılmış dosya olarak kaydedilir: <kare>--<hedef>.webp
const FRAMES = [
  {
    id: "home",
    path: "/",
    // Ana sayfanın iki görünümü: baloncuk (çember) ve liste (üç çizgi) düğmeleri üst çubukta.
    targets: { toggle: { selector: '#navbar-center-slot [aria-label="Liste"]' } },
  },
  { id: "home-list", path: "/", viewMode: "list", targets: { toggle: { selector: '#navbar-center-slot [aria-label="Liste"]' } } },
  {
    id: "agenda",
    path: "/",
    steps: [{ click: '[aria-label="Günün Programı"]' }, { wait: 3000 }],
    targets: {
      drawer: {
        from: { text: "Günün Programı", closest: '[role="dialog"]' },
        to: { text: "Müvekkil görüşmesi — Ahmet Er", up: 1 },
        crop: 0.004,
      },
    },
  },
  {
    id: "navbar",
    path: "/dashboard/notices",
    targets: { sync: { rect: { x: 0.575, y: 0, w: 0.425, h: 0.165 }, crop: 0 } },
  },
  {
    id: "notice-new",
    scene: "processing",
    path: "/dashboard/notices",
    targets: { card: { selector: ".animate-card-in" } },
  },
  {
    id: "notice-read",
    path: "/dashboard/notices",
    targets: {
      card: { selector: ".animate-card-in", crop: 0.008 },
      created: { text: "Bu tebligattan" },
    },
  },
  {
    id: "record",
    path: "/dashboard/notices/n-318",
    steps: openRecord,
    targets: { description: { text: "Açıklama", up: 1 } },
  },
  {
    id: "calendar",
    path: "/",
    steps: openCalendarAt,
    targets: { deadline: { text: "Ankara 7. Asliye Hukuk" } },
  },
  {
    id: "bell",
    path: "/dashboard/notices",
    steps: [{ click: '[aria-label="Bildirimler"]' }, { wait: 2500 }],
    targets: {
      list: { union: [{ text: "Bildirimler" }, { text: "Kesin Süreli İşler: İstanbul" }] },
      sync: {
        union: [{ text: "Bildirimler" }, { text: "Tümünü okundu işaretle" }, { text: "6 alındı" }],
        crop: 0.012,
      },
    },
  },
  // Asistan: her sohbet ayrı kare (fixtures.cjs'teki konuşmalar)
  ...[
    ["chat", "cmg0conv0haftalikprogram01"],
    ["chat-client", "cmg0conv0kayatekstildosya2"],
    ["chat-task", "cmg0conv0gorevtakvimbagla3"],
    ["chat-check", "cmg0conv0topluatamaonay04", 2000],
  ].map(([id, conversation, scroll]) => ({
    id,
    path: "/",
    local: { "chat:activeConversationId:u-deniz:firm-demo": conversation },
    // Sohbet geçmişi baştan açılır; onay örneğinde sona inilir.
    steps: [{ click: '[data-testid="mascot-button"]' }, { wait: 3000 }, ...(scroll ? [{ wheel: scroll }, { wait: 1200 }] : [])],
    targets: { panel: { selector: '[data-testid="chat-container"]', crop: 0.004 } },
  })),
  {
    id: "reports",
    path: "/",
    steps: [{ click: '[data-testid="sidebar-reports"]' }, { wait: 3500 }],
    targets: { creators: { text: "Oluşturan bazında", up: 2 }, tasks: { text: "Görevler", up: 2 } },
  },
  {
    id: "people",
    path: "/",
    steps: [
      { click: '[aria-label="Görevler"]' },
      { wait: 3000 },
      { click: 'role=button[name="Kişi"s]' },
      { mouse: [1100, 600] },
      { wait: 1500 },
      { click: '[aria-label="Sonraki hafta"]' },
      { wait: 1200 },
      { click: '[aria-label="Sonraki hafta"]' },
      { wait: 2500 },
    ],
    targets: { board: { text: "Deniz Yıldız", up: 3 } },
  },
  {
    id: "firm",
    path: "/dashboard/firm",
    settle: 5000,
    steps: [{ wheel: 1010 }, { wait: 1500 }],
    targets: { chain: { text: "Onay Zinciri", up: 2 }, recipients: { text: "UETS Bildirim Alıcıları", up: 2 } },
  },
  // UYAP ve evrak: 2025/318 (hero'daki istinaf süresinin dosyası)
  {
    id: "cases",
    path: "/dashboard/cases",
    targets: {
      grid: { rect: { x: 0.17, y: 0.265, w: 0.815, h: 0.735 } },
    },
  },
  {
    id: "case",
    path: "/dashboard/cases/c-318?tab=case-card",
    steps: [{ wheel: 640 }, { wait: 1200 }],
    targets: {
      card: { union: [{ text: "Dosya Konusu" }, { text: "Sorumlu Avukat" }], xs: [0.172, 0.984], grow: 0.07 },
      parties: { rect: { x: 0.172, y: 0.54, w: 0.812, h: 0.435 } },
    },
  },
  {
    id: "docs",
    path: "/dashboard/cases/c-318?tab=documents",
    steps: [
      { click: 'text="Dava Dilekçesi"' },
      { wait: 900 },
      { click: '[aria-label="Tümünü göster (3)"]' },
      { wait: 1500 },
      { wheel: 420 },
      { wait: 1200 },
    ],
    targets: {
      attachments: { union: [{ text: "Dava Dilekçesi" }, { text: "Hakediş Tablosu" }], xs: [0.18, 0.985], grow: 0.02 },
      groups: { union: [{ text: "Duruşma Zaptı" }, { text: "2025/96" }], xs: [0.18, 0.985] },
    },
  },
  {
    id: "docs-date",
    path: "/dashboard/cases/c-318?tab=documents",
    steps: [{ click: '[data-testid="view-by-date"]' }, { wait: 2000 }, { wheel: 420 }, { wait: 1200 }],
    targets: { latest: { rect: { x: 0.18, y: 0.075, w: 0.805, h: 0.56 } } },
  },
  {
    id: "priority",
    cropOnly: true,
    path: "/dashboard/cases/c-318?tab=priority-documents",
    steps: [{ click: 'text="Bilirkişi Raporu"' }, { wait: 1500 }],
    targets: { head: { rect: { x: 0.17, y: 0.415, w: 0.46, h: 0.585 }, crop: 0 } },
  },
  {
    id: "search",
    cropOnly: true,
    path: "/dashboard/cases/c-318?tab=documents",
    steps: [{ type: ['[data-testid="document-search-input"]', "sözleşme"] }, { wait: 2500 }, { wheel: 330 }, { wait: 1200 }],
    targets: { results: { rect: { x: 0.17, y: 0.245, w: 0.575, h: 0.675 }, crop: 0 } },
  },
  {
    id: "preview",
    cropOnly: true,
    path: "/dashboard/cases/c-318?tab=documents",
    steps: [
      { click: 'text="Gerekçeli Karar Evrakı"' },
      { wait: 900 },
      { click: 'button:has-text("Belgeyi görüntüle"):visible' },
      { wait: 3500 },
    ],
    // Yalnızca sayfa ve araç çubuğu: üstteki "AI Özeti (yakında)" satırı karede yer almaz.
    targets: { page: { rect: { x: 0.584, y: 0.19, w: 0.414, h: 0.81 }, crop: 0 } },
  },
  {
    id: "export",
    cropOnly: true,
    path: "/dashboard/cases/c-318?tab=documents",
    steps: [{ click: 'button:has-text("Dışa Aktar"):visible' }, { wait: 3500 }],
    targets: { dialog: { selector: '[role="dialog"]', crop: 0.004 } },
  },
  // Görev kartı ve takvim kaydı kartı (ana sayfadaki derin bağlantılarla açılır)
  {
    id: "task-detail",
    path: "/?taskId=t-istinaf-dilekce",
    settle: 6000,
    targets: {
      dialog: { selector: '[role="dialog"]', crop: 0.004 },
      // Başlık, onay çubuğu (Onayla / Reddet), durum, tip, son tarih ve atananlar
      approval: { rect: { x: 0.125, y: 0.09, w: 0.375, h: 0.4 } },
    },
  },
  {
    id: "task-detail-more",
    path: "/?taskId=t-istinaf-dilekce",
    settle: 6000,
    steps: [
      { click: 'text=Onay Bekliyor' },
      { wait: 1200 },
      { wheel: 900, at: [0.3, 0.62] },
      { wait: 1500 },
    ],
    targets: {
      dialog: { selector: '[role="dialog"]', crop: 0.004 },
      // Evraklar, bağlı takvim kaydı, alt görevler ve yorumlar
      left: { rect: { x: 0.125, y: 0.15, w: 0.37, h: 0.68 } },
    },
  },
  {
    id: "event-detail",
    path: "/?eventId=ci-kaya",
    settle: 6000,
    targets: { dialog: { selector: '[role="dialog"]', crop: 0.004 } },
  },
  // Telefon ve tablet (dokunmatik). Dosya menüsü kapalı başlar ki içerik tam genişlik kullansın.
  {
    id: "m-agenda",
    path: "/",
    device: { width: 390, height: 844, scale: 3, touch: true },
    steps: [{ click: '[data-testid="sidebar-dailyAgenda"]', force: true }, { wait: 2500 }],
  },
  {
    id: "t-priority",
    path: "/dashboard/cases/c-318?tab=priority-documents",
    device: { width: 1024, height: 1366, scale: 2, touch: true },
    local: { "ui-storage": JSON.stringify({ state: { isSidebarOpen: false }, version: 0 }) },
    steps: [{ click: 'text="Bilirkişi Raporu"' }, { wait: 1500 }],
  },
  {
    id: "review",
    path: "/dashboard/notices",
    steps: [{ scrollText: "İzmir 9. İcra Dairesi - 2026/5521" }, { wait: 1500 }],
    targets: { card: { text: "İzmir 9. İcra Dairesi - 2026/5521", closest: ".animate-card-in" } },
  },
];

// Tarayıcı tarafı: tema ve duvar kâğıdı, bağlı eklenti taklidi.
function prepare({ dark, wallpaper, local, viewMode }) {
  for (const [key, value] of Object.entries(local || {})) localStorage.setItem(key, value);
  localStorage.setItem(
    "theme-storage",
    JSON.stringify({
      state: {
        themeMode: dark ? "dark" : "light",
        viewMode: viewMode || "bubbles",
        animationsEnabled: false,
        lightBackgroundId: wallpaper.light,
        darkBackgroundId: wallpaper.dark,
      },
      version: 0,
    }),
  );

  const now = Date.now();
  const uyapState = {
    phase: "idle",
    startedAt: now - 36e5,
    updatedAt: now - 38 * 6e4,
    progress: null,
    results: null,
    error: null,
    warningSummary: null,
    uyapSessionActive: true,
    extensionVersion: "1.0.6",
    activeOperation: null,
  };
  const replies = {
    CHECK_UETS_STATUS: {
      success: true,
      data: {
        connected: true,
        authOk: true,
        expired: false,
        expiringSoon: false,
        user: { name: "Deniz", lastname: "Yıldız", email: "deniz@yildizhukuk.av.tr" },
        stats: { total: 312, unread: 3 },
        extensionVersion: "1.0.6",
        hasExtensionToken: true,
        capabilities: ["perNotice", "progress", "uploadProgress"],
      },
    },
    GET_UYAP_SYNC_STATE: { success: true, data: uyapState, state: uyapState, ...uyapState },
  };
  const event = { addListener() {}, removeListener() {} };
  window.chrome = window.chrome || {};
  window.chrome.runtime = {
    lastError: undefined,
    sendMessage(...args) {
      const cb = args.find((a) => typeof a === "function");
      const msg = args.find((a) => a && typeof a === "object");
      const res = replies[msg && msg.type] || { success: true, data: {} };
      if (cb) setTimeout(() => cb(res), 5);
      return Promise.resolve(res);
    },
    connect: () => ({ postMessage() {}, disconnect() {}, onMessage: event, onDisconnect: event }),
  };

  // Next.js geliştirme göstergesi karede görünmesin.
  const style = document.createElement("style");
  style.textContent = "nextjs-portal{display:none!important}";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
}

// Tarayıcı tarafı: oturum anahtarlarını (yalnızca bu çekim için üretilmiş, sunucuyla ilgisi olmayan)
// app'in IndexedDB deposuna yazar. Böylece "güvenlik oturumu" kilidi açılmaz ve evrak işlemleri
// anahtar beklemez.
async function seedKeys() {
  const usages = ["encrypt", "decrypt", "wrapKey", "unwrapKey"];
  const firmKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, usages);
  const { privateKey } = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    false,
    usages,
  );
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("armaganai-crypto");
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("session-keys")) req.result.createObjectStore("session-keys");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction("session-keys", "readwrite");
    const store = tx.objectStore("session-keys");
    const now = Date.now();
    store.put(privateKey, "privateKey");
    store.put(firmKey, "firmKey");
    store.put(1, "firmKeyVersion");
    store.put(now, "sessionStartedAt");
    store.put(now, "lastActivityAt");
    store.put(crypto.randomUUID(), "lastWriteToken");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Tarayıcı tarafı: hedeflerin kutuları, görüntü alanına oran olarak.
function measure(targets) {
  const leaf = (text) =>
    [...document.querySelectorAll("body *")].find(
      (e) =>
        e.childElementCount === 0 &&
        (e.textContent || "").trim().startsWith(text) &&
        e.getBoundingClientRect().width > 0,
    );
  // xs: [sol, sağ] yatay sınırları görüntü alanı oranıyla sabitler; grow: üst/alta pay (yükseklik oranı).
  const box = (t) => {
    const b = rawBox(t);
    if (!b) return b;
    if (t.xs) Object.assign(b, { left: t.xs[0] * innerWidth, right: t.xs[1] * innerWidth });
    if (t.grow) Object.assign(b, { top: b.top - t.grow * innerHeight, bottom: b.bottom + t.grow * innerHeight });
    return b;
  };
  const rawBox = (t) => {
    if (t.rect) {
      const { x, y, w, h } = t.rect;
      return { left: x * innerWidth, top: y * innerHeight, right: (x + w) * innerWidth, bottom: (y + h) * innerHeight };
    }
    if (t.from) {
      const a = box(t.from), b = box(t.to);
      return a && b ? { ...a, bottom: b.bottom + 14 } : a;
    }
    if (t.union) {
      const boxes = t.union.map(box).filter(Boolean);
      if (!boxes.length) return null;
      return {
        left: Math.min(...boxes.map((b) => b.left)),
        top: Math.min(...boxes.map((b) => b.top)),
        right: Math.max(...boxes.map((b) => b.right)),
        bottom: Math.max(...boxes.map((b) => b.bottom)),
      };
    }
    let el = t.selector ? document.querySelector(t.selector) : t.text ? leaf(t.text) : null;
    for (let i = 0; i < (t.up || 0) && el; i++) el = el.parentElement;
    if (el && t.closest) el = el.closest(t.closest);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  };
  const round = (n) => Math.round(n * 1e4) / 1e4;
  return Object.fromEntries(
    Object.entries(targets).map(([name, t]) => {
      const b = box(t);
      return [
        name,
        b && {
          x: round(b.left / innerWidth),
          y: round(b.top / innerHeight),
          w: round((b.right - b.left) / innerWidth),
          h: round((b.bottom - b.top) / innerHeight),
        },
      ];
    }),
  );
}

async function shoot(browser, frame, dark) {
  const demo = createDemo({ scene: frame.scene || "done" });
  // Telefon ve tablet kareleri: frame.device = { width, height, scale?, touch? }
  const device = frame.device;
  const context = await browser.newContext({
    viewport: device ? { width: device.width, height: device.height } : VIEWPORT,
    deviceScaleFactor: device?.scale ?? 2,
    ...(device?.touch ? { isMobile: true, hasTouch: true } : {}),
    colorScheme: dark ? "dark" : "light",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    reducedMotion: "reduce",
  });
  const { hostname } = new URL(APP);
  await context.addCookies([
    ...["accessToken", "refreshToken"].map((name) => ({ name, value: "demo", domain: hostname, path: "/" })),
    // Arayüz dili tarayıcı diline göre değişmesin
    { name: "preferred-locale", value: "tr", domain: hostname, path: "/" },
  ]);
  await context.addInitScript(prepare, { dark, wallpaper: WALLPAPER, local: frame.local, viewMode: frame.viewMode });

  const page = await context.newPage();
  await page.routeWebSocket((u) => !u.href.startsWith(APP.replace(/^http/, "ws") + "/"), (ws) => ws.close());
  await page.route("**/*", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === APP && url.pathname.startsWith("/api/")) {
      const res = demo.respond(req.method(), url);
      return route.fulfill({ status: res.status ?? 200, contentType: "application/json", body: JSON.stringify(res.body) });
    }
    // Önizlemede açılan demo evrak dosyaları (fixtures'ta üretilir).
    if (url.origin === APP && url.pathname.startsWith("/demo-files/")) {
      const file = demo.file(decodeURIComponent(url.pathname.slice("/demo-files/".length)));
      if (file) return route.fulfill({ status: 200, contentType: file.type, body: file.body });
      return route.fulfill({ status: 404, body: "" });
    }
    if (url.origin === APP) return route.continue();
    return route.abort();
  });

  // Aynı kökenden hafif bir sayfa açıp anahtarları yaz, sonra asıl sayfaya geç.
  await page.goto(APP + "/api/health", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(seedKeys);
  await page.goto(APP + frame.path, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(frame.settle ?? 4500);
  for (const step of frame.steps ?? []) {
    if (step.click) await page.locator(step.click).first().click({ timeout: 15000, force: !!step.force });
    if (step.tap) await page.locator(step.tap).first().tap({ timeout: 15000 });
    if (step.hover) await page.locator(step.hover).first().hover({ timeout: 15000 });
    if (step.type) await page.locator(step.type[0]).first().pressSequentially(step.type[1], { delay: 60 });
    if (step.mouse) await page.mouse.move(step.mouse[0], step.mouse[1]);
    if (step.wheel) {
      const vp = page.viewportSize();
      if (device?.touch) {
        await page.evaluate((dy) => {
          // Dokunmatik görünümde kaydırılan kap: sayfanın kendisi ya da ilk kaydırılabilir ana alan.
          const el = [...document.querySelectorAll("main, [data-scroll], body *")].find(
            (e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY),
          );
          (el || document.scrollingElement).scrollBy(0, dy);
        }, step.wheel);
      } else {
        // at: [x, y] görüntü alanı oranı; kaydırılacak kabın üzerinde olmalı
        const [fx, fy] = step.at ?? [0.6, 0.6];
        await page.mouse.move(vp.width * fx, vp.height * fy);
        await page.mouse.wheel(0, step.wheel);
        // Fare bir satırın üzerinde kalıp vurgu bırakmasın.
        await page.mouse.move(vp.width - 2, vp.height * 0.6);
      }
    }
    if (step.scrollText) {
      await page.evaluate((text) => {
        const el = [...document.querySelectorAll("body *")].find(
          (e) => e.childElementCount === 0 && (e.textContent || "").trim().startsWith(text),
        );
        el?.scrollIntoView({ block: "center" });
      }, step.scrollText);
    }
    if (step.wait) await page.waitForTimeout(step.wait);
  }

  const targets = await page.evaluate(measure, frame.targets ?? {});
  const png = await page.screenshot({ type: "png" });
  await context.close();

  const dir = path.join(OUT_DIR, dark ? "dark" : "light");
  fs.mkdirSync(dir, { recursive: true });
  // cropOnly: landing'de yalnız kırpımı kullanılan karelerin tam hâli kaydedilmez.
  if (!frame.cropOnly) await sharp(png).webp({ quality: 86, effort: 5 }).toFile(path.join(dir, `${frame.id}.webp`));

  // Kırpılmış hedefler (küçük kartlarda tam kareyi indirmemek için).
  const { width, height } = await sharp(png).metadata();
  for (const [name, t] of Object.entries(frame.targets ?? {})) {
    const r = targets[name];
    if (t.crop === undefined || !r) continue;
    const pad = t.crop;
    const x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad * 1.6);
    const right = Math.min(1, r.x + r.w + pad), bottom = Math.min(1, r.y + r.h + pad * 1.6);
    await sharp(png)
      .extract({ left: Math.round(x * width), top: Math.round(y * height), width: Math.round((right - x) * width), height: Math.round((bottom - y) * height) })
      .webp({ quality: 88, effort: 5 })
      .toFile(path.join(dir, `${frame.id}--${name}.webp`));
  }
  return targets;
}

(async () => {
  const only = process.argv.slice(2);
  const frames = only.length ? FRAMES.filter((f) => only.includes(f.id)) : FRAMES;
  const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { frames: {} };
  const { facts } = createDemo();
  const manifest = {
    capturedAt: new Date().toISOString(),
    viewport: VIEWPORT,
    facts: { served: facts.served.toISOString(), deadline: facts.istinafDue.toISOString() },
    frames: only.length ? previous.frames : {},
  };

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  // App'in geliştirme sunucusu bir sayfayı ilk kez derlerken gecikebilir: kareyi bir kez daha dene.
  const attempt = async (frame, dark) => {
    try {
      return await shoot(browser, frame, dark);
    } catch (err) {
      console.warn(`… ${frame.id} (${dark ? "koyu" : "açık"}) yeniden deneniyor: ${err.message.split("\n")[0]}`);
      return shoot(browser, frame, dark);
    }
  };
  for (const frame of frames) {
    const targets = await attempt(frame, false);
    await attempt(frame, true);
    for (const [name, rect] of Object.entries(targets)) {
      if (!rect) console.warn(`! ${frame.id}.${name}: hedef bulunamadı`);
    }
    manifest.frames[frame.id] = { targets, ...(frame.device ? { device: frame.device } : {}) };
    console.log(`✓ ${frame.id}`);
  }
  await browser.close();

  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Kareler: ${path.relative(ROOT, OUT_DIR)} · Manifest: ${path.relative(ROOT, MANIFEST)}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
