import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 80,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 14,
    borderBottom: "2pt solid #1e2a5e",
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerTextContainer: {
    flex: 1,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e2a5e",
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e2a5e",
    marginBottom: 6,
    borderBottom: "1pt solid #e5e7eb",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: 145,
    fontWeight: "bold",
    color: "#4b5563",
  },
  value: {
    flex: 1,
    color: "#1f2937",
  },
  dueDateValue: {
    flex: 1,
    color: "#dc2626",
    fontWeight: "bold",
  },
  ackText: {
    fontSize: 9,
    lineHeight: 1.6,
    textAlign: "justify",
    marginTop: 6,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e2a5e",
    marginTop: 8,
    marginBottom: 4,
  },
  termItem: {
    fontSize: 9,
    lineHeight: 1.6,
    textAlign: "justify",
    marginBottom: 2,
    paddingLeft: 4,
  },
  signatureSection: {
    flexDirection: "row",
    marginTop: 36,
    justifyContent: "space-between",
  },
  signatureColumn: {
    width: "45%",
    textAlign: "center",
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
  },
  signatureSpace: {
    height: 64,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
    borderTop: "1pt solid #000",
    paddingTop: 4,
  },
  signatureDate: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerBarNavy: {
    height: 28,
    backgroundColor: "#1e2a5e",
    justifyContent: "center",
    alignItems: "center",
  },
  footerBarOrange: {
    height: 4,
    backgroundColor: "#f0532a",
  },
  footerText: {
    color: "#ffffff",
    fontSize: 7,
    textAlign: "center",
  },
})

interface BastTemplateProps {
  documentNumber: string
  date: string
  place: string
  employeeName: string
  employeePosition: string
  employeeDepartment: string
  assetTag: string
  assetName: string
  assetBrand: string | null
  assetModel: string | null
  assetSerialNumber: string | null
  assignmentType: string
  dueDate: string | null
  companyName?: string
  companyAddress?: string
  branchName?: string
  roomName?: string
  categoryName?: string
  purchaseDate?: string | null
  approverName?: string
  logoUrl?: string
}

export function BastTemplate({
  documentNumber,
  date,
  place,
  employeeName,
  employeePosition,
  employeeDepartment,
  assetTag,
  assetName,
  assetBrand,
  assetModel,
  assetSerialNumber,
  assignmentType,
  dueDate,
  companyName = "PT Gentem Tech Indonesia",
  companyAddress = "Jakarta, Indonesia",
  branchName,
  roomName,
  categoryName,
  purchaseDate,
  approverName = "IT Admin",
  logoUrl = "/logo_gentem.png",
}: BastTemplateProps) {
  const isLoan = assignmentType === "Loan"

  const brandModel = [assetBrand, assetModel].filter(Boolean).join(" - ")
  const departmentPosition = [employeeDepartment, employeePosition]
    .filter(Boolean)
    .join(" / ")

  const getAcknowledgementText = () => {
    const base = `Saya, ${employeeName}, menyatakan menerima aset di atas dengan spesifikasi dan nomor seri seperti tersebut, untuk digunakan dalam pekerjaan di perusahaan.`
    if (isLoan && dueDate) {
      return `${base} Saya juga menyatakan dan wajib mengembalikan aset tersebut paling lambat pada ${dueDate}. Keterlambatan pengembalian tanpa konfirmasi dapat dikenakan tindak lanjut sesuai kebijakan perusahaan.`
    }
    return base
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Image style={styles.logo} src={logoUrl} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>IT Asset Handover Receipt</Text>
            <Text style={styles.headerSubtitle}>
              Berita Acara Serah Terima Aset
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail Informasi</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nomor Dokumen</Text>
            <Text style={styles.value}>{documentNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Karyawan</Text>
            <Text style={styles.value}>{employeeName}</Text>
          </View>
          {departmentPosition && (
            <View style={styles.row}>
              <Text style={styles.label}>Departemen/Posisi</Text>
              <Text style={styles.value}>{departmentPosition}</Text>
            </View>
          )}
          {branchName && (
            <View style={styles.row}>
              <Text style={styles.label}>Cabang</Text>
              <Text style={styles.value}>{branchName}</Text>
            </View>
          )}
          {roomName && (
            <View style={styles.row}>
              <Text style={styles.label}>Ruangan</Text>
              <Text style={styles.value}>{roomName}</Text>
            </View>
          )}
          {categoryName && (
            <View style={styles.row}>
              <Text style={styles.label}>Kategori Aset</Text>
              <Text style={styles.value}>{categoryName}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Nama Aset</Text>
            <Text style={styles.value}>{assetName}</Text>
          </View>
          {brandModel && (
            <View style={styles.row}>
              <Text style={styles.label}>Merek &amp; Model</Text>
              <Text style={styles.value}>{brandModel}</Text>
            </View>
          )}
          {assetSerialNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Nomor Seri</Text>
              <Text style={styles.value}>{assetSerialNumber}</Text>
            </View>
          )}
          {purchaseDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Pembelian</Text>
              <Text style={styles.value}>{purchaseDate}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Kode Aset</Text>
            <Text style={styles.value}>{assetTag}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tipe Serah Terima</Text>
            <Text style={styles.value}>
              {isLoan ? "Peminjaman (Loan)" : "Permanent"}
            </Text>
          </View>
          {isLoan && dueDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Batas Waktu Pengembalian</Text>
              <Text style={styles.dueDateValue}>{dueDate}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pernyataan Penerimaan</Text>
          <Text style={styles.ackText}>{getAcknowledgementText()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.termsTitle}>Ketentuan:</Text>
          <Text style={styles.termItem}>
            1. Kerusakan/kehilangan/pencurian aset beserta kelengkapannya yang
            tidak ditanggung garansi menjadi tanggung jawab pengguna.
          </Text>
          <Text style={styles.termItem}>
            2. Aset ini digunakan untuk keperluan pekerjaan/operasional
            perusahaan.
          </Text>
          {isLoan && (
            <Text style={styles.termItem}>
              3. Aset wajib dikembalikan dalam kondisi baik sebelum atau pada
              tanggal batas waktu yang tercantum di atas.
            </Text>
          )}
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>Diserahkan kepada,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureName}>{employeeName}</Text>
            <Text style={styles.signatureDate}>
              {place}, {date}
            </Text>
          </View>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>Disetujui oleh,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureName}>{approverName}</Text>
            <Text style={styles.signatureDate}>
              {place}, {date}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBarNavy}>
            <Text style={styles.footerText}>
              Generated by Gentem Tech Assets
            </Text>
          </View>
          <View style={styles.footerBarOrange} />
        </View>
      </Page>
    </Document>
  )
}
