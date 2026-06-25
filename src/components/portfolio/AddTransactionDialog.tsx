"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { format } from "date-fns"

interface Props {
  onSuccess: () => void
  defaultTicker?: string
}

export function AddTransactionDialog({ onSuccess, defaultTicker }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ticker, setTicker] = useState(defaultTicker ?? "")
  const [type, setType] = useState<"BUY" | "SELL">("BUY")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [brokerage, setBrokerage] = useState("0")
  const [note, setNote] = useState("")
  const [suggestions, setSuggestions] = useState<{ stock: string; name: string }[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const [tickerValidated, setTickerValidated] = useState(!!defaultTicker)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (ticker.length < 2) { setSuggestions([]); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${ticker}`)
      const data = await res.json()
      setSuggestions(data)
      setShowSugg(true)
    }, 300)
  }, [ticker])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, type, quantity, price, date, brokerage, note }),
      })
      setOpen(false)
      setTicker(defaultTicker ?? "")
      setQuantity("")
      setPrice("")
      setBrokerage("0")
      setNote("")
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm">
          <Plus size={16} className="mr-1" /> Novo Lançamento
        </Button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("BUY")}
              className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                type === "BUY"
                  ? "bg-green-600 text-white border-green-600"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              Compra
            </button>
            <button
              type="button"
              onClick={() => setType("SELL")}
              className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                type === "SELL"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              Venda
            </button>
          </div>

          {/* Ticker com autocomplete */}
          <div className="relative">
            <Label>Ativo</Label>
            <Input
              value={ticker}
              onChange={(e) => { setTicker(e.target.value.toUpperCase()); setTickerValidated(false) }}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="PETR4"
              required
              className="mt-1"
            />
            {showSugg && suggestions.length > 0 && (
              <ul className="absolute z-50 w-full bg-popover border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <li
                    key={s.stock}
                    onMouseDown={() => { setTicker(s.stock); setTickerValidated(true); setShowSugg(false) }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex justify-between"
                  >
                    <span className="font-medium">{s.stock}</span>
                    <span className="text-muted-foreground truncate ml-2">{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
            {ticker.length >= 2 && !tickerValidated && !showSugg && (
              <p className="text-xs text-yellow-500 mt-1">
                ⚠ Selecione o ativo na lista de sugestões para confirmar o ticker.
              </p>
            )}
          </div>

          {/* Data e Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="100" required min="1" className="mt-1" />
            </div>
          </div>

          {/* Preço e Corretagem */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço Unitário (R$)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="32.50" required step="0.01" min="0" className="mt-1" />
            </div>
            <div>
              <Label>Corretagem (R$)</Label>
              <Input type="number" value={brokerage} onChange={(e) => setBrokerage(e.target.value)} placeholder="0" step="0.01" min="0" className="mt-1" />
            </div>
          </div>

          {/* Nota */}
          <div>
            <Label>Nota (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="..." className="mt-1" />
          </div>

          {/* Total */}
          {quantity && price && (
            <div className="rounded-md bg-muted px-4 py-2 text-sm flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">
                {((Number(quantity) * Number(price)) + Number(brokerage)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
