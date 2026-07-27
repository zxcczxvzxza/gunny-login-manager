---
phase: 5
title: "Settings Layer + Config UI"
status: pending
priority: P2
dependencies: [4]
---

# Phase 5: Settings Layer + Config UI

<!-- Updated: Validation Session 1 - Config modal đã tồn tại (localStorage tt_config); đổi thành mở rộng + migrate sang settings.json -->

## Overview
Gom giá trị đang hardcode vào `settings.json` + **mở rộng Config modal đã có sẵn**. Đây là phần "làm cho chuẩn hơn".

**Hiện trạng (verified):** Config modal ĐÃ tồn tại và chạy — `renderer.js` có `btn-config`/`modal-config`/`btn-save-config`, lưu vào **`localStorage` key `tt_config`** gồm `regPrefix` (default `'GNLM'`) + `regCheckEnable`. `maxLength` đang hardcode `14` ở các call `loginGame`. → Phase này KHÔNG phải "gắn nút chưa dùng" mà là **mở rộng modal + migrate localStorage → settings.json**.

**Ràng buộc kỹ thuật:** field mới (`gunnyBrowserPath`, `windowArrange`, `apiNinjaKey`, captcha, api base) được dùng ở **main process** — `localStorage` KHÔNG truy cập được từ main → bắt buộc dùng `settings.json` main-side qua IPC. `regPrefix`/`regCheckEnable`/`maxLength` gộp luôn vào `settings.json` để config một nguồn duy nhất.

## Requirements
- Functional: đọc/ghi settings từ `userData/settings.json` với default; sửa được qua Config modal có sẵn (mở rộng); code (cả main lẫn renderer) dùng settings thay hardcode + thay localStorage `tt_config`.
- Non-functional: có default an toàn khi thiếu file/thiếu field (merge default); migrate 1 lần `tt_config` (localStorage) → `settings.json` nếu tồn tại.

## Architecture
- `src/config/settings.js`: `loadSettings()` (merge default + file), `saveSettings(partial)`, `getSetting(path)`. Dùng lại `local-store` pattern.
- Settings schema (default):
  - `gunnyBrowserPath`: `C:/Program Files (x86)/gunnyclient/GunnyBrowser.exe`
  - `defaultServerId`, `defaultPrefix`, `defaultMaxLength`
  - `windowArrange`: `{ cols, startX, startY, gapX, gapY }`
  - `captcha`: `{ retryDelayMs, minLength }`
  - `api`: `{ base, webshopUrl }`
  - `apiNinjaKey` (secret runtime — thay vì bake vào binary)
  - `regPrefix` (default `'GNLM'`), `regCheckEnable` (từ tt_config cũ)
- Wire hardcode:
  - `loginService.js`: đọc `gunnyBrowserPath` thay literal.
  - `main.js` arrange handlers: đọc `windowArrange` thay hằng số.
  - `apiService.js`: `apiNinjaKey`, `captcha.*` từ settings.
  - default server/prefix/maxLength: renderer đọc từ settings; thay hardcode `14` ở `loginGame` calls + thay `config.regPrefix/regCheckEnable` (localStorage) bằng settings.
- Migrate: nếu `localStorage.tt_config` tồn tại → đọc `regPrefix`/`regCheckEnable` đổ vào `settings.json` lần đầu, rồi renderer dùng settings (bỏ đọc/ghi localStorage).
- IPC: `settings:get`, `settings:save` (main handler + preload expose).
- UI: mở rộng **Config modal có sẵn** (`btn-config`/`modal-config`/`btn-save-config`) — thêm field mới, giữ regPrefix/regCheckEnable, nút Lưu ghi qua `settings:save`.

## Related Code Files
- Create: `src/config/settings.js`, `src/config/settings.test.js`
- Modify: `src/main.js` (IPC settings + dùng windowArrange), `src/preload.js` (expose), `src/renderer.js` + `index.html` (Config UI), `src/services/loginService.js`, `src/services/apiService.js`, `src/config.js`

## Implementation Steps
1. **Test-first** `settings.test.js`: thiếu file → trả default; file thiếu field → merge default; save→load round-trip; không ghi đè field không truyền.
2. Impl `settings.js` → test PASS.
3. IPC `settings:get`/`settings:save` + preload.
4. Thay hardcode ở `loginService`, `main.js` arrange, `apiService` bằng settings.
5. Dựng Config UI (form + validate nhẹ + toast lưu thành công).
6. Smoke test: đổi `gunnyBrowserPath` sai → báo lỗi rõ; đổi windowArrange → sắp xếp theo giá trị mới; đổi `apiNinjaKey` → auto dùng key mới.

## Success Criteria
- [ ] Test-first settings PASS (default/merge/round-trip).
- [ ] Không còn literal `C:/Program Files (x86)/gunnyclient/...` trong `loginService.js` (đọc từ settings).
- [ ] Tham số sắp xếp cửa sổ đọc từ settings.
- [ ] `API_NINJA` có thể nhập qua Config UI (không bắt buộc bake vào build).
- [ ] Config modal (mở rộng) lưu → `settings.json` cập nhật; renderer KHÔNG còn đọc/ghi `localStorage.tt_config`.
- [ ] `tt_config` cũ (nếu có) được migrate sang `settings.json` 1 lần.
- [ ] `maxLength` hardcode `14` ở `loginGame` thay bằng settings.

## Risk Assessment
- Trùng lặp giữa `config.js` (build-time) và `settings.js` (runtime) → phân định rõ: `config.js` chỉ còn default/URL build-time; runtime ưu tiên `settings.json`.
- Field nhạy cảm (`apiNinjaKey`) lưu plaintext trong userData → chấp nhận cho app cá nhân; ghi chú, không over-engineer mã hoá.

## Notes (TDD)
Test tập trung logic merge/default của settings. UI verify thủ công.
