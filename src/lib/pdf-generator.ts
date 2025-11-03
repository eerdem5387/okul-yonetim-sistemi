import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// Türkçe karakterleri HTML entity'lere çevir
function encodeHTMLEntities(text: string): string {
  const entityMap: Record<string, string> = {
    'Ç': '&#199;', 'ç': '&#231;',
    'Ğ': '&#286;', 'ğ': '&#287;',
    'İ': '&#304;', 'ı': '&#305;',
    'Ö': '&#214;', 'ö': '&#246;',
    'Ş': '&#350;', 'ş': '&#351;',
    'Ü': '&#220;', 'ü': '&#252;',
    'â': '&#226;', 'Â': '&#194;',
    'î': '&#238;', 'Î': '&#206;',
    'û': '&#251;', 'Û': '&#219;'
  }

  return text.replace(/[ÇçĞğİıÖöŞşÜüâÂîÎûÛ]/g, (char) => entityMap[char] || char)
}

export async function generatePDF(html: string, options?: { format?: string; margin?: Record<string, string> }) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })

  const page = await browser.newPage()

  // Türkçe karakterleri HTML entity'lere çevir
  const encodedHTML = encodeHTMLEntities(html)

  // HTML'i setContent ile yükle
  await page.setContent(encodedHTML, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    format: (options?.format || 'A4') as 'A4',
    margin: options?.margin || {
      top: '10mm',
      right: '15mm',
      bottom: '10mm',
      left: '15mm'
    }
  })

  await browser.close()
  return pdf
}

// TL format helper (binlik ayraçlı)
function formatTL(value: unknown): string {
  const num = typeof value === 'string' ? Number(value) : (typeof value === 'number' ? value : NaN)
  if (!isFinite(num)) return '___________'
  return new Intl.NumberFormat('tr-TR').format(num)
}

// YYYY-MM → Türkçe "Ay YYYY"
function monthLabelTR(yyyyMm: string): string {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || ''
  const [y, m] = yyyyMm.split('-').map(Number)
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  const idx = Math.max(1, Math.min(12, m)) - 1
  return `${months[idx]} ${y}`
}

// Installments table renderer
function renderInstallmentsTable(installments: unknown): string {
  if (!Array.isArray(installments) || installments.length === 0) return ''
  type Item = { month?: string; label?: string; amount?: unknown }
  const items: Item[] = installments as Item[]
  const rows = items.map((it) => {
    const label = it.label || (it.month ? monthLabelTR(it.month) : '')
    return `
      <tr>
        <td>${label || '—'}</td>
        <td>${formatTL(it.amount)} TL</td>
      </tr>
    `
  }).join('')
  const total = items.reduce((acc, it) => {
    const n = typeof it.amount === 'string' ? Number(it.amount) : (typeof it.amount === 'number' ? it.amount : 0)
    return acc + (isFinite(n) ? n : 0)
  }, 0)
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Ay</th>
          <th>Tutar (TL)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="font-weight:bold;">
          <td>Toplam Taksit Tutarı</td>
          <td>${formatTL(total)} TL</td>
        </tr>
      </tbody>
    </table>
  `
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
  student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string; birthDate: string; motherName: string; motherTc: string; motherPhone: string; motherAddress: string; motherOccupation: string; fatherName: string; fatherTc: string; fatherPhone: string; fatherAddress: string; fatherOccupation: string }
  contractTypes: string[]
  mainContractData: Record<string, unknown>
  otherContractData: Record<string, unknown>
  selectedClubs?: { id: string; name: string }[]
}) {
  const { student, contractTypes, mainContractData, otherContractData, selectedClubs } = data

  // Ana sözleşme HTML'i (Eğitim Öğretim Hizmet Sözleşmesi)
  const mainContractHTML = generateMainContractHTML(student, mainContractData)

  // Diğer sözleşmeler HTML'i
  const otherContractsHTML = generateOtherContractsHTML(student, contractTypes, otherContractData)

  // Kulüp seçimleri HTML'i
  const clubsHTML = selectedClubs && selectedClubs.length > 0 ? generateClubSelectionsHTML(student, selectedClubs) : ''

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
                line-height: 1.5;
                margin: 0;
                padding: 15px;
                color: #000;
                font-size: 13px;
            }
            .page-break {
                page-break-before: always;
            }
            .contract-header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 2px solid #000;
                padding-bottom: 8px;
            }
            .contract-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
                text-transform: uppercase;
            }
            .contract-subtitle {
                font-size: 15px;
                font-weight: bold;
                margin-bottom: 8px;
            }
            .contract-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                font-size: 12px;
            }
            .section {
                margin-bottom: 12px;
            }
            .section-title {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 8px;
                text-decoration: underline;
            }
            .field-row {
                display: flex;
                margin-bottom: 7px;
                align-items: center;
            }
            .field-label {
                font-weight: bold;
                min-width: 120px;
                margin-right: 10px;
                font-size: 12px;
            }
            .field-value {
                flex: 1;
                border-bottom: 1px solid #000;
                min-height: 22px;
                padding: 3px 5px;
                font-size: 12px;
            }
            .field-value-large {
                flex: 1;
                border-bottom: 1px solid #000;
                min-height: 40px;
                padding: 3px 5px;
                font-size: 12px;
            }
            .table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
            }
            .table th, .table td {
                border: 1px solid #000;
                padding: 6px;
                text-align: center;
                font-size: 12px;
            }
            .table th {
                background-color: #f0f0f0;
                font-weight: bold;
            }
            .signature-section {
                margin-top: 25px;
                display: flex;
                justify-content: space-between;
            }
            .signature-box {
                width: 200px;
                text-align: center;
            }
            .signature-line {
                border-bottom: 1px solid #000;
                height: 50px;
                margin-bottom: 5px;
            }
            .signature-label {
                font-size: 11px;
                font-weight: bold;
            }
            .terms-section {
                margin-top: 15px;
                font-size: 11px;
                line-height: 1.4;
            }
            .terms-title {
                font-weight: bold;
                margin-bottom: 8px;
                text-decoration: underline;
                font-size: 12px;
            }
            .terms-list {
                margin-left: 20px;
            }
            .terms-list li {
                margin-bottom: 6px;
            }
            .checkbox-section {
                display: flex;
                align-items: center;
                margin-bottom: 6px;
            }
            .checkbox {
                width: 16px;
                height: 16px;
                border: 1px solid #000;
                margin-right: 10px;
                display: inline-block;
            }
            .checkbox.checked {
                background-color: #000;
            }
            .footer {
                margin-top: 25px;
                text-align: center;
                font-size: 11px;
                color: #666;
            }
        </style>
    </head>
    <body>
        ${mainContractHTML}
        ${otherContractsHTML}
        ${clubsHTML}
        
        <div class="footer">
            <p>Bu sözleşmeler elektronik ortamda oluşturulmuş olup, yasal geçerliliği vardır.</p>
        </div>
    </body>
    </html>
  `
}

function generateMainContractHTML(student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string; birthDate: string; motherName: string; motherTc: string; motherPhone: string; motherAddress: string; motherOccupation: string; fatherName: string; fatherTc: string; fatherPhone: string; fatherAddress: string; fatherOccupation: string }, contractData: Record<string, unknown>) {
  return `
    <div class="contract-header">
      <div class="contract-title">EĞİTİM ÖĞRETİM HİZMET SÖZLEŞMESİ</div>
      <div class="contract-subtitle">2024-2025 ÖĞRETİM YILI</div>
    </div>

    <div class="contract-info">
      <div><strong>Okul Ruhsat No:</strong> ${contractData.schoolLicenseNo || '___________'}</div>
      <div><strong>Sözleşme No:</strong> ${contractData.contractNo || '___________'}</div>
      <div><strong>Sorumlu:</strong> ${contractData.registrationResponsible || '___________'}</div>
      <div><strong>Tarih:</strong> ${contractData.registrationDate || '___________'}</div>
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
            <th>İLAN EDİLEN (KDV Dahil)</th>
            <th>ÖĞRENCİ İÇİN (KDV Dahil)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Öğrenim Ücreti</td>
            <td>${contractData.announcedTuitionFee || '0'}</td>
            <td>${contractData.studentTuitionFee || '0'}</td>
          </tr>
          <tr>
            <td>Kıyafet Ücreti</td>
            <td>${contractData.announcedClothingFee || '0'}</td>
            <td>${contractData.studentClothingFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 15px;">Takviye Kursu</td>
            <td>${contractData.announcedCourseFee || '0'}</td>
            <td>${contractData.studentCourseFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 15px;">Kitap</td>
            <td>${contractData.announcedBookFee || '0'}</td>
            <td>${contractData.studentBookFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 15px;">Kırtasiye</td>
            <td>${contractData.announcedStationeryFee || '0'}</td>
            <td>${contractData.studentStationeryFee || '0'}</td>
          </tr>
          <tr>
            <td style="padding-left: 15px;">Etüt</td>
            <td>${contractData.announcedStudyHallFee || '0'}</td>
            <td>${contractData.studentStudyHallFee || '0'}</td>
          </tr>
          <tr style="font-weight: bold;">
            <td>TOPLAM</td>
            <td>${contractData.announcedTotal || '0'}</td>
            <td>${contractData.studentTotal || '0'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="display: flex; gap: 15px; margin-bottom: 12px;">
      <div style="flex: 1;">
        <div class="section-title">ÖDEME PLANI</div>
        <div class="field-row">
          <div class="field-label" style="min-width: 110px;">Taksit Başlangıç:</div>
          <div class="field-value">${contractData.installmentStartDate || '___________'}</div>
        </div>
        <div class="field-row">
          <div class="field-label" style="min-width: 110px;">Peşinat:</div>
          <div class="field-value">${contractData.downPayment || '___________'}</div>
        </div>
        <div class="field-row">
          <div class="field-label" style="min-width: 110px;">Taksit Detayı:</div>
          <div class="field-value">${contractData.installmentDetails || '___________'}</div>
        </div>
        <div class="field-row">
          <div class="field-label" style="min-width: 110px;">Başarı İndirimi:</div>
          <div class="field-value">${contractData.achievementDiscountRate || '___________'} ${contractData.achievementDiscountType === 'percentage' ? '%' : ''}</div>
        </div>
      </div>
      
      <div style="flex: 1;">
        <div class="section-title">İNDİRİMLER</div>
        <div class="checkbox-section">
          <div class="checkbox ${contractData.siblingDiscount ? 'checked' : ''}"></div>
          <span>Kardeş İndirimi</span>
        </div>
        <div class="checkbox-section">
          <div class="checkbox ${contractData.staffChildDiscount ? 'checked' : ''}"></div>
          <span>Personel Çocuğu</span>
        </div>
        <div class="checkbox-section">
          <div class="checkbox ${contractData.corporateDiscount ? 'checked' : ''}"></div>
          <span>Kurumsal</span>
        </div>
        <div class="checkbox-section">
          <div class="checkbox ${contractData.martyrVeteranDiscount ? 'checked' : ''}"></div>
          <span>Şehit/Gazi</span>
        </div>
        <div class="checkbox-section">
          <div class="checkbox ${contractData.teacherChildDiscount ? 'checked' : ''}"></div>
          <span>Öğretmen Çocuğu</span>
        </div>
        <div class="checkbox-section">
          <div class="checkbox ${contractData.achievementDiscount ? 'checked' : ''}"></div>
          <span>Başarı İndirimi</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="field-row">
        <div class="field-label">Diğer İndirimler:</div>
        <div class="field-value">${contractData.otherDiscountDescription || '___________'}</div>
      </div>
    </div>

    <div style="display: flex; gap: 15px; margin-bottom: 12px;">
      <div style="flex: 1;">
        <div class="field-row">
          <div class="field-label">Tarih:</div>
          <div class="field-value">${contractData.contractDate || '___________'}</div>
        </div>
      </div>
      <div style="flex: 1;">
        <div class="field-row">
          <div class="field-label">Kaydı Yapan:</div>
          <div class="field-value">${contractData.registrarName || '___________'}</div>
        </div>
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
        <li>Kurum, bir sonraki yılın eğitim ve öğretim ücretleri ile diğer ücretleri (takviye kursları, yemek, servis, kıyafet, kırtasiye, yurt vb.) Ocak ayından Mayıs ayı sonuna kadar duyurur.</li>
        <li>Okulun ara sınıflarının eğitim ücretleri, Milli Eğitim Bakanlığı mevzuatına göre belirlenir.</li>
        <li>Sözleşmesi sona eren velinin fiyatlandırması, yeni kayıt olan öğrenci fiyatı üzerinden yapılır.</li>
        <li>Kurumun eğitim ve öğretim ücretleri, kurum adına açılan ve valiliğe bildirilen banka hesabına yatırılarak tahsil edilir.</li>
        <li>Kurum, iş takviminde belirtilen süre içinde ücretlerini ödemeyen öğrencilerin kayıtlarını yenilememe hakkını saklı tutar.</li>
        <li>Yenileme dönemlerinde kayıtlarını yenilemeyen öğrenciler, e-okul sistemindeki öğrenci ücretleri üzerinden fiyatlandırılır.</li>
        <li>Bu sözleşme ile kaydı garanti edilen öğrencinin daha önce gizlenen okul disiplin cezası olduğu tespit edilirse bu sözleşme geçersiz sayılır.</li>
        <li>Öğrencilerin önceki öğretim dönemlerinde sınıf tekrarı yaptığı veya aşırı devamsızlık yaptığı tespit edilirse, Kurucu kayıt sözleşmesini feshedebilir.</li>
        <li>İlk taksit veya iki taksit üst üste zamanında ödenmezse, Kurucu kayıt taahhüt sözleşmesini feshedebilir.</li>
        <li>Öğrenim ücreti içinde yemek, servis, kaynak ücretleri ve okul forması bulunmamaktadır.</li>
        <li>Öğrenci ücreti içinde yurt içi ve yurt dışı seyahat masrafları bulunmamaktadır.</li>
        <li>Öğrenci kayıt olduktan sonra okul kurallarına uymazsa, okul yönetiminin talebi üzerine kayıt sözleşmesi feshedilebilir.</li>
        <li>Öğrenci velisi, kurumun mal ve demirbaşlarına verilen zararlardan sorumludur.</li>
        <li>Sözleşme imzalayan öğrencinin sözleşme feshi durumunda ödeme şartları: Belirlenen ücretin %10'u ödenir.</li>
        <li>KDV oranlarındaki aşağı yönlü değişiklikler öğrenci sözleşmesine yansıtılmayacaktır.</li>
        <li>Bu sözleşme 30.06.2026 tarihine kadar geçerlidir.</li>
      </ol>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label"><strong>Okul Kurucusu</strong></div>
        <div style="margin-top: 5px; font-weight: bold;">ABDULKADİR ERDEM</div>
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
      <div style="display:flex; gap: 20px;">
        <div style="flex:1;">
          <div class="section-title" style="text-decoration:none; margin-bottom:6px;">Öğrenci Anne Bilgileri</div>
          <div class="field-row"><div class="field-label">Ad Soyad:</div><div class="field-value">${student.motherName || ''}</div></div>
          <div class="field-row"><div class="field-label">TC:</div><div class="field-value">${student.motherTc || ''}</div></div>
          <div class="field-row"><div class="field-label">Telefon:</div><div class="field-value">${student.motherPhone || ''}</div></div>
          <div class="field-row"><div class="field-label">Adres:</div><div class="field-value">${student.motherAddress || ''}</div></div>
          <div class="field-row"><div class="field-label">Meslek:</div><div class="field-value">${student.motherOccupation || ''}</div></div>
        </div>
        <div style="flex:1;">
          <div class="section-title" style="text-decoration:none; margin-bottom:6px;">Öğrenci Baba Bilgileri</div>
          <div class="field-row"><div class="field-label">Ad Soyad:</div><div class="field-value">${student.fatherName || ''}</div></div>
          <div class="field-row"><div class="field-label">TC:</div><div class="field-value">${student.fatherTc || ''}</div></div>
          <div class="field-row"><div class="field-label">Telefon:</div><div class="field-value">${student.fatherPhone || ''}</div></div>
          <div class="field-row"><div class="field-label">Adres:</div><div class="field-value">${student.fatherAddress || ''}</div></div>
          <div class="field-row"><div class="field-label">Meslek:</div><div class="field-value">${student.fatherOccupation || ''}</div></div>
        </div>
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

    <div class="signature-section" style="margin-bottom: 20px;">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Veli İmzası</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Tarih</div>
      </div>
    </div>

    <div style="border-top: 2px solid #000; margin: 20px 0; padding-top: 15px;">
      <div class="contract-header" style="border-bottom: none; padding-bottom: 5px;">
        <div class="contract-title">ÖDEME PLANI TAAHHÜDÜ</div>
      </div>

      <div class="section">
        <div class="field-row">
          <div class="field-label">Öğrenci Adı:</div>
          <div class="field-value">${contractData.contractStudentName || student.firstName + ' ' + student.lastName}</div>
        </div>
        <div style="display:flex; gap: 20px;">
          <div style="flex:1;">
            <div class="section-title" style="text-decoration:none; margin-bottom:6px;">Öğrenci Anne Bilgileri</div>
            <div class="field-row"><div class="field-label">Ad Soyad:</div><div class="field-value">${student.motherName || ''}</div></div>
            <div class="field-row"><div class="field-label">TC:</div><div class="field-value">${student.motherTc || ''}</div></div>
            <div class="field-row"><div class="field-label">Telefon:</div><div class="field-value">${student.motherPhone || ''}</div></div>
          </div>
          <div style="flex:1;">
            <div class="section-title" style="text-decoration:none; margin-bottom:6px;">Öğrenci Baba Bilgileri</div>
            <div class="field-row"><div class="field-label">Ad Soyad:</div><div class="field-value">${student.fatherName || ''}</div></div>
            <div class="field-row"><div class="field-label">TC:</div><div class="field-value">${student.fatherTc || ''}</div></div>
            <div class="field-row"><div class="field-label">Telefon:</div><div class="field-value">${student.fatherPhone || ''}</div></div>
          </div>
        </div>
      </div>

      <div class="terms-section">
        <div class="terms-title">ÖDEME PLANI DETAYLARI:</div>
        <div class="field-row">
          <div class="field-label">Toplam Ücret:</div>
          <div class="field-value">${formatTL(contractData.studentTotal)} TL</div>
        </div>
        <div class="field-row">
          <div class="field-label">Peşinat:</div>
          <div class="field-value">${formatTL(contractData.downPayment)} TL</div>
        </div>
        <div class="field-row">
          <div class="field-label">Taksit Başlangıç:</div>
          <div class="field-value">${contractData.installmentStartDate || '___________'}</div>
        </div>
        ${renderInstallmentsTable(contractData.installments)}
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
    </div>
  `
}

function generateOtherContractsHTML(student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string }, contractTypes: string[], contractData: Record<string, unknown>) {
  let html = ''

  // Forma + Yemek tek sayfada
  const hasUniform = contractTypes.includes('uniform')
  const hasMeal = contractTypes.includes('meal')

  if (hasUniform || hasMeal) {
    html += '<div class="page-break"></div>'

    if (hasUniform) {
      html += generateUniformContractHTML(student, contractData, !hasMeal) // Compact if meal is also present
    }

    if (hasMeal) {
      html += generateMealContractHTML(student, contractData, hasUniform) // Add separator if uniform is present
    }
  }

  // Kitap + Servis tek sayfada
  const hasBook = contractTypes.includes('book')
  const hasService = contractTypes.includes('service')

  if (hasBook || hasService) {
    html += '<div class="page-break"></div>'

    if (hasBook) {
      html += generateBookContractHTML(student, contractData, !hasService) // Compact if service is also present
    }

    if (hasService) {
      html += generateServiceContractHTML(student, contractData, hasBook) // Add separator if book is present
    }
  }

  return html
}

function generateUniformContractHTML(student: { firstName: string; lastName: string; tcNumber: string }, contractData: Record<string, unknown>, standalone = true) {
  return `
    ${!standalone ? '<div style="border-top: 2px dashed #000; margin: 20px 0; padding-top: 20px;">' : ''}
    
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
        <div class="field-label">Teslim Edilecek:</div>
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
    
    ${!standalone ? '</div>' : ''}
  `
}

function generateMealContractHTML(student: { firstName: string; lastName: string; tcNumber: string }, contractData: Record<string, unknown>, hasSeparator = false) {
  return `
    ${hasSeparator ? '<div style="border-top: 2px dashed #000; margin: 20px 0; padding-top: 20px;">' : ''}
    
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
    
    ${hasSeparator ? '</div>' : ''}
  `
}

function generateBookContractHTML(student: { firstName: string; lastName: string; tcNumber: string; grade: string }, contractData: Record<string, unknown>, standalone = true) {
  return `
    ${!standalone ? '<div style="border-top: 2px dashed #000; margin: 20px 0; padding-top: 20px;">' : ''}
    
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
    
    ${!standalone ? '</div>' : ''}
  `
}

function generateServiceContractHTML(student: { firstName: string; lastName: string; tcNumber: string; address: string }, contractData: Record<string, unknown>, hasSeparator = false) {
  return `
    ${hasSeparator ? '<div style="border-top: 2px dashed #000; margin: 20px 0; padding-top: 20px;">' : ''}
    
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
    
    ${hasSeparator ? '</div>' : ''}
  `
}

function generateClubSelectionsHTML(student: { firstName: string; lastName: string; tcNumber: string }, clubs: { id: string; name: string }[]) {
  const clubsList = clubs.map((club, index) => `
    <div class="field-row">
      <div class="field-label">${index + 1}. Kulüp:</div>
      <div class="field-value">${club.name}</div>
    </div>
  `).join('')

  return `
    <div class="page-break"></div>
    
    <div class="contract-header">
      <div class="contract-title">KULÜP SEÇİM FORMU</div>
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
      <div class="section-title">SEÇİLEN KULÜPLER</div>
      ${clubsList}
    </div>

    <div class="terms-section">
      <div class="terms-title">BİLGİLENDİRME:</div>
      <ol class="terms-list">
        <li>Öğrenci yukarıda belirtilen kulüplere kayıt olmuştur.</li>
        <li>Kulüp faaliyetleri eğitim-öğretim yılı boyunca devam eder.</li>
        <li>Öğrenci kulüp faaliyetlerine katılmakla yükümlüdür.</li>
        <li>Kulüp değişikliği okul yönetiminin onayı ile yapılabilir.</li>
      </ol>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Öğrenci İmzası</div>
      </div>
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