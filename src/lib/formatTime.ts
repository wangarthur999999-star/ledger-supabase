// 把 ISO 时间戳格式化成与 UI 语言一致的相对时间描述。
// 通过依赖注入的方式接收 t 函数, 本身不依赖 React (可在任何地方调用)。
//
// 如果时间戳 undefined 或超过 STALE_THRESHOLD, isStale = true, 调用方通常会用
// 警告色渲染。

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const STALE_THRESHOLD = 48 * HOUR;

export interface FormattedTime {
  text: string;
  isStale: boolean;
}

// t 函数的最小形状, 避免把 formatTime 耦合到 SettingsContext 的具体 TKey 联合类型
type TimeT = (key: string, vars?: Record<string, string | number>) => string;

export function formatRelativeTime(
  isoTimestamp: string | undefined | null,
  t: TimeT,
  now: Date = new Date()
): FormattedTime {
  if (!isoTimestamp) {
    return { text: t('common.unknown'), isStale: true };
  }

  const then = new Date(isoTimestamp);
  if (Number.isNaN(then.getTime())) {
    return { text: t('common.unknown'), isStale: true };
  }

  const diff = now.getTime() - then.getTime();

  if (diff < 0) {
    return { text: t('time.justNow'), isStale: false };
  }

  const isStale = diff > STALE_THRESHOLD;

  let text: string;
  if (diff < MINUTE) {
    text = t('time.justNow');
  } else if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    text = t(mins === 1 ? 'time.minuteAgo' : 'time.minutesAgo', { n: mins });
  } else if (diff < DAY) {
    const hrs = Math.floor(diff / HOUR);
    text = t(hrs === 1 ? 'time.hourAgo' : 'time.hoursAgo', { n: hrs });
  } else {
    const days = Math.floor(diff / DAY);
    text = t(days === 1 ? 'time.dayAgo' : 'time.daysAgo', { n: days });
  }

  return { text, isStale };
}
