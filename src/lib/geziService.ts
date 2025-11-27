/**
 * Gezi Başvuru Sistemi API Servis Katmanı
 * gezi-basvuru-sistemi API'lerini çağıran helper fonksiyonlar
 */

const GEZI_API_URL = process.env.NEXT_PUBLIC_GEZI_API_URL || process.env.GEZI_API_URL || ""
const SERVICE_API_SECRET = process.env.SERVICE_API_SECRET || ""

if (!GEZI_API_URL) {
  console.warn("GEZI_API_URL is not configured")
}

if (!SERVICE_API_SECRET) {
  console.warn("SERVICE_API_SECRET is not configured - API requests will fail")
}

export interface Trip {
  id: string
  title: string
  description: string | null
  extraNotes: string | null
  location: string
  startDate: string
  endDate: string
  price: number | null
  quota: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    applications: number
  }
}

export interface TripApplication {
  id: string
  tripId: string
  ogrenciAdSoyad: string
  veliAdSoyad: string
  ogrenciSinifi: string
  veliTelefon: string
  ogrenciTelefon: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  updatedAt: string
}

export interface TripStats {
  totalTrips: number
  activeTrips: number
  upcomingTrips: number
  totalApplications: number
  monthlyApplications: number
}

export interface CreateTripData {
  title: string
  description?: string | null
  extraNotes?: string | null
  location: string
  startDate: string
  endDate: string
  price?: number | null
  quota?: number | null
  isActive?: boolean
}

export interface UpdateTripData {
  title?: string
  description?: string | null
  extraNotes?: string | null
  location?: string
  startDate?: string
  endDate?: string
  price?: number | null
  quota?: number | null
  isActive?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * API isteği için header'ları hazırla
 */
function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Service-Secret": SERVICE_API_SECRET,
  }
}

/**
 * API hatası kontrolü ve mesaj çıkarma
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    try {
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } else {
        const text = await response.text()
        if (text) errorMessage = text
      }
    } catch (parseError) {
      // JSON parse hatası, varsayılan mesajı kullan
      console.error("Error parsing error response:", parseError)
    }
    throw new Error(errorMessage)
  }
  
  try {
    return await response.json()
  } catch (jsonError) {
    console.error("Error parsing JSON response:", jsonError)
    throw new Error("Geçersiz yanıt formatı")
  }
}

/**
 * Gezileri listele
 */
export async function getTrips(options?: {
  isActive?: boolean
  upcomingOnly?: boolean
  search?: string
}): Promise<Trip[]> {
  if (!GEZI_API_URL) {
    throw new Error("GEZI_API_URL environment variable tanımlı değil")
  }

  const params = new URLSearchParams()
  if (options?.isActive !== undefined) {
    params.append("isActive", String(options.isActive))
  }
  if (options?.upcomingOnly) {
    params.append("upcoming", "true")
  }
  if (options?.search) {
    params.append("q", options.search)
  }

  const url = `${GEZI_API_URL}/api/trips${params.toString() ? `?${params.toString()}` : ""}`
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  })

  const result = await handleResponse<{ data: Trip[] }>(response)
  return result.data
}

/**
 * Gezi detayını getir
 */
export async function getTrip(tripId: string): Promise<Trip> {
  if (!GEZI_API_URL) {
    throw new Error("GEZI_API_URL environment variable tanımlı değil")
  }

  const url = `${GEZI_API_URL}/api/trips/${tripId}`
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  })

  const result = await handleResponse<{ data: Trip }>(response)
  return result.data
}

/**
 * Yeni gezi oluştur
 */
export async function createTrip(data: CreateTripData): Promise<Trip> {
  if (!GEZI_API_URL) {
    throw new Error("GEZI_API_URL environment variable tanımlı değil")
  }

  const url = `${GEZI_API_URL}/api/trips`
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  const result = await handleResponse<{ data: Trip }>(response)
  return result.data
}

/**
 * Gezi güncelle
 */
export async function updateTrip(tripId: string, data: UpdateTripData): Promise<Trip> {
  if (!GEZI_API_URL) {
    throw new Error("GEZI_API_URL environment variable tanımlı değil")
  }

  const url = `${GEZI_API_URL}/api/trips/${tripId}`
  const response = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  const result = await handleResponse<{ data: Trip }>(response)
  return result.data
}

/**
 * Gezi başvurularını listele
 */
export async function getTripApplications(
  tripId: string,
  options?: {
    page?: number
    limit?: number
    search?: string
  }
): Promise<PaginatedResponse<TripApplication>> {
  if (!GEZI_API_URL) {
    throw new Error("GEZI_API_URL environment variable tanımlı değil")
  }

  const params = new URLSearchParams()
  if (options?.page) {
    params.append("page", String(options.page))
  }
  if (options?.limit) {
    params.append("limit", String(options.limit))
  }
  if (options?.search) {
    params.append("q", options.search)
  }

  const url = `${GEZI_API_URL}/api/trips/${tripId}/applications${params.toString() ? `?${params.toString()}` : ""}`
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  })

  return handleResponse<PaginatedResponse<TripApplication>>(response)
}

/**
 * Gezi başvurularını Excel olarak indir
 */
export async function exportTripApplications(tripId: string): Promise<Blob> {
  if (!GEZI_API_URL) {
    throw new Error("GEZI_API_URL environment variable tanımlı değil")
  }

  const url = `${GEZI_API_URL}/api/trips/${tripId}/applications/export`
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Bilinmeyen hata" }))
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.blob()
}

/**
 * Gezi istatistiklerini getir
 */
export async function getTripStats(): Promise<TripStats> {
  if (!GEZI_API_URL) {
    throw new Error("GEZI_API_URL environment variable tanımlı değil")
  }

  const url = `${GEZI_API_URL}/api/trips/stats`
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  })

  const result = await handleResponse<{ data: TripStats }>(response)
  return result.data
}

