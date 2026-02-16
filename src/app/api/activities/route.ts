import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"

// GET - Faaliyetleri listele (filtreleme ve sayfalama ile)
export async function GET(request: NextRequest) {
  // Yetki kontrolü
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const studentId = searchParams.get("studentId") || ""
    const type = searchParams.get("type") || ""
    const search = searchParams.get("search") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const isVerified = searchParams.get("isVerified") || ""

    const skip = (page - 1) * limit

    const whereConditions: Array<Record<string, unknown>> = []

    if (studentId) {
      whereConditions.push({ studentId })
    }

    if (type) {
      whereConditions.push({ type })
    }

    if (search) {
      whereConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { location: { contains: search, mode: "insensitive" as const } },
        ],
      })
    }

    if (startDate) {
      whereConditions.push({ activityDate: { gte: new Date(startDate) } })
    }

    if (endDate) {
      whereConditions.push({ activityDate: { lte: new Date(endDate) } })
    }

    if (isVerified === "true") {
      whereConditions.push({ isVerified: true })
    } else if (isVerified === "false") {
      whereConditions.push({ isVerified: false })
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
              tcNumber: true,
            },
          },
        },
        orderBy: {
          activityDate: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ])

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}

// POST - Yeni faaliyet oluştur
export async function POST(request: NextRequest) {
  // Yetki kontrolü
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      studentId,
      type,
      title,
      description,
      activityDate,
      location,
      organizer,
      duration,
      participants,
      outcome,
      evidence,
      notes,
      createdBy,
      certificateContents,
    } = body

    // Tarih kontrolü - geçmiş tarih olabilir ama gelecek tarih kontrolü yapılabilir
    const date = new Date(activityDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih formatı" }, { status: 400 })
    }

    // Batch creation if studentIds provided
    if (Array.isArray(body.studentIds) && body.studentIds.length > 0) {
      const studentIds = body.studentIds as string[]
      const certList = Array.isArray(certificateContents) ? certificateContents as Record<string, unknown>[] : []

      const activities = await prisma.$transaction(
        studentIds.map((sid, i) => {
          const createData = {
            studentId: sid,
            type,
            title,
            description,
            activityDate: date,
            location,
            organizer,
            duration: duration ? parseInt(duration) : null,
            participants: participants ? parseInt(participants) : null,
            outcome,
            evidence: evidence || "",
            notes,
            createdBy,
            certificateData: certList[i] ?? undefined,
          }
          return prisma.activity.create({
            data: createData as unknown as Prisma.ActivityCreateInput,
          })
        })
      )

      return NextResponse.json({
        success: true,
        count: activities.length,
        message: `${activities.length} adet faaliyet oluşturuldu.`
      })
    }

    // Legacy: Single student creation
    const certData = Array.isArray(certificateContents) && certificateContents.length > 0
      ? (certificateContents[0] as Record<string, unknown>)
      : undefined
    const createData = {
      studentId,
      type,
      title,
      description,
      activityDate: date,
      location,
      organizer,
      duration: duration ? parseInt(duration) : null,
      participants: participants ? parseInt(participants) : null,
      outcome,
      evidence: evidence || "",
      notes,
      createdBy,
      certificateData: certData,
    }
    const activity = await prisma.activity.create({
      data: createData as unknown as Prisma.ActivityCreateInput,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error("Error creating activity:", error)
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 })
  }
}

