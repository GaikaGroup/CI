module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:svelte/recommended', 'prettier'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    extraFileExtensions: ['.svelte']
  },
  env: {
    browser: true,
    es2017: true,
    node: true
  },
  ignorePatterns: [
    'src/generated/**',
    'build/**',
    '.svelte-kit/**',
    'node_modules/**',
    'tests/_disabled/**'
  ],
  rules: {
    // Relax some rules for development
    'no-unused-vars': 'warn',
    'no-undef': 'warn',
    'no-unreachable': 'warn',
    'no-case-declarations': 'warn',
    'no-prototype-builtins': 'warn',
    'no-useless-escape': 'warn',
    'no-dupe-class-members': 'warn',

    // Svelte-specific rules
    'svelte/no-at-html-tags': 'warn',
    'svelte/valid-compile': 'warn',

    // Keep critical rules as errors
    'no-console': 'off',
    'no-debugger': 'error'
  }
};
