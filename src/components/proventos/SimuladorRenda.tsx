"use client"

import { useEffect, useState, useMemo } from "react"
import { formatCurrency } from "@/lib/calculations"
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine
} from "recharts"
import { TrendingUp, Clock, Wallet, RefreshCw } from "lucide-react"

interface SimPoint {
  ano: number;
  patrimonio: number;
  rendaMensal: number;
  patrimonioCDI: number;
}

function simular(
  patrimonio: number,
  dy: number,
  aporte: number,
  reinvest: number,
  crescDY: number,
  objetivo: number,
  cdiRate: number
): { 
  meses: number; 
  pontos: SimPoint[]; 
  patNecessario: number;
  totalInvestido: number;
  totalDividendos: number;
  patrimonioFinal: number;
} {
  const dyMensal = dy / 100 / 12
  const cdiMensal = cdiRate / 100 / 12
  const patNecessario = dyMensal > 0 ? objetivo / dyMensal : 0
  const pontos: SimPoint[] = []
  let pat = patrimonio
  let patCDI = patrimonio
  let dyAtual = dy
  let meses = 0
  let totalDiv = 0
  const MAX = 600

  pontos.push({
    ano: 0,
    patrimonio: Math.round(pat),
    rendaMensal: Math.round(pat * dyAtual / 100 / 12),
    patrimonioCDI: Math.round(patCDI)
  })

  while (pat * (dyAtual / 100 / 12) < objetivo && meses < MAX) {
    const divMes = pat * (dyAtual / 100 / 12)
    totalDiv += divMes
    pat += aporte + divMes * reinvest
    patCDI += aporte + patCDI * cdiMensal
    meses++
    if (meses % 12 === 0) {
      dyAtual = dyAtual * (1 + crescDY / 100)
      pontos.push({
        ano: meses / 12,
        patrimonio: Math.round(pat),
        rendaMensal: Math.round(pat * dyAtual / 100 / 12),
        patrimonioCDI: Math.round(patCDI)
      })
    }
  }

  // Adiciona o ponto exato da conclusão ao gráfico caso não seja múltiplo exato de 12 meses
  if (meses > 0 && meses % 12 !== 0 && meses < MAX) {
    pontos.push({
      ano: parseFloat((meses / 12).toFixed(1)),
      patrimonio: Math.round(pat),
      rendaMensal: Math.round(pat * dyAtual / 100 / 12),
      patrimonioCDI: Math.round(patCDI)
    })
  }

  const totalInvestido = patrimonio + (meses * aporte)

  return { 
    meses, 
    pontos, 
    patNecessario, 
    totalInvestido: Math.round(totalInvestido), 
    totalDividendos: Math.round(totalDiv),
    patrimonioFinal: Math.round(pat)
  }
}

function formatTempo(meses: number): string {
  if (meses <= 0) return "Já atingido!"
  if (meses >= 600) return "+50 anos"
  const anos = Math.floor(meses / 12)
  const m = meses % 12
  if (anos === 0) return `${m} ${m === 1 ? "mês" : "meses"}`
  if (m === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`
  return `${anos}a ${m}m`
}

function formatK(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return formatCurrency(v)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1 shadow-md">
      <p className="font-medium text-foreground">Ano {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export function SimuladorRenda() {
  const [loadingBase, setLoadingBase] = useState(true)
  const [patrimonio, setPatrimonio] = useState(0)
  const [dy, setDy] = useState(0)
  const [aporte, setAporte] = useState(1000)
  const [reinvest, setReinvest] = useState(1)
  const [crescDY, setCrescDY] = useState(0)
  const [objetivo, setObjetivo] = useState(3000)
  const [cdi, setCdi] = useState(10.75)

  useEffect(() => {
    fetch("/api/portfolio/summary")
      .then(r => r.json())
      .then(d => {
        if (d.totalValue > 0) setPatrimonio(Math.round(d.totalValue))
        if (d.weightedDY > 0) setDy(parseFloat(d.weightedDY.toFixed(2)))
        if (d.cdiRate > 0) setCdi(parseFloat(d.cdiRate.toFixed(2)))
      })
      .finally(() => setLoadingBase(false))
  }, [])

  const { meses, pontos, patNecessario, totalInvestido, totalDividendos, patrimonioFinal } = useMemo(
    () => simular(patrimonio, dy, aporte, reinvest, crescDY, objetivo, cdi),
    [patrimonio, dy, aporte, reinvest, crescDY, objetivo, cdi]
  )

  const rendaAtual = patrimonio * dy / 100 / 12

  if (loadingBase) {
    return <div className="text-center py-16 text-muted-foreground text-sm">Carregando dados da carteira...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <RefreshCw size={15} className="text-primary" /> Parâmetros da simulação
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Patrimônio atual (R$)</label>
              <input
                type="number"
                value={patrimonio}
                onChange={e => setPatrimonio(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">DY médio carteira (%)</label>
              <input
                type="number"
                step="0.1"
                value={dy}
                onChange={e => setDy(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Aporte mensal (R$)</label>
              <input
                type="number"
                value={aporte}
                onChange={e => setAporte(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Objetivo de renda/mês (R$)</label>
              <input
                type="number"
                value={objetivo}
                onChange={e => setObjetivo(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Reinvestir dividendos</label>
              <select
                value={reinvest}
                onChange={e => setReinvest(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={1}>Sim — reinvestir tudo</option>
                <option value={0.5}>Parcial — reinvestir 50%</option>
                <option value={0}>Não reinvestir</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Crescimento anual DY (%)</label>
              <input
                type="number"
                step="0.5"
                value={crescDY}
                onChange={e => setCrescDY(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Taxa CDI anual (%)</label>
              <input
                type="number"
                step="0.1"
                value={cdi}
                onChange={e => setCdi(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Wallet size={22} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Renda atual / mês</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(rendaAtual)}</span>
              <span className="text-xs text-muted-foreground block mt-0.5">com DY de {dy.toFixed(1)}% ao ano</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
              <Clock size={22} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Tempo para {formatCurrency(objetivo)}/mês</span>
              <span className="text-2xl font-bold text-green-500">{formatTempo(meses)}</span>
              <span className="text-xs text-muted-foreground block mt-0.5">
                {meses > 0 && meses < 600 ? `${meses} meses no total` : ""}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
              <TrendingUp size={22} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Patrimônio necessário</span>
              <span className="text-2xl font-bold text-amber-500">{formatK(patNecessario)}</span>
              <span className="text-xs text-muted-foreground block mt-0.5">para gerar {formatCurrency(objetivo)}/mês com DY atual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo da Simulação */}
      {pontos.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Patrimônio Final</span>
              <span className="text-2xl font-bold text-foreground block mt-1">
                {formatCurrency(patrimonioFinal)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-3">
              Alcançado em {formatTempo(meses)}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Capital Próprio Investido</span>
              <span className="text-2xl font-bold text-primary block mt-1">
                {formatCurrency(totalInvestido)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-3">
              Inicial + aportes (do bolso)
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Total Ganho em Dividendos</span>
              <span className="text-2xl font-bold text-green-500 block mt-1">
                {formatCurrency(totalDividendos)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-3">
              Acumulado gerado no período
            </span>
          </div>
        </div>
      )}

      {/* Gráfico */}
      {pontos.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" /> Projeção ao longo do tempo
          </h2>
          <div className="flex gap-6 mb-4 flex-wrap">
            <span className="flex items-center gap-2 text-xs" style={{ color: "#378ADD" }}>
              <span className="inline-block w-6 h-3 rounded opacity-40" style={{ background: "#378ADD" }} />
              Patrimônio Carteira (eixo esq.)
            </span>
            <span className="flex items-center gap-2 text-xs" style={{ color: "#f59e0b" }}>
              <span className="inline-block w-6 h-0.5" style={{ borderTop: "2px dashed #f59e0b" }} />
              Comparativo CDI (eixo esq.)
            </span>
            <span className="flex items-center gap-2 text-xs" style={{ color: "#4ade80" }}>
              <span className="inline-block w-6 h-0.5 rounded" style={{ background: "#4ade80" }} />
              Renda/mês (eixo dir.)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={pontos} margin={{ top: 4, right: 90, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#378ADD" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#378ADD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="ano"
                tickFormatter={v => `${v}a`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
              />
              <YAxis
                yAxisId="pat"
                orientation="left"
                tickFormatter={formatK}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                width={72}
              />
              <YAxis
                yAxisId="renda"
                orientation="right"
                tickFormatter={v => formatCurrency(v)}
                tick={{ fontSize: 11, fill: "#4ade80" }}
                width={88}
              />
              <ReTooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #444", borderRadius: 8, fontSize: 12 }}
                labelFormatter={v => `Ano ${v}`}
                formatter={(v: any, name: any) => {
                  if (name === "patrimonio") return [formatK(Number(v)), "Patrimônio Carteira"]
                  if (name === "patrimonioCDI") return [formatK(Number(v)), "Comparativo CDI"]
                  if (name === "rendaMensal") return [formatCurrency(Number(v)), "Renda/mês"]
                  return [v, name]
                }}
              />
              {/* Renda/mês renderizada PRIMEIRO para garantir visibilidade no eixo direito */}
              <Line
                yAxisId="renda"
                type="monotone"
                dataKey="rendaMensal"
                stroke="#4ade80"
                strokeWidth={2.5}
                dot={false}
                name="rendaMensal"
                isAnimationActive={false}
              />
              {/* CDI dashed sobre o eixo esquerdo */}
              <Line
                yAxisId="pat"
                type="monotone"
                dataKey="patrimonioCDI"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="patrimonioCDI"
                isAnimationActive={false}
              />
              {/* Área do patrimônio por cima */}
              <Area
                yAxisId="pat"
                type="monotone"
                dataKey="patrimonio"
                stroke="#378ADD"
                strokeWidth={2}
                fill="url(#gradPat)"
                dot={false}
                name="patrimonio"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Simulação aproximada. Considera DY constante{crescDY > 0 ? ` com crescimento de ${crescDY}%/ano` : ""}.
          </p>
        </div>
      )}
    </div>
  )
}
