"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Tags,
  Package,
  Users,
  FileText,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth, useSignOut } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const menuGroups = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Inventaris",
    items: [
      { href: "/branches", label: "Cabang", icon: Building2 },
      { href: "/rooms", label: "Ruangan", icon: DoorOpen },
      { href: "/categories", label: "Kategori Aset", icon: Tags },
      { href: "/assets", label: "Aset", icon: Package },
    ],
  },
  {
    label: "SDM",
    items: [
      { href: "/employees", label: "Karyawan", icon: Users },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { href: "/assignments", label: "Serah Terima", icon: FileText },
      { href: "/assignments/new", label: "+ Buat Baru", icon: FileText },
    ],
  },
]

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const signOut = useSignOut()
  const router = useRouter()
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onClose])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const initials = user?.email?.charAt(0).toUpperCase() ?? "G"

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
          G
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">
            Gentem Tech Assets
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto hidden lg:flex shrink-0 h-7 w-7"
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose()
                    }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-emerald-500" />
                    )}
                    <item.icon className={cn(
                      "h-4 w-4 shrink-0",
                      isActive && "text-emerald-600 dark:text-emerald-400"
                    )} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn(
        "border-t p-3",
        collapsed && "flex flex-col items-center"
      )}>
        <div className={cn(
          "flex items-center gap-3 rounded-lg p-2",
          collapsed ? "justify-center" : ""
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900 dark:text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email?.split("@")[0] ?? "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex h-screen flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div
            ref={sheetRef}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-xl animate-in slide-in-from-left"
          >
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                  G
                </div>
                <span className="text-sm font-bold tracking-tight">Gentem Tech Assets</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
