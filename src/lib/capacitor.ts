// Capacitor 平台初始化:
//   - StatusBar: 设置成 light content (深色背景 + 白色 icon/text), 跟 primary 色对齐
//   - 仅在 Capacitor 原生环境运行; web 完全跳过 (dynamic import 失败即返回)

let initialized = false;

export async function initCapacitor(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // 检测是否在 Capacitor 原生 (Android/iOS) 内
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (!w.Capacitor?.isNativePlatform?.()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // primary 色是深绿 #004532, status bar 用 Style.Light = 浅色文字 (白色)
    // 在 Android 这映射到 light icons
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#004532' });
  } catch (err) {
    console.warn('[capacitor] status bar init failed', err);
  }
}
