import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  // Redireciona a raiz para a carteira (o layout de (protected) cuidará do auth)
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/portfolio", req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/"],
}

