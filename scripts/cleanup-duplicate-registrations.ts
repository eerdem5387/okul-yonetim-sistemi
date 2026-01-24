/**
 * Duplicate Registration Cleanup Script
 * 
 * Bu script, yeni kayıt ve kayıt yenileme tablolarındaki çift kayıtları temizler.
 * Çift kayıt tespiti:
 * - Aynı öğrenci için aynı gün içinde oluşturulmuş kayıtlar
 * - En eski kayıt korunur, diğerleri silinir
 * 
 * ÖNEMLİ: Bu script sadece çift kayıtları temizler, asıl kayıtları silmez!
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DuplicateGroup {
  studentId: string
  date: string // YYYY-MM-DD formatında
  registrations: Array<{ id: string; createdAt: Date }>
}

async function cleanupDuplicateNewRegistrations() {
  console.log('🔍 Yeni kayıtlardaki çift kayıtlar taranıyor...')
  
  // Tüm yeni kayıtları öğrenci ID ve tarih bazında grupla
  const allRegistrations = await prisma.newRegistration.findMany({
    select: {
      id: true,
      studentId: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  // Öğrenci ID ve tarih bazında grupla
  const grouped = new Map<string, DuplicateGroup>()
  
  for (const reg of allRegistrations) {
    const dateKey = reg.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
    const groupKey = `${reg.studentId}-${dateKey}`
    
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        studentId: reg.studentId,
        date: dateKey,
        registrations: []
      })
    }
    
    grouped.get(groupKey)!.registrations.push({
      id: reg.id,
      createdAt: reg.createdAt
    })
  }

  // Çift kayıtları bul (aynı öğrenci ve tarih için birden fazla kayıt)
  const duplicates: Array<{ groupKey: string; keepId: string; deleteIds: string[] }> = []
  
  for (const [groupKey, group] of grouped.entries()) {
    if (group.registrations.length > 1) {
      // En eski kayıt korunur, diğerleri silinir
      const sorted = [...group.registrations].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )
      const keepId = sorted[0].id
      const deleteIds = sorted.slice(1).map(r => r.id)
      
      duplicates.push({
        groupKey,
        keepId,
        deleteIds
      })
    }
  }

  console.log(`📊 Toplam ${duplicates.length} çift kayıt grubu bulundu`)
  
  let totalDeleted = 0
  for (const dup of duplicates) {
    console.log(`🗑️  ${dup.groupKey}: ${dup.deleteIds.length} çift kayıt siliniyor (${dup.keepId} korunuyor)`)
    
    await prisma.newRegistration.deleteMany({
      where: {
        id: { in: dup.deleteIds }
      }
    })
    
    totalDeleted += dup.deleteIds.length
  }

  console.log(`✅ Yeni kayıtlardan toplam ${totalDeleted} çift kayıt temizlendi\n`)
  return totalDeleted
}

async function cleanupDuplicateRenewals() {
  console.log('🔍 Kayıt yenilemelerindeki çift kayıtlar taranıyor...')
  
  // Tüm kayıt yenilemelerini öğrenci ID, akademik yıl ve tarih bazında grupla
  const allRenewals = await prisma.renewal.findMany({
    select: {
      id: true,
      studentId: true,
      contractData: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  // Öğrenci ID, akademik yıl ve tarih bazında grupla
  const grouped = new Map<string, DuplicateGroup>()
  
  for (const renewal of allRenewals) {
    const contractData = renewal.contractData as Record<string, unknown>
    const academicYear = contractData?.academicYear as string || 'UNKNOWN'
    const dateKey = renewal.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
    const groupKey = `${renewal.studentId}-${academicYear}-${dateKey}`
    
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        studentId: renewal.studentId,
        date: dateKey,
        registrations: []
      })
    }
    
    grouped.get(groupKey)!.registrations.push({
      id: renewal.id,
      createdAt: renewal.createdAt
    })
  }

  // Çift kayıtları bul
  const duplicates: Array<{ groupKey: string; keepId: string; deleteIds: string[] }> = []
  
  for (const [groupKey, group] of grouped.entries()) {
    if (group.registrations.length > 1) {
      // En eski kayıt korunur, diğerleri silinir
      const sorted = [...group.registrations].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )
      const keepId = sorted[0].id
      const deleteIds = sorted.slice(1).map(r => r.id)
      
      duplicates.push({
        groupKey,
        keepId,
        deleteIds
      })
    }
  }

  console.log(`📊 Toplam ${duplicates.length} çift kayıt grubu bulundu`)
  
  let totalDeleted = 0
  for (const dup of duplicates) {
    console.log(`🗑️  ${dup.groupKey}: ${dup.deleteIds.length} çift kayıt siliniyor (${dup.keepId} korunuyor)`)
    
    await prisma.renewal.deleteMany({
      where: {
        id: { in: dup.deleteIds }
      }
    })
    
    totalDeleted += dup.deleteIds.length
  }

  console.log(`✅ Kayıt yenilemelerinden toplam ${totalDeleted} çift kayıt temizlendi\n`)
  return totalDeleted
}

async function main() {
  console.log('🚀 Çift kayıt temizleme işlemi başlatılıyor...\n')
  
  try {
    const newRegDeleted = await cleanupDuplicateNewRegistrations()
    const renewalDeleted = await cleanupDuplicateRenewals()
    
    console.log('✨ Temizleme işlemi tamamlandı!')
    console.log(`📈 Özet:`)
    console.log(`   - Yeni kayıtlardan silinen: ${newRegDeleted}`)
    console.log(`   - Kayıt yenilemelerinden silinen: ${renewalDeleted}`)
    console.log(`   - Toplam silinen: ${newRegDeleted + renewalDeleted}`)
  } catch (error) {
    console.error('❌ Hata oluştu:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

