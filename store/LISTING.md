# Chrome Web Store Listing — Taste Canvas

Copy these blocks directly into the Chrome Web Store dashboard fields.

---

## Title (45 char max)

```
Taste Canvas — Save to your design board
```

(40 chars)

---

## Short description (132 char max)

```
One-click save links, screenshots, and images from any page to your own self-hosted Taste Canvas design board.
```

(110 chars)

---

## Detailed description

```
Taste Canvas is a one-click bookmark for designers, researchers, and anyone who collects references for a living. Right-click an image, hit a hotkey on a page, or hover any image on the web to save it straight to your own Taste Canvas board — a self-hosted design library you control.

Nothing in Taste Canvas runs through a shared server. The extension talks ONLY to the backend URL you configure in Settings (your own Vercel deployment of the open-source Taste Canvas project). Your API key lives in chrome.storage.sync, your captured pages live on your own infrastructure, and there is no telemetry, no analytics, and no remote code execution.

What you can save
- Right-click any image, video, or link → Save to Taste Canvas
- Right-click anywhere on a page → save the page with a full screenshot
- Hover any image → click the floating "+" button (Pinterest-style)
- Keyboard shortcut Alt+Shift+S → save the current tab
- Popup → paste a URL, edit title/category/tags, save

Tweet and X.com URLs are auto-detected and routed through the backend's tweet importer so you get clean media + author metadata instead of a generic link card.

How it works
1. Install the extension and open the popup. It walks you through Settings on first run.
2. Paste your backend URL (your deployed Taste Canvas origin) and your TASTE_API_KEY. The extension verifies both before saving.
3. Browse the web. Save anything. It shows up on your board immediately.

Bring your own backend
Taste Canvas is fully self-hosted. Deploy the open-source backend (https://github.com/spoony-vu/taste-canvas) to Vercel in under a minute, set one environment variable, and you are done. Each user runs their own copy. No accounts, no shared database, no third-party data flow.

Open source — MIT licensed
Source: https://github.com/spoony-vu/taste-canvas-extension
Issues and feature requests welcome.
```

---

## Category

`Productivity`

---

## Single purpose

```
Save links, images, and screenshots from any webpage to a personal Taste Canvas design board hosted on the user's own Vercel deployment.
```

---

## Per-permission justifications

Paste each into the matching field on the Chrome Web Store privacy practices form.

### `activeTab`

```
Needed to read the current tab's URL and title when the user clicks the toolbar popup or the keyboard shortcut, so that the page being saved is the one in front of the user.
```

### `contextMenus`

```
Needed to register right-click menu items ("Save image to Taste Canvas", "Save video to Taste Canvas", "Save link to Taste Canvas", "Save page to Taste Canvas") that are the primary save surface of the extension.
```

### `storage`

```
Needed to persist the user's backend URL, API key, and last-used category preferences across sessions. Settings live in chrome.storage.sync (URL + key) and chrome.storage.local (UI prefs). Nothing else is stored.
```

### `scripting`

```
Needed to run a small inline function in the active tab that reads OpenGraph metadata (og:title, og:image, og:description) from the page's <head> so the popup can pre-fill the title and preview image before the user saves.
```

### `host_permissions: <all_urls>`

```
Needed because the extension must work on any page the user is browsing — design references can come from anywhere on the web. The all_urls host permission is required to: (1) inject the hover-to-save image overlay on any page the user enables it for, (2) capture the visible tab as a screenshot via chrome.tabs.captureVisibleTab when saving a page, and (3) fetch image bytes from the page's origin so they can be compressed client-side before upload to the user's own backend. The extension does NOT request access to the user's backend up-front — that origin permission is requested on demand via chrome.permissions.request when the user saves Settings.
```

---

## Privacy policy URL

```
https://github.com/spoony-vu/taste-canvas-extension/blob/main/store/PRIVACY.md
```

---

## Test account

Not required. The extension talks only to the user's own self-hosted Taste Canvas backend. Reviewers can deploy the open-source backend (https://github.com/spoony-vu/taste-canvas) to Vercel in under a minute with one environment variable (`TASTE_API_KEY`), then paste that backend URL and key into the extension's Settings panel on first run.

If a reviewer prefers, the developer can supply a temporary backend URL + API key on request via GitHub issues.

---

## Data handling disclosures (Chrome Web Store form)

| Question | Answer |
|----------|--------|
| Does the extension collect personally identifiable information? | No |
| Does it collect health information? | No |
| Does it collect financial / payment information? | No |
| Does it collect authentication information? | Yes — the user's own API key for their own backend, stored locally in chrome.storage.sync. Never transmitted to any third party. |
| Does it collect personal communications? | No |
| Does it collect location? | No |
| Does it collect web history? | Only the URL of a page when the user explicitly saves it. Stored on the user's own backend. |
| Does it collect user activity? | No (no analytics, no telemetry) |
| Does it collect website content? | Only when the user explicitly invokes save (a screenshot of the visible tab, a single image, or page metadata) — sent to the user's own configured backend. |
| Is data used for purposes other than the single purpose? | No |
| Is data sold to third parties? | No |
| Is data used for creditworthiness or lending? | No |

Certifications:
- I do not sell or transfer user data to third parties.
- I do not use or transfer user data for purposes unrelated to the item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.
