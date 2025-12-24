import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { StaffDepartment } from "@prisma/client"

// GET - Tüm personeli listele (filtreleme ile)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const department = searchParams.get("department")
    const isActive = searchParams.get("isActive")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const whereConditions: Record<string, unknown> = {}

    if (search) {
      whereConditions.OR = [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { tcNumber: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
        { position: { contains: search, mode: "insensitive" as const } },
        { subject: { contains: search, mode: "insensitive" as const } },
      ]
    }

    if (department && department !== "all") {
      whereConditions.department = department as StaffDepartment
    }

    if (isActive !== null && isActive !== undefined && isActive !== "all") {
      whereConditions.isActive = isActive === "true"
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where: whereConditions,
        orderBy: [
          { department: "asc" },
          { lastName: "asc" },
          { firstName: "asc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.staff.count({ where: whereConditions }),
    ])

    return NextResponse.json({
      staff,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json(
      { error: "Personel getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni personel ekle
export async function POST(request: NextRequest) {
  try {
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
      hireDate,
      notes,
      createdByStaffId, // Ekleyen kişinin Staff ID'si (frontend'den gönderilmeli)
    } = body

    if (!firstName || !lastName || !tcNumber || !department) {
      return NextResponse.json(
        { error: "Ad, soyad, TC kimlik no ve bölüm zorunludur" },
        { status: 400 }
      )
    }

    // Müdür ekleme kısıtlaması (Mantıksal Açık Çözüm #4)
    if (department === "MUDUR" && createdByStaffId) {
      const createdByStaff = await prisma.staff.findUnique({
        where: { id: createdByStaffId },
      })

      if (createdByStaff && createdByStaff.department === "MUDUR") {
        return NextResponse.json(
          { error: "Müdür yetkisi ile yeni müdür eklenemez. Sadece Süper Admin (Yönetici) yeni müdür ekleyebilir." },
          { status: 403 }
        )
      }
    }

    const staff = await prisma.staff.create({
      data: {
        firstName,
        lastName,
        tcNumber,
        email: email || null,
        phone: phone || null,
        department: department as StaffDepartment,
        position: position || null,
        subject: subject || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        notes: notes || null,
        // İlk şifre TC No olacak (ilk girişte değiştirilecek)
        password: null, // İlk girişte TC No ile giriş yapacak
        isFirstLogin: true,
      },
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error("Error creating staff:", error)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Bu TC kimlik numarası zaten kayıtlı" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Personel oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

