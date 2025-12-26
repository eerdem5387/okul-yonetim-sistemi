/**
 * Mevcut öğrencilerden veli kayıtları oluşturma scripti
 * 
 * Kullanım:
 * npx ts-node scripts/create-parents.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function createParents() {
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
        if ((students.indexOf(student) + 1) % 10 === 0) {
          console.log(
            `⏳ İşlenen öğrenci: ${students.indexOf(student) + 1}/${students.length}`
          )
        }
      } catch (error) {
        console.error(
          `❌ Hata (Öğrenci: ${student.firstName} ${student.lastName}):`,
          error
        )
        errorCount++
      }
    }

    console.log("\n✅ Veli hesapları başarıyla oluşturuldu!")
    console.log(`📈 İstatistikler:`)
    console.log(`   - Oluşturulan hesap sayısı: ${accountCount}`)
    console.log(`   - Anne kayıtları: ${motherCount}`)
    console.log(`   - Baba kayıtları: ${fatherCount}`)
    console.log(`   - Hata sayısı: ${errorCount}`)
    console.log(
      `\n💡 Veliler öğrencinin TC Kimlik No'sunu kullanarak giriş yapabilirler.`
    )
    console.log(
      `   İlk girişte şifre: Öğrencinin TC Kimlik No'su`
    )
  } catch (error) {
    console.error("❌ Genel hata:", error)
  } finally {
    await prisma.$disconnect()
  }
}

// Script'i çalıştır
createParents()
  .then(() => {
    console.log("\n🎉 İşlem tamamlandı!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  })


