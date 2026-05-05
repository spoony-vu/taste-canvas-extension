// --- Toast notification ---

function showToast(status, message) {
  const existing = document.querySelector(".taste-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `taste-toast taste-toast--${status}`;
  toast.textContent =
    status === "saved" ? "Saved to Taste Canvas" : `Error: ${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("taste-toast--visible");
  });

  setTimeout(() => {
    toast.classList.remove("taste-toast--visible");
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

// --- Image hover overlay (Pinterest-style "+" button) ---

let overlay = null;
let overlayTarget = null;
let hideTimer = null;

function getOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = "taste-overlay";
  overlay.innerHTML = `
    <button class="taste-overlay-btn" aria-label="Save to Taste Canvas">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  `;

  const btn = overlay.querySelector(".taste-overlay-btn");

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!overlayTarget) return;

    btn.classList.add("taste-overlay-btn--saving");

    chrome.runtime.sendMessage(
      {
        action: "save",
        type: "image",
        imageUrl: overlayTarget.src || overlayTarget.currentSrc,
        url: location.href,
        title: overlayTarget.alt || document.title,
        category: "ui",
      },
      (res) => {
        btn.classList.remove("taste-overlay-btn--saving");
        if (res?.ok) {
          showToast("saved");
          hideOverlay();
        } else {
          showToast("error", res?.error || "Unknown error");
        }
      }
    );
  });

  // Keep overlay alive while hovering over the button
  btn.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  btn.addEventListener("mouseleave", () => scheduleHide());

  document.body.appendChild(overlay);
  return overlay;
}

function positionOverlay(el, rect) {
  el.style.top = `${rect.top + 8}px`;
  el.style.left = `${rect.right - 30}px`; // 22px btn + 8px inset from right
}

function showOverlay(img) {
  if (img.naturalWidth < 80 || img.naturalHeight < 80) return;
  if (img.closest(".taste-overlay")) return;

  overlayTarget = img;
  clearTimeout(hideTimer);

  const el = getOverlay();
  const rect = img.getBoundingClientRect();

  positionOverlay(el, rect);

  el.classList.add("taste-overlay--visible");
}

function hideOverlay() {
  clearTimeout(hideTimer);
  if (overlay) overlay.classList.remove("taste-overlay--visible");
  overlayTarget = null;
}

function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideOverlay, 250);
}

// Only on non-touch pointer devices
let imageOverlayEnabled = true;
chrome.storage.local.get("imageOverlayEnabled", ({ imageOverlayEnabled: val = true }) => {
  imageOverlayEnabled = val;
});
chrome.storage.onChanged.addListener((changes) => {
  if ("imageOverlayEnabled" in changes) {
    imageOverlayEnabled = changes.imageOverlayEnabled.newValue;
    if (!imageOverlayEnabled) hideOverlay();
  }
});

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let hoverTimer = null;

  document.addEventListener(
    "mouseover",
    (e) => {
      if (!imageOverlayEnabled) return;
      const img = e.target.closest("img");
      if (!img) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => showOverlay(img), 200);
    },
    { passive: true }
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      const toEl = e.relatedTarget;
      // Moving to overlay or its children — don't hide
      if (toEl?.closest?.(".taste-overlay")) return;
      // Moving from image — schedule hide
      if (e.target.closest("img") || e.target.closest(".taste-overlay")) {
        clearTimeout(hoverTimer);
        scheduleHide();
      }
    },
    { passive: true }
  );

  // Reposition on scroll (fixed positioning needs this)
  let scrollTick = false;
  window.addEventListener(
    "scroll",
    () => {
      if (overlayTarget && !scrollTick) {
        scrollTick = true;
        requestAnimationFrame(() => {
          if (overlayTarget) {
            const rect = overlayTarget.getBoundingClientRect();
            positionOverlay(getOverlay(), rect);
          }
          scrollTick = false;
        });
      }
    },
    { passive: true }
  );
}

// --- Listen for notifications from background ---

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "taste-notify") {
    showToast(msg.status, msg.message);
  }
});
