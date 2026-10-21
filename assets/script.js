/* ==========================================================================
   李硕文 · 个人主页
   纯原生脚本：主题记忆、滚动进度、进场动效、鼠标光斑、复制
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(pointer: fine)");

  /* ---------- 亮 / 暗模式（记忆选择） ---------- */
  var STORAGE_KEY = "lishuowen-theme";
  var toggle = document.getElementById("themeToggle");

  function readTheme() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (err) {
      /* 隐私模式或本地文件限制，忽略 */
    }
    return "light";
  }

  function syncToggle(theme) {
    if (!toggle) return;
    var isDark = theme === "dark";
    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      isDark ? "切换到亮色模式" : "切换到暗色模式"
    );
  }

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    syncToggle(theme);
    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch (err) {
        /* 忽略写入失败 */
      }
    }
  }

  applyTheme(readTheme(), false);

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  /* ---------- 滚动进度条 + 顶栏状态 ---------- */
  var bar = document.getElementById("progressBar");
  var ticking = false;

  function renderScroll() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
    if (bar) bar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
    body.classList.toggle("is-scrolled", doc.scrollTop > 12);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(renderScroll);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  renderScroll();

  /* ---------- 滚动进场 ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- 鼠标跟随光斑 ---------- */
  if (finePointer.matches && !reduceMotion.matches) {
    var rafId = null;
    var pointerX = 0;
    var pointerY = 0;

    window.addEventListener(
      "pointermove",
      function (event) {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (rafId !== null) return;
        rafId = window.requestAnimationFrame(function () {
          rafId = null;
          root.style.setProperty("--mx", pointerX + "px");
          root.style.setProperty("--my", pointerY + "px");
          body.classList.add("has-pointer");
        });
      },
      { passive: true }
    );

    window.addEventListener("pointerleave", function () {
      body.classList.remove("has-pointer");
    });

    /* 卡片内的局部光斑 */
    Array.prototype.forEach.call(
      document.querySelectorAll(".card"),
      function (card) {
        card.addEventListener(
          "pointermove",
          function (event) {
            var rect = card.getBoundingClientRect();
            card.style.setProperty("--cx", event.clientX - rect.left + "px");
            card.style.setProperty("--cy", event.clientY - rect.top + "px");
          },
          { passive: true }
        );
      }
    );
  }

  /* ---------- 复制微信号 / 抖音号 ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-show");
    }, 2000);
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(
          function () {
            resolve(true);
          },
          function () {
            resolve(fallbackCopy(text));
          }
        );
        return;
      }
      resolve(fallbackCopy(text));
    });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll(".copy"),
    function (button) {
      var defaultText = button.textContent;
      var timer = null;

      button.addEventListener("click", function () {
        var value = button.getAttribute("data-copy") || "";
        var label = button.getAttribute("data-label") || "";
        if (!value) return;

        copyText(value).then(function (ok) {
          if (ok) {
            button.textContent = "已复制";
            button.classList.add("is-done");
            showToast((label || "内容") + "已复制");
          } else {
            button.textContent = "请手动选择";
            showToast("复制失败，请手动选择");
          }

          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            button.textContent = defaultText;
            button.classList.remove("is-done");
          }, 1800);
        });
      });
    }
  );

  /* ---------- 减少动效设置变化时同步 ---------- */
  var handleMotionChange = function () {
    if (!reduceMotion.matches) return;
    items.forEach(function (el) {
      el.classList.add("is-in");
    });
    body.classList.remove("has-pointer");
  };

  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", handleMotionChange);
  }

  /* ---------- 顶部锚点导航高亮 ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".topbar__link")
  );
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("data-nav");
      return id ? document.getElementById(id) : null;
    })
    .filter(Boolean);

  function syncNav() {
    if (!sections.length) return;
    var anchor = window.innerHeight * 0.32;
    var activeId = "";
    sections.forEach(function (section) {
      var top = section.getBoundingClientRect().top;
      if (top - anchor <= 0) activeId = section.id;
    });
    navLinks.forEach(function (link) {
      link.classList.toggle(
        "is-active",
        activeId !== "" && link.getAttribute("data-nav") === activeId
      );
    });
  }

  var navTicking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (navTicking) return;
      navTicking = true;
      window.requestAnimationFrame(function () {
        navTicking = false;
        syncNav();
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", syncNav, { passive: true });
  syncNav();

  /* ---------- 照片墙：鼠标拖拽滚动 + 键盘翻页 ---------- */
  var wall = document.getElementById("wallTrack");
  var shots = Array.prototype.slice.call(
    document.querySelectorAll(".shot")
  );

  if (wall && finePointer.matches) {
    var dragging = false;
    var dragMoved = 0;
    var startX = 0;
    var startScroll = 0;

    wall.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      dragging = true;
      dragMoved = 0;
      startX = event.clientX;
      startScroll = wall.scrollLeft;
    });

    wall.addEventListener(
      "pointermove",
      function (event) {
        if (!dragging) return;
        var delta = event.clientX - startX;
        if (Math.abs(delta) > 4 && !wall.classList.contains("is-dragging")) {
          wall.classList.add("is-dragging");
        }
        dragMoved = Math.max(dragMoved, Math.abs(delta));
        if (wall.classList.contains("is-dragging")) {
          wall.scrollLeft = startScroll - delta;
        }
      },
      { passive: true }
    );

    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      window.setTimeout(function () {
        wall.classList.remove("is-dragging");
      }, 0);
    };

    wall.addEventListener("pointerup", endDrag);
    wall.addEventListener("pointercancel", endDrag);
    wall.addEventListener("pointerleave", endDrag);

    /* 拖拽后抑制误触点击 */
    wall.addEventListener(
      "click",
      function (event) {
        if (dragMoved > 8) {
          event.preventDefault();
          event.stopPropagation();
          dragMoved = 0;
        }
      },
      true
    );
  }

  if (wall) {
    wall.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      var step = wall.clientWidth * 0.6;
      wall.scrollBy({
        left: event.key === "ArrowRight" ? step : -step,
        behavior: reduceMotion.matches ? "auto" : "smooth"
      });
      event.preventDefault();
    });
  }

  /* ---------- 灯箱 ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lightboxImg");
  var lbCount = document.getElementById("lightboxCount");
  var lbClose = document.getElementById("lightboxClose");
  var lbPrev = document.getElementById("lightboxPrev");
  var lbNext = document.getElementById("lightboxNext");

  var photos = shots
    .map(function (shot) {
      var img = shot.querySelector("img");
      if (!img) return null;
      return { src: img.getAttribute("src"), alt: img.getAttribute("alt") || "" };
    })
    .filter(Boolean);

  var current = 0;
  var lastFocus = null;
  var closeTimer = null;

  function renderPhoto(index) {
    if (!photos.length || !lbImg) return;
    current = (index + photos.length) % photos.length;
    lbImg.setAttribute("src", photos[current].src);
    lbImg.setAttribute("alt", photos[current].alt);
    if (lbCount) {
      lbCount.textContent = current + 1 + " / " + photos.length;
    }
  }

  function openLightbox(index) {
    if (!lb || !photos.length) return;
    lastFocus = document.activeElement;
    renderPhoto(index);
    window.clearTimeout(closeTimer);
    lb.hidden = false;
    void lb.offsetWidth;
    lb.classList.add("is-open");
    body.classList.add("is-locked");
    if (lbClose) lbClose.focus();
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.classList.remove("is-open");
    body.classList.remove("is-locked");
    var wait = reduceMotion.matches ? 0 : 300;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      lb.hidden = true;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }, wait);
  }

  function stepPhoto(direction) {
    if (!lb || lb.hidden) return;
    renderPhoto(current + direction);
  }

  shots.forEach(function (shot, index) {
    shot.addEventListener("click", function () {
      openLightbox(index);
    });
  });

  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev) {
    lbPrev.addEventListener("click", function () {
      stepPhoto(-1);
    });
  }
  if (lbNext) {
    lbNext.addEventListener("click", function () {
      stepPhoto(1);
    });
  }

  if (lb) {
    lb.addEventListener("click", function (event) {
      if (event.target === lb) closeLightbox();
    });

    /* 移动端左右滑动切图 */
    var touchX = 0;
    var touchY = 0;

    lb.addEventListener(
      "touchstart",
      function (event) {
        if (!event.touches || event.touches.length !== 1) return;
        touchX = event.touches[0].clientX;
        touchY = event.touches[0].clientY;
      },
      { passive: true }
    );

    lb.addEventListener(
      "touchend",
      function (event) {
        if (!event.changedTouches || !event.changedTouches.length) return;
        var dx = event.changedTouches[0].clientX - touchX;
        var dy = event.changedTouches[0].clientY - touchY;
        if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
        stepPhoto(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
  }

  document.addEventListener("keydown", function (event) {
    if (!lb || lb.hidden) return;
    if (event.key === "Escape") {
      closeLightbox();
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft") {
      stepPhoto(-1);
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowRight") {
      stepPhoto(1);
      event.preventDefault();
    }
  });
})();
