import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePDF, generateCombinedContractHTML } from "@/lib/pdf-generator"

// GET handler for testing route availability
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        return NextResponse.json({ 
            message: "PDF Combined route is available",
            id: params.id 
        })
    } catch {
        return NextResponse.json({ error: "Route error" }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        
        // ID kontrolü
        if (!params || !params.id) {
            console.error("PDF Combined Route: Missing ID parameter", { params })
            return NextResponse.json({ error: "Contract ID is required" }, { status: 400 })
        }
        
        console.log("PDF Combined Route: Processing request for ID:", params.id)

        let body
        try {
            body = await request.json()
        } catch {
            // Body yoksa veya parse edilemezse, default değerler kullan
            body = {}
        }
        
        const { contractTypes, mainContractData, otherContractData, selectedClubs } = body

        // Önce sözleşmeyi bul, sonra öğrenciyi ve tüm yan sözleşmeleri al
        const contract = await prisma.newRegistration.findUnique({
            where: { id: params.id },
            include: {
                student: {
                    include: {
                        clubSelections: {
                            include: {
                                club: true
                            }
                        }
                    }
                }
            }
        })

        let student = null
        let studentId = null
        let renewalContract = null

        if (!contract) {
            // Renewal sözleşmesi olabilir
            renewalContract = await prisma.renewal.findUnique({
                where: { id: params.id },
                include: {
                    student: {
                        include: {
                            clubSelections: {
                                include: {
                                    club: true
                                }
                            }
                        }
                    }
                }
            })

            if (!renewalContract) {
                return NextResponse.json({ error: "Contract not found" }, { status: 404 })
            }

            student = renewalContract.student
            studentId = renewalContract.studentId
        } else {
            student = contract.student
            studentId = contract.studentId
        }

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        // Student verilerini güvenli şekilde hazırla
        const safeStudent = {
            firstName: student.firstName || "",
            lastName: student.lastName || "",
            tcNumber: student.tcNumber || "",
            grade: student.grade || "",
            address: student.address || "",
            birthDate: student.birthDate ? student.birthDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            motherName: student.motherName || "",
            motherTc: student.motherTc || "",
            motherPhone: student.motherPhone || "",
            motherAddress: student.motherAddress || "",
            motherOccupation: student.motherOccupation || "",
            fatherName: student.fatherName || "",
            fatherTc: student.fatherTc || "",
            fatherPhone: student.fatherPhone || "",
            fatherAddress: student.fatherAddress || "",
            fatherOccupation: student.fatherOccupation || ""
        }

        // Öğrencinin tüm yan sözleşmelerini çek
        const [uniformContract, mealContract, serviceContract, bookContract] = await Promise.all([
            prisma.uniformContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
            prisma.mealContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
            prisma.serviceContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
            prisma.bookContract.findFirst({ where: { studentId }, orderBy: { createdAt: 'desc' } })
        ])

        // Yan sözleşme verilerini hazırla
        const otherContractDataFromDB: Record<string, unknown> = {}

        if (uniformContract) {
            Object.assign(otherContractDataFromDB, uniformContract.contractData as Record<string, unknown>)
        }
        if (mealContract) {
            Object.assign(otherContractDataFromDB, mealContract.contractData as Record<string, unknown>)
        }
        if (serviceContract) {
            Object.assign(otherContractDataFromDB, serviceContract.contractData as Record<string, unknown>)
        }
        if (bookContract) {
            Object.assign(otherContractDataFromDB, bookContract.contractData as Record<string, unknown>)
        }

        // Eğer yan sözleşmeler yoksa ve mainContractData varsa, ana sözleşmedeki verileri kullan
        if (Object.keys(otherContractDataFromDB).length === 0 && mainContractData) {
            // Ana sözleşmedeki verileri yan sözleşmelere aktar
            otherContractDataFromDB.uniformSize = (mainContractData as Record<string, unknown>).uniformSize || ""
            otherContractDataFromDB.uniformPrice = (mainContractData as Record<string, unknown>).uniformPrice || ""
            otherContractDataFromDB.uniformDeliveryDate = (mainContractData as Record<string, unknown>).uniformDeliveryDate || ""
            otherContractDataFromDB.uniformItems = (mainContractData as Record<string, unknown>).uniformItems || []

            otherContractDataFromDB.mealPeriods = (mainContractData as Record<string, unknown>).mealPeriods || []
            otherContractDataFromDB.mealPrice = (mainContractData as Record<string, unknown>).mealPrice || ""

            otherContractDataFromDB.bookSet = (mainContractData as Record<string, unknown>).bookSet || ""
            otherContractDataFromDB.bookDeliveryDate = (mainContractData as Record<string, unknown>).bookDeliveryDate || ""

            otherContractDataFromDB.serviceRegion = (mainContractData as Record<string, unknown>).serviceRegion || ""
            otherContractDataFromDB.servicePrice = (mainContractData as Record<string, unknown>).servicePrice || ""
        }

        // Frontend'den gelen veya veritabanından çekilen verileri kullan
        // Frontend'den gelen otherContractData varsa onu kullan, yoksa veritabanından çekilen verileri kullan
        // Ama frontend'den gelen verileri önceliklendir
        const finalOtherContractData = { ...otherContractDataFromDB, ...(otherContractData || {}) }
        
        // mainContractData'yı da birleştir (eğer frontend'den geliyorsa)
        // Veritabanından gelen contractData'yı da kontrol et
        let finalMainContractData = mainContractData || {}
        
        // Eğer contract bulunduysa, contractData'yı da birleştir
        if (contract) {
            const contractDataFromDB = contract.contractData as Record<string, unknown> || {}
            finalMainContractData = { ...contractDataFromDB, ...finalMainContractData }
        } else if (renewalContract) {
            const renewalContractDataFromDB = renewalContract.contractData as Record<string, unknown> || {}
            finalMainContractData = { ...renewalContractDataFromDB, ...finalMainContractData }
        }

        // Kulüp seçimlerini hazırla (frontend'den gelen veya veritabanından)
        const clubsForPDF = selectedClubs || (student.clubSelections && Array.isArray(student.clubSelections) 
            ? student.clubSelections.map(selection => ({
                id: selection.club?.id || "",
                name: selection.club?.name || ""
            })).filter(club => club.id && club.name)
            : [])

        // Hangi sözleşmeler PDF'e dahil edilecek?
        const derivedTypes: string[] = []
        if (uniformContract) derivedTypes.push('uniform')
        if (mealContract) derivedTypes.push('meal')
        if (serviceContract) derivedTypes.push('service')
        if (bookContract) derivedTypes.push('book')
        const typesForPdf = Array.isArray(contractTypes) && contractTypes.length > 0 ? contractTypes : derivedTypes

        // Tüm sözleşmeleri birleştir
        let combinedHTML: string
        try {
            combinedHTML = generateCombinedContractHTML({
                student: safeStudent,
                contractTypes: typesForPdf,
                mainContractData: finalMainContractData,
                otherContractData: finalOtherContractData,
                selectedClubs: clubsForPDF.length > 0 ? clubsForPDF : undefined
            })
        } catch (htmlError) {
            console.error("Error generating HTML:", htmlError)
            return NextResponse.json({
                error: "Failed to generate PDF HTML",
                details: htmlError instanceof Error ? htmlError.message : "Unknown error"
            }, { status: 500 })
        }

        // PDF oluştur
        let pdfBuffer: Buffer
        try {
            const result = await generatePDF(combinedHTML)
            // generatePDF Buffer döndürür (Puppeteer page.pdf())
            pdfBuffer = Buffer.isBuffer(result) ? result : Buffer.from(result)
        } catch (pdfError) {
            console.error("Error generating PDF:", pdfError)
            return NextResponse.json({
                error: "Failed to generate PDF",
                details: pdfError instanceof Error ? pdfError.message : "Unknown error"
            }, { status: 500 })
        }

        // Buffer'ı Uint8Array'e çevir (BodyInit uyumluluğu için)
        const pdfArray = new Uint8Array(pdfBuffer)

        // Dosya adını oluştur (Türkçe karakterleri ASCII'ye çevir)
        const sanitizeFileName = (name: string): string => {
            return name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Diyakritik işaretleri kaldır
                .replace(/[^a-zA-Z0-9]/g, '-') // Özel karakterleri tire ile değiştir
                .replace(/-+/g, '-') // Birden fazla tireyi tek tireye çevir
                .replace(/^-|-$/g, '') // Başta ve sonda tire varsa kaldır
        }
        
        const fileName = `tum-sozlesmeler-${sanitizeFileName(safeStudent.firstName)}-${sanitizeFileName(safeStudent.lastName)}.pdf`
        
        // RFC 5987 uyumlu dosya adı (UTF-8 encoding ile)
        const encodedFileName = encodeURIComponent(fileName)
        const asciiFileName = sanitizeFileName(`${safeStudent.firstName}-${safeStudent.lastName}`)

        // Response constructor'ını kullan (NextResponse yerine, type uyumluluğu için)
        // Response, Next.js API routes'da da çalışır ve NextResponse'dan daha esnek tip kontrolü yapar
        // Header'larda sadece ASCII karakterler kullanılabilir, bu yüzden dosya adını encode ediyoruz
        return new Response(pdfArray, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${asciiFileName}.pdf"; filename*=UTF-8''${encodedFileName}`
            }
        })
    } catch (error) {
        console.error("Error generating combined PDF:", error)
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
        console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        const errorStack = error instanceof Error ? error.stack : undefined
        
        // Prisma hataları
        if (error instanceof Error && error.message.includes("Record to find does not exist")) {
            return NextResponse.json({
                error: "Contract or student not found",
                details: errorMessage
            }, { status: 404 })
        }
        
        // PDF generation hataları
        if (error instanceof Error && (
            error.message.includes("puppeteer") ||
            error.message.includes("chromium") ||
            error.message.includes("browser")
        )) {
            return NextResponse.json({
                error: "PDF generation service error",
                details: errorMessage
            }, { status: 500 })
        }
        
        return NextResponse.json({
            error: "Failed to generate combined PDF",
            details: errorMessage,
            ...(process.env.NODE_ENV === "development" && errorStack ? { stack: errorStack } : {})
        }, { status: 500 })
    }
}
