// 客户端阈值检测。
//
// 后端 check_alerts.js 处理 Web Push 推送; 但 Capacitor APK 不接 FCM,
// 也走不通 Web Push (sw + endpoint 那套)。所以本地用一份相同逻辑:
// 当 useExchangeRates 拿到新数据时, 跟用户的 alert_thresholds 比对,
// 触发就调 showNotification。
//
// 防抖: 借库里的 last_triggered_at 字段, 同一阈值 24h 内不重复触发。
// 用户在多设备上时, 后端推过一次会更新 last_triggered_at, 本地这里也会
// 立刻看到, 不会重复。

import { useEffect, useRef } from 'react';
import { useExchangeRates } from './useExchangeRates';
import { listMyAlerts, type AlertThreshold } from '../api/alerts';
import { showNotification } from './notifications';
import { supabase } from './supabase';
import { getDeviceId } from './deviceId';

const DEBOUNCE_MS = 24 * 60 * 60 * 1000;

function checkOne(threshold: AlertThreshold, rate: {
  pair: string;
  official_buy: number;
  official_sell: number;
  street_buy: number;
  street_sell: number;
  change: number | null;
}): { triggered: boolean; message: string } | null {
  // 防抖
  if (threshold.last_triggered_at) {
    const diff = Date.now() - new Date(threshold.last_triggered_at).getTime();
    if (diff < DEBOUNCE_MS) return null;
  }

  const v = Number(rate[threshold.compare_field]);
  if (!Number.isFinite(v)) return null;
  const t = threshold.threshold_value;

  switch (threshold.threshold_kind) {
    case 'above':
      if (v >= t)
        return {
          triggered: true,
          message: `${threshold.pair} reached ${v.toFixed(2)} (≥ ${t})`,
        };
      break;
    case 'below':
      if (v <= t)
        return {
          triggered: true,
          message: `${threshold.pair} dropped to ${v.toFixed(2)} (≤ ${t})`,
        };
      break;
    case 'change': {
      const pct = Math.abs(Number(rate.change ?? 0));
      if (pct >= t)
        return {
          triggered: true,
          message: `${threshold.pair} moved ${pct.toFixed(2)}% (≥ ${t}%)`,
        };
      break;
    }
  }
  return null;
}

/**
 * 调用一次, 启动客户端 alert 检测。每当 useExchangeRates 拿到新数据时跑一遍比对。
 * 通常在 App.tsx 顶层调一次即可。
 */
export function useAlertWatcher(): void {
  const { rates } = useExchangeRates();
  // ref 持有当前订阅列表, 避免每次 rates 变化都 refetch
  const alertsRef = useRef<AlertThreshold[]>([]);
  const lastRatesSigRef = useRef<string>('');

  // 加载并订阅 alert_thresholds 变化
  useEffect(() => {
    let canceled = false;
    listMyAlerts().then((a) => {
      if (!canceled) alertsRef.current = a;
    });

    // 订阅自己 device_id 的变更, 用户在其它设备改了也能同步
    const deviceId = getDeviceId();
    const ch = supabase
      .channel(`alerts_${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_thresholds',
          filter: `device_id=eq.${deviceId}`,
        },
        () => {
          listMyAlerts().then((a) => {
            alertsRef.current = a;
          });
        },
      )
      .subscribe();

    return () => {
      canceled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  // 每次 rates 变化跑一次比对
  useEffect(() => {
    if (rates.length === 0) return;
    if (alertsRef.current.length === 0) return;

    // 用 updated_at 联合签名去重 (同一组 rate 不重复检测)
    const sig = rates
      .map((r) => `${r.pair}:${r.updatedAt ?? ''}`)
      .sort()
      .join('|');
    if (sig === lastRatesSigRef.current) return;
    lastRatesSigRef.current = sig;

    // 把 ExchangeRate (camelCase) 转回 alert 用的 snake_case 形状
    const ratesByPair = new Map(
      rates.map((r) => [
        r.pair,
        {
          pair: r.pair,
          official_buy: r.official.buy,
          official_sell: r.official.sell,
          street_buy: r.street.buy,
          street_sell: r.street.sell,
          change: r.change,
        },
      ]),
    );

    for (const threshold of alertsRef.current) {
      if (!threshold.enabled) continue;
      const rate = ratesByPair.get(threshold.pair);
      if (!rate) continue;

      const hit = checkOne(threshold, rate);
      if (!hit) continue;

      // 本地触发: 立刻显示通知, 然后写回 last_triggered_at (服务端共享防抖)
      showNotification({
        title: 'Ledger SR',
        body: hit.message,
        tag: `alert-${threshold.id}`,
      }).then((ok) => {
        if (!ok) return;
        // 乐观更新 ref + 写库
        threshold.last_triggered_at = new Date().toISOString();
        supabase
          .from('alert_thresholds')
          .update({ last_triggered_at: threshold.last_triggered_at })
          .eq('id', threshold.id)
          .then(({ error }) => {
            if (error) console.warn('[alerts] update last_triggered_at failed:', error.message);
          });
      });
    }
  }, [rates]);
}
