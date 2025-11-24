// Webhook test scripti
// Kullanım: node test-webhook.js

const testWebhook = async () => {
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhook/basvuru'
  const webhookSecret = process.env.WEBHOOK_SECRET || 'test-secret'

  const testPayload = {
    id: 'test-' + Date.now(),
    ogrenciAdSoyad: 'TEST ÖĞRENCİ',
    ogrenciTc: '12345678901',
    okul: 'Test Okulu',
    ogrenciSinifi: '5. Sınıf',
    babaAdSoyad: 'TEST BABA',
    babaMeslek: 'Test Meslek',
    babaIsAdresi: null,
    babaCepTel: '5551234567',
    anneAdSoyad: 'TEST ANNE',
    anneMeslek: 'Test Meslek',
    anneIsAdresi: null,
    anneCepTel: '5557654321',
    email: 'test@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    console.log('🚀 Webhook test başlatılıyor...')
    console.log('📍 URL:', webhookUrl)
    console.log('🔑 Secret:', webhookSecret ? '***' : 'YOK!')
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
        'X-Webhook-Source': 'basvuru-sistemi',
      },
      body: JSON.stringify(testPayload),
    })

    const data = await response.json()
    
    console.log('📊 Status:', response.status)
    console.log('📦 Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Webhook başarılı!')
    } else {
      console.log('❌ Webhook başarısız!')
    }
  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

testWebhook()

