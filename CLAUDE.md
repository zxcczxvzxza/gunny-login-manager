# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gunny Login Manager is a Windows-only Electron desktop app for **personal** account management and in-game automation for the Gunny 2017 (gnddt.com) game server. It manages a fleet of game accounts, launches the native `GunnyBrowser.exe` client, arranges launcher windows across monitors via Win32 APIs, and automates gift-code redemption, weekly-code redemption, and "reset ấn V15". Accounts/templates are stored in **local JSON files** under `userData` — there is no license key, login screen, or database. UI text and log messages are in Vietnamese.

## Commands

```bash
npm run dev      # Vite dev server + electronmon hot reload (concurrently)
npm run build    # Build main, preload, renderer via 3 separate Vite configs
npm start        # build + electron . (production-like local run)
npm run dist     # build + electron-builder --publish=always (release)
npm test         # Vitest (run once); npm run test:watch for watch mode
npm run lint     # ESLint (flat config); npm run format for Prettier
```

Node 20 (`.nvmrc`). Tests: **Vitest** (`*.test.js` beside source; Node env; electron/koffi mocked at the boundary). Tooling: ESLint (flat v9) + Prettier + Husky (pre-commit → lint-staged, commit-msg → commitlint, pre-push → tests); commits must be Conventional. CI runs lint + test on PRs; release builds an NSIS installer on `v*` tags via `electron-updater`.

`resetmarkitem.py` is a standalone Python reference script, not part of the app build.

## Architecture

Standard Electron 3-process split. All privileged work happens in the main process; the renderer only talks to it through a `contextBridge`-exposed API.

- **`src/main.js`** — main process entry. Registers every `ipcMain.handle(...)` channel, owns window creation, auto-updater wiring, and the `activePids` array of launched game clients. Patches `console.log`/`console.error` to forward logs to the renderer and the optional log window (`?page=log`). Loads runtime settings (`loadSettings()`) on `app.whenReady`.
- **`src/preload.js`** — the entire IPC surface. Exposes `window.electronAPI` with one method per channel. When adding a feature, you must touch three files in lockstep: register the handler in `main.js`, expose it in `preload.js`, and call it in `renderer.js`.
- **`src/renderer.js`** — single vanilla-JS file (no framework). Opens straight to the dashboard (no login); page switching via `showPage(name)`; render functions like `renderAccounts()` / `renderTemplates()`. Fetches runtime settings from main via `api.getSettings()` on startup. UI is Tailwind classes in `index.html`; icons via `lucide`.
- **`src/services/*`** — main-process-only business logic, one module per domain. Handlers in `main.js` are thin wrappers over these.
- **`src/koffiService.js`** — Win32 automation via `koffi` FFI into `user32.dll` (EnumWindows, SetWindowPos, SetWindowTextW, etc.). Renames launcher windows by PID, tiles them across monitors, and auto-closes the recurring "Javascript Alert" IP popup (polled every 2s from `main.js`).
- **`src/database/local-store.js`** — local JSON storage (`readCollection`/`writeCollection`/`getStorePath`), one file per collection under `userData` (`accounts.json`, `templates.json`). Atomic writes (temp + rename); ids are `crypto.randomUUID()`.
- **`src/config/settings.js`** — runtime settings singleton (`loadSettings`/`getSettings`/`saveSettings`) persisted to `userData/settings.json`, merged over `DEFAULT_SETTINGS`. Holds formerly-hardcoded values (game path, window arrange, captcha key/params, reg prefix, max length).

### Service responsibilities

- `accountService.js` / `templateService.js` — CRUD over `accounts` / `templates` via `local-store` (no `keyId`, no database). `_id` is a UUID string. `accountType`: `1` = main account, `2` = clone. Returns the `{ success, data }` shape.
- `loginService.js` — game login. Calls `api.gnddt.com/api/Launcher/LauncherWebV566` for a token, then spawns the client at `getSettings().gunnyBrowserPath` (opens a Google Drive download link if missing). Returns the launched PID (pushed to `activePids`).
- `apiService.js` — shared web-API layer with **captcha solving**: fetches the server captcha image and OCRs it via api-ninjas, retrying until a valid result. The captcha key comes from `getSettings().apiNinjaKey` (falls back to `API_NINJA` env); retry delay / min length from `getSettings().captcha`. `getLoginToken()` retries login through captcha and prompts the user to pick a default character if none is set.
- `autoService.js` — gift-code (`getAllCode`) and weekly-code (`getWeeklyCode`) redemption loops over all `accountType:1` accounts (read from local store), driven by `onProgress` callbacks (→ `auto:progress` IPC channel) and a `checkStop` predicate for cancellation.
- `resetMarkService.js` — "reset ấn V15" automation; loops the mark-item reset API per account, with the same progress/stop pattern.
- `registerService.js` — in-game character auto-registration.
- `onlineService.js` — checks whether an account's default character is currently online. There is no dedicated status endpoint; it does an oauth login (via `getLoginToken`, costs one captcha) then calls `getMarkItem` and treats the server's `"Nhân vật đang online không thể thực hiện !"` rejection as `online`. Used by the single-account "Login Launcher" path in `renderer.js` to confirm before launching (`game:check-online` IPC). Note the launcher login itself (`loginService`) uses a different, captcha-free `PublicKey` token that cannot query online state.

### Long-running automation pattern

`getAllCode`, `getWeeklyCode` (`(…, onProgress, checkStop)`) and `startResetMark` (`(accounts, onProgress, checkStop)`) share one convention. Progress objects (`{ message, accCurrent, accTotal, username, codeCurrent, codeTotal }`) are pushed over the `auto:progress` channel; a module-level boolean (`isAutoStopped`, etc.) toggled by a `*:stop-*` handler cooperatively cancels the loop. Follow this shape for any new batch automation.

## Configuration & Secrets

Two layers: **build-time** `src/config.js` (API base + webshop URL, from `process.env` or Vite `define` constants `__GNDDT_API_BASE__` / `__GNDDT_WEBSHOP_URL__`) and **runtime** `src/config/settings.js` (`userData/settings.json`, editable via the Config UI). Env vars (`.env`, optional): `GNDDT_API_BASE`, `GNDDT_WEBSHOP_URL`, `API_NINJA` (captcha OCR key fallback — prefer setting it in the Config UI). Copy `.env.example` to `.env` for local dev. There is **no `MONGODB_URI`**. One-time migration from the old MongoDB is available via `scripts/export-accounts-from-mongo.mjs` (requires `mongodb` reinstalled + a `MONGODB_URI`).

## Build System Notes

- Uses **Vite** (via `@electron-forge/plugin-vite`, though builds run through the `npm run build` script's three explicit config files, not `electron-forge`).
- Native/Node-only modules (`koffi`, `electron-log`, `electron-updater`, `electron-squirrel-startup`) are marked **external** in `vite.main.config.mjs` — do not bundle them.
- `src/resources/clickermann/` (the Clickermann autoclicker + `.cms` scripts) ships as an unpacked `extraResource`. On first run, `main.js` copies it to `app.getPath('userData')/clickermann` and thereafter **merges only new files** (`mergeClickermann`) so user-customized scripts survive updates; `.bat` files are always overwritten from source. Launched elevated (`RunAs`) via PowerShell.
- ES modules throughout `src/` (`import`/`export`); `main.js` uses `__dirname` (CJS-style, provided by the bundler) and the Vite-injected `MAIN_WINDOW_VITE_*` globals.

## Conventions

- The `{ success: boolean, data?/error?/msg? }` result shape is the contract for essentially every IPC handler and service function — preserve it.
- User-facing strings and log messages are Vietnamese; match that when editing UI/logs.
- Windows-only assumptions are pervasive (default `gunnyclient` path in settings, `user32.dll` FFI, PowerShell, NSIS). Don't add cross-platform abstractions unless asked.
- When adding an IPC feature, touch three files in lockstep: register the handler in `main.js`, expose it in `preload.js`, call it in `renderer.js`.
