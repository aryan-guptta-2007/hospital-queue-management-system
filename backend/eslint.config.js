const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Express needs its four-argument error handler, and `next` is often
      // declared without being reached
      'no-unused-vars': [
        'error',
        { args: 'after-used', argsIgnorePattern: '^(next|req|res)$|^_', caughtErrors: 'none' },
      ],
      // This is a server: logging is how it reports for duty
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },

  // Must stay last: turns off the rules Prettier owns
  prettier,
];
