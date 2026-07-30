---
title: Gunny Login Manager — Personal Edition Rebuild
status: pending
mode: tdd
created: 2026-07-27
scope: project
source_report: plans/reports/brainstorm-rebuild-foundation-260727-0758-tientool-personal-edition-report.md
blockedBy: []
blocks: []
---

# Gunny Login Manager — Personal Edition Rebuild

Rebuild source TienTool (của đồng nghiệp) thành bản cá nhân độc lập: bỏ license/MongoDB → local JSON, repo GitHub riêng, tooling + CI/CD + PR-flow chuẩn senior. TDD cho các phase code.

## Quyết định chốt (từ brainstorm)

| Hạng mục | Chốt |
|---|---|
| Mô hình | Dùng cá nhân 1 người |
| Storage | Bỏ license key + MongoDB → local JSON (`userData/*.json`) |
| Repo | GitHub cá nhân (`zxcczxvzxza`), xoá .git init mới sạch, KHÔNG upstream |
| CI/CD | GitHub Actions: CI eslint+test/PR, CD build+publish/tag |
| Ngôn ngữ | JS/ESM + JSDoc (không TypeScript) |
| Tooling | Vitest + ESLint(flat) + Prettier + Husky + lint-staged + commitlint |
| Quy trình | PR-based, branch protection main, cấm push thẳng |
| App identity | name `gunny-login-manager`, productName "Gunny Login Manager", appId `com.gunnytool.manager`, version `0.1.0` |
| Migration | Có: script export acc Mongo → `accounts.json` (1 lần) |
| Env sequencing | B — env sạch 1 lần (gộp env + gỡ Mongo) |
| UI/Layout + tính năng mới | HOÃN (Phase 6 TBD) |

## Phases

| # | Phase | Priority | Depends | Status |
|---|---|---|---|---|
| 1 | Repo Foundation & Independence | P1 | — | done (identity rename ✓; backup bundle ✓; .git reset + fresh commit ✓; **pushed to github.com/zxcczxvzxza/gunny-login-manager, private, remote clean** ✓) |
| 2 | Tooling & Quality Gates | P1 | 1 | done |
| 3 | CI/CD & Branch Protection | P1 | 2 | done (ci.yml + release.yml pushed; repo made **public** → branch protection on `main` enabled: require PR + `lint`/`test` checks, no force-push/delete. Public also fixes electron-updater auto-update — no baked token needed) |
| 4 | Env + Strip License/Mongo → Local JSON | P1 | 2 | done |
| 5 | Settings Layer + Config UI | P2 | 4 | done |
| 6 | UI/Layout & New Features | P3 | 5 | in progress (feat #1: online-check trước khi Login Launcher đơn lẻ — `onlineService.js` + `game:check-online`, TDD 5 tests) |

**Execution note (session 2, 2026-07-27):** User chose "local code first, git last". Ran P2 → P4 → P5 (all TDD, 25 tests green, lint+build clean, app boot-verified). Migration exported 71 accounts + 2 templates (key `1`) → `%APPDATA%/Gunny Login Manager/`. Remaining: **P1 git reset + repo create + P3 CI/branch-protection** — external, need user `gh auth login` as `zxcczxvzxza`. Owner confirmed `zxcczxvzxza`. ⚠️ Leaked PAT in old `.git/config` — user to revoke.

## Dependencies & thứ tự

1 → 2 → (3 và 4 song song được, cùng phụ thuộc 2) → 5 → 6.
Phase 4 là phase code lớn nhất; Phase 3 (CI) nên xong trước hoặc song song để PR của Phase 4 có cổng gác.

## Acceptance criteria (toàn plan)

- [ ] Repo mới trên GitHub cá nhân, .git sạch, không còn PAT nhúng, không remote `pmt1506`.
- [ ] `npm run lint`, `npm test` chạy được; hook chặn commit khi lint/test fail; commit ép conventional.
- [ ] Branch protection main: bắt buộc PR + CI xanh, cấm push thẳng.
- [ ] App khởi động vào thẳng dashboard, KHÔNG còn màn login key.
- [ ] Accounts/templates đọc/ghi từ `userData/*.json`; không còn dependency `mongodb`/`nodemailer`; không còn `MONGODB_URI`.
- [ ] Auto (nhận code/code tuần/reset ấn) + login launcher + sắp xếp cửa sổ vẫn chạy đúng.
- [ ] Script migrate export acc từ Mongo → `accounts.json` chạy được 1 lần (nếu user cần).
- [ ] Giá trị hardcode (đường dẫn GunnyBrowser, sắp xếp cửa sổ, default server/prefix, retry captcha, API_NINJA) chuyển sang `settings.json` + sửa được qua Config UI.
- [ ] Build `npm run dist` ra installer với appId/tên/version mới; publish target trỏ repo cá nhân.

## Open questions

- Repo name GitHub cuối cùng đặt trùng `gunny-login-manager`? (giả định: có)

## Validation Log

### Session 1 — 2026-07-27

**Verification Results**
- Claims checked: ~12 (tier Full, 6 phases)
- Verified: 11 | Failed: 1 | Unverified: 0
- VERIFIED: `getSerialNumber` 17 ký tự; `authService.js`/`licenseMailService.js`/`mongodb.js` tồn tại; `nodemailer` chỉ ở `licenseMailService.js`; externals `mongodb`+`koffi`; `dotenv` ở `main.js:1`; `currentKeyId` ×9 (renderer), `keyId` ×19 (services).
- FAILED: Phase 5 giả định nút Config chưa dùng — SAI. Config modal ĐÃ tồn tại (`btn-config`/`modal-config`/`btn-save-config`), lưu `localStorage.tt_config` (`regPrefix='GNLM'`, `regCheckEnable`); `maxLength` hardcode `14`. → Đã sửa Phase 5.

**Câu hỏi tới hạn — quyết định:**
1. Config storage → **Mở rộng modal + migrate localStorage `tt_config` → `settings.json`** (main-side bắt buộc vì field mới dùng ở main process). Phase 5 updated.
2. CD timing → **Cả CI + CD ngay từ Phase 3** (giữ nguyên plan).
3. Migration → **ACTIVE**: user có `MONGODB_URI` + key, chạy export thật ở Phase 4. Phase 4 updated.
4. API_NINJA → **Dùng key đồng nghiệp tạm** để test, thay key riêng sau (runtime Phase 5). Phase 4 noted.

**Phase propagation:** phase-04 (migration active + API_NINJA temp), phase-05 (Config modal existing + localStorage→settings.json migrate + maxLength 14).

### Whole-Plan Consistency Sweep — Session 1
- Rà `plan.md` + 6 phase: không còn claim "Config button chưa dùng". Phase 5 nhất quán với hiện trạng localStorage. Migration nhất quán ACTIVE giữa plan.md và phase-04. CD Phase 3 giữ cả CI+CD.
- Không phát hiện mâu thuẫn tồn đọng. ✅ Đủ điều kiện chuyển sang implement.
