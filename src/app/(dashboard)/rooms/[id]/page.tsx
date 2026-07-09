"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
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
import { ArrowLeft, Plus, ExternalLink, Building2, MapPin, Layers } from "lucide-react"
import Link from "next/link"
import { getStatusTextColor, getConditionColor } from "@/lib/utils"

interface RoomDetail {
  id: string
  name: string
  floor: string | null
  description: string | null
  created_at: string
  branches: { id: string; name: string; address: string | null } | null
}

interface AssetRecord {
  id: string
  asset_tag: string
  name: string
  brand: string | null
  status: string
  condition: string
  asset_categories: { name: string } | null
}

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const roomId = params.id as string

  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*, branches(id, name, address)")
        .eq("id", roomId)
        .single()
      if (error) throw error
      return data as unknown as RoomDetail
    },
  })

  const assetsQuery = useQuery({
    queryKey: ["room-assets", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*, asset_categories(name)")
        .eq("room_id", roomId)
        .order("name")
      if (error) throw error
      return (data ?? []) as AssetRecord[]
    },
  })

  const statusCounts = assetsQuery.data?.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {}) ?? {}

  if (roomQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (roomQuery.error || !roomQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-destructive text-lg">Failed to load room</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    )
  }

  const room = roomQuery.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/rooms")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{room.name}</h1>
          <p className="text-sm text-muted-foreground">Room Details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-medium">{room.branches?.name ?? "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Floor</p>
                <p className="font-medium">{room.floor ?? "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{room.branches?.address ?? "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(room.created_at)}</p>
              </div>
            </div>
          </div>
          {room.description && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1">{room.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{assetsQuery.data?.length ?? 0}</CardTitle>
            <CardDescription>Total Assets</CardDescription>
          </CardHeader>
        </Card>
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{count}</CardTitle>
              <CardDescription>{status}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assets in this Room</CardTitle>
            <CardDescription>
              {assetsQuery.data?.length ?? 0} asset{(assetsQuery.data?.length ?? 0) !== 1 ? "s" : ""} located here
            </CardDescription>
          </div>
          <Link href={`/assets/new?room_id=${roomId}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetsQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : assetsQuery.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No assets in this room
                    </TableCell>
                  </TableRow>
                ) : (
                  assetsQuery.data?.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono text-xs">{asset.asset_tag}</TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.asset_categories?.name ?? "-"}</TableCell>
                      <TableCell>{asset.brand ?? "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusTextColor(asset.status)}
                        >
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getConditionColor(asset.condition)}>
                          {asset.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/assets/${asset.id}`}>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
