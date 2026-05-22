import { useMemo, useRef, useState } from 'react';
import type { PriceHistoryPoint } from '../api/priceHistory';

interface SparklineProps {
  data: PriceHistoryPoint[];
  width?: number;
  height?: number;
  /** 'up' = 绿, 'down' = 红, 'neutral' = 灰; 由 caller 根据涨跌方向决定 */
  tone?: 'up' | 'down' | 'neutral';
  /** 是否填充曲线下方的区域 */
  fill?: boolean;
  /** locale 用来格式化 tooltip 里的日期/数字; 默认 en-US */
  locale?: string;
}

const TONE_COLORS: Record<NonNullable<SparklineProps['tone']>, { stroke: string; fill: string }> = {
  up:      { stroke: '#10b981', fill: '#10b98115' },
  down:    { stroke: '#ef4444', fill: '#ef444415' },
  neutral: { stroke: '#9ca3af', fill: '#9ca3af15' },
};

const VB_W = 100;
const VB_H = 100;
const PAD_Y = 8;

/**
 * 极简 SVG sparkline + 触摸/鼠标 tooltip。0 第三方依赖。
 *
 * Tooltip 交互:
 *   - 鼠标 hover / 触摸拖动显示
 *   - 找最近的数据点 (按 x 坐标), 显示价格和日期
 *   - 移开 / pointer up 关掉
 *
 * 视觉:
 *   - viewBox 让 SVG 自动缩放
 *   - preserveAspectRatio="none" 让线占满容器
 */
export default function Sparkline({
  data,
  width,
  height = 32,
  tone = 'neutral',
  fill = true,
  locale = 'en-US',
}: SparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { points, strokePath, fillPath } = useMemo(() => {
    if (data.length === 0) return { points: [], strokePath: '', fillPath: '' };

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const points = data.map((d, i) => {
      const x = data.length === 1 ? VB_W / 2 : (i / (data.length - 1)) * VB_W;
      const y = VB_H - PAD_Y - ((d.price - min) / range) * (VB_H - 2 * PAD_Y);
      return { x, y, price: d.price, recorded_at: d.recorded_at };
    });

    const strokePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');

    const fillPath = `${strokePath} L${VB_W},${VB_H} L0,${VB_H} Z`;
    return { points, strokePath, fillPath };
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        style={{ width: width ?? 120, height }}
        className="bg-surface-container-low/40 rounded"
        aria-hidden="true"
      />
    );
  }

  const colors = TONE_COLORS[tone];

  // 把指针坐标映射到最近的数据点 index
  const handlePointer = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    const idx = Math.round(clamped * (data.length - 1));
    setActiveIndex(idx);
  };

  const activePoint = activeIndex !== null ? points[activeIndex] : null;
  const activeDate = activePoint
    ? new Date(activePoint.recorded_at).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  // tooltip 用 absolute 定位在容器上方 (相对于 wrap div)
  const tooltipLeftPct = activePoint ? (activePoint.x / VB_W) * 100 : 0;

  return (
    <div className="relative" style={{ width: width ?? '100%', height }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'mouse') handlePointer(e.clientX);
        }}
        onPointerEnter={(e) => {
          // 鼠标设备 hover 时也显示
          if (e.pointerType === 'mouse') handlePointer(e.clientX);
        }}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          // 触摸结束: 延迟一点关 tooltip, 让用户看一眼
          if (e.pointerType !== 'mouse') {
            setTimeout(() => setActiveIndex(null), 1200);
          }
        }}
      >
        {fill && <path d={fillPath} fill={colors.fill} />}
        <path
          d={strokePath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {activePoint && (
          <>
            <line
              x1={activePoint.x}
              y1={0}
              x2={activePoint.x}
              y2={VB_H}
              stroke={colors.stroke}
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              opacity="0.6"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3"
              fill="#fff"
              stroke={colors.stroke}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
      {activePoint && (
        <div
          className="absolute -top-7 px-2 py-1 rounded-md text-[10px] font-bold bg-on-surface text-white shadow pointer-events-none whitespace-nowrap"
          style={{
            left: `${tooltipLeftPct}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {activePoint.price.toFixed(2)} <span className="opacity-70">· {activeDate}</span>
        </div>
      )}
    </div>
  );
}
