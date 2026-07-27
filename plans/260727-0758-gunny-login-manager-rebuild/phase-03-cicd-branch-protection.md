---
phase: 3
title: "CI/CD & Branch Protection"
status: pending
priority: P1
dependencies: [2]
---

# Phase 3: CI/CD & Branch Protection

## Overview
GitHub Actions: CI chạy lint+test trên PR (cổng gác cho main), CD build+publish installer khi tag. Branch protection ép PR-flow.

## Requirements
- Functional: PR trigger CI (lint+test); tag `v*` trigger build Windows + publish GitHub Release.
- Non-functional: secret chỉ `API_NINJA` (bỏ `MONGODB_URI`); Windows runner cho build Electron.

## Architecture
- `.github/workflows/ci.yml`: on `pull_request` + push non-main; `runs-on: windows-latest` (hoặc ubuntu cho lint/test cho nhanh — test không cần Windows trừ koffi; dùng ubuntu cho CI checks, windows chỉ cho build). Jobs: `lint`, `test`.
- `.github/workflows/release.yml`: on `push tags v*`; `windows-latest`; `npm ci` → `npm run dist`; env `GH_TOKEN`. (Thay `build.yml` cũ trỏ main.)
- Xoá workflow cũ `build.yml` (đang publish mỗi push main — không hợp PR-flow).
- Branch protection `main` (qua `gh api` hoặc UI): require PR, require status checks (`lint`, `test`), no direct push, no force-push.
- GitHub secret `API_NINJA` (Settings → Secrets). Bỏ `MONGODB_URI` khỏi CI (không còn Mongo sau Phase 4).

## Related Code Files
- Create: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Delete: `.github/workflows/build.yml`
- Config (ngoài repo): GitHub branch protection + secret `API_NINJA`

## Implementation Steps
1. Viết `ci.yml`: job `lint` (`npm ci` + `npm run lint`), job `test` (`npm ci` + `npm test`) trên `ubuntu-latest`.
2. Viết `release.yml`: `windows-latest`, `npm ci` + `npm run dist`, env `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`, `API_NINJA: ${{ secrets.API_NINJA }}`.
3. Xoá `build.yml`.
4. Set secret `API_NINJA` trên GitHub; kiểm tra không còn tham chiếu `MONGODB_URI`.
5. Bật branch protection `main`: require PR + status checks `lint`,`test`.
6. Test end-to-end: mở PR nháp → CI chạy; tag thử `v0.1.0-test` (repo nháp) → release build ra artifact.

## Success Criteria
- [ ] PR mở ra tự chạy `lint` + `test`; fail thì block merge.
- [ ] Không push thẳng được vào `main` (bị chặn).
- [ ] Tag `v*` build ra installer Windows + tạo GitHub Release kèm `latest.yml` (cho auto-update).
- [ ] Workflow không tham chiếu `MONGODB_URI`; `API_NINJA` lấy từ secret.

## Risk Assessment
- Phụ thuộc Phase 4 để bỏ `MONGODB_URI` hẳn: nếu Phase 3 chạy trước Phase 4, tạm để CI không cần secret Mongo (test mock). Ghi chú thứ tự.
- electron-updater cần release có `latest.yml`; publish provider `github` phải khớp owner/repo ở Phase 1.
- `koffi` native trong test → mock, không chạy FFI thật trên CI Linux.

## Notes (TDD)
CI job `test` chính là nơi thực thi test-first của các phase sau trên mọi PR.
