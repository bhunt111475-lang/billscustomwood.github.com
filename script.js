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
  let galleryEdgeVelocity = 0;
  let galleryTargetVelocity = 0;
  let galleryEdgeFrame = null;
  let galleryLastFrameTime = 0;
  let galleryTouchStartX = 0;
  let galleryTouchStartY = 0;
  let galleryTouchStartScroll = 0;
  let galleryTouchDragging = false;
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

  function isRotatedGallery() {
    if (!galleryScroller) return false;

    return window.getComputedStyle(galleryScroller).transform !== "none";
  }

  function getGalleryScrollPosition() {
    return isRotatedGallery() ? galleryScroller.scrollTop : galleryScroller.scrollLeft;
  }

  function setGalleryScrollPosition(value) {
    if (isRotatedGallery()) {
      galleryScroller.scrollTop = value;
    } else {
      galleryScroller.scrollLeft = value;
    }
  }

  function stopGalleryEdgeScroll(immediate = false) {
    galleryTargetVelocity = 0;

    if (immediate) {
      galleryEdgeVelocity = 0;
      galleryLastFrameTime = 0;
    }

    if (immediate && galleryEdgeFrame) {
      window.cancelAnimationFrame(galleryEdgeFrame);
      galleryEdgeFrame = null;
    }
  }

  function updateGalleryEdgeScroll(timestamp) {
    if (!galleryScroller) {
      stopGalleryEdgeScroll(true);
      return;
    }

    const elapsed = galleryLastFrameTime ? Math.min(timestamp - galleryLastFrameTime, 32) : 16;
    const easing = reducedMotionQuery.matches ? 0.5 : 0.14;

    galleryEdgeVelocity += (galleryTargetVelocity - galleryEdgeVelocity) * easing;

    if (Math.abs(galleryEdgeVelocity) < 0.01 && Math.abs(galleryTargetVelocity) < 0.01) {
      stopGalleryEdgeScroll(true);
      return;
    }

    const nextPosition = getGalleryScrollPosition() + galleryEdgeVelocity * elapsed;

    setGalleryScrollPosition(nextPosition);
    requestGalleryUpdate();
    galleryLastFrameTime = timestamp;
    galleryEdgeFrame = window.requestAnimationFrame(updateGalleryEdgeScroll);
  }

  function setGalleryEdgeScroll(edgeVelocity) {
    if (!galleryScroller) return;

    galleryTargetVelocity = edgeVelocity;

    if (!galleryEdgeFrame) {
      galleryLastFrameTime = 0;
      galleryEdgeFrame = window.requestAnimationFrame(updateGalleryEdgeScroll);
    }
  }

  function handleGalleryPointerMove(event) {
    if (!galleryScroller || !hoverQuery.matches || event.pointerType === "touch") return;

    const gallery = galleryScroller.closest(".archive-gallery");
    const rect = gallery?.getBoundingClientRect();
    if (!rect) return;

    const edgeSize = Math.min(180, rect.width * 0.22);
    const maxSpeed = reducedMotionQuery.matches ? 0.52 : 1.08;
    const leftDistance = event.clientX - rect.left;
    const rightDistance = rect.right - event.clientX;

    if (leftDistance >= 0 && leftDistance < edgeSize) {
      const edgeIntensity = 1 - leftDistance / edgeSize;
      setGalleryEdgeScroll(-maxSpeed * edgeIntensity * edgeIntensity);
      return;
    }

    if (rightDistance >= 0 && rightDistance < edgeSize) {
      const edgeIntensity = 1 - rightDistance / edgeSize;
      setGalleryEdgeScroll(maxSpeed * edgeIntensity * edgeIntensity);
      return;
    }

    stopGalleryEdgeScroll();
  }

  function handleGalleryWheel(event) {
    if (!galleryScroller || !hoverQuery.matches || !isRotatedGallery()) return;

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
      event.preventDefault();
      setGalleryScrollPosition(getGalleryScrollPosition() + event.deltaX + event.deltaY);
      requestGalleryUpdate();
      return;
    }

    event.preventDefault();
    window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
  }

  function handleGalleryTouchStart(event) {
    if (!galleryScroller || event.touches.length !== 1 || isRotatedGallery()) return;

    const touch = event.touches[0];
    galleryTouchStartX = touch.clientX;
    galleryTouchStartY = touch.clientY;
    galleryTouchStartScroll = galleryScroller.scrollLeft;
    galleryTouchDragging = false;
    stopGalleryEdgeScroll(true);
  }

  function handleGalleryTouchMove(event) {
    if (!galleryScroller || event.touches.length !== 1 || isRotatedGallery()) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - galleryTouchStartX;
    const deltaY = touch.clientY - galleryTouchStartY;

    if (!galleryTouchDragging && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
      galleryTouchDragging = true;
    }

    if (!galleryTouchDragging) return;

    event.preventDefault();
    galleryScroller.scrollLeft = galleryTouchStartScroll - deltaX;
    requestGalleryUpdate();
  }

  function handleGalleryTouchEnd() {
    galleryTouchDragging = false;
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
  galleryScroller?.closest(".archive-gallery")?.addEventListener("pointermove", handleGalleryPointerMove);
  galleryScroller?.closest(".archive-gallery")?.addEventListener("pointerleave", stopGalleryEdgeScroll);
  galleryScroller?.addEventListener("wheel", handleGalleryWheel, { passive: false });
  galleryScroller?.addEventListener("touchstart", handleGalleryTouchStart, { passive: true });
  galleryScroller?.addEventListener("touchmove", handleGalleryTouchMove, { passive: false });
  galleryScroller?.addEventListener("touchend", handleGalleryTouchEnd, { passive: true });
  galleryScroller?.addEventListener("touchcancel", handleGalleryTouchEnd, { passive: true });
  window.addEventListener("scroll", requestTransitionUpdate, { passive: true });
  window.addEventListener("resize", () => {
    stopGalleryEdgeScroll(true);
    requestGalleryUpdate();
    requestTransitionUpdate();
  });

  reducedMotionQuery.addEventListener("change", () => stopGalleryEdgeScroll(true));

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
