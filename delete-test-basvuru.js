// Test başvurusunu silmek için script
// Kullanım: node delete-test-basvuru.js

const deleteTestBasvuru = async () => {
  try {
    // Debug endpoint'inden tüm başvuruları çek
    const response = await fetch('http://localhost:3001/api/debug/basvurular')
    const data = await response.json()
    
    console.log('📋 Toplam başvuru:', data.count)
    console.log('')
    
    // Test başvurularını bul
    const testBasvurular = data.basvurular.filter(b => 
      b.ogrenciAdSoyad.includes('TEST') || 
      b.okul === 'Test Okulu' ||
      b.externalId.startsWith('test-')
    )
    
    if (testBasvurular.length === 0) {
      console.log('✅ Test başvurusu bulunamadı')
      return
    }
    
    console.log('🔍 Bulunan test başvuruları:')
    testBasvurular.forEach((b, i) => {
      console.log(`${i + 1}. ID: ${b.id}`)
      console.log(`   Öğrenci: ${b.ogrenciAdSoyad}`)
      console.log(`   Okul: ${b.okul}`)
      console.log(`   External ID: ${b.externalId}`)
      console.log('')
    })
    
    // Test başvurularını sil
    for (const basvuru of testBasvurular) {
      try {
        const deleteResponse = await fetch(`http://localhost:3001/api/basvurular/${basvuru.id}`, {
          method: 'DELETE'
        })
        
        if (deleteResponse.ok) {
          console.log(`✅ Başvuru silindi: ${basvuru.ogrenciAdSoyad} (${basvuru.id})`)
        } else {
          const error = await deleteResponse.json()
          console.error(`❌ Silme hatası: ${error.error}`)
        }
      } catch (error) {
        console.error(`❌ Hata: ${error.message}`)
      }
    }
    
    console.log('')
    console.log('✅ İşlem tamamlandı!')
  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

deleteTestBasvuru()

