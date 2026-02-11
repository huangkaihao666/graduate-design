import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import pluginTypeScript from '@typescript-eslint/eslint-plugin';
import parserTypeScript from '@typescript-eslint/parser';
import parserVue from 'vue-eslint-parser';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.output/**',
      '.nuxt/**',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      '*.min.js',
      '*.min.css',
    ],
  },
  {
    files: ['eslint.config.js', 'vite.config.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        parser: parserTypeScript,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        defineEmits: 'readonly',
        defineProps: 'readonly',
        defineExpose: 'readonly',
        defineOptions: 'readonly',
        withDefaults: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/no-useless-template-attributes': 'off',
      'no-useless-assignment': 'off',
      'no-unused-vars': 'off',
      'vue/max-attributes-per-line': [
        'warn',
        {
          singleline: {
            max: 3,
          },
          multiline: {
            max: 1,
          },
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts}'],
    languageOptions: {
      parser: parserTypeScript,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        window: 'readonly',
        document: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileList: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': pluginTypeScript,
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'no-prototype-builtins': 'warn',
      'no-constant-condition': 'warn',
      'no-empty': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  prettier,
];
