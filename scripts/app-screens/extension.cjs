// Chrome eklentisinin gerçek açılır penceresini (popup) demo durumla çeker.
// Eklentinin derlenmiş hâli (armaganai-chrome-extension/dist) küçük bir yerel sunucudan
// açılır; popup'ın kullandığı chrome.* API'leri bağlı bir büroyu taklit eder.
//
// Kullanım: npm run screens:extension   (EXTENSION_DIST ile dist klasörü değiştirilebilir)

const path = require("path");
const fs = require("fs");
const http = require("http");
const { chromium } = require("playwright-core");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "../..");
const DIST = path.resolve(
  process.env.EXTENSION_DIST || path.join(ROOT, "../armaganai-chrome-extension/dist"),
);
const OUT_DIR = path.join(ROOT, "src/assets/landing/extension");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json" };

function serve(dir) {
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Popup'ın okuduğu depolama ve arka plan yanıtları: bağlı, senkronu yeni yapılmış bir büro.
function fakeChrome() {
  const now = Date.now();
  const store = {
    local: {
      uetsSyncState: {
        lastSyncAt: now - 12 * 60e3,
        lastSyncedNotices: Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, inserttime: now - i * 36e5 })),
      },
      uyapLastSync: { timestamp: now - 38 * 60e3, caseCount: 1247, thisWeekHearingCount: 6 },
    },
    session: {
      armaganaiAuth: { userId: "u-deniz", email: "deniz@yildizhukuk.av.tr", sessionToken: "demo", linkedAt: now - 864e5 },
      uyapSyncRuntimeState: { uyapSessionActive: true },
    },
  };
  const pick = (area, keys) => {
    const src = store[area];
    if (keys == null) return { ...src };
    const list = Array.isArray(keys) ? keys : typeof keys === "string" ? [keys] : Object.keys(keys);
    return Object.fromEntries(list.filter((k) => k in src).map((k) => [k, src[k]]));
  };
  const event = { addListener() {}, removeListener() {}, hasListener: () => false };
  const area = (name) => ({ get: async (k) => pick(name, k), set: async () => {}, remove: async () => {} });
  window.chrome = {
    runtime: {
      id: "demo",
      lastError: undefined,
      onMessage: event,
      getManifest: () => ({ version: "1.0.6", name: "ArmaganAI — Avukat Asistanı" }),
      getURL: (p) => p,
      sendMessage(msg, cb) {
        const res =
          msg && msg.type === "GET_UETS_STATUS"
            ? { success: true, data: { connected: true, user: { name: "Deniz", lastname: "Yıldız", email: "deniz@yildizhukuk.av.tr" }, stats: { total: 312, unread: 3 } } }
            : { success: true };
        if (typeof cb === "function") setTimeout(() => cb(res), 5);
        return Promise.resolve(res);
      },
    },
    storage: { local: area("local"), session: area("session"), onChanged: event },
    tabs: { query: async () => [{ id: 1, url: "https://avukat.uyap.gov.tr/" }], create: async () => ({}) },
    action: { setBadgeText() {} },
  };
}

(async () => {
  const page_ = path.join(DIST, "src/popup/index.html");
  if (!fs.existsSync(page_)) throw new Error(`Eklenti derlemesi bulunamadı: ${page_}`);
  const server = await serve(DIST);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 420, height: 640 }, deviceScaleFactor: 2, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(fakeChrome);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/src/popup/index.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const shots = [["uyap", null], ["uets", "UETS"]];
  for (const [name, tab] of shots) {
    if (tab) {
      await page.getByRole("button", { name: tab, exact: true }).first().click();
      await page.waitForTimeout(900);
    }
    const root = page.locator("#root > *").first();
    const png = await root.screenshot({ type: "png" });
    await sharp(png).webp({ quality: 88, effort: 5 }).toFile(path.join(OUT_DIR, `popup-${name}.webp`));
    console.log(`✓ popup-${name}`);
  }
  if (errors.length) console.warn("Sayfa hataları:\n" + errors.join("\n"));
  await browser.close();
  server.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
