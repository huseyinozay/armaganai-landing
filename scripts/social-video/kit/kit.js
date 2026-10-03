/* ArmağanAI sosyal medya videoları — ortak kit.
   Her karenin durumu yalnızca zamandan (t, saniye) hesaplanır: render.cjs her kare için
   window.__seek(t) çağırıp ekran görüntüsü alır. CSS geçişi ve animasyonu kullanılmaz. */
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    linear: (k) => k,
    out: (k) => 1 - Math.pow(1 - k, 3),
    outQuint: (k) => 1 - Math.pow(1 - k, 5),
    in: (k) => k * k * k,
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    outBack: (k) => {
      const c1 = 1.5;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    },
  };

  /** a'da girip b'de çıkan öğe: enter/exit ilerlemesi ve görünürlük. */
  function life(t, a, b, fin = 0.45, fout = 0.3) {
    const enter = ease.out(prog(t, a, a + fin));
    const exit = ease.in(prog(t, b - fout, b));
    return { enter, exit, v: t < a || t > b ? 0 : enter * (1 - exit) };
  }

  function el(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }

  /** Anahtar karelerden durum: her anahtar, kendi t'sinde başlayıp dur süresinde önceki durumdan
      kendi değerine geçer. Geçişler üst üste binmemeli. */
  function track(keys, mix) {
    return (time) => {
      let cur = keys[0].v;
      for (let i = 1; i < keys.length; i++) {
        const k = keys[i];
        if (time < k.t) break;
        const p = (k.ease || ease.inOut)(prog(time, k.t, k.t + (k.dur ?? 0.8)));
        cur = mix(cur, k.v, p);
      }
      return cur;
    };
  }

  // Kamera durumu: K (ölçek), l (yerel odak noktası), d (karedeki karşılığı). K logaritmik karışır.
  const mixView = (a, b, p) => ({
    K: Math.exp(lerp(Math.log(a.K), Math.log(b.K), p)),
    lx: lerp(a.lx, b.lx, p),
    ly: lerp(a.ly, b.ly, p),
    dx: lerp(a.dx, b.dx, p),
    dy: lerp(a.dy, b.dy, p),
  });

  /** Bir "dünya" katmanına kamera: yerel koordinatı kareye taşır. */
  function Camera(world, keys) {
    const view = track(keys, mixView);
    const at = (t) => {
      const v = view(t);
      return { K: v.K, Tx: v.dx - v.K * v.lx, Ty: v.dy - v.K * v.ly };
    };
    let cur = at(0);
    return {
      at,
      apply(t) {
        cur = at(t);
        world.style.transform = `translate(${cur.Tx}px, ${cur.Ty}px) scale(${cur.K})`;
        return cur;
      },
      map: (x, y, c = cur) => ({ x: c.Tx + c.K * x, y: c.Ty + c.K * y }),
      get K() {
        return cur.K;
      },
    };
  }

  /** Dizüstü bilgisayar: kapak, tarayıcı çubuğu, app ekranları (1440×900 app pikseli) ve taban.
      Konumlar dünya (kare) koordinatında; kamera bütün dünyayı taşır. */
  function Laptop(parent, { x, y, width, shots, url }) {
    const BEZEL = 18;
    const BEZEL_TOP = 24;
    const BEZEL_BOTTOM = 20;
    const BAR = 46;
    const s0 = (width - 2 * BEZEL) / 1440;
    const screenH = (900 + BAR) * s0;
    const lidH = BEZEL_TOP + screenH + BEZEL_BOTTOM;

    const root = el("div", "laptop", parent);
    root.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${lidH}px`;
    const base = el("div", "base", root);
    base.style.cssText = `left:${-40}px;top:${lidH - 2}px;width:${width + 80}px`;
    const lid = el("div", "lid", root);
    lid.style.cssText = `width:${width}px;height:${lidH}px`;
    el("i", "lid__cam", lid);
    const screen = el("div", "screen", lid);
    screen.style.cssText = `left:${BEZEL}px;top:${BEZEL_TOP}px;width:${width - 2 * BEZEL}px;height:${screenH}px`;
    const px = el("div", "screen__px", screen);
    px.style.cssText = `height:${900 + BAR}px;transform:scale(${s0})`;

    el(
      "div",
      "chrome",
      px,
      `<span class="chrome__lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></span>
       <span class="chrome__nav">${ICONS.back}${ICONS.forward}${ICONS.reload}</span>
       <span class="chrome__url">${ICONS.lock}${url}</span>
       <span class="chrome__ext">${ICONS.puzzle}<span class="chrome__logo">A</span></span>`,
    );
    const imgs = {};
    for (const [id, src] of Object.entries(shots)) {
      const img = el("img", "shot", px);
      img.src = src;
      img.style.top = `${BAR}px`;
      img.style.opacity = 0;
      imgs[id] = img;
    }

    const toLocal = (ax, ay) => ({ x: x + BEZEL + ax * s0, y: y + BEZEL_TOP + (BAR + ay) * s0 });
    return {
      root,
      s0,
      lidH,
      height: lidH + 24,
      toLocal,
      /** App dikdörtgenine (app pikseli) odaklanan kamera görünümü. */
      view(r, { cx = 540, cy = 1000, maxW = 1000, maxH = 720, maxK = 4.6, k } = {}) {
        const c = toLocal(r.x + r.w / 2, r.y + r.h / 2);
        const K = k ?? Math.min(maxW / (r.w * s0), maxH / (r.h * s0), maxK);
        return { K, lx: c.x, ly: c.y, dx: cx, dy: cy };
      },
      /** Ekranlar arası geçiş: [{t, id}] — her değişim fade süresinde çapraz geçer. */
      shots(t, timeline, fade = 0.3) {
        let i = 0;
        for (let j = 0; j < timeline.length; j++) if (t >= timeline[j].t) i = j;
        const cur = timeline[i];
        const prev = i > 0 ? timeline[i - 1] : null;
        const k = prev ? ease.inOut(prog(t, cur.t, cur.t + (cur.fade ?? fade))) : 1;
        // Yeni ekran üstte belirir, eskisi altında tam kalır (ara karede zemin görünmez).
        for (const [id, img] of Object.entries(imgs)) {
          const isCur = id === cur.id;
          const isPrev = prev && id === prev.id && k < 1;
          img.style.opacity = isCur ? k : isPrev ? 1 : 0;
          img.style.zIndex = isCur ? 2 : isPrev ? 1 : 0;
        }
      },
    };
  }

  // ---------- Maskot (landing'deki Armağan: gövde + iris + göz kapağı) ----------
  const TINT = {
    green: { lid: "#80C276", glow: "#3BE85A" },
    red: { lid: "#C27683", glow: "#F5453F" },
    purple: { lid: "#A876C2", glow: "#B558F0" },
    yellow: { lid: "#C2AB76", glow: "#F0C63A" },
  };
  const ASPECT = 1336 / 1268;
  const EYES = [
    { x: 460 / 1268, y: 490 / 1336, w: 292 / 1268, h: 248 / 1336, iw: 136 / 292 },
    { x: 930 / 1268, y: 450 / 1336, w: 250 / 1268, h: 270 / 1336, iw: 128 / 250 },
  ];
  const TRAVEL = EYES.map((e) => {
    const iris = e.w * e.iw;
    const eyeH = e.h * ASPECT;
    return { x: (((e.w - iris) / 2) * 0.84 * 100) / iris, y: (((eyeH - iris) / 2) * 0.84 * 100) / iris };
  });

  // Zıplama: landing'deki armagan-hop anahtar kareleri (0.64 sn).
  const HOP = [
    [0, 0, 1, 1],
    [0.18, 0, 1.05, 0.92],
    [0.48, -13, 0.97, 1.05],
    [0.78, 0, 1.04, 0.95],
    [1, 0, 1, 1],
  ];
  function hopAt(p) {
    if (p <= 0 || p >= 1) return { ty: 0, sx: 1, sy: 1 };
    let i = 0;
    while (p > HOP[i + 1][0]) i++;
    const [p0, y0, sx0, sy0] = HOP[i];
    const [p1, y1, sx1, sy1] = HOP[i + 1];
    const k = ease.inOut((p - p0) / (p1 - p0));
    return { ty: lerp(y0, y1, k), sx: lerp(sx0, sx1, k), sy: lerp(sy0, sy1, k) };
  }

  function Mascot(parent, { color, size, assets, flip = false, phase = 0 }) {
    const tint = TINT[color];
    const root = el("div", "mascot", parent);
    root.style.cssText = `width:${size}px;height:${size * ASPECT}px;--lid:${tint.lid};--glow:${tint.glow}`;
    el("div", "mascot__shadow", root);
    const rig = el("div", "mascot__rig", root);
    el("div", "mascot__glow", rig);
    const body = el("img", "mascot__body", rig);
    body.src = assets.body;
    if (flip) body.style.transform = "scaleX(-1)";
    const irises = [];
    const lids = [];
    for (const e of EYES) {
      const eye = el("div", "mascot__eye", rig);
      eye.style.cssText = `left:${(flip ? 1 - e.x : e.x) * 100}%;top:${e.y * 100}%;width:${e.w * 100}%;height:${e.h * 100}%`;
      const iris = el("div", "mascot__iris", eye);
      iris.style.cssText = `width:${e.iw * 100}%;aspect-ratio:1;margin-left:${(-e.iw * 100) / 2}%;margin-top:${(-e.iw * 100) / 2}%`;
      const img = el("img", "", iris);
      img.src = assets.iris;
      irises.push(iris);
      lids.push(el("div", "mascot__lid", eye));
    }
    // Kendiliğinden göz kırpma: her maskotun kendi sabit takvimi.
    const blinks = [];
    let b = 1.1 + phase * 0.7;
    while (b < 120) {
      blinks.push(b);
      b += 2.3 + ((Math.sin((b + phase) * 12.9898) * 43758.5453) % 1 + 1) % 1 * 1.8;
    }
    return {
      root,
      /** s: { x, y (sol-alt köşe değil: gövdenin sol-üst köşesi), opacity, scale, gx, gy, hop (0–1),
             wink, shut (0–1), t } */
      update(s) {
        const t = s.t;
        root.style.left = `${s.x}px`;
        root.style.top = `${s.y}px`;
        root.style.opacity = s.opacity ?? 1;
        const h = hopAt(s.hop ?? 0);
        root.style.transform = `translateY(${h.ty}%) scale(${(s.scale ?? 1) * h.sx}, ${(s.scale ?? 1) * h.sy})`;
        const gx = s.gx ?? 0;
        const gy = s.gy ?? 0;
        const bob = Math.sin(t * 0.8 + phase * 2.1) * 1.6;
        rig.style.transform = `translate(${gx * 2}%, ${gy * 1.5 + bob}%) rotate(${gx * 3.2}deg)`;
        irises.forEach((iris, i) => {
          iris.style.transform = `translate(${gx * TRAVEL[i].x}%, ${gy * TRAVEL[i].y}%)`;
        });
        let shut = s.shut ?? 0;
        for (const bt of blinks) {
          if (t >= bt && t < bt + 0.16) shut = Math.max(shut, Math.sin(((t - bt) / 0.16) * Math.PI));
        }
        lids.forEach((lid, i) => {
          const wink = s.wink && i === 1 ? s.wink : 0;
          lid.style.transform = `scaleY(${Math.max(shut, wink)})`;
        });
      },
    };
  }

  // ---------- İmleç ve tıklama halkası ----------
  const CURSOR_SVG = `<svg viewBox="0 0 28 28" width="46" height="46"><path d="M6 3.2v19.6l4.9-4.7 3 6.9 3.4-1.5-3-6.8h6.7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  function Cursor(parent) {
    const c = el("div", "cursor", parent, CURSOR_SVG);
    const ring = el("div", "ripple", parent);
    return {
      /** s: { x, y, v (görünürlük), press (0–1), ripple: { k (0–1), x, y } } */
      update(s) {
        c.style.opacity = s.v;
        c.style.left = `${s.x - 6}px`;
        c.style.top = `${s.y - 4}px`;
        c.style.transform = `scale(${1 - 0.16 * (s.press || 0)})`;
        const r = s.ripple;
        if (r && r.k > 0 && r.k < 1) {
          const d = 18 + 110 * ease.out(r.k);
          ring.style.cssText = `left:${r.x - d / 2}px;top:${r.y - d / 2}px;width:${d}px;height:${d}px;opacity:${1 - r.k};--tone:${r.tone || "#fff"}`;
        } else ring.style.opacity = 0;
      },
    };
  }

  /** İmleç yolu: [{t, x, y}] (app pikseli) arasında yumuşak yürüyüş; tıklamalar [{t}]. */
  function cursorPath(points, clicks, t) {
    let p = points[0];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (t >= b.t) {
        p = b;
        continue;
      }
      if (t > a.t) {
        const k = ease.inOut(prog(t, a.t, b.t));
        // Hafif yay: düz çizgiden biraz sapar.
        const arc = Math.sin(k * Math.PI) * 0.08;
        p = { x: lerp(a.x, b.x, k) + (b.y - a.y) * arc, y: lerp(a.y, b.y, k) - (b.x - a.x) * arc };
      }
      break;
    }
    let press = 0;
    let ripple = null;
    for (const c of clicks) {
      if (t >= c.t - 0.06 && t < c.t + 0.22) press = t < c.t ? prog(t, c.t - 0.06, c.t) : 1 - prog(t, c.t, c.t + 0.22);
      if (t >= c.t && t < c.t + 0.55) ripple = { k: prog(t, c.t, c.t + 0.55), tone: c.tone };
    }
    return { x: p.x, y: p.y, press, ripple };
  }

  /** Daktilo: metnin ilk k oranı görünür (kelime yarıda kesilmez görünümü için harf harf). */
  function typed(text, k) {
    const n = Math.round(text.length * clamp(k));
    return text.slice(0, n);
  }

  const ICONS = {
    back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
    forward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".45"><path d="M9 18l6-6-6-6"/></svg>`,
    reload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    puzzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.4 14.6a2 2 0 1 0 0-3.2V7a1 1 0 0 0-1-1h-4.4a2 2 0 1 0-3.2 0H6.4a1 1 0 0 0-1 1v4.4a2 2 0 1 1 0 3.2V19a1 1 0 0 0 1 1h4.4a2 2 0 1 1 3.2 0h4.4a1 1 0 0 0 1-1z"/></svg>`,
  };

  /** Sahneyi kaydeder; yazı tipleri ve görseller hazır olunca render.cjs'e işaret verir. */
  function run({ duration, seek }) {
    window.__duration = duration;
    window.__seek = (t) => {
      seek(t);
      return true;
    };
    const imgs = [...document.images];
    // Türkçe harfler latin-ext alt kümesinde: ikisini de açıkça yükle.
    const fonts = [
      '650 72px "Bricolage Grotesque Variable"',
      '700 150px "Bricolage Grotesque Variable"',
      '430 35px "Geist Variable"',
      '600 23px "Geist Variable"',
      '600 23px "Geist Mono Variable"',
    ];
    Promise.all([
      ...fonts.map((f) => document.fonts.load(f, "Aa ğüşıİçöÖÜĞŞÇ·→").catch(() => {})),
      document.fonts.ready,
      ...imgs.map((img) => (img.complete ? img.decode().catch(() => {}) : new Promise((r) => (img.onload = img.onerror = r)).then(() => img.decode().catch(() => {})))),
    ]).then(() => {
      seek(0);
      window.__ready = true;
    });
  }

  window.Kit = { clamp, lerp, prog, ease, life, el, track, mixView, Camera, Laptop, Mascot, Cursor, cursorPath, typed, run };
})();
