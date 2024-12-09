const path = require('path');
module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:typescript-paths/recommended',
    "plugin:import/errors",
    "plugin:import/typescript",
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh', 'react-google-translate'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'import/extensions': ["error", "never", { json: 'always' }]
  },
  "settings": {
    "import/resolver": {
      // See also https://github.com/import-js/eslint-import-resolver-typescript#configuration
      "typescript": {
        alwaysTryTypes: true,
        project: path.resolve(process.cwd(), "tsconfig.json"),
      },
      "node": true,
    },
  },
};
