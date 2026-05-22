// Locales index.
// NL 是 source of truth: TKey 类型 = NL 的所有 key 的 union, 任何新加的 key
// 必须先在 nl.ts 里加, 这样 t() 调用方拿到的就是完整且强校验过的 key 集合。
// EN (或未来其他语言) 缺 key 时, t() 会 fallback 到 NL, 不会编译失败,
// 翻译过程因此可以增量做。

import nl from './nl';
import en from './en';

export type Lang = 'NL' | 'EN';

export type TKey = keyof typeof nl;

// 注意: en 的类型故意不约束为 Record<TKey, string>, 允许 EN 缺 key,
// 让翻译可以增量。运行时由 t() 的 fallback 兜底。
export const translations: Record<Lang, Partial<Record<TKey, string>> & Record<string, string>> = {
  NL: nl,
  EN: en,
};
