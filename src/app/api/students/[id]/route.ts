import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const { searchParams } = new URL(request.url)
        const format = searchParams.get("format") // "legacy" veya null
        
        const student = await prisma.student.findUnique({
            where: { id: params.id }
        })

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        // Backward compatibility: 
        // - Test bot: { student: {...} } formatını bekliyor (default)
        // - Eski frontend (eğer varsa): ?format=legacy ile direkt student objesi
        if (format === "legacy") {
            return NextResponse.json(student)
        }
        
        // Default: Test bot uyumlu format
        return NextResponse.json({ student })
    } catch (error) {
        console.error("Error fetching student:", error)
        return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { 
            firstName, lastName, tcNumber, birthDate, grade, address,
            motherName, motherTc, motherPhone, motherAddress, motherOccupation,
            fatherName, fatherTc, fatherPhone, fatherAddress, fatherOccupation,
            announcedTuitionFee, studentTuitionFee
        } = body

        // Kullanıcı rolünü kontrol et (sadece admin öğrenim ücreti alanlarını güncelleyebilir)
        // Frontend'den gelen role bilgisini header'dan al

        const updateData: Record<string, unknown> = {
            firstName,
            lastName,
            tcNumber,
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

        // Öğrenim ücreti alanları sadece admin tarafından güncellenebilir
        // Frontend'den gelen role bilgisini kontrol et (localStorage'dan)
        // Not: Production'da bu kontrol middleware'de yapılmalı
        if (announcedTuitionFee !== undefined || studentTuitionFee !== undefined) {
            // Frontend'den gelen role bilgisini header'dan al
            const frontendRole = request.headers.get("x-user-role")
            if (frontendRole === "admin") {
                if (announcedTuitionFee !== undefined) {
                    updateData.announcedTuitionFee = announcedTuitionFee || null
                }
                if (studentTuitionFee !== undefined) {
                    updateData.studentTuitionFee = studentTuitionFee || null
                }
            } else {
                // Admin değilse, mevcut değerleri koru
                const currentStudent = await prisma.student.findUnique({
                    where: { id: params.id },
                    select: { announcedTuitionFee: true, studentTuitionFee: true }
                })
                if (currentStudent) {
                    updateData.announcedTuitionFee = currentStudent.announcedTuitionFee
                    updateData.studentTuitionFee = currentStudent.studentTuitionFee
                }
            }
        }

        // birthDate sadece varsa ekle
        if (birthDate) {
            updateData.birthDate = new Date(birthDate)
        }

        // TC numarası kontrolü kaldırıldı - kullanıcı TC numarasını düzeltebilmeli
        // Unique constraint hatası Prisma tarafından yakalanacak ve kullanıcıya gösterilecek

        const student = await prisma.student.update({
            where: { id: params.id },
            data: updateData
        })

        return NextResponse.json({ student })
    } catch (error) {
        console.error("Error updating student:", error)
        // Prisma unique constraint hatası kontrolü
        if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('P2002'))) {
            return NextResponse.json({ 
                error: "Bu TC numarası başka bir öğrenciye ait! Lütfen farklı bir TC numarası deneyin veya önce diğer öğrencinin TC numarasını değiştirin.",
                code: "TC_NUMBER_EXISTS"
            }, { status: 409 })
        }
        return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        await prisma.student.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting student:", error)
        return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
    }
}
