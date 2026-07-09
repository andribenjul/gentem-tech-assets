"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { assignmentSchema } from "@/lib/validations"
import type { z } from "zod"
import { format } from "date-fns"
import { pdf } from "@react-pdf/renderer"
import { Document, Page } from "react-pdf"
import { pdfjs } from "react-pdf"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Eye,
  Loader2,
  Search,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { BastTemplate } from "@/components/pdf/bast-template"
import type { Employee, Asset } from "@/types"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

type FormValues = z.infer<typeof assignmentSchema>

export default function NewAssignmentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [, setPdfBlob] = useState<Blob | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [numPages, setNumPages] = useState<number | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      asset_id: "",
      employee_id: "",
      assignment_type: "Permanent",
      assigned_date: format(new Date(), "yyyy-MM-dd"),
      due_date: null,
      notes: "",
    },
  })

  const watchType = form.watch("assignment_type")

  const { data: employees } = useQuery({
    queryKey: ["employees", "active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("name")
      return (data ?? []) as Employee[]
    },
  })

  const { data: availableAssets } = useQuery({
    queryKey: ["assets", "available"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("status", "Available")
        .order("name")
      return (data ?? []) as Asset[]
    },
  })

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").order("name")
      return data ?? []
    },
  })

  const [employeeSearch, setEmployeeSearch] = useState("")
  const [assetSearch, setAssetSearch] = useState("")
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)

  const filteredEmployees = employees?.filter(
    (e) =>
      e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.employee_id_number
        ?.toLowerCase()
        .includes(employeeSearch.toLowerCase())
  )

  const filteredAssets = availableAssets?.filter(
    (a) =>
      a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.asset_tag.toLowerCase().includes(assetSearch.toLowerCase())
  )

  const selectedEmployee = employees?.find(
    (e) => e.id === form.watch("employee_id")
  )
  const selectedAsset = availableAssets?.find(
    (a) => a.id === form.watch("asset_id")
  )
  const selectedBranch = branches?.find((b) => b.id === selectedEmployee?.branch_id)

  const generatePdfBlob = useCallback(
    async (assignment: FormValues & { documentNumber: string }) => {
      const blob = await pdf(
        <BastTemplate
          documentNumber={assignment.documentNumber}
          date={format(new Date(assignment.assigned_date), "dd MMMM yyyy")}
          place={selectedBranch?.name ?? "Jakarta"}
          employeeName={selectedEmployee?.name ?? ""}
          employeePosition={selectedEmployee?.position ?? "-"}
          employeeDepartment={selectedEmployee?.department ?? "-"}
          assetTag={selectedAsset?.asset_tag ?? ""}
          assetName={selectedAsset?.name ?? ""}
          assetBrand={selectedAsset?.brand ?? null}
          assetModel={selectedAsset?.model ?? null}
          assetSerialNumber={selectedAsset?.serial_number ?? null}
          assignmentType={assignment.assignment_type}
          dueDate={
            assignment.due_date
              ? format(new Date(assignment.due_date), "dd MMMM yyyy")
              : null
          }
        />
      ).toBlob()
      return blob
    },
    [selectedBranch, selectedEmployee, selectedAsset]
  )

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const employee = employees?.find((e) => e.id === values.employee_id)
      const asset = availableAssets?.find((a) => a.id === values.asset_id)

      if (!employee) throw new Error("Employee not found")
      if (!asset) throw new Error("Asset not found")

      const branchId = employee.branch_id

      const { data: assignment, error: assignError } = await supabase
        .from("asset_assignments")
        .insert({
          asset_id: values.asset_id,
          employee_id: values.employee_id,
          branch_id: branchId,
          assigned_date: values.assigned_date,
          due_date: values.assignment_type === "Loan" ? values.due_date : null,
          notes: values.notes || null,
          status: "Active",
          assignment_type: values.assignment_type,
        })
        .select()
        .single()

      if (assignError) throw assignError

      const { error: assetError } = await supabase
        .from("assets")
        .update({ status: "Assigned" })
        .eq("id", values.asset_id)

      if (assetError) throw assetError

      const docNumber = `BAST/${format(new Date(), "yyyyMM")}/${assignment.id.slice(0, 8).toUpperCase()}`

      const pdfBlob = await generatePdfBlob({
        ...values,
        documentNumber: docNumber,
      })

      const filePath = `bast/${assignment.id}/${docNumber}.pdf`

      const { error: uploadError } = await supabase.storage
        .from("bast-documents")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from("bast-documents")
        .getPublicUrl(filePath)

      const { data: handoverDoc, error: handoverError } = await supabase
        .from("handover_documents")
        .insert({
          assignment_id: assignment.id,
          document_number: docNumber,
          generated_pdf_url: publicUrl.publicUrl,
        })
        .select()
        .single()

      if (handoverError) throw handoverError

      setPdfBlob(pdfBlob)

      return { assignment, handoverDoc, pdfBlob }
    },
    onSuccess: ({ pdfBlob }) => {
      const url = URL.createObjectURL(pdfBlob)
      setPdfPreviewUrl(url)
      setShowPdfModal(true)
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast.success("Assignment created successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create assignment")
    },
  })

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values)
  }

  const handleClosePdfModal = () => {
    setShowPdfModal(false)
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
    }
    const assignmentId = createMutation.data?.assignment.id
    if (assignmentId) {
      router.push(`/assignments/${assignmentId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/assignments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Assignment</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
              <CardDescription>
                Select the employee who will receive the asset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                      >
                        {field.value && selectedEmployee
                          ? `${selectedEmployee.name} (${selectedEmployee.employee_id_number})`
                          : "Select employee..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      {showEmployeeDropdown && (
                        <Card className="absolute z-50 w-full mt-1 p-0">
                          <div className="p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search employees..."
                                value={employeeSearch}
                                onChange={(e) => setEmployeeSearch(e.target.value)}
                                className="pl-8 h-9"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredEmployees?.length === 0 ? (
                              <p className="text-sm text-muted-foreground p-2">
                                No employees found.
                              </p>
                            ) : (
                              filteredEmployees?.map((emp) => (
                                <button
                                  type="button"
                                  key={emp.id}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2",
                                    field.value === emp.id && "bg-accent"
                                  )}
                                  onClick={() => {
                                    field.onChange(emp.id)
                                    setShowEmployeeDropdown(false)
                                    setEmployeeSearch("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      field.value === emp.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <p className="font-medium">{emp.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {emp.position ?? "-"} - {emp.department ?? "-"}
                                    </p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
              <CardDescription>
                Select an asset to assign. Only available assets are shown.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="asset_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                      >
                        {field.value && selectedAsset
                          ? `${selectedAsset.asset_tag} - ${selectedAsset.name}`
                          : "Select asset..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      {showAssetDropdown && (
                        <Card className="absolute z-50 w-full mt-1 p-0">
                          <div className="p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search assets..."
                                value={assetSearch}
                                onChange={(e) => setAssetSearch(e.target.value)}
                                className="pl-8 h-9"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredAssets?.length === 0 ? (
                              <p className="text-sm text-muted-foreground p-2">
                                No available assets found.
                              </p>
                            ) : (
                              filteredAssets?.map((asset) => (
                                <button
                                  type="button"
                                  key={asset.id}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2",
                                    field.value === asset.id && "bg-accent"
                                  )}
                                  onClick={() => {
                                    field.onChange(asset.id)
                                    setShowAssetDropdown(false)
                                    setAssetSearch("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      field.value === asset.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {asset.asset_tag} - {asset.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {asset.brand ?? ""} {asset.model ?? ""}
                                      {asset.serial_number
                                        ? ` - ${asset.serial_number}`
                                        : ""}
                                    </p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>
                Set the type and dates for this assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="assignment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                        <SelectItem value="Loan">Loan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchType === "Loan" && (
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Required for Loan assignments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/assignments")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Assignment
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BAST Document Preview</DialogTitle>
          </DialogHeader>
          {pdfPreviewUrl && (
            <div className="flex flex-col items-center gap-4">
              <Document
                file={pdfPreviewUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                  <div className="flex items-center gap-2 py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading PDF...
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
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (pdfPreviewUrl) {
                      window.open(pdfPreviewUrl, "_blank")
                    }
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Open PDF
                </Button>
                <Button onClick={handleClosePdfModal}>
                  Continue to Assignment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
