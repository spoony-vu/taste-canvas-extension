import {
  uploadItem,
  saveLinkItem,
  importTweet,
  compressImage,
  CATEGORIES,
} from "./lib/api.js";

// --- Context menus ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "taste-save-image",
    title: "Save image to Taste Canvas",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "taste-save-video",
    title: "Save video to Taste Canvas",
    contexts: ["video"],
  });
  chrome.contextMenus.create({
    id: "taste-save-link",
    title: "Save link to Taste Canvas",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: "taste-save-page",
    title: "Save page to Taste Canvas",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { lastCategory } = await chrome.storage.local.get("lastCategory");
  const category = lastCategory || "ui";

  try {
    if (info.menuItemId === "taste-save-image") {
      await saveImage(info.srcUrl, tab.title, info.pageUrl, category);
    } else if (info.menuItemId === "taste-save-video") {
      await saveVideo(info.srcUrl, tab.title, info.pageUrl, category);
    } else if (info.menuItemId === "taste-save-link") {
      await saveLink(info.linkUrl, tab.title, category);
    } else if (info.menuItemId === "taste-save-page") {
      const meta = await getPageMeta(tab.id).catch(() => null);
      await savePage(tab.url, tab.title, category, tab.id, undefined, meta?.image);
    }
    notify(tab.id, "saved");
  } catch (err) {
    console.error("Taste Canvas save error:", err);
    notify(tab.id, "error", err.message);
  }
});

// --- Keyboard shortcut ---

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "save-page") {
    try {
      const { lastCategory } = await chrome.storage.local.get("lastCategory");
      await savePage(tab.url, tab.title, lastCategory || "ui", tab.id);
      notify(tab.id, "saved");
    } catch (err) {
      notify(tab.id, "error", err.message);
    }
  }
});

// --- Message handler (from popup & content script) ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "save") {
    handleSaveMessage(msg)
      .then((result) => sendResponse({ ok: true, item: result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (msg.action === "getMeta") {
    getPageMeta(msg.tabId).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
});

async function handleSaveMessage(msg) {
  const { type, url, title, category, tags, imageUrl, tabId } = msg;

  // Remember last category
  chrome.storage.local.set({ lastCategory: category });

  if (type === "image" && imageUrl) {
    return saveImage(imageUrl, title, url, category, tags);
  }
  if (type === "tweet") {
    return importTweet({ url, category, tags });
  }
  if (type === "link") {
    return saveLink(url, title, category, tags);
  }
  // Default: save as page with screenshot, fall back to OG image
  return savePage(url, title, category, tabId, tags, imageUrl);
}

// --- Save helpers ---

async function saveImage(srcUrl, title, pageUrl, category, tags) {
  const res = await fetch(srcUrl);
  const blob = await res.blob();
  const compressed = await compressImage(blob);
  const file = new File([compressed], "image.webp", { type: "image/webp" });
  return uploadItem({ file, title, category, url: pageUrl, tags });
}

async function saveVideo(srcUrl, title, pageUrl, category, tags) {
  // For video, save as a link with video URL
  return saveLinkItem({
    title,
    url: pageUrl || srcUrl,
    category,
    tags: [...(tags || []), "video"],
  });
}

async function saveLink(url, title, category, tags) {
  // Check if it's a tweet
  if (/^https?:\/\/(x\.com|twitter\.com)\//.test(url)) {
    return importTweet({ url, category, tags });
  }
  return saveLinkItem({ title, url, category, tags });
}

async function savePage(url, title, category, tabId, tags, ogImageUrl) {
  // Check if it's a tweet
  if (/^https?:\/\/(x\.com|twitter\.com)\//.test(url)) {
    return importTweet({ url, category, tags });
  }

  // Capture visible tab as screenshot
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const compressed = await compressImage(blob);
    const file = new File([compressed], "screenshot.webp", {
      type: "image/webp",
    });
    return uploadItem({ file, title, category, url, tags });
  } catch {
    // Screenshot failed — fall back to OG image if available
    if (ogImageUrl) {
      return saveImage(ogImageUrl, title, url, category, tags);
    }
    return saveLinkItem({ title, url, category, tags });
  }
}

// --- Notify content script ---

function notify(tabId, status, message) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, {
    action: "taste-notify",
    status,
    message,
  }).catch(() => {}); // tab might not have content script
}

// --- Get page metadata via content script ---

async function getPageMeta(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const getMeta = (name) =>
        document.querySelector(`meta[property="${name}"]`)?.content ||
        document.querySelector(`meta[name="${name}"]`)?.content ||
        "";
      return {
        title: document.title,
        description: getMeta("og:description") || getMeta("description"),
        image: getMeta("og:image"),
        url: location.href,
      };
    },
  });
  return result?.result;
}
