---
title: TienTool Personal Edition — Brainstorm Rebuild Foundation
date: 2026-07-27
type: brainstorm-report
status: approved-foundation
modes: []
source_repo: pmt1506/TienTool (colleague, distribution access)
target: personal GitHub repo (own account)
---

# TienTool Personal Edition — Brainstorm Report

## 1. Bối cảnh & mục tiêu

- Source gốc: app Electron-Windows quản lý acc + auto tác vụ game Gunny 2017 (gnddt.com), của đồng nghiệp, user có quyền distribution trên `pmt1506/TienTool`.
- Mục tiêu: user build **bản riêng dùng cá nhân 1 mình**, toàn quyền cấu hình, hạ tầng độc lập, tuân thủ rules senior (test, lint, hook, PR-based).
- UI/Layout và tính năng mới: **user hoãn** ("từ từ tính"), setup nền + env trước.

## 2. Quyết định đã chốt (approved)

| # | Quyết định | Chốt |
|---|---|---|
| Mô hình dùng | **Chỉ cá nhân 1 người** | ✅ |
| Backend/DB | **Bỏ license key + MongoDB → lưu local JSON** | ✅ |
| Repo | **Repo cá nhân GitHub, xoá .git init mới sạch, KHÔNG upstream** | ✅ |
| Platform + CI/CD | **GitHub + GitHub Actions** (CI eslint+test/PR, CD build+publish/tag) | ✅ |
| Ngôn ngữ | Giữ **JS/ESM + JSDoc** (không migrate TypeScript giai đoạn này) | ✅ |
| Token PAT lộ trong remote | Bỏ qua (xoá .git sẽ gỡ luôn) | ✅ |

## 3. Phân tích nền tảng (rationale)

### GitHub vs GitLab → GitHub
- Windows CI runner: GitHub `windows-latest` free; GitLab Windows runner beta/tính phí. Electron build **bắt buộc** Windows → quyết định.
- electron-updater: provider `github` native; GitLab không hỗ trợ (phải tự host `latest.yml` qua generic).
- Đã có `build.yml`, PAT/username là GitHub. GitLab chỉ thêm phiền, không lợi.

### CI/CD → Có, chia 2
- CI (nên có ngay): eslint + unit test trên PR = cổng gác thực thi rule "PR review trước merge".
- CD (tùy chọn, làm luôn vì GitHub dễ): build + publish installer khi tag → auto-updater chạy.

### Xoá .git → init mới
- Code sắp phân kỳ lớn (bỏ license/Mongo) → merge upstream vô dụng, hay conflict.
- Init sạch: gỡ PAT nhúng, lịch sử gọn. Cần fix cụ thể từ gốc thì cherry-pick tay.

## 4. Kiến trúc mới

### Loại bỏ
- Màn login key + đăng ký + gia hạn + thanh toán → app mở thẳng dashboard.
- `authService.js`, `licenseMailService.js`, `database/mongodb.js`.
- Deps: `mongodb`, `nodemailer`, `dotenv` (xét lại), biến `MONGODB_URI`.
- Scoping theo `keyId` (ObjectId) trong account/template service.

### Giữ
- Login launcher, sắp xếp cửa sổ (koffi/Win32 user32.dll), auto nhận code / code tuần / reset ấn.
- Captcha OCR (cần `API_NINJA`), gọi API game gnddt.com (external), auto-updater, Clickermann bundle.

### Data mới (userData/)
```
accounts.json    ← thay collection accounts (bỏ keyId)
templates.json   ← thay collection templates
settings.json    ← MỚI: giá trị "sở thích" + API_NINJA (runtime)
```
- Tạo `localStore.js` thay `mongodb.js`; account/template service đổi tầng lưu trữ, giữ contract `{ success, data }` → renderer gần như không sửa.

### Settings layer (làm cho "chuẩn hơn")
Externalize hardcode → `settings.json` + gắn nút **Config** có sẵn trong UI:
- Đường dẫn `GunnyBrowser.exe` (bỏ hardcode `C:/Program Files (x86)/gunnyclient/...`).
- Server mặc định, prefix, maxLength.
- Tham số sắp xếp cửa sổ (cols, STEP_X/Y, START_X/Y).
- Retry/delay captcha, API base, webshop URL, `API_NINJA`.

## 5. Hạ tầng tooling

| Lớp | Công cụ | Ghi chú |
|---|---|---|
| Test | Vitest | Tích hợp Vite; unit test services/logic |
| Lint/format | ESLint flat config + Prettier | |
| Git hooks | Husky + lint-staged + commitlint | Auto check khi commit; ép conventional commit |
| PR gate | Branch protection main: cấm push thẳng, bắt buộc PR + CI xanh | Rule #5 |
| Secret | Chỉ `API_NINJA`. Dev: `.env` (gitignored). Runtime: nhập qua Config UI → settings.json | Không bake vào binary |

### Env cần thiết (sau khi bỏ Mongo)
| Biến | Vai trò | Secret? |
|---|---|---|
| `API_NINJA` | Giải captcha (auto) | ✅ |
| `GNDDT_API_BASE` | API game (default https://api.gnddt.com) | ❌ |
| `GNDDT_WEBSHOP_URL` | Nút webshop | ❌ |

`.env.example` gốc THIẾU `API_NINJA` và THỪA `MONGODB_URI` → cần cập nhật. `.env` hiện tại của user đang **rỗng 0 byte**.

## 6. Lộ trình đề xuất (thứ tự thực thi)

1. **Fork & infra** — xoá .git, init mới, push GitHub repo cá nhân; đổi `appId`/tên/icon/publish target; branch protection + PR flow.
2. **Tooling** — ESLint + Prettier + Vitest + Husky/lint-staged/commitlint.
3. **CI/CD** — `ci.yml` (lint+test/PR), `release.yml` (build+publish/tag), sửa secret `API_NINJA`.
4. **Env + strip license/Mongo → local JSON** — cập nhật `config.js`/vite define (bỏ MONGODB_URI), tạo `localStore.js`, bỏ keyId, app vào thẳng dashboard, `.env` đúng. *(env chỉ "sạch" được khi Mongo đã gỡ → gộp chung)*
5. **Settings layer + Config UI** — externalize hardcode.
6. **UI/Layout** — TBD (user hoãn).
7. **Tính năng mới** — TBD (user hoãn).

Migration tùy chọn: export acc từ Mongo (key user) → `accounts.json` chạy 1 lần (cần MONGODB_URI + key tạm).

## 7. Rủi ro

- Bỏ keyId ảnh hưởng account/template service + renderer login flow → cần test kỹ CRUD sau đổi.
- electron-updater cần release đầu tiên có `latest.yml` mới hoạt động; version hiện 1.0.44 (gốc) → cân nhắc reset version cho bản riêng.
- Vite define đang bake secret vào main.js — khi bỏ Mongo phải dọn cả `__MONGODB_URI__`.
- Clickermann first-run copy/merge + chạy RunAs (UAC) — giữ nguyên, không đụng.

## 8. Câu hỏi mở (chưa chốt)

- UI/Layout cụ thể muốn đổi gì? (hoãn)
- Tính năng mới cần thêm gì? (hoãn)
- Có migrate danh sách acc hiện có từ Mongo sang local JSON không?
- appId / tên app / version khởi điểm cho bản riêng đặt gì?
