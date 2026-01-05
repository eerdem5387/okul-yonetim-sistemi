const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetPassword() {
  try {
    // Kullanıcıdan bilgileri al
    const args = process.argv.slice(2)
    
    if (args.length < 2) {
      console.log('❌ Kullanım: node scripts/reset-staff-password.js <tcNumber1> <tcNumber2> [yeniŞifre]')
      console.log('')
      console.log('Örnek:')
      console.log('  node scripts/reset-staff-password.js 12345678901 98765432109')
      console.log('  node scripts/reset-staff-password.js 12345678901 98765432109 yeniSifre123')
      console.log('')
      console.log('Not: Şifre belirtilmezse, TC numarası şifre olarak kullanılır (ilk giriş gibi)')
      process.exit(1)
    }

    const tcNumber1 = args[0]
    const tcNumber2 = args[1]
    const newPassword = args[2] || null // Şifre belirtilmezse null (ilk giriş gibi)

    console.log('🔐 Şifre Sıfırlama İşlemi Başlatılıyor...\n')

    // İlk kullanıcıyı bul
    const staff1 = await prisma.staff.findUnique({
      where: { tcNumber: tcNumber1 },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        department: true,
        password: true,
        isFirstLogin: true
      }
    })

    if (!staff1) {
      console.log(`❌ TC: ${tcNumber1} ile kullanıcı bulunamadı!`)
      process.exit(1)
    }

    // İkinci kullanıcıyı bul
    const staff2 = await prisma.staff.findUnique({
      where: { tcNumber: tcNumber2 },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        department: true,
        password: true,
        isFirstLogin: true
      }
    })

    if (!staff2) {
      console.log(`❌ TC: ${tcNumber2} ile kullanıcı bulunamadı!`)
      process.exit(1)
    }

    console.log('📋 Bulunan Kullanıcılar:')
    console.log(`   1. ${staff1.firstName} ${staff1.lastName} (TC: ${staff1.tcNumber}, Departman: ${staff1.department})`)
    console.log(`   2. ${staff2.firstName} ${staff2.lastName} (TC: ${staff2.tcNumber}, Departman: ${staff2.department})`)
    console.log('')

    // Şifre belirleme
    let passwordToHash
    let isFirstLogin = false

    if (newPassword) {
      passwordToHash = newPassword
      console.log(`🔑 Yeni şifre: ${newPassword}`)
      console.log('   (İlk giriş durumu: false)')
    } else {
      passwordToHash = null // Şifre null olacak, ilk giriş gibi
      isFirstLogin = true
      console.log('🔑 Şifre: null (ilk giriş gibi - TC numarası ile giriş yapılabilir)')
      console.log('   (İlk giriş durumu: true)')
    }

    // Şifreleri hash'le (eğer şifre belirtildiyse)
    let hashedPassword1 = null
    let hashedPassword2 = null

    if (passwordToHash) {
      const saltRounds = 10
      hashedPassword1 = await bcrypt.hash(passwordToHash, saltRounds)
      hashedPassword2 = await bcrypt.hash(passwordToHash, saltRounds)
    }

    // İlk kullanıcının şifresini sıfırla
    await prisma.staff.update({
      where: { id: staff1.id },
      data: {
        password: hashedPassword1,
        isFirstLogin: isFirstLogin,
        mustChangePassword: false,
        lastLoginAt: null
      }
    })

    // İkinci kullanıcının şifresini sıfırla
    await prisma.staff.update({
      where: { id: staff2.id },
      data: {
        password: hashedPassword2,
        isFirstLogin: isFirstLogin,
        mustChangePassword: false,
        lastLoginAt: null
      }
    })

    console.log('')
    console.log('✅ Şifre sıfırlama işlemi başarıyla tamamlandı!')
    console.log('')
    console.log('📝 Özet:')
    console.log(`   • ${staff1.firstName} ${staff1.lastName} (TC: ${staff1.tcNumber})`)
    if (newPassword) {
      console.log(`     → Şifre: ${newPassword}`)
    } else {
      console.log(`     → Şifre: null (ilk giriş - TC numarası ile giriş yapılabilir)`)
    }
    console.log(`   • ${staff2.firstName} ${staff2.lastName} (TC: ${staff2.tcNumber})`)
    if (newPassword) {
      console.log(`     → Şifre: ${newPassword}`)
    } else {
      console.log(`     → Şifre: null (ilk giriş - TC numarası ile giriş yapılabilir)`)
    }
    console.log('')

  } catch (error) {
    console.error('❌ Hata oluştu:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetPassword()

