"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { branchSchema, type BranchFormData } from "@/lib/validations"
import { z } from "zod"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Building2,
  DoorOpen,
  Package,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const roomFormSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  floor: z.string().optional(),
  description: z.string().optional(),
})

type RoomFormValues = z.infer<typeof roomFormSchema>

type RoomRow = {
  id: string
  name: string
  floor: string | null
  description: string | null
}

type BranchRow = {
  id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)

  const {
    data: branch,
    isLoading: branchLoading,
    error: branchError,
  } = useQuery({
    queryKey: ["branch", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, address, is_active, created_at")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as BranchRow
    },
  })

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("rooms")
        .select("id, name, floor, description")
        .eq("branch_id", id)
        .order("name")
      return (data ?? []) as RoomRow[]
    },
  })

  const { data: assetCount = 0 } = useQuery({
    queryKey: ["branch-assets-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("assets")
        .select("*", { count: "exact", head: true })
        .eq("branch_id", id)
      return count ?? 0
    },
  })

  const updateBranchMutation = useMutation({
    mutationFn: async (values: BranchFormData) => {
      const { error } = await supabase
        .from("branches")
        .update(values)
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch", id] })
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch updated successfully")
      setBranchDialogOpen(false)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const createRoomMutation = useMutation({
    mutationFn: async (values: RoomFormValues) => {
      const { error } = await supabase.from("rooms").insert({
        ...values,
        branch_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", id] })
      toast.success("Room added successfully")
      setRoomDialogOpen(false)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  if (branchLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (branchError || !branch) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Branch not found</h2>
          <p className="text-sm text-muted-foreground">
            The branch you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/branches")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Branches
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/branches">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{branch.name}</h1>
          <p className="text-sm text-muted-foreground">Branch details</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setBranchDialogOpen(true)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit Branch
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={branch.is_active ? "default" : "secondary"}>
              {branch.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rooms.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assetCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch Information</CardTitle>
          <CardDescription>
            Created on {formatDate(branch.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="text-sm font-medium">
              {branch.address || "No address provided"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rooms</CardTitle>
            <CardDescription>
              Rooms and areas within this branch
            </CardDescription>
          </div>
          <Button onClick={() => setRoomDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </CardHeader>
        <CardContent>
          {roomsLoading ? (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <DoorOpen className="h-8 w-8" />
              <p className="text-sm font-medium">No rooms yet</p>
              <p className="text-xs">
                Add a room to start organizing assets in this branch
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/rooms/${room.id}`}
                  className="group block"
                >
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium group-hover:underline">
                            {room.name}
                          </p>
                          {room.floor && (
                            <p className="text-xs text-muted-foreground">
                              Floor: {room.floor}
                            </p>
                          )}
                          {room.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {room.description}
                            </p>
                          )}
                        </div>
                        <DoorOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditBranchDialog
        open={branchDialogOpen}
        onOpenChange={setBranchDialogOpen}
        branch={branch}
        onSubmit={(values) => updateBranchMutation.mutate(values)}
        isPending={updateBranchMutation.isPending}
      />

      <AddRoomDialog
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
        onSubmit={(values) => createRoomMutation.mutate(values)}
        isPending={createRoomMutation.isPending}
      />
    </div>
  )
}

function EditBranchDialog({
  open,
  onOpenChange,
  branch,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: BranchRow
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

  useEffect(() => {
    if (open) {
      form.reset({
        name: branch.name,
        address: branch.address ?? "",
        is_active: branch.is_active,
      })
    }
  }, [open, branch, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Branch</DialogTitle>
          <DialogDescription>
            Update the branch details below.
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
                Update
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function AddRoomDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RoomFormValues) => void
  isPending: boolean
}) {
  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      floor: "",
      description: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: "", floor: "", description: "" })
    }
  }, [open, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Room</DialogTitle>
          <DialogDescription>
            Create a new room or area within this branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Server Room" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <FormControl>
                    <Input placeholder="3rd Floor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
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
                Create Room
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
