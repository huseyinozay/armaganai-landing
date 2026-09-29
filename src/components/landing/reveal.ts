// [data-reveal] öğeleri görünür olunca bir kez "is-in" alır; giriş animasyonları CSS'te.
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  },
  { rootMargin: "0px 0px -15% 0px" },
);
document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
