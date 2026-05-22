// Profile 数据存储: localStorage (客户端本地, 不走数据库)
//
// 历史背景: 原本使用 Supabase user_profiles 表, 但由于当前没有接入
// Supabase Auth, RLS policy (auth.uid() = id) 永远为 false, 导致
// PGRST116 错误。这些设置本质上是本地偏好 (语言、主题、通知开关等),
// 不需要跨设备同步, 因此改用 localStorage。
//
// 未来如果接入 Supabase Auth, 把 read/writeStorage 的实现换回 supabase
// 客户端, caller (SettingsContext / SettingsView) 无需改动。

import type { Lang } from '../locales';

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  // 收紧到 Lang union: 之前是 string, TS 不拦截非法值。
  // 旧 localStorage 数据可能含其他值, readStorage 里有校验。
  language: Lang;
  dark_mode: boolean;
  rate_alerts: boolean;
}

// 导出: SettingsContext 也用同一个 key, 避免两处字面量不一致。
export const PROFILE_STORAGE_KEY = 'ledger_suriname_profile_v1';

const DEFAULT_PROFILE: UserProfile = {
  id: 'local',
  display_name: '',
  email: '',
  phone: '',
  avatar_url: '',
  language: 'NL',
  dark_mode: false,
  rate_alerts: false,
};

function normalizeLanguage(raw: unknown): Lang {
  return raw === 'EN' || raw === 'NL' ? raw : 'NL';
}

// 同步读: localStorage 本身是同步的, 暴露这个版本给 SettingsContext 的
// useState 初始化用 (消除 NL -> EN 切换闪烁)。
export function readProfileSync(): UserProfile {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_PROFILE };
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      // 校验 language: 旧数据可能是任意 string, 强制收敛到 Lang
      language: normalizeLanguage(parsed.language),
    };
  } catch (error) {
    console.error('Error reading profile from localStorage:', error);
    return { ...DEFAULT_PROFILE };
  }
}

function writeStorage(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error writing profile to localStorage:', error);
    throw error;
  }
}

export async function fetchProfile(): Promise<UserProfile | null> {
  // 保持 Promise 签名: 未来换回 Supabase 时 caller 不用改
  return readProfileSync();
}

export async function updateProfile(
  updates: Partial<UserProfile>,
): Promise<UserProfile | null> {
  try {
    const current = readProfileSync();
    const merged: UserProfile = {
      ...current,
      ...updates,
      // 即使 caller 传错 language, 也要在写入前过滤
      language: updates.language !== undefined
        ? normalizeLanguage(updates.language)
        : current.language,
    };
    writeStorage(merged);
    return merged;
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
}
