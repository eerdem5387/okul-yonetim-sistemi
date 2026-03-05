import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const registrations = await prisma.newRegistration.findMany({
      include: {
        student: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Dynamic import for XLSX to keep edge/server compatibility
    const XLSX = await import("xlsx")

    const rows = registrations.map((reg, index) => {
      const contractData = reg.contractData as Record<string, unknown> | null
      const student = reg.student

      const fullName =
        (student ? `${student.firstName} ${student.lastName}` : "") ||
        (contractData?.studentName as string | undefined) ||
        ""

      const tc =
        student?.tcNumber ||
        (contractData?.studentTC as string | undefined) ||
        ""

      const gradeRaw =
        (contractData?.studentClass as string | undefined) ||
        student?.grade ||
        ""

      const academicYear =
        (contractData?.academicYear as string | undefined) || ""

      const contractNo =
        (contractData?.contractNo as string | undefined) || ""

      const registrationResponsible =
        (contractData?.registrationResponsible as string | undefined) || ""

      const totalFee =
        (contractData?.totalFee as number | string | undefined) || ""

      const registrationDate =
        (contractData?.registrationDate as string | undefined) ||
        reg.createdAt.toISOString().split("T")[0]

      const motherPhone = student?.motherPhone || ""
      const fatherPhone = student?.fatherPhone || ""

      // Varsayılan veli telefonu: önce anne, yoksa baba
      const parentPhone = motherPhone || fatherPhone

      return {
        "Sıra No": index + 1,
        "Öğrenci Ad Soyad": fullName,
        TC: tc,
        Sınıf: gradeRaw,
        "Akademik Yıl": academicYear,
        "Sözleşme No": contractNo,
        "Kayıt Tarihi": registrationDate,
        "Kayıt Sorumlusu": registrationResponsible,
        "Toplam Ücret": totalFee,
        "Veli Telefonu": parentPhone,
        "Anne Telefonu": motherPhone,
        "Baba Telefonu": fatherPhone,
        "Oluşturma Zamanı": reg.createdAt.toISOString(),
        "Güncelleme Zamanı": reg.updatedAt.toISOString(),
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Yeni Kayıtlar")
    const wbout: Uint8Array = XLSX.write(wb, {
      type: "array",
      bookType: "xlsx",
    }) as unknown as Uint8Array

    return new NextResponse(Buffer.from(wbout), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=yeni-kayitlar.xlsx",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error exporting new registrations:", error)
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 },
    )
  }
}

