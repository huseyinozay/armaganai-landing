// Armağan'ların canlılık motoru (yalnızca tarayıcıda çalışır).
// Sayfadaki her [data-armagan] öğesi tek bir requestAnimationFrame döngüsünden beslenir;
// ekranda görünmeyenler ve arka plandaki sekme için döngü durur.

import { EYE_TRAVEL, PERSONALITY, type MascotColor, type Personality } from "./family";

export type LookTarget = Element | { x: number; y: number };

export interface Mascot {
  readonly el: HTMLElement;
  readonly color: MascotColor;
  hop(): void;
  blink(): void;
  wink(): void;
  /** Gözlerini kapatıp hafifçe büzülür. */
  shy(on: boolean): void;
  /** Bir öğeye ya da ekran noktasına bakar; süre verilmezse lookAt(null) çağrılana kadar. */
  lookAt(target: LookTarget | null, ms?: number): void;
  /** Satır satır okur gibi gözlerini sağa sola gezdirir. */
  scan(ms?: number): void;
}

interface State extends Mascot {
  rig: HTMLElement;
  irises: HTMLElement[];
  p: Personality;
  phase: number;
  x: number;
  y: number;
  visible: boolean;
  isShy: boolean;
  focus: { target: LookTarget | "scan"; until: number } | null;
  glance: { x: number; y: number; until: number } | null;
}

const registry = new WeakMap<Element, State>();
const mascots: State[] = [];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const pointer = { x: innerWidth / 2, y: innerHeight * 0.55, at: -Infinity };
const IDLE_AFTER = 5000;
// Sakin anlarda (fare hareketsiz, bakılacak hedef yok) yavaş salınım için 30 kare yeterli;
// ekran tazeleme hızında (60-120) çizmek GPU'yu boşuna yorar.
const CALM_FRAME_MS = 1000 / 30;

let raf = 0;
let calmTimer = 0;
let lastFrame = 0;
let observer: IntersectionObserver | undefined;

function pulse(el: HTMLElement, cls: string, ms: number) {
  if (el.classList.contains(cls)) return;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), ms);
}

function create(el: HTMLElement): State {
  const color = el.dataset.armagan as MascotColor;
  const m: State = {
    el,
    color,
    rig: el.querySelector<HTMLElement>(".armagan__rig")!,
    irises: [...el.querySelectorAll<HTMLElement>(".armagan__iris")],
    p: PERSONALITY[color] ?? PERSONALITY.green,
    phase: Math.random() * Math.PI * 2,
    x: 0,
    y: 0,
    visible: false,
    isShy: false,
    focus: null,
    glance: null,
    hop() {
      if (!reducedMotion.matches && !m.isShy) pulse(el, "is-hop", 660);
    },
    blink() {
      pulse(el, "is-blink", 135);
    },
    wink() {
      pulse(el, "is-wink", 260);
    },
    shy(on) {
      m.isShy = on;
      el.classList.toggle("is-shy", on);
      if (!on) m.rig.style.transform = "";
    },
    lookAt(target, ms) {
      m.focus = target ? { target, until: ms ? performance.now() + ms : Infinity } : null;
      hurry();
    },
    scan(ms = 1600) {
      m.focus = { target: "scan", until: performance.now() + ms };
      hurry();
    },
  };
  el.addEventListener("click", () => {
    m.hop();
    m.wink();
  });
  return m;
}

function scheduleIdle(m: State) {
  const [min, max] = m.p.blink;
  window.setTimeout(() => {
    if (m.visible && !m.isShy && !document.hidden) {
      if (Math.random() < m.p.wink) m.wink();
      else m.blink();
      if (!reducedMotion.matches) {
        if (Math.random() < m.p.hop) m.hop();
        if (!m.focus && Math.random() < m.p.away) {
          const angle = Math.random() * Math.PI * 2;
          m.glance = {
            x: Math.cos(angle) * 0.9,
            y: Math.sin(angle) * 0.5,
            until: performance.now() + 900 + Math.random() * 900,
          };
        }
      }
    }
    scheduleIdle(m);
  }, min + Math.random() * (max - min));
}

/** Mascot merkezinden hedefe doğru, -1…1 aralığında bakış yönü. */
function aim(rect: DOMRect, px: number, py: number, strength = 1) {
  const dx = px - (rect.left + rect.width / 2);
  const dy = py - (rect.top + rect.height * 0.45);
  const d = Math.hypot(dx, dy) || 1;
  const reach = Math.min(1, d / 340) * strength;
  return { x: (dx / d) * reach, y: (dy / d) * reach };
}

function frame(now: number) {
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
  lastFrame = now;
  const t = now / 1000;
  const active = mascots.filter((m) => m.visible);

  // Önce tüm ölçümler, sonra tüm yazımlar: layout'u tek seferde okuyoruz.
  const reads = active.map((m) => {
    if (m.focus && m.focus.until < now) m.focus = null;
    if (m.glance && m.glance.until < now) m.glance = null;
    const target = m.focus?.target;
    const focusRect = target instanceof Element ? target.getBoundingClientRect() : null;
    return { rect: m.el.getBoundingClientRect(), focusRect };
  });

  const idle = now - pointer.at > IDLE_AFTER;
  const still = reducedMotion.matches;

  active.forEach((m, i) => {
    const { rect, focusRect } = reads[i];
    const target = m.focus?.target;
    let goal: { x: number; y: number };

    if (target === "scan") {
      goal = { x: Math.sin(t * 4.2 + m.phase) * 0.85, y: 0.3 };
    } else if (focusRect) {
      goal = aim(rect, focusRect.left + focusRect.width / 2, focusRect.top + focusRect.height / 2);
    } else if (target && !(target instanceof Element)) {
      goal = aim(rect, target.x, target.y);
    } else if (m.glance) {
      goal = m.glance;
    } else if (!idle) {
      goal = aim(rect, pointer.x, pointer.y, m.p.gaze);
      goal.x += m.p.drift;
    } else {
      goal = {
        x: Math.sin(t * 0.35 + m.phase) * 0.55 + m.p.drift,
        y: Math.cos(t * 0.27 + m.phase * 1.3) * 0.3,
      };
    }

    const k = 1 - Math.pow(1 - m.p.lag, dt * 60);
    m.x += (goal.x - m.x) * k;
    m.y += (goal.y - m.y) * k;

    m.irises.forEach((iris, e) => {
      const travel = EYE_TRAVEL[e] ?? EYE_TRAVEL[0];
      iris.style.transform = `translate(${(m.x * travel.x).toFixed(2)}%, ${(m.y * travel.y).toFixed(2)}%)`;
    });

    if (!still && !m.isShy) {
      const bob = Math.sin(t * 0.8 + m.phase) * 1.5 * m.p.bob;
      m.rig.style.transform =
        `translate(${(m.x * 2).toFixed(2)}%, ${(m.y * 1.5 + bob).toFixed(2)}%) ` +
        `rotate(${(m.x * m.p.tilt).toFixed(2)}deg)`;
    }
  });

  if (!active.length || document.hidden) {
    raf = 0;
    return;
  }
  const calm = idle && active.every((m) => !m.focus && !m.glance);
  if (calm) {
    raf = -1; // döngü sürüyor, bir sonraki kare zamanlayıcıda
    calmTimer = window.setTimeout(() => {
      calmTimer = 0;
      raf = requestAnimationFrame(frame);
    }, CALM_FRAME_MS);
  } else {
    raf = requestAnimationFrame(frame);
  }
}

function wake() {
  if (!raf && !document.hidden && mascots.some((m) => m.visible)) {
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }
}

/** Sakin moddan hemen tam hıza geç (fare hareketi, yeni bakış hedefi). */
function hurry() {
  if (raf === -1 && calmTimer) {
    window.clearTimeout(calmTimer);
    calmTimer = 0;
    raf = requestAnimationFrame(frame);
  }
}

function listen() {
  const track = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.at = performance.now();
    hurry();
  };
  addEventListener("pointermove", track, { passive: true });
  addEventListener("pointerdown", track, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.at = -Infinity;
  });
  document.addEventListener("visibilitychange", wake);

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const m = registry.get(entry.target);
        if (m) m.visible = entry.isIntersecting;
      }
      wake();
    },
    { rootMargin: "80px" },
  );
}

/** Sayfadaki yeni Armağan'ları canlandırır; tekrar çağrılması güvenlidir. */
export function initMascots(root: ParentNode = document) {
  if (!observer) listen();
  root.querySelectorAll<HTMLElement>("[data-armagan]").forEach((el) => {
    if (registry.has(el)) return;
    const m = create(el);
    registry.set(el, m);
    mascots.push(m);
    observer!.observe(el);
    window.setTimeout(() => scheduleIdle(m), 600 + Math.random() * 2600);
  });
}

export function getMascot(el: Element | null | undefined): Mascot | undefined {
  if (!el) return undefined;
  if (!registry.has(el)) initMascots(el.parentElement ?? document);
  return registry.get(el);
}

export function mascotsIn(root: ParentNode): Mascot[] {
  initMascots(root);
  return [...root.querySelectorAll("[data-armagan]")]
    .map((el) => registry.get(el))
    .filter((m): m is State => Boolean(m));
}
