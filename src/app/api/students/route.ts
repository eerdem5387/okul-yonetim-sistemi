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

        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                tcNumber,
                birthDate: new Date(birthDate),
                grade,
                address,
                motherName,
                motherTc,
                motherPhone,
                motherAddress,
                motherOccupation,
                fatherName,
                fatherTc,
                fatherPhone,
                fatherAddress,
                fatherOccupation
            }
        })

        return NextResponse.json(student)
    } catch (error) {
        console.error("Error creating student:", error)
        return NextResponse.json({ error: "Failed to create student" }, { status: 500 })
    }
}
