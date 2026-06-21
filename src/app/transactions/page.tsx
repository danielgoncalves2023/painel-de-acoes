import { redirect } from "next/navigation"

export default function TransactionsPage() {
  redirect("/portfolio?tab=transactions")
}
