import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textDecoration: "underline",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    backgroundColor: "#f3f4f6",
    padding: "4 8",
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: 140,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
  },
  termsText: {
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: "justify",
    marginTop: 4,
  },
  signatureSection: {
    flexDirection: "row",
    marginTop: 40,
    justifyContent: "space-between",
  },
  signatureColumn: {
    width: "45%",
    textAlign: "center",
  },
  signatureLabel: {
    fontWeight: "bold",
    marginBottom: 60,
    fontSize: 10,
  },
  signatureName: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#6b7280",
  },
  divider: {
    borderBottom: "1 solid #d1d5db",
    marginVertical: 16,
  },
  datePlace: {
    textAlign: "right",
    marginBottom: 4,
    fontSize: 10,
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
}: BastTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>BERITA ACARA SERAH TERIMA</Text>
          <Text style={styles.subtitle}>
            Nomor: {documentNumber}
          </Text>
        </View>

        <View style={styles.datePlace}>
          <Text>
            {place}, {date}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA PERUSAHAAN</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Perusahaan</Text>
            <Text style={styles.value}>: {companyName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Alamat</Text>
            <Text style={styles.value}>: {companyAddress}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA KARYAWAN</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama</Text>
            <Text style={styles.value}>: {employeeName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jabatan</Text>
            <Text style={styles.value}>: {employeePosition}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Departemen</Text>
            <Text style={styles.value}>: {employeeDepartment}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA ASET</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Asset Tag</Text>
            <Text style={styles.value}>: {assetTag}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Aset</Text>
            <Text style={styles.value}>: {assetName}</Text>
          </View>
          {assetBrand && (
            <View style={styles.row}>
              <Text style={styles.label}>Merek</Text>
              <Text style={styles.value}>: {assetBrand}</Text>
            </View>
          )}
          {assetModel && (
            <View style={styles.row}>
              <Text style={styles.label}>Model</Text>
              <Text style={styles.value}>: {assetModel}</Text>
            </View>
          )}
          {assetSerialNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Nomor Seri</Text>
              <Text style={styles.value}>: {assetSerialNumber}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMASI PENUGASAN</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Jenis Penugasan</Text>
            <Text style={styles.value}>
              : {assignmentType === "Permanent" ? "Permanen" : "Pinjaman"}
            </Text>
          </View>
          {assignmentType === "Loan" && dueDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Batas Pengembalian</Text>
              <Text style={styles.value}>: {dueDate}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KETENTUAN</Text>
          <Text style={styles.termsText}>
            1. Pihak Pertama menyerahkan aset tersebut kepada Pihak Kedua dalam
            kondisi baik dan layak pakai sesuai dengan data aset yang tercantum
            di atas.
          </Text>
          <Text style={styles.termsText}>
            2. Pihak Kedua bertanggung jawab penuh atas keamanan, pemeliharaan,
            dan penggunaan aset sesuai dengan peruntukannya.
          </Text>
          <Text style={styles.termsText}>
            3. Pihak Kedua wajib mengembalikan aset dalam kondisi yang sama
            ketika diterima, dengan memperhatikan keausan normal.
          </Text>
          <Text style={styles.termsText}>
            4. Apabila terjadi kerusakan atau kehilangan, Pihak Kedua wajib
            melaporkan dan bertanggung jawab sesuai dengan ketentuan yang
            berlaku di perusahaan.
          </Text>
          {assignmentType === "Loan" && (
            <Text style={styles.termsText}>
              5. Aset wajib dikembalikan paling lambat pada tanggal yang telah
              ditentukan. Keterlambatan pengembalian akan dikenakan sanksi
              sesuai kebijakan perusahaan.
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.signatureSection}>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>Pihak Pertama,</Text>
            <Text style={styles.signatureName}>{companyName}</Text>
          </View>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>Pihak Kedua,</Text>
            <Text style={styles.signatureName}>{employeeName}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Dokumen ini dibuat secara elektronik dan berlaku tanpa tanda tangan
          basah.
        </Text>
      </Page>
    </Document>
  )
}
