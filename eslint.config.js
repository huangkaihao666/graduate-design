import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/', 'dist/', '.husky/', '.git/', 'frontend/dist', 'backend/dist'],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
