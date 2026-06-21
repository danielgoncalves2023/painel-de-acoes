"use client"

import { useEffect, useState, useCallback } from "react"
import { Transaction, PortfolioPosition } from "@/types"
import { calcPositions, formatCurrency, formatPercent } from "@/lib/calculations"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PieChart, Save, Calculator } from "lucide-react"

interface TargetAllocation {
  ticker: string
  targetPct: number
}

interface RebalancePosition extends PortfolioPosition {
  targetPct: number
  diffPct: number
  suggestedAction: "BUY" | "WAIT" | "SELL"
  suggestedAmount: number
  suggestedQuantity: number
}

export function RebalanceTab() {
  const [positions, setPositions] = useState<RebalancePosition[]>([])
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aporte, setAporte] = useState<string>("")
  const [totalValue, setTotalValue] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [txRes, targetRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/targets")
      ])
      if (!txRes.ok || !targetRes.ok) {
        console.error("API Error", await txRes.text(), await targetRes.text())
        setPositions([])
        setTargets({})
        setLoading(false)
        return
      }
      
      const transactions: Transaction[] = await txRes.json()
      const targetData: TargetAllocation[] = await targetRes.json()
      
      const targetMap: Record<string, number> = {}
      if (Array.isArray(targetData)) {
        targetData.forEach(t => targetMap[t.ticker] = t.targetPct)
      } else {
        console.error("TargetData não é array:", targetData)
      }

      if (transactions.length === 0) {
        setPositions([])
        setTargets({})
        setLoading(false)
        return
      }

      const tickers = [...new Set(transactions.map((t) => t.ticker))]
      const qRes = await fetch(`/api/quotes/${tickers.join(",")}`)
      const quotes = await qRes.json()
      const calculated = calcPositions(transactions, quotes)

      let total = 0
      calculated.forEach(p => total += p.currentValue)
      setTotalValue(total)

      // Initialize targets for any new position to 0 if not set
      const newTargets = { ...targetMap }
      calculated.forEach(p => {
        if (newTargets[p.ticker] === undefined) newTargets[p.ticker] = 0
      })

      const rebalancePos = calculated.map(p => ({
        ...p,
        targetPct: newTargets[p.ticker],
        diffPct: newTargets[p.ticker] - p.allocationPercent,
        suggestedAction: "WAIT" as const,
        suggestedAmount: 0,
        suggestedQuantity: 0,
      }))

      setTargets(newTargets)
      setPositions(rebalancePos)
    } catch (error) {
      console.error("Erro inesperado no load() do Rebalance:", error)
      setPositions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalTarget = Object.values(targets).reduce((acc, v) => acc + (v || 0), 0)

  const handleTargetChange = (ticker: string, val: string) => {
    const num = parseFloat(val)
    setTargets(prev => ({
      ...prev,
      [ticker]: isNaN(num) ? 0 : num
    }))
  }

  const saveTargets = async () => {
    if (Math.abs(totalTarget - 100) > 0.01 && totalTarget !== 0) {
      toast.error("O total das metas deve ser exatamente 100% ou 0%")
      return
    }

    setSaving(true)
    try {
      const payload = Object.entries(targets).map(([ticker, targetPct]) => ({ ticker, targetPct }))
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: payload })
      })

      if (res.ok) {
        toast.success("Metas salvas com sucesso!")
        load()
      } else {
        toast.error("Erro ao salvar as metas")
      }
    } finally {
      setSaving(false)
    }
  }

  const simulateRebalance = () => {
    const aporteValor = parseFloat(aporte)
    if (isNaN(aporteValor) || aporteValor <= 0) {
      toast.error("Insira um valor de aporte válido")
      return
    }

    if (Math.abs(totalTarget - 100) > 0.01) {
      toast.error("Ajuste suas metas para somar 100% antes de simular")
      return
    }

    const novoPatrimonioTotal = totalValue + aporteValor

    let updated = positions.map(p => {
      const targetPct = targets[p.ticker] || 0
      const valorIdeal = (novoPatrimonioTotal * targetPct) / 100
      const diferencaValor = valorIdeal - p.currentValue

      let action: "BUY" | "WAIT" | "SELL" = "WAIT"
      let suggestedAmount = 0
      let suggestedQuantity = 0

      // Apenas indicamos COMPRA na simulação de aporte para rebalanceamento passivo
      if (diferencaValor > 0 && p.currentPrice > 0) {
        action = "BUY"
        suggestedQuantity = Math.floor(diferencaValor / p.currentPrice)
        suggestedAmount = suggestedQuantity * p.currentPrice
        
        if (suggestedQuantity <= 0) {
          action = "WAIT"
        }
      }

      return {
        ...p,
        suggestedAction: action,
        suggestedAmount,
        suggestedQuantity
      }
    })

    setPositions(updated)
    toast.success("Simulação concluída!")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <PieChart size={18} className="text-primary" /> Rebalanceamento Inteligente
        </h2>
        <Button onClick={saveTargets} disabled={saving} className="gap-2">
          <Save size={16} /> Salvar Metas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium text-sm mb-4">Simular Aporte</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Valor a investir hoje (R$)</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 1500.00" 
                  value={aporte}
                  onChange={(e) => setAporte(e.target.value)}
                />
              </div>
              <Button onClick={simulateRebalance} className="w-full gap-2" variant="secondary">
                <Calculator size={16} /> Calcular Compras
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium text-sm mb-2">Resumo das Metas</h3>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Total Alocado</span>
              <span className={`font-bold ${Math.abs(totalTarget - 100) > 0.01 ? "text-red-500" : "text-green-500"}`}>
                {totalTarget.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Defina a porcentagem ideal de cada ação na sua carteira. O sistema indicará o que comprar para voltar ao equilíbrio.
            </p>
          </div>
        </div>

        <div className="col-span-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Carregando carteira...</div>
          ) : positions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Sua carteira está vazia.</div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-3 font-medium">Ação</th>
                    <th className="text-right px-4 py-3 font-medium">Atual</th>
                    <th className="text-right px-4 py-3 font-medium w-32">Meta (%)</th>
                    <th className="text-right px-4 py-3 font-medium">Gap</th>
                    <th className="text-right px-4 py-3 font-medium">Ação Sugerida</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const target = targets[p.ticker] || 0
                    const diff = target - p.allocationPercent
                    
                    return (
                      <tr key={p.ticker} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{p.ticker}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium">{formatPercent(p.allocationPercent)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(p.currentValue)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Input 
                            type="number" 
                            className="w-20 text-right ml-auto h-8"
                            value={targets[p.ticker] !== undefined ? targets[p.ticker].toString() : ""}
                            onChange={(e) => handleTargetChange(p.ticker, e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span className={diff < -0.1 ? "text-red-500" : diff > 0.1 ? "text-green-500" : "text-muted-foreground"}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.suggestedAction === "BUY" ? (
                            <div className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-semibold inline-block text-right">
                              Comprar {p.suggestedQuantity}<br/>
                              <span className="text-[10px] opacity-80">{formatCurrency(p.suggestedAmount)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
