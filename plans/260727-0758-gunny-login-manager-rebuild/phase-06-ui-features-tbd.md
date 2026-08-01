---
phase: 6
title: "UI/Layout & New Features"
status: done
priority: P3
dependencies: [5]
---

# Phase 6: UI/Layout & New Features

## Overview
Đợt tính năng + polish đầu tiên do user chốt. Đã giao xong feat #1 (online-check) + 1 batch 5 việc polish + build installer + pin Node version. Các tính năng mới về sau sẽ thêm phase con khi user liệt kê cụ thể.

## Đã giao (done)
- **Feat #1 — online-check trước Login Launcher (đơn lẻ):** `onlineService.js` (`checkAccountOnline` qua oauth + `getMarkItem`, nhận diện marker `"đang online"`) + IPC `game:check-online` (main/preload/renderer lockstep) + modal xác nhận amber (`#modal-confirm` + `asyncConfirm`). TDD 5 tests. PR #1.
- **Polish batch (PR #2):** fix mojibake log (koffi kernel32 `SetConsoleOutputCP(65001)`); modal confirm màu amber/orange; rebrand mọi chỗ "TienTool" → "Gunny Login Manager"; app icon từ gunnyclient (`assets/icon.ico`/`icon.png`); xoá `vercel-webhook/` dead code.
- **Build config (PR #3):** unsigned installer qua `packaging/sign-noop.cjs` (`win.signtoolOptions.sign`); build ra `Gunny Login Manager Setup 0.1.0.exe` OK, icon nhúng đúng.
- **Toolchain (PR #4):** pin `.nvmrc` → `20.19.2`; CI/release đọc `node-version-file: .nvmrc`; thêm `engines.node` vào package.json.

## Requirements
- Các tính năng mới về sau: chờ user chốt từng mục (input/output + tiêu chí done) → thêm phase con.

## Candidate scope (chờ xác nhận, KHÔNG thực thi)
- UI/Layout: kích thước cửa sổ, tone màu, sắp xếp nút, thêm/bớt panel, thêm cột trạng thái acc, ẩn nút không dùng.
- Tính năng mới (ví dụ user từng gợi ý dạng): auto nhiệm vụ hằng ngày, hẹn giờ auto, export/import acc (Excel/CSV), login theo nhóm/template, v.v.
- Đổi tiêu đề/titlebar sang "Gunny Login Manager" (nếu chưa làm ở Phase 1).

## Implementation Steps
1. Thu thập yêu cầu cụ thể từ user (mỗi mục: input/output, tiêu chí done).
2. Với mỗi tính năng lớn → brainstorm nhỏ → thêm phase con.
3. Áp TDD như các phase trước cho phần có logic.

## Success Criteria
- [x] Feat #1 online-check hoạt động, có test, đã merge (PR #1).
- [x] Polish batch + icon + rebrand đã merge (PR #2).
- [x] Installer build được (unsigned) với icon đúng (PR #3).
- [x] Node version pin chuẩn + CI single-source-of-truth (PR #4).

## Risk Assessment
- Scope creep: giữ mỗi tính năng là một đơn vị nhỏ, plan riêng, tránh gộp mơ hồ.

## Notes
Không bắt đầu phase này cho đến khi user chốt yêu cầu. Phase 1–5 là phần độc lập, hoàn thiện được mà không cần Phase 6.
