const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findStaff() {
  try {
    const firstName1 = 'Kamer'
    const lastName1 = 'Karali'
    const firstName2 = 'Beyza'
    const lastName2 = 'Demirci'

    console.log('🔍 Öğretmenler aranıyor...\n')

    // İlk öğretmeni bul
    const staff1 = await prisma.staff.findFirst({
      where: {
        firstName: { contains: firstName1, mode: 'insensitive' },
        lastName: { contains: lastName1, mode: 'insensitive' }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        department: true,
        email: true,
        phone: true
      }
    })

    // İkinci öğretmeni bul
    const staff2 = await prisma.staff.findFirst({
      where: {
        firstName: { contains: firstName2, mode: 'insensitive' },
        lastName: { contains: lastName2, mode: 'insensitive' }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        department: true,
        email: true,
        phone: true
      }
    })

    if (!staff1) {
      console.log(`❌ ${firstName1} ${lastName1} bulunamadı!`)
    } else {
      console.log(`✅ ${staff1.firstName} ${staff1.lastName} bulundu:`)
      console.log(`   TC: ${staff1.tcNumber}`)
      console.log(`   Departman: ${staff1.department}`)
      if (staff1.email) console.log(`   Email: ${staff1.email}`)
      if (staff1.phone) console.log(`   Telefon: ${staff1.phone}`)
      console.log('')
    }

    if (!staff2) {
      console.log(`❌ ${firstName2} ${lastName2} bulunamadı!`)
    } else {
      console.log(`✅ ${staff2.firstName} ${staff2.lastName} bulundu:`)
      console.log(`   TC: ${staff2.tcNumber}`)
      console.log(`   Departman: ${staff2.department}`)
      if (staff2.email) console.log(`   Email: ${staff2.email}`)
      if (staff2.phone) console.log(`   Telefon: ${staff2.phone}`)
      console.log('')
    }

    if (staff1 && staff2) {
      console.log('📋 Şifre sıfırlama komutu:')
      console.log(`node scripts/reset-staff-password.js ${staff1.tcNumber} ${staff2.tcNumber}`)
      console.log('')
      console.log('Veya belirli bir şifre ile:')
      console.log(`node scripts/reset-staff-password.js ${staff1.tcNumber} ${staff2.tcNumber} yeniSifre123`)
    }

  } catch (error) {
    console.error('❌ Hata oluştu:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findStaff()

