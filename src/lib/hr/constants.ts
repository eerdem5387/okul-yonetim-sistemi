import type { StaffDepartment, LeaveType } from "@prisma/client"

/**
 * HR yönetimi (izin onayı, nöbet atama, yönetici notları) için yetkili departmanlar.
 * SUPER_ADMIN: sistem yöneticisi
 * MUDUR / MUDUR_YARDIMCISI: üst yönetim
 */
export const HR_ADMIN_DEPARTMENTS: StaffDepartment[] = [
  "SUPER_ADMIN",
  "MUDUR",
  "MUDUR_YARDIMCISI",
]

export function isHrAdmin(department: StaffDepartment): boolean {
  return HR_ADMIN_DEPARTMENTS.includes(department)
}

export const STAFF_DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  SUPER_ADMIN: "Süper Admin",
  OGRETMEN: "Öğretmen",
  OGRENCI_ISLERI: "Öğrenci İşleri",
  MUDUR: "Müdür",
  MUDUR_YARDIMCISI: "Müdür Yardımcısı",
  REHBERLIK: "Rehberlik",
  BAS_REHBERLIK: "Baş Rehberlik",
  MUHASEBE: "Muhasebe",
  GUZEL_SANATLAR: "Güzel Sanatlar",
  SPOR: "Spor",
  KUTUPHANE: "Kütüphane",
  TEKNIK: "Teknik",
  TEMIZLIK: "Temizlik",
  GUVENLIK: "Güvenlik",
  DIGER: "Diğer",
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Yıllık İzin",
  SICK_REPORT: "Sağlık Raporu",
  EXCUSE: "Mazeret İzni",
  UNPAID: "Ücretsiz İzin",
  HOURLY: "Saatlik Sevk/İzin",
}

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
}
