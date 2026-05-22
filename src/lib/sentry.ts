// Sentry 异步加载模块。
//
// 设计目标:
//   1) DEV 完全不打 Sentry 进 bundle (动态 import 在 PROD-only 分支下走)
//   2) PROD 的 Sentry 不阻塞首屏: 主 bundle 立刻渲染, Sentry 在 idle 时初始化
//   3) ErrorBoundary 不依赖 Sentry: 错误上报通过这里的 reportError() 转发
//   4) 不引 browserTracing / replay — 它们让 chunk 从 80KB 撑到 480KB。
//      只用 error capture, 用 named import 让 tree-shake 工作。

const SENTRY_DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined) ?? '';
const ENABLE_SENTRY = import.meta.env.PROD && Boolean(SENTRY_DSN);

interface SentryAPI {
  init(opts: { dsn: string; release?: string }): void;
  captureException(error: unknown, ctx?: { extra?: Record<string, unknown> }): void;
}

let sentryPromise: Promise<SentryAPI> | null = null;
// 在 Sentry 还在加载时累积错误, 加载完一次性 flush
const pendingErrors: { error: Error; info?: unknown }[] = [];

function loadSentry(): Promise<SentryAPI> {
  if (!sentryPromise) {
    // 关键: 用命名 import (init, captureException) 而非 import * as,
    // 让 Rollup tree-shake 删掉未用的 browser tracing / replay 等代码。
    sentryPromise = import('@sentry/react').then(({ init, captureException }) => {
      init({
        dsn: SENTRY_DSN,
        release: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined,
      });
      const api: SentryAPI = {
        init,
        captureException: (error, ctx) => captureException(error, ctx),
      };
      // flush 在 init 完成前累积的错误
      for (const { error, info } of pendingErrors) {
        api.captureException(error, { extra: info ? { info } : undefined });
      }
      pendingErrors.length = 0;
      return api;
    });
  }
  return sentryPromise;
}

/**
 * 在 idle 时启动 Sentry。从 main.tsx 调用一次即可。
 * 不阻塞首屏渲染 — 用 requestIdleCallback (无则 setTimeout fallback)。
 */
export function initSentryAsync(): void {
  if (!ENABLE_SENTRY) return;
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  if (idle) {
    idle(() => {
      loadSentry();
    });
  } else {
    setTimeout(() => {
      loadSentry();
    }, 1500);
  }
}

/**
 * 全局错误上报入口。ErrorBoundary 的 onError 调它。
 * Sentry 还没加载时, 错误会被缓冲, 加载完一次性 flush。
 */
export function reportError(error: Error, info?: unknown): void {
  if (!ENABLE_SENTRY) return;
  if (sentryPromise) {
    sentryPromise.then((api) => {
      api.captureException(error, { extra: info ? { info } : undefined });
    });
  } else {
    pendingErrors.push({ error, info });
    // 触发加载 (如果 idle 还没触发过)
    loadSentry();
  }
}
