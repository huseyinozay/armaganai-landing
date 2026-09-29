// Stage.astro'nun tarayıcı tarafı: bir görünümden ötekine geçiş, kamera, vurgu ve imleç.
// Zamanlayıcıyla (hero turu) ya da kaydırmayla (tebligat akışı) sürülür.

import type { Mascot } from "../mascot/engine";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageView {
  frame: number;
  focus: Rect | null;
  zoom: number;
  scan: boolean;
  pointer: { x: number; y: number } | null;
}

export interface Stage {
  readonly views: StageView[];
  readonly current: number;
  /** Görünümü gösterir; görsel yüklenince tamamlanır. */
  go(i: number): Promise<void>;
  /** Görünümün karesini arka planda yükler. */
  preload(i: number): Promise<void>;
  /** Tüm zamanlı efektleri durdurur. */
  halt(): void;
}

interface Options {
  /** Odak noktasına bakacak Armağan'lar. */
  watchers?: () => Mascot[];
  /** Görünüm açıldığında (kamera yerleşince) çağrılır. */
  onSettle?: (i: number) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createStage(root: HTMLElement, options: Options = {}): Stage {
  const views: StageView[] = JSON.parse(root.dataset.views || "[]");
  const layers = [...root.querySelectorAll<HTMLElement>("[data-frame]")];
  const cam = root.querySelector<HTMLElement>("[data-cam]")!;
  const ring = root.querySelector<HTMLElement>("[data-ring]")!;
  const scan = root.querySelector<HTMLElement>("[data-scan]")!;
  const cursor = root.querySelector<HTMLElement>("[data-cursor]")!;
  const view = { z: 1, tx: 0, ty: 0 };
  let current = -1;
  let token = 0;
  let timers: number[] = [];

  const later = (ms: number, t: number, fn: () => void) => {
    timers.push(window.setTimeout(() => t === token && fn(), ms));
  };

  function load(frame: number) {
    const layer = layers[frame];
    if (!layer) return Promise.resolve();
    layer.querySelectorAll<HTMLElement>("[data-srcset]").forEach((el) => {
      el.setAttribute("srcset", el.dataset.srcset!);
      el.removeAttribute("data-srcset");
    });
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const img = layer.querySelector<HTMLImageElement>(`.frame__${theme} img`);
    if (!img) return Promise.resolve();
    img.loading = "eager";
    return img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {});
  }

  function place(el: HTMLElement, r: Rect, pad: number) {
    el.style.left = `${(r.x - pad) * 100}%`;
    el.style.top = `${(r.y - pad * 1.6) * 100}%`;
    el.style.width = `${(r.w + pad * 2) * 100}%`;
    el.style.height = `${(r.h + pad * 3.2) * 100}%`;
  }

  /**
   * Odak noktasını ortalar; kenarlar hiçbir zaman boşlukta kalmaz. Dar ekranda daha çok yakınlaşır,
   * ama odak alanının genişliğini aşacak kadar değil (geniş paneller kesilmesin).
   */
  function aim(v: StageView) {
    const narrow = root.clientWidth < 640;
    const fit = v.focus ? 1 / Math.max(v.focus.w, 0.05) : 1;
    const z = v.focus ? (narrow ? Math.max(v.zoom, Math.min(2.3, fit)) : v.zoom) : 1;
    const cx = v.focus ? v.focus.x + v.focus.w / 2 : 0.5;
    const cy = v.focus ? v.focus.y + v.focus.h / 2 : 0.5;
    view.z = z;
    view.tx = clamp(0.5 - cx * z, 1 - z, 0);
    view.ty = clamp(0.5 - cy * z, 1 - z, 0);
    cam.style.transform = `translate(${(view.tx * 100).toFixed(3)}%, ${(view.ty * 100).toFixed(3)}%) scale(${z})`;
  }

  function click(p: { x: number; y: number }, t: number) {
    const w = root.clientWidth;
    const h = root.clientHeight;
    cursor.style.transition = "none";
    cursor.style.transform = `translate(${w * 0.72}px, ${h * 0.96}px)`;
    void cursor.offsetWidth;
    cursor.style.transition = "";
    cursor.classList.add("is-on");
    cursor.style.transform = `translate(${(p.x * view.z + view.tx) * w}px, ${(p.y * view.z + view.ty) * h}px)`;
    later(1000, t, () => cursor.classList.add("is-click"));
    later(1700, t, () => cursor.classList.remove("is-on", "is-click"));
  }

  function halt() {
    token++;
    timers.forEach(clearTimeout);
    timers = [];
    scan.classList.remove("is-on");
    cursor.classList.remove("is-on", "is-click");
  }

  async function go(i: number) {
    const v = views[i];
    if (!v) return;
    halt();
    const t = token;
    await load(v.frame);
    if (t !== token) return;
    current = i;

    layers.forEach((layer, k) => layer.classList.toggle("is-on", k === v.frame));
    aim(v);
    ring.classList.remove("is-on");
    if (v.focus) {
      place(ring, v.focus, 0.006);
      place(scan, v.focus, 0);
    }
    options.watchers?.().forEach((m) => m.lookAt(v.focus ? ring : null));

    const still = reduced();
    later(still ? 0 : 950, t, () => {
      if (v.focus) ring.classList.add("is-on");
      if (v.scan && !still) scan.classList.add("is-on");
      options.onSettle?.(i);
      // Sayfadaki diğer Armağan'lar (örn. eşlik eden) da odağa bakabilsin.
      root.dispatchEvent(new CustomEvent("stage:focus", { bubbles: true, detail: { ring: v.focus ? ring : null } }));
    });
    if (v.pointer && !still) later(1600, t, () => click(v.pointer!, t));

    const next = views[(i + 1) % views.length];
    if (next) load(next.frame);
  }

  // Tema değişince görünen karenin yeni tema görselini yükle.
  new MutationObserver(() => {
    if (current >= 0) load(views[current].frame);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  return {
    views,
    get current() {
      return current;
    },
    go,
    preload: (i) => load(views[i]?.frame ?? -1),
    halt,
  };
}
