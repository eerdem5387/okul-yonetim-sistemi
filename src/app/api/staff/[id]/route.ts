import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { StaffDepartment } from "@prisma/client"

// GET - Tek personel getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
    })

    if (!staff) {
      return NextResponse.json(
        { error: "Personel bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(staff)
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json(
      { error: "Personel getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Personel güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const {
      firstName,
      lastName,
      tcNumber,
      email,
      phone,
      department,
      position,
      subject,
      grades,
      isActive,
      hireDate,
      notes,
    } = body

    if (!firstName || !lastName || !tcNumber || !department) {
      return NextResponse.json(
        { error: "Ad, soyad, TC kimlik no ve bölüm zorunludur" },
        { status: 400 }
      )
    }

    const staff = await prisma.staff.update({
      where: { id: params.id },
      data: {
        firstName,
        lastName,
        tcNumber,
        email: email || null,
        phone: phone || null,
        department: department as StaffDepartment,
        position: position || null,
        subject: subject || null,
        grades: Array.isArray(grades) ? grades : [],
        isActive: isActive !== undefined ? isActive : true,
        hireDate: hireDate ? new Date(hireDate) : null,
        notes: notes || null,
      },
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error("Error updating staff:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Personel bulunamadı" },
        { status: 404 }
      )
    }
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Bu TC kimlik numarası zaten kayıtlı" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Personel güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Personel sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.staff.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Personel başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting staff:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Personel bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Personel silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

