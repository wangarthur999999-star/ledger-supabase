import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { readProfileSync, updateProfile } from '../api/profile';
import { translations, type Lang, type TKey } from '../locales';

export type { TKey } from '../locales';

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? `{${key}}` : String(v);
  });
}

interface SettingsContextType {
  language: Lang;
  locale: string;
  setLanguage: (lang: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  /**
   * 复数选择辅助:
   *   tp(['time.dayAgo', 'time.daysAgo'], 1) -> "1 day ago"
   *   tp(['time.dayAgo', 'time.daysAgo'], 5) -> "5 days ago"
   * 比每次在 caller 写 (n === 1 ? 'singular' : 'plural') 干净。
   * 命名: tp = "t plural"。
   * 不引 i18next/format.js 的 ICU MessageFormat, 因为 NL/EN 只有简单的 1 / n 二分。
   */
  tp: (keys: readonly [TKey, TKey], count: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// 同步读取语言: localStorage 是同步 API, 没必要走 useEffect/async。
// 这样消除首次渲染的 NL -> EN 闪烁 (FOUC)。
// readProfileSync 共享 api/profile.ts 里的 STORAGE_KEY, 不再各自字面量重复。
function getInitialLanguage(): Lang {
  return readProfileSync().language;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(getInitialLanguage);

  const setLanguage = useCallback((lang: Lang) => {
    setLanguageState(lang);
    // fire-and-forget: 写库失败不应阻塞 UI 切换
    updateProfile({ language: lang }).catch((err) =>
      console.warn('[settings] persist language failed', err),
    );
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>): string => {
      const dict = translations[language];
      // 翻译缺失时的 fallback 链: 当前语言 -> NL -> key 字面量
      const template =
        (dict as Record<string, string>)[key] ??
        (translations.NL as Record<string, string>)[key] ??
        key;
      return interpolate(template, vars);
    },
    [language],
  );

  const tp = useCallback(
    (keys: readonly [TKey, TKey], count: number): string => {
      // 索引 0 = singular (n === 1), 索引 1 = plural (其他)
      // NL/EN 都用 same rule; 如果将来支持 Polish/Russian 等更复杂规则, 这里扩展。
      const key = count === 1 ? keys[0] : keys[1];
      return t(key, { n: count });
    },
    [t],
  );

  const locale = language === 'NL' ? 'nl-NL' : 'en-US';

  // useMemo: 防止每次 SettingsProvider 重新 render 都创建新 value 对象,
  // 让所有用 useSettings() 的子组件被迫重渲。
  const value = useMemo<SettingsContextType>(
    () => ({ language, locale, setLanguage, t, tp }),
    [language, locale, setLanguage, t, tp],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
