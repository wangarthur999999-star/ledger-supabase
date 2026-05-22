// Ledger SR — Service Worker
//
// 角色:
//   1) 接收 Web Push 推送 (push 事件) → 显示通知
//   2) 通知被点击 → 打开 / 聚焦 app
//
// 注意: 这个文件是从 /public 静态服务的, 不经 Vite 处理。所以:
//   - 不能用 ES module import (除非 sw 注册时声明 type:'module' 且全 ESM)
//   - 用 self.addEventListener, self.registration 等 sw scope API
//
// PWA 缓存 / offline 暂不实现。Capacitor APK 走 cap webview 内置缓存,
// 浏览器 PWA 离线场景可以未来加 (会涉及 cache-first 策略, 不轻松)。

/* global self, clients */

self.addEventListener('push', (event) => {
  // Payload 由 check_alerts.js 用 JSON.stringify({ title, body, tag }) 发出
  let data = { title: 'Ledger SR', body: '', tag: 'alert' };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag, // 同 tag 替换, 避免堆积
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      data: { tag: data.tag },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // 已打开的 app 窗口聚焦; 否则开新窗
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if ('focus' in win) {
          return win.focus();
        }
      }
      return clients.openWindow('/');
    }),
  );
});

// install / activate: 立刻接管, 不等老 sw 关闭
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
