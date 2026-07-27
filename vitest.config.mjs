import { defineConfig } from 'vitest/config';

// Node environment: services + storage layer are main-process code.
// Electron / koffi / native modules are mocked at the test boundary.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js'],
    exclude: ['node_modules/**', '.vite/**', 'dist/**', 'out/**'],
  },
});
