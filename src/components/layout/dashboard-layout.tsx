"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/branches": "Branches",
  "/rooms": "Rooms",
  "/categories": "Categories",
  "/assets": "Assets",
  "/employees": "Employees",
  "/assignments/new": "New Assignment",
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pageTitle = pageTitles[pathname] ?? "Gentem Tech Assets"

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}