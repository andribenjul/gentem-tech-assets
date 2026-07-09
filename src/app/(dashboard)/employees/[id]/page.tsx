"use client"

import { useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { employeeSchema, type EmployeeFormData } from "@/lib/validations"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, ArrowLeft, Building, Mail, Phone, Briefcase, ShieldCheck } from "lucide-react"

interface Branch {
  id: string
  name: string
}

interface EmployeeDetail {
  id: string
  employee_id_number: string
  name: string
  position: string | null
  department: string | null
  phone: string | null
  email: string | null
  branch_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  branches: { name: string } | null
}

interface AssignmentAsset {
  id: string
  name: string
  asset_tag: string
}

interface AssignmentRecord {
  id: string
  asset_id: string
  employee_id: string
  assigned_date: string
  returned_date: string | null
  due_date: string | null
  assignment_type: string
  status: string
  notes: string | null
  assets: AssignmentAsset | null
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const employeeId = params.id as string
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
  })

  const employeeQuery = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, branches(name)")
        .eq("id", employeeId)
        .single()
      if (error) throw error
      return data as EmployeeDetail
    },
  })

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").order("name")
      return (data ?? []) as Branch[]
    },
    staleTime: 1000 * 60 * 5,
  })

  const activeAssignmentsQuery = useQuery({
    queryKey: ["employee-assignments-active", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_assignments")
        .select("*, assets(name, asset_tag)")
        .eq("employee_id", employeeId)
        .eq("status", "Active")
        .order("assigned_date", { ascending: false })
      if (error) throw error
      return (data ?? []) as AssignmentRecord[]
    },
  })

  const assignmentHistoryQuery = useQuery({
    queryKey: ["employee-assignments-history", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_assignments")
        .select("*, assets(name, asset_tag)")
        .eq("employee_id", employeeId)
        .not("returned_date", "is", null)
        .order("assigned_date", { ascending: false })
      if (error) throw error
      return (data ?? []) as AssignmentRecord[]
    },
  })

  const activeCount = activeAssignmentsQuery.data?.length ?? 0
  const overdueCount = useMemo(
    () =>
      activeAssignmentsQuery.data?.filter((a) => {
        if (a.assignment_type !== "Loan" || !a.due_date) return false
        return new Date(a.due_date) < new Date() && !a.returned_date
      }).length ?? 0,
    [activeAssignmentsQuery.data]
  )

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const { full_name, ...rest } = data
      const { error } = await supabase
        .from("employees")
        .update({ name: full_name, ...rest })
        .eq("id", employeeId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee updated")
      setEditDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const openEditDialog = useCallback(() => {
    if (!employeeQuery.data) return
    reset({
      full_name: employeeQuery.data.name,
      email: employeeQuery.data.email ?? "",
      phone: employeeQuery.data.phone ?? "",
      branch_id: employeeQuery.data.branch_id ?? "",
      position: employeeQuery.data.position ?? "",
      department: employeeQuery.data.department ?? "",
      is_active: employeeQuery.data.is_active,
    })
    setEditDialogOpen(true)
  }, [employeeQuery.data, reset])

  const onSubmit = (data: EmployeeFormData) => {
    updateMutation.mutate(data)
  }

  const initials = employeeQuery.data?.name
    ? employeeQuery.data.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  const isOverdue = (assignment: AssignmentRecord) => {
    if (assignment.assignment_type !== "Loan" || !assignment.due_date) return false
    return new Date(assignment.due_date) < new Date() && !assignment.returned_date
  }

  if (employeeQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (employeeQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-destructive">Failed to load employee</p>
        <Button variant="outline" onClick={() => router.push("/employees")}>
          Back to Employees
        </Button>
      </div>
    )
  }

  const employee = employeeQuery.data!

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Employee Details</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{employee.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    ID: {employee.employee_id_number}
                  </p>
                </div>
                <Button onClick={openEditDialog}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Employee
                </Button>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {employee.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.branches?.name ?? "No Branch"}</span>
                </div>
                {employee.position && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.position}</span>
                  </div>
                )}
                {employee.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${overdueCount > 0 ? "text-destructive" : ""}`}>
              {overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currently Assigned Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssignmentsQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : activeAssignmentsQuery.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No active assignments
                    </TableCell>
                  </TableRow>
                ) : (
                  activeAssignmentsQuery.data?.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="font-mono text-sm hover:underline"
                        >
                          {assignment.assets?.asset_tag ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="hover:underline"
                        >
                          {assignment.assets?.name ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            assignment.assignment_type === "Permanent"
                              ? "default"
                              : "outline"
                          }
                        >
                          {assignment.assignment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(assignment.assigned_date)}</TableCell>
                      <TableCell>
                        {assignment.assignment_type === "Loan"
                          ? formatDate(assignment.due_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue(assignment) ? "destructive" : "default"}>
                          {isOverdue(assignment) ? "Overdue" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Returned Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentHistoryQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : assignmentHistoryQuery.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No assignment history
                    </TableCell>
                  </TableRow>
                ) : (
                  assignmentHistoryQuery.data?.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="hover:underline"
                        >
                          {assignment.assets?.name ?? "-"}
                        </Link>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {assignment.assets?.asset_tag ?? ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            assignment.assignment_type === "Permanent"
                              ? "default"
                              : "outline"
                          }
                        >
                          {assignment.assignment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(assignment.assigned_date)}</TableCell>
                      <TableCell>{formatDate(assignment.returned_date)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Returned</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Update the employee details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-full_name">Full Name</Label>
                <Input
                  id="edit-full_name"
                  placeholder="Enter full name"
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="email@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="Enter phone number"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-branch_id">Branch</Label>
                <Controller
                  name="branch_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger id="edit-branch_id">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesQuery.data?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.branch_id && (
                  <p className="text-sm text-destructive">{errors.branch_id.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  placeholder="Enter position"
                  {...register("position")}
                />
                {errors.position && (
                  <p className="text-sm text-destructive">{errors.position.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  placeholder="Enter department"
                  {...register("department")}
                />
                {errors.department && (
                  <p className="text-sm text-destructive">{errors.department.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="edit-is_active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
