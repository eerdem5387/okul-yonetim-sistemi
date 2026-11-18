import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { k12GradeWhereClause } from "@/lib/student-grade-level"
import { resolveStaffActor } from "@/lib/hr/actor"

/**
 * İki kullanım:
 *  1) Gezi başvuru sitesi (gezi.leventokullari.com): `?tcNumber=` ile TEK öğrenci (KVKK gereği yalnız TC ile arama).
 *     Yanıt: id, ad, sınıf, TC.
 *  2) Görüşler ekranı (web + mobil, personel oturumu ile): TC verilmezse 5–12. sınıf öğrenci listesi
 *     (yalnızca id, ad, soyad, sınıf — TC dahil edilmez). Oturum yoksa boş liste döner.
 */

const ALLOWED_ORIGINS = [
  "https://gezi.leventokullari.com",
  "http://localhost:3000",
  "http://localhost:3001",
]

/** Yalnızca izinli sitelere CORS izni verilir (eskiden diğer tüm sitelere `*` veriliyordu). */
function applyCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin")
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set("Vary", "Origin")
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

function listResponse(request: NextRequest, list: unknown[]): NextResponse {
  return applyCors(
    request,
    NextResponse.json({
      students: list,
      data: list,
      success: true,
      count: list.length,
    })
  )
}

export async function OPTIONS(request: NextRequest) {
  return applyCors(request, new NextResponse(null, { status: 200 }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tcNumber = searchParams.get("tcNumber")?.trim() || ""

    if (!tcNumber) {
      // Görüşler ekranı: yalnızca personel oturumu ile öğrenci listesi
      const actor = await resolveStaffActor(request)
      if (!actor) return listResponse(request, [])

      const students = await prisma.student.findMany({
        where: k12GradeWhereClause(),
        select: { id: true, firstName: true, lastName: true, grade: true },
        orderBy: [{ grade: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
      })
      return listResponse(
        request,
        students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          fullName: `${s.firstName} ${s.lastName}`,
          grade: s.grade,
        }))
      )
    }

    // TC numarası sadece rakam olmalı ve 11 haneli olmalı
    const cleanedTc = tcNumber.replace(/\D/g, "")
    if (cleanedTc.length !== 11) {
      return listResponse(request, [])
    }

    const students = await prisma.student.findMany({
      where: { AND: [k12GradeWhereClause(), { tcNumber: { equals: cleanedTc } }] },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        tcNumber: true,
      },
      take: 1, // TC numarası unique olduğu için sadece 1 sonuç beklenir
    })

    return listResponse(
      request,
      students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: `${s.firstName} ${s.lastName}`,
        grade: s.grade,
        tcNumber: s.tcNumber,
      }))
    )
  } catch (error) {
    console.error("Error fetching public students:", error)
    return NextResponse.json(
      { error: "Öğrenci listesi alınamadı" },
      { status: 500 }
    )
  }
}
