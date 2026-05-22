import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arthur.ledger',
  appName: 'Ledger SR',
  webDir: 'dist',
  // android.backgroundColor: 启动时 / WebView 加载完成前的底色, 跟设计 token
  // 的 --color-surface (#f7f9fb) 对齐, 不再闪白。
  android: {
    backgroundColor: '#f7f9fb',
  },
  // 注: 状态栏样式由 Android 主题处理 (android/app/src/main/res/values/styles.xml),
  // 这里不重复声明。如果未来引入 @capacitor/status-bar 插件, 可在这里配 plugins 块。
};

export default config;
