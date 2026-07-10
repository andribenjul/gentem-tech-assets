"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  Search,
  FileText,
  Upload,
  CheckCircle2,
  MoreHorizontal,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AssetAssignment, Employee, Asset, HandoverDocument } from "@/types"

type AssignmentWithRelations = AssetAssignment & {
  asset: Pick<Asset, "id" | "name" | "asset_tag">
  employee: Pick<Employee, "id" | "full_name">
  handover_document: Pick<
    HandoverDocument,
    "id" | "document_number" | "generated_pdf_url" | "signed_pdf_url" | "signed_at"
  > | null
}

const PAGE_SIZE = 10

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Active":
      return "border-transparent bg-blue-500 text-white hover:bg-blue-500/80"
    case "Returned":
      return "border-transparent bg-green-500 text-white hover:bg-green-500/80"
    case "Overdue":
      return "border-transparent bg-red-500 text-white hover:bg-red-500/80"
    default:
      return ""
  }
}

const typeBadgeClass = (type: string) => {
  switch (type) {
    case "Permanent":
      return "border-transparent bg-gray-500 text-white hover:bg-gray-500/80"
    case "Loan":
      return "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80"
    default:
      return ""
  }
}

const docStatusBadgeClass = (
  doc: Pick<HandoverDocument, "generated_pdf_url" | "signed_pdf_url"> | null
) => {
  if (!doc?.generated_pdf_url) return "border-transparent bg-gray-400 text-white"
  if (!doc.signed_pdf_url) return "border border-yellow-400 text-yellow-600 bg-yellow-50"
  return "border-transparent bg-green-500 text-white"
}

const docStatusLabel = (
  doc: Pick<HandoverDocument, "generated_pdf_url" | "signed_pdf_url"> | null
) => {
  if (!doc?.generated_pdf_url) return "No Document"
  if (!doc.signed_pdf_url) return "Pending Signature"
  return "Signed"
}

export default function AssignmentsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [uploadDialogAssignment, setUploadDialogAssignment] =
    useState<AssignmentWithRelations | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const { data: employees } = useQuery({
    queryKey: ["employees", "active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name")
      return data ?? []
    },
  })

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("name")
      return data ?? []
    },
  })

  const {
    data: assignmentsData,
    isLoading,
  } = useQuery({
    queryKey: [
      "assignments",
      page,
      statusFilter,
      typeFilter,
      employeeFilter,
      branchFilter,
      search,
    ],
    queryFn: async () => {
      let query = supabase
        .from("asset_assignments")
        .select(
          `
          *,
          asset:assets(id, name, asset_tag),
          employee:employees(id, full_name),
          handover_document:handover_documents(id, document_number, generated_pdf_url, signed_pdf_url, signed_at)
        `,
          { count: "exact" }
        )

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }
      if (typeFilter !== "all") {
        query = query.eq("assignment_type", typeFilter)
      }
      if (employeeFilter !== "all") {
        query = query.eq("employee_id", employeeFilter)
      }
      if (branchFilter !== "all") {
        query = query.eq("branch_id", branchFilter)
      }
      if (search) {
        query = query.or(
          `handover_document.document_number.ilike.%${search}%,asset.name.ilike.%${search}%`
        )
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) throw error
      return { data: (data as unknown as AssignmentWithRelations[]) ?? [], count: count ?? 0 }
    },
  })

  const uploadSignedMutation = useMutation({
    mutationFn: async ({
      assignment,
      file,
    }: {
      assignment: AssignmentWithRelations
      file: File
    }) => {
      const handoverDoc = assignment.handover_document
      if (!handoverDoc) throw new Error("No handover document found")

      const oldGeneratedUrl = handoverDoc.generated_pdf_url
      const filePath = `signed/${assignment.id}/${handoverDoc.document_number}-signed.pdf`

      const { error: uploadError } = await supabase.storage
        .from("signed-documents")
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from("signed-documents")
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from("handover_documents")
        .update({
          signed_pdf_url: publicUrl.publicUrl,
          signed_at: new Date().toISOString(),
          generated_pdf_url: null,
        })
        .eq("id", handoverDoc.id)

      if (updateError) throw updateError

      if (oldGeneratedUrl) {
        const path = oldGeneratedUrl.split("/bast-documents/")[1]
        if (path) {
          await supabase.storage.from("bast-documents").remove([path])
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast.success("Signed PDF uploaded successfully!")
      setUploadDialogAssignment(null)
      setUploadFile(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload signed PDF")
    },
  })

  const handleUpload = () => {
    if (!uploadDialogAssignment || !uploadFile) return
    uploadSignedMutation.mutate({
      assignment: uploadDialogAssignment,
      file: uploadFile,
    })
  }

  const totalPages = Math.ceil((assignmentsData?.count ?? 0) / PAGE_SIZE)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <Button asChild>
            <Link href="/assignments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search document number or asset..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </form>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Loan">Loan</SelectItem>
                </SelectContent>
              </Select>
              <Select value={employeeFilter} onValueChange={(v) => { setEmployeeFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Branch" />
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Number</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : assignmentsData?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No assignments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignmentsData?.data.map((assignment) => {
                    const handoverDoc = assignment.handover_document
                    const hasGeneratedPdf = !!handoverDoc?.generated_pdf_url
                    const hasSignedPdf = !!handoverDoc?.signed_pdf_url
                    const isUploading =
                      uploadSignedMutation.isPending &&
                      uploadDialogAssignment?.id === assignment.id

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {handoverDoc?.document_number ?? "-"}
                        </TableCell>
                        <TableCell>{assignment.asset?.name}</TableCell>
                        <TableCell>{assignment.employee?.full_name}</TableCell>
                        <TableCell>
                          <Badge className={typeBadgeClass(assignment.assignment_type)}>
                            {assignment.assignment_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadgeClass(assignment.status)}>
                            {assignment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(assignment.assigned_date)}</TableCell>
                        <TableCell>
                          {assignment.due_date ? formatDate(assignment.due_date) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={docStatusBadgeClass(handoverDoc)}>
                            {docStatusLabel(handoverDoc)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Desktop actions */}
                            <div className="hidden md:flex items-center gap-1">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/assignments/${assignment.id}`}>View</Link>
                              </Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!hasGeneratedPdf}
                                      onClick={() => {
                                        if (handoverDoc?.generated_pdf_url) {
                                          window.open(handoverDoc.generated_pdf_url, "_blank")
                                        }
                                      }}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {hasGeneratedPdf
                                    ? "View PDF"
                                    : "Dokumen belum tersedia"}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!hasGeneratedPdf || isUploading}
                                      onClick={() => {
                                        if (hasSignedPdf && handoverDoc?.signed_pdf_url) {
                                          window.open(handoverDoc.signed_pdf_url, "_blank")
                                        } else {
                                          setUploadDialogAssignment(assignment)
                                        }
                                      }}
                                    >
                                      {hasSignedPdf ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Upload className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {!hasGeneratedPdf
                                    ? "Dokumen belum tersedia"
                                    : hasSignedPdf
                                      ? "View Signed PDF"
                                      : "Upload Signed PDF"}
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Mobile dropdown */}
                            <div className="flex md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[180px]">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/assignments/${assignment.id}`}>
                                      View
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={!hasGeneratedPdf}
                                    onClick={() => {
                                      if (handoverDoc?.generated_pdf_url) {
                                        window.open(handoverDoc.generated_pdf_url, "_blank")
                                      }
                                    }}
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={!hasGeneratedPdf}
                                    onClick={() => {
                                      if (hasSignedPdf && handoverDoc?.signed_pdf_url) {
                                        window.open(handoverDoc.signed_pdf_url, "_blank")
                                      } else {
                                        setUploadDialogAssignment(assignment)
                                      }
                                    }}
                                  >
                                    {hasSignedPdf ? (
                                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                    ) : (
                                      <Upload className="mr-2 h-4 w-4" />
                                    )}
                                    {hasSignedPdf ? "View Signed PDF" : "Upload Signed PDF"}
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
              Page {page} of {totalPages}
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

        {/* Upload Signed PDF Dialog */}
        <Dialog
          open={!!uploadDialogAssignment}
          onOpenChange={(open) => {
            if (!open) {
              setUploadDialogAssignment(null)
              setUploadFile(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Signed PDF</DialogTitle>
              <DialogDescription>
                Upload the signed BAST document for this assignment.
              </DialogDescription>
            </DialogHeader>
            {uploadDialogAssignment && (
              <div className="space-y-4 py-2">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Asset:</span>{" "}
                    {uploadDialogAssignment.asset?.name}
                  </p>
                  <p>
                    <span className="font-medium">Employee:</span>{" "}
                    {uploadDialogAssignment.employee?.full_name}
                  </p>
                  <p>
                    <span className="font-medium">Document:</span>{" "}
                    {uploadDialogAssignment.handover_document?.document_number}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signed-pdf-upload">Signed PDF File</Label>
                  <Input
                    id="signed-pdf-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.type !== "application/pdf") {
                          toast.error("Please upload a PDF file")
                          return
                        }
                        setUploadFile(file)
                      }
                    }}
                    disabled={uploadSignedMutation.isPending}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadDialogAssignment(null)
                  setUploadFile(null)
                }}
                disabled={uploadSignedMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || uploadSignedMutation.isPending}
              >
                {uploadSignedMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
