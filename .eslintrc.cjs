module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react', '@typescript-eslint'],
  settings: { react: { version: '18.2' } },
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  rules: {
    'react/react-in-jsx-scope': 'off'
  }
};
