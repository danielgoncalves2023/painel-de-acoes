"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PortfolioTab } from "@/components/portfolio/PortfolioTab"
import { RebalanceTab } from "@/components/portfolio/RebalanceTab"
import { TransactionsTab } from "@/components/portfolio/TransactionsTab"
import { DividendsTab } from "@/components/portfolio/DividendsTab"
import { Briefcase, PieChart, ArrowLeftRight, Coins } from "lucide-react"

function PortfolioPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  
  const [activeTab, setActiveTab] = useState<"carteira" | "rebalance" | "transactions" | "dividends">("carteira")

  useEffect(() => {
    if (tabParam === "rebalance" || tabParam === "transactions" || tabParam === "dividends") {
      setActiveTab(tabParam)
    } else {
      setActiveTab("carteira")
    }
  }, [tabParam])

  const handleTabChange = (tab: "carteira" | "rebalance" | "transactions" | "dividends") => {
    setActiveTab(tab)
    router.push(`/portfolio?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="text-primary" /> Minha Carteira
        </h1>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => handleTabChange("carteira")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "carteira"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase size={14} />
          Carteira
        </button>
        <button
          onClick={() => handleTabChange("rebalance")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "rebalance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PieChart size={14} />
          Rebalanceamento
        </button>
        <button
          onClick={() => handleTabChange("dividends")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "dividends"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins size={14} />
          Dividendos
        </button>
        <button
          onClick={() => handleTabChange("transactions")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "transactions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowLeftRight size={14} />
          Lançamentos
        </button>
      </div>

      {/* Renderização do Conteúdo da Aba Ativa */}
      <div className="pt-2">
        {activeTab === "carteira" && <PortfolioTab />}
        {activeTab === "rebalance" && <RebalanceTab />}
        {activeTab === "dividends" && <DividendsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-muted-foreground">Carregando Carteira...</div>}>
      <PortfolioPageContent />
    </Suspense>
  )
}
