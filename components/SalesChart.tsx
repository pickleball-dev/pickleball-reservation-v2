"use client";

import { useState } from "react";
import { formatPeso } from "@/lib/pricing";

export interface SalesChartPoint {
  label: string;
  amount: number;
}

interface Props {
  data: SalesChartPoint[];
  title?: string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_X = 8;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

/** Dependency-free SVG bar chart. No chart library needed. */
export function SalesChart({ data, title = "Sales, last 14 days" }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.amount));
  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const barGap = 8;
  const barWidth = data.length ? (WIDTH - PADDING_X * 2 - barGap * (data.length - 1)) / data.length : 0;
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ash">{title}</p>
        {hovered && (
          <p className="text-sm font-semibold text-ink">
            {hovered.label} · <span className="text-court">{formatPeso(hovered.amount)}</span>
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={title}>
        <line
          x1={PADDING_X}
          y1={HEIGHT - PADDING_BOTTOM}
          x2={WIDTH - PADDING_X}
          y2={HEIGHT - PADDING_BOTTOM}
          className="stroke-line"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = max > 0 ? (d.amount / max) * chartHeight : 0;
          const x = PADDING_X + i * (barWidth + barGap);
          const y = HEIGHT - PADDING_BOTTOM - barHeight;
          const isHover = hoverIndex === i;
          return (
            <g key={d.label + i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <rect x={x} y={PADDING_TOP} width={barWidth} height={chartHeight} fill="#000" opacity={0} style={{ pointerEvents: "all" }} />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, d.amount > 0 ? 2 : 0)}
                rx={3}
                className={isHover ? "fill-clay transition-colors" : "fill-court transition-colors"}
              />
              <text x={x + barWidth / 2} y={HEIGHT - PADDING_BOTTOM + 16} textAnchor="middle" className="fill-ash text-[10px]">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}