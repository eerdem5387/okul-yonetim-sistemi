import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/club-groups/merge
 * { sourceGroupId, targetGroupId, mergedName?, keepSchedulesFrom?: "source"|"target"|"tuesday"|"none" }
 *
 * source öğrencilerini target'a taşır, source soft-delete.
 * keepSchedulesFrom=tuesday → target'ta yalnızca Salı (2) programları kalsın;
 *   source'taki Salı kayıtları target'a taşınır, diğer günler silinir.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sourceGroupId = String(body.sourceGroupId ?? "").trim()
    const targetGroupId = String(body.targetGroupId ?? "").trim()
    const mergedName =
      body.mergedName !== undefined ? String(body.mergedName ?? "").trim() : ""
    const keepSchedulesFrom = String(body.keepSchedulesFrom ?? "tuesday").trim()

    if (!sourceGroupId || !targetGroupId) {
      return NextResponse.json(
        { error: "sourceGroupId ve targetGroupId zorunludur" },
        { status: 400 }
      )
    }
    if (sourceGroupId === targetGroupId) {
      return NextResponse.json({ error: "Aynı grup birleştirilemez" }, { status: 400 })
    }

    const [source, target] = await Promise.all([
      prisma.clubGroup.findUnique({
        where: { id: sourceGroupId },
        include: {
          students: { select: { studentId: true } },
          schedules: { where: { isActive: true } },
        },
      }),
      prisma.clubGroup.findUnique({
        where: { id: targetGroupId },
        include: {
          students: { select: { studentId: true } },
          schedules: { where: { isActive: true } },
        },
      }),
    ])

    if (!source || !source.isActive) {
      return NextResponse.json({ error: "Kaynak grup bulunamadı" }, { status: 404 })
    }
    if (!target || !target.isActive) {
      return NextResponse.json({ error: "Hedef grup bulunamadı" }, { status: 404 })
    }
    if (source.clubId !== target.clubId) {
      return NextResponse.json(
        { error: "Yalnızca aynı kulübün grupları birleştirilebilir" },
        { status: 400 }
      )
    }

    const finalName =
      mergedName ||
      target.name.replace(/\s*[-–]\s*[AB]\s*$/i, "").trim() ||
      target.name

    await prisma.$transaction(async (tx) => {
      for (const m of source.students) {
        await tx.clubGroupStudent.upsert({
          where: {
            clubGroupId_studentId: {
              clubGroupId: target.id,
              studentId: m.studentId,
            },
          },
          create: { clubGroupId: target.id, studentId: m.studentId },
          update: {},
        })
      }
      await tx.clubGroupStudent.deleteMany({ where: { clubGroupId: source.id } })

      if (keepSchedulesFrom === "tuesday") {
        // Target'taki Salı dışı programları sil
        await tx.clubSchedule.deleteMany({
          where: { clubGroupId: target.id, dayOfWeek: { not: 2 } },
        })
        // Source Salı programlarını target'a taşı
        for (const sch of source.schedules.filter((s) => s.dayOfWeek === 2)) {
          const clash = await tx.clubSchedule.findFirst({
            where: {
              clubId: target.clubId,
              dayOfWeek: sch.dayOfWeek,
              startTime: sch.startTime,
              endTime: sch.endTime,
            },
          })
          if (clash) {
            await tx.clubSchedule.update({
              where: { id: clash.id },
              data: { clubGroupId: target.id, isActive: true, room: sch.room },
            })
            if (clash.id !== sch.id) {
              await tx.clubSchedule.delete({ where: { id: sch.id } }).catch(() => null)
            }
          } else {
            await tx.clubSchedule.update({
              where: { id: sch.id },
              data: { clubGroupId: target.id },
            })
          }
        }
        await tx.clubSchedule.deleteMany({ where: { clubGroupId: source.id } })

        const tuesdayLeft = await tx.clubSchedule.count({
          where: { clubGroupId: target.id, dayOfWeek: 2, isActive: true },
        })
        if (tuesdayLeft === 0) {
          // Source'ta Salı yoksa target'ta da yok → Salı etütlerini oluştur
          for (const slot of [
            { startTime: "16:10", endTime: "16:40" },
            { startTime: "16:50", endTime: "17:20" },
          ]) {
            const exists = await tx.clubSchedule.findFirst({
              where: {
                clubId: target.clubId,
                dayOfWeek: 2,
                startTime: slot.startTime,
                endTime: slot.endTime,
              },
            })
            if (exists) {
              await tx.clubSchedule.update({
                where: { id: exists.id },
                data: { clubGroupId: target.id, isActive: true },
              })
            } else {
              await tx.clubSchedule.create({
                data: {
                  clubId: target.clubId,
                  clubGroupId: target.id,
                  dayOfWeek: 2,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  isActive: true,
                },
              })
            }
          }
        }
      } else if (keepSchedulesFrom === "source") {
        await tx.clubSchedule.deleteMany({ where: { clubGroupId: target.id } })
        await tx.clubSchedule.updateMany({
          where: { clubGroupId: source.id },
          data: { clubGroupId: target.id },
        })
      } else if (keepSchedulesFrom === "none") {
        await tx.clubSchedule.deleteMany({
          where: { clubGroupId: { in: [source.id, target.id] } },
        })
      } else {
        // target programları kalsın; source programlarını sil
        await tx.clubSchedule.deleteMany({ where: { clubGroupId: source.id } })
      }

      if (finalName !== target.name) {
        const inactiveClash = await tx.clubGroup.findFirst({
          where: {
            clubId: target.clubId,
            name: finalName,
            isActive: false,
            id: { not: target.id },
          },
          select: { id: true },
        })
        if (inactiveClash) {
          await tx.clubGroup.update({
            where: { id: inactiveClash.id },
            data: { name: `${finalName}__archived_${inactiveClash.id.slice(-6)}` },
          })
        }
        const activeClash = await tx.clubGroup.findFirst({
          where: {
            clubId: target.clubId,
            name: finalName,
            isActive: true,
            id: { notIn: [target.id, source.id] },
          },
          select: { id: true },
        })
        if (activeClash) {
          throw new Error(`Bu kulüpte “${finalName}” adında grup zaten var`)
        }
        await tx.clubGroup.update({
          where: { id: target.id },
          data: { name: finalName },
        })
      }

      await tx.clubGroup.update({
        where: { id: source.id },
        data: {
          isActive: false,
          name: `${source.name}__merged_${Date.now()}`,
        },
      })
    })

    const group = await prisma.clubGroup.findUnique({
      where: { id: target.id },
      include: {
        club: { select: { id: true, name: true } },
        students: true,
        schedules: { where: { isActive: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Gruplar birleştirildi → ${group?.name}`,
      group,
    })
  } catch (error) {
    console.error("[club-groups merge]", error)
    const msg = error instanceof Error ? error.message : "Birleştirme başarısız"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
