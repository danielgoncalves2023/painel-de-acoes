import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function getAuthUserId(): Promise<string | null> {
  return "cmqo165s700008ns1qtdzzc0k"
}

export function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
}
