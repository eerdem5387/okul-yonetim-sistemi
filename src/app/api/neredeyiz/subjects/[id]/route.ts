import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek ders getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const searchParams = request.nextUrl.searchParams
    const counselorId = searchParams.get("counselorId") // ✅ Rehberlik kullanıcısı kontrolü
    
    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
      include: {
        academicYear: true,
        assignments: {
          include: {
            staff: true,
          },
        },
        units: {
          orderBy: {
            order: "asc",
          },
          include: {
            topics: {
              orderBy: {
                order: "asc",
              },
              include: {
                progress: {
                  orderBy: {
                    createdAt: "desc",
                  },
                  include: {
                    topic: true,
                  },
                },
                subTopics: {
                  orderBy: {
                    order: "asc",
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!subject) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }

    // ✅ Rehberlik kullanıcısı kontrolü: Sadece kendisine atanmış sınıfların derslerine erişebilir
    if (counselorId) {
      // Subject'in classId'si var mı kontrol et
      if (subject.classId) {
        const classData = await prisma.class.findUnique({
          where: { id: subject.classId },
          select: { counselorId: true },
        })
        
        if (!classData || classData.counselorId !== counselorId) {
          return NextResponse.json(
            { error: "Bu derse erişim yetkiniz bulunmamaktadır. Sadece size atanan sınıfların derslerini görüntüleyebilirsiniz." },
            { status: 403 }
          )
        }
      } else {
        // classId yoksa, grade ve section ile kontrol et (eski sistem uyumluluğu)
        // Bu durumda rehberlik kullanıcısı erişemez (çünkü sınıf ataması yok)
        return NextResponse.json(
          { error: "Bu derse erişim yetkiniz bulunmamaktadır. Sadece size atanan sınıfların derslerini görüntüleyebilirsiniz." },
          { status: 403 }
        )
      }
    }

    // Progress kayıtlarındaki Staff ID'lerini topla
    const staffIds = new Set<string>()
    subject.units.forEach((unit) => {
      unit.topics.forEach((topic) => {
        topic.progress.forEach((p) => {
          if (p.markedBy) staffIds.add(p.markedBy)
          if (p.approvedBy) staffIds.add(p.approvedBy)
          if (p.reportedBy) staffIds.add(p.reportedBy)
        })
      })
    })

    // Staff bilgilerini çek
    const staffMembers = await prisma.staff.findMany({
      where: {
        id: { in: Array.from(staffIds) },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
      },
    })

    // Staff bilgilerini map'e çevir
    const staffMap = new Map(staffMembers.map((s) => [s.id, s]))

    // Progress kayıtlarına Staff bilgilerini ekle
    const subjectWithStaff = {
      ...subject,
      units: subject.units.map((unit) => ({
        ...unit,
        topics: unit.topics.map((topic) => ({
          ...topic,
          progress: topic.progress.map((p) => ({
            ...p,
            markedByStaff: p.markedBy ? staffMap.get(p.markedBy) : null,
            approvedByStaff: p.approvedBy ? staffMap.get(p.approvedBy) : null,
            reportedByStaff: p.reportedBy ? staffMap.get(p.reportedBy) : null,
            // ✅ Tarih alanlarını da ekle
            reportedAt: p.reportedAt ? p.reportedAt.toISOString() : null,
            approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
            markedAt: p.markedAt ? p.markedAt.toISOString() : null,
          })),
        })),
      })),
    }

    return NextResponse.json(subjectWithStaff)
  } catch (error) {
    console.error("Error fetching subject:", error)
    return NextResponse.json(
      { error: "Ders getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Ders güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { name, code, grade, section, description } = body

    if (!name) {
      return NextResponse.json(
        { error: "Ders adı zorunludur" },
        { status: 400 }
      )
    }

    // Sınıf validasyonu (varsa)
    let gradeNum: number | undefined
    if (grade !== undefined) {
      gradeNum = parseInt(grade, 10)
      if (isNaN(gradeNum) || gradeNum < 5 || gradeNum > 12) {
        return NextResponse.json(
          { error: "Sınıf 5 ile 12 arasında olmalıdır" },
          { status: 400 }
        )
      }
    }

    // Şube validasyonu (boş string ise null yap)
    const sectionValue = section !== undefined 
      ? (section && section.trim() !== "" ? section.trim() : null)
      : undefined

    const updateData: {
      name: string
      code?: string | null
      grade?: number
      section?: string | null
      description?: string | null
    } = {
      name: name.trim(),
      code: code !== undefined ? (code && code.trim() !== "" ? code.trim() : null) : undefined,
      description: description !== undefined ? (description && description.trim() !== "" ? description.trim() : null) : undefined,
    }

    if (gradeNum !== undefined) {
      updateData.grade = gradeNum
    }
    if (sectionValue !== undefined) {
      updateData.section = sectionValue
    }

    const subject = await prisma.subject.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(subject)
  } catch (error) {
    console.error("Error updating subject:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Ders güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Ders sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Önce dersin var olup olmadığını kontrol et
    const existingSubject = await prisma.subject.findUnique({
      where: { id: params.id },
      include: {
        units: {
          include: {
            topics: true,
          },
        },
        assignments: true,
      },
    })

    if (!existingSubject) {
      return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    }

    // İlişkili kayıtları sil (cascade delete çalışmazsa manuel silme)
    try {
      // 1. Progress kayıtlarını sil
      for (const unit of existingSubject.units) {
        for (const topic of unit.topics) {
          await prisma.progress.deleteMany({
            where: { topicId: topic.id },
          })
        }
        // 2. Topic'leri sil
        await prisma.topic.deleteMany({
          where: { unitId: unit.id },
        })
      }

      // 3. Unit'leri sil
      await prisma.unit.deleteMany({
        where: { subjectId: params.id },
      })

      // 4. Öğretmen atamalarını sil
      await prisma.subjectAssignment.deleteMany({
        where: { subjectId: params.id },
      })

      // 5. Son olarak dersi sil
      await prisma.subject.delete({
        where: { id: params.id },
      })

      return NextResponse.json({
        message: "Ders ve tüm ilişkili kayıtlar başarıyla silindi",
      })
    } catch (deleteError) {
      console.error("Error during cascade delete:", deleteError)
      return NextResponse.json(
        {
          error: "Ders silinirken bir hata oluştu. İlişkili kayıtlar temizlenemedi.",
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error deleting subject:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Ders silinirken hata oluştu" },
      { status: 500 }
    )
  }
}


