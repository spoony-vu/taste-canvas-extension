# Privacy Policy — Taste Canvas Chrome Extension

_Last updated: 2026-05-06_

Taste Canvas is an open-source Chrome extension that saves links, images, and screenshots from web pages to a personal design board hosted on the user's own self-hosted backend (the open-source [Taste Canvas](https://github.com/spoony-vu/taste-canvas) project, typically deployed to the user's own Vercel account).

This extension is built around a simple privacy posture: **your data stays on infrastructure you control.**

## What is collected

The extension stores two things locally on the user's device, in `chrome.storage`:

1. **Backend URL** — the origin of the user's own Taste Canvas deployment (e.g. `https://your-taste-canvas.vercel.app`). Stored in `chrome.storage.sync` so it travels with the user's Chrome profile.
2. **API key** — the `TASTE_API_KEY` value the user generated for their own backend. Stored in `chrome.storage.sync`.
3. **UI preferences** — last-used save category, whether the hover-to-save overlay is enabled. Stored in `chrome.storage.local`.

Neither the URL, the key, nor any preference ever leaves the user's device for any destination other than the user's own configured backend.

## What is sent off-device

Only payloads that the user explicitly initiates by clicking save, hitting the keyboard shortcut, or using a right-click menu item. Each save sends the following to the URL the user configured in Settings, and **only** to that URL:

- The page URL being saved
- The page title
- For image saves: the image bytes, compressed client-side to WebP
- For page saves: a screenshot of the visible tab, compressed client-side to WebP
- The user-selected category and tags
- For tweet/X.com URLs: the URL is forwarded to the backend's `/api/tweet` endpoint, which fetches its own metadata server-side

All requests are authenticated with the user's own `TASTE_API_KEY` via a `Bearer` Authorization header.

## What is NOT collected, sent, or transmitted anywhere

- No analytics
- No telemetry
- No crash reporting
- No remote code execution
- No third-party SDKs, ad networks, or tracking pixels
- No data sent to spoony-vu, Anthropic, Google, Vercel, or any party other than the user's own configured backend
- No background data collection — the extension only acts when the user explicitly invokes a save

## Permissions used and why

See the README and `store/LISTING.md` for the complete per-permission justification. Summary:

- `activeTab`, `contextMenus`, `storage`, `scripting` — needed for the save flow itself
- `<all_urls>` host permission — needed because design references can come from any page on the web; the extension must be able to capture screenshots and read OpenGraph metadata on any site the user is browsing
- The user's backend origin permission is requested **on demand** via `chrome.permissions.request` when the user saves their Settings — never up-front

## Cookies

The extension does not set or read cookies.

## Children

The extension is not directed at children under 13 and does not knowingly collect any data from them.

## Changes

Material changes to this policy will be reflected in this file with an updated "Last updated" date. The repository's commit history is the canonical change log.

## Contact

Open an issue at [github.com/spoony-vu/taste-canvas-extension/issues](https://github.com/spoony-vu/taste-canvas-extension/issues).
