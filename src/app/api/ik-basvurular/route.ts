import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireHrRecruitmentAccess } from "@/lib/hr-recruitment/access"
import { createManualHrApplication } from "@/lib/hr-recruitment/manual-application"
import type { HrApplicationStatus, Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  const gate = await requireHrRecruitmentAccess(request, "view")
  if (gate.response) return gate.response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const search = searchParams.get("search")?.trim() || ""
    const branch = searchParams.get("branch")?.trim() || ""
    const status = searchParams.get("status")?.trim() || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    const whereConditions: Prisma.HrJobApplicationWhereInput[] = []

    if (search) {
      whereConditions.push({
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { appliedBranch: { contains: search, mode: "insensitive" } },
          { universityDepartment: { contains: search, mode: "insensitive" } },
        ],
      })
    }

    if (branch) {
      whereConditions.push({ appliedBranch: { equals: branch, mode: "insensitive" } })
    }

    if (status) {
      whereConditions.push({ status: status as HrApplicationStatus })
    }

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {}
      if (startDate) createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        createdAt.lte = end
      }
      whereConditions.push({ createdAt })
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}
    const skip = (page - 1) * limit
    const total = await prisma.hrJobApplication.count({ where })

    const applications = await prisma.hrJobApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    })

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    console.error("[ik-basvurular] GET error:", error)
    return NextResponse.json({ error: "Başvurular yüklenemedi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireHrRecruitmentAccess(request, "edit")
  if (gate.response) return gate.response

  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
    }

    const { fullName, phone, note } = body as {
      fullName?: string
      phone?: string | null
      note?: string | null
    }
    if (!fullName?.trim()) {
      return NextResponse.json({ error: "Ad Soyad zorunludur" }, { status: 400 })
    }

    const application = await createManualHrApplication({ fullName, phone, note })
    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error("[ik-basvurular] POST error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Başvuru eklenemedi" },
      { status: 400 }
    )
  }
}
