---
phase: 2
title: "Tooling & Quality Gates"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Tooling & Quality Gates

## Overview
Dựng bộ tooling senior: test (Vitest), lint/format (ESLint+Prettier), git hooks (Husky+lint-staged+commitlint). Đây là nền cho toàn bộ TDD của các phase sau.

## Requirements
- Functional: `npm test`, `npm run lint`, `npm run format` chạy được; hook chặn commit khi fail; commit ép conventional.
- Non-functional: cấu hình ESM-compatible (repo dùng `"type"` không set → package là CJS cho main nhưng src ESM; Vitest xử lý được).

## Architecture
- **Vitest**: `vitest.config.mjs`, môi trường `node` cho services; test đặt cạnh source `*.test.js` hoặc `test/`. Mock `electron`/`koffi`/`mongodb` qua `vi.mock`.
- **ESLint flat** (`eslint.config.mjs`, eslint v9): rule cho Node + ESM; tách env main (node) vs renderer (browser). Prettier qua `eslint-config-prettier` để tắt xung đột format.
- **Prettier**: `.prettierrc`.
- **Husky v9**: `.husky/pre-commit` → `lint-staged`; `.husky/commit-msg` → `commitlint`; `.husky/pre-push` → `npm test`.
- **lint-staged**: chạy `eslint --fix` + `prettier --write` trên file staged.
- **commitlint**: `commitlint.config.mjs` extends `@commitlint/config-conventional`.

## Related Code Files
- Create: `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `commitlint.config.mjs`, `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`
- Create: `src/utils.test.js` (test mẫu chứng minh harness chạy — `getSerialNumber` độ dài 17, charset hợp lệ)
- Modify: `package.json` (scripts: `test`, `test:watch`, `lint`, `lint:fix`, `format`; devDeps; `prepare: husky`; `lint-staged` block)

## Implementation Steps
1. Cài devDeps: `vitest`, `eslint`, `@eslint/js`, `globals`, `prettier`, `eslint-config-prettier`, `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`.
2. **Test-first**: viết `src/utils.test.js` cho `getSerialNumber()` (độ dài 17, chỉ chứa `[A-Z0-9]`) → chạy `npm test` phải PASS (chứng minh Vitest hoạt động).
3. Viết `eslint.config.mjs` (flat) + `.prettierrc`; chạy `npm run lint` sạch (sửa lỗi lint dễ hoặc set rule hợp lý, không tắt bừa).
4. `npx husky init`; cấu hình 3 hook + `lint-staged` block trong `package.json`.
5. Cấu hình `commitlint.config.mjs`.
6. Thử commit sai format → bị chặn; commit đúng + staged file bẩn → được auto-fix.
7. Cập nhật `package.json` scripts (thay `lint` no-op hiện tại).

## Success Criteria
- [ ] `npm test` chạy Vitest, test mẫu PASS.
- [ ] `npm run lint` chạy ESLint, không lỗi (hoặc chỉ warning có chủ đích).
- [ ] Commit message sai conventional bị `commit-msg` hook chặn.
- [ ] File bẩn khi commit được `pre-commit`/lint-staged auto-fix.
- [ ] `pre-push` chạy `npm test`, fail test thì chặn push.

## Risk Assessment
- Xung đột ESM/CJS trong config → dùng đuôi `.mjs` cho config, kiểm chứng từng bước.
- ESLint v9 flat config học phí ban đầu → bắt đầu rule tối thiểu, siết dần.
- Hook không chạy trên máy khác nếu quên `npm install` (husky `prepare`) → tài liệu hoá trong README.

## Notes (TDD)
Đây là phase kích hoạt TDD: harness test phải xanh trước khi các phase code sau viết test-first.
