import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { INCLUDE_PRE_ENROLLMENT, prisma } from "@/lib/prisma"
import { getRenewalTargetYear } from "@/lib/academic-year-contract-server"
import {
  getRenewalTargetContext,
  normalizeRegistrationStatusOverride,
  registrationStatusText,
} from "@/lib/student-registration-meta"
import { graduatesWhereClause, gradeLevelWhereClause, k12GradeWhereClause } from "@/lib/student-grade-level"
import { buildStudentSearchWhere } from "@/lib/turkish-search"
import { isSystemAdmin, requireStaff, requireStaffAccess } from "@/lib/auth/api-guard"
import { gradeBandWhereClause } from "@/lib/student-grade-level"
import { ensureParentAccountForStudent, normalizeTcInput, parseBirthDateInput } from "@/lib/students/student-input"
import { syncPreEnrollmentFlagsSafe } from "@/lib/pre-enrollment"

/** Tek istekte dönebilecek en fazla öğrenci (panolar 1000 ile çağırıyor). */
const MAX_PAGE_SIZE = 5000

function positiveInt(raw: string | null, fallback: number, max?: number): number {
    const n = parseInt(raw || "", 10)
    if (!Number.isFinite(n) || n < 1) return fallback
    return max ? Math.min(n, max) : n
}

export async function GET(request: NextRequest) {
    const auth = await requireStaff(request)
    if (!auth.ok) return auth.response
    try {
        const { searchParams } = new URL(request.url)
        const page = positiveInt(searchParams.get('page'), 1)
        const limit = positiveInt(searchParams.get('limit'), 10, MAX_PAGE_SIZE)
        const search = searchParams.get('search') || ''
        const grade = searchParams.get('grade') || ''
        const gradeBand = searchParams.get('gradeBand') || ''
        const registrationFilter = searchParams.get('registrationFilter') || ''
        const includePreEnrollment =
            searchParams.get('includePreEnrollment') === '1' ||
            searchParams.get('includePreEnrollment') === 'true'
        const newRegistrationYearScopeRaw = (searchParams.get('newRegistrationYearScope') || 'all').toLowerCase()
        const newRegistrationYearScope =
            newRegistrationYearScopeRaw === 'active' || newRegistrationYearScopeRaw === 'next'
                ? newRegistrationYearScopeRaw
                : 'all'
        const registrationMeta = searchParams.get('registrationMeta') === '1' || searchParams.get('registrationMeta') === 'true'
        const graduates = searchParams.get('graduates') === '1' || searchParams.get('graduates') === 'true'
        const leftView = searchParams.get('left') === '1' || searchParams.get('left') === 'true'
        const excludeClubSelected =
            searchParams.get('excludeClubSelected') === '1' ||
            searchParams.get('excludeClubSelected') === 'true'

        const skip = (page - 1) * limit

        // Arama ve sınıf filtresi
        const whereConditions: Array<Record<string, unknown>> = []
        
        // Arama filtresi (Türkçe karakter + ad soyad birleşik arama)
        const searchWhere = buildStudentSearchWhere(search)
        if (searchWhere) {
            whereConditions.push(searchWhere)
        }
        
        // Okuldan ayrılanlar listesi (varsayılan olarak ayrılanlar tüm sorgulardan gizlenir, bkz. lib/prisma.ts)
        if (leftView) {
            whereConditions.push({ leftAt: { not: null } })
        }

        // Sınıf / kademe filtresi (gradeBand: ortaokul 5–8, lise 9–12; "5" ve "5. Sınıf" varyantları)
        if (leftView) {
            // Ayrılanlarda sınıf/kademe sınırı yok
        } else if (graduates) {
            whereConditions.push(graduatesWhereClause())
        } else if (grade) {
            const level = parseInt(grade, 10)
            if (!Number.isNaN(level) && level >= 5 && level <= 12) {
                whereConditions.push(gradeLevelWhereClause(level))
            } else {
                whereConditions.push({ grade: { equals: grade, mode: 'insensitive' as const } })
            }
        } else if (gradeBandWhereClause(gradeBand)) {
            whereConditions.push(gradeBandWhereClause(gradeBand)!)
        } else {
            whereConditions.push(k12GradeWhereClause())
        }

        if (excludeClubSelected) {
            whereConditions.push({ clubSelections: { none: {} } })
        }

        const regCtx = await getRenewalTargetContext(prisma)

        const noMatchId = "__students_filter_no_match__"

        if (registrationFilter === 'renewed') {
            const ids = [...regCtx.renewedStudentIds].filter(
                (id) => !regCtx.newRegistrationStudentIds.has(id)
            )
            whereConditions.push({ id: { in: ids.length > 0 ? ids : [noMatchId] } })
        } else if (registrationFilter === 'new_registration') {
            let ids: string[]
            if (!includePreEnrollment) {
                // Öğrenci yönetiminde ön kayıt öğrencileri gösterme: sadece aktif yıl yeni kayıtları.
                ids = [...regCtx.newRegistrationActiveYearStudentIds]
            } else if (newRegistrationYearScope === 'active') {
                ids = [...regCtx.newRegistrationActiveYearStudentIds]
            } else if (newRegistrationYearScope === 'next') {
                ids = [...regCtx.futureYearOnlyNewRegistrationStudentIds]
            } else {
                ids = [
                    ...new Set([
                        ...regCtx.newRegistrationActiveYearStudentIds,
                        ...regCtx.futureYearOnlyNewRegistrationStudentIds,
                    ]),
                ]
            }
            whereConditions.push({ id: { in: ids.length > 0 ? ids : [noMatchId] } })
        } else if (registrationFilter === 'not_renewed') {
            const excluded = [...new Set([...regCtx.renewedStudentIds, ...regCtx.newRegistrationStudentIds])]
            if (excluded.length > 0) {
                whereConditions.push({ NOT: { id: { in: excluded } } })
            }
        }

        // Ön kayıtlılar varsayılan olarak gizlidir (lib/prisma.ts); istenirse dahil et
        if (includePreEnrollment) {
            whereConditions.push(INCLUDE_PRE_ENROLLMENT)
        }

        if (
            !includePreEnrollment &&
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
                    regCtx.newRegistrationStudentIds,
                    regCtx.futureYearOnlyNewRegistrationStudentIds
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
    const auth = await requireStaffAccess(request, { module: "students", action: "create" }, { module: "registrations", action: "create" })
    if (!auth.ok) return auth.response
    const actor = auth.value
    try {
        const body = await request.json()
        const { 
            firstName, lastName, tcNumber, birthDate, grade, address,
            motherName, motherTc, motherPhone, motherAddress, motherOccupation,
            fatherName, fatherTc, fatherPhone, fatherAddress, fatherOccupation,
            announcedTuitionFee, studentTuitionFee,
            registrationStatusOverride,
            bookPaymentPaid,
        } = body

        // Validasyon - Prisma schema'da zorunlu alanlar
        if (!String(firstName ?? "").trim() || !String(lastName ?? "").trim() || !String(tcNumber ?? "").trim()) {
            return NextResponse.json({ 
                error: "Ad, soyad ve TC Kimlik No zorunludur." 
            }, { status: 400 })
        }

        // TC Number format kontrolü
        const normalizedTc = normalizeTcInput(tcNumber)
        if (normalizedTc.length !== 11) {
            return NextResponse.json({ 
                error: "TC Kimlik No 11 haneli olmalı ve yalnızca rakamlardan oluşmalıdır." 
            }, { status: 400 })
        }

        // Doğum tarihi zorunlu; geçersizse kayıt açılmaz (eskiden sessizce bugünün tarihi yazılıyordu).
        const parsedBirthDate = parseBirthDateInput(birthDate)
        if (!parsedBirthDate) {
            return NextResponse.json({
                error: "Geçerli bir doğum tarihi girin (GG.AA.YYYY).",
                code: "INVALID_BIRTH_DATE",
            }, { status: 400 })
        }

        const existingByTc = await prisma.student.findUnique({
            where: { tcNumber: normalizedTc },
            select: { id: true, firstName: true, lastName: true, leftAt: true },
        })
        if (existingByTc) {
            return NextResponse.json({
                error: existingByTc.leftAt
                    ? `Bu TC Kimlik No ile kayıtlı öğrenci (${existingByTc.firstName} ${existingByTc.lastName}) okuldan ayrıldı olarak işaretli. Yeniden kayıt için «Ayrılanlar» listesinden geri alın.`
                    : `Bu TC Kimlik No ile kayıtlı öğrenci zaten var: ${existingByTc.firstName} ${existingByTc.lastName}`,
                code: "DUPLICATE_TC",
            }, { status: 400 })
        }

        // Öğrenim ücreti alanları yalnızca sistem yöneticisi tarafından girilebilir (sunucuda doğrulanır).
        const canSetTuition = isSystemAdmin(actor)

        let statusOverride: string | null = null
        let statusPeriodLabel: string | null = null
        if (registrationStatusOverride !== undefined && registrationStatusOverride !== null && registrationStatusOverride !== "") {
            const status = normalizeRegistrationStatusOverride(registrationStatusOverride)
            if (!status) {
                return NextResponse.json(
                    {
                        error:
                            "Geçersiz kayıt durumu. new_registration, renewed veya not_renewed olmalı.",
                    },
                    { status: 400 }
                )
            }
            const target = await getRenewalTargetYear()
            if (!target) {
                return NextResponse.json(
                    {
                        error:
                            "Kayıt yenileme dönemi açık değil. Ayarlar’dan dönemi açmadan kayıt durumu güncellenemez.",
                    },
                    { status: 400 }
                )
            }
            statusOverride = status
            statusPeriodLabel = target.label
        }

        const text = (v: unknown) => String(v ?? "").trim()

        const student = await prisma.student.create({
            data: {
                firstName: text(firstName),
                lastName: text(lastName),
                tcNumber: normalizedTc,
                birthDate: parsedBirthDate,
                grade: text(grade),
                address: text(address),
                motherName: text(motherName),
                motherTc: text(motherTc),
                motherPhone: text(motherPhone),
                motherAddress: text(motherAddress),
                motherOccupation: text(motherOccupation),
                fatherName: text(fatherName),
                fatherTc: text(fatherTc),
                fatherPhone: text(fatherPhone),
                fatherAddress: text(fatherAddress),
                fatherOccupation: text(fatherOccupation),
                // Opsiyonel alanlar
                phone: text(body.phone) || null,
                email: text(body.email) || null,
                registrationStatusOverride: statusOverride,
                registrationStatusPeriodLabel: statusPeriodLabel,
                ...(bookPaymentPaid !== undefined && bookPaymentPaid !== null && bookPaymentPaid !== ""
                    ? {
                          bookPaymentPaid:
                              bookPaymentPaid === true || bookPaymentPaid === "true",
                      }
                    : {}),
                ...(canSetTuition
                    ? {
                          announcedTuitionFee: text(announcedTuitionFee) || null,
                          studentTuitionFee: text(studentTuitionFee) || null,
                      }
                    : {}),
            }
        })

        // Öğrenciyi oluşturduktan sonra otomatik olarak veli hesabı oluştur
        try {
            await ensureParentAccountForStudent(prisma, student)
        } catch (parentError) {
            // Veli hesabı oluşturma hatası öğrenci oluşturmayı engellemez, sadece log'lanır
            console.error("Error creating parent account for student:", parentError)
        }

        if (statusOverride) await syncPreEnrollmentFlagsSafe()

        return NextResponse.json({
            success: true,
            student
        })
    } catch (error) {
        console.error("Error creating student:", error)

        // Prisma unique constraint hatası
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ 
                error: "Bu TC Kimlik No ile kayıtlı bir öğrenci zaten mevcut.",
                code: "DUPLICATE_TC",
            }, { status: 400 })
        }

        // Prisma validation hatası
        if (error instanceof Prisma.PrismaClientValidationError) {
            return NextResponse.json({ 
                error: "Geçersiz veri gönderildi. Lütfen alanları kontrol edin.",
            }, { status: 400 })
        }
        
        return NextResponse.json({ 
            error: "Öğrenci oluşturulurken bir hata oluştu.",
        }, { status: 500 })
    }
}
