import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function generatePDF(html: string, options?: { format?: string; margin?: Record<string, string> }) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })

  const page = await browser.newPage()
  
  // HTML'i UTF-8 Buffer olarak encode et
  const htmlBuffer = Buffer.from(html, 'utf-8')
  const htmlString = htmlBuffer.toString('utf-8')
  
  await page.setContent(htmlString, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    format: (options?.format || 'A4') as 'A4',
    margin: options?.margin || {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    }
  })

  await browser.close()
  return pdf
}

export function generateContractHTML(contractData: Record<string, unknown>, contractType: string) {
  const currentDate = new Date().toLocaleDateString('tr-TR')

  const baseHTML = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${contractType}</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            .contract-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .contract-date {
                font-size: 14px;
                color: #666;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #2c3e50;
            }
            .field {
                margin-bottom: 10px;
                display: flex;
            }
            .field-label {
                font-weight: bold;
                width: 200px;
                min-width: 200px;
            }
            .field-value {
                flex: 1;
                border-bottom: 1px solid #ccc;
                padding-bottom: 2px;
            }
            .signature-section {
                margin-top: 50px;
                display: flex;
                justify-content: space-between;
            }
            .signature-box {
                width: 200px;
                text-align: center;
            }
            .signature-line {
                border-bottom: 1px solid #333;
                height: 50px;
                margin-bottom: 10px;
            }
            .footer {
                margin-top: 50px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="contract-title">${contractType}</div>
            <div class="contract-date">Tarih: ${currentDate}</div>
        </div>
        
        <div class="section">
            <div class="section-title">Öğrenci Bilgileri</div>
            <div class="field">
                <div class="field-label">Ad Soyad:</div>
                <div class="field-value">${contractData.studentName || ''}</div>
            </div>
            <div class="field">
                <div class="field-label">TC Kimlik No:</div>
                <div class="field-value">${contractData.tcNumber || ''}</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Sözleşme Detayları</div>
            ${generateContractSpecificFields(contractData, contractType)}
        </div>
        
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div>Veli İmzası</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div>Okul Müdürü İmzası</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Bu sözleşme elektronik ortamda oluşturulmuş olup, yasal geçerliliği vardır.</p>
        </div>
    </body>
    </html>
  `

  return baseHTML
}

function generateContractSpecificFields(contractData: Record<string, unknown>, contractType: string) {
  switch (contractType) {
    case 'Yeni Kayıt':
      return `
        <div class="field">
            <div class="field-label">Eğitim Öğretim Yılı:</div>
            <div class="field-value">${contractData.academicYear || '2024-2025'}</div>
        </div>
        <div class="field">
            <div class="field-label">Sınıf:</div>
            <div class="field-value">${contractData.grade || ''}</div>
        </div>
        <div class="field">
            <div class="field-label">Öğrenim Ücreti:</div>
            <div class="field-value">${contractData.tuitionFee || '0'} TL</div>
        </div>
      `
    case 'Kayıt Yenileme':
      return `
        <div class="field">
            <div class="field-label">Eğitim Öğretim Yılı:</div>
            <div class="field-value">${contractData.academicYear || '2024-2025'}</div>
        </div>
        <div class="field">
            <div class="field-label">Sınıf:</div>
            <div class="field-value">${contractData.grade || ''}</div>
        </div>
        <div class="field">
            <div class="field-label">Öğrenim Ücreti:</div>
            <div class="field-value">${contractData.tuitionFee || '0'} TL</div>
        </div>
      `
    case 'Forma Sözleşmesi':
      return `
        <div class="field">
            <div class="field-label">Forma Bedeni:</div>
            <div class="field-value">${contractData.uniformSize || ''}</div>
        </div>
        <div class="field">
            <div class="field-label">Forma Ücreti:</div>
            <div class="field-value">${contractData.uniformPrice || '0'} TL</div>
        </div>
        <div class="field">
            <div class="field-label">Teslim Tarihi:</div>
            <div class="field-value">${contractData.deliveryDate || ''}</div>
        </div>
      `
    case 'Yemek Sözleşmesi':
      return `
        <div class="field">
            <div class="field-label">Yemek Türü:</div>
            <div class="field-value">${contractData.mealType || ''}</div>
        </div>
        <div class="field">
            <div class="field-label">Yemek Ücreti:</div>
            <div class="field-value">${contractData.mealPrice || '0'} TL</div>
        </div>
        <div class="field">
            <div class="field-label">Başlangıç Tarihi:</div>
            <div class="field-value">${contractData.startDate || ''}</div>
        </div>
      `
    case 'Servis Sözleşmesi':
      return `
        <div class="field">
            <div class="field-label">Güzergah:</div>
            <div class="field-value">${contractData.route || ''}</div>
        </div>
        <div class="field">
            <div class="field-label">Servis Ücreti:</div>
            <div class="field-value">${contractData.servicePrice || '0'} TL</div>
        </div>
        <div class="field">
            <div class="field-label">Alış Saati:</div>
            <div class="field-value">${contractData.pickupTime || ''}</div>
        </div>
      `
    case 'Kitap Sözleşmesi':
      return `
        <div class="field">
            <div class="field-label">Kitap Seti:</div>
            <div class="field-value">${contractData.bookSet || ''}</div>
        </div>
        <div class="field">
            <div class="field-label">Kitap Ücreti:</div>
            <div class="field-value">${contractData.bookPrice || '0'} TL</div>
        </div>
        <div class="field">
            <div class="field-label">Teslim Tarihi:</div>
            <div class="field-value">${contractData.deliveryDate || ''}</div>
        </div>
      `
    default:
      return ''
  }
}

export function generateCombinedContractHTML(data: {
  student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string; birthDate: string; parentName: string }
  contractTypes: string[]
  mainContractData: Record<string, unknown>
  otherContractData: Record<string, unknown>
}) {
  const { student, contractTypes, mainContractData, otherContractData } = data

  // Ana sözleşme HTML'i (Eğitim Öğretim Hizmet Sözleşmesi)
  const mainContractHTML = generateMainContractHTML(student, mainContractData)
  
  // Diğer sözleşmeler HTML'i
  const otherContractsHTML = generateOtherContractsHTML(student, contractTypes, otherContractData)

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tüm Sözleşmeler</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.4;
                margin: 0;
                padding: 20px;
                color: #000;
                font-size: 12px;
            }
            .page-break {
                page-break-before: always;
            }
            .contract-header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            .contract-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
                text-transform: uppercase;
            }
            .contract-subtitle {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .contract-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 11px;
            }
            .section {
                margin-bottom: 15px;
            }
            .section-title {
                font-size: 13px;
                font-weight: bold;
                margin-bottom: 10px;
                text-decoration: underline;
            }
            .field-row {
                display: flex;
                margin-bottom: 8px;
                align-items: center;
            }
            .field-label {
                font-weight: bold;
                min-width: 120px;
                margin-right: 10px;
            }
            .field-value {
                flex: 1;
                border-bottom: 1px solid #000;
                min-height: 20px;
                padding: 2px 5px;
            }
            .field-value-large {
                flex: 1;
                border-bottom: 1px solid #000;
                min-height: 40px;
                padding: 2px 5px;
            }
            .table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            .table th, .table td {
                border: 1px solid #000;
                padding: 5px;
                text-align: center;
                font-size: 11px;
            }
            .table th {
                background-color: #f0f0f0;
                font-weight: bold;
            }
            .signature-section {
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
            }
            .signature-box {
                width: 200px;
                text-align: center;
            }
            .signature-line {
                border-bottom: 1px solid #000;
                height: 40px;
                margin-bottom: 5px;
            }
            .signature-label {
                font-size: 10px;
                font-weight: bold;
            }
            .terms-section {
                margin-top: 20px;
                font-size: 10px;
                line-height: 1.3;
            }
            .terms-title {
                font-weight: bold;
                margin-bottom: 10px;
                text-decoration: underline;
            }
            .terms-list {
                margin-left: 20px;
            }
            .terms-list li {
                margin-bottom: 5px;
            }
            .checkbox-section {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
            }
            .checkbox {
                width: 15px;
                height: 15px;
                border: 1px solid #000;
                margin-right: 10px;
                display: inline-block;
            }
            .checkbox.checked {
                background-color: #000;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
            }
        </style>
    </head>
    <body>
        ${mainContractHTML}
        ${otherContractsHTML}
        
        <div class="footer">
            <p>Bu sözleşmeler elektronik ortamda oluşturulmuş olup, yasal geçerliliği vardır.</p>
        </div>
    </body>
    </html>
  `
}

function generateMainContractHTML(student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string; birthDate: string; parentName: string }, contractData: Record<string, unknown>) {
  return `
    <div class="contract-header">
      <div class="contract-title">EĞİTİM ÖĞRETİM HİZMET SÖZLEŞMESİ</div>
      <div class="contract-subtitle">2024-2025 ÖĞRETİM YILI</div>
    </div>

    <div class="contract-info">
      <div><strong>Okul Ruhsat No:</strong> ${contractData.schoolLicenseNo || '___________'}</div>
      <div><strong>Sözleşme No (Okul No):</strong> ${contractData.contractNo || '___________'}</div>
      <div><strong>Kayıt/Kayıt Yenileme Sorumlusu:</strong> ${contractData.registrationResponsible || '___________'}</div>
      <div><strong>Kayıt/Kayıt Yenileme Tarihi:</strong> ${contractData.registrationDate || '___________'}</div>
    </div>

    <div class="section">
      <div class="section-title">ÖĞRENCİ BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Öğrenci Adı:</div>
        <div class="field-value">${contractData.studentName || student.firstName + ' ' + student.lastName}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Sınıfı:</div>
        <div class="field-value">${contractData.studentClass || student.grade}</div>
      </div>
      <div class="field-row">
        <div class="field-label">TC Kimlik No:</div>
        <div class="field-value">${contractData.studentTC || student.tcNumber}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Doğum Tarihi:</div>
        <div class="field-value">${contractData.studentBirthDate || student.birthDate}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">ÖDEME BİLGİLERİ (2024-2025 Öğretim Yılı İçin)</div>
      <table class="table">
        <thead>
          <tr>
            <th>ÜCRET TÜRÜ</th>
            <th>KURUMUN İLAN ETTİĞİ ÜCRETLER (KDV Dahil)</th>
            <th>ÖĞRENCİ İÇİN BELİRLENEN ÜCRETLER (KDV Dahil)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Öğrenim Ücreti</td>
            <td>${contractData.announcedTuitionFee || '0'}</td>
            <td>${contractData.studentTuitionFee || '0'}</td>
          </tr>
          <tr>
            <td>KIYAFET ÜCRETİ</td>
            <td>${contractData.announcedClothingFee || '0'}</td>
            <td>${contractData.studentClothingFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Takviye Kursu Ücreti</td>
            <td>${contractData.announcedCourseFee || '0'}</td>
            <td>${contractData.studentCourseFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Kitap Ücreti</td>
            <td>${contractData.announcedBookFee || '0'}</td>
            <td>${contractData.studentBookFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Kırtasiye Ücreti</td>
            <td>${contractData.announcedStationeryFee || '0'}</td>
            <td>${contractData.studentStationeryFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Etüt Ücreti</td>
            <td>${contractData.announcedStudyHallFee || '0'}</td>
            <td>${contractData.studentStudyHallFee || '0'}</td>
          </tr>
          <tr style="font-weight: bold;">
            <td>ÜCRETLER TOPLAMI</td>
            <td>${contractData.announcedTotal || '0'}</td>
            <td>${contractData.studentTotal || '0'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">ÖDEME PLANI</div>
      <div class="field-row">
        <div class="field-label">Taksit Başlangıç Tarihi:</div>
        <div class="field-value">${contractData.installmentStartDate || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Peşinat:</div>
        <div class="field-value">${contractData.downPayment || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Taksit Sayısı ve Tutarı:</div>
        <div class="field-value">${contractData.installmentDetails || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Başarı İndirimi Oranı:</div>
        <div class="field-value">${contractData.achievementDiscountRate || '___________'} ${contractData.achievementDiscountType === 'percentage' ? '%' : ''}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">İNDİRİMLER</div>
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <div class="checkbox-section">
            <div class="checkbox ${contractData.siblingDiscount ? 'checked' : ''}"></div>
            <span>Kardeş İndirimi</span>
          </div>
          <div class="checkbox-section">
            <div class="checkbox ${contractData.staffChildDiscount ? 'checked' : ''}"></div>
            <span>Personel Çocuğu İndirimi</span>
          </div>
          <div class="checkbox-section">
            <div class="checkbox ${contractData.corporateDiscount ? 'checked' : ''}"></div>
            <span>Kurumsal İndirim</span>
          </div>
          <div class="checkbox-section">
            <div class="checkbox ${contractData.martyrVeteranDiscount ? 'checked' : ''}"></div>
            <span>Şehit/Gazi Çocuğu İndirimi</span>
          </div>
          <div class="checkbox-section">
            <div class="checkbox ${contractData.otherDiscount ? 'checked' : ''}"></div>
            <span>Diğer İndirimler: ${contractData.otherDiscountDescription || '___________'}</span>
          </div>
        </div>
        <div style="flex: 1;">
          <div class="checkbox-section">
            <div class="checkbox ${contractData.teacherChildDiscount ? 'checked' : ''}"></div>
            <span>Öğretmen Çocuğu İndirimi</span>
          </div>
          <div class="checkbox-section">
            <div class="checkbox ${contractData.achievementDiscount ? 'checked' : ''}"></div>
            <span>Başarı İndirimi</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">İMZA VE TARİH</div>
      <div class="field-row">
        <div class="field-label">Tarih:</div>
        <div class="field-value">${contractData.contractDate || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Kaydı Yapan:</div>
        <div class="field-value">${contractData.registrarName || '___________'}</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Okul Müdürü İmzası</div>
      </div>
    </div>

    <div class="page-break"></div>

    <div class="contract-header">
      <div class="contract-title">ŞARTLAR</div>
    </div>

    <div class="terms-section">
      <ol class="terms-list">
        <li>Öğrenci eğitimi, kayıtlı olduğu veya nakil yapıldığı okuldaki tüm sınıfların sonuna kadar devam eder. Sözleşme, imzalandığı öğretim yılının 15 Haziran tarihinde sona erer.</li>
        <li>Öğrenci bir sonraki öğretim yılında okula devam etmek isterse, <strong>Ödeme Bilgileri Bölümünde Öğrenci İçin Belirlenen Öğrenim Ücreti</strong>ne göre artış yapılacaktır.</li>
        <li>Kurum, bir sonraki yılın eğitim ve öğretim ücretleri ile diğer ücretleri (takviye kursları, yemek, servis, kıyafet, kırtasiye, yurt vb.) Ocak ayından Mayıs ayı sonuna kadar duyurur. Bu duyurularda ödemelerin öğretim yılı başına mı yoksa saat başına mı, nakit mi taksitli mi olduğu ve diğer indirimler belirtilir.</li>
        <li>Okulun ara sınıflarının eğitim ücretleri, Milli Eğitim Bakanlığı mevzuatına göre belirlenir.</li>
        <li>Sözleşmesi sona eren velinin fiyatlandırması, yeni kayıt olan öğrenci fiyatı üzerinden yapılır.</li>
        <li>Kurumun eğitim ve öğretim ücretleri, kurum adına açılan ve valiliğe bildirilen banka hesabına yatırılarak tahsil edilir. Tahsil edilen ücretler e-okul sistemine kaydedilerek velilere sunulur. Ödemeler kredi kartı ile veya anlaşmalı bankaların öğrenci taksit sistemi ile yapılabilir.</li>
        <li>Kurum, iş takviminde belirtilen süre içinde ücretlerini ödemeyen öğrencilerin kayıtlarını yenilememe hakkını saklı tutar. Veli/vasinin ücret ödememe konusunda ısrar etmesi durumunda, çocuğun kaydı eğitim müfettişlerince yapılan inceleme sonucunda nakil ve yerleştirme komisyonu aracılığıyla uygun resmi okula veya açık liseye nakledilir.</li>
        <li>Yenileme dönemlerinde kayıtlarını yenilemeyen öğrenciler, e-okul sistemindeki öğrenci ücretleri üzerinden fiyatlandırılır.</li>
        <li>Bu sözleşme ile kaydı garanti edilen öğrencinin daha önce gizlenen okul disiplin cezası olduğu, aleyhinde adli süreç/soruşturma başlatıldığı, Milli Eğitim Bakanlığı disiplin yönetmeliğine aykırı davranışta bulunduğu (adli dosya açılmasa bile) veya mevcut disiplin cezasının silindiği tespit edilirse bu sözleşme geçersiz sayılır.</li>
        <li>Öğrencilerin önceki öğretim dönemlerinde sınıf tekrarı yaptığı veya aşırı devamsızlık yaptığı tespit edilirse, Kurucu kayıt sözleşmesini tek taraflı olarak feshedebilir. Öğrenci velisi yazılı olarak bilgilendirilir.</li>
      </ol>
    </div>

    <div class="page-break"></div>

    <div class="contract-header">
      <div class="contract-title">ŞARTLAR (DEVAM)</div>
    </div>

    <div class="terms-section">
      <ol class="terms-list" start="11">
        <li>İlk taksit veya iki taksit üst üste zamanında ödenmezse, Kurucu kayıt taahhüt sözleşmesini feshedebilir.</li>
        <li>Öğrenim ücreti içinde yemek, servis, kaynak ücretleri ve okul forması bulunmamaktadır. Yaz kursları kurumun kararına göre ücretli veya ücretsiz olup, ücretleri eğitim ücreti içinde değildir.</li>
        <li>Öğrenci ücreti içinde yurt içi (il içi, il dışı) ve yurt dışı seyahat masrafları bulunmamaktadır.</li>
        <li>Öğrenci kayıt olduktan sonra okul kurallarına uymazsa, okul yönetiminin talebi üzerine kayıt sözleşmesi feshedilebilir ve kayıt başka okula nakledilebilir.</li>
        <li>Öğrenci velisi, kurumun mal ve demirbaşlarına verilen zararlardan sorumludur. Zararlar fatura ile veliye bildirilir.</li>
        <li>Sözleşme imzalayan öğrencinin sözleşme feshi durumunda ödeme şartları: Belirlenen ücretin %10'u (Özel Öğretim Kurumları Kanunu 56. madde) ödenir. Öğrenci eğitime başlamışsa, resmi öğrenim ücretinin %10'u artı Milli Eğitim Bakanlığı Yönergesi'ne göre eğitim süresi (dokuz ay) oranında ödeme yapılır. Ödeme yapılmamışsa okula alacak kaydedilir.</li>
        <li>KDV oranlarındaki aşağı yönlü değişiklikler öğrenci sözleşmesine yansıtılmayacaktır. Vergi veya devlet kaynaklı gelirlerdeki yukarı yönlü değişikliklerin eğitim ücretine eklenme hakkı saklıdır.</li>
        <li>Bu sözleşme 30.06.2026 tarihine kadar geçerlidir. Bu tarihe kadar sözleşme yenileme işlemi tamamlanmazsa, okul yönetimi öğrenci kaydını iptal etme hakkına sahiptir. Sözleşme bitiş tarihine kadar kayıt yenileme yapılmazsa, "yeni öğrenci" statüsünde tamamen yeni sözleşme yapılacaktır.</li>
      </ol>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label"><strong>Okul Kurucusu</strong></div>
        <div style="margin-top: 10px; font-weight: bold;">ABDULKADİR ERDEM</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label"><strong>Öğrenci Velisi</strong></div>
      </div>
    </div>

    <div class="page-break"></div>

    <div class="contract-header">
      <div class="contract-title">ÖDEME TAAHHÜTNAMESİ</div>
    </div>

    <div class="section">
      <div class="field-row">
        <div class="field-label">Öğrenci Adı:</div>
        <div class="field-value">${contractData.contractStudentName || student.firstName + ' ' + student.lastName}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Veli Adı:</div>
        <div class="field-value">${contractData.contractParentName || student.parentName}</div>
      </div>
    </div>

    <div class="terms-section">
      <div class="terms-title">ŞARTLAR:</div>
      <ol class="terms-list">
        <li>Yukarıda belirtilen ücretlerin tamamını, belirlenen tarihlerde ödemeyi taahhüt ederim.</li>
        <li>Ödeme planına uygun olarak taksitlerimi zamanında ödeyeceğim.</li>
        <li>Geciken ödemeler için belirlenen faiz oranını kabul ediyorum.</li>
        <li>Bu taahhütname, eğitim öğretim hizmet sözleşmesinin ayrılmaz bir parçasıdır.</li>
      </ol>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Tarih</div>
      </div>
    </div>

    <div class="page-break"></div>

    <div class="contract-header">
      <div class="contract-title">ÖDEME PLANI TAAHHÜDÜ</div>
    </div>

    <div class="section">
      <div class="field-row">
        <div class="field-label">Öğrenci Adı:</div>
        <div class="field-value">${contractData.contractStudentName || student.firstName + ' ' + student.lastName}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Veli Adı:</div>
        <div class="field-value">${contractData.contractParentName || student.parentName}</div>
      </div>
    </div>

    <div class="terms-section">
      <div class="terms-title">ÖDEME PLANI DETAYLARI:</div>
      <div class="field-row">
        <div class="field-label">Toplam Ücret:</div>
        <div class="field-value">${contractData.studentTotal || '___________'} TL</div>
      </div>
      <div class="field-row">
        <div class="field-label">Peşinat:</div>
        <div class="field-value">${contractData.downPayment || '___________'} TL</div>
      </div>
      <div class="field-row">
        <div class="field-label">Kalan Tutar:</div>
        <div class="field-value">${contractData.installmentDetails || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Taksit Başlangıç Tarihi:</div>
        <div class="field-value">${contractData.installmentStartDate || '___________'}</div>
      </div>
    </div>

    <div class="terms-section">
      <div class="terms-title">ÖDEME KOŞULLARI:</div>
      <ol class="terms-list">
        <li>Peşinat, kayıt sırasında nakit olarak alınacaktır.</li>
        <li>Taksitler, her ayın belirlenen gününde ödenecektir.</li>
        <li>Geciken ödemeler için günlük %0.5 faiz uygulanacaktır.</li>
        <li>Ödeme planına uyulmaması durumunda sözleşme feshedilebilir.</li>
      </ol>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Tarih</div>
      </div>
    </div>
  `
}

function generateOtherContractsHTML(student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string }, contractTypes: string[], contractData: Record<string, unknown>) {
  let html = ''
  
  if (contractTypes.includes('uniform')) {
    html += generateUniformContractHTML(student, contractData)
  }
  
  if (contractTypes.includes('meal')) {
    html += generateMealContractHTML(student, contractData)
  }
  
  if (contractTypes.includes('book')) {
    html += generateBookContractHTML(student, contractData)
  }
  
  if (contractTypes.includes('service')) {
    html += generateServiceContractHTML(student, contractData)
  }
  
  return html
}

function generateUniformContractHTML(student: { firstName: string; lastName: string; tcNumber: string }, contractData: Record<string, unknown>) {
  return `
    <div class="page-break"></div>
    
    <div class="contract-header">
      <div class="contract-title">FORMA SÖZLEŞMESİ</div>
    </div>

    <div class="section">
      <div class="section-title">ÖĞRENCİ BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Ad Soyad:</div>
        <div class="field-value">${student.firstName} ${student.lastName}</div>
      </div>
      <div class="field-row">
        <div class="field-label">TC Kimlik No:</div>
        <div class="field-value">${student.tcNumber}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">FORMA BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Forma Bedeni:</div>
        <div class="field-value">${contractData.uniformSize || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Forma Ücreti:</div>
        <div class="field-value">${contractData.uniformPrice || '___________'} TL</div>
      </div>
      <div class="field-row">
        <div class="field-label">Teslim Tarihi:</div>
        <div class="field-value">${contractData.uniformDeliveryDate || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Teslim Edilecek Formalar:</div>
        <div class="field-value-large">${Array.isArray(contractData.uniformItems) ? contractData.uniformItems.join(', ') : '___________'}</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Okul Müdürü İmzası</div>
      </div>
    </div>
  `
}

function generateMealContractHTML(student: { firstName: string; lastName: string; tcNumber: string }, contractData: Record<string, unknown>) {
  return `
    <div class="page-break"></div>
    
    <div class="contract-header">
      <div class="contract-title">YEMEK SÖZLEŞMESİ</div>
    </div>

    <div class="section">
      <div class="section-title">ÖĞRENCİ BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Ad Soyad:</div>
        <div class="field-value">${student.firstName} ${student.lastName}</div>
      </div>
      <div class="field-row">
        <div class="field-label">TC Kimlik No:</div>
        <div class="field-value">${student.tcNumber}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">YEMEK BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Ödeme Dönemleri:</div>
        <div class="field-value-large">${Array.isArray(contractData.mealPeriods) ? contractData.mealPeriods.join(', ') : '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Yemek Ücreti:</div>
        <div class="field-value">${contractData.mealPrice || '___________'} TL</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Okul Müdürü İmzası</div>
      </div>
    </div>
  `
}

function generateBookContractHTML(student: { firstName: string; lastName: string; tcNumber: string; grade: string }, contractData: Record<string, unknown>) {
  return `
    <div class="page-break"></div>
    
    <div class="contract-header">
      <div class="contract-title">KİTAP SÖZLEŞMESİ</div>
    </div>

    <div class="section">
      <div class="section-title">ÖĞRENCİ BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Ad Soyad:</div>
        <div class="field-value">${student.firstName} ${student.lastName}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Sınıfı:</div>
        <div class="field-value">${student.grade}</div>
      </div>
      <div class="field-row">
        <div class="field-label">TC Kimlik No:</div>
        <div class="field-value">${student.tcNumber}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">KİTAP BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Kitap Seti:</div>
        <div class="field-value">${contractData.bookSet || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Teslim Tarihi:</div>
        <div class="field-value">${contractData.bookDeliveryDate || '___________'}</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Okul Müdürü İmzası</div>
      </div>
    </div>
  `
}

function generateServiceContractHTML(student: { firstName: string; lastName: string; tcNumber: string; address: string }, contractData: Record<string, unknown>) {
  return `
    <div class="page-break"></div>
    
    <div class="contract-header">
      <div class="contract-title">SERVİS SÖZLEŞMESİ</div>
    </div>

    <div class="section">
      <div class="section-title">ÖĞRENCİ BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Ad Soyad:</div>
        <div class="field-value">${student.firstName} ${student.lastName}</div>
      </div>
      <div class="field-row">
        <div class="field-label">TC Kimlik No:</div>
        <div class="field-value">${student.tcNumber}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">SERVİS BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Servis Bölgesi:</div>
        <div class="field-value">${contractData.serviceRegion || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Adres:</div>
        <div class="field-value-large">${student.address || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Servis Ücreti (Dönemlik):</div>
        <div class="field-value">${contractData.servicePrice || '___________'} TL</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Okul Müdürü İmzası</div>
      </div>
    </div>
  `
}