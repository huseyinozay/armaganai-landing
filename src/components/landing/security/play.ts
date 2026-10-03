// [data-play] görselleri döngülü animasyonlarını yalnız ekrandayken oynatır.
// Hareket azaltma tercihinde hiç başlamaz; sayfa CSS'teki durağan çizimle kalır.
// "is-live" yükleme anında eklenir (bölüm henüz ekranın altındayken), böylece
// durağan çizimden animasyonun ilk karesine geçiş görünmez.

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduced) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.classList.toggle("is-playing", entry.isIntersecting);
    },
    { rootMargin: "-12% 0px -12% 0px" },
  );
  document.querySelectorAll<HTMLElement>("[data-play]").forEach((el) => {
    el.classList.add("is-live");
    observer.observe(el);
  });
}
