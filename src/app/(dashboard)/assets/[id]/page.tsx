"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Pencil, ArrowRight, History, User } from "lucide-react"
import { z } from "zod"

import { createClient } from "@/lib/supabase/client"
import { assetSchema } from "@/lib/validations"
import {
  formatDate,
  formatCurrency,
  getStatusTextColor,
  getConditionColor,
} from "@/lib/utils"

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
import { Separator } from "@/components/ui/separator"

type AssetFormData = z.infer<typeof assetSchema>

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("assets")
        .select(`
          *,
          category:asset_categories(name, code),
          room:rooms(id, name, branch_id),
          branch:branches(name)
        `)
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: transfers } = useQuery({
    queryKey: ["asset-transfers", id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("asset_transfers")
        .select(`
          *,
          from_branch:branches!from_branch_id(name),
          to_branch:branches!to_branch_id(name),
          from_room:rooms!from_room_id(name),
          to_room:rooms!to_room_id(name)
        `)
        .eq("asset_id", id)
        .order("transfer_date", { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const { data: activeAssignment } = useQuery({
    queryKey: ["asset-assignment", id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("asset_assignments")
        .select(`
          *,
          employee:employees(full_name)
        `)
        .eq("asset_id", id)
        .is("returned_date", null)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("rooms")
        .select("id, name, branch_id, branch:branches(name)")
        .order("name")
      return data ?? []
    },
  })

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("asset_categories")
        .select("*")
        .order("name")
      return data ?? []
    },
  })

  const { data: branches } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from("branches").select("*").order("name")
      return data ?? []
    },
  })

  const editForm = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema) as any,
    values: {
      name: asset?.name ?? "",
      category_id: asset?.category_id ?? "",
      branch_id: asset?.branch_id ?? "",
      room_id: asset?.room_id ?? "",
      brand: asset?.brand ?? "",
      model: asset?.model ?? "",
      serial_number: asset?.serial_number ?? "",
      purchase_date: asset?.purchase_date ?? "",
      purchase_price: asset?.purchase_price ?? undefined,
      warranty_expiry: asset?.warranty_expiry ?? "",
      condition: (asset?.condition as AssetFormData["condition"]) ?? "New",
      status: (asset?.status as AssetFormData["status"]) ?? "Available",
      notes: asset?.notes ?? "",
    },
  })

  const [editPriceDisplay, setEditPriceDisplay] = useState("")

  useEffect(() => {
    if (asset?.purchase_price != null) {
      setEditPriceDisplay(
        new Intl.NumberFormat("id-ID").format(asset.purchase_price)
      )
    }
  }, [asset])

  const editWatchedBranch = editForm.watch("branch_id")
  const prevEditBranchRef = useRef(editWatchedBranch)
  useEffect(() => {
    if (
      prevEditBranchRef.current &&
      prevEditBranchRef.current !== editWatchedBranch
    ) {
      editForm.setValue("room_id", "")
    }
    prevEditBranchRef.current = editWatchedBranch
  }, [editWatchedBranch, editForm])

  const editRooms =
    rooms?.filter((r) => r.branch_id === editWatchedBranch) ?? []

  const updateMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("assets")
        .update({
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
        })
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] })
      toast.success("Asset updated successfully")
      setEditDialogOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const [transferRoomId, setTransferRoomId] = useState("")
  const [transferNotes, setTransferNotes] = useState("")

  const selectedRoom = rooms?.find((r) => r.id === transferRoomId)

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferRoomId || !asset) return
      const supabase = createClient()
      const room = rooms?.find((r) => r.id === transferRoomId)
      if (!room) throw new Error("Room not found")

      const { error: transferError } = await supabase
        .from("asset_transfers")
        .insert({
          asset_id: asset.id,
          from_branch_id: asset.branch_id,
          to_branch_id: room.branch_id,
          from_room_id: asset.room_id,
          to_room_id: transferRoomId,
          notes: transferNotes || null,
        })
      if (transferError) throw transferError

      const { error: updateError } = await supabase
        .from("assets")
        .update({ room_id: transferRoomId, branch_id: room.branch_id })
        .eq("id", asset.id)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] })
      queryClient.invalidateQueries({ queryKey: ["asset-transfers", id] })
      toast.success("Asset transferred successfully")
      setTransferDialogOpen(false)
      setTransferRoomId("")
      setTransferNotes("")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Asset not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
          <p className="text-sm text-muted-foreground">
            Asset Tag: {asset.asset_tag}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRight className="mr-2 h-4 w-4" />
                Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-sm text-muted-foreground">Current Location</p>
                  <p className="font-medium">
                    {asset.branch?.name ?? "No branch"}
                    {asset.room
                      ? ` / ${(asset as any).room?.name ?? ""}`
                      : ""}
                  </p>
                </div>
                <div className="space-y-2">
                  <FormLabel>New Room</FormLabel>
                  <Select
                    value={transferRoomId}
                    onValueChange={setTransferRoomId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} - {(r as any).branch?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRoom && (
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      New Location
                    </p>
                    <p className="font-medium">
                      {(selectedRoom as any).branch?.name} / {selectedRoom.name}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <FormLabel>Transfer Reason</FormLabel>
                  <Textarea
                    placeholder="Reason for transfer..."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTransferDialogOpen(false)
                      setTransferRoomId("")
                      setTransferNotes("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => transferMutation.mutate()}
                    disabled={!transferRoomId || transferMutation.isPending}
                  >
                    {transferMutation.isPending
                      ? "Transferring..."
                      : "Confirm Transfer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Asset</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit((data) =>
                    updateMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
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
                            disabled={!editWatchedBranch}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    editWatchedBranch
                                      ? "Select room"
                                      : "Select branch first"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {editRooms.map((r) => (
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
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} />
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
                              value={editPriceDisplay}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, "")
                                if (raw) {
                                  const num = Number.parseInt(raw, 10)
                                  field.onChange(num)
                                  setEditPriceDisplay(
                                    new Intl.NumberFormat("id-ID").format(num)
                                  )
                                } else {
                                  field.onChange(undefined)
                                  setEditPriceDisplay("")
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                      onClick={() => setEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Asset Tag</p>
                <p className="font-medium">{asset.asset_tag}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{asset.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">
                  {asset.category?.name ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Brand</p>
                <p className="font-medium">{asset.brand ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Model</p>
                <p className="font-medium">{asset.model ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <p className="font-medium">{asset.serial_number ?? "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {asset.branch?.name ?? "No branch"}
                  {asset.room
                    ? ` / ${(asset as any).room?.name ?? ""}`
                    : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getStatusTextColor(asset.status)}`}
                >
                  {asset.status}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Condition</p>
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${getConditionColor(asset.condition)}`}
                >
                  {asset.condition}
                </span>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Date</p>
                <p className="font-medium">{formatDate(asset.purchase_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="font-medium">
                  {formatCurrency(asset.purchase_price)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warranty Expiry</p>
                <p className="font-medium">
                  {formatDate(asset.warranty_expiry)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{asset.notes ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeAssignment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee</p>
                <p className="font-medium">
                  {(activeAssignment as any).employee?.full_name ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {(activeAssignment as any).assignment_type ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned Date</p>
                <p className="font-medium">
                  {formatDate(activeAssignment.assigned_date)}
                </p>
              </div>
              {(activeAssignment as any).assignment_type === "Loan" && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {formatDate((activeAssignment as any).due_date)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!transfers || transfers.length === 0) ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No transfer history
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDate(t.transfer_date)}</TableCell>
                    <TableCell>
                      {t.from_branch?.name ?? "-"}
                      {t.from_room?.name ? ` / ${t.from_room.name}` : ""}
                    </TableCell>
                    <TableCell>
                      {t.to_branch?.name ?? "-"}
                      {t.to_room?.name ? ` / ${t.to_room.name}` : ""}
                    </TableCell>
                    <TableCell>{t.reason ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
