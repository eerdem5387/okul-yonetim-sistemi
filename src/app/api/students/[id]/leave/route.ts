import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaffAccess } from "@/lib/auth/api-guard"

/**
 * Okuldan ayrılan öğrenci.
 *
 * POST   → "Ayrıldı" olarak işaretler. Öğrenci silinmez: sözleşme, ödeme, yoklama, sınav ve görüş
 *          geçmişi korunur. Yalnızca güncel listelerdeki yeri kaldırılır:
 *            - aktif akademik yıldaki sınıf ataması,
 *            - aktif kulüp grubu ve etüt grubu üyelikleri.
 *          Ayrılan öğrenciler varsayılan olarak tüm öğrenci listelerinden gizlenir (bkz. lib/prisma.ts).
 * DELETE → İşareti geri alır ve mümkünse ayrılırken bulunduğu sınıfa yeniden atar.
 */

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Params) {
    const auth = await requireStaffAccess(request, { module: "students", action: "delete" })
    if (!auth.ok) return auth.response
    const actor = auth.value

    try {
        const { id } = await context.params
        const body = await request.json().catch(() => ({}))
        const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : ""
        const leftAtInput = typeof body?.leftAt === "string" && body.leftAt ? new Date(body.leftAt) : new Date()
        const leftAt = Number.isNaN(leftAtInput.getTime()) ? new Date() : leftAtInput

        if (!reason) {
            return NextResponse.json({ error: "Ayrılış nedeni zorunludur." }, { status: 400 })
        }

        const student = await prisma.student.findUnique({
            where: { id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                leftAt: true,
                classAssignments: {
                    select: {
                        id: true,
                        class: { select: { id: true, name: true, academicYear: { select: { isActive: true } } } },
                    },
                },
            },
        })
        if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
        if (student.leftAt) {
            return NextResponse.json({ error: "Öğrenci zaten ayrıldı olarak işaretli." }, { status: 400 })
        }

        const aktifSinif = student.classAssignments.find((a) => a.class.academicYear?.isActive)

        await prisma.$transaction([
            prisma.classStudent.deleteMany({
                where: { studentId: id, class: { academicYear: { isActive: true } } },
            }),
            prisma.clubGroupStudent.deleteMany({ where: { studentId: id, clubGroup: { isActive: true } } }),
            prisma.studyGroupStudent.deleteMany({ where: { studentId: id, studyGroup: { isActive: true } } }),
            prisma.student.update({
                where: { id },
                data: {
                    leftAt,
                    leftReason: reason,
                    leftBy: `${actor.firstName} ${actor.lastName}`.trim(),
                    leftClassId: aktifSinif?.class.id ?? null,
                    leftClassName: aktifSinif?.class.name ?? null,
                },
            }),
        ])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error marking student as left:", error)
        return NextResponse.json({ error: "Öğrenci ayrıldı olarak işaretlenemedi" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, context: Params) {
    const auth = await requireStaffAccess(request, { module: "students", action: "delete" })
    if (!auth.ok) return auth.response

    try {
        const { id } = await context.params
        const student = await prisma.student.findUnique({
            where: { id },
            select: { id: true, leftAt: true, leftClassId: true },
        })
        if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
        if (!student.leftAt) {
            return NextResponse.json({ error: "Öğrenci zaten aktif." }, { status: 400 })
        }

        // Eski sınıfı hâlâ aktif yıldaysa yeniden ata
        let sinifaEklendi = false
        if (student.leftClassId) {
            const cls = await prisma.class.findUnique({
                where: { id: student.leftClassId },
                select: { id: true, academicYear: { select: { isActive: true } } },
            })
            if (cls?.academicYear?.isActive) {
                await prisma.classStudent.upsert({
                    where: { classId_studentId: { classId: cls.id, studentId: id } },
                    create: { classId: cls.id, studentId: id },
                    update: {},
                })
                sinifaEklendi = true
            }
        }

        await prisma.student.update({
            where: { id },
            data: { leftAt: null, leftReason: null, leftBy: null, leftClassId: null, leftClassName: null },
        })

        return NextResponse.json({ success: true, sinifaEklendi })
    } catch (error) {
        console.error("Error restoring student:", error)
        return NextResponse.json({ error: "Öğrenci geri alınamadı" }, { status: 500 })
    }
}
