import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const students = await prisma.student.findMany({ orderBy: { createdAt: "desc" } })

        // Dynamic import to keep edge/server compatibility
        const XLSX = await import("xlsx")

        const rows = students.map((s) => ({
            "Ad": s.firstName,
            "Soyad": s.lastName,
            "TC": s.tcNumber,
            "Doğum Tarihi": s.birthDate.toISOString().split("T")[0],
            "Sınıf": s.grade,
            "Öğrenci Telefon": s.phone || "",
            "Öğrenci E-posta": s.email || "",
            "Öğrenci Adres": s.address,
            "Anne Ad Soyad": (s as any).motherName || "",
            "Anne TC": (s as any).motherTc || "",
            "Anne Telefon": (s as any).motherPhone || "",
            "Anne Adres": (s as any).motherAddress || "",
            "Anne Meslek": (s as any).motherOccupation || "",
            "Baba Ad Soyad": (s as any).fatherName || "",
            "Baba TC": (s as any).fatherTc || "",
            "Baba Telefon": (s as any).fatherPhone || "",
            "Baba Adres": (s as any).fatherAddress || "",
            "Baba Meslek": (s as any).fatherOccupation || "",
            "Oluşturma": s.createdAt.toISOString(),
            "Güncelleme": s.updatedAt.toISOString(),
        }))

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, "Öğrenciler")
        const wbout: Uint8Array = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as unknown as Uint8Array

        return new NextResponse(Buffer.from(wbout), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": "attachment; filename=ogrenciler.xlsx",
                "Cache-Control": "no-store",
            },
        })
    } catch (error) {
        console.error("Error exporting students:", error)
        return NextResponse.json({ error: "Failed to export" }, { status: 500 })
    }
}


