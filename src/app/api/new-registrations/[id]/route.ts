import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaffAccess } from "@/lib/auth/api-guard"
import { updateNewRegistrationContract } from "@/lib/contract-registration-update"
import { syncPreEnrollmentFlagsSafe } from "@/lib/pre-enrollment"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "view" })
    if (!auth.ok) return auth.response
    try {
        const params = await context.params
        const registration = await prisma.newRegistration.findUnique({
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

        if (!registration) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 })
        }

        return NextResponse.json(registration)
    } catch (error) {
        console.error("Error fetching new registration:", error)
        return NextResponse.json({ error: "Failed to fetch new registration" }, { status: 500 })
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

        const result = await updateNewRegistrationContract(params.id, incoming)
        if (!result.ok) {
            return NextResponse.json(
                { error: result.error, ...(result.code ? { code: result.code } : {}) },
                { status: result.status }
            )
        }
        // Sözleşmenin akademik yılı değişmiş olabilir
        await syncPreEnrollmentFlagsSafe()
        return NextResponse.json(result.registration)
    } catch (error) {
        console.error("Error updating new registration:", error)
        return NextResponse.json({ error: "Failed to update new registration" }, { status: 500 })
    }
}
