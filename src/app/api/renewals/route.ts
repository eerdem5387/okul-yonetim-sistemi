import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetYear, validateRenewalAcademicYear } from "@/lib/academic-year-contract-server"
import { academicYearLabelsEquivalent } from "@/lib/student-registration-meta"
import { updateRenewalContract } from "@/lib/contract-registration-update"
import { renewalTargetClassLabel } from "@/lib/student-grade-level"

export async function GET(request: NextRequest) {
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
                }, { status: 400 })
            }
        }

        // Çift kayıt önleme: Son 5 dakika içinde aynı öğrenci için kayıt yenileme var mı kontrol et
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        const recentRenewals = await prisma.renewal.findMany({
            where: {
                studentId,
                createdAt: {
                    gte: fiveMinutesAgo
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // Eğer son 5 dakika içinde kayıt varsa ve aynı akademik yıl ise, en son kaydı döndür
        if (recentRenewals.length > 0 && academicYear) {
            const matchingRenewal = recentRenewals.find((renewal) => {
                const renewalContractData = renewal.contractData as Record<string, unknown>
                return academicYearLabelsEquivalent(
                    renewalContractData.academicYear,
                    academicYear
                )
            })
            
            if (matchingRenewal) {
                console.log(`[Renewal] Duplicate prevention: Found recent renewal for student ${studentId} and academic year ${academicYear}, returning existing renewal`)
                return NextResponse.json({
                    ...matchingRenewal,
                    duplicatePrevented: true
                })
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
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ 
            error: "Failed to create renewal",
            details: errorMessage
        }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, contractData } = body
        if (!id || typeof id !== "string") {
            return NextResponse.json({ error: "id is required" }, { status: 400 })
        }

        const result = await updateRenewalContract(id, (contractData || {}) as Record<string, unknown>)
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

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { contractIds } = body

        if (Array.isArray(contractIds)) {
            await prisma.renewal.deleteMany({
                where: { id: { in: contractIds } }
            })
        } else {
            await prisma.renewal.delete({
                where: { id: contractIds }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting renewals:", error)
        return NextResponse.json({ error: "Failed to delete renewals" }, { status: 500 })
    }
}
