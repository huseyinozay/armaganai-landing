// Sosyal medya videoları için gerçek ArmağanAI ekranlarını demo veriyle çeker.
//
// Landing çekimiyle (scripts/app-screens) aynı yol: app yerelde çalışır, /api istekleri
// fixtures.cjs'ten yanıtlanır, eklenti bağlıymış gibi davranılır. Farkı: demo "bugünü" sabittir
// (DEMO_NOW; hafta içi bir sabah), kareler daha yüksek çözünürlükte çekilir (yakınlaştırma için)
// ve tebligatın senkrondan önceki / senkron sırasındaki hâlleri de çekilir.
//
// Kullanım: node scripts/social-video/capture.cjs            (yalnız bazıları: ... notices-before bell)

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");
const sharp = require("sharp");
const { createDemo } = require("../app-screens/fixtures.cjs");
const { prepare, seedKeys, WALLPAPER } = require("../app-screens/capture.cjs");

const APP = (process.env.APP_URL || "http://localhost:3002").replace(/\/$/, "");
// Salı sabahı: tebliğ Pazartesi, son gün iki hafta sonraki Pazartesi.
const NOW = new Date(process.env.DEMO_NOW || "2026-10-06T09:20:00+03:00").getTime();
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 3;
const OUT = path.join(__dirname, "shots");

// fixtures.cjs "bugünü" Node saatinden alır; yalnız kurulum anında sabit tarihe çek.
function demoAt(scene) {
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [NOW]));
    }
    static now() {
      return NOW;
    }
  };
  try {
    return createDemo({ scene });
  } finally {
    global.Date = RealDate;
  }
}

// before: yeni tebligat henüz gelmemiş; processing: geldi, AI okuyor; done: işlendi.
// Görev bildirimi (nt-1) tebligat işlenince oluşur; bu senkronda 1 tebligat alındı.
function demoFor(scene) {
  const demo = demoAt(scene === "before" ? "done" : scene);
  const withoutNew = scene !== "done";
  return {
    ...demo,
    respond(method, url) {
      const res = demo.respond(method, url);
      const p = url.pathname.replace(/^\/api/, "");
      const data = res.body?.data;
      if (!data) return res;
      if (scene === "before" && /\/notices$/.test(p) && data.notices) {
        const notices = data.notices.filter((n) => n.id !== "n-318");
        return { body: { ...res.body, data: { ...data, notices, pagination: { ...data.pagination, total: notices.length } } } };
      }
      if (withoutNew && /\/notifications$/.test(p) && data.notifications) {
        const notifications = data.notifications.filter((n) => n.id !== "nt-1");
        return { body: { ...res.body, data: { ...data, notifications } } };
      }
      if (withoutNew && /\/notifications\/unread-count$/.test(p)) {
        return { body: { ...res.body, data: { count: data.count - 1 } } };
      }
      if (/\/uets-sync-status$/.test(p)) {
        return { body: { ...res.body, data: { ...data, counts: { ...data.counts, delivered: 1 } } } };
      }
      return res;
    },
  };
}

// Eklentinin ilerleme karesi: üst bardaki UETS düğmesi "çalışıyor" hâline geçer (sayaç + çizgi).
const syncFrame = (done) => ({
  source: "armaganai-extension",
  type: "UETS_SYNC_PROGRESS",
  payload: {
    phase: "downloading",
    done,
    total: 1,
    current: { subject: "Gerekçeli Karar", fileName: "gerekceli_karar.pdf", fileIndex: 1, fileCount: 1 },
    heartbeatAt: NOW,
  },
});

const openCalendarAt = [
  { click: '[aria-label="Takvim"]' },
  { wait: 3000 },
  { click: 'button:has-text("Sonraki dönem")' },
  { wait: 1200 },
  { click: 'button:has-text("Sonraki dönem")' },
  { wait: 2500 },
  { wheel: -2000 },
  { wait: 600 },
  { wheel: 520 },
  { wait: 1200 },
];

// Hedefler: { selector } | { text, closest?, up? } — kutular CSS pikseli olarak kaydedilir.
const UETS = { text: "UETS", closest: "button" };
const BELL = { selector: '[aria-label="Bildirimler"]' };
const SHOTS = [
  { id: "notices-before", scene: "before", path: "/dashboard/notices", targets: { uets: UETS, bell: BELL, firstCard: { selector: ".animate-card-in" } } },
  { id: "notices-sync0", scene: "before", path: "/dashboard/notices", post: syncFrame(0), targets: { uets: UETS } },
  { id: "notices-sync1", scene: "before", path: "/dashboard/notices", post: syncFrame(1), targets: { uets: UETS } },
  {
    id: "notices-processing",
    scene: "processing",
    path: "/dashboard/notices",
    targets: {
      card: { selector: ".animate-card-in" },
      matched: { text: "Otomatik Eşleşme" },
      badge: { text: "AI işliyor" },
      file: { text: "gerekceli_karar" },
      uets: UETS,
      bell: BELL,
    },
  },
  {
    id: "notices-done",
    scene: "done",
    path: "/dashboard/notices",
    targets: { card: { selector: ".animate-card-in" }, badge: { text: "AI analiz tamam" }, created: { text: "Bu tebligattan", up: 1 }, bell: BELL },
  },
  {
    id: "bell",
    scene: "done",
    path: "/dashboard/notices",
    steps: [{ click: '[aria-label="Bildirimler"]' }, { wait: 2500 }],
    targets: { bell: BELL, item: { text: "Tebligattan yeni görev atandı", up: 1 }, panel: { text: "Bildirimler", up: 2 } },
  },
  {
    id: "calendar",
    scene: "done",
    path: "/",
    steps: openCalendarAt,
    targets: { deadline: { text: "Ankara 7. Asliye Hukuk" } },
  },
  {
    id: "calendar-record",
    scene: "done",
    path: "/",
    steps: [...openCalendarAt, { click: 'text=/^Ankara 7\\. Asliye Hukuk/' }, { wait: 3000 }],
    targets: { dialog: { selector: '[role="dialog"]' }, description: { text: "Açıklama", up: 1 }, deadline: { text: "Ankara 7. Asliye Hukuk" } },
  },
  {
    id: "task",
    scene: "done",
    path: "/?taskId=t-318",
    settle: 6000,
    targets: {
      dialog: { selector: '[role="dialog"]' },
      due: { text: "Son Tarih", up: 1 },
      assignees: { text: "Atananlar", up: 1 },
      type: { text: "Görev Tipi", up: 1 },
      description: { text: "Açıklama", up: 1 },
    },
  },
  {
    id: "review",
    scene: "done",
    path: "/dashboard/notices",
    steps: [{ scrollText: "İzmir 9. İcra Dairesi - 2026/5521" }, { wait: 1500 }],
    targets: {
      card: { text: "İzmir 9. İcra Dairesi - 2026/5521", closest: ".animate-card-in" },
      badge: { text: "İnceleme gerekli" },
      note: { text: "Bu tebligattan takvim kaydı", up: 1 },
    },
  },
  // Gerekçeli kararın kendisi: önizleme panelindeki UDF çizimi ayrı bir sayfada, tam boy.
  {
    id: "doc",
    scene: "done",
    path: "/dashboard/cases/c-318?tab=documents",
    steps: [{ click: 'text="Gerekçeli Karar Evrakı"' }, { wait: 900 }, { click: 'button:has-text("Belgeyi görüntüle"):visible' }, { wait: 3500 }],
    srcdoc: {
      title: "GEREKÇELİ KARAR",
      plaintiff: "ZEYNEP ARSLAN",
      counsel: "Av. DENİZ YILDIZ",
      verdict: "Davanın REDDİNE",
      remedy: "istinaf yolu açık",
    },
  },
];

// Tarayıcı tarafı: saat demo "bugününden" akar. Playwright'ın clock'u kullanılmaz; o Intl'i de
// taklit ediyor ve app'in `Intl.DateTimeFormat(...)` (new'siz) çağrısını kırıyor.
function fakeNow(now) {
  const RealDate = Date;
  const t0 = performance.now();
  function DemoDate(...args) {
    if (!new.target) return new RealDate(DemoDate.now()).toString();
    return new RealDate(...(args.length ? args : [DemoDate.now()]));
  }
  Object.setPrototypeOf(DemoDate, RealDate);
  DemoDate.prototype = RealDate.prototype;
  DemoDate.now = () => now + (performance.now() - t0);
  globalThis.Date = DemoDate;
}

// Tarayıcı tarafı: hedef kutuları (CSS pikseli).
function measure(targets) {
  // Metni doğrudan taşıyan öğe (rozetlerde metnin yanında ikon da olur).
  const leaf = (text) =>
    [...document.querySelectorAll("body *")].find(
      (e) =>
        [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().startsWith(text)) &&
        e.getBoundingClientRect().width > 0,
    );
  const box = (t) => {
    let el = t.selector ? document.querySelector(t.selector) : leaf(t.text);
    for (let i = 0; i < (t.up || 0) && el; i++) el = el.parentElement;
    if (el && t.closest) el = el.closest(t.closest);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  };
  return Object.fromEntries(Object.entries(targets).map(([k, t]) => [k, box(t)]));
}

// Tarayıcı tarafı: belgede bir metni içeren en küçük öğenin satır kutusu (metnin kendisi kadar)
// ve beyaz A4 sayfasının kutusu.
function findTexts(map) {
  const rect = (r) => ({ x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
  const find = (text) => {
    const hits = [...document.querySelectorAll("body *")].filter((e) => (e.textContent || "").includes(text));
    const el = hits.find((e) => ![...e.children].some((c) => (c.textContent || "").includes(text))) || hits.pop();
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    return rect(range.getBoundingClientRect());
  };
  const page = [...document.querySelectorAll("body *")]
    .filter((e) => getComputedStyle(e).backgroundColor === "rgb(255, 255, 255)" && e.getBoundingClientRect().width > 600)
    .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
  return { ...Object.fromEntries(Object.entries(map).map(([k, text]) => [k, find(text)])), page: page ? rect(page.getBoundingClientRect()) : null };
}

async function shoot(browser, shot) {
  const demo = demoFor(shot.scene);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    colorScheme: "light",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    reducedMotion: "reduce",
  });
  await context.addInitScript(fakeNow, NOW);
  const { hostname } = new URL(APP);
  await context.addCookies([
    ...["accessToken", "refreshToken"].map((name) => ({ name, value: "demo", domain: hostname, path: "/" })),
    { name: "preferred-locale", value: "tr", domain: hostname, path: "/" },
  ]);
  await context.addInitScript(prepare, { dark: false, wallpaper: WALLPAPER, local: shot.local, viewMode: shot.viewMode });

  const page = await context.newPage();
  if (process.env.DEBUG) {
    page.on("pageerror", (err) => console.warn(`  [${shot.id}] sayfa hatası: ${err.message}`));
    page.on("console", (msg) => msg.type() === "error" && console.warn(`  [${shot.id}] konsol: ${msg.text().slice(0, 300)}`));
  }
  await page.routeWebSocket((u) => !u.href.startsWith(APP.replace(/^http/, "ws") + "/"), (ws) => ws.close());
  await page.route("**/*", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === APP && url.pathname.startsWith("/api/")) {
      const res = demo.respond(req.method(), url);
      if (process.env.DEBUG && res.body?.data === null) console.warn(`  [${shot.id}] yanıtsız: ${req.method()} ${url.pathname}`);
      return route.fulfill({ status: res.status ?? 200, contentType: "application/json", body: JSON.stringify(res.body) });
    }
    if (url.origin === APP && url.pathname.startsWith("/demo-files/")) {
      const file = demo.file(decodeURIComponent(url.pathname.slice("/demo-files/".length)));
      if (file) return route.fulfill({ status: 200, contentType: file.type, body: file.body });
      return route.fulfill({ status: 404, body: "" });
    }
    if (url.origin === APP) return route.continue();
    return route.abort();
  });

  await page.goto(APP + "/api/health", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(seedKeys);
  await page.goto(APP + shot.path, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(shot.settle ?? 4500);
  for (const step of shot.steps ?? []) {
    if (step.click) await page.locator(step.click).first().click({ timeout: 15000 });
    if (step.wheel) {
      await page.mouse.move(VIEWPORT.width * 0.6, VIEWPORT.height * 0.6);
      await page.mouse.wheel(0, step.wheel);
      await page.mouse.move(VIEWPORT.width - 2, VIEWPORT.height * 0.6);
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
  if (shot.post) {
    await page.evaluate((msg) => window.postMessage(msg, location.origin), shot.post);
    await page.waitForTimeout(1200);
  }
  // Fare bir öğenin üzerinde kalıp vurgu bırakmasın.
  await page.mouse.move(VIEWPORT.width - 2, VIEWPORT.height - 2);

  let result;
  if (shot.srcdoc) {
    const html = await page.locator("iframe[srcdoc]").first().getAttribute("srcdoc");
    await context.close();
    result = await shootDocument(browser, html, shot);
  } else {
    const targets = await page.evaluate(measure, shot.targets ?? {});
    const png = await page.screenshot({ type: "png" });
    await context.close();
    await sharp(png).webp({ quality: 92, effort: 5 }).toFile(path.join(OUT, `${shot.id}.webp`));
    result = { size: VIEWPORT, targets };
  }
  return result;
}

// Önizlemedeki A4 sayfası (818 px) kendi başına, tam boy.
async function shootDocument(browser, html, shot) {
  const context = await browser.newContext({ viewport: { width: 818, height: 1100 }, deviceScaleFactor: SCALE, colorScheme: "light" });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const targets = await page.evaluate(findTexts, shot.srcdoc);
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  const png = await page.screenshot({ type: "png", fullPage: true });
  await context.close();
  await sharp(png).webp({ quality: 92, effort: 5 }).toFile(path.join(OUT, `${shot.id}.webp`));
  return { size, targets };
}

(async () => {
  const only = process.argv.slice(2);
  const shots = only.length ? SHOTS.filter((s) => only.includes(s.id)) : SHOTS;
  fs.mkdirSync(OUT, { recursive: true });
  const manifestPath = path.join(OUT, "manifest.json");
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : { shots: {} };
  const { facts } = demoAt("done");
  const manifest = {
    capturedAt: new Date().toISOString(),
    now: new Date(NOW).toISOString(),
    scale: SCALE,
    facts: { served: facts.served.toISOString(), deadline: facts.istinafDue.toISOString() },
    shots: only.length ? previous.shots : {},
  };

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const shot of shots) {
    let result;
    try {
      result = await shoot(browser, shot);
    } catch (err) {
      console.warn(`… ${shot.id} yeniden deneniyor: ${err.message.split("\n")[0]}`);
      result = await shoot(browser, shot);
    }
    for (const [name, rect] of Object.entries(result.targets)) if (!rect) console.warn(`! ${shot.id}.${name}: hedef bulunamadı`);
    manifest.shots[shot.id] = result;
    console.log(`✓ ${shot.id}`);
  }
  await browser.close();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
