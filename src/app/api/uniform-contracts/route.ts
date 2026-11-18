import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireStaffAccess } from "@/lib/auth/api-guard"

/**
 * Forma bilgisi artık yalnızca Yeni Kayıt / Kayıt Yenileme ekranlarından yazılıyor
 * (ayrı "Forma Sözleşmesi" sayfası kaldırıldı). Bu route o ekranlar ve eski mobil sürümler için duruyor.
 *
 * GET ?studentId= → yalnızca o öğrencinin forma sözleşmeleri (en yeni önce).
 * Eskiden `studentId` yok sayılıp TÜM öğrencilerin sözleşmeleri dönüyordu; düzenleme ekranı da listenin
 * ilk satırını (başka bir öğrencinin sözleşmesini) güncelliyordu.
 */
export async function GET(request: NextRequest) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "view" })
    if (!auth.ok) return auth.response
    try {
        const studentId = new URL(request.url).searchParams.get("studentId")?.trim() || ""
        const contracts = await prisma.uniformContract.findMany({
            where: studentId ? { studentId } : undefined,
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json(contracts)
    } catch (error) {
        console.error("Error fetching uniform contracts:", error)
        return NextResponse.json({ error: "Failed to fetch uniform contracts" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireStaffAccess(
        request,
        { module: "registrations", action: "create" },
        { module: "registrations", action: "edit" }
    )
    if (!auth.ok) return auth.response
    try {
        const body = await request.json()
        const { studentId, contractData } = body

        if (!studentId || typeof studentId !== "string") {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }
        if (contractData !== undefined && (contractData === null || typeof contractData !== "object" || Array.isArray(contractData))) {
            return NextResponse.json({ error: "contractData geçersiz" }, { status: 400 })
        }

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true },
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        const contract = await prisma.uniformContract.create({
            data: {
                studentId,
                contractData: (contractData || {}) as Prisma.InputJsonValue
            },
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        tcNumber: true
                    }
                }
            }
        })

        return NextResponse.json(contract)
    } catch (error) {
        console.error("Error creating uniform contract:", error)
        return NextResponse.json({ error: "Failed to create uniform contract" }, { status: 500 })
    }
}
