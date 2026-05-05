// Config is read fresh on every call so updates from the Settings panel
// take effect immediately without a service-worker restart.
async function getConfig() {
  const { backendUrl, apiKey } = await chrome.storage.sync.get([
    "backendUrl",
    "apiKey",
  ]);
  if (!backendUrl || !apiKey) {
    throw new Error(
      "Taste Canvas not configured. Open the extension popup and set your backend URL and API key in Settings."
    );
  }
  return { backendUrl: backendUrl.replace(/\/+$/, ""), apiKey };
}

function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function isConfigured() {
  const { backendUrl, apiKey } = await chrome.storage.sync.get([
    "backendUrl",
    "apiKey",
  ]);
  return Boolean(backendUrl && apiKey);
}

export async function getBackendUrl() {
  const { backendUrl } = await chrome.storage.sync.get("backendUrl");
  return backendUrl ? backendUrl.replace(/\/+$/, "") : "";
}

export async function fetchMeta(url) {
  const { backendUrl, apiKey } = await getConfig();
  const res = await fetch(
    `${backendUrl}/api/meta?url=${encodeURIComponent(url)}`,
    { headers: authHeaders(apiKey) }
  );
  if (!res.ok) throw new Error(`Meta fetch failed: ${res.status}`);
  return res.json();
}

export async function uploadItem({ file, title, category, url, tags }) {
  const { backendUrl, apiKey } = await getConfig();
  const form = new FormData();
  form.append("image", file);
  form.append("title", title);
  form.append("category", category);
  if (url) form.append("url", url);
  if (tags?.length) form.append("tags", JSON.stringify(tags));

  const res = await fetch(`${backendUrl}/api/upload`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function saveLinkItem({ title, url, category, tags }) {
  const { backendUrl, apiKey } = await getConfig();

  // Call /api/screenshot so the backend captures a hero image, uploads it
  // to Blob, generates a thumbnail + LQIP, and atomically appends the item
  // to the manifest. Saving directly to the manifest with image: "" leaves
  // the item permanently broken on the board.
  const res = await fetch(`${backendUrl}/api/screenshot`, {
    method: "POST",
    headers: {
      ...authHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      title: title || undefined,
      category: category || "ui",
      tags: tags || [],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Save link failed: ${res.status}`);
  }
  return res.json();
}

export async function importTweet({ url, category, tags }) {
  const { backendUrl, apiKey } = await getConfig();
  const res = await fetch(`${backendUrl}/api/tweet`, {
    method: "POST",
    headers: {
      ...authHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, category, tags: tags || [] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Tweet import failed: ${res.status}`);
  }
  return res.json();
}

export async function compressImage(blob, maxDim = 2000, quality = 0.85) {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  let w = width;
  let h = height;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const webpBlob = await canvas.convertToBlob({
    type: "image/webp",
    quality,
  });

  if (webpBlob.size > 4 * 1024 * 1024) {
    return canvas.convertToBlob({ type: "image/webp", quality: 0.6 });
  }
  return webpBlob;
}

export const CATEGORIES = [
  "ui",
  "landing-pages",
  "interactions",
  "typeface",
  "color-palette",
  "branding",
  "graphics",
  "patterns",
  "symbol",
  "tools",
];
