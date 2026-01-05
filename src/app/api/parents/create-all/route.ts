import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/parents/create-all
 * Tüm öğrenciler için veli hesapları oluşturur (mevcut öğrenciler için)
 */
export async function POST(_request: NextRequest) {
  try {
    console.log("🚀 Veli hesapları oluşturma işlemi başlatılıyor...")
    
    // Tüm öğrencileri getir
    const students = await prisma.student.findMany()
    console.log(`📊 Toplam ${students.length} öğrenci bulundu.`)

    let accountCount = 0
    let motherCount = 0
    let fatherCount = 0
    let errorCount = 0

    for (const student of students) {
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

        accountCount++

        // Anne bilgisi varsa ParentStudent'a ekle
        if (student.motherTc && student.motherName) {
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
          motherCount++
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
          fatherCount++
        }
      } catch (error) {
        console.error(`❌ Öğrenci ${student.tcNumber} için veli hesabı oluşturulamadı:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: "Veli hesapları oluşturuldu",
      stats: {
        totalStudents: students.length,
        accountsCreated: accountCount,
        mothersAdded: motherCount,
        fathersAdded: fatherCount,
        errors: errorCount,
      },
    })
  } catch (error) {
    console.error("Error creating parent accounts:", error)
    return NextResponse.json(
      { error: "Veli hesapları oluşturulurken bir hata oluştu" },
      { status: 500 }
    )
  }
}

