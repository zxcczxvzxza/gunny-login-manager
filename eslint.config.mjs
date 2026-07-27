import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

// Flat config (ESLint v9). Split by environment:
// - main process + services + storage: Node globals
// - renderer: browser globals
export default [
  {
    ignores: [
      'node_modules/**',
      '.vite/**',
      'dist/**',
      'out/**',
      'plans/**',
      'src/resources/**',
      'resetmarkitem.py',
    ],
  },
  js.configs.recommended,
  {
    // Default: main-process / Node ESM code.
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        // Injected by the Vite bundler at build time.
        MAIN_WINDOW_VITE_NAME: 'readonly',
        MAIN_WINDOW_VITE_DEV_SERVER_URL: 'readonly',
        __dirname: 'readonly',
        __GNDDT_API_BASE__: 'readonly',
        __GNDDT_WEBSHOP_URL__: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    // Renderer: browser environment.
    files: ['src/renderer.js', 'src/preload.js', 'src/log.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        electronAPI: 'readonly',
      },
    },
  },
  {
    // Test files: Vitest globals (globals: true in vitest.config).
    files: ['src/**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  prettier,
];
