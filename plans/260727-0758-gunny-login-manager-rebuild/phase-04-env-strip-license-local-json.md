---
phase: 4
title: "Env + Strip License/Mongo → Local JSON"
status: pending
priority: P1
dependencies: [2]
---

# Phase 4: Env + Strip License/Mongo → Local JSON

<!-- Updated: Validation Session 1 - migration confirmed active (user có URI+key); API_NINJA dùng key đồng nghiệp tạm -->

## Overview
Phase code lớn nhất. Bỏ toàn bộ tầng license + MongoDB, chuyển accounts/templates sang file JSON local, app mở thẳng dashboard. Env sạch 1 lần. TDD: test-first cho localStore + services refactor.

**Validation notes:** Migration = **ACTIVE** (user có sẵn `MONGODB_URI` + key → chạy export thật ở bước 1). `API_NINJA` = **dùng key đồng nghiệp tạm** để smoke test auto, thay key riêng sau (cấu hình runtime ở Phase 5). CD publish bật ngay từ Phase 3 (đã xác nhận).

## Requirements
- Functional: accounts/templates CRUD hoạt động trên `userData/*.json`; app không còn login key; auto/login launcher vẫn chạy.
- Non-functional: giữ nguyên contract `{ success, data/error }` để renderer ít phải sửa; không còn dep `mongodb`/`nodemailer`; không còn `MONGODB_URI`.

## Architecture

### Storage mới — `src/database/local-store.js`
Thay `src/database/mongodb.js`. API tối giản, atomic write:
```
readCollection(name)            -> array
writeCollection(name, array)    -> void (write temp + rename, tránh corrupt)
getStorePath(name)              -> userData/<name>.json
```
Không còn ObjectId; id dùng `crypto.randomUUID()`. Bỏ hoàn toàn `keyId` (1 user).

### Services refactor
- `accountService.js` / `templateService.js`: đổi `getCollection(...ObjectId)` → `local-store`; bỏ tham số `keyId`; giữ shape trả về. `accountType` giữ (1=chính,2=clone) vì auto lọc theo nó.
- `autoService.getAccounts`: `find({accountType:1, keyId})` → đọc local, filter `accountType===1`.
- Xoá: `authService.js`, `licenseMailService.js`, `database/mongodb.js`.

### Main process (`main.js`)
- Xoá handlers: `auth:*`, `ensureDbConnected`, dialog lỗi DB, `hasShownDbError`, license path helpers (giữ hay bỏ tuỳ — bỏ vì không login).
- `accounts:*` / `templates:*`: bỏ `ensureDbConnected`, bỏ tham số `keyId`.
- Bỏ `connect/disconnect` MongoDB ở lifecycle.

### Preload (`preload.js`)
- Xoá nhóm `auth:*` (login/checkKey/register/renew/export/save/clear key).
- `getAccounts/getTemplates`: bỏ arg `keyId`.

### Renderer (`renderer.js` + `index.html`)
- Bỏ `page-login` + toàn bộ flow đăng ký/gia hạn/resend/poll (`renewPollInterval`, `registerPollInterval`, `currentRegisterRequestId`).
- App khởi động → `showPage('dashboard')` luôn; bỏ `currentKeyId`.
- Gọi CRUD không truyền keyId.

### Config + build (`config.js`, `vite.main.config.mjs`)
- `config.js`: xoá block `mongodb`; giữ `api` (base, webshop). Thêm đọc `API_NINJA`.
- `vite.main.config.mjs`: xoá `__MONGODB_URI__` define + external `mongodb`. Xoá external `nodemailer` nếu có.
- `.env` / `.env.example`: bỏ `MONGODB_URI`, thêm `API_NINJA`. `.env.production` cập nhật/xoá.
- `package.json`: gỡ deps `mongodb`, `nodemailer`; xét `dotenv` (giữ nếu còn `import 'dotenv/config'` trong main).

### Migration script — `scripts/export-accounts-from-mongo.mjs`
Chạy 1 lần, độc lập app. Đọc `MONGODB_URI` + `keyId` từ arg/env → xuất accounts+templates của key đó ra `accounts.json`/`templates.json` (đúng schema local-store, thay `_id`→uuid, bỏ `keyId`). In số bản ghi. KHÔNG import `mongodb` vào bundle app (chỉ devDep tạm cho script, hoặc dùng `mongodb` trước khi gỡ).

## Related Code Files
- Create: `src/database/local-store.js`, `scripts/export-accounts-from-mongo.mjs`
- Create (tests): `src/database/local-store.test.js`, `src/services/account-service.test.js`, `src/services/template-service.test.js`
- Modify: `src/services/accountService.js`, `src/services/templateService.js`, `src/services/autoService.js`, `src/main.js`, `src/preload.js`, `src/renderer.js`, `index.html`, `src/config.js`, `vite.main.config.mjs`, `.env.example`, `package.json`
- Delete: `src/services/authService.js`, `src/services/licenseMailService.js`, `src/database/mongodb.js`

## Implementation Steps
1. **(migrate trước khi gỡ Mongo)** Viết `scripts/export-accounts-from-mongo.mjs`; nếu user cần, chạy export ra `accounts.json`/`templates.json` (còn `mongodb` dep lúc này).
2. **Test-first** `local-store.test.js`: read empty → `[]`; write→read round-trip; atomic overwrite; path đúng (mock `app.getPath`).
3. Impl `local-store.js` → test PASS.
4. **Test-first** `account-service.test.js` + `template-service.test.js`: CRUD trên local-store (mock), assert shape `{success,data}`, không keyId, id là uuid.
5. Refactor `accountService`/`templateService` → local-store; test PASS.
6. Refactor `autoService.getAccounts` (filter local); cập nhật test nếu có.
7. Sửa `main.js`/`preload.js`: xoá auth + ensureDbConnected + keyId args; app lifecycle bỏ Mongo connect/disconnect.
8. Sửa `renderer.js`/`index.html`: bỏ login page + flows; vào thẳng dashboard.
9. Dọn `config.js` + `vite.main.config.mjs` (bỏ Mongo define/external); cập nhật `.env`/`.env.example`.
10. Gỡ deps `mongodb`, `nodemailer` (+ `dotenv` nếu bỏ); `npm install`.
11. `npm test` xanh; `npm run build` OK; smoke test app: mở → dashboard → thêm/sửa/xoá acc lưu vào JSON; login launcher; 1 auto flow.

## Success Criteria
- [ ] Test-first: mọi test local-store + services viết trước impl, cuối cùng PASS.
- [ ] App mở vào dashboard, không màn login; CRUD acc/template ghi `userData/*.json`.
- [ ] `grep -ri "mongodb\|keyId\|MONGODB_URI\|authService\|nodemailer" src/` không còn kết quả nghiệp vụ (trừ migration script/docs).
- [ ] `npm run build` không lỗi thiếu module Mongo.
- [ ] Auto nhận code / login launcher / sắp xếp cửa sổ vẫn chạy.
- [ ] Script migration export đúng số acc, đúng schema local.

## Risk Assessment
- Renderer 1200 dòng phụ thuộc `currentKeyId` rải rác → grep kỹ, xoá từng chỗ; test thủ công CRUD sau đó.
- Ghi JSON đồng thời gây corrupt → atomic write (temp + rename); auto chạy tuần tự nên rủi ro thấp.
- Auto flows dùng `getLoginToken` (captcha, `API_NINJA`) độc lập license → không ảnh hưởng, nhưng verify `API_NINJA` đọc đúng từ env sau khi đổi config.
- Mất dữ liệu khi migrate sai → chạy export ra file, kiểm tra rồi mới xoá Mongo code; backup bundle Phase 1.

## Notes (TDD)
Trọng tâm test: `local-store` (I/O, atomic, default rỗng) + services (CRUD, shape, không keyId). Không unit-test Electron IPC/koffi (mock ở ranh giới); phần đó verify bằng smoke test thủ công.
