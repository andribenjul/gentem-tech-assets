"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { formatDate, cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Package,
  Building2,
  Users,
  ClipboardList,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileText,
  Download,
  Printer,
  ExternalLink,
  X,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import Link from "next/link"

const supabase = createClient()

const STATUS_COLORS: Record<string, string> = {
  Available: "#10b981",
  Assigned: "#3b82f6",
  "In Repair": "#eab308",
  Disposed: "#6b7280",
  Active: "#3b82f6",
  Returned: "#10b981",
  Overdue: "#ef4444",
}

const statCards = [
  {
    label: "Total Aset",
    icon: Package,
    color: "emerald",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    gradientClass: "from-emerald-500/10",
  },
  {
    label: "Total Cabang",
    icon: Building2,
    color: "blue",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    iconClass: "text-blue-600 dark:text-blue-400",
    gradientClass: "from-blue-500/10",
  },
  {
    label: "Total Karyawan",
    icon: Users,
    color: "teal",
    bgClass: "bg-teal-100 dark:bg-teal-900/30",
    iconClass: "text-teal-600 dark:text-teal-400",
    gradientClass: "from-teal-500/10",
  },
  {
    label: "Assignment Aktif",
    icon: ClipboardList,
    color: "indigo",
    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    iconClass: "text-indigo-600 dark:text-indigo-400",
    gradientClass: "from-indigo-500/10",
  },
]

async function fetchCounts() {
  const [assets, employees, branches, assignments] = await Promise.all([
    supabase.from("assets").select("*", { count: "exact", head: true }),
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("branches").select("*", { count: "exact", head: true }),
    supabase
      .from("asset_assignments")
      .select("*", { count: "exact", head: true })
      .in("status", ["Active", "Overdue"]),
  ])
  return [assets, employees, branches, assignments]
}

async function fetchAssetsByStatus() {
  const { data, error } = await supabase
    .from("assets")
    .select("status")
    .not("status", "is", null)
  if (error) throw error
  return data ?? []
}

async function fetchRecentTransactions() {
  const { data, error } = await supabase
    .from("asset_assignments")
    .select(
      "id, assigned_date, due_date, status, assignment_type, notes, assets(id, name, asset_tag), employees(id, full_name, name)"
    )
    .order("created_at", { ascending: false })
    .limit(8)
  if (error) throw error
  return data ?? []
}

async function fetchHandoverDocs() {
  const { data, error } = await supabase
    .from("handover_documents")
    .select("assignment_id, generated_pdf_url, document_number, id")
  if (error) throw error
  return (data ?? []) as { assignment_id: string; generated_pdf_url: string | null; document_number: string; id: string }[]
}

async function fetchLoansDueOrOverdue() {
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const threeDaysFromNowStr = threeDaysFromNow.toISOString()

  const { data, error } = await supabase
    .from("asset_assignments")
    .select(
      "id, assigned_date, due_date, status, assignment_type, notes, assets(id, name, asset_tag), employees(id, full_name)"
    )
    .or(
      `and(assignment_type.eq.Loan,status.eq.Active,due_date.lte.${threeDaysFromNowStr}),status.eq.Overdue`
    )
    .order("due_date", { ascending: true })
  if (error) throw error
  return data ?? []
}

export default function DashboardPage() {
  const [receiptModal, setReceiptModal] = useState<{
    assignmentId: string
    docNumber: string
    pdfUrl: string
  } | null>(null)

  const countsQuery = useQuery({
    queryKey: ["dashboard", "counts"],
    queryFn: fetchCounts,
  })

  const assetsByStatusQuery = useQuery({
    queryKey: ["dashboard", "assets-by-status"],
    queryFn: fetchAssetsByStatus,
  })

  const recentTxQuery = useQuery({
    queryKey: ["dashboard", "recent-transactions"],
    queryFn: fetchRecentTransactions,
  })

  const handoverDocsQuery = useQuery({
    queryKey: ["dashboard", "handover-docs"],
    queryFn: fetchHandoverDocs,
  })

  const loansQuery = useQuery({
    queryKey: ["dashboard", "loans-due-overdue"],
    queryFn: fetchLoansDueOrOverdue,
  })

  if (countsQuery.error || assetsByStatusQuery.error || recentTxQuery.error || loansQuery.error) {
    toast.error("Gagal memuat data dashboard")
  }

  const isLoading =
    countsQuery.isLoading ||
    assetsByStatusQuery.isLoading ||
    recentTxQuery.isLoading ||
    loansQuery.isLoading

  const counts = countsQuery.data
  const totalAssets = counts?.[0].count ?? 0
  const totalEmployees = counts?.[1].count ?? 0
  const totalBranches = counts?.[2].count ?? 0
  const activeAssignments = counts?.[3].count ?? 0

  const statusCounts = (assetsByStatusQuery.data ?? []).reduce<
    Record<string, number>
  >((acc, a) => {
    const s = a.status ?? "Unknown"
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }))

  const recentTransactions = recentTxQuery.data ?? []
  const handoverDocs = handoverDocsQuery.data ?? []
  const loans = loansQuery.data ?? []

  const getEmployeeName = (item: any) => {
    if (item.employees?.full_name) return item.employees.full_name
    return "—"
  }

  const getEmployeeInitials = (item: any) => {
    const name = getEmployeeName(item)
    if (name === "—") return "?"
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ringkasan inventaris aset IT perusahaan
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => {
          const values = [totalAssets, totalBranches, totalEmployees, activeAssignments]
          return (
            <div
              key={card.label}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-3xl font-bold tracking-tight">
                      {values[i].toLocaleString()}
                    </p>
                  )}
                </div>
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
                  card.bgClass
                )}>
                  <card.icon className={cn("h-6 w-6", card.iconClass)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assets Per Status</CardTitle>
            <CardDescription>Distribusi aset berdasarkan status saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            {assetsByStatusQuery.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : pieData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Belum ada data aset.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={(({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`) as any}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Loans Due / Overdue</CardTitle>
                <CardDescription>Peminjaman yang mendekati atau melewati batas waktu</CardDescription>
              </div>
              {loans.length > 0 && (
                <Badge variant="destructive" className="gap-1 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  {loans.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loansQuery.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : loans.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Tidak ada peminjaman jatuh tempo</p>
              </div>
            ) : (
              <div className="divide-y">
                {loans.map((loan: any) => {
                  const dueDate = loan.due_date ? new Date(loan.due_date) : null
                  const now = new Date()
                  const diffDays = dueDate
                    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null
                  const isOverdue = loan.status === "Overdue" || (diffDays != null && diffDays < 0)

                  return (
                    <Link
                      key={loan.id}
                      href={`/assignments/${loan.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={cn(
                          "text-xs font-semibold",
                          isOverdue
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        )}>
                          <AlertTriangle className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getEmployeeName(loan)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(loan.assets as any)?.name ?? "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {dueDate && (
                          <p className="text-xs text-muted-foreground">{formatDate(dueDate)}</p>
                        )}
                        <Badge
                          variant={isOverdue ? "destructive" : "secondary"}
                          className="mt-0.5 text-[10px] h-5"
                        >
                          {isOverdue
                            ? diffDays != null ? `${Math.abs(diffDays)}h lewat` : "Overdue"
                            : diffDays != null ? `${diffDays}h lagi` : "Due soon"}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <CardDescription>Serah terima & peminjaman aset terbaru</CardDescription>
            </div>
            <Link href="/assignments">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                Lihat semua
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentTxQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
              <Link href="/assignments/new">
                <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                  Buat serah terima baru
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Karyawan</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Aset</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Tanggal</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Status</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-2.5">Dokumen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentTransactions.map((tx: any) => {
                      const doc = handoverDocs.find((d) => d.assignment_id === tx.id)
                      const hasDoc = doc?.generated_pdf_url ?? false
                      const employeeName = getEmployeeName(tx)
                      const initials = getEmployeeInitials(tx)
                      const assetName = (tx.assets as any)?.name ?? "—"
                      const assetTag = (tx.assets as any)?.asset_tag ?? ""

                      return (
                        <tr key={tx.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900/40 dark:text-emerald-400">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{employeeName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <p className="text-sm">{assetName}</p>
                              {assetTag && (
                                <p className="text-xs text-muted-foreground font-mono">{assetTag}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">{formatDate(tx.assigned_date)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-5 font-medium",
                                  tx.status === "Active" && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
                                  tx.status === "Returned" && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
                                  tx.status === "Overdue" && "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                                )}
                              >
                                {tx.status === "Active" && tx.assignment_type === "Loan" ? "Loan" : tx.status}
                              </Badge>
                              {tx.assignment_type === "Permanent" && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  Permanent
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {hasDoc ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() =>
                                  setReceiptModal({
                                    assignmentId: tx.id,
                                    docNumber: doc!.document_number,
                                    pdfUrl: doc!.generated_pdf_url!,
                                  })
                                }
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">View Receipt</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground/50 cursor-not-allowed"
                                disabled
                                title="Dokumen belum tersedia"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y md:hidden">
                {recentTransactions.map((tx: any) => {
                  const doc = handoverDocs.find((d) => d.assignment_id === tx.id)
                  const hasDoc = doc?.generated_pdf_url ?? false
                  const employeeName = getEmployeeName(tx)
                  const initials = getEmployeeInitials(tx)
                  const assetName = (tx.assets as any)?.name ?? "—"
                  const assetTag = (tx.assets as any)?.asset_tag ?? ""

                  return (
                    <div key={tx.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold dark:bg-emerald-900/40 dark:text-emerald-400">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{employeeName}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-5",
                            tx.status === "Active" && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
                            tx.status === "Returned" && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
                            tx.status === "Overdue" && "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pl-9">
                        <div>
                          <p className="text-sm">{assetName}</p>
                          {assetTag && (
                            <p className="text-xs text-muted-foreground font-mono">{assetTag}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.assigned_date)}</p>
                        </div>
                        {hasDoc ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() =>
                              setReceiptModal({
                                assignmentId: tx.id,
                                docNumber: doc!.document_number,
                                pdfUrl: doc!.generated_pdf_url!,
                              })
                            }
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground/30"
                            disabled
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t px-4 py-2.5">
                <Link
                  href="/assignments"
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors py-1"
                >
                  Lihat semua transaksi
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!receiptModal}
        onOpenChange={(open) => !open && setReceiptModal(null)}
      >
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <DialogTitle className="text-sm font-semibold">
                {receiptModal?.docNumber ?? "BAST Document"}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1">
              {receiptModal?.pdfUrl && (
                <>
                  <a href={receiptModal.pdfUrl} download target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <a href={receiptModal.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {receiptModal?.pdfUrl ? (
              <iframe
                src={receiptModal.pdfUrl}
                className="h-full w-full"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">PDF tidak tersedia</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
