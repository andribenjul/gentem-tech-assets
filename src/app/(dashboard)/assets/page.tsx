"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Pencil,
  MoreHorizontal,
} from "lucide-react"
import { z } from "zod"

import { createClient } from "@/lib/supabase/client"
import { assetSchema } from "@/lib/validations"
import { formatDate, getStatusTextColor, getConditionColor } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AssetFormData = z.infer<typeof assetSchema>

const PAGE_SIZE = 15

export default function AssetsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [branchFilter, setBranchFilter] = useState("")
  const [roomFilter, setRoomFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { setPage(1) }, [branchFilter, roomFilter, categoryFilter, statusFilter, debouncedSearch])

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["assets", page, branchFilter, roomFilter, categoryFilter, statusFilter, debouncedSearch],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from("assets")
        .select(`
          *,
          category:asset_categories(name),
          room:rooms(name),
          branch:branches(name)
        `, { count: "exact" })

      if (branchFilter) query = query.eq("branch_id", branchFilter)
      if (roomFilter) query = query.eq("room_id", roomFilter)
      if (categoryFilter) query = query.eq("category_id", categoryFilter)
      if (statusFilter) query = query.eq("status", statusFilter)
      if (debouncedSearch) {
        query = query.or(
          `asset_tag.ilike.%${debouncedSearch}%,serial_number.ilike.%${debouncedSearch}%,name.ilike.%${debouncedSearch}%`
        )
      }

      const from = (page - 1) * PAGE_SIZE
      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      return { items: data ?? [], total: count ?? 0 }
    },
  })

  const { data: activeAssignments } = useQuery({
    queryKey: ["active-assignments"],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("asset_assignments")
        .select("asset_id, employee:employees!inner(full_name)")
        .eq("status", "Active")
      return (data ?? []) as unknown as { asset_id: string; employee: { full_name: string } | null }[]
    },
  })

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from("asset_categories").select("*").order("name")
      return data ?? []
    },
  })

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from("branches").select("*").order("name")
      return data ?? []
    },
  })

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from("rooms").select("*").order("name")
      return data ?? []
    },
  })

  const filteredRooms = roomFilter || branchFilter
    ? (rooms ?? []).filter((r) => !branchFilter || r.branch_id === branchFilter)
    : rooms

  const totalPages = Math.ceil((assetsData?.total ?? 0) / PAGE_SIZE)

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema) as any,
    defaultValues: {
      name: "",
      category_id: "",
      branch_id: "",
      room_id: "",
      asset_tag: "",
      brand: "",
      model: "",
      serial_number: "",
      purchase_date: "",
      purchase_price: undefined,
      warranty_expiry: "",
      condition: "New",
      status: "Available",
      notes: "",
    },
  })

  const watchedBranchId = form.watch("branch_id")
  const prevBranchRef = useRef(watchedBranchId)
  useEffect(() => {
    if (prevBranchRef.current && prevBranchRef.current !== watchedBranchId) {
      form.setValue("room_id", "")
    }
    prevBranchRef.current = watchedBranchId
  }, [watchedBranchId, form])

  const formRooms = rooms?.filter((r) => r.branch_id === watchedBranchId) ?? []

  const [priceDisplay, setPriceDisplay] = useState("")

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      const supabase = createClient()
      if (!data.category_id || !data.branch_id || !data.room_id) {
        throw new Error("Category, Branch, and Room wajib diisi")
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(data.category_id)) throw new Error("Category ID tidak valid")
      if (!uuidRegex.test(data.branch_id)) throw new Error("Branch ID tidak valid")
      if (!uuidRegex.test(data.room_id)) throw new Error("Room ID tidak valid")
      const payload: Record<string, any> = {
        name: data.name,
        category_id: data.category_id,
        branch_id: data.branch_id,
        room_id: data.room_id,
        brand: data.brand || null,
        model: data.model || null,
        serial_number: data.serial_number || null,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price != null ? data.purchase_price : null,
        warranty_expiry: data.warranty_expiry || null,
        condition: data.condition,
        status: data.status,
        notes: data.notes || null,
      }
      if (data.asset_tag) {
        payload.asset_tag = data.asset_tag
      }
      const { error } = await supabase.from("assets").insert(payload)
      if (error) {
        if (error.message?.includes("asset_tag") && error.code === "23505") {
          throw new Error("Asset tag sudah digunakan")
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      toast.success("Asset created successfully")
      setAddDialogOpen(false)
      form.reset()
      setPriceDisplay("")
    },
    onError: (error) => {
      console.error("Create asset error:", error)
      toast.error(String(error?.message || error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()

      const { data: assignments } = await supabase
        .from("asset_assignments")
        .select("id")
        .eq("asset_id", id)

      const assignmentIds = (assignments ?? []).map((a) => a.id)

      if (assignmentIds.length > 0) {
        const { data: handoverDocs } = await supabase
          .from("handover_documents")
          .select("id, generated_pdf_url, signed_pdf_url")
          .in("assignment_id", assignmentIds)

        for (const doc of handoverDocs ?? []) {
          if (doc.generated_pdf_url) {
            const path = doc.generated_pdf_url.split("/bast-documents/")[1]
            if (path) {
              await supabase.storage.from("bast-documents").remove([path])
            }
          }
          if (doc.signed_pdf_url) {
            const path = doc.signed_pdf_url.split("/signed-documents/")[1]
            if (path) {
              await supabase.storage.from("signed-documents").remove([path])
            }
          }
        }

        await supabase
          .from("handover_documents")
          .delete()
          .in("assignment_id", assignmentIds)

        await supabase
          .from("asset_assignments")
          .delete()
          .eq("asset_id", id)
      }

      await supabase.from("asset_transfers").delete().eq("asset_id", id)

      const { error } = await supabase.from("assets").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      toast.success("Asset deleted successfully")
      setDeleteId(null)
    },
    onError: (error) => {
      toast.error(error.message || "Gagal menghapus aset")
    },
  })

  const onSubmit = useCallback(
    (data: AssetFormData) => createMutation.mutate(data),
    [createMutation]
  )

  const assigneeMap = new Map(
    activeAssignments?.map((a) => [a.asset_id, a.employee?.full_name]) ?? []
  )

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Asset</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Asset name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="branch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select branch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branches?.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="room_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!watchedBranchId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    watchedBranchId
                                      ? "Select room"
                                      : "Select branch first"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {formRooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="asset_tag"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Tag</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Leave empty for auto-generate"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Brand" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Model" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Serial number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="purchase_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price (IDR)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0"
                              value={priceDisplay}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, "")
                                if (raw) {
                                  const num = Number.parseInt(raw, 10)
                                  field.onChange(num)
                                  setPriceDisplay(
                                    new Intl.NumberFormat("id-ID").format(num)
                                  )
                                } else {
                                  field.onChange(undefined)
                                  setPriceDisplay("")
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="warranty_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Expiry</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["New", "Good", "Fair", "Damaged", "Retired"].map(
                                (c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["Available", "Assigned", "In Repair", "Disposed"].map(
                                (s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddDialogOpen(false)
                        form.reset()
                        setPriceDisplay("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search asset tag, serial number, or name..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={roomFilter}
                onValueChange={setRoomFilter}
                disabled={!branchFilter || branchFilter === "all"}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {filteredRooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {["Available", "Assigned", "In Repair", "Disposed"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch / Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (assetsData?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  (assetsData?.items ?? []).map((asset: any) => {
                    const assignedTo = assigneeMap.get(asset.id)
                    return (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Link
                            href={`/assets/${asset.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {asset.asset_tag}
                          </Link>
                        </TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.category?.name ?? "-"}</TableCell>
                        <TableCell>
                          {asset.branch?.name ?? "-"}
                          {asset.room?.name ? ` / ${asset.room.name}` : ""}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold w-fit ${getStatusTextColor(asset.status)}`}
                            >
                              {asset.status}
                            </span>
                            {asset.status === "Assigned" && assignedTo && (
                              <span className="text-xs text-muted-foreground">
                                &rarr; {assignedTo}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${getConditionColor(asset.condition)}`}
                          >
                            {asset.condition}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(asset.purchase_date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Desktop */}
                            <div className="hidden md:flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button variant="ghost" size="icon" asChild>
                                      <Link href={`/assets/${asset.id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>View</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button variant="ghost" size="icon" asChild>
                                      <Link href={`/assets/${asset.id}?edit=true`}>
                                        <Pencil className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <AlertDialog
                                open={deleteId === asset.id}
                                onOpenChange={(open) => {
                                  if (!open) setDeleteId(null)
                                }}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteId(asset.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete{" "}
                                      <strong>{asset.name}</strong>? This action cannot
                                      be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(asset.id)}
                                      disabled={deleteMutation.isPending}
                                    >
                                      {deleteMutation.isPending
                                        ? "Deleting..."
                                        : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>

                            {/* Mobile */}
                            <div className="flex md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[160px]">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/assets/${asset.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/assets/${asset.id}?edit=true`}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteId(asset.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({assetsData?.total ?? 0} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
