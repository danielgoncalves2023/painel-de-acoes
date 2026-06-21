"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { PortfolioPosition } from "@/types"
import { formatCurrency } from "@/lib/calculations"

const COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6",
  "#f97316", "#8b5cf6", "#06b6d4", "#84cc16", "#ef4444",
]

interface Props {
  positions: PortfolioPosition[]
}

export function AllocationPieChart({ positions }: Props) {
  if (positions.length === 0) return null

  const data = positions.map((p) => ({
    name: p.ticker,
    value: p.currentValue,
    percent: p.allocationPercent,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          outerRadius={90}
          innerRadius={50}
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend
          formatter={(value, entry) => (
            <span className="text-xs">
              {value} <span className="text-muted-foreground">
                {/* @ts-expect-error recharts payload */}
                {entry.payload?.percent?.toFixed(1)}%
              </span>
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
