import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function generatePDF(html: string, options?: { format?: string; margin?: Record<string, string> }) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

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
    student: { firstName: string; lastName: string; tcNumber: string }
    contractTypes: string[]
    contractData: Record<string, unknown>
}) {
    const currentDate = new Date().toLocaleDateString('tr-TR')
    const { student, contractTypes, contractData } = data

    const contractTypeNames: Record<string, string> = {
        'new-registration': 'Yeni Kayıt Sözleşmesi',
        'renewal': 'Kayıt Yenileme Sözleşmesi',
        'uniform': 'Forma Sözleşmesi',
        'meal': 'Yemek Sözleşmesi',
        'service': 'Servis Sözleşmesi',
        'book': 'Kitap Sözleşmesi'
    }

    const contractSections = contractTypes.map(contractType => {
        const contractName = contractTypeNames[contractType] || contractType
        return `
            <div class="contract-section">
                <div class="contract-header">
                    <h2>${contractName}</h2>
                    <div class="contract-date">Tarih: ${currentDate}</div>
                </div>
                
                <div class="section">
                    <div class="section-title">Öğrenci Bilgileri</div>
                    <div class="field">
                        <div class="field-label">Ad Soyad:</div>
                        <div class="field-value">${student.firstName} ${student.lastName}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">TC Kimlik No:</div>
                        <div class="field-value">${student.tcNumber}</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Sözleşme Detayları</div>
                    ${generateContractSpecificFields(contractData, contractName)}
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
            </div>
        `
    }).join('')

    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tüm Sözleşmeler</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .main-header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 3px solid #2c3e50;
                padding-bottom: 20px;
            }
            .main-title {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #2c3e50;
            }
            .main-date {
                font-size: 16px;
                color: #666;
            }
            .contract-section {
                margin-bottom: 50px;
                page-break-inside: avoid;
            }
            .contract-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 15px;
            }
            .contract-header h2 {
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #2c3e50;
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
            @media print {
                .contract-section {
                    page-break-before: always;
                }
                .contract-section:first-child {
                    page-break-before: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="main-header">
            <div class="main-title">Tüm Sözleşmeler</div>
            <div class="main-date">Tarih: ${currentDate}</div>
        </div>
        
        ${contractSections}
        
        <div class="footer">
            <p>Bu sözleşmeler elektronik ortamda oluşturulmuş olup, yasal geçerliliği vardır.</p>
        </div>
    </body>
    </html>
    `
}
