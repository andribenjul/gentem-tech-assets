-- Gentem Tech Assets - Database Migration
-- Run this in Supabase SQL Editor

-- 1. Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  floor VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rooms_branch_id ON rooms(branch_id);

-- 3. Asset Categories
CREATE TABLE asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES asset_categories(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  brand VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,
  purchase_date DATE,
  purchase_price DECIMAL(15,2),
  warranty_expiry DATE,
  condition VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (condition IN ('New','Good','Fair','Damaged','Retired')),
  status VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Assigned','In Repair','Disposed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assets_category_id ON assets(category_id);
CREATE INDEX idx_assets_room_id ON assets(room_id);
CREATE INDEX idx_assets_branch_id ON assets(branch_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_asset_tag ON assets(asset_tag);

-- 5. Asset Images (stored in Supabase Storage)
CREATE TABLE asset_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asset_images_asset_id ON asset_images(asset_id);

-- 6. Asset Transfers (audit log for room/branch changes)
CREATE TABLE asset_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_room_id UUID REFERENCES rooms(id),
  to_room_id UUID REFERENCES rooms(id),
  from_branch_id UUID REFERENCES branches(id),
  to_branch_id UUID REFERENCES branches(id),
  transferred_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asset_transfers_asset_id ON asset_transfers(asset_id);

-- 7. Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  branch_id UUID REFERENCES branches(id),
  position VARCHAR(255),
  department VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_employees_branch_id ON employees(branch_id);

-- 8. Asset Assignments
CREATE TABLE asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  assignment_type VARCHAR(20) NOT NULL DEFAULT 'Permanent' CHECK (assignment_type IN ('Permanent','Loan')),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  returned_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Returned','Overdue')),
  condition_at_assignment VARCHAR(20),
  condition_at_return VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_loan_due_date CHECK (assignment_type != 'Loan' OR due_date IS NOT NULL),
  CONSTRAINT chk_returned_date CHECK (returned_date IS NULL OR returned_date >= assigned_date)
);

CREATE INDEX idx_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX idx_assignments_employee_id ON asset_assignments(employee_id);
CREATE INDEX idx_assignments_status ON asset_assignments(status);
CREATE INDEX idx_assignments_due_date ON asset_assignments(due_date);

-- 9. Handover Documents (BAST)
CREATE TABLE handover_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES asset_assignments(id),
  document_number VARCHAR(100) NOT NULL UNIQUE,
  generated_pdf_url TEXT,
  signed_pdf_url TEXT,
  signed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_handover_documents_assignment_id ON handover_documents(assignment_id);

-- Auto-generate asset_tag
CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START 1;

CREATE OR REPLACE FUNCTION generate_asset_tag()
RETURNS TRIGGER AS $$
BEGIN
  NEW.asset_tag := 'GTA-' || LPAD(nextval('asset_tag_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_asset_tag
  BEFORE INSERT ON assets
  FOR EACH ROW
  WHEN (NEW.asset_tag IS NULL)
  EXECUTE FUNCTION generate_asset_tag();

-- Auto-generate document_number
CREATE SEQUENCE IF NOT EXISTS doc_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.document_number := 'BAST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('doc_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_document_number
  BEFORE INSERT ON handover_documents
  FOR EACH ROW
  WHEN (NEW.document_number IS NULL)
  EXECUTE FUNCTION generate_document_number();

-- RLS Policies
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all branches" ON branches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert branches" ON branches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update branches" ON branches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete branches" ON branches FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all rooms" ON rooms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert rooms" ON rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update rooms" ON rooms FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete rooms" ON rooms FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all categories" ON asset_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert categories" ON asset_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update categories" ON asset_categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete categories" ON asset_categories FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all assets" ON assets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert assets" ON assets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update assets" ON assets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete assets" ON assets FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all asset_images" ON asset_images FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert asset_images" ON asset_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete asset_images" ON asset_images FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all transfers" ON asset_transfers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert transfers" ON asset_transfers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all employees" ON employees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert employees" ON employees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update employees" ON employees FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete employees" ON employees FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all assignments" ON asset_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert assignments" ON asset_assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update assignments" ON asset_assignments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete assignments" ON asset_assignments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all documents" ON handover_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert documents" ON handover_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update documents" ON handover_documents FOR UPDATE USING (auth.role() = 'authenticated');

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON asset_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();