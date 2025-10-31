# Installation & manual load instructions (Windows PowerShell)

This file contains exact, step-by-step installation and extension load instructions for judges and reviewers running on Windows. Follow each command in PowerShell.

## Prerequisites

- Google Chrome (Stable). For full AI surface testing you may need Chrome Beta/Canary where built-in AI APIs are available.
- Node.js 16+ and npm
- Git

## 1) Clone repository

Open PowerShell and run:

```powershell
# clone the repo
git clone https://github.com/m3lk0rbot/Chrome-Mnemonic
cd "chrome-mnemonic"
```

If you received a zip from the hackathon organizers, unzip it and `cd` into the folder that contains `manifest.json`.

## 2) Install dependencies

```powershell
npm install
```

This will install devDependencies required to run tests. No build artifacts are required to load the extension in Chrome unless you use a custom build step.

## 3) Optional: Build step

If your workflow requires a build script (check `package.json`), run:

```powershell
npm run build
```

If you do not have a `build` script, skip this step; the extension can be loaded directly from the repo root.

## 4) Load the extension in Chrome (unpacked)

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable `Developer mode` (toggle in the top right).
4. Click `Load unpacked` and select the repository folder (the folder that contains `manifest.json`).

Notes:
- If Chrome refuses to load due to manifest errors, open DevTools in the `chrome://extensions` page and inspect the error message.
- MV3 service worker lifecycle: background scripts run in a service worker (see `background.js`) and may be terminated and restarted by Chrome. This is normal.

## 5) Verify extension is loaded

- You should see an entry with the extension name (from `manifest.json`) in `chrome://extensions/`.
- Open the extension popup or the side-panel (if supported) and open DevTools (Ctrl+Shift+I) to view console logs.
- The console should log AI availability checks from `services/ai-service.js` (e.g., "AI Availability: ...").

## 6) Notes on built-in AI APIs & Chrome channel

- Built-in client-side AI APIs (Prompt, Summarizer, Writer/Rewriter, Translator, Proofreader) may only be available on specific Chrome channels or devices.
- If the local Chrome build does not expose an API, the extension contains safe fallback behavior; features will degrade gracefully and no personal data will be transmitted off-device.

## 7) Running the manual smoke tests

After loading the extension, follow the quick manual smoke tests in `testing.md`.

---
 
