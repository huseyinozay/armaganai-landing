// App'teki ipucu panelinin ekran görüntülerini (armaganai-app/public/tips) gerçek arayüzden,
// demo veriyle çeker. capture.cjs ile aynı taklitler: /api istekleri fixtures.cjs'ten yanıtlanır,
// backend'e hiçbir istek gitmez; görüntülerdeki her veri kurgusaldır (KVKK).
//
// Her ipucu açık ve koyu temada çekilir, anlatılan öğe sarı çerçeveyle vurgulanır, dar kırpılır:
//   <id>-light.webp / <id>-dark.webp, iki bölümlü ipucunun ikinci görüntüsü <id>-2-<tema>.webp
//
// Bir hedef (kırpım ya da çerçeve) ekranda bulunamazsa kare kaydedilmez ve betik hatayla biter:
// ekrandaki bir ad değiştiğinde yanlış kırpılmış görüntü eskisinin üstüne yazılmasın.
//
// Kullanım: node scripts/app-screens/tips.cjs            (yalnız bazıları: ... ARM-028 mention)
//           TIPS_OUT=<dizin>     çıktı dizini (varsayılan: app'in public/tips klasörü)
//           TIPS_FULL=1          kırpılmamış kareyi de kaydeder (<ad>--full.webp); TIPS_OUT ister
//           TIPS_LIGHT_ONLY=1    yalnız açık tema (yeni kare denerken)

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");
const sharp = require("sharp");
const { createDemo } = require("./fixtures.cjs");
const { prepare, seedKeys, WALLPAPER } = require("./capture.cjs");

const APP = (process.env.APP_URL || "http://localhost:3002").replace(/\/$/, "");
const OUT_DIR = process.env.TIPS_OUT || path.resolve(__dirname, "../../../armaganai-app/public/tips");
const VIEWPORT = { width: 1440, height: 900 };
const MAX_WIDTH = 960;
const FIRM = "/firms/firm-demo";

// ---------- Demo verinin ipucuna özel hâlleri ----------
const DAY = 864e5;
const iso = (d) => d.toISOString();
const dayAt = (days, h = 9, m = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const x = new Date(d.getTime() + days * DAY);
  x.setHours(h, m, 0, 0);
  return x;
};

const base = (demo, p) => demo.respond("GET", new URL(APP + "/api" + p)).body.data;
const memberOf = (demo, id) => base(demo, `${FIRM}/members`).members.find((m) => m.id === id);
const assignee = (demo, id) => {
  const m = memberOf(demo, id);
  return { id: `as-${id}`, firmMemberId: id, assignedAt: iso(dayAt(-1)), firmMember: { id, role: m.role, user: { ...m.user } } };
};
const chain = (demo, ids) =>
  ids.map((id, i) => {
    const m = memberOf(demo, id);
    return { id: `apc-${i + 1}`, level: i + 1, firmMemberId: id, firmMember: { id, role: m.role, user: { ...m.user } } };
  });
const step = (demo, id, level, status) => {
  const m = memberOf(demo, id);
  return { id: `aps-${level}`, level, status, approverFirmMemberId: id, approver: { id, user: { id: m.user.id, firstName: m.user.firstName, lastName: m.user.lastName } } };
};
const person = (demo, id) => {
  const { user } = memberOf(demo, id);
  return { id: user.id, firstName: user.firstName, lastName: user.lastName, avatar: null };
};

// Onay ipuçlarının görevi: Deniz oluşturdu, Mert'e atandı; türü büroda onay gerektiriyor.
const approvalTask = (demo, over = {}) => {
  const t = base(demo, `${FIRM}/tasks/t-istinaf-dilekce`).task;
  return {
    ...t,
    id: "t-ipucu",
    status: "IN_PROGRESS",
    approval: null,
    customApprovalChain: [],
    subTasks: [],
    attachments: [],
    calendarEvent: null,
    assignees: [assignee(demo, "m-mert")],
    ...over,
  };
};

const APPROVAL_TYPES = ["DEADLINE", "FOLLOW_UP", "EXECUTION_TRACKING", "CLIENT_EXPENSE_REFUND"];

// ---------- Kareler ----------
// viewer: ekrana bakan büro üyesi (varsayılan büro sahibi Deniz).
// routes(demo): "/firms/firm-demo/..." yolu → yanıt verisi (fixtures'ın yerine geçer).
// crop: kırpılacak hedef; rings: sarı çerçeveyle vurgulanacak hedefler.
// Hedef: { selector, nth? } | { text, within?, up?, closest? } | { union: [...] } | { rect: [sol, üst, sağ, alt] }
//        within: yazının aranacağı kap; pad: [yatay, dikey] px pay; xs: [sol, sağ] yatay sınırı
//        sabitler; below: alta eklenen px.
const approvalRoutes = (demo, task) => ({
  [`${FIRM}/tasks/t-ipucu`]: { task },
  [`${FIRM}/approval-chain`]: { chain: chain(demo, ["m-selin"]) },
  [`${FIRM}/approval-settings`]: { approvalRequiredTypes: APPROVAL_TYPES },
});

const CARD = { selector: '[data-testid="approval-card"]' };
// Görev kartında onay bölümü atananların altında: bölümü görüş alanının ortasına getir.
const toApprovalCard = [{ scrollTo: CARD.selector }, { wheel: 150, at: [0.3, 0.5] }, { wait: 900 }];
const assigneesAndCard = { union: [{ text: "Atananlar" }, CARD], pad: [12, 10] };

const SHOTS = [
  // ARM-028 · 1 — Görevi tamamlayacak kişi: tamamlayınca kimlerin onaylayacağı.
  {
    key: "approval-plan",
    id: "ARM-028",
    viewer: "m-mert",
    path: "/?taskId=t-ipucu",
    settle: 6500,
    steps: toApprovalCard,
    routes: (demo) => approvalRoutes(demo, approvalTask(demo)),
    crop: assigneesAndCard,
    rings: [CARD],
  },
  // ARM-028 · 2 — Sırası gelen onaycı: Onayla / Reddet.
  {
    key: "approval-turn",
    id: "ARM-028",
    part: 2,
    viewer: "m-selin",
    path: "/?taskId=t-ipucu",
    settle: 6500,
    crop: { ...CARD, pad: [12, 10] },
    // Kartta bu durumda yalnız iki düğme var: Onayla ve Reddet.
    rings: [{ union: [0, 1].map((nth) => ({ selector: `${CARD.selector} button`, nth })), gap: 4, radius: 10 }],
    routes: (demo) =>
      approvalRoutes(
        demo,
        approvalTask(demo, {
          status: "IN_REVIEW",
          approval: {
            id: "ap-ipucu",
            status: "PENDING",
            requestedById: "u-mert",
            requestedAt: iso(dayAt(-1, 16, 25)),
            requestedBy: { firstName: "Mert", lastName: "Aydın" },
            reviewedBy: null,
            steps: [step(demo, "m-selin", 1, "PENDING"), step(demo, "m-deniz", 2, "PENDING")],
          },
        }),
      ),
  },
  // ARM-029 — Görevi oluşturan: başkası tamamlarsa son onay onda.
  {
    key: "approval-creator",
    id: "ARM-029",
    viewer: "m-selin",
    path: "/?taskId=t-ipucu",
    settle: 6500,
    steps: toApprovalCard,
    routes: (demo) =>
      approvalRoutes(demo, approvalTask(demo, { createdById: "u-selin", createdBy: person(demo, "m-selin"), status: "TODO" })),
    crop: assigneesAndCard,
    rings: [{ selector: `${CARD.selector} li`, gap: 3, radius: 9 }],
  },
  // ARM-030 — Büro Yönetimi: onay gerektiren görev tipleri.
  {
    key: "approval-types",
    id: "ARM-030",
    path: "/dashboard/firm",
    settle: 6000,
    steps: [{ wheel: 1010 }, { wait: 1500 }],
    routes: (demo) => approvalRoutes(demo, approvalTask(demo)),
    crop: {
      union: [{ text: "Onay Zinciri" }, { text: "Onay gerektiren görev tipleri" }, { text: "Masraflar", closest: "button" }],
      // Kart sayfa genişliğinde; görev tiplerinin bittiği yere kadar kırpılır (1440 px görüş alanı).
      xs: [273, 834],
      pad: [18, 13],
    },
    rings: [{ union: [{ text: "Kesin Süreli İş", closest: "button" }, { text: "Masraflar", closest: "button" }], gap: 6, radius: 18 }],
  },
  // ARM-031 — Yorumda "@": etiketlenecek kişiler listesi. Liste görev kartının içinde kalsın diye
  // büro üç kişilik gösterilir (dört kişilik liste kartın alt kenarından taşıyor).
  {
    key: "mention",
    id: "ARM-031",
    path: "/?taskId=t-ipucu",
    settle: 6500,
    steps: [
      { click: 'textarea[placeholder="Yorum ekle..."]' },
      { type: ['textarea[placeholder="Yorum ekle..."]', "Taslak hazır, @"] },
      { wait: 1200 },
    ],
    routes: (demo) => ({
      ...approvalRoutes(demo, approvalTask(demo, { taskType: "OTHER" })),
      [`${FIRM}/members`]: { members: ["m-deniz", "m-selin", "m-mert"].map((id) => memberOf(demo, id)) },
    }),
    crop: {
      union: [
        { selector: 'textarea[placeholder="Yorum ekle..."]', pad: [58, 8] },
        { selector: '[role="listbox"]', up: 1 },
        // Karakter sayacı gönder düğmesinin altında, alanın sağına taşıyor.
        { text: "15/1000", pad: [10, 0] },
      ],
      pad: [0, 12],
    },
    rings: [{ selector: '[role="listbox"]', up: 1, gap: 4, radius: 10 }],
  },
  // ARM-032 — Görevler: kişi görünümü, dönem seçimi ve sütun başlığındaki durum sayıları.
  // Sabit kutular 1440×900 görüş alanına göre (sütunlar sabit genişlikte).
  {
    key: "people",
    id: "ARM-032",
    path: "/",
    steps: [
      { click: '[aria-label="Görevler"]' },
      { wait: 3000 },
      { click: 'role=button[name="Kişi"s]' },
      { mouse: [1100, 600] },
      { wait: 2500 },
    ],
    crop: { rect: [80, 76, 884, 391] },
    rings: [
      { rect: [89, 86, 379, 119], gap: 5, radius: 14 },
      { rect: [366, 203, 598, 241], gap: 3, radius: 9 },
    ],
    // Kişi görünümü seçilen dönemin ("Bu hafta") işlerini gösterir: demo görevlerin son günleri
    // bugünden hafta sonuna kadarki günlere taşınır, sütunlar dolu ve dönemle tutarlı olsun.
    routes: (demo) => ({
      [`${FIRM}/tasks`]: (url) => {
        if (url.searchParams.get("groupBy") !== "assignee") return undefined;
        const weekday = (new Date().getDay() + 6) % 7; // Pazartesi = 0
        const tasks = base(demo, `${FIRM}/tasks`).tasks.map((t, i) => ({ ...t, dueAt: iso(dayAt(i % (7 - weekday), 17)) }));
        const columns = {};
        for (const id of ["m-selin", "m-mert", "m-emre", "m-ayse", "m-deniz"]) {
          const { user } = memberOf(demo, id);
          columns[id] = {
            label: `${user.firstName} ${user.lastName}`,
            tasks: tasks.filter((t) => t.assignees.some((a) => a.firmMemberId === id)),
            undatedTasks: [],
          };
        }
        return { columns, total: tasks.length, weekStart: iso(dayAt(-weekday, 0)), weekEnd: iso(dayAt(7 - weekday, 0)) };
      },
    }),
  },
  // ARM-033 — Dünkü duruşmanın takvim kaydı: durumu kendiliğinden "Tamamlandı".
  {
    key: "hearing",
    id: "ARM-033",
    path: "/?eventId=ci-904",
    settle: 6500,
    steps: [{ scrollTo: "text=Takvim Kaydı Türü" }, { wheel: 260, at: [0.3, 0.6] }, { wait: 1000 }],
    crop: {
      union: [
        { text: "Takvim Kaydı Türü", within: '[role="dialog"]' },
        { text: "Durum", within: '[role="dialog"]', up: 1 },
        // Tarih ve saat kutuları etiketin altında.
        { text: "Başlangıç Saati", within: '[role="dialog"]', below: 42 },
      ],
      pad: [12, 10],
    },
    rings: [{ text: "Tamamlandı", within: '[role="dialog"]', closest: "button", gap: 4, radius: 10 }],
    routes: (demo) => {
      const event = base(demo, `${FIRM}/calendar-events/ci-904`).calendarEvent;
      return {
        [`${FIRM}/calendar-events/ci-904`]: {
          calendarEvent: { ...event, status: "COMPLETED", startAt: iso(dayAt(-1, 10, 30)), endAt: iso(dayAt(-1, 11, 0)) },
        },
      };
    },
  },
];

// ---------- Tarayıcı tarafı ----------
// Hedefin kutusu ve ekranda bulunamayan parçaları: { box, missing }.
function resolveBox(t) {
  const missing = [];
  // within: aramayı o kabın içine daraltır (aynı yazı arkadaki sayfada da geçiyorsa).
  const leaf = (text, within) =>
    [...((within ? document.querySelector(within) : document.body)?.querySelectorAll("*") ?? [])].find(
      (e) => e.childElementCount === 0 && (e.textContent || "").trim().startsWith(text) && e.getBoundingClientRect().width > 0,
    );
  const raw = (x) => {
    if (x.rect) return { left: x.rect[0], top: x.rect[1], right: x.rect[2], bottom: x.rect[3] };
    if (x.union) {
      const boxes = x.union.map(one).filter(Boolean);
      if (!boxes.length) return null;
      return {
        left: Math.min(...boxes.map((b) => b.left)),
        top: Math.min(...boxes.map((b) => b.top)),
        right: Math.max(...boxes.map((b) => b.right)),
        bottom: Math.max(...boxes.map((b) => b.bottom)),
      };
    }
    let el = x.selector ? document.querySelectorAll(x.selector)[x.nth || 0] : x.text ? leaf(x.text, x.within) : null;
    for (let i = 0; i < (x.up || 0) && el; i++) el = el.parentElement;
    if (el && x.closest) el = el.closest(x.closest);
    if (!el) {
      missing.push(x.selector ? `${x.selector}${x.nth ? `[${x.nth}]` : ""}` : `"${x.text}"`);
      return null;
    }
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  };
  const one = (x) => {
    const b = raw(x);
    if (!b) return null;
    const [px, py] = x.pad || [0, 0];
    const [left, right] = x.xs || [b.left, b.right];
    return { left: left - px, top: b.top - py, right: right + px, bottom: b.bottom + (x.below || 0) + py };
  };
  return { box: one(t), missing };
}

// Çerçeveleri çizer; bulunamayan hedefleri döndürür.
function drawRings({ rings, resolver }) {
  // eslint-disable-next-line no-new-func
  const resolve = new Function(`return (${resolver})`)();
  const missing = [];
  for (const ring of rings) {
    const { box: b, missing: lost } = resolve(ring);
    missing.push(...lost);
    if (!b) continue;
    const gap = ring.gap ?? 5;
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed",
      left: `${b.left - gap}px`,
      top: `${b.top - gap}px`,
      width: `${b.right - b.left + gap * 2}px`,
      height: `${b.bottom - b.top + gap * 2}px`,
      border: "2.5px solid #F0C63A",
      borderRadius: `${ring.radius ?? 12}px`,
      pointerEvents: "none",
      zIndex: 2147483647,
      boxSizing: "border-box",
    });
    document.body.appendChild(el);
  }
  return missing;
}

async function runSteps(page, steps) {
  for (const s of steps ?? []) {
    if (s.click) await page.locator(s.click).first().click({ timeout: 15000 });
    if (s.type) await page.locator(s.type[0]).first().pressSequentially(s.type[1], { delay: 60 });
    if (s.mouse) await page.mouse.move(s.mouse[0], s.mouse[1]);
    if (s.wheel) {
      // at: [x, y] görüş alanı oranı; kaydırılacak kabın üzerinde olmalı.
      const [fx, fy] = s.at ?? [0.6, 0.6];
      await page.mouse.move(VIEWPORT.width * fx, VIEWPORT.height * fy);
      await page.mouse.wheel(0, s.wheel);
      // Fare bir satırın üzerinde kalıp vurgu bırakmasın.
      await page.mouse.move(VIEWPORT.width - 2, VIEWPORT.height * 0.6);
    }
    if (s.scrollTo) await page.locator(s.scrollTo).first().scrollIntoViewIfNeeded({ timeout: 15000 });
    if (s.wait) await page.waitForTimeout(s.wait);
  }
}

async function shoot(browser, shot, dark) {
  const demo = createDemo({ scene: "done" });
  const routes = shot.routes ? shot.routes(demo) : {};
  const viewer = shot.viewer ? memberOf(demo, shot.viewer) : null;
  const respond = (method, url) => {
    const p = url.pathname.replace(/^\/api/, "");
    if (method === "GET") {
      if (viewer && p === "/auth/me") return { body: { success: true, data: { ...base(demo, "/auth/me"), ...viewer.user } } };
      if (viewer && p === "/firms/me") return { body: { success: true, data: { ...base(demo, "/firms/me"), role: viewer.role } } };
      // İşlev verilen yol sorguya bakar; `undefined` dönerse fixtures'ın yanıtı geçerlidir.
      const data = typeof routes[p] === "function" ? routes[p](url) : routes[p];
      if (data !== undefined) return { body: { success: true, data } };
    }
    return demo.respond(method, url);
  };

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: dark ? "dark" : "light",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    reducedMotion: "reduce",
  });
  const { hostname } = new URL(APP);
  await context.addCookies([
    ...["accessToken", "refreshToken"].map((name) => ({ name, value: "demo", domain: hostname, path: "/" })),
    { name: "preferred-locale", value: "tr", domain: hostname, path: "/" },
  ]);
  try {
    return await capture(context, shot, dark, respond);
  } finally {
    await context.close();
  }
}

async function capture(context, shot, dark, respond) {
  await context.addInitScript(prepare, { dark, wallpaper: WALLPAPER });
  // Girişte açılan UYAP bilgilendirme penceresi kareyi kapatmasın ("okudum" kaydı oturum deposunda).
  await context.addInitScript(() => sessionStorage.setItem("uyap-restriction-ack", "1"));

  const page = await context.newPage();
  await page.routeWebSocket((u) => !u.href.startsWith(APP.replace(/^http/, "ws") + "/"), (ws) => ws.close());
  await page.route("**/*", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === APP && url.pathname.startsWith("/api/")) {
      const res = respond(req.method(), url);
      return route.fulfill({ status: res.status ?? 200, contentType: "application/json", body: JSON.stringify(res.body) });
    }
    if (url.origin === APP) return route.continue();
    return route.abort();
  });

  await page.goto(APP + "/api/health", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(seedKeys);
  await page.goto(APP + shot.path, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(shot.settle ?? 5000);
  await runSteps(page, shot.steps);

  const name = `${shot.id}${shot.part === 2 ? "-2" : ""}-${dark ? "dark" : "light"}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (process.env.TIPS_FULL) {
    await sharp(await page.screenshot({ type: "png" }))
      .resize({ width: VIEWPORT.width })
      .webp({ quality: 80 })
      .toFile(path.join(OUT_DIR, `${name}--full.webp`));
  }

  // Eksik hedefle kare kaydedilmez: yanlış kırpım ya da vurgusuz görüntü eskisinin üstüne yazılmasın.
  const { box, missing } = await page.evaluate(resolveBox, shot.crop);
  if (shot.rings?.length) missing.push(...(await page.evaluate(drawRings, { rings: shot.rings, resolver: resolveBox.toString() })));
  if (!box || missing.length) throw new Error(`${name}: hedef bulunamadı: ${missing.join(", ")}`);
  if (box.left < 0 || box.top < 0 || box.right > VIEWPORT.width || box.bottom > VIEWPORT.height) {
    throw new Error(`${name}: kırpım görüş alanının dışına taşıyor`);
  }

  const clip = {
    x: Math.round(box.left),
    y: Math.round(box.top),
    width: Math.round(box.right - box.left),
    height: Math.round(box.bottom - box.top),
  };
  await sharp(await page.screenshot({ type: "png", clip }))
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(OUT_DIR, `${name}.webp`));
  return name;
}

async function main() {
  // Kırpılmamış kareler app'in yayımlanan klasörüne düşmesin.
  if (process.env.TIPS_FULL && !process.env.TIPS_OUT) throw new Error("TIPS_FULL için TIPS_OUT ile ayrı bir dizin verin");
  const only = process.argv.slice(2);
  const shots = only.length ? SHOTS.filter((s) => only.includes(s.id) || only.includes(s.key)) : SHOTS;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  // App'in geliştirme sunucusu bir sayfayı ilk kez derlerken gecikebilir: kareyi bir kez daha dene.
  const attempt = async (shot, dark) => {
    try {
      return await shoot(browser, shot, dark);
    } catch (err) {
      console.warn(`… ${shot.id} (${dark ? "koyu" : "açık"}) yeniden deneniyor: ${err.message.split("\n")[0]}`);
      return shoot(browser, shot, dark);
    }
  };
  for (const shot of shots) {
    if (!process.env.TIPS_LIGHT_ONLY) await attempt(shot, true);
    console.log(`✓ ${await attempt(shot, false)}`);
  }
  await browser.close();
  console.log(`Görüntüler: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
