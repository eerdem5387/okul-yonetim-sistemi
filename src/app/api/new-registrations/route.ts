import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireStaffAccess } from "@/lib/auth/api-guard"
import {
  contractYearLabelFromAcademicYear,
  resolveActiveAndNextAcademicYear,
} from "@/lib/academic-year-ui"
import { listAcademicYearsForContract, validateNewRegistrationAcademicYear } from "@/lib/academic-year-contract-server"
import { academicYearLabelsEquivalent } from "@/lib/student-registration-meta"
import { syncPreEnrollmentFlagsSafe } from "@/lib/pre-enrollment"

export async function GET(request: NextRequest) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "view" })
    if (!auth.ok) return auth.response
    try {
        const { searchParams } = new URL(request.url)
        const studentId = searchParams.get('studentId')
        
        const whereClause = studentId ? { studentId } : {}
        
        const registrations = await prisma.newRegistration.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        tcNumber: true,
                        grade: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json(registrations)
    } catch (error) {
        console.error("Error fetching new registrations:", error)
        return NextResponse.json({ error: "Failed to fetch new registrations" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "create" })
    if (!auth.ok) return auth.response
    try {
        const body = await request.json()
        const { studentId, contractData, selectedClubs } = body

        // Validasyon
        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 })
        }

        // Öğrencinin var olup olmadığını kontrol et
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        const contractDataObj = (contractData || {}) as Record<string, unknown>

        const regYearValidation = await validateNewRegistrationAcademicYear(contractDataObj)
        if (!regYearValidation.ok) {
            return NextResponse.json({ error: regYearValidation.error }, { status: 400 })
        }

        const rows = await listAcademicYearsForContract()
        const { active, next } = resolveActiveAndNextAcademicYear(rows)
        const yearId = contractDataObj.academicYearId as string
        const yearRow = [active, next].find((y) => y && y.id === yearId)
        const mergedContractData: Record<string, unknown> = {
            ...contractDataObj,
            academicYear: yearRow ? contractYearLabelFromAcademicYear(yearRow) : contractDataObj.academicYear,
            academicYearId: yearId,
        }

        const academicYear = mergedContractData.academicYear as string | undefined
        
        if (academicYear) {
            // Bu öğrenci için aynı akademik yılda zaten kayıt var mı kontrol et
            const existingRegistrations = await prisma.newRegistration.findMany({
                where: { studentId },
                select: { contractData: true, id: true, createdAt: true }
            })
            
            const hasExistingRegistration = existingRegistrations.some((reg) => {
                const existingContractData = reg.contractData as Record<string, unknown>
                const sameLabel = academicYearLabelsEquivalent(
                    existingContractData.academicYear,
                    academicYear
                )
                const sameId =
                    yearId && existingContractData.academicYearId === yearId
                return sameLabel || Boolean(sameId)
            })
            
            if (hasExistingRegistration) {
                return NextResponse.json({ 
                    error: "Bu öğrenci için seçilen akademik yılda zaten yeni kayıt yapılmış!",
                    code: "DUPLICATE_REGISTRATION"
                }, { status: 409 })
            }
        }

        // Sözleşme + kulüp seçimleri tek işlemde (biri başarısız olursa ikisi de yazılmaz)
        const registration = await prisma.$transaction(async (tx) => {
            const created = await tx.newRegistration.create({
                data: {
                    studentId,
                    contractData: mergedContractData as Prisma.InputJsonValue,
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

            if (selectedClubs && Array.isArray(selectedClubs) && selectedClubs.length > 0) {
                const clubSelections = selectedClubs
                    .filter((clubId: string) => clubId && typeof clubId === 'string')
                    .map((clubId: string) => ({
                        clubId,
                        studentId
                    }))

                if (clubSelections.length > 0) {
                    await tx.clubSelection.createMany({
                        data: clubSelections,
                        skipDuplicates: true
                    })
                }
            }
            return created
        })

        // Sonraki yıla yapılan kayıt öğrenciyi "ön kayıt" yapar (bu yıl listelerinde görünmez)
        await syncPreEnrollmentFlagsSafe()

        return NextResponse.json(registration)
    } catch (error) {
        console.error("Error creating new registration:", error)
        return NextResponse.json({ error: "Failed to create new registration" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "delete" })
    if (!auth.ok) return auth.response
    try {
        const body = await request.json().catch(() => ({}))
        const { contractIds } = body as { contractIds?: unknown }
        const validIds =
            typeof contractIds === "string"
                ? contractIds.trim() !== ""
                : Array.isArray(contractIds) && contractIds.length > 0 && contractIds.every((x) => typeof x === "string" && x.trim() !== "")
        if (!validIds) {
            return NextResponse.json({ error: "Silinecek sözleşme seçilmedi." }, { status: 400 })
        }

        // Kayıtları sil (öğrenci kaydı silinmez; sözleşme kaldırılır)
        if (Array.isArray(contractIds)) {
            await prisma.newRegistration.deleteMany({
                where: { id: { in: contractIds as string[] } }
            })
        } else {
            await prisma.newRegistration.delete({
                where: { id: contractIds as string }
            })
        }

        await syncPreEnrollmentFlagsSafe()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting new registrations:", error)
        return NextResponse.json({ error: "Failed to delete new registrations" }, { status: 500 })
    }
}
