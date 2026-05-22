import { Component, type ErrorInfo, type ReactNode } from 'react';

// 极简 ErrorBoundary: 不依赖 Sentry, 让 Sentry 整个模块可以从主 bundle 拆出去
// 走 dynamic import。Sentry 模块通过 captureException 全局 API 异步上报错误
// (见 src/main.tsx 里的 Sentry.init), 不需要 React 组件层挂钩。

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  /** 可选: 错误发生时调用 (例如转给 Sentry.captureException) */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 始终 console.error, 让本地开发看到完整堆栈
    console.error('[ErrorBoundary] caught', error, info);
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
