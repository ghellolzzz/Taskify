document.addEventListener("DOMContentLoaded", () => {
  const primaryCta = document.getElementById("primaryCta");
  const secondaryCta = document.getElementById("secondaryCta");
  const welcomeBack = document.getElementById("welcomeBack");

  const storedName = localStorage.getItem("username");
  const storedToken = localStorage.getItem("token");
  const storedUserId = localStorage.getItem("userId");
  const isLoggedIn = Boolean(storedToken && storedUserId);

  if (isLoggedIn) {
    primaryCta.href = "dashboard/dashboard.html";
    primaryCta.innerHTML = '<i class="bi bi-speedometer2"></i> Open Dashboard';
    secondaryCta.href = "tasks/task.html";
    secondaryCta.innerHTML = '<i class="bi bi-check2-square"></i> Go to Tasks';
    welcomeBack.textContent = storedName
      ? `Welcome back, ${storedName}.`
      : "Welcome back.";
    welcomeBack.classList.remove("hidden");
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
    item.style.transitionDelay = `${index * 70}ms`;
    observer.observe(item);
  });
});
