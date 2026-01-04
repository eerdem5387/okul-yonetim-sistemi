import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

/**
 * POST /api/auth/parent-login
 * Veli girişi (Öğrenci TC Kimlik No + Şifre)
 * 
 * Body:
 * - studentTcNumber: string (Öğrencinin TC Kimlik No)
 * - password: string (Şifre - İlk girişte öğrenci TC No)
 * 
 * İlk Giriş: password null ise, öğrenci TC No ile giriş yapılır
 * Sonraki Girişler: Şifre kontrolü yapılır
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentTcNumber, password } = body

    // Validasyon
    if (!studentTcNumber || !password) {
      return NextResponse.json(
        { error: "Öğrenci TC Kimlik No ve şifre gereklidir" },
        { status: 400 }
      )
    }

    // Önce öğrenciyi bul (anne-baba bilgileri de dahil)
    const student = await prisma.student.findUnique({
      where: { tcNumber: studentTcNumber },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        tcNumber: true,
        motherName: true,
        motherTc: true,
        motherPhone: true,
        fatherName: true,
        fatherTc: true,
        fatherPhone: true,
      },
    })

    if (!student) {
      console.error(`[Parent Login] Öğrenci bulunamadı - TC: ${studentTcNumber}`)
      return NextResponse.json(
        { error: "Öğrenci kaydı bulunamadı" },
        { status: 404 }
      )
    }

    // Veli hesabını bul (öğrenci TC bazlı)
    const parent = await prisma.parent.findUnique({
      where: { studentTcNumber },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                tcNumber: true,
              },
            },
          },
        },
      },
    })

    if (!parent) {
      console.error(`[Parent Login] Veli hesabı bulunamadı - Öğrenci TC: ${studentTcNumber}`)
      // Veli hesabı yoksa otomatik oluştur
      try {
        const newParent = await prisma.parent.create({
          data: {
            studentTcNumber: student.tcNumber,
            isActive: true,
          },
          include: {
            students: {
              include: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    grade: true,
                    tcNumber: true,
                  },
                },
              },
            },
          },
        })
        console.log(`[Parent Login] Veli hesabı otomatik oluşturuldu - Öğrenci TC: ${studentTcNumber}`)
        
        // Anne ve baba bilgilerini ekle
        if (student.motherName && student.motherTc) {
          await prisma.parentStudent.create({
            data: {
              parentId: newParent.id,
              studentId: student.id,
              relation: "ANNE",
              parentName: student.motherName,
              parentTcNumber: student.motherTc,
              parentPhone: student.motherPhone || undefined,
            },
          })
        }
        
        if (student.fatherTc && student.fatherName) {
          await prisma.parentStudent.create({
            data: {
              parentId: newParent.id,
              studentId: student.id,
              relation: "BABA",
              parentName: student.fatherName,
              parentTcNumber: student.fatherTc,
              parentPhone: student.fatherPhone || undefined,
            },
          })
        }
        
        // Yeni oluşturulan veli hesabı ile devam et
        const updatedParent = await prisma.parent.findUnique({
          where: { id: newParent.id },
          include: {
            students: {
              include: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    grade: true,
                    tcNumber: true,
                  },
                },
              },
            },
          },
        })
        
        if (!updatedParent) {
          return NextResponse.json(
            { error: "Veli hesabı oluşturulamadı" },
            { status: 500 }
          )
        }
        
        // Şifre kontrolü (yeni hesap, password null olmalı)
        const isValidPassword = password === studentTcNumber
        
        if (!isValidPassword) {
          return NextResponse.json(
            { error: "Öğrenci TC Kimlik No veya şifre hatalı" },
            { status: 401 }
          )
        }
        
        // Son giriş tarihini güncelle
        await prisma.parent.update({
          where: { id: updatedParent.id },
          data: { lastLoginAt: new Date() },
        })
        
        // Token oluştur
        const token = `parent_${updatedParent.id}_${Date.now()}`
        
        // Response
        const parentsInfo = updatedParent.students.map((ps) => ({
          name: ps.parentName,
          tcNumber: ps.parentTcNumber,
          phone: ps.parentPhone,
          email: ps.parentEmail,
          relation: ps.relation,
        }))
        
        return NextResponse.json({
          success: true,
          token,
          parent: {
            id: updatedParent.id,
            studentTcNumber: updatedParent.studentTcNumber,
            isFirstLogin: updatedParent.isFirstLogin,
            mustChangePassword: updatedParent.mustChangePassword,
            parents: parentsInfo,
            student: student,
          },
        })
      } catch (createError) {
        console.error(`[Parent Login] Veli hesabı oluşturma hatası:`, createError)
        return NextResponse.json(
          { error: "Veli hesabı bulunamadı ve oluşturulamadı" },
          { status: 404 }
        )
      }
    }

    // Aktif kontrol
    if (!parent.isActive) {
      return NextResponse.json(
        { error: "Hesap aktif değil. Lütfen okul idaresi ile iletişime geçin." },
        { status: 403 }
      )
    }

    // Şifre kontrolü
    let isValidPassword = false

    if (!parent.password) {
      // İlk giriş: Öğrenci TC No ile giriş
      isValidPassword = password === studentTcNumber
    } else {
      // Sonraki girişler: Şifre kontrolü
      isValidPassword = await bcrypt.compare(password, parent.password)
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Öğrenci TC Kimlik No veya şifre hatalı" },
        { status: 401 }
      )
    }

    // Son giriş tarihini güncelle
    await prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    })

    // Token oluştur (basit token sistemi - mevcut pattern)
    const token = `parent_${parent.id}_${Date.now()}`

    // Response (Velilerin bilgileri)
    const parentsInfo = parent.students.map((ps) => ({
      name: ps.parentName,
      tcNumber: ps.parentTcNumber,
      phone: ps.parentPhone,
      email: ps.parentEmail,
      relation: ps.relation,
    }))

    // Response
    return NextResponse.json({
      success: true,
      token,
      parent: {
        id: parent.id,
        studentTcNumber: parent.studentTcNumber,
        isFirstLogin: parent.isFirstLogin,
        mustChangePassword: parent.mustChangePassword,
        parents: parentsInfo, // Anne, Baba, Vasi bilgileri
        student: student, // Öğrenci bilgisi (direkt student'tan alınıyor)
      },
    })
  } catch (error) {
    console.error("Error in parent login:", error)
    return NextResponse.json(
      { error: "Giriş işlemi sırasında bir hata oluştu" },
      { status: 500 }
    )
  }
}

