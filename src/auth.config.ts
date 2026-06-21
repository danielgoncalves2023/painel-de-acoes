import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

// Config leve, sem PrismaClient — compatível com Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
  },
}
