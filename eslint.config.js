import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

const TYPED_FILES = [
  'electron/**/*.ts',
  'shared/**/*.ts',
  'src/**/*.ts',
  'src/**/*.tsx',
  'tests/**/*.ts',
  'tests/**/*.tsx',
];

export default tseslint.config(
  {
    ignores: [
      'out/**',
      'release/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.json',
      '**/*.md',
    ],
  },
  {
    files: TYPED_FILES,
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.web.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
  eslintConfigPrettier,
);
