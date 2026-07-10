export interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  branch_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface AssetCategory {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  asset_category_id: string
  branch_id: string | null
  room_id: string | null
  name: string
  asset_tag: string
  serial_number: string | null
  model: string | null
  brand: string | null
  purchase_date: string | null
  purchase_price: number | null
  warranty_expiry: string | null
  condition: string
  status: string
  notes: string | null
  qr_code: string | null
  created_at: string
  updated_at: string
}

export interface AssetImage {
  id: string
  asset_id: string
  url: string
  created_at: string
}

export interface AssetTransfer {
  id: string
  asset_id: string
  from_branch_id: string | null
  to_branch_id: string | null
  from_room_id: string | null
  to_room_id: string | null
  transfer_date: string
  reason: string | null
  created_by: string
  created_at: string
}

export interface Employee {
  id: string
  branch_id: string | null
  employee_id_number: string
  full_name: string
  position: string | null
  department: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssetAssignment {
  id: string
  asset_id: string
  employee_id: string
  branch_id: string | null
  room_id: string | null
  assigned_date: string
  returned_date: string | null
  status: string
  assignment_type: string
  due_date: string | null
  condition_at_return: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HandoverDocument {
  id: string
  assignment_id: string
  document_number: string
  generated_pdf_url: string | null
  signed_pdf_url: string | null
  signed_at: string | null
  file_url: string | null
  signed_by_employee: boolean
  signed_by_admin: boolean
  signed_date_employee: string | null
  signed_date_admin: string | null
  created_at: string
  updated_at: string
}

export interface AssignmentAccessory {
  id: string
  assignment_id: string
  name: string
  condition_at_handover: string
  return_status: "Returned" | "Missing" | "Damaged" | null
  condition_at_return: string | null
  notes: string | null
  created_at: string
}