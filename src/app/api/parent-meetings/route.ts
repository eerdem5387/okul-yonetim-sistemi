import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tüm görüşmeleri listele (filtreleme ile)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("studentId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const whereConditions: Record<string, unknown> = {}

    if (studentId) {
      whereConditions.studentId = studentId
    }

    if (startDate || endDate) {
      whereConditions.meetingDate = {}
      if (startDate) {
        whereConditions.meetingDate = {
          ...whereConditions.meetingDate as Record<string, unknown>,
          gte: new Date(startDate)
        }
      }
      if (endDate) {
        whereConditions.meetingDate = {
          ...whereConditions.meetingDate as Record<string, unknown>,
          lte: new Date(endDate)
        }
      }
    }

    const [meetings, total] = await Promise.all([
      prisma.parentMeeting.findMany({
        where: whereConditions,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
              tcNumber: true
            }
          }
        },
        orderBy: {
          meetingDate: "desc"
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.parentMeeting.count({ where: whereConditions })
    ])

    return NextResponse.json({
      meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching parent meetings:", error)
    return NextResponse.json(
      { error: "Görüşmeler getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni görüşme ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, meetingDate, notes, counselorName, staffId } = body

    if (!studentId || !meetingDate || !notes) {
      return NextResponse.json(
        { error: "Öğrenci, görüşme tarihi ve notlar zorunludur" },
        { status: 400 }
      )
    }

    // ✅ Staff bilgisini çek (eğer staffId varsa)
    let finalCounselorName = counselorName || null
    if (staffId && !finalCounselorName) {
      try {
        const staff = await prisma.staff.findUnique({
          where: { id: staffId },
          select: { firstName: true, lastName: true },
        })
        if (staff) {
          finalCounselorName = `${staff.firstName} ${staff.lastName}`
        }
      } catch (err) {
        console.error("Error fetching staff:", err)
        // Hata durumunda counselorName null kalır
      }
    }

    const meeting = await prisma.parentMeeting.create({
      data: {
        studentId,
        meetingDate: new Date(meetingDate),
        notes,
        counselorName: finalCounselorName
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            tcNumber: true
          }
        }
      }
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error("Error creating parent meeting:", error)
    return NextResponse.json(
      { error: "Görüşme oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

