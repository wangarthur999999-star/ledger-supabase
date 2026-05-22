// Web Push 订阅 helper.
//
// 注册 service worker → 用 VAPID public key 订阅 PushManager → 返回 endpoint/keys
// 上层调用方 (RateAlertsSection) 拿到 endpoint/p256dh/auth 后写进 alert_thresholds 行,
// 这样后端 check_alerts.js (跑在 GitHub Actions) 就能用 web-push 推送。
//
// 这条路径只对 web/PWA 用户工作; Capacitor APK 没有标准 Service Worker, 用本地通知。
// 检测方式: navigator.serviceWorker + PushManager + Notification 三者齐全 → web push 可用。

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '';

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

// Base64URL → Uint8Array (Web Push API 要求的格式)
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Std = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Std);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

let swRegistration: ServiceWorkerRegistration | null = null;

async function ensureSwRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return swRegistration;
  } catch (err) {
    console.warn('[push] sw register failed', err);
    return null;
  }
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** 取得现有订阅, 没有就创建。需要用户已授权通知。 */
export async function subscribeWebPush(): Promise<PushSubscriptionKeys | null> {
  if (!isWebPushSupported()) return null;
  const reg = await ensureSwRegistered();
  if (!reg) return null;

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      // toJSON 在某些浏览器里 key 是 ArrayBuffer, fallback 到 getKey
      const p256dhBuf = sub.getKey('p256dh');
      const authBuf = sub.getKey('auth');
      if (!p256dhBuf || !authBuf) return null;
      return {
        endpoint: sub.endpoint,
        p256dh: arrayBufferToBase64(p256dhBuf),
        auth: arrayBufferToBase64(authBuf),
      };
    }

    return {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    };
  } catch (err) {
    console.warn('[push] subscribe failed', err);
    return null;
  }
}

/** 取消订阅 (sw level), 不影响 alert_thresholds 表里的行 */
export async function unsubscribeWebPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
}
