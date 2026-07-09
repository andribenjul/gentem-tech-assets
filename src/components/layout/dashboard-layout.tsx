"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { Breadcrumb } from "@/components/layout/breadcrumb"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/branches": "Cabang",
  "/rooms": "Ruangan",
  "/categories": "Kategori Aset",
  "/assets": "Aset",
  "/employees": "Karyawan",
  "/assignments": "Serah Terima",
  "/assignments/new": "Serah Terima Baru",
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const basePath = "/" + pathname.split("/").filter(Boolean)[0]
  const pageTitle = pageTitles[basePath] ?? pageTitles[pathname] ?? "Gentem Tech Assets"

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar
          pageTitle={pageTitle}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="px-3 lg:px-6 pt-3 lg:pt-4 pb-24 lg:pb-6">
            <Breadcrumb />
            <div className="mt-2 lg:mt-3">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
