import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const roomSchema = z.object({
  branch_id: z.string().uuid("Branch ID must be a valid UUID"),
  name: z.string().min(1, "Room name is required"),
  floor: z.string().optional(),
  description: z.string().optional(),
});

export const assetCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  code: z.string().min(2).max(10).optional(),
  description: z.string().optional(),
});

export const assetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  category_id: z.string().uuid(),
  room_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  asset_tag: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_price: z.number().positive().optional(),
  warranty_expiry: z.string().optional(),
  condition: z
    .enum(["New", "Good", "Fair", "Damaged", "Retired"])
    .default("New"),
  status: z
    .enum(["Available", "Assigned", "In Repair", "Disposed"])
    .default("Available"),
  notes: z.string().optional(),
});

export const employeeSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const assignmentSchema = z
  .object({
    asset_id: z.string().uuid(),
    employee_id: z.string().uuid(),
    assignment_type: z.enum(["Permanent", "Loan"]),
    assigned_date: z.string(),
    due_date: z.string().nullable().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.assignment_type === "Loan") {
        return data.due_date != null && data.due_date !== "";
      }
      return true;
    },
    {
      message: "Due date is required when assignment type is Loan",
      path: ["due_date"],
    },
  );

export type Branch = z.infer<typeof branchSchema>;
export type Room = z.infer<typeof roomSchema>;
export type AssetCategory = z.infer<typeof assetCategorySchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;

export type BranchFormData = z.input<typeof branchSchema>;
export type RoomFormData = z.input<typeof roomSchema>;
export type AssetCategoryFormData = z.input<typeof assetCategorySchema>;
export type AssetFormData = z.input<typeof assetSchema>;
export type EmployeeFormData = z.input<typeof employeeSchema>;
export type AssignmentFormData = z.input<typeof assignmentSchema>;