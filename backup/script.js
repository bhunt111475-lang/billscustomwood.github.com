document.addEventListener("DOMContentLoaded", () => {
  const sections = Array.from(document.querySelectorAll(".parallax-section"));
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const parallaxImages = Array.from(
    document.querySelectorAll(".project-card__image img, .feature-piece__image img")
  );

  let ticking = false;

  if (!sections.length) {
    console.warn("Parallax setup warning: no .parallax-section elements found.");
  }

  sections.forEach((section) => {
    const bgLayers = section.querySelectorAll(".parallax-bg");

    if (!bgLayers.length) {
      console.warn("Parallax setup warning: section is missing a .parallax-bg layer.", section);
    }

    bgLayers.forEach((layer) => {
      if (!layer.dataset.speed) {
        console.warn("Parallax setup warning: .parallax-bg is missing data-speed.", layer);
      }
    });
  });

  function updateParallax() {
    const viewportHeight = window.innerHeight || 1;
    const viewportCenter = viewportHeight / 2;
    const reducedMotion = motionQuery.matches;
    const motionScale = reducedMotion ? 0 : 1;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const centerDistance = viewportCenter - sectionCenter;
      const titleSpeed = Number(section.querySelector(".parallax-title")?.dataset.textSpeed) || 0.26;
      const textY = centerDistance * titleSpeed * motionScale;

      section.style.setProperty("--content-y", "0px");
      section.style.setProperty("--content-opacity", "1");
      section.style.setProperty("--text-y", `${textY.toFixed(2)}px`);

      section.querySelectorAll(".parallax-bg").forEach((layer) => {
        const speed = Number(layer.dataset.speed) || 0.14;
        const y = centerDistance * speed * motionScale;

        layer.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
        layer.style.setProperty("--bg-opacity", "0.9");
      });
    });

    parallaxImages.forEach((image) => {
      const rect = image.getBoundingClientRect();
      const imageCenter = rect.top + rect.height / 2;
      const centerDistance = viewportCenter - imageCenter;
      const speed = Number(image.dataset.speed) || 0.24;
      const y = centerDistance * speed * motionScale;

      image.style.setProperty("--image-y", `${y.toFixed(2)}px`);
      image.closest(".project-card")?.querySelector(".project-card__body")?.style.setProperty("--content-y", "0px");
    });

    ticking = false;
  }

  function requestParallaxUpdate() {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    revealItems.forEach((item, index) => {
      item.style.setProperty("--gallery-delay", `${(index % 6) * 70}ms`);
      revealObserver.observe(item);
    });
  } else {
    console.warn("Reveal setup warning: IntersectionObserver is unavailable; showing content immediately.");
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        console.warn("Image failed to load; fallback background remains visible:", image.getAttribute("src"));
        image.style.opacity = "0";
      },
      { once: true }
    );
  });

  window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
  window.addEventListener("resize", requestParallaxUpdate);

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", requestParallaxUpdate);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(requestParallaxUpdate);
  }

  updateParallax();
});
