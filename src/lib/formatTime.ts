// 把 ISO 时间戳格式化为荷兰语相对时间描述。
// 用于显示数据新鲜度（"zojuist" / "5 minuten geleden" / "2 uur geleden" / ...）。
//
// 如果时间戳 undefined 或超过 48 小时，返回警告字符串。
// 这一判断阈值可按需调整。

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const STALE_THRESHOLD = 48 * HOUR;

export interface FormattedTime {
  text: string;
  isStale: boolean;
}

export function formatRelativeTime(
  isoTimestamp: string | undefined | null,
  now: Date = new Date()
): FormattedTime {
  if (!isoTimestamp) {
    return { text: 'Onbekend', isStale: true };
  }

  const then = new Date(isoTimestamp);
  if (Number.isNaN(then.getTime())) {
    return { text: 'Onbekend', isStale: true };
  }

  const diff = now.getTime() - then.getTime();

  // 未来时间（时钟偏差或数据异常）—— 当作刚刚
  if (diff < 0) {
    return { text: 'zojuist', isStale: false };
  }

  const isStale = diff > STALE_THRESHOLD;

  let text: string;
  if (diff < MINUTE) {
    text = 'zojuist';
  } else if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    text = `${mins} ${mins === 1 ? 'minuut' : 'minuten'} geleden`;
  } else if (diff < DAY) {
    const hrs = Math.floor(diff / HOUR);
    text = `${hrs} ${hrs === 1 ? 'uur' : 'uur'} geleden`;
  } else {
    const days = Math.floor(diff / DAY);
    text = `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`;
  }

  return { text, isStale };
}
