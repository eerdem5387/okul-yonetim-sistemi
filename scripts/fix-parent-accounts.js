/**
 * Eksik veli kayıtlarını düzeltme scripti
 * 
 * Kullanım:
 * node scripts/fix-parent-accounts.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixParentAccounts() {
  try {
    console.log("🔧 Eksik veli kayıtları düzeltiliyor...\n")
    
    // Tüm öğrencileri getir
    const students = await prisma.student.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        motherName: true,
        motherTc: true,
        motherPhone: true,
        fatherName: true,
        fatherTc: true,
        fatherPhone: true,
      }
    })
    
    console.log(`📊 Toplam ${students.length} öğrenci kontrol ediliyor...\n`)
    
    let fixedCount = 0
    let errorCount = 0
    
    for (const student of students) {
      try {
        // Veli hesabını bul
        const parent = await prisma.parent.findUnique({
          where: { studentTcNumber: student.tcNumber },
          include: {
            students: true
          }
        })
        
        if (!parent) {
          console.log(`⚠️  ${student.firstName} ${student.lastName} için veli hesabı yok, atlanıyor...`)
          continue
        }
        
        // Anne bilgisi varsa ve ParentStudent'da yoksa ekle
        if (student.motherName && student.motherTc && student.motherName.trim() && student.motherTc.trim()) {
          const hasMother = parent.students.some(ps => ps.relation === "ANNE")
          
          if (!hasMother) {
            await prisma.parentStudent.upsert({
              where: {
                parentId_studentId_relation: {
                  parentId: parent.id,
                  studentId: student.id,
                  relation: "ANNE",
                },
              },
              update: {
                parentName: student.motherName.trim(),
                parentTcNumber: student.motherTc.trim(),
                parentPhone: student.motherPhone?.trim() || undefined,
                parentEmail: undefined,
              },
              create: {
                parentId: parent.id,
                studentId: student.id,
                relation: "ANNE",
                parentName: student.motherName.trim(),
                parentTcNumber: student.motherTc.trim(),
                parentPhone: student.motherPhone?.trim() || undefined,
              },
            })
            fixedCount++
            console.log(`✅ ${student.firstName} ${student.lastName} - Anne eklendi`)
          }
        }
        
        // Baba bilgisi varsa ve ParentStudent'da yoksa ekle
        if (student.fatherName && student.fatherTc && student.fatherName.trim() && student.fatherTc.trim()) {
          const hasFather = parent.students.some(ps => ps.relation === "BABA")
          
          if (!hasFather) {
            await prisma.parentStudent.upsert({
              where: {
                parentId_studentId_relation: {
                  parentId: parent.id,
                  studentId: student.id,
                  relation: "BABA",
                },
              },
              update: {
                parentName: student.fatherName.trim(),
                parentTcNumber: student.fatherTc.trim(),
                parentPhone: student.fatherPhone?.trim() || undefined,
                parentEmail: undefined,
              },
              create: {
                parentId: parent.id,
                studentId: student.id,
                relation: "BABA",
                parentName: student.fatherName.trim(),
                parentTcNumber: student.fatherTc.trim(),
                parentPhone: student.fatherPhone?.trim() || undefined,
              },
            })
            fixedCount++
            console.log(`✅ ${student.firstName} ${student.lastName} - Baba eklendi`)
          }
        }
        
        // Her 50 öğrencide bir ilerleme göster
        if ((fixedCount + errorCount) % 50 === 0) {
          console.log(`📈 İlerleme: ${fixedCount + errorCount}/${students.length} öğrenci işlendi...`)
        }
      } catch (error) {
        console.error(`❌ ${student.firstName} ${student.lastName} için hata:`, error.message)
        errorCount++
      }
    }
    
    console.log("\n✅ İşlem tamamlandı!")
    console.log(`📊 İstatistikler:`)
    console.log(`   - Düzeltilen kayıt: ${fixedCount}`)
    console.log(`   - Hata sayısı: ${errorCount}`)
    
  } catch (error) {
    console.error("❌ Genel hata:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixParentAccounts()

