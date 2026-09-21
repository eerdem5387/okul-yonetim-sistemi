import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const DEFAULT_COURSES = [
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  "Sosyal Bilgiler",
  "İngilizce",
  "Din Kültürü",
  "Beden Eğitimi",
  "Müzik",
  "Görsel Sanatlar",
  "Teknoloji ve Tasarım",
  "Bilişim Teknolojileri",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Tarih",
  "Coğrafya",
  "Edebiyat",
  "Felsefe",
  "Rehberlik",
]

async function ensureDefaults() {
  const count = await prisma.scheduleCourse.count()
  if (count > 0) return
  await prisma.scheduleCourse.createMany({
    data: DEFAULT_COURSES.map((name, index) => ({
      name,
      sortOrder: index,
      isActive: true,
    })),
    skipDuplicates: true,
  })
}

/** GET /api/schedules/courses?all=1 */
export async function GET(request: NextRequest) {
  try {
    await ensureDefaults()
    const all = request.nextUrl.searchParams.get("all") === "1"
    const courses = await prisma.scheduleCourse.findMany({
      where: all ? undefined : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
    return NextResponse.json({ courses })
  } catch (error) {
    console.error("Error fetching schedule courses:", error)
    return NextResponse.json({ error: "Ders listesi alınamadı" }, { status: 500 })
  }
}

/** POST /api/schedules/courses — { name } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = String(body.name ?? "").trim()
    if (!name) {
      return NextResponse.json({ error: "Ders adı zorunlu" }, { status: 400 })
    }

    const existing = await prisma.scheduleCourse.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.scheduleCourse.update({
          where: { id: existing.id },
          data: { isActive: true, name },
        })
        return NextResponse.json({ course: reactivated, reactivated: true })
      }
      return NextResponse.json({ error: "Bu ders zaten tanımlı" }, { status: 409 })
    }

    const maxOrder = await prisma.scheduleCourse.aggregate({ _max: { sortOrder: true } })
    const course = await prisma.scheduleCourse.create({
      data: {
        name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isActive: true,
      },
    })
    return NextResponse.json({ course })
  } catch (error) {
    console.error("Error creating schedule course:", error)
    return NextResponse.json({ error: "Ders eklenemedi" }, { status: 500 })
  }
}

/** PUT /api/schedules/courses — { id, name?, isActive?, sortOrder? } */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const id = String(body.id ?? "").trim()
    if (!id) {
      return NextResponse.json({ error: "id zorunlu" }, { status: 400 })
    }

    const data: { name?: string; isActive?: boolean; sortOrder?: number } = {}
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (typeof body.isActive === "boolean") data.isActive = body.isActive
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder

    const course = await prisma.scheduleCourse.update({
      where: { id },
      data,
    })
    return NextResponse.json({ course })
  } catch (error) {
    console.error("Error updating schedule course:", error)
    return NextResponse.json({ error: "Ders güncellenemedi" }, { status: 500 })
  }
}

/** DELETE /api/schedules/courses?id= */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim()
    if (!id) {
      return NextResponse.json({ error: "id zorunlu" }, { status: 400 })
    }
    // Soft delete — program geçmişi bozulmasın
    const course = await prisma.scheduleCourse.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true, course })
  } catch (error) {
    console.error("Error deleting schedule course:", error)
    return NextResponse.json({ error: "Ders silinemedi" }, { status: 500 })
  }
}
