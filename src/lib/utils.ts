import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateUTC(dateInput: string | Date): string {
  const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (isNaN(dateObj.getTime())) return "—"
  const day = String(dateObj.getUTCDate()).padStart(2, "0")
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0")
  const year = dateObj.getUTCFullYear()
  return `${day}/${month}/${year}`
}
