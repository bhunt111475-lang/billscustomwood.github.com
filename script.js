document.addEventListener("DOMContentLoaded", () => {
  const modal = document.querySelector("[data-modal]");
  const dialog = modal?.querySelector(".quote-modal__dialog");
  const openButtons = Array.from(document.querySelectorAll("[data-modal-open]"));
  const closeButtons = Array.from(document.querySelectorAll("[data-modal-close]"));
  const mailFallbackForms = Array.from(document.querySelectorAll("[data-mail-fallback]"));
  const galleryScroller = document.querySelector(".archive-gallery .horizontal-scroll-wrapper");
  const galleryItems = galleryScroller
    ? Array.from(galleryScroller.querySelectorAll(".img-wrapper"))
    : [];
  const scrollTransitions = Array.from(document.querySelectorAll("[data-scroll-transition]"));
  const craftStacks = Array.from(document.querySelectorAll("[data-craft-stack]"));
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hoverQuery = window.matchMedia("(hover: hover)");
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  let lastFocusedElement = null;
  let galleryTicking = false;
  let transitionTicking = false;

  function getFocusableElements() {
    return Array.from(modal.querySelectorAll(focusableSelector)).filter((element) => {
      return element.offsetParent !== null || element === document.activeElement;
    });
  }

  function openModal() {
    if (!modal || !dialog) return;

    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    dialog.focus();
  }

  function closeModal() {
    if (!modal) return;

    modal.hidden = true;
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function keepFocusInside(event) {
    if (event.key !== "Tab" || modal.hidden) return;

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) return;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function updateActiveGalleryItem() {
    if (!galleryScroller || !galleryItems.length) return;

    const scrollerRect = galleryScroller.getBoundingClientRect();
    const scrollerCenter = scrollerRect.left + scrollerRect.width / 2;
    let activeItem = galleryItems[0];
    let shortestDistance = Number.POSITIVE_INFINITY;

    galleryItems.forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(scrollerCenter - itemCenter);

      if (distance < shortestDistance) {
        shortestDistance = distance;
        activeItem = item;
      }
    });

    galleryItems.forEach((item) => {
      item.classList.toggle("is-active", item === activeItem);
    });

    galleryTicking = false;
  }

  function requestGalleryUpdate() {
    if (!galleryTicking) {
      window.requestAnimationFrame(updateActiveGalleryItem);
      galleryTicking = true;
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function smoothstep(edgeStart, edgeEnd, value) {
    const x = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
    return x * x * (3 - 2 * x);
  }

  function updateScrollTransitions() {
    const viewportHeight = window.innerHeight || 1;

    scrollTransitions.forEach((transition) => {
      const rect = transition.getBoundingClientRect();
      const scrollableDistance = Math.max(rect.height - viewportHeight, 1);
      const progress = clamp(-rect.top / scrollableDistance, 0, 1);
      const heroTextOpacity = 1 - smoothstep(0.04, 0.62, progress);
      const heroTextY = progress * -72;
      const heroLayerOpacity = 1 - smoothstep(0.18, 0.82, progress);
      const nextContentOpacity = smoothstep(0.2, 0.82, progress);
      const nextContentY = (1 - nextContentOpacity) * 18;
      const sharedBackgroundY = progress * -18;

      transition.style.setProperty("--progress", progress.toFixed(4));
      transition.classList.toggle("is-next-active", progress > 0.55);
      document.documentElement.style.setProperty("--hero-text-opacity", heroTextOpacity.toFixed(4));
      document.documentElement.style.setProperty("--hero-text-y", `${heroTextY.toFixed(2)}px`);
      document.documentElement.style.setProperty("--hero-layer-opacity", heroLayerOpacity.toFixed(4));
      document.documentElement.style.setProperty("--shared-bg-y", `${sharedBackgroundY.toFixed(2)}px`);
      document.documentElement.style.setProperty("--next-content-opacity", nextContentOpacity.toFixed(4));
      document.documentElement.style.setProperty("--next-content-y", `${nextContentY.toFixed(2)}px`);
    });

    transitionTicking = false;
  }

  function requestTransitionUpdate() {
    if (!transitionTicking) {
      window.requestAnimationFrame(updateScrollTransitions);
      transitionTicking = true;
    }
  }

  function initCraftStack(stack) {
    const slides = Array.from(stack.querySelectorAll(".craft-stack-slide"));
    const intervalDuration = 5000;
    let activeIndex = Math.max(slides.findIndex((slide) => slide.classList.contains("is-active")), 0);
    let timerId = null;
    let paused = false;

    if (stack.dataset.stackReady === "true" || slides.length < 2) return;
    stack.dataset.stackReady = "true";

    function showSlide(index) {
      activeIndex = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });
    }

    function clearTimer() {
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    }

    function scheduleNextSlide() {
      clearTimer();

      if (paused || reducedMotionQuery.matches) return;

      timerId = window.setTimeout(() => {
        showSlide(activeIndex + 1);
        scheduleNextSlide();
      }, intervalDuration);
    }

    function pause() {
      paused = true;
      clearTimer();
    }

    function resume() {
      paused = false;
      scheduleNextSlide();
    }

    showSlide(activeIndex);

    if (!reducedMotionQuery.matches) {
      scheduleNextSlide();
    }

    stack.addEventListener("mouseenter", () => {
      if (hoverQuery.matches) pause();
    });

    stack.addEventListener("mouseleave", () => {
      if (hoverQuery.matches) resume();
    });

    stack.addEventListener("focusin", pause);
    stack.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!stack.contains(document.activeElement)) {
          resume();
        }
      }, 0);
    });

    reducedMotionQuery.addEventListener("change", () => {
      showSlide(0);
      scheduleNextSlide();
    });
  }

  function initMailFallback(form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const name = formData.get("name") || "";
      const email = formData.get("email") || "";
      const phone = formData.get("phone") || "";
      const projectType = formData.get("project_type") || "";
      const details = formData.get("project_details") || "";
      const subject = "Quote request for Bill's Custom Wood";
      const body = [
        "New quote request",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Project type: ${projectType}`,
        "",
        "Project details:",
        details
      ].join("\n");

      window.location.href = `${form.action}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", openModal);
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  craftStacks.forEach(initCraftStack);
  mailFallbackForms.forEach(initMailFallback);

  galleryScroller?.addEventListener("scroll", requestGalleryUpdate, { passive: true });
  window.addEventListener("scroll", requestTransitionUpdate, { passive: true });
  window.addEventListener("resize", () => {
    requestGalleryUpdate();
    requestTransitionUpdate();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }

    keepFocusInside(event);
  });

  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        const fallbackSources = (image.dataset.fallbackSrcs || "")
          .split(",")
          .map((source) => source.trim())
          .filter(Boolean);
        const fallbackIndex = Number(image.dataset.fallbackIndex || 0);

        if (fallbackSources[fallbackIndex]) {
          image.dataset.fallbackIndex = String(fallbackIndex + 1);
          image.src = fallbackSources[fallbackIndex];
          return;
        }

        console.warn("Image failed to load:", image.getAttribute("src"));
        image.style.opacity = "0";
      },
      false
    );
  });

  updateActiveGalleryItem();
  updateScrollTransitions();
});
