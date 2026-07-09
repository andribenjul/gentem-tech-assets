"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Bell, Search, LogOut, Menu, AlertTriangle, Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth, useSignOut } from "@/hooks/use-auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface TopbarProps {
  pageTitle: string
  onMenuToggle: () => void
}

export function Topbar({ pageTitle, onMenuToggle }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const signOut = useSignOut()
  const router = useRouter()

  const supabase = createClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", "overdue"],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("asset_assignments")
        .select("id, due_date, status, assignment_type, assets(name), employees(full_name, name)")
        .or(`and(assignment_type.eq.Loan,status.eq.Active,due_date.lte.${now}),status.eq.Overdue`)
        .order("due_date", { ascending: true })
        .limit(10)
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 60000,
  })

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const initials = user?.email?.charAt(0).toUpperCase() ?? "U"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-3 lg:px-5">
      <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-base font-semibold truncate">{pageTitle}</h1>
      </div>

      <div className="flex-1" />

      <div className="relative hidden md:block w-64 lg:w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari aset, karyawan..."
          className="h-9 pl-8 text-sm bg-muted/50 border-muted focus-visible:bg-background"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative shrink-0">
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full px-1 flex items-center justify-center text-[10px] font-bold">
                {notifications.length > 9 ? "9+" : notifications.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifikasi</span>
            {notifications.length > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                {notifications.length} baru
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-40" />
                Tidak ada notifikasi
              </div>
            ) : (
              notifications.map((n: any) => {
                const isOverdue = n.status === "Overdue"
                const employeeName = n.employees?.full_name ?? n.employees?.name ?? "—"
                const assetName = n.assets?.name ?? "—"
                return (
                  <Link
                    key={n.id}
                    href={`/assignments/${n.id}`}
                    className="flex items-start gap-3 px-3 py-3 hover:bg-muted/50 transition-colors border-b last:border-0"
                  >
                    <div className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      isOverdue ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                    )}>
                      {isOverdue ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-medium truncate">{employeeName}</p>
                      <p className="text-xs text-muted-foreground truncate">{assetName}</p>
                      {n.due_date && (
                        <p className={cn(
                          "text-xs",
                          isOverdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          {isOverdue ? "Lewat batas" : "Jatuh tempo"}: {formatDate(n.due_date)}
                        </p>
                      )}
                    </div>
                    <Badge variant={isOverdue ? "destructive" : "secondary"} className="shrink-0 text-[10px] h-5">
                      {isOverdue ? "Overdue" : "Due"}
                    </Badge>
                  </Link>
                )
              })
            )}
          </div>
          <DropdownMenuSeparator />
          <Link href="/assignments">
            <DropdownMenuItem className="justify-center text-sm font-medium cursor-pointer">
              Lihat semua transaksi
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="shrink-0 gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900 dark:text-emerald-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
              {user?.email?.split("@")[0] ?? "User"}
            </span>
            <ChevronDown className="hidden md:block h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="truncate">{user?.email ?? "User"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
