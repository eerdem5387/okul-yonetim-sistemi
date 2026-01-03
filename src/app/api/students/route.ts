import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const grade = searchParams.get('grade') || ''
        
        const skip = (page - 1) * limit

        // Arama ve sınıf filtresi
        const whereConditions: Array<Record<string, unknown>> = []
        
        // Arama filtresi
        if (search) {
            whereConditions.push({
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                    { tcNumber: { contains: search } },
                    { grade: { contains: search, mode: 'insensitive' as const } }
                ]
            })
        }
        
        // Sınıf filtresi
        if (grade) {
            whereConditions.push({ grade: { equals: grade, mode: 'insensitive' as const } })
        } else {
            // Varsayılan olarak mezunları hariç tut (sadece "Mezun" filtresi seçildiğinde görünsünler)
            whereConditions.push({ NOT: { grade: { equals: "Mezun", mode: 'insensitive' as const } } })
        }
        
        const where = whereConditions.length > 0 ? { AND: whereConditions } : {}

        // Toplam kayıt sayısı (arama varsa filtrelenmiş, yoksa tümü)
        const total = await prisma.student.count({ where })

        // Öğrencileri çek (pagination + arama)
        const students = await prisma.student.findMany({
            where,
            orderBy: {
                createdAt: "desc"
            },
            skip,
            take: limit
        })

        return NextResponse.json({
            students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error("Error fetching students:", error)
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { 
            firstName, lastName, tcNumber, birthDate, grade, address,
            motherName, motherTc, motherPhone, motherAddress, motherOccupation,
            fatherName, fatherTc, fatherPhone, fatherAddress, fatherOccupation
        } = body

        // Validasyon
        if (!firstName || !lastName || !tcNumber) {
            return NextResponse.json({ 
                error: "firstName, lastName, and tcNumber are required" 
            }, { status: 400 })
        }

        // TC Number format kontrolü
        if (tcNumber.length !== 11 || !/^\d+$/.test(tcNumber)) {
            return NextResponse.json({ 
                error: "TC Number must be 11 digits" 
            }, { status: 400 })
        }

        // BirthDate kontrolü - Prisma schema'da nullable değil, bu yüzden geçerli bir tarih gerekli
        let parsedBirthDate: Date
        if (birthDate) {
            try {
                const date = new Date(birthDate)
                if (!isNaN(date.getTime())) {
                    parsedBirthDate = date
                } else {
                    // Geçersiz tarih, default olarak bugünün tarihini kullan
                    parsedBirthDate = new Date()
                }
            } catch {
                // Parse hatası, default olarak bugünün tarihini kullan
                parsedBirthDate = new Date()
            }
        } else {
            // Tarih gönderilmemiş, default olarak bugünün tarihini kullan
            parsedBirthDate = new Date()
        }

        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                tcNumber,
                birthDate: parsedBirthDate,
                grade: grade || null,
                address: address || null,
                motherName: motherName || null,
                motherTc: motherTc || null,
                motherPhone: motherPhone || null,
                motherAddress: motherAddress || null,
                motherOccupation: motherOccupation || null,
                fatherName: fatherName || null,
                fatherTc: fatherTc || null,
                fatherPhone: fatherPhone || null,
                fatherAddress: fatherAddress || null,
                fatherOccupation: fatherOccupation || null
            }
        })

        return NextResponse.json({
            success: true,
            student
        })
    } catch (error) {
        console.error("Error creating student:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Prisma unique constraint hatası
        if (error instanceof Error && error.message.includes("Unique constraint")) {
            return NextResponse.json({ 
                error: "A student with this TC Number already exists",
                details: errorMessage
            }, { status: 400 })
        }
        
        return NextResponse.json({ 
            error: "Failed to create student",
            details: errorMessage
        }, { status: 500 })
    }
}
