"use client"

import { useEffect, useState } from "react"
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReChartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { formatCurrency } from "@/lib/calculations"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, Calendar, Landmark } from "lucide-react"

interface HistoryPoint {
  label: string
  patrimonio: number
  aporte: number
  dividendos: number
}

interface HistorySummary {
  totalAporte: number
  totalDividendos: number
  rentabilidade: number
}

export function PortfolioHistoryCharts() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month")
  const [data, setData] = useState<HistoryPoint[]>([])
  const [summary, setSummary] = useState<HistorySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/portfolio/history?period=${period}`)
        if (res.ok) {
          const json = await res.json()
          setData(json.history || [])
          setSummary(json.summary || null)
        }
      } catch (err) {
        console.error("Erro ao carregar dados do gráfico:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [period])

  const isRentabilidadePositiva = summary ? summary.rentabilidade >= 0 : true

  // Formatação de valores para os eixos e tooltips
  const formatYAxis = (tick: number) => {
    if (tick >= 1000000) return `R$ ${(tick / 1000000).toFixed(1)}M`
    if (tick >= 1000) return `R$ ${(tick / 1000).toFixed(0)}k`
    return `R$ ${tick}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1.5">
          <p className="font-semibold border-b border-border pb-1 mb-1 text-foreground">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}:
              </span>
              <span className="font-bold text-foreground">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
        <div className="h-[280px] bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
            <Calendar size={18} className="text-primary" /> Histórico da Carteira
          </h3>
          <p className="text-xs text-muted-foreground">Evolução do patrimônio e distribuição de aportes e dividendos</p>
        </div>
        <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-muted/30">
          <Button
            onClick={() => setPeriod("week")}
            variant={period === "week" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs px-3 h-7 rounded-md"
          >
            Semanal
          </Button>
          <Button
            onClick={() => setPeriod("month")}
            variant={period === "month" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs px-3 h-7 rounded-md"
          >
            Mensal
          </Button>
          <Button
            onClick={() => setPeriod("year")}
            variant={period === "year" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs px-3 h-7 rounded-md"
          >
            Anual
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Landmark size={14} className="text-blue-500" /> Aportes no Período
            </span>
            <div className="text-lg font-bold text-foreground">{formatCurrency(summary.totalAporte)}</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign size={14} className="text-green-500" /> Dividendos no Período
            </span>
            <div className="text-lg font-bold text-foreground">{formatCurrency(summary.totalDividendos)}</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {isRentabilidadePositiva ? (
                <TrendingUp size={14} className="text-green-500" />
              ) : (
                <TrendingDown size={14} className="text-red-500" />
              )}
              Rentabilidade no Período (P&L)
            </span>
            <div
              className={`text-lg font-bold ${
                isRentabilidadePositiva ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(summary.rentabilidade)}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico Composto */}
      {data.length > 0 ? (
        <div className="w-full text-xs">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" stroke="currentColor" className="text-muted-foreground opacity-60" />
              <YAxis
                tickFormatter={formatYAxis}
                stroke="currentColor"
                className="text-muted-foreground opacity-60"
              />
              <ReChartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" />
              
              {/* Barras de Aportes */}
              <Bar
                name="Aporte no Período"
                dataKey="aporte"
                barSize={16}
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
              />

              {/* Barras de Dividendos */}
              <Bar
                name="Dividendos no Período"
                dataKey="dividendos"
                barSize={16}
                fill="#10b981"
                radius={[2, 2, 0, 0]}
              />

              {/* Linha de Patrimônio */}
              <Line
                name="Patrimônio Total"
                type="monotone"
                dataKey="patrimonio"
                stroke="#eab308"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 1.5, fill: "#1e1e24" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-xs">
          Nenhuma movimentação no período para desenhar o gráfico.
        </div>
      )}
    </div>
  )
}
