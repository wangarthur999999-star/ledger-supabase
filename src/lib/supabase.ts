import { createClient } from '@supabase/supabase-js';

// 关键: 生产环境缺 env 时必须 throw, 否则会用占位 URL 静默失败,
// 用户只看到 "Failed to load" 但没人知道是配置漏了。
// 开发环境(npm run dev)允许 fallback, 方便不连 Supabase 也能渲染 UI。

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in .env.local (dev) or your deploy provider (prod).';
  if (import.meta.env.PROD) {
    throw new Error(msg);
  }
  console.warn(`[supabase] ${msg} Using placeholder client (dev only).`);
}

// auth 三个开关全关:
//   - 这个 app 没接 Supabase Auth, anon key 是匿名公共访问。
//   - 默认行为会向 localStorage 写 sb-* token, 起后台 setInterval 自动刷新 token
//     (耗电), 还会监听 URL fragment 解析 OAuth 回调。我们都不需要。
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
