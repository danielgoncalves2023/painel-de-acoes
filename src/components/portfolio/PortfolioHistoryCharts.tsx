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
  Legend,
  ReferenceLine,
} from "recharts"
import { formatCurrency } from "@/lib/calculations"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, Calendar, Landmark, BarChart2 } from "lucide-react"

interface HistoryPoint {
  label: string
  dateRange?: string
  patrimonio: number
  aporte: number
  saida: number
  dividendos: number
}

interface HistorySummary {
  totalAporte: number
  totalDividendos: number
  rentabilidade: number
}

interface BenchmarkPoint {
  label: string
  ibov: number | null
  cdi: number | null
}

type Period = "week" | "month" | "year"
type View = "patrimonio" | "rentabilidade"

export function PortfolioHistoryCharts() {
  const [period, setPeriod] = useState<Period>("month")
  const [view, setView] = useState<View>("patrimonio")
  const [data, setData] = useState<HistoryPoint[]>([])
  const [summary, setSummary] = useState<HistorySummary | null>(null)
  const [benchmark, setBenchmark] = useState<BenchmarkPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBenchmark, setLoadingBenchmark] = useState(false)

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

  useEffect(() => {
    if (view !== "rentabilidade") return
    async function loadBenchmark() {
      setLoadingBenchmark(true)
      try {
        const res = await fetch(`/api/portfolio/benchmark?period=${period}`)
        if (res.ok) {
          const json = await res.json()
          setBenchmark(json.points || [])
        }
      } catch (err) {
        console.error("Erro ao carregar benchmark:", err)
      } finally {
        setLoadingBenchmark(false)
      }
    }
    loadBenchmark()
  }, [view, period])

  // Monta série de rentabilidade % da carteira normalizada ao início do período
  const rentabilidadeData = (() => {
    const firstIndex = data.findIndex((d) => d.patrimonio > 0)
    const baseline = firstIndex !== -1 ? data[firstIndex].patrimonio : 0
    const bMap = new Map(benchmark.map((b) => [b.label, b]))

    // Encontra os valores de benchmark na data do primeiro aporte (firstIndex)
    const baseLabel = firstIndex !== -1 ? data[firstIndex].label : ""
    const baseBm = bMap.get(baseLabel)
    const ibovBase = baseBm?.ibov ?? null
    const cdiBase = baseBm?.cdi ?? null

    const recalculateBenchmark = (currentPct: number | null, basePct: number | null) => {
      if (currentPct == null) return null
      if (basePct == null) return currentPct // Fallback caso não ache o ponto de base
      return Math.round(((currentPct - basePct) / (1 + basePct / 100)) * 100) / 100
    }

    return data.map((d, index) => {
      if (firstIndex === -1 || index < firstIndex) {
        return {
          label: d.label,
          dateRange: d.dateRange,
          carteira: null,
          ibov: null,
          cdi: null,
        }
      }

      // Calcula os aportes acumulados desde o dia seguinte ao primeiro mês com ativos
      let cumAportes = 0
      for (let j = firstIndex + 1; j <= index; j++) {
        cumAportes += data[j].aporte + data[j].saida
      }

      const adjPatr = d.patrimonio - cumAportes
      const portfolioPct = baseline > 0
        ? Math.round(((adjPatr - baseline) / baseline) * 10000) / 100
        : null

      const bm = bMap.get(d.label)
      const ibovNormalized = recalculateBenchmark(bm?.ibov ?? null, ibovBase)
      const cdiNormalized = recalculateBenchmark(bm?.cdi ?? null, cdiBase)

      return {
        label: d.label,
        dateRange: d.dateRange,
        carteira: portfolioPct,
        ibov: ibovNormalized,
        cdi: cdiNormalized,
      }
    })
  })()

  const isRentabilidadePositiva = summary ? summary.rentabilidade >= 0 : true

  const formatYAxis = (tick: number) => {
    const isNegative = tick < 0
    const absTick = Math.abs(tick)
    let formatted = ""
    if (absTick >= 1000000) formatted = `${(absTick / 1000000).toFixed(1)}M`
    else if (absTick >= 1000) formatted = `${(absTick / 1000).toFixed(0)}k`
    else formatted = `${absTick}`
    return isNegative ? `-R$ ${formatted}` : `R$ ${formatted}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const dateRangeText = payload[0]?.payload?.dateRange ? ` (${payload[0].payload.dateRange})` : ""
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1.5">
        <p className="font-semibold border-b border-border pb-1 mb-1 text-foreground">{label}{dateRangeText}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}:
            </span>
            <span className="font-bold text-foreground">
              {view === "rentabilidade" ? `${p.value != null ? (p.value > 0 ? "+" : "") + p.value.toFixed(2) : "—"}%` : formatCurrency(p.value)}
            </span>
          </div>
        ))}
      </div>
    )
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
          <p className="text-xs text-muted-foreground">Evolução do patrimônio, aportes, dividendos e rentabilidade vs benchmark</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Toggle de visão */}
          <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-muted/30">
            <Button
              onClick={() => setView("patrimonio")}
              variant={view === "patrimonio" ? "secondary" : "ghost"}
              size="sm"
              className="text-xs px-3 h-7 rounded-md gap-1"
            >
              <Landmark size={11} /> Patrimônio
            </Button>
            <Button
              onClick={() => setView("rentabilidade")}
              variant={view === "rentabilidade" ? "secondary" : "ghost"}
              size="sm"
              className="text-xs px-3 h-7 rounded-md gap-1"
            >
              <BarChart2 size={11} /> Rentabilidade %
            </Button>
          </div>
          {/* Toggle de período */}
          <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-muted/30">
            <Button onClick={() => setPeriod("week")} variant={period === "week" ? "secondary" : "ghost"} size="sm" className="text-xs px-3 h-7 rounded-md">Semanal</Button>
            <Button onClick={() => setPeriod("month")} variant={period === "month" ? "secondary" : "ghost"} size="sm" className="text-xs px-3 h-7 rounded-md">Mensal</Button>
            <Button onClick={() => setPeriod("year")} variant={period === "year" ? "secondary" : "ghost"} size="sm" className="text-xs px-3 h-7 rounded-md">Anual</Button>
          </div>
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
              {isRentabilidadePositiva ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
              Rentabilidade no Período (P&L)
            </span>
            <div className={`text-lg font-bold ${isRentabilidadePositiva ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(summary.rentabilidade)}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      {view === "patrimonio" ? (
        data.length > 0 ? (
          <div className="w-full text-xs">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="currentColor" className="text-muted-foreground opacity-60" />
                <YAxis tickFormatter={formatYAxis} stroke="currentColor" className="text-muted-foreground opacity-60"
                  domain={[(dataMin: number) => { if (dataMin >= 0) return 0; if (dataMin > -100) return -100; return Math.floor(dataMin / 500) * 500 }, "auto"]} />
                <ReChartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" />
                <Bar name="Aporte no Período" dataKey="aporte" barSize={16} fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar name="Vendas no Período" dataKey="saida" barSize={16} fill="#ef4444" radius={[0, 0, 2, 2]} />
                <Bar name="Dividendos no Período" dataKey="dividendos" barSize={16} fill="#10b981" radius={[2, 2, 0, 0]} />
                <Line name="Patrimônio Total" type="monotone" dataKey="patrimonio" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: "#1e1e24" }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-xs">Nenhuma movimentação no período para desenhar o gráfico.</div>
        )
      ) : (
        <div className="w-full text-xs">
          {loadingBenchmark ? (
            <div className="h-[280px] bg-muted/30 rounded-xl animate-pulse flex items-center justify-center text-muted-foreground">
              Carregando benchmark (IBOVESPA + CDI)...
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Sua Carteira</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block" /> IBOVESPA</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 inline-block border-dashed" style={{borderTop:"1px dashed"}} /> CDI</span>
                <span className="ml-auto opacity-60">Retorno % acumulado a partir do início do período</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={rentabilidadeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" stroke="currentColor" className="text-muted-foreground opacity-60" />
                  <YAxis tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} stroke="currentColor" className="text-muted-foreground opacity-60" />
                  <ReChartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                  <Line name="Carteira" type="monotone" dataKey="carteira" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: "var(--background)" }} activeDot={{ r: 5 }} connectNulls />
                  <Line name="IBOVESPA" type="monotone" dataKey="ibov" stroke="#fb923c" strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
                  <Line name="CDI" type="monotone" dataKey="cdi" stroke="#22d3ee" strokeWidth={1.5} dot={false} strokeDasharray="3 3" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}
    </div>
  )
}
