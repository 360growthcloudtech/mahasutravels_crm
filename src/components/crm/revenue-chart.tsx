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

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5a524" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f5a524" stopOpacity={0} />
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
          formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#f5a524"
          strokeWidth={2.5}
          fill="url(#revFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
