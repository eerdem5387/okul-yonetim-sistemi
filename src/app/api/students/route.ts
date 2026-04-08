import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetContext, registrationStatusText } from "@/lib/student-registration-meta"
import { graduatesWhereClause, k12GradeWhereClause } from "@/lib/student-grade-level"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const grade = searchParams.get('grade') || ''
        const gradeBand = searchParams.get('gradeBand') || ''
        const registrationFilter = searchParams.get('registrationFilter') || ''
        const registrationMeta = searchParams.get('registrationMeta') === '1' || searchParams.get('registrationMeta') === 'true'
        const graduates = searchParams.get('graduates') === '1' || searchParams.get('graduates') === 'true'

        const skip = (page - 1) * limit

        // Arama ve sınıf filtresi
        const whereConditions: Array<Record<string, unknown>> = []
        
        // Arama filtresi
        if (search) {
            whereConditions.push({
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                    { tcNumber: { contains: search } },
                    { grade: { contains: search, mode: 'insensitive' as const } }
                ]
            })
        }
        
        // Sınıf / kademe filtresi (gradeBand: ortaokul 5–8, lise 9–12; "5" ve "5. Sınıf" varyantları)
        if (graduates) {
            whereConditions.push(graduatesWhereClause())
        } else if (grade) {
            whereConditions.push({ grade: { equals: grade, mode: 'insensitive' as const } })
        } else if (gradeBand === "ortaokul" || gradeBand === "lise") {
            const nums = gradeBand === "ortaokul" ? [5, 6, 7, 8] : [9, 10, 11, 12]
            const orParts: Record<string, unknown>[] = []
            for (const n of nums) {
                orParts.push({ grade: { equals: `${n}. Sınıf`, mode: "insensitive" as const } })
                orParts.push({ grade: { equals: String(n), mode: "insensitive" as const } })
            }
            whereConditions.push({ OR: orParts })
        } else {
            whereConditions.push(k12GradeWhereClause())
        }

        const regCtx = await getRenewalTargetContext(prisma)

        const noMatchId = "__students_filter_no_match__"

        if (registrationFilter === 'renewed') {
            const ids = [...regCtx.renewedStudentIds].filter(
                (id) => !regCtx.newRegistrationStudentIds.has(id)
            )
            whereConditions.push({ id: { in: ids.length > 0 ? ids : [noMatchId] } })
        } else if (registrationFilter === 'new_registration') {
            const ids = [
                ...regCtx.newRegistrationActiveYearStudentIds,
                ...regCtx.futureYearOnlyNewRegistrationStudentIds,
            ]
            const unique = [...new Set(ids)]
            whereConditions.push({ id: { in: unique.length > 0 ? unique : [noMatchId] } })
        } else if (registrationFilter === 'not_renewed') {
            const excluded = [...new Set([...regCtx.renewedStudentIds, ...regCtx.newRegistrationStudentIds])]
            if (excluded.length > 0) {
                whereConditions.push({ NOT: { id: { in: excluded } } })
            }
        } else if (
            !registrationFilter &&
            !search.trim() &&
            !grade &&
            !gradeBand &&
            regCtx.futureYearOnlyNewRegistrationStudentIds.size > 0
        ) {
            const ex = [...regCtx.futureYearOnlyNewRegistrationStudentIds]
            whereConditions.push({ NOT: { id: { in: ex } } })
        }

        const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

        // Toplam kayıt sayısı (arama varsa filtrelenmiş, yoksa tümü)
        const total = await prisma.student.count({ where })

        // Öğrencileri çek (pagination + arama)
        const students = await prisma.student.findMany({
            where,
            orderBy: {
                createdAt: "desc"
            },
            skip,
            take: limit
        })

        let studentsOut: Array<Record<string, unknown>> = students as unknown as Array<Record<string, unknown>>
        if (registrationMeta) {
            studentsOut = students.map((s) => ({
                ...s,
                registrationStatusText: registrationStatusText(
                    regCtx.target,
                    s.id,
                    regCtx.renewedStudentIds,
                    regCtx.newRegistrationStudentIds
                ),
            }))
        }

        return NextResponse.json({
            students: studentsOut,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error("Error fetching students:", error)
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { 
            firstName, lastName, tcNumber, birthDate, grade, address,
            motherName, motherTc, motherPhone, motherAddress, motherOccupation,
            fatherName, fatherTc, fatherPhone, fatherAddress, fatherOccupation
        } = body

        // Validasyon - Prisma schema'da zorunlu alanlar
        // Boş string kontrolü (trim ile)
        if (!firstName?.trim() || !lastName?.trim() || !tcNumber?.trim()) {
            return NextResponse.json({ 
                error: "firstName, lastName, and tcNumber are required" 
            }, { status: 400 })
        }

        // TC Number format kontrolü
        if (tcNumber.length !== 11 || !/^\d+$/.test(tcNumber)) {
            return NextResponse.json({ 
                error: "TC Number must be 11 digits" 
            }, { status: 400 })
        }

        // BirthDate kontrolü - Prisma schema'da nullable değil, bu yüzden geçerli bir tarih gerekli
        let parsedBirthDate: Date
        if (birthDate) {
            try {
                const date = new Date(birthDate)
                if (!isNaN(date.getTime())) {
                    parsedBirthDate = date
                } else {
                    // Geçersiz tarih, default olarak bugünün tarihini kullan
                    parsedBirthDate = new Date()
                }
            } catch {
                // Parse hatası, default olarak bugünün tarihini kullan
                parsedBirthDate = new Date()
            }
        } else {
            // Tarih gönderilmemiş, default olarak bugünün tarihini kullan
            parsedBirthDate = new Date()
        }

        const student = await prisma.student.create({
            data: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                tcNumber: tcNumber.trim(),
                birthDate: parsedBirthDate,
                grade: grade?.trim() || "",
                address: address?.trim() || "",
                motherName: motherName?.trim() || "",
                motherTc: motherTc?.trim() || "",
                motherPhone: motherPhone?.trim() || "",
                motherAddress: motherAddress?.trim() || "",
                motherOccupation: motherOccupation?.trim() || "",
                fatherName: fatherName?.trim() || "",
                fatherTc: fatherTc?.trim() || "",
                fatherPhone: fatherPhone?.trim() || "",
                fatherAddress: fatherAddress?.trim() || "",
                fatherOccupation: fatherOccupation?.trim() || "",
                // Opsiyonel alanlar
                phone: body.phone?.trim() || null,
                email: body.email?.trim() || null
            }
        })

        // Öğrenci oluşturulduktan sonra otomatik olarak veli hesabı oluştur
        try {
            // Her öğrenci için bir Parent hesabı oluştur (öğrenci TC bazlı)
            const parentAccount = await prisma.parent.upsert({
                where: { studentTcNumber: student.tcNumber },
                update: {
                    isActive: true,
                },
                create: {
                    studentTcNumber: student.tcNumber,
                    isActive: true,
                },
            })

            // Anne bilgisi varsa ParentStudent'a ekle
            if (student.motherName && student.motherTc) {
                await prisma.parentStudent.upsert({
                    where: {
                        parentId_studentId_relation: {
                            parentId: parentAccount.id,
                            studentId: student.id,
                            relation: "ANNE",
                        },
                    },
                    update: {
                        parentName: student.motherName,
                        parentTcNumber: student.motherTc,
                        parentPhone: student.motherPhone || undefined,
                        parentEmail: undefined,
                    },
                    create: {
                        parentId: parentAccount.id,
                        studentId: student.id,
                        relation: "ANNE",
                        parentName: student.motherName,
                        parentTcNumber: student.motherTc,
                        parentPhone: student.motherPhone || undefined,
                    },
                })
            }

            // Baba bilgisi varsa ParentStudent'a ekle
            if (student.fatherTc && student.fatherName) {
                await prisma.parentStudent.upsert({
                    where: {
                        parentId_studentId_relation: {
                            parentId: parentAccount.id,
                            studentId: student.id,
                            relation: "BABA",
                        },
                    },
                    update: {
                        parentName: student.fatherName,
                        parentTcNumber: student.fatherTc,
                        parentPhone: student.fatherPhone || undefined,
                        parentEmail: undefined,
                    },
                    create: {
                        parentId: parentAccount.id,
                        studentId: student.id,
                        relation: "BABA",
                        parentName: student.fatherName,
                        parentTcNumber: student.fatherTc,
                        parentPhone: student.fatherPhone || undefined,
                    },
                })
            }
        } catch (parentError) {
            // Veli hesabı oluşturma hatası öğrenci oluşturmayı engellemez, sadece log'lanır
            console.error("Error creating parent account for student:", parentError)
        }

        return NextResponse.json({
            success: true,
            student
        })
    } catch (error) {
        console.error("Error creating student:", error)
        console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Prisma unique constraint hatası
        if (error instanceof Error && (
            error.message.includes("Unique constraint") || 
            error.message.includes("Unique constraint failed") ||
            error.message.includes("P2002")
        )) {
            return NextResponse.json({ 
                error: "A student with this TC Number already exists",
                details: errorMessage
            }, { status: 400 })
        }
        
        // Prisma validation hatası
        if (error instanceof Error && (
            error.message.includes("Invalid value") ||
            error.message.includes("P2003") ||
            error.message.includes("Foreign key constraint")
        )) {
            return NextResponse.json({ 
                error: "Invalid data provided",
                details: errorMessage
            }, { status: 400 })
        }
        
        return NextResponse.json({ 
            error: "Failed to create student",
            details: errorMessage
        }, { status: 500 })
    }
}
