// ESLint 9 flat config. 跑: `npm run lint`
//
// 范围: src/ 下的 TS/TSX 源码。scripts/ 是 Node CJS 风格的爬虫, 暂不强制同套规则。
// 想覆盖 scripts/, 加一个独立 block 即可。

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'android', 'node_modules', 'scripts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // store 模块 (useExchangeRates / usePrices) 故意导出 hook + helper 一起,
      // react-refresh 警告无害, 留 warn 不升级到 error。
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 业务代码里偶尔用 ! 标记 "我已经判过了" (CurrencyCard / RatesView 里 hasChange 之后),
      // strict TS + ESLint 配合下保留这个权限。
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
