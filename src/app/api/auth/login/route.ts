import { NextRequest, NextResponse } from "next/server"

// Basit authentication - Production'da daha güvenli bir yapı kullanılmalı
const STUDENT_AFFAIRS_USERNAME = process.env.STUDENT_AFFAIRS_USERNAME || "admin"
const STUDENT_AFFAIRS_PASSWORD = process.env.STUDENT_AFFAIRS_PASSWORD || "admin123"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, password, role } = body

        if (role === "student_affairs") {
            if (username === STUDENT_AFFAIRS_USERNAME && password === STUDENT_AFFAIRS_PASSWORD) {
                return NextResponse.json({
                    success: true,
                    token: "student_affairs_token_" + Date.now(),
                    role: "student_affairs"
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

