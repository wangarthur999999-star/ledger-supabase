// Profile 数据存储：localStorage（客户端本地，不走数据库）
//
// 历史背景：原本使用 Supabase user_profiles 表，但由于当前没有接入
// Supabase Auth，RLS policy (auth.uid() = id) 永远为 false，导致
// PGRST116 错误。这些设置本质上是本地偏好（语言、主题、通知开关等），
// 不需要跨设备同步，因此改用 localStorage。
//
// 未来如果接入 Supabase Auth，可以把这里的实现换回 supabase 客户端，
// caller (SettingsContext / SettingsView) 无需改动。

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  language: string;
  dark_mode: boolean;
  rate_alerts: boolean;
  folder_alerts: boolean;
}

const STORAGE_KEY = 'ledger_suriname_profile_v1';

const DEFAULT_PROFILE: UserProfile = {
  id: 'local',
  display_name: '',
  email: '',
  phone: '',
  avatar_url: '',
  language: 'NL',
  dark_mode: false,
  rate_alerts: false,
  folder_alerts: false,
};

function readStorage(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    // 用默认值兜底缺失字段，但不用假数据填充 display_name/email/phone 等用户输入
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch (error) {
    console.error('Error reading profile from localStorage:', error);
    return { ...DEFAULT_PROFILE };
  }
}

function writeStorage(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error writing profile to localStorage:', error);
    throw error;
  }
}

export async function fetchProfile(): Promise<UserProfile | null> {
  // 保持 Promise 签名兼容原 API；localStorage 本身是同步的
  return readStorage();
}

export async function updateProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const current = readStorage();
    const merged: UserProfile = { ...current, ...updates };
    writeStorage(merged);
    return merged;
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
}
