import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const staffId = searchParams.get("staffId")
        const academicYearId = searchParams.get("academicYearId")

        if (!staffId) {
            return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
        }

        // Rehberlik danışmanını getir
        const counselor = await prisma.staff.findUnique({
            where: { id: staffId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                tcNumber: true,
                department: true,
            },
        })

        if (!counselor) {
            return NextResponse.json({ error: "Counselor not found" }, { status: 404 })
        }

        // Rehberlik danışmanının işaretlediği progress kayıtları
        const markedProgress = await prisma.progress.findMany({
            where: {
                markedBy: staffId,
                ...(academicYearId && {
                    topic: {
                        unit: {
                            subject: {
                                academicYearId: academicYearId,
                            },
                        },
                    },
                }),
            },
            include: {
                topic: {
                    include: {
                        unit: {
                            include: {
                                subject: true,
                            },
                        },
                    },
                },
            },
            orderBy: { markedAt: "desc" },
        })

        // Rehberlik danışmanının onayladığı progress kayıtları
        const approvedProgress = await prisma.progress.findMany({
            where: {
                approvedBy: staffId,
                ...(academicYearId && {
                    topic: {
                        unit: {
                            subject: {
                                academicYearId: academicYearId,
                            },
                        },
                    },
                }),
            },
            include: {
                topic: {
                    include: {
                        unit: {
                            include: {
                                subject: true,
                            },
                        },
                    },
                },
            },
            orderBy: { approvedAt: "desc" },
        })

        // Bildirilen progress kayıtları
        const reportedProgress = await prisma.progress.findMany({
            where: {
                reportedBy: staffId,
                ...(academicYearId && {
                    topic: {
                        unit: {
                            subject: {
                                academicYearId: academicYearId,
                            },
                        },
                    },
                }),
            },
            include: {
                topic: {
                    include: {
                        unit: {
                            include: {
                                subject: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        // Ders bazında gruplama
        const subjectStats: Record<string, {
            subjectId: string
            subjectName: string
            grade: number
            section: string | null
            markedCount: number
            approvedCount: number
            reportedCount: number
        }> = {}

        markedProgress.forEach((progress) => {
            const subject = progress.topic.unit.subject
            const key = subject.id
            if (!subjectStats[key]) {
                subjectStats[key] = {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    grade: subject.grade,
                    section: subject.section,
                    markedCount: 0,
                    approvedCount: 0,
                    reportedCount: 0,
                }
            }
            subjectStats[key].markedCount++
        })

        approvedProgress.forEach((progress) => {
            const subject = progress.topic.unit.subject
            const key = subject.id
            if (!subjectStats[key]) {
                subjectStats[key] = {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    grade: subject.grade,
                    section: subject.section,
                    markedCount: 0,
                    approvedCount: 0,
                    reportedCount: 0,
                }
            }
            subjectStats[key].approvedCount++
        })

        reportedProgress.forEach((progress) => {
            const subject = progress.topic.unit.subject
            const key = subject.id
            if (!subjectStats[key]) {
                subjectStats[key] = {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    grade: subject.grade,
                    section: subject.section,
                    markedCount: 0,
                    approvedCount: 0,
                    reportedCount: 0,
                }
            }
            subjectStats[key].reportedCount++
        })

        const subjects = Object.values(subjectStats)

        // Son aktiviteler (son 10 kayıt)
        const recentActivities = [
            ...markedProgress.slice(0, 5).map((p) => ({
                type: "marked" as const,
                date: p.markedAt,
                topic: p.topic.name,
                unit: p.topic.unit.name,
                subject: p.topic.unit.subject.name,
                grade: p.topic.unit.subject.grade,
                section: p.topic.unit.subject.section,
            })),
            ...approvedProgress.slice(0, 5).map((p) => ({
                type: "approved" as const,
                date: p.approvedAt,
                topic: p.topic.name,
                unit: p.topic.unit.name,
                subject: p.topic.unit.subject.name,
                grade: p.topic.unit.subject.grade,
                section: p.topic.unit.subject.section,
            })),
            ...reportedProgress.slice(0, 5).map((p) => ({
                type: "reported" as const,
                date: p.createdAt.toISOString(),
                topic: p.topic.name,
                unit: p.topic.unit.name,
                subject: p.topic.unit.subject.name,
                grade: p.topic.unit.subject.grade,
                section: p.topic.unit.subject.section,
            })),
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 10)

        return NextResponse.json({
            counselor,
            subjects,
            recentActivities,
            summary: {
                totalSubjects: subjects.length,
                totalMarked: markedProgress.length,
                totalApproved: approvedProgress.length,
                totalReported: reportedProgress.length,
                totalActivities: markedProgress.length + approvedProgress.length + reportedProgress.length,
            },
        })
    } catch (error) {
        console.error("Error fetching counselor performance:", error)
        return NextResponse.json(
            { error: "Failed to fetch counselor performance" },
            { status: 500 }
        )
    }
}

