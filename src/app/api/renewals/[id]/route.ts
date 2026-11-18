import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaffAccess } from "@/lib/auth/api-guard"
import { updateRenewalContract } from "@/lib/contract-registration-update"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "view" })
    if (!auth.ok) return auth.response
    try {
        const params = await context.params
        const renewal = await prisma.renewal.findUnique({
            where: { id: params.id },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        tcNumber: true,
                        grade: true,
                        birthDate: true,
                        address: true,
                        motherName: true,
                        motherPhone: true,
                        fatherName: true,
                        fatherPhone: true
                    }
                }
            }
        })

        if (!renewal) {
            return NextResponse.json({ error: "Renewal not found" }, { status: 404 })
        }

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error fetching renewal:", error)
        return NextResponse.json({ error: "Failed to fetch renewal" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "edit" })
    if (!auth.ok) return auth.response
    try {
        const params = await context.params
        const body = await request.json()
        const incoming = (body.contractData || {}) as Record<string, unknown>

        const result = await updateRenewalContract(params.id, incoming)
        if (!result.ok) {
            return NextResponse.json(
                { error: result.error, ...(result.code ? { code: result.code } : {}) },
                { status: result.status }
            )
        }
        return NextResponse.json(result.renewal)
    } catch (error) {
        console.error("Error updating renewal:", error)
        return NextResponse.json({ error: "Failed to update renewal" }, { status: 500 })
    }
}
