"use client"

import { SimuladorRenda } from "@/components/proventos/SimuladorRenda"
import { TrendingUp } from "lucide-react"

export default function SimuladorRendaPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-primary" /> Simulador de Renda
        </h1>
      </div>
      <SimuladorRenda />
    </div>
  )
}
