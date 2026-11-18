import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetYear } from "@/lib/academic-year-contract-server"
import { normalizeRegistrationStatusOverride } from "@/lib/student-registration-meta"
import { isSystemAdmin, requireStaff, requireStaffAccess } from "@/lib/auth/api-guard"
import { normalizeTcInput, parseBirthDateInput } from "@/lib/students/student-input"

const TC_TAKEN_MESSAGE =
    "Bu TC numarası başka bir öğrenciye ait! Lütfen farklı bir TC numarası deneyin veya önce diğer öğrencinin TC numarasını değiştirin."

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireStaff(request)
    if (!auth.ok) return auth.response
    try {
        const params = await context.params
        const { searchParams } = new URL(request.url)
        const format = searchParams.get("format") // "legacy" veya null

        const student = await prisma.student.findUnique({
            where: { id: params.id }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        // ?format=legacy → doğrudan öğrenci nesnesi (kayıt yenileme ekranları kullanıyor)
        if (format === "legacy") {
            return NextResponse.json(student)
        }

        return NextResponse.json({ student })
    } catch (error) {
        console.error("Error fetching student:", error)
        return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireStaffAccess(request, { module: "students", action: "edit" }, { module: "registrations", action: "edit" })
    if (!auth.ok) return auth.response
    const actor = auth.value
    try {
        const params = await context.params
        const body = await request.json()
        const {
            firstName, lastName, tcNumber, birthDate, grade, address,
            motherName, motherTc, motherPhone, motherAddress, motherOccupation,
            fatherName, fatherTc, fatherPhone, fatherAddress, fatherOccupation,
            announcedTuitionFee, studentTuitionFee,
            registrationStatusOverride,
            bookPaymentPaid,
        } = body

        const current = await prisma.student.findUnique({
            where: { id: params.id },
            select: { id: true, tcNumber: true },
        })
        if (!current) {
            return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
        }

        // Sadece tanımlı (undefined olmayan) alanları güncelle
        const updateData: Record<string, unknown> = {}
        if (firstName !== undefined) updateData.firstName = firstName
        if (lastName !== undefined) updateData.lastName = lastName
        if (grade !== undefined) updateData.grade = grade
        if (address !== undefined) updateData.address = address
        if (motherName !== undefined) updateData.motherName = motherName
        if (motherTc !== undefined) updateData.motherTc = motherTc
        if (motherPhone !== undefined) updateData.motherPhone = motherPhone
        if (motherAddress !== undefined) updateData.motherAddress = motherAddress
        if (motherOccupation !== undefined) updateData.motherOccupation = motherOccupation
        if (fatherName !== undefined) updateData.fatherName = fatherName
        if (fatherTc !== undefined) updateData.fatherTc = fatherTc
        if (fatherPhone !== undefined) updateData.fatherPhone = fatherPhone
        if (fatherAddress !== undefined) updateData.fatherAddress = fatherAddress
        if (fatherOccupation !== undefined) updateData.fatherOccupation = fatherOccupation

        // TC: yalnızca gerçekten değişiyorsa doğrula ve yaz. Boş gelirse mevcut TC korunur.
        if (tcNumber !== undefined && tcNumber !== null && String(tcNumber).trim() !== "") {
            const rawTc = String(tcNumber).trim()
            const normalizedTc = normalizeTcInput(rawTc)
            const unchanged = rawTc === current.tcNumber || normalizedTc === current.tcNumber
            if (!unchanged) {
                if (normalizedTc.length !== 11) {
                    return NextResponse.json(
                        { error: "TC Kimlik No 11 haneli olmalı ve yalnızca rakamlardan oluşmalıdır." },
                        { status: 400 }
                    )
                }
                const owner = await prisma.student.findUnique({
                    where: { tcNumber: normalizedTc },
                    select: { id: true, firstName: true, lastName: true },
                })
                if (owner && owner.id !== params.id) {
                    // Eskiden bu durumda kayıtlar "birleştirilip" bu öğrenci siliniyordu; yoklama, sınav,
                    // görüş gibi veriler kayboluyordu. Artık hiçbir şey silinmez, işlem reddedilir.
                    return NextResponse.json({
                        error: `${TC_TAKEN_MESSAGE} (Kayıtlı öğrenci: ${owner.firstName} ${owner.lastName})`,
                        code: "TC_NUMBER_EXISTS",
                    }, { status: 409 })
                }
                updateData.tcNumber = normalizedTc
            }
        }

        // Öğrenim ücreti alanları yalnızca sistem yöneticisi tarafından güncellenebilir (sunucuda doğrulanır).
        // Yetkisi olmayan kullanıcıdan gelen değerler yok sayılır; mevcut değerler korunur.
        if (isSystemAdmin(actor)) {
            if (announcedTuitionFee !== undefined) {
                updateData.announcedTuitionFee = announcedTuitionFee || null
            }
            if (studentTuitionFee !== undefined) {
                updateData.studentTuitionFee = studentTuitionFee || null
            }
        }

        if (birthDate !== undefined && birthDate !== null && String(birthDate).trim() !== "") {
            const parsed = parseBirthDateInput(birthDate)
            if (!parsed) {
                return NextResponse.json(
                    { error: "Geçerli bir doğum tarihi girin (GG.AA.YYYY).", code: "INVALID_BIRTH_DATE" },
                    { status: 400 }
                )
            }
            updateData.birthDate = parsed
        }

        if (bookPaymentPaid !== undefined) {
            if (bookPaymentPaid === null || bookPaymentPaid === "") {
                updateData.bookPaymentPaid = null
            } else {
                updateData.bookPaymentPaid = bookPaymentPaid === true || bookPaymentPaid === "true"
            }
        }

        if (registrationStatusOverride !== undefined) {
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
            updateData.registrationStatusOverride = status
            updateData.registrationStatusPeriodLabel = target.label
        }

        // Hiçbir alan değişmiyorsa mevcut kaydı döndür (ör. yalnızca TC'si aynı gönderilen istek)
        if (Object.keys(updateData).length === 0) {
            const unchangedStudent = await prisma.student.findUnique({ where: { id: params.id } })
            return NextResponse.json({ student: unchangedStudent })
        }

        const student = await prisma.student.update({
            where: { id: params.id },
            data: updateData
        })

        return NextResponse.json({ student })
    } catch (error) {
        console.error("Error updating student:", error)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({
                error: TC_TAKEN_MESSAGE,
                code: "TC_NUMBER_EXISTS"
            }, { status: 409 })
        }
        return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
    }
}

/**
 * Öğrenci silme. Öğrenciye bağlı herhangi bir kayıt (sözleşme, yoklama, sınav, görüş, sınıf, kulüp, veli bağı …)
 * varsa silme reddedilir — veritabanındaki "cascade" kuralı bunları da sileceği için.
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireStaffAccess(request, { module: "students", action: "delete" })
    if (!auth.ok) return auth.response
    try {
        const params = await context.params
        const student = await prisma.student.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                _count: {
                    select: {
                        clubSelections: true,
                        clubMembershipRequests: true,
                        clubDemandRequests: true,
                        clubGroupMemberships: true,
                        clubScheduleExclusions: true,
                        studyGroupMemberships: true,
                        newRegistrations: true,
                        renewals: true,
                        uniformContracts: true,
                        mealContracts: true,
                        serviceContracts: true,
                        bookContracts: true,
                        activities: true,
                        activityParticipants: true,
                        parentMeetings: true,
                        classAssignments: true,
                        parents: true,
                        homeworkAssignments: true,
                        attendances: true,
                        examResults: true,
                        examScanBatchItems: true,
                        comments: true,
                    },
                },
            },
        })

        if (!student) {
            return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
        }

        const linkedRecordCount = Object.values(student._count).reduce((sum, n) => sum + n, 0)
        if (linkedRecordCount > 0) {
            return NextResponse.json({
                error:
                    "Bu öğrenciye bağlı kayıtlar (sözleşme, yoklama, sınav, görüş, sınıf, veli vb.) bulunduğu için silinemez. Veri kaybını önlemek için silme engellendi.",
                code: "STUDENT_HAS_RECORDS",
                linkedRecordCount,
            }, { status: 409 })
        }

        await prisma.student.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting student:", error)
        return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
    }
}
