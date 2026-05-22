// 客户端 device id, 用作 alert_thresholds 表的 owner 标识。
//
// 没接 Auth 时这是用户身份的唯一识别。生成一次写 localStorage, 后续读取。
// 注意: 用户清缓存或换设备就丢, 重新生成新的 id, 老订阅成为孤儿
// (会被后端 GC 时按 last_triggered_at 极久未触发清理 - 未来事项)。

const KEY = 'ledger_device_id_v1';

function generate(): string {
  // crypto.randomUUID 在 secure context (HTTPS / localhost) 才有, fallback 到手撸
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 简化版 v4 (不是密码学安全, 但作为 ID 足够)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'no-storage';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = generate();
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // 隐私模式 / quota — 用一个 session-only id
    }
  }
  return id;
}
