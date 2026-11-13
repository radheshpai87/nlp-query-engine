"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExecutionResult } from "@/lib/execution-api";

interface ResultChartProps {
  result: ExecutionResult;
}

type ChartType = "bar" | "line" | "donut";

const PALETTE = [
  "#38bdf8", // Sky 400
  "#34d399", // Emerald 400
  "#fbbf24", // Amber 400
  "#a78bfa", // Purple 400
  "#f472b6", // Pink 400
  "#22d3ee", // Cyan 400
  "#fb923c", // Orange 400
  "#818cf8", // Indigo 400
];

export function ResultChart({ result }: ResultChartProps) {
  // 1. Identify Candidate Numeric and Categorical Columns
  const { numericCols, categoricalCols } = useMemo(() => {
    if (!result.rows || result.rows.length === 0) {
      return { numericCols: [], categoricalCols: [] };
    }

    const firstRow = result.rows[0];
    const numCols: string[] = [];
    const catCols: string[] = [];

    result.columns.forEach((col) => {
      const val = firstRow[col.name];
      const isNum =
        typeof val === "number" ||
        ["numeric", "integer", "float", "double", "int", "decimal"].some((t) =>
          col.data_type.toLowerCase().includes(t)
        );

      if (isNum) {
        numCols.push(col.name);
      } else {
        catCols.push(col.name);
      }
    });

    return { numericCols: numCols, categoricalCols: catCols };
  }, [result]);

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [selectedDimension, setSelectedDimension] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Derive active dimension and metric safely
  const activeDimension =
    selectedDimension && categoricalCols.includes(selectedDimension)
      ? selectedDimension
      : categoricalCols[0] || (result.columns[0] ? result.columns[0].name : "");

  const activeMetric =
    selectedMetric && numericCols.includes(selectedMetric)
      ? selectedMetric
      : numericCols[0] || "";

  // 2. Prepare Aggregated Chart Series
  const chartData = useMemo(() => {
    if (!activeMetric || !activeDimension || result.rows.length === 0) {
      return [];
    }

    const aggregated = new Map<string, number>();

    for (const row of result.rows) {
      const rawDim = row[activeDimension];
      const dimLabel = rawDim !== null && rawDim !== undefined ? String(rawDim) : "(Empty)";
      const rawVal = Number(row[activeMetric]);
      const val = isNaN(rawVal) ? 0 : rawVal;

      aggregated.set(dimLabel, (aggregated.get(dimLabel) || 0) + val);
    }

    // Limit to top 10 items sorted descending by value
    const sorted = Array.from(aggregated.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return sorted;
  }, [result.rows, activeDimension, activeMetric]);

  // Statistics
  const { totalSum, average, maxValue } = useMemo(() => {
    if (chartData.length === 0) return { totalSum: 0, average: 0, maxValue: 1 };
    const sum = chartData.reduce((acc, curr) => acc + curr.value, 0);
    const avg = sum / chartData.length;
    const max = Math.max(...chartData.map((d) => d.value), 1);
    return { totalSum: sum, average: avg, maxValue: max };
  }, [chartData]);

  if (numericCols.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground bg-card/40">
        <SlidersHorizontal className="h-5 w-5 mx-auto mb-2 text-muted-foreground/60" />
        <p className="font-medium text-foreground">No numeric metrics detected</p>
        <p className="mt-1">
          Visual charting requires at least one numeric column (e.g., price, revenue, quantity).
        </p>
      </div>
    );
  }

  // Dimension & Metric Selector & Controls
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm space-y-4 p-4 text-foreground">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
            <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
            <span>Interactive Chart</span>
          </Badge>

          {/* Chart Type Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                chartType === "bar"
                  ? "bg-sky-600 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Bar</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                chartType === "line"
                  ? "bg-sky-600 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Line Chart"
            >
              <LineChart className="h-3.5 w-3.5" />
              <span>Line</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType("donut")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                chartType === "donut"
                  ? "bg-sky-600 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Donut Chart"
            >
              <PieChart className="h-3.5 w-3.5" />
              <span>Donut</span>
            </button>
          </div>
        </div>

        {/* Dimension & Metric Selectors */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Dimension:</span>
            <select
              value={activeDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="bg-muted/50 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            >
              {categoricalCols.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Metric:</span>
            <select
              value={activeMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-muted/50 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
            >
              {numericCols.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-muted/30 border border-border p-2">
          <span className="text-[10px] text-muted-foreground block">Total Sum</span>
          <span className="text-sm font-semibold font-mono text-sky-400">
            {totalSum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="rounded-lg bg-muted/30 border border-border p-2">
          <span className="text-[10px] text-muted-foreground block">Average</span>
          <span className="text-sm font-semibold font-mono text-emerald-400">
            {average.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="rounded-lg bg-muted/30 border border-border p-2">
          <span className="text-[10px] text-muted-foreground block">Peak ({chartData[0]?.label || "N/A"})</span>
          <span className="text-sm font-semibold font-mono text-amber-400">
            {maxValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="rounded-lg bg-muted/30 border border-border p-2">
          <span className="text-[10px] text-muted-foreground block">Distinct Items</span>
          <span className="text-sm font-semibold font-mono text-purple-400">
            {chartData.length}
          </span>
        </div>
      </div>

      {/* SVG Chart Render Canvas */}
      <div className="relative w-full h-64 flex items-center justify-center pt-2">
        {chartType === "bar" && (
          <RenderBarChart
            data={chartData}
            maxValue={maxValue}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
        )}

        {chartType === "line" && (
          <RenderLineChart
            data={chartData}
            maxValue={maxValue}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
        )}

        {chartType === "donut" && (
          <RenderDonutChart
            data={chartData}
            totalSum={totalSum}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
        )}
      </div>

      {/* Hover Inspection Callout */}
      {hoveredIndex !== null && chartData[hoveredIndex] && (
        <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-200">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PALETTE[hoveredIndex % PALETTE.length] }}
            />
            <span className="font-semibold">{chartData[hoveredIndex].label}</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>
              {chartData[hoveredIndex].value.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-sky-400/80 text-[11px]">
              {totalSum > 0
                ? `${((chartData[hoveredIndex].value / totalSum) * 100).toFixed(1)}%`
                : "0%"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-renderer: Bar Chart
// -----------------------------------------------------------------------------
function RenderBarChart({
  data,
  maxValue,
  hoveredIndex,
  onHover,
}: {
  data: Array<{ label: string; value: number }>;
  maxValue: number;
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
}) {
  const chartHeight = 200;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;
  const barWidth = Math.max(14, Math.min(36, usableWidth / data.length - 8));

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="w-full h-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Horizontal Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
        const y = paddingY + usableHeight * (1 - pct);
        return (
          <g key={idx}>
            <line
              x1={paddingX}
              y1={y}
              x2={chartWidth - paddingX}
              y2={y}
              stroke="currentColor"
              className="text-border/40"
              strokeDasharray={pct === 0 ? "none" : "3 3"}
              strokeWidth="1"
            />
            <text
              x={paddingX - 6}
              y={y + 3}
              textAnchor="end"
              className="text-[9px] fill-muted-foreground/70 font-mono"
            >
              {(maxValue * pct).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, idx) => {
        const barHeight = maxValue > 0 ? (d.value / maxValue) * usableHeight : 0;
        const x =
          paddingX +
          (idx * usableWidth) / data.length +
          (usableWidth / data.length - barWidth) / 2;
        const y = paddingY + usableHeight - barHeight;
        const color = PALETTE[idx % PALETTE.length];
        const isHovered = hoveredIndex === idx;

        return (
          <g
            key={idx}
            className="cursor-pointer transition-all duration-150"
            onMouseEnter={() => onHover(idx)}
            onMouseLeave={() => onHover(null)}
          >
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(2, barHeight)}
              rx="4"
              fill={color}
              opacity={hoveredIndex === null || isHovered ? 0.9 : 0.4}
              className="transition-opacity"
            />
            {/* Value Label on top of bar */}
            {isHovered && (
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-[10px] font-bold fill-foreground font-mono"
              >
                {d.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </text>
            )}
            {/* Category label at bottom */}
            <text
              x={x + barWidth / 2}
              y={chartHeight - 6}
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground/80 font-medium"
            >
              {d.label.length > 8 ? `${d.label.slice(0, 7)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Sub-renderer: Line / Area Chart
// -----------------------------------------------------------------------------
function RenderLineChart({
  data,
  maxValue,
  hoveredIndex,
  onHover,
}: {
  data: Array<{ label: string; value: number }>;
  maxValue: number;
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
}) {
  const chartHeight = 200;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * usableWidth;
    const y = paddingY + usableHeight - (d.value / Math.max(1, maxValue)) * usableHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${paddingY + usableHeight} L ${
          points[0].x
        } ${paddingY + usableHeight} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="w-full h-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {[0, 0.33, 0.66, 1].map((pct, idx) => {
        const y = paddingY + usableHeight * (1 - pct);
        return (
          <line
            key={idx}
            x1={paddingX}
            y1={y}
            x2={chartWidth - paddingX}
            y2={y}
            stroke="currentColor"
            className="text-border/30"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        );
      })}

      {/* Area under curve */}
      {areaD && <path d={areaD} fill="url(#areaGradient)" />}

      {/* Line path */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Data points */}
      {points.map((pt, idx) => {
        const isHovered = hoveredIndex === idx;
        return (
          <g
            key={idx}
            className="cursor-pointer"
            onMouseEnter={() => onHover(idx)}
            onMouseLeave={() => onHover(null)}
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isHovered ? 6 : 4}
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2"
              className="transition-all"
            />
            {isHovered && (
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                className="text-[10px] font-bold fill-sky-300 font-mono"
              >
                {pt.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </text>
            )}
            <text
              x={pt.x}
              y={chartHeight - 6}
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground font-medium"
            >
              {pt.label.length > 7 ? `${pt.label.slice(0, 6)}…` : pt.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Sub-renderer: Donut / Pie Chart
// -----------------------------------------------------------------------------
function computeDonutSegments(
  data: Array<{ label: string; value: number }>,
  totalSum: number,
  size: number
) {
  const center = size / 2;
  const radius = 80;
  const innerRadius = 50;

  const results = [];
  let angle = -Math.PI / 2;

  for (let idx = 0; idx < data.length; idx++) {
    const d = data[idx];
    const angleSpan = totalSum > 0 ? (d.value / totalSum) * 2 * Math.PI : 0;
    const startAngle = angle;
    const endAngle = angle + angleSpan;
    angle = endAngle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = angleSpan > Math.PI ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;

    results.push({
      pathData,
      color: PALETTE[idx % PALETTE.length],
      label: d.label,
      value: d.value,
      pct: totalSum > 0 ? (d.value / totalSum) * 100 : 0,
    });
  }

  return results;
}

function RenderDonutChart({
  data,
  totalSum,
  hoveredIndex,
  onHover,
}: {
  data: Array<{ label: string; value: number }>;
  totalSum: number;
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
}) {
  const size = 220;
  const segments = useMemo(
    () => computeDonutSegments(data, totalSum, size),
    [data, totalSum, size]
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <path
                key={idx}
                d={seg.pathData}
                fill={seg.color}
                opacity={hoveredIndex === null || isHovered ? 0.95 : 0.45}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => onHover(idx)}
                onMouseLeave={() => onHover(null)}
              />
            );
          })}
        </svg>

        {/* Center Total / Active Summary */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {hoveredIndex !== null && data[hoveredIndex]
              ? data[hoveredIndex].label
              : "Total"}
          </span>
          <span className="text-sm font-bold font-mono text-foreground">
            {hoveredIndex !== null && data[hoveredIndex]
              ? data[hoveredIndex].value.toLocaleString(undefined, { maximumFractionDigits: 1 })
              : totalSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-2 text-xs">
        {data.map((d, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-colors ${
              hoveredIndex === idx ? "bg-muted/60" : "hover:bg-muted/30"
            }`}
            onMouseEnter={() => onHover(idx)}
            onMouseLeave={() => onHover(null)}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
            />
            <span className="truncate max-w-[120px] text-foreground font-medium">
              {d.label}
            </span>
            <span className="text-muted-foreground font-mono ml-auto">
              {totalSum > 0 ? `${((d.value / totalSum) * 100).toFixed(0)}%` : "0%"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
