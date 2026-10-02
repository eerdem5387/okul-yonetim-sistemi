import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireHrRecruitmentAccess } from "@/lib/hr-recruitment/access"
import { HR_SOURCE_LABELS, HR_STATUS_LABELS } from "@/lib/hr-recruitment/constants"
import type { HrApplicationStatus, Prisma } from "@prisma/client"

type WorkHistoryRow = {
  institutionName?: string
  phone?: string
  directorName?: string
}

function formatWorkHistory(entries: unknown): string {
  if (!Array.isArray(entries)) return ""
  return entries
    .map((e, i) => {
      const entry = e as WorkHistoryRow
      return `${i + 1}. ${entry.institutionName ?? ""} — Müdür: ${entry.directorName ?? ""} — ${entry.phone ?? ""}`
    })
    .join(" | ")
}

function formatLevels(levels: unknown): string {
  if (!Array.isArray(levels)) return ""
  return levels.join(", ")
}

function formatClubs(clubs: unknown): string {
  if (!Array.isArray(clubs)) return ""
  return clubs.join(", ")
}

export async function GET(request: NextRequest) {
  const gate = await requireHrRecruitmentAccess(request, "export")
  if (gate.response) return gate.response

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim() || ""
    const branch = searchParams.get("branch")?.trim() || ""
    const status = searchParams.get("status")?.trim() || ""

    const whereConditions: Prisma.HrJobApplicationWhereInput[] = []
    if (search) {
      whereConditions.push({
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { appliedBranch: { contains: search, mode: "insensitive" } },
        ],
      })
    }
    if (branch) whereConditions.push({ appliedBranch: { equals: branch, mode: "insensitive" } })
    if (status) whereConditions.push({ status: status as HrApplicationStatus })

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

    const applications = await prisma.hrJobApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    const XLSX = await import("xlsx")
    const rows = applications.map((a, index) => ({
      "Sıra": index + 1,
      "Kaynak": HR_SOURCE_LABELS[a.source],
      "Ad Soyad": a.fullName,
      "Yaşadığı Yer": a.residence,
      "Doğum Yılı": a.birthYear,
      "Telefon": a.phone,
      "Üniversite / Bölüm": a.universityDepartment,
      "Formasyon": a.formationStatus,
      "Branş": a.appliedBranch,
      "Kademeler": formatLevels(a.experienceLevels),
      "Deneyim": a.totalExperience,
      "Özel Okul Deneyimi": a.hasPrivateSchoolExperience ? "Evet" : "Hayır",
      "Kulüp / Faaliyetler": formatClubs(a.clubsAndActivities),
      "Çalışma Geçmişi": formatWorkHistory(a.workHistory),
      "Durum": HR_STATUS_LABELS[a.status],
      "İç Not": a.internalNote || "",
      "CV": a.cvUrl,
      "Başvuru Tarihi": new Date(a.createdAt).toLocaleString("tr-TR"),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "IK Basvurulari")
    const buffer = Buffer.from(XLSX.write(wb, { type: "array", bookType: "xlsx" }))
    const dateStr = new Date().toISOString().split("T")[0]

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ik_basvurular_${dateStr}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("[ik-basvurular/export] error:", error)
    return NextResponse.json({ error: "Dışa aktarma başarısız" }, { status: 500 })
  }
}
