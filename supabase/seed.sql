-- Seed data for Gentem Tech Assets

-- 12 Branches
INSERT INTO branches (id, name, address, is_active) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'Kantor Pusat Jakarta', 'Jl. Jenderal Sudirman No. 1, Jakarta Pusat', true),
  ('b0000002-0000-0000-0000-000000000002', 'Cabang Bandung', 'Jl. Asia Afrika No. 45, Bandung', true),
  ('b0000003-0000-0000-0000-000000000003', 'Cabang Surabaya', 'Jl. Tunjungan No. 12, Surabaya', true),
  ('b0000004-0000-0000-0000-000000000004', 'Cabang Yogyakarta', 'Jl. Malioboro No. 88, Yogyakarta', true),
  ('b0000005-0000-0000-0000-000000000005', 'Cabang Semarang', 'Jl. Pandanaran No. 33, Semarang', true),
  ('b0000006-0000-0000-0000-000000000006', 'Cabang Medan', 'Jl. Balai Kota No. 10, Medan', true),
  ('b0000007-0000-0000-0000-000000000007', 'Cabang Makassar', 'Jl. Jenderal Sudirman No. 25, Makassar', true),
  ('b0000008-0000-0000-0000-000000000008', 'Cabang Bali', 'Jl. Sunset Road No. 66, Kuta, Bali', true),
  ('b0000009-0000-0000-0000-000000000009', 'Cabang Palembang', 'Jl. Jenderal Ahmad Yani No. 5, Palembang', true),
  ('b0000010-0000-0000-0000-000000000010', 'Cabang Batam', 'Jl. Engku Putri No. 78, Batam', true),
  ('b0000011-0000-0000-0000-000000000011', 'Cabang Pontianak', 'Jl. Ahmad Yani No. 21, Pontianak', true),
  ('b0000012-0000-0000-0000-000000000012', 'Cabang Manado', 'Jl. Sam Ratulangi No. 15, Manado', true);

-- Asset Categories
INSERT INTO asset_categories (id, name, code, description) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Laptop', 'LAP', 'Laptop notebook untuk karyawan'),
  ('c0000002-0000-0000-0000-000000000002', 'PC Desktop', 'PC', 'Komputer desktop dan workstation'),
  ('c0000003-0000-0000-0000-000000000003', 'Monitor', 'MON', 'Monitor LCD/LED'),
  ('c0000004-0000-0000-0000-000000000004', 'Printer', 'PRN', 'Printer dan multifunction device'),
  ('c0000005-0000-0000-0000-000000000005', 'Access Point', 'AP', 'Wireless access point'),
  ('c0000006-0000-0000-0000-000000000006', 'Switch', 'SW', 'Network switch managed/unmanaged'),
  ('c0000007-0000-0000-0000-000000000007', 'Firewall', 'FW', 'Firewall dan security appliance'),
  ('c0000008-0000-0000-0000-000000000008', 'Server', 'SRV', 'Server rackmount/tower'),
  ('c0000009-0000-0000-0000-000000000009', 'UPS', 'UPS', 'Uninterruptible Power Supply'),
  ('c0000010-0000-0000-0000-000000000010', 'Telepon', 'TEL', 'Telepon IP dan analog'),
  ('c0000011-0000-0000-0000-000000000011', 'Tablet', 'TAB', 'Tablet untuk presentasi/mobile'),
  ('c0000012-0000-0000-0000-000000000012', 'Perangkat Jaringan Lainnya', 'NET', 'Router, modem, dan perangkat jaringan lainnya');