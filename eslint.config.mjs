import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import node from 'eslint-plugin-node';
import jest from 'eslint-plugin-jest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '**/*.glb',
      '**/*.json',
      '**/*.env',
      '**/*.envmap',
      '**/*.exr',
      'beta/**/*',
      'dist/**/*',
      'patches/**/*',
      'resources/**/*',
      '**/webpack.*',
      '*.js',
    ],
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended'
  ),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        THREE: 'writable',
        TWEEN: 'writeable',
        Stats: 'writeable',
        WebAssembly: 'readonly',
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: ['./src/client/tsconfig.json', './src/server/tsconfig.json'],
      },
    },

    rules: {
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array-simple',
        },
      ],

      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-parameter-properties': 'off',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@/quotes': ['error', 'single'],
      '@/semi': ['error', 'always'],

      '@typescript-eslint/triple-slash-reference': [
        'error',
        {
          path: 'always',
          types: 'prefer-import',
          lib: 'always',
        },
      ],

      '@typescript-eslint/unified-signatures': 'error',
      'arrow-parens': ['error', 'always'],
      'brace-style': 'off',
      camelcase: 'error',
      'comma-dangle': 'off',

      complexity: [
        'error',
        {
          max: 40,
        },
      ],

      'constructor-super': 'error',
      curly: 'error',
      'eol-last': 'error',
      eqeqeq: ['error', 'smart'],
      'for-direction': 'error',
      'getter-return': 'error',
      'guard-for-in': 'off',
      'id-match': 'error',
      'import/order': 'off',
      'jsdoc/check-alignment': 'off',
      'jsdoc/check-indentation': 'off',
      'jsdoc/newline-after-description': 'off',
      'max-classes-per-file': 'off',
      'max-len': 'off',
      'new-parens': 'error',
      'no-async-promise-executor': 'error',
      'no-bitwise': 'off',
      'no-caller': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-console': 'off',
      'no-const-assign': 'error',
      'no-constant-condition': 'error',
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-delete-var': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-eval': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-semi': 'error',
      'no-fallthrough': 'off',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-import-assign': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-invalid-this': 'off',
      'no-irregular-whitespace': 'error',
      'no-misleading-character-class': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multiple-empty-lines': 'error',
      'no-new-symbol': 'error',
      'no-new-wrappers': 'error',
      'no-obj-calls': 'error',
      'no-octal': 'error',
      'no-redeclare': 'error',
      'no-regex-spaces': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-throw-literal': 'error',
      'no-trailing-spaces': 'error',
      'no-undef': 'error',
      'no-undef-init': 'error',
      'no-underscore-dangle': 0,
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unused-labels': 'error',
      'no-useless-catch': 'error',
      'no-with': 'error',
      'object-shorthand': 'error',
      'one-var': ['error', 'never'],
      'prefer-arrow/prefer-arrow-functions': 'off',
      'prefer-const': 'off',
      'quote-props': ['error', 'consistent-as-needed'],
      radix: 'error',
      'require-yield': 'error',

      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always',
        },
      ],

      'use-isnan': 'error',
      'valid-typeof': 'off',
      'id-blacklist': 'off',
      'arrow-body-style': 'off',
      'no-useless-escape': 'off',
      'prefer-rest-params': 'off',
      'no-prototype-builtins': 'off',
      'variable-name': 'off',
      '@typescript-eslint/prefer-includes': 'off',
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/indent': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',

      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-ignore': {
            descriptionFormat: '^ -- ',
          },

          'ts-nocheck': {
            descriptionFormat: '^ -- ',
          },
        },
      ],

      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },
  {
    files: ['packages/common-core/mock/**/*.ts'],

    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  ...compat.extends('plugin:node/recommended').map((config) => ({
    ...config,

    files: [
      './packages/package-build/**/*.js',
      './packages/general-build/**/*.js',
      './packages/test-helpers/unit/global-setup.ts',
      './.eslintrc.js',
      './prettier.config.js',
      './typedoc.js',
      './jest.config.js',
    ],
  })),
  {
    files: [
      './packages/package-build/**/*.js',
      './packages/general-build/**/*.js',
      './packages/test-helpers/unit/global-setup.ts',
      './.eslintrc.js',
      './prettier.config.js',
      './typedoc.js',
      './jest.config.js',
    ],

    plugins: {
      node,
    },

    languageOptions: {
      globals: {
        ...Object.fromEntries(
          Object.entries(globals.browser).map(([key]) => [key, 'off'])
        ),
        ...globals.node,
      },

      ecmaVersion: 5,
      sourceType: 'commonjs',
    },

    rules: {
      'node/no-unpublished-require': 'off',
    },
  },
  ...compat.extends('plugin:node/recommended').map((config) => ({
    ...config,

    files: [
      './packages/general-build/rollup-plugin-acceptance-test-creation.js',
      './packages/general-build/rollup-defaults.js',
      './**/rollup.config.js',
    ],
  })),
  {
    files: [
      './packages/general-build/rollup-plugin-acceptance-test-creation.js',
      './packages/general-build/rollup-defaults.js',
      './**/rollup.config.js',
    ],

    plugins: {
      node,
    },

    languageOptions: {
      globals: {
        ...Object.fromEntries(
          Object.entries(globals.browser).map(([key]) => [key, 'off'])
        ),
        ...globals.node,
      },

      ecmaVersion: 5,
      sourceType: 'commonjs',
    },

    rules: {
      'node/no-unpublished-require': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'node/no-unpublished-import': 'off',
    },
  },
  ...compat.extends('plugin:jest/recommended').map((config) => ({
    ...config,

    files: [
      './packages/test-helpers/unit/setup-globals.js',
      './packages/configurator-core/__acceptance__/boot.ts',
      './packages/configurator-core/src/utils/test-helpers/**/*',
      './packages/**/__tests__/**/*.ts',
    ],
  })),
  {
    files: [
      './packages/test-helpers/unit/setup-globals.js',
      './packages/configurator-core/__acceptance__/boot.ts',
      './packages/configurator-core/src/utils/test-helpers/**/*',
      './packages/**/__tests__/**/*.ts',
    ],

    plugins: {
      jest,
    },

    languageOptions: {
      globals: {
        ...jest.environments.globals.globals,
      },
    },

    rules: {
      'no-useless-catch': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'jest/no-alias-methods': 'off',
      'jest/no-conditional-expect': 'off',
      'jest/no-done-callback': 'off',
      'jest/no-commented-out-tests': 'off',
      'jest/no-disabled-tests': 'off',
      'jest/no-identical-title': 'off',
      'jest/expect-expect': 'off',
      'jest/valid-expect': 'off',
    },
  },
];
