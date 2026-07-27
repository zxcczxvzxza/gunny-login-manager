---
phase: 1
title: "Repo Foundation & Independence"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Repo Foundation & Independence

## Overview
Cắt đứt khỏi repo đồng nghiệp: xoá .git, init sạch, đổi danh tính app, tạo & push repo GitHub cá nhân.

## Requirements
- Functional: repo mới trên GitHub cá nhân (`zxcczxvzxza`), remote sạch, danh tính app mới.
- Non-functional: không còn PAT nhúng cũ trong history; lịch sử git bắt đầu lại từ commit đầu.

## Architecture
Không đổi code logic. Chỉ đổi metadata đóng gói + git.
- `package.json`: `name` → `gunny-login-manager`, `productName` → `Gunny Login Manager`, `version` → `0.1.0`, `build.appId` → `com.gunnytool.manager`, `build.productName` → `Gunny Login Manager`, `build.publish[0].owner` → `zxcczxvzxza`, `build.publish[0].repo` → `gunny-login-manager`.
- `forge.config.js`: nếu maker-squirrel dùng, đảm bảo appId/name khớp (hiện dùng electron-builder qua `npm run dist`; forge chỉ dùng cho `dev`).
- `index.html` `<title>` + titlebar text đổi sang tên mới (nhẹ, có thể để Phase 6).

## Related Code Files
- Modify: `package.json`, `forge.config.js`, `index.html`
- Delete: `.git/` (toàn bộ history cũ)
- Create: repo GitHub `gunny-login-manager` (remote)

## Implementation Steps
1. Backup an toàn: `git bundle create ../tientool-backup.bundle --all` (giữ history cũ phòng khi cần cherry-pick).
2. Xoá `.git`: `rm -rf .git`.
3. `git init` + `git branch -M main`.
4. Sửa `package.json` (name/productName/version/appId/publish owner+repo) và `forge.config.js`.
5. Tạo repo GitHub cá nhân `gunny-login-manager` (private) qua `gh repo create` hoặc web.
6. `git remote add origin` repo mới (dùng credential manager / gh auth, KHÔNG nhúng PAT vào URL).
7. Commit đầu: `chore: init gunny-login-manager personal edition` + push `main`.
8. Xác minh `git log` chỉ có commit mới, `git remote -v` không lộ token.

## Success Criteria
- [ ] `.git` mới, `git log` 1 commit khởi tạo, không dính history `pmt1506`.
- [ ] `git remote -v` trỏ `github.com/zxcczxvzxza/gunny-login-manager`, không chứa `ghp_` trong URL.
- [ ] `package.json` + `forge.config.js` mang appId/tên/version mới.
- [ ] Push `main` thành công lên repo cá nhân.
- [ ] Backup bundle tồn tại ngoài repo.

## Risk Assessment
- Mất history đồng nghiệp → mitigation: bundle backup bước 1.
- PAT vô tình nhúng lại vào remote URL → dùng `gh auth login` / Git Credential Manager thay vì URL có token.
- Trên Windows `rm -rf` dùng Git Bash; nếu PowerShell dùng `Remove-Item -Recurse -Force .git`.

## Notes (TDD)
Phase hạ tầng, không có unit test. Verification = các lệnh git/kiểm tra ở Success Criteria.
