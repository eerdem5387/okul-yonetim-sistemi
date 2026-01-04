/**
 * Veli hesaplarını kontrol etme scripti
 * 
 * Kullanım:
 * node scripts/check-parent-accounts.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkParentAccounts() {
  try {
    console.log("🔍 Veli hesapları kontrol ediliyor...\n")
    
    // Tüm öğrencileri getir
    const students = await prisma.student.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        motherName: true,
        motherTc: true,
        fatherName: true,
        fatherTc: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Son 10 öğrenciyi kontrol et
    })
    
    console.log(`📊 Son ${students.length} öğrenci kontrol ediliyor...\n`)
    
    for (const student of students) {
      const parent = await prisma.parent.findUnique({
        where: { studentTcNumber: student.tcNumber },
        include: {
          students: true
        }
      })
      
      console.log(`\n👤 Öğrenci: ${student.firstName} ${student.lastName} (TC: ${student.tcNumber})`)
      
      if (!parent) {
        console.log("  ❌ Veli hesabı YOK!")
      } else {
        console.log(`  ✅ Veli hesabı VAR (ID: ${parent.id})`)
        console.log(`  📋 Aktif: ${parent.isActive}`)
        console.log(`  🔐 Şifre: ${parent.password ? 'VAR' : 'YOK (İlk giriş)'}`)
        console.log(`  👨‍👩‍👧 Veli kayıtları: ${parent.students.length}`)
        
        if (parent.students.length === 0) {
          console.log("  ⚠️  UYARI: Veli kayıtları (anne/baba) YOK!")
        } else {
          parent.students.forEach(ps => {
            console.log(`    - ${ps.relation}: ${ps.parentName} (TC: ${ps.parentTcNumber})`)
          })
        }
      }
    }
    
    // Genel istatistikler
    const totalStudents = await prisma.student.count()
    const totalParents = await prisma.parent.count()
    const parentsWithoutStudents = await prisma.parent.findMany({
      include: {
        students: true
      }
    })
    
    const parentsWithNoStudents = parentsWithoutStudents.filter(p => p.students.length === 0).length
    
    console.log("\n\n📊 GENEL İSTATİSTİKLER:")
    console.log(`   - Toplam öğrenci: ${totalStudents}`)
    console.log(`   - Toplam veli hesabı: ${totalParents}`)
    console.log(`   - Veli kaydı olmayan hesaplar: ${parentsWithNoStudents}`)
    
  } catch (error) {
    console.error("❌ Hata:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkParentAccounts()

