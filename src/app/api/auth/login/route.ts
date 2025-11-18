import { NextRequest, NextResponse } from "next/server"

// Basit authentication - Production'da daha güvenli bir yapı kullanılmalı
const SECRETARY_USERNAME = process.env.SECRETARY_USERNAME || "admin"
const SECRETARY_PASSWORD = process.env.SECRETARY_PASSWORD || "admin123"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, password, role } = body

        if (role === "secretary") {
            if (username === SECRETARY_USERNAME && password === SECRETARY_PASSWORD) {
                return NextResponse.json({
                    success: true,
                    token: "secretary_token_" + Date.now(),
                    role: "secretary"
                })
            } else {
                return NextResponse.json(
                    { error: "Kullanıcı adı veya şifre hatalı!" },
                    { status: 401 }
                )
            }
        }

        return NextResponse.json(
            { error: "Geçersiz rol!" },
            { status: 400 }
        )
    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json(
            { error: "Giriş yapılırken bir hata oluştu!" },
            { status: 500 }
        )
    }
}

