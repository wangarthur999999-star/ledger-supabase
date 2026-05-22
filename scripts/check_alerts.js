// scripts/check_alerts.js
//
// 在 update_rates.js 跑完后由 GitHub Actions 调用。读 alert_thresholds 表,
// 对每条订阅检查是否触发, 触发则:
//   - 有 push_endpoint (Web Push): 调 web-push 发推送
//   - 无 push_endpoint (Capacitor 本地通知): 不在这里发, 客户端 app 启动时
//     自己拉 alert_thresholds + 当前 rates 比对
//
// 总之: 这个脚本只处理 server-push 路径。Capacitor 路径完全靠客户端检测,
// 因为 Capacitor 没有 push 服务端 (不接 FCM 就只能用本地通知)。
//
// 触发后写 last_triggered_at = now(), 同一订阅 24h 内不重复推送 (防抖)。
//
// 环境变量:
//   SUPABASE_URL                必填
//   SUPABASE_SERVICE_ROLE_KEY   必填
//   VAPID_PUBLIC_KEY            可选, 没配的话跳过 web-push 步骤 (干跑模式)
//   VAPID_PRIVATE_KEY           可选
//   VAPID_SUBJECT               可选, mailto: 联系人, web-push 协议必填字段
//   DRY_RUN                     "1" 时只打印不写库不发推送

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const DRY_RUN = process.env.DRY_RUN === '1';

const DEBOUNCE_HOURS = 24;

function requireEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return supabase;
}

/**
 * 判断单条阈值是否触发。
 * @returns {{ triggered: boolean, observedValue: number | null, message: string | null }}
 */
export function evaluateThreshold(threshold, rate) {
  // compare_field 在 rate 里的字段名: official_buy / street_buy / ...
  // rate 是 exchange_rates 表的一行 (snake_case)
  const observed = rate[threshold.compare_field];
  if (!Number.isFinite(Number(observed))) {
    return { triggered: false, observedValue: null, message: null };
  }
  const v = Number(observed);
  const t = Number(threshold.threshold_value);

  switch (threshold.threshold_kind) {
    case 'above':
      if (v >= t) {
        return {
          triggered: true,
          observedValue: v,
          message: `${threshold.pair} ${threshold.compare_field} = ${v.toFixed(2)} (≥ ${t})`,
        };
      }
      break;
    case 'below':
      if (v <= t) {
        return {
          triggered: true,
          observedValue: v,
          message: `${threshold.pair} ${threshold.compare_field} = ${v.toFixed(2)} (≤ ${t})`,
        };
      }
      break;
    case 'change': {
      // change 字段是百分比, 绝对值比较
      const pct = Math.abs(Number(rate.change ?? 0));
      if (pct >= t) {
        return {
          triggered: true,
          observedValue: pct,
          message: `${threshold.pair} moved ${pct.toFixed(2)}% (≥ ${t}%)`,
        };
      }
      break;
    }
    default:
      // 不认识的 kind, 不触发
      break;
  }
  return { triggered: false, observedValue: null, message: null };
}

function withinDebounce(lastTriggeredIso) {
  if (!lastTriggeredIso) return false;
  const diff = Date.now() - new Date(lastTriggeredIso).getTime();
  return diff < DEBOUNCE_HOURS * 60 * 60 * 1000;
}

async function sendWebPush(threshold, message) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    console.log(`   ⏭️  跳过 web-push (VAPID 三件套未完整配置): ${message}`);
    return false;
  }
  if (!threshold.push_endpoint || !threshold.push_p256dh || !threshold.push_auth) {
    console.log(`   ⏭️  缺 push 凭证, 跳过: ${threshold.id}`);
    return false;
  }
  // 懒加载: web-push 是个 ~150KB 的可选依赖, 没 VAPID 就不引
  const webPush = (await import('web-push')).default;
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const subscription = {
    endpoint: threshold.push_endpoint,
    keys: { p256dh: threshold.push_p256dh, auth: threshold.push_auth },
  };
  const payload = JSON.stringify({
    title: 'Ledger SR',
    body: message,
    tag: `alert-${threshold.id}`,
  });

  try {
    await webPush.sendNotification(subscription, payload);
    return true;
  } catch (err) {
    // 410 Gone / 404 = 用户取消订阅, 清理之
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`   🗑️  endpoint 失效 (${err.statusCode}), 删除订阅 ${threshold.id}`);
      await getSupabase().from('alert_thresholds').delete().eq('id', threshold.id);
    } else {
      console.warn(`   ⚠️  web-push 失败 ${threshold.id}: ${err.message}`);
    }
    return false;
  }
}

export async function checkAlerts() {
  requireEnv();
  console.log('🔔 开始检查 alert_thresholds...\n');

  // 拉所有 enabled 的订阅
  const { data: thresholds, error: tErr } = await getSupabase()
    .from('alert_thresholds')
    .select('*')
    .eq('enabled', true);
  if (tErr) throw new Error(`Failed to fetch thresholds: ${tErr.message}`);
  if (!thresholds || thresholds.length === 0) {
    console.log('   (无启用的订阅)');
    return { checked: 0, triggered: 0, pushed: 0 };
  }
  console.log(`   ${thresholds.length} 条订阅, 加载当前汇率...`);

  // 拉所有当前汇率, 按 pair 索引
  const { data: rates, error: rErr } = await getSupabase()
    .from('exchange_rates')
    .select('*');
  if (rErr) throw new Error(`Failed to fetch rates: ${rErr.message}`);
  const ratesByPair = new Map((rates ?? []).map((r) => [r.pair, r]));

  let triggered = 0;
  let pushed = 0;

  for (const threshold of thresholds) {
    const rate = ratesByPair.get(threshold.pair);
    if (!rate) {
      console.warn(`   ⚠️  pair "${threshold.pair}" 无对应汇率, 跳过`);
      continue;
    }
    if (withinDebounce(threshold.last_triggered_at)) {
      continue;
    }
    const { triggered: t, message } = evaluateThreshold(threshold, rate);
    if (!t) continue;

    triggered++;
    console.log(`   🔔 triggered: ${message}`);

    if (DRY_RUN) {
      console.log(`      [DRY_RUN] 不发推送, 不写 last_triggered_at`);
      continue;
    }

    // Web Push (有 endpoint 才发)
    if (threshold.push_endpoint) {
      const ok = await sendWebPush(threshold, message);
      if (ok) pushed++;
    } else {
      console.log(`      (capacitor 路径: 客户端自己检测, 不在这里推)`);
    }

    // 不管推送成不成功, 都标记触发时间, 避免反复尝试
    const { error: uErr } = await getSupabase()
      .from('alert_thresholds')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', threshold.id);
    if (uErr) console.warn(`   ⚠️  更新 last_triggered_at 失败: ${uErr.message}`);
  }

  console.log(`\n📊 ${thresholds.length} checked, ${triggered} triggered, ${pushed} pushed`);
  return { checked: thresholds.length, triggered, pushed };
}

// 直接执行时跑
const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  checkAlerts().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
