import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/Sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { auth } from "@/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Painel B3",
  description: "Painel de controle de ações da B3",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <TooltipProvider>
          {session ? (
            <div className="flex h-screen overflow-hidden">
              <Sidebar user={session.user} />
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          ) : (
            children
          )}
          <Toaster richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
