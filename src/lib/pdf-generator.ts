import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/** Yerel geliştirme için Chrome/Chromium yolu (macOS / Linux). Production'da @sparticuz/chromium kullanılır. */
function getLocalChromePath(): string | undefined {
  if (process.platform === 'darwin') {
    const paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      join(process.env.HOME || '', 'Applications', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    ]
    for (const p of paths) {
      if (p && existsSync(p)) return p
    }
  }
  if (process.platform === 'linux') {
    const paths = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    for (const p of paths) {
      if (p && existsSync(p)) return p
    }
  }
  return undefined
}

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

// HTML escape fonksiyonu (XSS koruması)
function escapeHTML(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Sözleşme PDF'lerinde öğrenci adresi — contractData veya öğrenci kaydından */
export function resolveStudentAddress(
  contractData: Record<string, unknown>,
  student?: { address?: string | null }
): string {
  const fromContract = contractData.address ?? contractData.studentAddress
  if (fromContract != null && String(fromContract).trim() !== "") {
    return String(fromContract).trim()
  }
  if (student?.address?.trim()) return student.address.trim()
  return ""
}

/** Sözleşme PDF'lerinde sabit varsayılan yıl yerine kayıtlı etiket; yoksa anlaşılır yer tutucu. */
export function pdfAcademicYearLabel(contractData: Record<string, unknown>): string {
  const y = contractData.academicYear
  if (y != null && String(y).trim() !== '') return String(y).trim()
  const name = contractData.academicYearName
  if (name != null && String(name).trim() !== '') return String(name).trim()
  return '—'
}

let schoolLogoDataUriCache: string | null = null

function getSchoolLogoDataUri(): string | null {
  if (schoolLogoDataUriCache !== null) return schoolLogoDataUriCache
  try {
    const logoPath = join(process.cwd(), 'public', 'logo.png')
    if (!existsSync(logoPath)) {
      schoolLogoDataUriCache = ''
      return null
    }
    const b64 = readFileSync(logoPath).toString('base64')
    schoolLogoDataUriCache = `data:image/png;base64,${b64}`
    return schoolLogoDataUriCache
  } catch {
    schoolLogoDataUriCache = ''
    return null
  }
}

function injectGlobalPdfLogo(html: string): string {
  const logoUri = getSchoolLogoDataUri()
  if (!logoUri) return html

  const logoOverlay = `
<style id="global-pdf-logo-style">
.global-pdf-logo {
  position: fixed;
  top: 14px;
  right: 18px;
  width: 84px;
  max-height: 84px;
  object-fit: contain;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.95;
}
</style>
<img class="global-pdf-logo" src="${logoUri}" alt="Levent Okulları logo" />
`

  // Şablonda body varsa logoyu global overlay olarak body başlangıcına ekle.
  const bodyOpenRegex = /<body[^>]*>/i
  if (bodyOpenRegex.test(html)) {
    return html.replace(bodyOpenRegex, (m) => `${m}\n${logoOverlay}`)
  }
  return `${logoOverlay}\n${html}`
}

function normalizeTemplateLogoSources(html: string): string {
  const logoUri = getSchoolLogoDataUri()
  if (!logoUri) return html
  return html
    .replace(/src="\/logo\.png"/g, `src="${logoUri}"`)
    .replace(/src='\/logo\.png'/g, `src='${logoUri}'`)
}

export async function generatePDF(
  html: string,
  options?: {
    format?: string
    landscape?: boolean
    margin?: Record<string, string>
    /**
     * Müfredat PDF gibi şablonlarda sağ üstte her sayfaya basılan global overlay logoyu
     * kapatmak için kullanılır.
     */
    disableGlobalLogo?: boolean
  }
) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  let browser: Awaited<ReturnType<typeof puppeteer.launch>>

  if (isProduction) {
    // Reduces memory on Vercel; required for stable @sparticuz/chromium runs
    chromium.setGraphicsMode = false
    browser = await puppeteer.launch({
      args: [...chromium.args, '--disable-dev-shm-usage', '--disable-gpu'],
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } else {
    const localChrome = getLocalChromePath()
    if (localChrome) {
      browser = await puppeteer.launch({
        executablePath: localChrome,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
    } else {
      try {
        browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        })
      } catch {
        throw new Error(
          'PDF oluşturmak için yerelde Google Chrome yüklü olmalı (Applications içinde). Vercel’de otomatik çalışır.'
        )
      }
    }
  }

  const page = await browser.newPage()

  const normalizedLogoHtml = normalizeTemplateLogoSources(html)
  const htmlWithLogo = options?.disableGlobalLogo ? normalizedLogoHtml : injectGlobalPdfLogo(normalizedLogoHtml)
  const encodedHTML = encodeHTMLEntities(htmlWithLogo)
  // networkidle0 often times out on Vercel (Google Fonts @import keeps connections open)
  await page.setContent(encodedHTML, { waitUntil: 'load', timeout: 45_000 })

  const pdf = await page.pdf({
    format: (options?.format || 'A4') as 'A4',
    landscape: options?.landscape ?? false,
    margin: options?.margin || {
      top: '10mm',
      right: '15mm',
      bottom: '10mm',
      left: '15mm',
    },
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
            ${(() => {
              const addr = resolveStudentAddress(contractData)
              return addr
                ? `<div class="field">
                <div class="field-label">Adres:</div>
                <div class="field-value">${addr}</div>
            </div>`
                : ''
            })()}
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
            <div class="field-value">${pdfAcademicYearLabel(contractData)}</div>
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
            <div class="field-value">${pdfAcademicYearLabel(contractData)}</div>
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
    default:
      return ''
  }
}

export function generateCombinedContractHTML(data: {
  student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string; birthDate: string; motherName: string; motherTc: string; motherPhone: string; motherAddress: string; motherOccupation: string; fatherName: string; fatherTc: string; fatherPhone: string; fatherAddress: string; fatherOccupation: string }
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
        <div class="footer">
            <p>Bu sözleşmeler elektronik ortamda oluşturulmuş olup, yasal geçerliliği vardır.</p>
        </div>
    </body>
    </html>
  `
}

function generateMainContractHTML(student: { firstName: string; lastName: string; tcNumber: string; grade: string; address: string; birthDate: string; motherName: string; motherTc: string; motherPhone: string; motherAddress: string; motherOccupation: string; fatherName: string; fatherTc: string; fatherPhone: string; fatherAddress: string; fatherOccupation: string }, contractData: Record<string, unknown>) {
  const ayLabel = pdfAcademicYearLabel(contractData)
  const studentAddress = resolveStudentAddress(contractData, student)
  return `
    <div class="contract-header">
      <div class="contract-title">EĞİTİM ÖĞRETİM HİZMET SÖZLEŞMESİ</div>
      <div class="contract-subtitle">${ayLabel} ÖĞRETİM YILI</div>
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
      <div class="field-row">
        <div class="field-label">Adres:</div>
        <div class="field-value-large">${studentAddress || '___________'}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">ÖDEME BİLGİLERİ (${ayLabel} Öğretim Yılı İçin)</div>
      <table class="table">
        <thead>
          <tr>
            <th>ÜCRET TÜRÜ</th>
            <th>Meb'in Belirlediği Ücret (KDV Dahil)</th>
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

    ${contractData.paymentPlan ? `
    <div class="section" style="margin-top: 20px;">
      <div class="section-title">ÖDEME PLANI</div>
      <div class="field-row">
        <div class="field-label" style="min-width: 150px;">Seçilen Ödeme Planı:</div>
        <div class="field-value" style="font-weight: bold;">${contractData.paymentPlan}</div>
      </div>
    </div>
    ` : ''}
    
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

    ${contractData.registrationDate || contractData.paymentDueDate ? `
    <div class="section" style="margin-top: 20px; padding: 15px; background-color: #fff9e6; border: 2px solid #000000;">
      <div class="section-title" style="color: #000000;">BORÇ MUACCELİYET TARİHİ</div>
      <div class="field-row">
        <div class="field-label">Kayıt İşleminin Gerçekleştirildiği Tarih:</div>
        <div class="field-value">${contractData.registrationDate || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Ödemenin Yapılması Gereken Son Tarih:</div>
        <div class="field-value">${contractData.paymentDueDate || '___________'}</div>
      </div>
      <div style="margin-top: 15px; padding: 10px; background-color: #fff3cd; border-left: 4px solid #000000;">
        <p style="margin: 0; font-weight: bold; color: #000000; font-size: 12px;">
          MUACCELİYET TARİHİ SONRASI AYLIK GECİKME ZAMMI ORANI % 3,02 OLARAK UYGULANACAKTIR.
        </p>
      </div>
    </div>
    ` : ''}

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
        <div class="signature-label"><strong>Öğrenci Velisi</strong></div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label"><strong>Okul Kurucusu</strong></div>
        <div style="margin-top: 5px; font-weight: bold;">ABDULKADİR ERDEM</div>
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
        <div class="field-label">Öğrenci için belirlenen ücret:</div>
        <div class="field-value">${formatTL(contractData.studentTotal ?? contractData.studentTuitionFee)} TL</div>
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

    <div class="page-break"></div>
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

    <div class="page-break"></div>

    <div class="contract-header">
      <div class="contract-title">RİZE LEVENT OKULLARI</div>
      <div class="contract-title" style="font-size: 18px; margin-top: 10px;">EĞİTİM ÖĞRETİM ÜCRETLERİ MUTABAKAT BELGESİ</div>
    </div>

    <div class="section" style="margin-top: 20px;">
      <p style="text-align: justify; line-height: 1.8; margin-bottom: 15px;">
        Aşağıda bilgileri beyan edilen öğrenciye ait ${pdfAcademicYearLabel(contractData)} eğitim öğretim dönemine ait ücretler, tabloda belirtilen tarihte muaccel olacaktır. Bu tarihten sonra muaccel borç için Maliye Bakanlığı'nın ilan ettiği aylık gecikme zammı oranı ile güncelleştirilecektir.
      </p>
      <p style="text-align: justify; line-height: 1.8; margin-bottom: 15px;">
        Öğrenci Eğitim Öğretim Ücreti, sözleşme yenileme tarihinde belirlenir. Ücretin sözleşmede belirtilen şekilde Son ödeme tarihine kadar ödenmesi gereklidir.
      </p>
      <p style="text-align: justify; line-height: 1.8; margin-bottom: 20px;">
        Bu tarihten itibaren ödeme, gecikmiş borç hükmüyle, ay olarak gecikme süresi kadar temerrüt faizi eklenecek olup, tahsilatta temerrüde dair, 3095 Sayılı Kanun hükümleri uygulanacaktır.
      </p>
    </div>

    <div class="section" style="margin-top: 30px;">
      <div style="text-align: right; margin-bottom: 30px;">
        <div style="font-weight: bold; margin-bottom: 5px;">AKEM EĞT ÖĞRT LTD ŞTİ ADINA</div>
        <div style="font-weight: bold; margin-bottom: 5px;">Şirket Müdürü</div>
        <div style="font-weight: bold;">Emin Usta</div>
      </div>
    </div>

    <div class="section" style="margin-top: 40px;">
      <div class="field-row">
        <div class="field-label" style="min-width: 200px;">Öğrenci Ad Soyad:</div>
        <div class="field-value" style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 300px;">${contractData.studentName || student.firstName + ' ' + student.lastName}</div>
      </div>
      <div class="field-row" style="margin-top: 15px;">
        <div class="field-label" style="min-width: 200px;">Velisinin Adı Soyadı:</div>
        <div class="field-value" style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 300px;">${contractData.contractParentName || student.fatherName || student.motherName || '___________'}</div>
      </div>
      <div class="field-row" style="margin-top: 15px;">
        <div class="field-label" style="min-width: 200px;">Sınıfı:</div>
        <div class="field-value" style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 300px;">${contractData.studentClass || student.grade}</div>
      </div>
      <div class="field-row" style="margin-top: 15px;">
        <div class="field-label" style="min-width: 200px;">Tc kimlik no:</div>
        <div class="field-value" style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 300px;">${contractData.studentTC || student.tcNumber}</div>
      </div>
      <div class="field-row" style="margin-top: 15px;">
        <div class="field-label" style="min-width: 200px;">Okul numarası:</div>
        <div class="field-value" style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 300px;">${contractData.contractNo || '___________'}</div>
      </div>
      <div class="field-row" style="margin-top: 15px;">
        <div class="field-label" style="min-width: 200px;">Adresi:</div>
        <div class="field-value" style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 300px;">${studentAddress || '___________'}</div>
      </div>
    </div>

    <div class="section" style="margin-top: 50px;">
      <div style="margin-bottom: 20px;">
        <div style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 400px; display: inline-block;">
          El yazısı ile (Okudum, Anladım)…………………………………………………………………
        </div>
      </div>
      <div class="field-row" style="margin-top: 30px;">
        <div class="field-label" style="min-width: 150px;">Tarih:</div>
        <div class="field-value" style="border-bottom: 1px solid #000; padding-bottom: 5px; min-width: 200px;">${contractData.contractDate || (contractData.registrationDate ? new Date(contractData.registrationDate as string).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR'))}</div>
      </div>
      <div class="signature-section" style="margin-top: 40px;">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Veli İmzası</div>
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
      html += generateUniformContractHTML(
        { ...student, grade: contractData.studentClass as string || student.grade },
        contractData,
        !hasMeal
      ) // Compact if meal is also present
    }

    if (hasMeal) {
      html += generateMealContractHTML(student, contractData, hasUniform) // Add separator if uniform is present
    }
  }


  return html
}

function generateUniformContractHTML(student: { firstName: string; lastName: string; tcNumber: string; grade?: string; address?: string }, contractData: Record<string, unknown>, standalone = true) {
  // Sınıf bazlı kitap ve forma ücret tablosu (TL)
  const bookAndUniformPrices: Record<string, Record<string, number>> = {
    "5. Sınıf": {
      "Şubat": 51348,
      "Mart": 52883,
      "Nisan": 54464,
      "Mayıs": 56093,
      "Haziran": 57770,
      "Temmuz": 59497,
      "Ağustos": 61276,
      "Eylül": 63108,
    },
    "6. Sınıf": {
      "Şubat": 48396,
      "Mart": 49843,
      "Nisan": 51333,
      "Mayıs": 52868,
      "Haziran": 54448,
      "Temmuz": 56076,
      "Ağustos": 57753,
      "Eylül": 59480,
    },
    "7. Sınıf": {
      "Şubat": 48396,
      "Mart": 49843,
      "Nisan": 51333,
      "Mayıs": 52868,
      "Haziran": 54448,
      "Temmuz": 56076,
      "Ağustos": 57753,
      "Eylül": 59480,
    },
    "8. Sınıf": {
      "Şubat": 48396,
      "Mart": 49843,
      "Nisan": 51333,
      "Mayıs": 52868,
      "Haziran": 54448,
      "Temmuz": 56076,
      "Ağustos": 57753,
      "Eylül": 59480,
    },
    "9. Sınıf": {
      "Şubat": 48444,
      "Mart": 49892,
      "Nisan": 51384,
      "Mayıs": 52920,
      "Haziran": 54502,
      "Temmuz": 56132,
      "Ağustos": 57810,
      "Eylül": 59539,
    },
    "10. Sınıf": {
      "Şubat": 45492,
      "Mart": 46852,
      "Nisan": 48253,
      "Mayıs": 49695,
      "Haziran": 51181,
      "Temmuz": 52712,
      "Ağustos": 54288,
      "Eylül": 55911,
    },
    "11. Sınıf": {
      "Şubat": 45492,
      "Mart": 46852,
      "Nisan": 48253,
      "Mayıs": 49695,
      "Haziran": 51181,
      "Temmuz": 52712,
      "Ağustos": 54288,
      "Eylül": 55911,
    },
    "12. Sınıf": {
      "Şubat": 48660,
      "Mart": 50114,
      "Nisan": 51613,
      "Mayıs": 53156,
      "Haziran": 54745,
      "Temmuz": 56382,
      "Ağustos": 58068,
      "Eylül": 59805,
    },
  }

  // Öğrencinin sınıfına göre fiyat tablosunu al
  const getPriceTableForGrade = (grade: string | undefined | null) => {
    if (!grade) return null
    // Sınıf formatını normalize et
    let normalizedGrade = grade
    if (!grade.includes("Sınıf")) {
      const gradeNum = parseInt(grade.replace(/\D/g, ''))
      if (!isNaN(gradeNum) && gradeNum >= 5 && gradeNum <= 12) {
        normalizedGrade = `${gradeNum}. Sınıf`
      }
    }
    return bookAndUniformPrices[normalizedGrade] || null
  }

  const studentGrade = contractData.studentClass || student.grade || ""
  const studentAddress = resolveStudentAddress(contractData, student)
  void getPriceTableForGrade(studentGrade as string) // ileride fiyat tablosu kullanılabilir

  // Ödeme durumu
  const paymentReceived = contractData.paymentReceived === true || contractData.paymentReceived === "true"
  const paymentNotReceived = contractData.paymentNotReceived === true || contractData.paymentNotReceived === "true"

  return `
    ${!standalone ? '<div style="border-top: 2px dashed #000; margin: 20px 0; padding-top: 20px;">' : ''}
    
    <div class="contract-header">
      <div class="contract-title">KİTAP VE FORMA SÖZLEŞMESİ</div>
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
      <div class="field-row">
        <div class="field-label">Sınıf:</div>
        <div class="field-value">${studentGrade || '___________'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Adres:</div>
        <div class="field-value-large">${studentAddress || '___________'}</div>
      </div>
    </div>


    <div class="section">
      <div class="section-title">FORMA BİLGİLERİ</div>
      <div class="field-row">
        <div class="field-label">Forma Bedeni:</div>
        <div class="field-value">${contractData.uniformSize || '___________'}</div>
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

    <div class="section">
      <div class="section-title">ÖDEME DURUMU</div>
      <div class="field-row">
        <div class="field-label">Ödeme Alındı:</div>
        <div class="field-value">${paymentReceived ? '✓' : '☐'}</div>
      </div>
      <div class="field-row">
        <div class="field-label">Ödeme Alınmadı:</div>
        <div class="field-value">${paymentNotReceived ? '✓' : '☐'}</div>
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



/**
 * Sertifika / Katılım / Başarı belgesi HTML (ekran görüntüsü şablonu: kırmızı-altın çerçeve, logo, alanlar).
 * Her öğrenci için ayrı sayfa; alanlar otomatik doldurulur.
 */
export function generateCertificateHTML(data: {
  logoBase64: string
  /** Üst satır: LEVENT COLLEGE IB PROGRAMME */
  programmeLine?: string
  /** Belge başlığı (örn. CERTIFICATE OF LANGUAGE EDUCATION) */
  certificateTitle: string
  /** Sırayla gösterilecek alanlar: etiket + değer */
  fields: Array<{ label: string; value: string }>
  /** Puan/seviye paragrafı (varsa) */
  outcomeParagraph?: string
  /** Dil: 'en' | 'tr' – ek açıklama metni için */
  language?: 'tr' | 'en'
}): string {
  const {
    logoBase64,
    programmeLine = 'LEVENT COLLEGE IB PROGRAMME',
    certificateTitle,
    fields,
    outcomeParagraph,
    language = 'en',
  } = data

  const defaultFooter = language === 'en'
    ? 'Throughout the training process, the participant demonstrated consistent effort, progress, and engagement in all language skills. The evidence of their performance and assessment results is provided in the attached file.'
    : 'Eğitim sürecinde katılımcı tüm dil becerilerinde tutarlı çaba, ilerleme ve katılım gösterdi. Performans ve değerlendirme sonuçlarının kanıtı ekli dosyada sunulmaktadır.'

  const fieldRows = fields.map(
    (f) => `
    <div style="margin-bottom: 10px;">
      <span style="font-weight: 600; font-size: 11px;">${escapeHTML(f.label)}</span>
      <span style="margin-left: 4px; border-bottom: 1px solid #333; padding: 0 6px; font-size: 11px;">${escapeHTML(f.value || '')}</span>
    </div>`
  ).join('')

  return `
  <div style="page-break-after: always;">
    <div style="
      background: linear-gradient(180deg, #1e3a5f 0%, #152a45 100%);
      padding: 24px;
      margin: -20px -15px 0 -15px;
      min-height: 100%;
      box-sizing: border-box;
    ">
      <div style="
        background: #fff;
        border: 4px solid #b71c1c;
        outline: 2px solid #d4af37;
        outline-offset: 2px;
        border-radius: 8px;
        padding: 28px 32px;
        max-width: 100%;
        box-sizing: border-box;
      ">
        <div style="text-align: center; margin-bottom: 16px;">
          <img src="data:image/png;base64,${logoBase64}" alt="Logo" style="max-height: 72px; width: auto;" />
        </div>
        <div style="text-align: center; margin-bottom: 8px;">
          <div style="font-size: 14px; font-weight: bold; color: #1a1a1a; letter-spacing: 0.5px;">${escapeHTML(programmeLine)}</div>
          <div style="font-size: 15px; font-weight: bold; text-transform: uppercase; color: #1a1a1a; margin-top: 4px;">${escapeHTML(certificateTitle)}</div>
        </div>
        <div style="margin-top: 20px; font-size: 11px; color: #333;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px;">
            ${fieldRows}
          </div>
          ${outcomeParagraph ? `
          <div style="margin-top: 18px; padding: 12px 0; line-height: 1.6; font-size: 11px;">
            ${escapeHTML(outcomeParagraph)}
          </div>
          <div style="margin-top: 10px; font-size: 10px; color: #555;">
            ${defaultFooter}
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  </div>
  `
}

/** Müfredat sayfası HTML (logo, program bilgisi tablosu, aylık haftalık tablolar – ekran görüntüsü şablonu) */
export function generateMufredatPageHTML(data: {
  logoBase64: string
  /** İlk sayfada logo göster; diğer sayfalarda kapat. */
  showLogo?: boolean
  programTitle: string
  programmeName?: string
  instructorName?: string
  programmeDurationWeeks?: string
  participantName?: string
  participantTrId?: string
  months: Array<{
    label: string
    rows: Array<{
      week: string
      subject: string
      objective: string
      practice: string
      achievements: string
    }>
  }>
}): string {
  const {
    logoBase64,
    showLogo = true,
    programTitle,
    programmeName = "LEVENT COLLEGE IB",
    instructorName = "",
    programmeDurationWeeks = "40 weeks",
    participantName = "",
    participantTrId = "",
    months,
  } = data

  const monthTables = months
    .map(
      (m) => `
    <tr>
      <td colspan="5" style="padding: 10px; background-color: #e8e8e8; font-weight: bold; text-align: center; border: 1px solid #000;">
        ${escapeHTML(m.label)}
      </td>
    </tr>
    <tr>
      <th style="border: 1px solid #000; padding: 8px; text-align: center;">Week</th>
      <th style="border: 1px solid #000; padding: 8px; text-align: center;">Subject</th>
      <th style="border: 1px solid #000; padding: 8px; text-align: center;">Objective</th>
      <th style="border: 1px solid #000; padding: 8px; text-align: center;">Practice / Assignment</th>
      <th style="border: 1px solid #000; padding: 8px; text-align: center;">Achievements</th>
    </tr>
    ${m.rows
      .map(
        (r) => `
    <tr>
      <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">${escapeHTML(r.week)}</td>
      <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">${escapeHTML(r.subject)}</td>
      <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">${escapeHTML(r.objective)}</td>
      <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">${escapeHTML(r.practice)}</td>
      <td style="border: 1px solid #000; padding: 6px; vertical-align: top;">${escapeHTML(r.achievements)}</td>
    </tr>`
      )
      .join("")}`
    )
    .join("")

  return `
  <div style="page-break-after: always;">
    ${
      showLogo
        ? `<div style="text-align: center; margin-bottom: 16px;">
      <img src="data:image/png;base64,${logoBase64}" alt="Logo" style="max-height: 80px; width: auto;" />
    </div>`
        : ""
    }
    <h1 style="text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 16px;">
      ${escapeHTML(programTitle)}
    </h1>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
      <tr>
        <td style="border: 1px solid #000; padding: 8px; width: 22%; font-weight: bold;">Participant Name &amp; Surname</td>
        <td style="border: 1px solid #000; padding: 8px; width: 28%;">${escapeHTML(participantName)}</td>
        <td style="border: 1px solid #000; padding: 8px; width: 22%; font-weight: bold;">Instructor Name</td>
        <td style="border: 1px solid #000; padding: 8px; width: 28%;">${escapeHTML(instructorName)}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Participant TR ID No</td>
        <td style="border: 1px solid #000; padding: 8px;">${escapeHTML(participantTrId)}</td>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Programme Name</td>
        <td style="border: 1px solid #000; padding: 8px;">${escapeHTML(programmeName)}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Programme Duration (week)</td>
        <td style="border: 1px solid #000; padding: 8px;">${escapeHTML(programmeDurationWeeks)}</td>
        <td style="border: 1px solid #000; padding: 8px;" colspan="2"></td>
      </tr>
    </table>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      ${monthTables}
    </table>
  </div>
  `
}

// IB Activity Report HTML Generator (Türkçe/İngilizce)
export function generateIBActivityReportHTML(data: {
  student: {
    firstName: string
    lastName: string
    grade: string
    birthDate: string
  }
  activities: Array<{
    type: string
    title: string
    description: string | null
    activityDate: string
    location: string | null
    organizer: string | null
    duration: number | null
    participants: number | null
    outcome: string | null
    evidence: string
    notes: string | null
    verifiedAt: string | null
  }>
  language: 'tr' | 'en'
  /** Müfredat sayfası HTML (varsa faaliyet raporundan önce eklenir) */
  mufredatHtml?: string
}) {
  const { student, activities, language, mufredatHtml } = data
  const isEnglish = language === 'en'

  const translations = {
    tr: {
      title: 'IB PROGRAM ÖĞRENCİ FAALİYET RAPORU',
      studentInfo: 'ÖĞRENCİ BİLGİLERİ',
      studentName: 'Ad Soyad',
      grade: 'Sınıf',
      birthDate: 'Doğum Tarihi',
      activities: 'FAALİYETLER',
      activityType: 'Tip',
      date: 'Tarih',
      location: 'Konum',
      organizer: 'Organizatör',
      duration: 'Süre',
      participants: 'Katılımcı Sayısı',
      description: 'Açıklama',
      outcome: 'Sonuç/Kazanım',
      evidence: 'Kanıt',
      verifiedAt: 'Doğrulanma Tarihi',
      totalActivities: 'Toplam Faaliyet Sayısı',
      reportDate: 'Rapor Tarihi',
      minutes: 'dakika',
      verified: 'Doğrulanmış',
      notes: 'Notlar',
    },
    en: {
      title: 'IB PROGRAM STUDENT ACTIVITY REPORT',
      studentInfo: 'STUDENT INFORMATION',
      studentName: 'Full Name',
      grade: 'Grade',
      birthDate: 'Date of Birth',
      activities: 'ACTIVITIES',
      activityType: 'Type',
      date: 'Date',
      location: 'Location',
      organizer: 'Organizer',
      duration: 'Duration',
      participants: 'Number of Participants',
      description: 'Description',
      outcome: 'Outcome/Achievement',
      evidence: 'Evidence',
      verifiedAt: 'Verification Date',
      totalActivities: 'Total Number of Activities',
      reportDate: 'Report Date',
      minutes: 'minutes',
      verified: 'Verified',
      notes: 'Notes',
    }
  }

  const t = translations[language]

  const activityTypeLabels: Record<string, { tr: string; en: string }> = {
    ETKINLIK: { tr: 'Etkinlik', en: 'Event' },
    GEZI: { tr: 'Gezi', en: 'Trip' },
    PROJE: { tr: 'Proje', en: 'Project' },
    SINAV: { tr: 'Sınav', en: 'Exam' },
    YARISMA: { tr: 'Yarışma', en: 'Competition' },
    SEMINER: { tr: 'Seminer', en: 'Seminar' },
    WORKSHOP: { tr: 'Workshop', en: 'Workshop' },
    SPORT: { tr: 'Spor', en: 'Sport' },
    SANAT: { tr: 'Sanat', en: 'Art' },
    SOSYAL: { tr: 'Sosyal Sorumluluk', en: 'Social Responsibility' },
    DIL: { tr: 'Dil Faaliyeti', en: 'Language Activity' },
    BILIM: { tr: 'Bilim', en: 'Science' },
    DEGER: { tr: 'Değerler Eğitimi', en: 'Values Education' },
    DIGER: { tr: 'Diğer', en: 'Other' },
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isEnglish) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })
  }


  const activityRows = activities.map((activity, index) => {
    const typeLabel = activityTypeLabels[activity.type]?.[language] || activity.type
    const notSpecified = language === 'en' ? 'Not specified' : 'Belirtilmemiş'

    // Text content for first page
    const textContent = `
      <div style="page-break-after: always;">
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #1a1a1a;">${index + 1}. ${escapeHTML(activity.title)}</h3>
              <span style="display: inline-block; margin-top: 5px; padding: 4px 10px; background-color: #e3f2fd; color: #1976d2; border-radius: 3px; font-size: 11px; font-weight: 600;">${escapeHTML(typeLabel)}</span>
            </div>
            <span style="font-size: 12px; color: #666; font-weight: 600;">${formatDate(activity.activityDate)}</span>
          </div>
          
          <table style="width: 100%; margin-top: 10px; font-size: 11px; border-collapse: collapse;">
            <tr>
              <td style="width: 30%; padding: 8px 0; color: #666; font-weight: 600; vertical-align: top;">${t.location}:</td>
              <td style="padding: 8px 0; color: #333; vertical-align: top;">${activity.location && activity.location.trim() !== '' ? escapeHTML(activity.location) : `<span style="color: #999; font-style: italic;">${notSpecified}</span>`}</td>
            </tr>
            <tr>
              <td style="width: 30%; padding: 8px 0; color: #666; font-weight: 600; vertical-align: top;">${t.organizer}:</td>
              <td style="padding: 8px 0; color: #333; vertical-align: top;">${activity.organizer && activity.organizer.trim() !== '' ? escapeHTML(activity.organizer) : `<span style="color: #999; font-style: italic;">${notSpecified}</span>`}</td>
            </tr>
            <tr>
              <td style="width: 30%; padding: 8px 0; color: #666; font-weight: 600; vertical-align: top;">${t.duration}:</td>
              <td style="padding: 8px 0; color: #333; vertical-align: top;">${activity.duration !== null && activity.duration !== undefined ? `${activity.duration} ${t.minutes}` : `<span style="color: #999; font-style: italic;">${notSpecified}</span>`}</td>
            </tr>
            <tr>
              <td style="width: 30%; padding: 8px 0; color: #666; font-weight: 600; vertical-align: top;">${t.participants}:</td>
              <td style="padding: 8px 0; color: #333; vertical-align: top;">${activity.participants !== null && activity.participants !== undefined ? activity.participants : `<span style="color: #999; font-style: italic;">${notSpecified}</span>`}</td>
            </tr>
          </table>
          
          <div style="margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-radius: 3px; border-left: 3px solid #1976d2;">
            <div style="font-size: 11px; color: #666; font-weight: 600; margin-bottom: 8px;">${t.description}:</div>
            <div style="font-size: 11px; color: #333; line-height: 1.6; white-space: pre-wrap;">${activity.description && activity.description.trim() !== '' ? escapeHTML(activity.description) : `<span style="color: #999; font-style: italic;">${notSpecified}</span>`}</div>
          </div>
          
          <div style="margin-top: 10px; padding: 10px; background-color: #e8f5e9; border-radius: 3px; border-left: 3px solid #4caf50;">
            <div style="font-size: 11px; color: #666; font-weight: 600; margin-bottom: 8px;">${t.outcome}:</div>
            <div style="font-size: 11px; color: #333; line-height: 1.6; white-space: pre-wrap;">${activity.outcome && activity.outcome.trim() !== '' ? escapeHTML(activity.outcome) : `<span style="color: #999; font-style: italic;">${notSpecified}</span>`}</div>
          </div>
          
          <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-radius: 3px; border-left: 3px solid #ffc107;">
            <div style="font-size: 11px; color: #666; font-weight: 600; margin-bottom: 8px;">${t.notes}:</div>
            <div style="font-size: 11px; color: #333; line-height: 1.6; white-space: pre-wrap;">${activity.notes && activity.notes.trim() !== '' ? escapeHTML(activity.notes) : `<span style="color: #999; font-style: italic;">${notSpecified}</span>`}</div>
          </div>
          
          ${activity.verifiedAt ? `
          <div style="margin-top: 10px; padding: 8px; background-color: #e8f5e9; border-radius: 3px;">
            <div style="font-size: 11px; color: #2e7d32; font-weight: 600;">
              <span>${t.verified}:</span> ${formatDate(activity.verifiedAt)}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `

    // Evidence content for second page
    const evidenceContent = `
      <div style="page-break-before: always;">
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #1a1a1a;">${index + 1}. ${escapeHTML(activity.title)} - ${t.evidence}</h3>
          <div style="padding: 15px; background-color: #fff; border: 1px solid #e0e0e0; border-radius: 3px;">
            <div style="font-size: 11px; color: #666; font-weight: 600; margin-bottom: 10px;">${t.evidence}:</div>
            ${activity.evidence && activity.evidence.trim() !== '' ? (() => {
        const evidenceUrl = activity.evidence.trim()
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        const isImage = imageExtensions.some(ext => evidenceUrl.toLowerCase().includes(ext))

        if (isImage) {
          return `<div style="margin-top: 10px; text-align: center;">
                  <img src="${escapeHTML(evidenceUrl)}" alt="Evidence" style="max-width: 100%; max-height: 600px; border: 1px solid #e0e0e0; border-radius: 4px; display: block; margin: 0 auto;" />
                  <a href="${escapeHTML(evidenceUrl)}" target="_blank" style="color: #1976d2; text-decoration: underline; font-size: 10px; display: inline-block; margin-top: 10px; word-break: break-all;">${escapeHTML(evidenceUrl)}</a>
                </div>`
        } else {
          return `<a href="${escapeHTML(evidenceUrl)}" target="_blank" style="color: #1976d2; word-break: break-all; text-decoration: underline; font-size: 11px;">${escapeHTML(evidenceUrl)}</a>`
        }
      })() : `<span style="color: #999; font-style: italic; font-size: 11px;">${notSpecified}</span>`}
          </div>
        </div>
      </div>
    `

    return textContent + evidenceContent
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #333;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #1976d2;
        }
        .header h1 {
          font-size: 20px;
          font-weight: bold;
          color: #1976d2;
          margin-bottom: 10px;
        }
        .student-info {
          margin-bottom: 25px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 5px;
        }
        .student-info h2 {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #1a1a1a;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
          font-size: 11px;
        }
        .info-label {
          width: 150px;
          font-weight: 600;
          color: #666;
        }
        .info-value {
          flex: 1;
          color: #333;
        }
        .summary {
          margin-bottom: 25px;
          padding: 12px;
          background-color: #e3f2fd;
          border-radius: 5px;
          font-size: 11px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          text-align: right;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
      </style>
    </head>
    <body>
      ${mufredatHtml ?? ""}
      <div class="header">
        <h1>${t.title}</h1>
      </div>
      
      <div class="student-info">
        <h2>${t.studentInfo}</h2>
        <div class="info-row">
          <div class="info-label">${t.studentName}:</div>
          <div class="info-value">${escapeHTML(student.firstName)} ${escapeHTML(student.lastName)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">${t.grade}:</div>
          <div class="info-value">${escapeHTML(student.grade)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">${t.birthDate}:</div>
          <div class="info-value">${formatDate(student.birthDate)}</div>
        </div>
      </div>
      
      <div class="summary">
        <strong>${t.totalActivities}:</strong> ${activities.length}
      </div>
      
      <div style="margin-top: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #1a1a1a;">${t.activities}</h2>
        ${activityRows}
      </div>
      
      <div class="footer">
        ${t.reportDate}: ${formatDate(new Date().toISOString())}
      </div>
    </body>
    </html>
  `
}