// Eşlik eden Armağan'ın davranışı: görünürlük, bölüme göre renk, konuşma balonu,
// sahnedeki odağa bakma ve kaydırma hızına göre jöle gibi esneme.

import { getMascot, type Mascot } from "../mascot/engine";

export function runCompanion(root: HTMLElement) {
  const say = root.querySelector<HTMLElement>("[data-say]")!;
  const body = root.querySelector<HTMLElement>("[data-companion-body]")!;
  const members = [...root.querySelectorAll<HTMLElement>("[data-armagan]")]
    .map((el) => getMascot(el))
    .filter((m): m is Mascot => Boolean(m));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let active: Mascot | undefined;
  let lastSaid = "";
  let sayTimer = 0;
  let stageFocus: Element | null = null;

  function become(color: string) {
    const next = members.find((m) => m.color === color);
    if (!next || next === active) return;
    active?.el.classList.remove("is-active");
    active?.lookAt(null);
    active = next;
    next.el.classList.add("is-active");
    next.hop();
    next.lookAt(stageFocus);
  }

  function speak(text: string) {
    if (!text || text === lastSaid) return;
    lastSaid = text;
    say.textContent = text;
    say.classList.add("is-on");
    window.clearTimeout(sayTimer);
    sayTimer = window.setTimeout(() => say.classList.remove("is-on"), 4200);
  }

  // Hero görünürken aile orada; eşlik eden Armağan hero'dan çıkınca gelir, footer'da çekilir.
  const hidden = new Set<Element>();
  const edges = document.querySelectorAll("[data-hero], footer");
  const update = () => {
    const on = hidden.size === 0;
    root.classList.toggle("is-on", on);
    if (!on) say.classList.remove("is-on");
  };
  const edgeObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) hidden.add(entry.target);
      else hidden.delete(entry.target);
    }
    update();
  });
  edges.forEach((el) => edgeObserver.observe(el));

  // Ekranın ortasından geçen bölüm/adım yönlendirir. data-companion="hide" olan bölümde
  // (örn. kendi Armağan ailesi olan güvenlik bölümü) eşlik eden Armağan çekilir.
  const zones = [...document.querySelectorAll<HTMLElement>("[data-companion], [data-companion-say]")];
  const band = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const zone = entry.target as HTMLElement;
        if (zone.dataset.companion === "hide") {
          if (entry.isIntersecting) hidden.add(zone);
          else hidden.delete(zone);
          update();
          continue;
        }
        if (!entry.isIntersecting) continue;
        const section = zone.closest<HTMLElement>("[data-companion]");
        if (section?.dataset.companion) become(section.dataset.companion);
        if (root.classList.contains("is-on")) speak(zone.dataset.companionSay ?? "");
      }
    },
    { rootMargin: "-46% 0px -52% 0px" },
  );
  zones.forEach((zone) => band.observe(zone));

  // Sahne bir yere odaklanınca oraya bak.
  document.addEventListener("stage:focus", (event) => {
    const detail = (event as CustomEvent<{ ring: Element | null }>).detail;
    const inSection = (event.target as Element).closest("[data-companion]");
    if (!inSection || !active) return;
    stageFocus = detail.ring;
    active.lookAt(stageFocus);
  });

  root.addEventListener("click", () => {
    const text = lastSaid;
    lastSaid = "";
    speak(text);
  });

  // Kaydırma hızına göre esneme: hızlı kaydırınca uzar, durunca yerine oturur.
  if (!reduced) {
    let lastY = scrollY;
    let lastT = performance.now();
    let stretch = 0;
    let target = 0;
    let raf = 0;
    const tick = () => {
      stretch += (target - stretch) * 0.2;
      target *= 0.86;
      body.style.transform =
        `translateY(${(-stretch * 36).toFixed(2)}px) ` +
        `scale(${(1 - stretch * 0.45).toFixed(3)}, ${(1 + stretch).toFixed(3)})`;
      if (Math.abs(stretch) > 0.002 || Math.abs(target) > 0.002) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        body.style.transform = "";
      }
    };
    addEventListener(
      "scroll",
      () => {
        const now = performance.now();
        const v = (scrollY - lastY) / Math.max(16, now - lastT);
        lastY = scrollY;
        lastT = now;
        target = Math.max(-0.16, Math.min(0.16, v * 0.07));
        if (!raf) raf = requestAnimationFrame(tick);
      },
      { passive: true },
    );
  }
}
