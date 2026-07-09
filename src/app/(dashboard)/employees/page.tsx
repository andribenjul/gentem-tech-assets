"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { employeeSchema, type EmployeeFormData } from "@/lib/validations"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface Branch {
  id: string
  name: string
}

interface EmployeeRecord {
  id: string
  employee_id_number: string
  full_name: string
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

const ITEMS_PER_PAGE = 10

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [page, setPage] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      branch_id: "",
      position: "",
      department: "",
      is_active: true,
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

  const employeesQuery = useQuery({
    queryKey: ["employees", search, branchFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*, branches(name)", { count: "exact" })
        .order("full_name")

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      }
      if (branchFilter !== "all") {
        query = query.eq("branch_id", branchFilter)
      }

      const from = page * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count } = await query
      return { data: (data ?? []) as EmployeeRecord[], count: count ?? 0 }
    },
  })

  const totalPages = useMemo(
    () => Math.ceil((employeesQuery.data?.count ?? 0) / ITEMS_PER_PAGE),
    [employeesQuery.data?.count]
  )

  const openCreateDialog = useCallback(() => {
    setEditingEmployee(null)
    reset({
      full_name: "",
      email: "",
      phone: "",
      branch_id: "",
      position: "",
      department: "",
      is_active: true,
    })
    setDialogOpen(true)
  }, [reset])

  const openEditDialog = useCallback(
    (employee: EmployeeRecord) => {
      setEditingEmployee(employee)
      reset({
        full_name: employee.full_name,
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        branch_id: employee.branch_id ?? "",
        position: employee.position ?? "",
        department: employee.department ?? "",
        is_active: employee.is_active,
      })
      setDialogOpen(true)
    },
    [reset]
  )

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingEmployee(null)
    reset({
      full_name: "",
      email: "",
      phone: "",
      branch_id: "",
      position: "",
      department: "",
      is_active: true,
    })
  }, [reset])

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const { error } = await supabase.from("employees").insert({
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        branch_id: data.branch_id || null,
        position: data.position || null,
        department: data.department || null,
        is_active: data.is_active,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee created")
      closeDialog()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormData & { id: string }) => {
      const { id, full_name, email, phone, branch_id, position, department, is_active } = data
      const { error } = await supabase
        .from("employees")
        .update({
          full_name,
          email: email || null,
          phone: phone || null,
          branch_id: branch_id || null,
          position: position || null,
          department: department || null,
          is_active,
        })
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee updated")
      closeDialog()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee deleted")
      setDeleteId(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const onSubmit = (data: EmployeeFormData) => {
    if (editingEmployee) {
      updateMutation.mutate({ ...data, id: editingEmployee.id })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value)
      setPage(0)
    },
    []
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-8"
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>
              <Select
                value={branchFilter}
                onValueChange={(v) => {
                  setBranchFilter(v)
                  setPage(0)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branchesQuery.data?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : employeesQuery.data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  employeesQuery.data?.data.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Link
                          href={`/employees/${employee.id}`}
                          className="font-medium hover:underline"
                        >
                          {employee.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{employee.email ?? "-"}</TableCell>
                      <TableCell>{employee.phone ?? "-"}</TableCell>
                      <TableCell>{employee.branches?.name ?? "-"}</TableCell>
                      <TableCell>{employee.position ?? "-"}</TableCell>
                      <TableCell>{employee.department ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(employee.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Edit Employee" : "Create Employee"}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? "Update the employee details below."
                  : "Fill in the details to add a new employee."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="Enter full name"
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_id">Branch</Label>
                <Controller
                  name="branch_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger id="branch_id">
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
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="Enter position"
                  {...register("position")}
                />
                {errors.position && (
                  <p className="text-sm text-destructive">{errors.position.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
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
                      id="is_active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingEmployee ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
