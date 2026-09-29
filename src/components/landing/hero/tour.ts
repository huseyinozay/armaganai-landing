// Hero ürün turu: gerçek ekran görünümleri arasında kendiliğinden ilerler,
// adım çubuğu ve alt yazıyı günceller, Armağan'ları tepki verdirir.

import { mascotsIn } from "../mascot/engine";
import { createStage } from "../screens/stage";

interface Step {
  caption: string;
  dur: number;
  react: [string, "hop" | "wink" | "scan"];
}

export function runProductTour(root: HTMLElement) {
  const player = root.querySelector<HTMLElement>("[data-player]")!;
  const steps: Step[] = JSON.parse(player.dataset.steps || "[]");
  const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-step]")];
  const caption = root.querySelector<HTMLElement>("[data-caption]")!;
  const family = mascotsIn(root.querySelector("[data-perch]")!);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = createStage(root.querySelector<HTMLElement>("[data-stage]")!, {
    watchers: () => family,
    onSettle: (i) => {
      if (reduced) return;
      const [color, move] = steps[i].react;
      const m = family.find((x) => x.color === color);
      if (move === "scan") m?.scan(2200);
      else m?.[move]();
    },
  });

  let current = 0;
  let timer = 0;
  let visible = false;

  function mark(i: number) {
    buttons.forEach((b, k) => {
      b.classList.remove("is-on");
      b.classList.toggle("is-done", k < i);
      b.setAttribute("aria-current", k === i ? "step" : "false");
    });
    const b = buttons[i];
    b.style.setProperty("--dur", `${steps[i].dur}ms`);
    void b.offsetWidth; // ilerleme çubuğunu baştan başlat
    b.classList.add("is-on");
  }

  function say(text: string) {
    caption.classList.add("is-changing");
    window.setTimeout(() => {
      caption.textContent = text;
      caption.classList.remove("is-changing");
    }, 220);
  }

  async function go(i: number) {
    window.clearTimeout(timer);
    current = i;
    mark(i);
    say(steps[i].caption);
    await stage.go(i);
    if (current !== i) return;
    if (!reduced && visible && !document.hidden) {
      timer = window.setTimeout(() => go((i + 1) % steps.length), steps[i].dur);
    }
  }

  buttons.forEach((b, i) => b.addEventListener("click", () => go(i)));

  if (reduced) {
    player.classList.add("is-paused");
    go(0);
    return;
  }

  // Görünmüyorken ya da sekme arka plandayken tur durur, dönünce kaldığı yerden sürer.
  const resume = () => {
    if (!visible || document.hidden) {
      window.clearTimeout(timer);
      timer = 0;
      stage.halt();
      player.classList.add("is-paused");
    } else if (!timer) {
      player.classList.remove("is-paused");
      go(current);
    }
  };
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      resume();
    },
    { threshold: 0.15 },
  ).observe(player);
  document.addEventListener("visibilitychange", resume);
}
