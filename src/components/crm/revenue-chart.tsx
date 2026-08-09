"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { revenueTrend } from "@/lib/data";

interface RevenueChartProps {
  data?: Array<{ day: string; revenue: number; leads: number }>;
  color?: string;
  sourceName?: string | null;
}

export function RevenueChart({
  data = revenueTrend,
  color = "#f5a524",
  sourceName,
}: RevenueChartProps) {
  const gradientId = `revFill-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e3e6ee" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#8991a3", fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#8991a3", fontFamily: "var(--font-mono)" }}
          tickFormatter={(v) => `₹${v / 1000}k`}
          width={44}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e3e6ee",
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            boxShadow: "0 4px 14px rgba(18,23,43,0.08)",
          }}
          formatter={(value) => [
            `₹${Number(value).toLocaleString("en-IN")}`,
            sourceName ? `Revenue (${sourceName})` : "Revenue",
          ]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
