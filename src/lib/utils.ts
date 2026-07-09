import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-"
  return format(new Date(date), "dd MMM yyyy", { locale: id })
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "-"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Available: "bg-green-500",
    Assigned: "bg-blue-500",
    "In Repair": "bg-yellow-500",
    Disposed: "bg-gray-500",
    Active: "bg-blue-500",
    Returned: "bg-green-500",
    Overdue: "bg-red-500",
  }
  return colors[status] || "bg-gray-500"
}

export function getStatusTextColor(status: string): string {
  const colors: Record<string, string> = {
    Available: "text-green-700 bg-green-100 border-green-200",
    Assigned: "text-blue-700 bg-blue-100 border-blue-200",
    "In Repair": "text-yellow-700 bg-yellow-100 border-yellow-200",
    Disposed: "text-gray-700 bg-gray-100 border-gray-200",
    Active: "text-blue-700 bg-blue-100 border-blue-200",
    Returned: "text-green-700 bg-green-100 border-green-200",
    Overdue: "text-red-700 bg-red-100 border-red-200",
  }
  return colors[status] || "text-gray-700 bg-gray-100 border-gray-200"
}

export function getConditionColor(condition: string): string {
  const colors: Record<string, string> = {
    New: "text-green-700 bg-green-100",
    Good: "text-blue-700 bg-blue-100",
    Fair: "text-yellow-700 bg-yellow-100",
    Damaged: "text-orange-700 bg-orange-100",
    Retired: "text-gray-700 bg-gray-100",
  }
  return colors[condition] || "text-gray-700 bg-gray-100"
}