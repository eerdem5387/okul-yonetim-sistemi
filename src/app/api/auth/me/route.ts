import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/auth/me
 * Kullanıcı bilgilerini ve yetkilerini döndürür
 * 
 * Query:
 * - staffId: string (zorunlu)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get("staffId")

    if (!staffId) {
      return NextResponse.json(
        { error: "staffId parametresi gereklidir" },
        { status: 400 }
      )
    }

    // Staff kaydını bul
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        assignedClasses: {
          include: {
            academicYear: true,
          },
        },
        subjectAssignments: {
          include: {
            subject: {
              include: {
                academicYear: true,
              },
            },
          },
        },
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: "Personel bulunamadı" },
        { status: 404 }
      )
    }

    if (!staff.isActive) {
      return NextResponse.json(
        { error: "Bu hesap devre dışı bırakılmış" },
        { status: 403 }
      )
    }

    // Rol belirleme
    let role: "admin" | "principal" | "teacher" | "counselor" | "student_affairs" = "teacher"
    
    if (staff.department === "MUDUR") {
      role = "principal"
    } else if (staff.department === "MUDUR_YARDIMCISI" || staff.department === "OGRENCI_ISLERI") {
      role = "student_affairs"
    } else if (staff.department === "REHBERLIK") {
      role = "counselor"
    } else if (staff.department === "OGRETMEN") {
      role = "teacher"
    }

    // Yetkiler (permissions) belirleme
    const isPrincipal = role === "principal"
    const isStudentAffairs = role === "student_affairs"
    const isCounselor = role === "counselor"
    const isTeacher = role === "teacher"
    
    const permissions = {
      canManageClasses: isPrincipal || isStudentAffairs || isCounselor,
      canApproveSchedules: isPrincipal,
      canManageStaff: isPrincipal || isStudentAffairs,
      canManageStudents: !isTeacher,
      canViewAllClasses: isPrincipal || isStudentAffairs,
      canManageApplications: isPrincipal || isStudentAffairs,
      canManageOfferMeetings: isPrincipal || isStudentAffairs,
      canManageTrips: !isTeacher,
      canManageClubs: !isTeacher,
      canManageIBActivities: !isTeacher,
      canManageParentMeetings: !isTeacher,
      canManageNeredeyiz: true, // Herkes erişebilir (kendi yetkileri dahilinde)
      canAddPrincipal: false, // Şu an için kimse ekleyemez (gelecekte süper admin için true)
    }

    // Atandığı sınıfların ID'leri (Rehberlik için)
    const assignedClassIds = staff.assignedClasses.map((c) => c.id)

    return NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        fullName: `${staff.firstName} ${staff.lastName}`,
        tcNumber: staff.tcNumber,
        email: staff.email,
        phone: staff.phone,
        department: staff.department,
        position: staff.position,
        subject: staff.subject,
        role,
        permissions,
        assignedClassIds, // Rehberlik için atandığı sınıflar
        isFirstLogin: staff.isFirstLogin,
        mustChangePassword: staff.mustChangePassword,
        lastLoginAt: staff.lastLoginAt,
        hireDate: staff.hireDate,
      },
    })
  } catch (error) {
    console.error("Error fetching user info:", error)
    return NextResponse.json(
      { error: "Kullanıcı bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

