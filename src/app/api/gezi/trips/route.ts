import { NextRequest, NextResponse } from "next/server"
import {
  getTrips,
  createTrip,
  type CreateTripData,
} from "@/lib/geziService"
import { checkGeziAccess } from "@/lib/access-control"

export async function GET(request: NextRequest) {
  // Yetki kontrolü
  const { hasAccess } = await checkGeziAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")
    const upcomingOnly = searchParams.get("upcoming") === "true"
    const search = searchParams.get("q")?.trim()

    const options = {
      isActive: isActive ? isActive === "true" : undefined,
      upcomingOnly,
      search: search || undefined,
    }

    const trips = await getTrips(options)
    
    // Validate response
    if (!Array.isArray(trips)) {
      throw new Error("Geçersiz gezi listesi formatı")
    }
    
    return NextResponse.json({ data: trips })
  } catch (error) {
    console.error("Error fetching trips:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Geziler alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Yetki kontrolü
  const { hasAccess } = await checkGeziAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz bulunmamaktadır" },
      { status: 403 }
    )
  }
  
  try {
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
    
    // Validate required fields
    if (!p.title || typeof p.title !== "string" || !p.title.trim()) {
      return NextResponse.json(
        { error: "Gezi adı zorunludur" },
        { status: 400 }
      )
    }
    if (!p.location || typeof p.location !== "string" || !p.location.trim()) {
      return NextResponse.json(
        { error: "Konum zorunludur" },
        { status: 400 }
      )
    }
    if (!p.startDate || typeof p.startDate !== "string") {
      return NextResponse.json(
        { error: "Başlangıç tarihi zorunludur" },
        { status: 400 }
      )
    }
    if (!p.endDate || typeof p.endDate !== "string") {
      return NextResponse.json(
        { error: "Bitiş tarihi zorunludur" },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(p.startDate as string)
    const endDate = new Date(p.endDate as string)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Geçersiz başlangıç tarihi" },
        { status: 400 }
      )
    }
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Geçersiz bitiş tarihi" },
        { status: 400 }
      )
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "Bitiş tarihi başlangıç tarihinden önce olamaz" },
        { status: 400 }
      )
    }
    
    // Normalize payload: convert empty strings to null/undefined
    const normalizedPayload: CreateTripData = {
      title: String(p.title).trim(),
      location: String(p.location).trim(),
      startDate: p.startDate as string,
      endDate: p.endDate as string,
      description: p.description && typeof p.description === "string" && p.description.trim() ? p.description.trim() : null,
      extraNotes: p.extraNotes && typeof p.extraNotes === "string" && p.extraNotes.trim() ? p.extraNotes.trim() : null,
      price: p.price !== null && p.price !== undefined && p.price !== "" 
        ? (typeof p.price === "number" ? p.price : (isNaN(Number(p.price)) ? null : Number(p.price)))
        : null,
      quota: p.quota !== null && p.quota !== undefined && p.quota !== ""
        ? (typeof p.quota === "number" ? Math.floor(p.quota) : (isNaN(Number(p.quota)) ? null : Math.floor(Number(p.quota))))
        : null,
      isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
    }
    
    const trip = await createTrip(normalizedPayload)
    return NextResponse.json({ data: trip }, { status: 201 })
  } catch (error) {
    console.error("Error creating trip:", error)
    const errorMessage = error instanceof Error ? error.message : "Gezi oluşturulamadı"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

