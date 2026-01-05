import { NextRequest, NextResponse } from "next/server"
import { getTrip, updateTrip, type UpdateTripData } from "@/lib/geziService"
import { checkGeziAccess } from "@/lib/access-control"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  // Yetki kontrolü
  const { hasAccess } = await checkGeziAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }
  
  try {
    const { id } = await context.params
    
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Geçersiz gezi ID" },
        { status: 400 }
      )
    }

    const trip = await getTrip(id)
    
    if (!trip || typeof trip !== "object") {
      return NextResponse.json(
        { error: "Gezi bulunamadı" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ data: trip })
  } catch (error) {
    console.error("Error fetching trip:", error)
    const errorMessage = error instanceof Error ? error.message : "Gezi bulunamadı"
    // Check if it's a 404 error
    if (errorMessage.includes("bulunamadı") || errorMessage.includes("404")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  // Yetki kontrolü
  const { hasAccess } = await checkGeziAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }
  
  try {
    const { id } = await context.params
    
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Geçersiz gezi ID" },
        { status: 400 }
      )
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Geçersiz JSON formatı" },
        { status: 400 }
      )
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      )
    }

    const p = payload as Record<string, unknown>
    
    // Normalize payload: convert empty strings to null/undefined
    const normalizedPayload: UpdateTripData = {}
    
    if (p.title !== undefined) {
      if (typeof p.title !== "string" || !p.title.trim()) {
        return NextResponse.json(
          { error: "Gezi adı geçersiz" },
          { status: 400 }
        )
      }
      normalizedPayload.title = p.title.trim()
    }
    
    if (p.location !== undefined) {
      if (typeof p.location !== "string" || !p.location.trim()) {
        return NextResponse.json(
          { error: "Konum geçersiz" },
          { status: 400 }
        )
      }
      normalizedPayload.location = p.location.trim()
    }
    
    if (p.startDate !== undefined) {
      if (typeof p.startDate !== "string") {
        return NextResponse.json(
          { error: "Başlangıç tarihi geçersiz" },
          { status: 400 }
        )
      }
      const date = new Date(p.startDate)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Geçersiz başlangıç tarihi" },
          { status: 400 }
        )
      }
      normalizedPayload.startDate = p.startDate
    }
    
    if (p.endDate !== undefined) {
      if (typeof p.endDate !== "string") {
        return NextResponse.json(
          { error: "Bitiş tarihi geçersiz" },
          { status: 400 }
        )
      }
      const date = new Date(p.endDate)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Geçersiz bitiş tarihi" },
          { status: 400 }
        )
      }
      normalizedPayload.endDate = p.endDate
    }
    
    // Validate date range if both dates are provided
    if (normalizedPayload.startDate && normalizedPayload.endDate) {
      const start = new Date(normalizedPayload.startDate)
      const end = new Date(normalizedPayload.endDate)
      if (end < start) {
        return NextResponse.json(
          { error: "Bitiş tarihi başlangıç tarihinden önce olamaz" },
          { status: 400 }
        )
      }
    }
    
    if (p.description !== undefined) {
      normalizedPayload.description = p.description && typeof p.description === "string" && p.description.trim() ? p.description.trim() : null
    }
    
    if (p.extraNotes !== undefined) {
      normalizedPayload.extraNotes = p.extraNotes && typeof p.extraNotes === "string" && p.extraNotes.trim() ? p.extraNotes.trim() : null
    }
    
    if (p.price !== undefined) {
      normalizedPayload.price = p.price !== null && p.price !== "" && p.price !== undefined
        ? (typeof p.price === "number" ? p.price : (isNaN(Number(p.price)) ? null : Number(p.price)))
        : null
    }
    
    if (p.quota !== undefined) {
      normalizedPayload.quota = p.quota !== null && p.quota !== "" && p.quota !== undefined
        ? (typeof p.quota === "number" ? Math.floor(p.quota) : (isNaN(Number(p.quota)) ? null : Math.floor(Number(p.quota))))
        : null
    }
    
    if (p.isActive !== undefined) {
      normalizedPayload.isActive = Boolean(p.isActive)
    }
    
    if (Object.keys(normalizedPayload).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek alan bulunamadı" },
        { status: 400 }
      )
    }
    
    const trip = await updateTrip(id, normalizedPayload)
    return NextResponse.json({ data: trip })
  } catch (error) {
    console.error("Error updating trip:", error)
    const errorMessage = error instanceof Error ? error.message : "Gezi güncellenemedi"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

