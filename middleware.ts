import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = {
  // Protege todas as páginas exceto /login, /api/auth/* e assets estáticos
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
}
