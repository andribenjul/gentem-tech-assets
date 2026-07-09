"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { branchSchema, type BranchFormData } from "@/lib/validations"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Search, Building2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type BranchRow = {
  id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export default function BranchesPage() {
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchRow | null>(null)
  const [deletingBranch, setDeletingBranch] = useState<BranchRow | null>(null)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, address, is_active, created_at")
        .order("name")
      return (data ?? []) as BranchRow[]
    },
  })

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: async (values: BranchFormData) => {
      const { error } = await supabase.from("branches").insert(values)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch created successfully")
      setDialogOpen(false)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: BranchFormData & { id: string }) => {
      const { error } = await supabase
        .from("branches")
        .update(values)
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch updated successfully")
      setDialogOpen(false)
      setEditingBranch(null)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch deleted successfully")
      setDeletingBranch(null)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  function handleOpenAdd() {
    setEditingBranch(null)
    setDialogOpen(true)
  }

  function handleOpenEdit(branch: BranchRow) {
    setEditingBranch(branch)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingBranch(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Manage your company branches
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Building2 className="h-10 w-10" />
                      <p className="text-sm font-medium">No branches found</p>
                      <p className="text-xs">
                        {search
                          ? "Try a different search term"
                          : "Get started by adding your first branch"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/branches/${branch.id}`}
                        className="hover:underline"
                      >
                        {branch.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.address ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={branch.is_active ? "default" : "secondary"}
                      >
                        {branch.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(branch.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(branch)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingBranch(branch)}
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
        </CardContent>
      </Card>

      <BranchDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        branch={editingBranch}
        onSubmit={(values) => {
          if (editingBranch) {
            updateMutation.mutate({ ...values, id: editingBranch.id })
          } else {
            createMutation.mutate(values)
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog
        open={!!deletingBranch}
        onOpenChange={(open) => {
          if (!open) setDeletingBranch(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deletingBranch?.name}</span>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingBranch && deleteMutation.mutate(deletingBranch.id)
              }
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

function BranchDialog({
  open,
  onOpenChange,
  branch,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: BranchRow | null
  onSubmit: (values: BranchFormData) => void
  isPending: boolean
}) {
  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      address: "",
      is_active: true,
    },
  })

  const isEditing = !!branch

  useEffect(() => {
    if (open) {
      form.reset(
        branch
          ? { name: branch.name, address: branch.address ?? "", is_active: branch.is_active }
          : { name: "", address: "", is_active: true }
      )
    }
  }, [open, branch, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Branch" : "Add Branch"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the branch details below."
              : "Fill in the details to create a new branch."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Head Office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Main Street, City"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <FormLabel className="mb-0 leading-none">Active</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
