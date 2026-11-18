import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireStaffAccess } from "@/lib/auth/api-guard"

/**
 * PUT /api/uniform-contracts/[id] — Yeni Kayıt / Kayıt Yenileme düzenleme ekranlarının forma bilgisi.
 * Gelen alanlar mevcut sözleşme verisinin ÜZERİNE birleştirilir; gönderilmeyen alanlar korunur.
 */
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "edit" })
    if (!auth.ok) return auth.response
    try {
        const params = await context.params
        const body = await request.json()
        const { contractData } = body

        if (contractData === null || typeof contractData !== "object" || Array.isArray(contractData)) {
            return NextResponse.json({ error: "contractData geçersiz" }, { status: 400 })
        }

        const existing = await prisma.uniformContract.findUnique({
            where: { id: params.id },
            select: { contractData: true },
        })
        if (!existing) {
            return NextResponse.json({ error: "Sözleşme bulunamadı" }, { status: 404 })
        }

        const previous =
            existing.contractData && typeof existing.contractData === "object" && !Array.isArray(existing.contractData)
                ? (existing.contractData as Record<string, unknown>)
                : {}

        const contract = await prisma.uniformContract.update({
            where: { id: params.id },
            data: { contractData: { ...previous, ...(contractData as Record<string, unknown>) } as Prisma.InputJsonValue },
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
        console.error("Error updating uniform contract:", error)
        return NextResponse.json({ error: "Failed to update uniform contract" }, { status: 500 })
    }
}
