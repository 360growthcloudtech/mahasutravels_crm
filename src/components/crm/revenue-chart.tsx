"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const SOURCE_SERIES = [
  { key: "Google Ads", color: "#f5a524" },
  { key: "Meta Ads", color: "#8b5cf6" },
  { key: "Website", color: "#0d9488" },
  { key: "Manual", color: "#64748b" },
] as const;

export type RevenueTrendPoint = {
  day: string;
  date?: string;
  revenue: number;
  leads?: number;
  "Google Ads"?: number;
  "Meta Ads"?: number;
  Website?: number;
  Manual?: number;
};

interface RevenueChartProps {
  data?: RevenueTrendPoint[];
  color?: string;
  sourceName?: string | null;
}

export function RevenueChart({
  data = [],
  color = "#f5a524",
  sourceName,
}: RevenueChartProps) {
  const showAllSources = !sourceName;
  const series = showAllSources
    ? SOURCE_SERIES
    : SOURCE_SERIES.filter((s) => s.key === sourceName);
  const activeSeries = series.length ? series : [{ key: "revenue" as const, color }];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {activeSeries.map((s) => (
            <linearGradient key={s.key} id={`revFill-${s.key.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--slate-soft)", fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--slate-soft)", fontFamily: "var(--font-mono)" }}
          tickFormatter={(v) => `₹${v / 1000}k`}
          width={44}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--ink-text)",
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            boxShadow: "0 4px 14px rgba(18,23,43,0.08)",
          }}
          formatter={(value, name) => [
            `₹${Number(value).toLocaleString("en-IN")}`,
            String(name),
          ]}
        />
        {showAllSources ? (
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
          />
        ) : null}
        {activeSeries.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key === "revenue" ? "revenue" : s.key}
            name={s.key === "revenue" ? sourceName || "Revenue" : s.key}
            stroke={s.color}
            strokeWidth={2.5}
            fill={`url(#revFill-${s.key.replace(/\s+/g, "")})`}
            stackId={showAllSources ? undefined : "one"}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
