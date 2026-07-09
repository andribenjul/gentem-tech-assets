"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, LayoutDashboard } from "lucide-react"

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  branches: "Cabang",
  rooms: "Ruangan",
  categories: "Kategori Aset",
  assets: "Aset",
  employees: "Karyawan",
  assignments: "Serah Terima",
}

export function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0 || segments[0] === "dashboard") return null

  const items = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const isLast = i === segments.length - 1
    const label = labelMap[segment] ?? segment.replace(/-/g, " ")

    if (segment.length === 36 && segment.includes("-")) {
      return null
    }

    return { href, label, isLast }
  }).filter(Boolean)

  if (!items.length) return null

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        <LayoutDashboard className="h-3 w-3" />
      </Link>
      {items.map((item) => {
        if (!item) return null
        if (item.isLast) {
          return (
            <span key={item.href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">{item.label}</span>
            </span>
          )
        }
        return (
          <span key={item.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          </span>
        )
      })}
    </nav>
  )
}
