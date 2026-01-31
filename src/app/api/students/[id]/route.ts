import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
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

        // Sadece tanımlı (undefined olmayan) alanları güncelle - Prisma undefined ile sorun çıkarabilir
        const updateData: Record<string, unknown> = {}
        if (firstName !== undefined) updateData.firstName = firstName
        if (lastName !== undefined) updateData.lastName = lastName
        if (tcNumber !== undefined) updateData.tcNumber = tcNumber
        if (grade !== undefined) updateData.grade = grade
        if (address !== undefined) updateData.address = address
        if (motherName !== undefined) updateData.motherName = motherName
        if (motherTc !== undefined) updateData.motherTc = motherTc
        if (motherPhone !== undefined) updateData.motherPhone = motherPhone
        if (motherAddress !== undefined) updateData.motherAddress = motherAddress
        if (motherOccupation !== undefined) updateData.motherOccupation = motherOccupation
        if (fatherName !== undefined) updateData.fatherName = fatherName
        if (fatherTc !== undefined) updateData.fatherTc = fatherTc
        if (fatherPhone !== undefined) updateData.fatherPhone = fatherPhone
        if (fatherAddress !== undefined) updateData.fatherAddress = fatherAddress
        if (fatherOccupation !== undefined) updateData.fatherOccupation = fatherOccupation

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

        // En az bir alan güncellenecek olmalı
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "Güncellenecek alan bulunamadı." }, { status: 400 })
        }

        // TC değiştiriliyorsa ve bu TC başka bir öğrencide varsa: sözleşmeleri o öğrenciye bağla (merge)
        if (tcNumber !== undefined && typeof tcNumber === "string" && tcNumber.trim() !== "") {
            const existingWithTc = await prisma.student.findUnique({
                where: { tcNumber: tcNumber.trim() }
            })
            if (existingWithTc && existingWithTc.id !== params.id) {
                // Aynı TC'ye sahip başka öğrenci var → bu öğrencinin tüm sözleşmelerini ona taşı, çift kaydı sil
                await prisma.$transaction(async (tx) => {
                    const targetId = existingWithTc.id
                    await tx.newRegistration.updateMany({ where: { studentId: params.id }, data: { studentId: targetId } })
                    await tx.renewal.updateMany({ where: { studentId: params.id }, data: { studentId: targetId } })
                    await tx.uniformContract.updateMany({ where: { studentId: params.id }, data: { studentId: targetId } })
                    await tx.mealContract.updateMany({ where: { studentId: params.id }, data: { studentId: targetId } })
                    await tx.serviceContract.updateMany({ where: { studentId: params.id }, data: { studentId: targetId } })
                    await tx.bookContract.updateMany({ where: { studentId: params.id }, data: { studentId: targetId } })
                    // Hedef öğrenciyi form verisiyle güncelle (isteğe bağlı)
                    const targetUpdateData: Record<string, unknown> = {}
                    if (firstName !== undefined) targetUpdateData.firstName = firstName
                    if (lastName !== undefined) targetUpdateData.lastName = lastName
                    if (grade !== undefined) targetUpdateData.grade = grade
                    if (address !== undefined) targetUpdateData.address = address
                    if (motherName !== undefined) targetUpdateData.motherName = motherName
                    if (motherTc !== undefined) targetUpdateData.motherTc = motherTc
                    if (motherPhone !== undefined) targetUpdateData.motherPhone = motherPhone
                    if (motherAddress !== undefined) targetUpdateData.motherAddress = motherAddress
                    if (motherOccupation !== undefined) targetUpdateData.motherOccupation = motherOccupation
                    if (fatherName !== undefined) targetUpdateData.fatherName = fatherName
                    if (fatherTc !== undefined) targetUpdateData.fatherTc = fatherTc
                    if (fatherPhone !== undefined) targetUpdateData.fatherPhone = fatherPhone
                    if (fatherAddress !== undefined) targetUpdateData.fatherAddress = fatherAddress
                    if (fatherOccupation !== undefined) targetUpdateData.fatherOccupation = fatherOccupation
                    if (birthDate) targetUpdateData.birthDate = new Date(birthDate)
                    if (Object.keys(targetUpdateData).length > 0) {
                        await tx.student.update({ where: { id: targetId }, data: targetUpdateData as object })
                    }
                    await tx.student.delete({ where: { id: params.id } })
                })
                const updatedTarget = await prisma.student.findUnique({ where: { id: existingWithTc.id } })
                return NextResponse.json({ student: updatedTarget, merged: true })
            }
        }

        const student = await prisma.student.update({
            where: { id: params.id },
            data: updateData
        })

        return NextResponse.json({ student })
    } catch (error) {
        console.error("Error updating student:", error)
        // Prisma unique constraint (P2002) - TC numarası çakışması (merge dışı kalan edge case)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ 
                error: "Bu TC numarası başka bir öğrenciye ait! Lütfen farklı bir TC numarası deneyin veya önce diğer öğrencinin TC numarasını değiştirin.",
                code: "TC_NUMBER_EXISTS"
            }, { status: 409 })
        }
        if (error instanceof Error && (error.message.includes("Unique constraint") || error.message.includes("P2002"))) {
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
