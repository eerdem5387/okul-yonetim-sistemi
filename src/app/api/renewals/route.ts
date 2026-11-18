import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireStaffAccess } from "@/lib/auth/api-guard"
import { getRenewalTargetYear, validateRenewalAcademicYear } from "@/lib/academic-year-contract-server"
import { academicYearLabelsEquivalent } from "@/lib/student-registration-meta"
import { renewalTargetClassLabel } from "@/lib/student-grade-level"

export async function GET(request: NextRequest) {
    const auth = await requireStaffAccess(request, { module: "registrations", action: "view" })
    if (!auth.ok) return auth.response
    try {
        const { searchParams } = new URL(request.url)
        const studentId = searchParams.get('studentId')
        const academicYear = searchParams.get('academicYear')
        
        const whereClause: Record<string, unknown> = {}
        if (studentId) {
            whereClause.studentId = studentId
        }
        
        const renewals = await prisma.renewal.findMany({
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

        // Eğer academicYear parametresi varsa, contractData içinde bu akademik yılı kontrol et
        if (academicYear && renewals.length > 0) {
            const filteredRenewals = renewals.filter((renewal) => {
                const contractData = renewal.contractData as Record<string, unknown>
                return academicYearLabelsEquivalent(
                    contractData.academicYear,
                    academicYear
                )
            })
            return NextResponse.json(filteredRenewals)
        }

        return NextResponse.json(renewals)
    } catch (error) {
        console.error("Error fetching renewals:", error)
        return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 })
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

        const renewalValidation = await validateRenewalAcademicYear(contractDataObj)
        if (!renewalValidation.ok) {
            return NextResponse.json({ error: renewalValidation.error }, { status: 400 })
        }

        const targetYear = await getRenewalTargetYear()
        if (!targetYear) {
            return NextResponse.json(
                {
                    error:
                        "Kayıt yenileme için aktif ve bir sonraki akademik yıl tanımlı olmalıdır.",
                },
                { status: 400 }
            )
        }

        const mergedContractData: Record<string, unknown> = {
            ...contractDataObj,
            academicYear: targetYear.label,
            academicYearId: targetYear.id,
        }

        const renewalClassLabel = renewalTargetClassLabel(student.grade)
        if (!renewalClassLabel) {
            return NextResponse.json(
                {
                    error:
                        "Öğrencinin sınıfı kayıt yenileme için uygun değil (5–12. sınıf olmalıdır).",
                },
                { status: 400 }
            )
        }
        mergedContractData.studentClass = renewalClassLabel

        const academicYear = mergedContractData.academicYear as string | undefined
        const academicYearId = mergedContractData.academicYearId as string | undefined

        if (academicYear) {
            const existingRenewals = await prisma.renewal.findMany({
                where: { studentId },
                select: { contractData: true, id: true, createdAt: true }
            })
            
            const hasExistingRenewal = existingRenewals.some((renewal) => {
                const existingContractData = renewal.contractData as Record<string, unknown>
                const sameLabel = academicYearLabelsEquivalent(
                    existingContractData.academicYear,
                    academicYear
                )
                const sameId =
                    academicYearId &&
                    existingContractData.academicYearId === academicYearId
                return sameLabel || Boolean(sameId)
            })
            
            if (hasExistingRenewal) {
                return NextResponse.json({ 
                    error: "Bu öğrenci için seçilen akademik yılda zaten kayıt yenileme yapılmış!",
                    code: "DUPLICATE_RENEWAL"
                }, { status: 409 })
            }
        }

        const renewal = await prisma.$transaction(async (tx) => {
            const r = await tx.renewal.create({
                data: {
                    studentId,
                    contractData: mergedContractData as Prisma.InputJsonValue,
                },
                include: {
                    student: {
                        select: {
                            firstName: true,
                            lastName: true,
                            tcNumber: true,
                        },
                    },
                },
            })
            // Aktif sınıf düzeyi yalnızca akademik yıl devrinde güncellenir; yenileme sadece
            // sözleşmede hedef yılı/sınıfı (studentClass) kayıt altına alır.
            if (selectedClubs && Array.isArray(selectedClubs) && selectedClubs.length > 0) {
                const clubSelections = selectedClubs
                    .filter((clubId: string) => clubId && typeof clubId === "string")
                    .map((clubId: string) => ({
                        clubId,
                        studentId,
                    }))
                if (clubSelections.length > 0) {
                    await tx.clubSelection.createMany({
                        data: clubSelections,
                        skipDuplicates: true,
                    })
                }
            }
            return r
        })

        return NextResponse.json(renewal)
    } catch (error) {
        console.error("Error creating renewal:", error)
        return NextResponse.json({ error: "Failed to create renewal" }, { status: 500 })
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

        if (Array.isArray(contractIds)) {
            await prisma.renewal.deleteMany({
                where: { id: { in: contractIds as string[] } }
            })
        } else {
            await prisma.renewal.delete({
                where: { id: contractIds as string }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting renewals:", error)
        return NextResponse.json({ error: "Failed to delete renewals" }, { status: 500 })
    }
}
