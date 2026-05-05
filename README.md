# Taste Canvas — Chrome Extension

One-click save from any webpage to your self-hosted [Taste Canvas](https://github.com/spoony-vu/taste-canvas) board.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

## What it does

- **Right-click any image, video, or link** → "Save to Taste Canvas"
- **Right-click anywhere on a page** → "Save page" (captures full-page screenshot)
- **Hover any image** → click the floating "+" button to save it (Pinterest-style)
- **Keyboard shortcut** `Alt+Shift+S` → save current page
- **Popup** → paste a URL, edit title/category/tags, save

Tweet URLs are auto-detected and routed through the backend's `/api/tweet` import (uses fxtwitter for media metadata).

## Install

The extension is unpublished — install from source:

1. Clone this repo: `git clone https://github.com/spoony-vu/taste-canvas-extension.git`
2. Open `chrome://extensions` in Chrome (or any Chromium browser)
3. Toggle **Developer mode** on (top-right)
4. Click **Load unpacked** and select the cloned directory
5. Click the extension icon in your toolbar to open the popup
6. First-run will show the **Settings** panel — fill in:
   - **Backend URL** — your deployed Taste Canvas origin (`https://your-taste-canvas.vercel.app`)
   - **API key** — the value of `TASTE_API_KEY` in your deployment's environment variables

The extension verifies the URL + key by hitting `/api/manifest` before saving. Once connected, you're done.

## How it stays yours

The extension talks ONLY to the backend URL you configured. There is no shared server, no telemetry, and no analytics. Your API key lives in `chrome.storage.sync` so it travels with your Chrome profile but never leaves your devices. Each fork of Taste Canvas runs its own copy of this extension pointed at its own backend.

## Permissions explained

| Permission | Why |
|-----------|-----|
| `activeTab` | Read the current tab's URL and title when you click save |
| `contextMenus` | Add right-click menu items |
| `storage` | Persist your settings + last-used category |
| `scripting` | Inject the page-meta extractor that reads `og:image`/`og:title` |
| `<all_urls>` (host) | The hover-to-save image overlay needs to run on every page you visit |
| `optional_host_permissions` | Granted on demand for your specific backend URL when you save Settings |

The extension does NOT request access to your backend up-front — it asks for that permission ONLY when you click **Save** in Settings, and only for the exact origin you typed.

## Develop

There is no build step. Edit any file, then click the **reload** icon on the extension card in `chrome://extensions`.

```
extension/
├── manifest.json          # MV3 manifest
├── background.js          # Service worker — context menus, hotkey, save dispatch
├── content.js             # Hover overlay + toast
├── lib/
│   └── api.js             # Backend client (reads config from chrome.storage.sync)
├── popup/
│   ├── popup.html         # Main + Settings screens
│   ├── popup.js           # Screen routing, settings save, capture flow
│   └── popup.css
├── styles/
│   └── overlay.css        # Hover button + toast styles
└── icons/
    └── icon16.png, icon48.png, icon128.png
```

### Resetting

To wipe stored config (during testing):

```js
// In the extension's service worker DevTools console
chrome.storage.sync.clear()
```

Or right-click the extension icon → **Manage extension** → **Site access** → revoke the backend host permission.

## License

MIT
