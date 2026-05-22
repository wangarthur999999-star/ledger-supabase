import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig, type PluginOption } from 'vite';
import sentryVitePlugin from 'vite-plugin-sentry';

// 从 package.json 注入版本号, 让 UI 跟 package 永远同步。
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

// Sentry sourcemap 上传:
//   需要环境变量 SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT (CI secrets)。
//   release 名跟 src/lib/sentry.ts 的 Sentry.init({ release }) 对齐 = pkg.version。
//   没设这些 env 时 plugin 跳过上传 (本地 build 不会失败)。
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;
const enableSentryUpload = Boolean(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT);

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react(), tailwindcss()];
  if (enableSentryUpload) {
    // vite-plugin-sentry default export 是 function, 类型定义不太准, cast 一下
    plugins.push(
      (sentryVitePlugin as unknown as (cfg: object) => PluginOption)({
        url: 'https://sentry.io',
        authToken: SENTRY_AUTH_TOKEN,
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
        release: { name: pkg.version },
        sourceMaps: {
          include: ['./dist/assets'],
          ignore: ['node_modules'],
          urlPrefix: '~/assets',
        },
      }),
    );
  }

  return {
    plugins,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    esbuild:
      mode === 'production'
        ? { pure: ['console.log', 'console.warn', 'console.info', 'console.debug'] }
        : {},
    build: {
      sourcemap: enableSentryUpload ? ('hidden' as const) : false,
      rollupOptions: {
        output: {
          manualChunks: {
            sentry: ['@sentry/react'],
            supabase: ['@supabase/supabase-js'],
            motion: ['motion'],
            icons: ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
