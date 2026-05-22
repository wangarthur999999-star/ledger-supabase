// 共享逻辑的 store factory: 给 useExchangeRates / usePrices 共用。
//
// 解决两个微妙问题:
//
// 1) React StrictMode 双调用导致 channel 抖动
//    Strict mode 下 useEffect 会 mount→cleanup→mount。如果 attach/detach 直接
//    操作引用计数 (1 -> 0 -> 1), 中间那一瞬间 channel 会被 removeChannel 然后
//    立刻重建。Supabase realtime 这种轻量级行为可能在某些版本下漏掉抖动期间的
//    消息, 而且控制台会看到一堆 "Subscribed/Unsubscribed" 噪声。
//
//    解法: detach 走延迟拆除 (microtask + setTimeout 0ms)。如果在拆除前又 attach
//    了, 取消拆除。这是 React 文档里推荐的 module-singleton + cleanup-delay 模式
//    的简化版。
//
// 2) Force-reload 时旧请求覆盖新数据
//    refresh() 触发新一次 load, 但旧的 in-flight promise 仍然在跑。如果旧请求
//    比新请求慢, 旧数据 (来自调用 refresh 之前的库状态) 可能覆盖刚拿到的新数据。
//
//    解法: 每个 load 有 requestId, 完成时检查 store.lastRequestId 是否还是当前
//    的; 不是就丢弃结果。

import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface StoreState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

export interface CreateStoreOptions<T> {
  initial: T;
  /** 实际拉数据的函数。受 store 控制并发, 不要自己加锁 */
  fetcher: () => Promise<T>;
  /** Supabase 表名, 用于订阅 realtime 变更 */
  table: string;
  /** Supabase channel 名 (全局唯一) */
  channelName: string;
  /**
   * 可选: 每次 fetch 成功后, 用 (prev, next) 调用。
   * 用来 invalidate 关联的派生数据 (例如 prices 更新时清掉 history 缓存)。
   * 在 store 更新 + emit 之前调用, 不抛错。
   */
  onAfterFetch?: (prev: T, next: T) => void;
}

export interface SharedStore<T> {
  /** React hook: 订阅 store, 返回当前 state 和 refresh 函数 */
  useStore: () => StoreState<T> & { refresh: () => void };
  /** 非 hook 强刷, 如顶栏刷新按钮 */
  refresh: () => void;
}

export function createSharedStore<T>(opts: CreateStoreOptions<T>): SharedStore<T> {
  const state: StoreState<T> = {
    data: opts.initial,
    isLoading: true,
    error: null,
  };

  const listeners = new Set<() => void>();
  const emit = () => {
    for (const l of listeners) l();
  };

  // 请求竞态守卫: 新请求 +1, 旧请求完成时如果发现 currentRequestId 已变就丢弃结果
  let currentRequestId = 0;
  // in-flight promise: 同一时刻多次调用非强刷的 load 会复用
  let inflight: Promise<void> | null = null;

  async function load(force = false): Promise<void> {
    if (inflight && !force) return inflight;

    const myRequestId = ++currentRequestId;
    state.isLoading = true;
    state.error = null;
    emit();

    const run = async (): Promise<void> => {
      try {
        const data = await opts.fetcher();
        if (myRequestId !== currentRequestId) return; // 被更新的请求抢先了, 丢弃
        const prev = state.data;
        state.data = data;
        // 在 emit 之前调用钩子, 让 caller 能在订阅者收到通知前做缓存失效等准备
        if (opts.onAfterFetch) {
          try {
            opts.onAfterFetch(prev, data);
          } catch (err) {
            console.warn('[store] onAfterFetch threw', err);
          }
        }
      } catch (err) {
        if (myRequestId !== currentRequestId) return;
        state.error = err instanceof Error ? err.message : String(err);
      } finally {
        if (myRequestId === currentRequestId) {
          state.isLoading = false;
          emit();
        }
        // 用 currentRequestId 替代 promise 引用检查: 如果我们就是最新的请求,
        // 那就清空 inflight。等价于 if (inflight === p) inflight = null 但不需要循环引用。
        if (myRequestId === currentRequestId) inflight = null;
      }
    };

    const p = run();
    inflight = p;
    return p;
  }

  // ─── refcount + 延迟拆除 ──────────────────────────────────────────────
  // 关键: detach 不立刻拆 channel, 而是排到下一个 tick。StrictMode 下
  // attach 会在同一 tick 再次跑, 把 pending teardown 取消掉, channel 保持。
  let refcount = 0;
  let channel: RealtimeChannel | null = null;
  let visibilityHandler: (() => void) | null = null;
  let pendingTeardown: ReturnType<typeof setTimeout> | null = null;

  function setupSubscription() {
    if (channel) return;
    channel = supabase
      .channel(opts.channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: opts.table },
        () => load(true),
      )
      .subscribe();

    visibilityHandler = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  function teardownSubscription() {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
  }

  function attach() {
    // 如果有 pending teardown (StrictMode 双调用场景), 取消它
    if (pendingTeardown) {
      clearTimeout(pendingTeardown);
      pendingTeardown = null;
    }
    refcount++;
    if (refcount === 1) setupSubscription();
  }

  function detach() {
    refcount = Math.max(0, refcount - 1);
    if (refcount > 0) return;
    // 延迟拆除: 给同一 tick 内的 re-attach 一个机会取消掉
    pendingTeardown = setTimeout(() => {
      pendingTeardown = null;
      if (refcount === 0) teardownSubscription();
    }, 0);
  }

  function useStore() {
    const [, setTick] = useState(0);

    useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      listeners.add(listener);
      attach();

      // 首次挂载: store 还没数据就拉一次
      if (state.isLoading && !inflight) load();

      return () => {
        listeners.delete(listener);
        detach();
      };
    }, []);

    const refresh = useCallback(() => {
      load(true);
    }, []);

    return {
      data: state.data,
      isLoading: state.isLoading,
      error: state.error,
      refresh,
    };
  }

  return {
    useStore,
    refresh: () => load(true),
  };
}
