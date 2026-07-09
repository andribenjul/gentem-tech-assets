"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { formatDate, getStatusTextColor } from "@/lib/utils"
import { toast } from "sonner"
import {
  Package,
  Building2,
  Users,
  ClipboardList,
  AlertTriangle,
  Clock,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

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

async function fetchRecentAssignments() {
  const { data, error } = await supabase
    .from("asset_assignments")
    .select(
      "id, assigned_date, returned_date, notes, status, assets(name), employees(name)"
    )
    .order("created_at", { ascending: false })
    .limit(5)
  if (error) throw error
  return data ?? []
}

async function fetchLoansDueOrOverdue() {
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const threeDaysFromNowStr = threeDaysFromNow.toISOString()

  const { data, error } = await supabase
    .from("asset_assignments")
    .select(
      "id, assigned_date, due_date, status, assignment_type, notes, assets(name), employees(name)"
    )
    .or(
      `and(assignment_type.eq.Loan,status.eq.Active,due_date.lte.${threeDaysFromNowStr}),status.eq.Overdue`
    )
    .order("due_date", { ascending: true })
  if (error) throw error
  return data ?? []
}

export default function DashboardPage() {
  const countsQuery = useQuery({
    queryKey: ["dashboard", "counts"],
    queryFn: fetchCounts,
  })

  const assetsByStatusQuery = useQuery({
    queryKey: ["dashboard", "assets-by-status"],
    queryFn: fetchAssetsByStatus,
  })

  const recentAssignmentsQuery = useQuery({
    queryKey: ["dashboard", "recent-assignments"],
    queryFn: fetchRecentAssignments,
  })

  const loansQuery = useQuery({
    queryKey: ["dashboard", "loans-due-overdue"],
    queryFn: fetchLoansDueOrOverdue,
  })

  if (countsQuery.error || assetsByStatusQuery.error || recentAssignmentsQuery.error || loansQuery.error) {
    toast.error("Failed to load dashboard data")
  }

  const isLoading =
    countsQuery.isLoading ||
    assetsByStatusQuery.isLoading ||
    recentAssignmentsQuery.isLoading ||
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

  const recentAssignments = recentAssignmentsQuery.data ?? []
  const loans = loansQuery.data ?? []

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Gentem Tech Assets — Inventory Overview
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Package className="h-5 w-5 text-emerald-600" />}
          label="Total Assets"
          value={totalAssets}
          isLoading={isLoading}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
          label="Total Branches"
          value={totalBranches}
          isLoading={isLoading}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-teal-600" />}
          label="Total Employees"
          value={totalEmployees}
          isLoading={isLoading}
        />
        <StatCard
          icon={<ClipboardList className="h-5 w-5 text-indigo-600" />}
          label="Active Assignments"
          value={activeAssignments}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assets Per Status</CardTitle>
          </CardHeader>
          <CardContent>
            {assetsByStatusQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : pieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No asset data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
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
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Loans Due / Overdue</CardTitle>
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {loans.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {loansQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : loans.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No loans due or overdue.
              </p>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => {
                  const dueDate = loan.due_date ? new Date(loan.due_date) : null
                  const now = new Date()
                  const diffDays = dueDate
                    ? Math.ceil(
                        (dueDate.getTime() - now.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null
                  const isOverdue = loan.status === "Overdue" || (diffDays != null && diffDays < 0)

                  return (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium leading-none">
                          {(loan.employees as any)?.name ?? "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {(loan.assets as any)?.name ?? "—"}
                        </p>
                        {dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due: {formatDate(dueDate)}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {isOverdue ? (
                          <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                            <AlertTriangle className="h-3 w-3" />
                            {diffDays != null ? `${Math.abs(diffDays)}d overdue` : "Overdue"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                            <Clock className="h-3 w-3" />
                            {diffDays != null ? `${diffDays}d left` : "Due soon"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAssignmentsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : recentAssignments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No recent assignments found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Returned Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAssignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {(a.employees as any)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {(a.assets as any)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusTextColor(a.status ?? "")}`}
                      >
                        {a.status ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(a.assigned_date)}</TableCell>
                    <TableCell>{formatDate(a.returned_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode
  label: string
  value: number
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-bold">{value.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  )
}