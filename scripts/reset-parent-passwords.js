/**
 * Eski öğrenciler için veli hesap şifrelerini sıfırlama scripti
 * (İlk giriş için TC ile giriş yapılabilmesi için)
 * 
 * Kullanım:
 * node scripts/reset-parent-passwords.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resetParentPasswords() {
  try {
    console.log("🔧 Veli hesap şifreleri sıfırlanıyor...\n")
    
    // Şifresi olan tüm veli hesaplarını bul
    const parentsWithPassword = await prisma.parent.findMany({
      where: {
        password: {
          not: null
        }
      },
      select: {
        id: true,
        studentTcNumber: true,
        password: true,
      }
    })
    
    console.log(`📊 ${parentsWithPassword.length} veli hesabında şifre var.\n`)
    console.log("⚠️  Bu hesapların şifreleri sıfırlanacak (ilk giriş için TC ile giriş yapılabilecek).\n")
    
    let resetCount = 0
    let errorCount = 0
    
    for (const parent of parentsWithPassword) {
      try {
        await prisma.parent.update({
          where: { id: parent.id },
          data: {
            password: null,
            isFirstLogin: true,
          },
        })
        resetCount++
        console.log(`✅ ${parent.studentTcNumber} - Şifre sıfırlandı`)
      } catch (error) {
        console.error(`❌ ${parent.studentTcNumber} - Hata:`, error.message)
        errorCount++
      }
    }
    
    console.log("\n✅ İşlem tamamlandı!")
    console.log(`📊 İstatistikler:`)
    console.log(`   - Sıfırlanan şifre: ${resetCount}`)
    console.log(`   - Hata sayısı: ${errorCount}`)
    console.log("\n💡 Artık tüm veliler ilk girişte öğrenci TC'si ile giriş yapabilir.")
    
  } catch (error) {
    console.error("❌ Genel hata:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetParentPasswords()

