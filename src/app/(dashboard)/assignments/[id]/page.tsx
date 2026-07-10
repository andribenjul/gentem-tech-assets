"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import { format } from "date-fns"
import { pdf } from "@react-pdf/renderer"
import { Document, Page } from "react-pdf"
import { pdfjs } from "react-pdf"
import { toast } from "sonner"
import {
  ArrowLeft,
  Download,
  Eye,
  Loader2,
  Trash2,
  Undo2,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ReturnReceipt } from "@/components/pdf/return-receipt"
import type { AssetAssignment, Employee, Asset, HandoverDocument, Branch } from "@/types"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

type AssignmentDetail = AssetAssignment & {
  asset: Asset | null
  employee: (Employee & { branch: Branch | null }) | null
  handover_documents: HandoverDocument[]
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Active":
      return "border-transparent bg-blue-500 text-white"
    case "Returned":
      return "border-transparent bg-green-500 text-white"
    case "Overdue":
      return "border-transparent bg-red-500 text-white"
    default:
      return ""
  }
}

const typeBadgeClass = (type: string) => {
  switch (type) {
    case "Permanent":
      return "border-transparent bg-gray-500 text-white"
    case "Loan":
      return "border-transparent bg-yellow-500 text-white"
    default:
      return ""
  }
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const id = params.id as string

  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [conditionAtReturn, setConditionAtReturn] = useState("")
  const [returnBranchId, setReturnBranchId] = useState("")
  const [returnRoomId, setReturnRoomId] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [numPages, setNumPages] = useState<number | null>(null)

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_assignments")
        .select(
          `
          *,
          asset:assets(*),
          employee:employees(*, branch:branches(*)),
          handover_documents(*)
        `
        )
        .eq("id", id)
        .single()

      if (error) throw error
      return data as unknown as AssignmentDetail
    },
  })

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error("Assignment not found")
      if (!returnBranchId) throw new Error("Silakan pilih cabang tujuan pengembalian")

      const room = rooms?.find((r) => r.id === returnRoomId)
      const branch = branches?.find((b) => b.id === returnBranchId)
      if (!branch) throw new Error("Cabang tidak ditemukan")

      const assetData = assignment.asset
      const employeeData = assignment.employee
      const handoverDoc = assignment.handover_documents?.[0]

      const { error: assignError } = await supabase
        .from("asset_assignments")
        .update({
          returned_date: format(new Date(), "yyyy-MM-dd"),
          status: "Returned",
          condition_at_return: conditionAtReturn || null,
        })
        .eq("id", id)
      if (assignError) throw assignError

      if (assignment.asset_id) {
        const assetUpdate: Record<string, any> = {
          status: "Available",
          branch_id: returnBranchId,
          room_id: returnRoomId || null,
        }
        const { error: assetError } = await supabase
          .from("assets")
          .update(assetUpdate)
          .eq("id", assignment.asset_id)
        if (assetError) throw assetError
      }

      const returnDate = format(new Date(), "dd MMMM yyyy")
      const place = branch.name

      const returnDocNumber = handoverDoc
        ? `RET/${handoverDoc.document_number}`
        : `RET/${format(new Date(), "yyyyMM")}/${id.slice(0, 8).toUpperCase()}`

      const returnReceiptBlob = await pdf(
        <ReturnReceipt
          documentNumber={returnDocNumber}
          date={returnDate}
          place={place}
          employeeName={employeeData?.full_name ?? ""}
          employeePosition={employeeData?.position ?? "-"}
          employeeDepartment={employeeData?.department ?? "-"}
          assetTag={assetData?.asset_tag ?? ""}
          assetName={assetData?.name ?? ""}
          assetBrand={assetData?.brand ?? null}
          assetModel={assetData?.model ?? null}
          assetSerialNumber={assetData?.serial_number ?? null}
          assignmentType={assignment.assignment_type}
          dueDate={assignment.due_date}
          conditionAtReturn={conditionAtReturn || ""}
          returnBranch={branch.name}
          returnRoom={room?.name ?? ""}
        />
      ).toBlob()

      const filePath = `return/${id}/${returnDocNumber}.pdf`

      const { error: uploadError } = await supabase.storage
        .from("bast-documents")
        .upload(filePath, returnReceiptBlob, {
          contentType: "application/pdf",
          upsert: true,
        })
      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from("bast-documents")
        .getPublicUrl(filePath)

      const { error: docError } = await supabase
        .from("handover_documents")
        .insert({
          assignment_id: id,
          document_number: returnDocNumber,
          generated_pdf_url: publicUrl.publicUrl,
        })
      if (docError) throw docError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment", id] })
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast.success("Asset marked as returned successfully!")
      setShowReturnDialog(false)
      setConditionAtReturn("")
      setReturnBranchId("")
      setReturnRoomId("")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark as returned")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      for (const doc of assignment?.handover_documents ?? []) {
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

      if (assignment?.handover_documents && assignment.handover_documents.length > 0) {
        const ids = assignment.handover_documents.map((d) => d.id)
        await supabase.from("handover_documents").delete().in("id", ids)
      }

      if (assignment?.asset_id) {
        await supabase
          .from("assets")
          .update({ status: "Available" })
          .eq("id", assignment.asset_id)
      }

      const { error } = await supabase
        .from("asset_assignments")
        .delete()
        .eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast.success("Assignment deleted successfully!")
      router.push("/assignments")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete assignment")
    },
  })

  const uploadSignedMutation = useMutation({
    mutationFn: async (file: File) => {
      const handoverDoc = assignment?.handover_documents?.[0]
      if (!handoverDoc) throw new Error("No handover document found")

      const oldGeneratedUrl = handoverDoc.generated_pdf_url
      const filePath = `signed/${id}/${handoverDoc.document_number}-signed.pdf`

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
      queryClient.invalidateQueries({ queryKey: ["assignment", id] })
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast.success("Signed PDF uploaded successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload signed PDF")
    },
  })

  const uploadSignedReturnMutation = useMutation({
    mutationFn: async (file: File) => {
      const returnDoc = assignment?.handover_documents?.find(
        (d) => d.document_number?.startsWith("RET/")
      )
      if (!returnDoc) throw new Error("No return receipt document found")

      const oldGeneratedUrl = returnDoc.generated_pdf_url
      const filePath = `signed/${id}/return-${returnDoc.document_number}-signed.pdf`

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
        .eq("id", returnDoc.id)

      if (updateError) throw updateError

      if (oldGeneratedUrl) {
        const path = oldGeneratedUrl.split("/bast-documents/")[1]
        if (path) {
          await supabase.storage.from("bast-documents").remove([path])
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment", id] })
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast.success("Signed return receipt uploaded successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload signed return receipt")
    },
  })

  const handleReturnFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file")
        return
      }
      uploadSignedReturnMutation.mutate(file)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file")
        return
      }
      uploadSignedMutation.mutate(file)
    }
  }

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

  const returnFilteredRooms =
    rooms?.filter((r) => r.branch_id === returnBranchId) ?? []

  const prevReturnBranchRef = useRef(returnBranchId)
  useEffect(() => {
    if (prevReturnBranchRef.current && prevReturnBranchRef.current !== returnBranchId) {
      setReturnRoomId("")
    }
    prevReturnBranchRef.current = returnBranchId
  }, [returnBranchId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Assignment not found</h2>
        <Button asChild className="mt-4">
          <Link href="/assignments">Back to Assignments</Link>
        </Button>
      </div>
    )
  }

  const handoverDoc = assignment.handover_documents?.find(
    (d) => !d.document_number?.startsWith("RET/")
  ) ?? assignment.handover_documents?.[0]
  const returnDoc = assignment.handover_documents?.find(
    (d) => d.document_number?.startsWith("RET/")
  )
  const isOverdue =
    assignment.status === "Active" &&
    assignment.assignment_type === "Loan" &&
    assignment.due_date &&
    new Date(assignment.due_date) < new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assignments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {handoverDoc?.document_number ?? "Assignment Detail"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {assignment.status === "Active" && (
            <Button
              variant="default"
              onClick={() => setShowReturnDialog(true)}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Mark as Returned
            </Button>
          )}
          {!handoverDoc?.signed_pdf_url && (
            <AlertDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this assignment and make the
                    asset available again. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Document Number</Label>
              <p className="font-medium">
                {handoverDoc?.document_number ?? "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge className={statusBadgeClass(assignment.status)}>
                  {assignment.status}
                </Badge>
                {isOverdue && (
                  <Badge className="ml-2 border-transparent bg-red-500 text-white">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Assignment Type</Label>
              <div className="mt-1">
                <Badge className={typeBadgeClass(assignment.assignment_type)}>
                  {assignment.assignment_type}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Assigned Date</Label>
              <p className="font-medium">
                {formatDate(assignment.assigned_date)}
              </p>
            </div>
            {assignment.assignment_type === "Loan" && (
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <p className="font-medium">
                  {assignment.due_date
                    ? formatDate(assignment.due_date)
                    : "-"}
                </p>
              </div>
            )}
            {assignment.returned_date && (
              <div>
                <Label className="text-muted-foreground">Returned Date</Label>
                <p className="font-medium">
                  {formatDate(assignment.returned_date)}
                </p>
              </div>
            )}
            {assignment?.condition_at_return && (
              <div>
                <Label className="text-muted-foreground">
                  Condition at Return
                </Label>
                <p className="font-medium">
                  {assignment.condition_at_return}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Employee</Label>
              <p className="font-medium">
                {assignment.employee ? (
                  <Link
                    href={`/employees/${assignment.employee.id}`}
                    className="text-primary hover:underline"
                  >
                    {assignment.employee.full_name}
                  </Link>
                ) : (
                  "-"
                )}
              </p>
              {assignment.employee && (
                <p className="text-sm text-muted-foreground">
                  {assignment.employee.position ?? "-"} -{" "}
                  {assignment.employee.department ?? "-"}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Asset</Label>
              <p className="font-medium">
                {assignment.asset ? (
                  <Link
                    href={`/assets/${assignment.asset.id}`}
                    className="text-primary hover:underline"
                  >
                    {assignment.asset.asset_tag} - {assignment.asset.name}
                  </Link>
                ) : (
                  "-"
                )}
              </p>
              {assignment.asset && (
                <p className="text-sm text-muted-foreground">
                  {assignment.asset.brand ?? ""}{" "}
                  {assignment.asset.model ?? ""}
                </p>
              )}
            </div>
          </div>

          {assignment.notes && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Notes</Label>
                <p className="text-sm mt-1">{assignment.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {handoverDoc?.generated_pdf_url && (
        <Card>
          <CardHeader>
            <CardTitle>BAST Document</CardTitle>
            <CardDescription>
              Generated Berita Acara Serah Terima document.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
              <Document
                file={handoverDoc.generated_pdf_url}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                }
                error={
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Failed to load PDF preview.
                  </div>
                }
              >
                {Array.from(new Array(numPages ?? 1), (_, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={600}
                  />
                ))}
              </Document>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                window.open(handoverDoc.generated_pdf_url!, "_blank")
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Signed Document</CardTitle>
          <CardDescription>
            Upload the signed version of the BAST document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {handoverDoc?.signed_pdf_url ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="border-transparent bg-green-500 text-white">
                  Already Signed
                </Badge>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                <Document
                  file={handoverDoc.signed_pdf_url}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      Failed to load PDF preview.
                    </div>
                  }
                >
                  {Array.from(new Array(numPages ?? 1), (_, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={600}
                    />
                  ))}
                </Document>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(handoverDoc.signed_pdf_url!, "_blank")
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                View Signed PDF
              </Button>
              {handoverDoc.signed_at && (
                <p className="text-sm text-muted-foreground">
                  Signed on: {formatDate(handoverDoc.signed_at)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Label htmlFor="signed-pdf">Upload Signed PDF</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="signed-pdf"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploadSignedMutation.isPending}
                  className="max-w-sm"
                />
                {uploadSignedMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Upload the PDF document that has been signed by both parties.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {returnDoc?.generated_pdf_url && (
        <Card>
          <CardHeader>
            <CardTitle>Return Receipt Document</CardTitle>
            <CardDescription>
              Generated return receipt document.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
              <Document
                file={returnDoc.generated_pdf_url}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                }
                error={
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Failed to load PDF preview.
                  </div>
                }
              >
                {Array.from(new Array(numPages ?? 1), (_, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={600}
                  />
                ))}
              </Document>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                window.open(returnDoc.generated_pdf_url!, "_blank")
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </CardContent>
        </Card>
      )}

      {returnDoc && (
        <Card>
          <CardHeader>
            <CardTitle>Signed Return Receipt</CardTitle>
            <CardDescription>
              Upload the signed version of the return receipt document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {returnDoc.signed_pdf_url ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="border-transparent bg-green-500 text-white">
                    Already Signed
                  </Badge>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                  <Document
                    file={returnDoc.signed_pdf_url}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    }
                    error={
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        Failed to load PDF preview.
                      </div>
                    }
                  >
                    {Array.from(new Array(numPages ?? 1), (_, index) => (
                      <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        width={600}
                      />
                    ))}
                  </Document>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(returnDoc.signed_pdf_url!, "_blank")
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Signed PDF
                </Button>
                {returnDoc.signed_at && (
                  <p className="text-sm text-muted-foreground">
                    Signed on: {formatDate(returnDoc.signed_at)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="return-signed-pdf">Upload Signed PDF</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="return-signed-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleReturnFileUpload}
                    disabled={uploadSignedReturnMutation.isPending}
                    className="max-w-sm"
                  />
                  {uploadSignedReturnMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload the PDF document that has been signed by both parties.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Returned</DialogTitle>
            <DialogDescription>
              {isOverdue
                ? "This assignment is overdue. Please confirm the return and note the asset condition."
                : "Confirm that the asset has been returned."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isOverdue && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-3 text-sm text-red-700">
                  This asset was due on{" "}
                  {formatDate(assignment.due_date!)} and is overdue.
                  Please inspect the asset carefully upon return.
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              <Label>Return Destination Branch</Label>
              <Select value={returnBranchId} onValueChange={setReturnBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Return Destination Room</Label>
              <Select
                value={returnRoomId}
                onValueChange={setReturnRoomId}
                disabled={!returnBranchId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      returnBranchId ? "Select room" : "Select branch first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {returnFilteredRooms.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Condition at Return</Label>
              <Textarea
                id="condition"
                placeholder="Describe the condition of the asset upon return..."
                value={conditionAtReturn}
                onChange={(e) => setConditionAtReturn(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReturnDialog(false)
                setReturnBranchId("")
                setReturnRoomId("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending || !returnBranchId}
            >
              {returnMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
