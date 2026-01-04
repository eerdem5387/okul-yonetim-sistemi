/**
 * Mevcut öğrenciler için veli hesapları oluşturma scripti
 * 
 * Kullanım:
 * node scripts/create-parents-for-existing-students.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createParentsForExistingStudents() {
  try {
    console.log("🚀 Veli hesapları oluşturma işlemi başlatılıyor...")
    console.log("📝 Her öğrenci için bir veli hesabı (öğrenci TC bazlı) oluşturulacak")
    
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

        // Her 10 öğrencide bir ilerleme göster
        if (accountCount % 10 === 0) {
          console.log(`✅ ${accountCount}/${students.length} öğrenci işlendi...`)
        }
      } catch (error) {
        console.error(`❌ Öğrenci ${student.tcNumber} için veli hesabı oluşturulamadı:`, error.message)
        errorCount++
      }
    }

    console.log("\n✅ İşlem tamamlandı!")
    console.log(`📊 İstatistikler:`)
    console.log(`   - Toplam öğrenci: ${students.length}`)
    console.log(`   - Oluşturulan veli hesabı: ${accountCount}`)
    console.log(`   - Eklenen anne: ${motherCount}`)
    console.log(`   - Eklenen baba: ${fatherCount}`)
    console.log(`   - Hata sayısı: ${errorCount}`)
  } catch (error) {
    console.error("❌ Genel hata:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createParentsForExistingStudents()

