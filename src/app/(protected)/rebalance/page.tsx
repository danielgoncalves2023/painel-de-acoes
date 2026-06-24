import { redirect } from "next/navigation"

export default function RebalancePage() {
  redirect("/portfolio?tab=rebalance")
}
