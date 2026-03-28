document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("copyrightYear");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear().toString();
  }

  const revealItems = document.querySelectorAll(".reveal-on-scroll");
  if (!revealItems.length) return;

  const observer = new IntersectionObserver(
    (entries, revealObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${index * 60}ms`;
    observer.observe(item);
  });
});
