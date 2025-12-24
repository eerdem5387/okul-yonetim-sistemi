import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/schedule-approvals
 * Onay bekleyen ders programı değişikliklerini döndürür
 * 
 * Query Parameters:
 * - status?: string - "PENDING" | "APPROVED" | "REJECTED"
 * - classId?: string - Belirli bir sınıfa ait onaylar
 * - requestedBy?: string - Belirli bir rehberlik uzmanının talepleri
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "PENDING"
    const classId = searchParams.get("classId")
    const requestedBy = searchParams.get("requestedBy")

    const whereConditions: Prisma.ScheduleApprovalWhereInput = {}

    if (status) {
      whereConditions.status = status as "PENDING" | "APPROVED" | "REJECTED"
    }

    if (classId) {
      whereConditions.classId = classId
    }

    if (requestedBy) {
      whereConditions.requestedBy = requestedBy
    }

    const approvals = await prisma.scheduleApproval.findMany({
      where: whereConditions,
      select: {
        id: true,
        scheduleId: true,
        classId: true, // ✅ classId'yi de döndür
        changeType: true,
        requestedBy: true,
        status: true,
        approvedBy: true,
        approvedAt: true,
        rejectedAt: true,
        notes: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        updatedAt: true,
        schedule: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // İstatistikler
    const stats = {
      pending: await prisma.scheduleApproval.count({
        where: { status: "PENDING" },
      }),
      approved: await prisma.scheduleApproval.count({
        where: { status: "APPROVED" },
      }),
      rejected: await prisma.scheduleApproval.count({
        where: { status: "REJECTED" },
      }),
    }

    return NextResponse.json({ approvals, stats })
  } catch (error) {
    console.error("Error fetching schedule approvals:", error)
    return NextResponse.json(
      { error: "Onay talepleri yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

