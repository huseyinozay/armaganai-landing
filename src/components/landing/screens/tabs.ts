// Sekmeli sahne: [data-tab] düğmeleri sahnenin görünümlerini seçer. Görünürken kendiliğinden
// ilerler; kullanıcı bir sekmeye dokununca otomatik ilerleme durur.

import { createStage } from "./stage";

export function runStageTabs(root: HTMLElement, interval = 5200) {
  const stage = createStage(root.querySelector<HTMLElement>("[data-stage]")!);
  const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-tab]")];
  const panels = [...root.querySelectorAll<HTMLElement>("[data-tab-panel]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let timer = 0;
  let auto = !reduced;
  let visible = false;

  function select(i: number) {
    current = i;
    tabs.forEach((tab, k) => {
      tab.setAttribute("aria-selected", String(k === i));
      tab.tabIndex = k === i ? 0 : -1;
    });
    panels.forEach((panel, k) => (panel.hidden = k !== i));
    stage.go(i);
    schedule();
  }

  // Sekmedeki ilerleme çizgisi için: süre ve otomatik ilerlemenin sürüp sürmediği.
  root.style.setProperty("--tab-interval", `${interval}ms`);

  function schedule() {
    window.clearTimeout(timer);
    const playing = auto && visible && !document.hidden;
    root.dataset.playing = String(playing);
    if (playing) {
      timer = window.setTimeout(() => select((current + 1) % tabs.length), interval);
    }
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      auto = false;
      select(i);
    });
    tab.addEventListener("keydown", (e) => {
      const step = ["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      auto = false;
      const next = (i + step + tabs.length) % tabs.length;
      tabs[next].focus();
      select(next);
    });
  });

  new IntersectionObserver(
    ([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) {
        stage.go(current);
        schedule();
      } else if (!visible) {
        schedule();
      }
    },
    { threshold: 0.35 },
  ).observe(root);
  document.addEventListener("visibilitychange", schedule);
}
