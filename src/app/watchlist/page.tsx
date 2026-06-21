"use client"

import { useEffect, useState, useCallback } from "react"
import { WatchlistItem, Quote } from "@/types"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { Star, Trash2, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(true)
  const [newTicker, setNewTicker] = useState("")
  const [adding, setAdding] = useState(false)

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/watchlist")
    const json = res.ok ? await res.json() : []
    const data: WatchlistItem[] = Array.isArray(json) ? json : []
    setItems(data)
    return data
  }, [])

  const loadQuotes = useCallback(async (data: WatchlistItem[]) => {
    if (data.length === 0) { setLoading(false); return }
    const tickers = data.map((i) => i.ticker).join(",")
    const [qRes, ...detailsRes] = await Promise.all([
      fetch(`/api/quotes/${tickers}`),
      ...data.map((i) => fetch(`/api/quotes/${i.ticker}/details`)),
    ])
    const qs: Quote[] = await qRes.json()
    const details = await Promise.all(detailsRes.map((r) => r.json()))
    const dyMap: Record<string, number | null> = {}
    data.forEach((item, i) => { dyMap[item.ticker] = details[i]?.dividendYield ?? null })
    const map: Record<string, Quote> = {}
    qs.forEach((q) => { map[q.symbol] = { ...q, dividendYield: dyMap[q.symbol] ?? q.dividendYield } })
    setQuotes(map)
    setLoading(false)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const data = await loadItems()
    await loadQuotes(data)
  }, [loadItems, loadQuotes])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTicker.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: newTicker.trim() }),
      })
      if (!res.ok) { toast.error("Erro ao adicionar"); return }
      toast.success(`${newTicker.toUpperCase()} adicionado aos favoritos`)
      setNewTicker("")
      load()
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(ticker: string) {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    })
    toast.success(`${ticker} removido dos favoritos`)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Star size={20} className="text-yellow-400" />
        <h1 className="text-2xl font-bold">Favoritas</h1>
      </div>

      {/* Adicionar */}
      <form onSubmit={handleAdd} className="flex gap-2 max-w-xs">
        <Input
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          placeholder="PETR4"
          className="uppercase"
        />
        <Button type="submit" size="sm" disabled={adding}>
          <Plus size={16} className="mr-1" /> Adicionar
        </Button>
      </form>

      {loading ? (
        <div className="text-center text-muted-foreground py-12 text-sm">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center text-muted-foreground text-sm">
          Nenhuma ação nos favoritos ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const q = quotes[item.ticker]
            const isPos = (q?.regularMarketChangePercent ?? 0) >= 0
            return (
              <div key={item.ticker} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/stock/${item.ticker}`} className="font-bold hover:underline">
                      {item.ticker}
                    </Link>
                    {q?.shortName && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-36">{q.shortName}</div>
                    )}
                  </div>
                  <button onClick={() => handleRemove(item.ticker)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                {q ? (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(q.regularMarketPrice)}</div>
                    <div className={cn("text-sm font-medium flex items-center gap-1", isPos ? "text-green-500" : "text-red-500")}>
                      {formatPercent(q.regularMarketChangePercent)} hoje
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>DY: <span className="text-foreground font-medium">{q.dividendYield != null ? `${q.dividendYield.toFixed(2)}%` : "—"}</span></div>
                      <div>P/L: <span className="text-foreground font-medium">{q.priceEarnings != null ? q.priceEarnings.toFixed(1) : "—"}</span></div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">Sem cotação</div>
                )}

                {item.note && (
                  <div className="text-xs text-muted-foreground border-t border-border pt-2">{item.note}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
