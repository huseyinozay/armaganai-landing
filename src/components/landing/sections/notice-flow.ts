// "Yapay zekâ okur, kanun hesaplar": kaydırdıkça ortadaki adım etkinleşir,
// yanındaki sahne o adımın gerçek ekranına geçer.

import { createStage } from "../screens/stage";

export function runNoticeFlow(root: HTMLElement) {
  const stage = createStage(root.querySelector<HTMLElement>("[data-stage]")!);
  const steps = [...root.querySelectorAll<HTMLElement>("[data-flow-step]")];
  let active = -1;

  const activate = (i: number) => {
    if (i === active) return;
    active = i;
    steps.forEach((step, k) => step.classList.toggle("is-active", k === i));
    stage.go(i);
  };

  // Ekranın ortasındaki ince şeridi geçen adım etkin olur.
  const band = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activate(Number((entry.target as HTMLElement).dataset.flowStep));
      }
    },
    { rootMargin: "-46% 0px -52% 0px" },
  );
  steps.forEach((step) => band.observe(step));

  // Akan belge türleri şeridi yalnız ekrandayken aksın.
  const types = root.querySelector<HTMLElement>(".types");
  if (types) {
    new IntersectionObserver(([entry]) => types.classList.toggle("is-off", !entry.isIntersecting)).observe(types);
  }

  // Bölüme yaklaşırken ilk kareleri hazırla.
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting) return;
      stage.preload(0);
      stage.preload(1);
      observer.disconnect();
    },
    { rootMargin: "800px 0px" },
  ).observe(root);
}
