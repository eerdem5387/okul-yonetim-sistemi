import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

// GET - IB Viewer listesi
export async function GET() {
  try {
    const viewers = await prisma.iBViewer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    // Şifreleri döndürme
    const safeViewers = viewers.map((viewer) => {
      const { password, ...rest } = viewer
      return rest
    })

    return NextResponse.json(safeViewers)
  } catch (error) {
    console.error("Error fetching IB viewers:", error)
    return NextResponse.json({ error: "Failed to fetch IB viewers" }, { status: 500 })
  }
}

// POST - Yeni IB Viewer oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, fullName, email, organization } = body

    // Kullanıcı adı kontrolü
    const existing = await prisma.iBViewer.findUnique({
      where: { username },
    })

    if (existing) {
      return NextResponse.json({ error: "Bu kullanıcı adı zaten kullanılıyor" }, { status: 400 })
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10)

    const viewer = await prisma.iBViewer.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        email,
        organization,
      },
    })

    // Şifreyi döndürme
    const { password: _, ...safeViewer } = viewer

    return NextResponse.json(safeViewer)
  } catch (error) {
    console.error("Error creating IB viewer:", error)
    return NextResponse.json({ error: "Failed to create IB viewer" }, { status: 500 })
  }
}

