import { isConfigured, getBackendUrl } from "../lib/api.js";

const $ = (s) => document.querySelector(s);

// Screens
const settingsScreen = $("#settings");
const mainScreen = $("#main");

// Settings elements
const backendUrlInput = $("#backendUrlInput");
const apiKeyInput = $("#apiKeyInput");
const saveSettingsBtn = $("#saveSettingsBtn");
const settingsStatus = $("#settingsStatus");
const settingsBack = $("#settingsBack");
const settingsIntro = $("#settingsIntro");
const openSettingsBtn = $("#openSettingsBtn");

// Main elements
const urlInput = $("#urlInput");
const fetchBtn = $("#fetchBtn");
const preview = $("#preview");
const ogImage = $("#ogImage");
const titleInput = $("#titleInput");
const categorySelect = $("#categorySelect");
const tagsInput = $("#tagsInput");
const saveBtn = $("#saveBtn");
const screenshotBtn = $("#screenshotBtn");
const statusEl = $("#status");
const imageOverlayToggle = $("#imageOverlayToggle");

let pageMeta = null;
let currentTab = null;
let customUrl = false;

// --- Screen routing ---

async function init() {
  const configured = await isConfigured();
  if (!configured) {
    showSettings({ firstRun: true });
  } else {
    showMain();
    initMain();
  }
}

function showSettings({ firstRun = false } = {}) {
  mainScreen.hidden = true;
  settingsScreen.hidden = false;
  settingsBack.hidden = firstRun;
  settingsIntro.hidden = !firstRun;

  chrome.storage.sync.get(["backendUrl", "apiKey"]).then(({ backendUrl, apiKey }) => {
    if (backendUrl) backendUrlInput.value = backendUrl;
    if (apiKey) apiKeyInput.value = apiKey;
  });
}

function showMain() {
  settingsScreen.hidden = true;
  mainScreen.hidden = false;
}

settingsBack.addEventListener("click", () => {
  showMain();
  if (!currentTab) initMain();
});

openSettingsBtn.addEventListener("click", () => {
  showSettings({ firstRun: false });
});

// --- Settings save ---

saveSettingsBtn.addEventListener("click", async () => {
  const backendUrl = backendUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!backendUrl || !apiKey) {
    setSettingsStatus("error", "Both fields are required");
    return;
  }

  let normalized;
  try {
    const u = new URL(backendUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      throw new Error("must be http or https");
    }
    normalized = `${u.protocol}//${u.host}`;
  } catch {
    setSettingsStatus("error", "Backend URL must be a valid http(s) URL");
    return;
  }

  saveSettingsBtn.disabled = true;
  saveSettingsBtn.querySelector(".btn-label").hidden = true;
  saveSettingsBtn.querySelector(".btn-saving").hidden = false;
  setSettingsStatus("info", "Verifying...");

  // Request host permission for the backend so fetch() works without
  // <all_urls> being granted up-front.
  const granted = await chrome.permissions.request({
    origins: [`${normalized}/*`],
  });
  if (!granted) {
    setSettingsStatus("error", "Permission denied for that backend URL");
    resetSaveBtn();
    return;
  }

  // Verify the endpoint actually responds with the given key
  try {
    const res = await fetch(`${normalized}/api/manifest`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const status = res.status === 401 ? "Bad API key" : `Backend returned ${res.status}`;
      setSettingsStatus("error", status);
      resetSaveBtn();
      return;
    }
  } catch (err) {
    setSettingsStatus("error", `Cannot reach backend: ${err.message}`);
    resetSaveBtn();
    return;
  }

  await chrome.storage.sync.set({ backendUrl: normalized, apiKey });
  setSettingsStatus("success", "Connected");
  setTimeout(() => {
    resetSaveBtn();
    showMain();
    initMain();
  }, 600);
});

function setSettingsStatus(type, msg) {
  settingsStatus.hidden = false;
  settingsStatus.className = `status status--${type}`;
  settingsStatus.textContent = msg;
}

function resetSaveBtn() {
  saveSettingsBtn.disabled = false;
  saveSettingsBtn.querySelector(".btn-label").hidden = false;
  saveSettingsBtn.querySelector(".btn-saving").hidden = true;
}

// --- Main capture flow ---

async function initMain() {
  const { lastCategory, imageOverlayEnabled = true } = await chrome.storage.local.get([
    "lastCategory",
    "imageOverlayEnabled",
  ]);
  if (lastCategory) categorySelect.value = lastCategory;
  imageOverlayToggle.checked = imageOverlayEnabled;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab) return;

  currentTab = tab;
  urlInput.value = tab.url || "";
  titleInput.value = tab.title || "";

  fetchPageMeta(tab.id);
}

async function fetchPageMeta(tabId) {
  try {
    const meta = await chrome.runtime.sendMessage({
      action: "getMeta",
      tabId,
    });
    pageMeta = meta;
    if (meta?.title && !customUrl) titleInput.value = meta.title;
    if (meta?.image) {
      ogImage.src = meta.image;
      preview.hidden = false;
    }
  } catch {
    // Content script might not be available (chrome:// pages, etc.)
  }
}

let enrichTimer = null;

urlInput.addEventListener("input", () => {
  customUrl = urlInput.value.trim() !== currentTab?.url;
  debounceEnrich();
});

urlInput.addEventListener("paste", () => {
  setTimeout(() => {
    customUrl = true;
    debounceEnrich(0);
  }, 50);
});

function debounceEnrich(delay = 400) {
  clearTimeout(enrichTimer);
  const url = urlInput.value.trim();
  if (!url || !isValidUrl(url)) return;
  enrichTimer = setTimeout(() => enrichFromUrl(url), delay);
}

fetchBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (!url) return;
  if (customUrl && isValidUrl(url)) {
    enrichFromUrl(url);
  } else if (currentTab) {
    fetchPageMeta(currentTab.id);
  }
});

async function enrichFromUrl(url) {
  fetchBtn.classList.add("loading");
  titleInput.placeholder = "Fetching title...";
  try {
    const backendUrl = await getBackendUrl();
    const { apiKey } = await chrome.storage.sync.get("apiKey");
    if (!backendUrl || !apiKey) return;

    const res = await fetch(
      `${backendUrl}/api/meta?url=${encodeURIComponent(url)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    if (data.title) titleInput.value = data.title;
    pageMeta = {
      ...pageMeta,
      title: data.title || pageMeta?.title,
      description: data.description || pageMeta?.description,
      image: data.image || pageMeta?.image,
    };
    if (data.image) {
      ogImage.src = data.image;
      preview.hidden = false;
    }
  } catch {
    // Silent fail — user can still type a title manually
  } finally {
    fetchBtn.classList.remove("loading");
    titleInput.placeholder = "Title";
  }
}

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function parseTags(str) {
  return str
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function showStatus(type, msg) {
  statusEl.hidden = false;
  statusEl.className = `status status--${type}`;
  statusEl.textContent = msg;
  if (type === "success") {
    setTimeout(() => window.close(), 800);
  }
}

function setLoading(loading) {
  saveBtn.disabled = loading;
  screenshotBtn.disabled = loading;
  saveBtn.querySelector(".btn-label").hidden = loading;
  saveBtn.querySelector(".btn-saving").hidden = !loading;
}

async function save(withScreenshot = false) {
  const url = urlInput.value.trim();
  const title = titleInput.value.trim() || url;
  const category = categorySelect.value;
  const tags = parseTags(tagsInput.value);

  if (!url) {
    urlInput.focus();
    return;
  }

  setLoading(true);
  statusEl.hidden = true;
  chrome.storage.local.set({ lastCategory: category });

  try {
    let type;
    if (/^https?:\/\/(x\.com|twitter\.com)\//.test(url)) {
      type = "tweet";
    } else if (withScreenshot && !customUrl) {
      type = "page";
    } else if (pageMeta?.image) {
      type = "image";
    } else {
      type = "link";
    }

    const response = await chrome.runtime.sendMessage({
      action: "save",
      type,
      url,
      title,
      category,
      tags,
      imageUrl: pageMeta?.image || null,
      tabId: currentTab?.id,
    });

    if (response?.ok) {
      showStatus("success", "Saved");
    } else {
      showStatus("error", response?.error || "Failed to save");
    }
  } catch (err) {
    showStatus("error", err.message);
  } finally {
    setLoading(false);
  }
}

imageOverlayToggle.addEventListener("change", () => {
  chrome.storage.local.set({ imageOverlayEnabled: imageOverlayToggle.checked });
});

saveBtn.addEventListener("click", () => save(false));
screenshotBtn.addEventListener("click", () => save(true));

// Cmd+Enter to save
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    if (!mainScreen.hidden) save(false);
  }
});

init();
