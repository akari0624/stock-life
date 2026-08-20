import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**']),

  // Base TypeScript rules for all packages
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // React rules — 兩個前端 app（遊戲與後台編輯器）都適用
  {
    files: ['apps/*/src/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // §5.3 Engine boundary rules — only for packages/engine/src
  {
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Do not use DOM globals in engine. (§5.3)' },
        { name: 'document', message: 'Do not use DOM globals in engine. (§5.3)' },
        { name: 'localStorage', message: 'Do not use DOM globals in engine. (§5.3)' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use injected SeededRng in engine, not Math.random(). (§5.3)',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Use injected time in engine, not Date.now(). (§5.3)',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Date"]',
          message: 'Do not use new Date() in engine. (§5.3)',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Engine must not import React. (§3.1)' },
            { name: 'react-dom', message: 'Engine must not import React DOM. (§3.1)' },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*'],
              message: 'Engine must not import React subpackages. (§3.1)',
            },
            {
              group: ['**/presentation/**', '**/ui/**', '**/app/**'],
              message:
                'Engine must not import from upper layers (presentation/ui/app). (§5.3)',
            },
          ],
        },
      ],
    },
  },
])
