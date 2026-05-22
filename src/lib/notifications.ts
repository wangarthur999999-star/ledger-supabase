// 通知抽象层。运行环境检测:
//   - Capacitor (Android APK) → @capacitor/local-notifications
//   - Web (浏览器) → Notification API
//   - 都不支持 → no-op + 返回 'unsupported'
//
// Capacitor 插件是 optional dependency: 没装的话 dynamic import 会失败,
// 回落到 'unsupported'。这样 web build 不强制带 capacitor 代码。

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

type Platform = 'capacitor' | 'web' | 'none';

function detectPlatform(): Platform {
  // Capacitor 注入了全局 (window as any).Capacitor
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) return 'capacitor';
  if (typeof Notification !== 'undefined') return 'web';
  return 'none';
}

let cachedPlatform: Platform | null = null;
function platform(): Platform {
  if (cachedPlatform === null) cachedPlatform = detectPlatform();
  return cachedPlatform;
}

export async function getPermission(): Promise<PermissionStatus> {
  switch (platform()) {
    case 'capacitor': {
      try {
        const mod = await import('@capacitor/local-notifications');
        const status = await mod.LocalNotifications.checkPermissions();
        return status.display as PermissionStatus;
      } catch {
        return 'unsupported';
      }
    }
    case 'web':
      return Notification.permission as PermissionStatus;
    default:
      return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionStatus> {
  switch (platform()) {
    case 'capacitor': {
      try {
        const mod = await import('@capacitor/local-notifications');
        const result = await mod.LocalNotifications.requestPermissions();
        return result.display as PermissionStatus;
      } catch {
        return 'unsupported';
      }
    }
    case 'web': {
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      const result = await Notification.requestPermission();
      return result as PermissionStatus;
    }
    default:
      return 'unsupported';
  }
}

export interface ShowOptions {
  title: string;
  body: string;
  /** 同 tag 的通知会被替换, 避免堆积 */
  tag?: string;
}

export async function showNotification(opts: ShowOptions): Promise<boolean> {
  if ((await getPermission()) !== 'granted') return false;

  switch (platform()) {
    case 'capacitor': {
      try {
        const mod = await import('@capacitor/local-notifications');
        await mod.LocalNotifications.schedule({
          notifications: [
            {
              // Capacitor 要求 id 是数字, 用 tag hash 或时间戳
              id: Math.floor(Date.now() / 1000) % 2_000_000_000,
              title: opts.title,
              body: opts.body,
              // schedule.at 不传 = 立即触发
            },
          ],
        });
        return true;
      } catch (err) {
        console.warn('[notifications] capacitor failed:', err);
        return false;
      }
    }
    case 'web': {
      try {
        new Notification(opts.title, {
          body: opts.body,
          tag: opts.tag,
        });
        return true;
      } catch (err) {
        console.warn('[notifications] web failed:', err);
        return false;
      }
    }
    default:
      return false;
  }
}

export function isSupported(): boolean {
  return platform() !== 'none';
}
