/**
 * İş Günü Hesaplama Utility
 * Hafta tatilleri ve resmi tatilleri dikkate alarak iş günlerini hesaplar
 */

export type WeekendDay = "SATURDAY" | "SUNDAY"

interface Holiday {
  name: string
  startDate: string
  endDate: string
}

/**
 * İki tarih arasındaki iş günlerini hesaplar
 * @param startDate Başlangıç tarihi
 * @param endDate Bitiş tarihi
 * @param weekendDays Hafta tatili günleri (["SATURDAY", "SUNDAY"])
 * @param holidays Resmi tatiller listesi
 * @returns İş günü sayısı
 */
export function calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  weekendDays: WeekendDay[] = [],
  holidays: Holiday[] = []
): number {
  let businessDays = 0
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    // Hafta tatili kontrolü
    const dayOfWeek = current.getDay()
    const isSaturday = dayOfWeek === 6
    const isSunday = dayOfWeek === 0
    
    const isWeekend = 
      (weekendDays.includes("SATURDAY") && isSaturday) ||
      (weekendDays.includes("SUNDAY") && isSunday)

    // Resmi tatil kontrolü
    const isHoliday = holidays.some((holiday) => {
      const holidayStart = new Date(holiday.startDate)
      const holidayEnd = new Date(holiday.endDate)
      holidayStart.setHours(0, 0, 0, 0)
      holidayEnd.setHours(0, 0, 0, 0)
      return current >= holidayStart && current <= holidayEnd
    })

    // İş günü ise say
    if (!isWeekend && !isHoliday) {
      businessDays++
    }

    current.setDate(current.getDate() + 1)
  }

  return businessDays
}

/**
 * Belirli bir günün iş günü olup olmadığını kontrol eder
 * @param date Kontrol edilecek tarih
 * @param weekendDays Hafta tatili günleri
 * @param holidays Resmi tatiller listesi
 * @returns İş günü ise true
 */
export function isBusinessDay(
  date: Date,
  weekendDays: WeekendDay[] = [],
  holidays: Holiday[] = []
): boolean {
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  // Hafta tatili kontrolü
  const dayOfWeek = checkDate.getDay()
  const isSaturday = dayOfWeek === 6
  const isSunday = dayOfWeek === 0
  
  const isWeekend = 
    (weekendDays.includes("SATURDAY") && isSaturday) ||
    (weekendDays.includes("SUNDAY") && isSunday)

  if (isWeekend) return false

  // Resmi tatil kontrolü
  const isHoliday = holidays.some((holiday) => {
    const holidayStart = new Date(holiday.startDate)
    const holidayEnd = new Date(holiday.endDate)
    holidayStart.setHours(0, 0, 0, 0)
    holidayEnd.setHours(0, 0, 0, 0)
    return checkDate >= holidayStart && checkDate <= holidayEnd
  })

  return !isHoliday
}

/**
 * Bir tarihten N iş günü sonrasını hesaplar
 * @param startDate Başlangıç tarihi
 * @param businessDaysToAdd Eklenecek iş günü sayısı
 * @param weekendDays Hafta tatili günleri
 * @param holidays Resmi tatiller listesi
 * @returns Hesaplanan tarih
 */
export function addBusinessDays(
  startDate: Date,
  businessDaysToAdd: number,
  weekendDays: WeekendDay[] = [],
  holidays: Holiday[] = []
): Date {
  const result = new Date(startDate)
  result.setHours(0, 0, 0, 0)
  
  let daysAdded = 0
  
  while (daysAdded < businessDaysToAdd) {
    result.setDate(result.getDate() + 1)
    
    if (isBusinessDay(result, weekendDays, holidays)) {
      daysAdded++
    }
  }

  return result
}

/**
 * Tarih aralığındaki tüm günleri listeler ve her birinin iş günü olup olmadığını belirtir
 * @param startDate Başlangıç tarihi
 * @param endDate Bitiş tarihi
 * @param weekendDays Hafta tatili günleri
 * @param holidays Resmi tatiller listesi
 * @returns Gün detayları dizisi
 */
export function getDaysInRange(
  startDate: Date,
  endDate: Date,
  weekendDays: WeekendDay[] = [],
  holidays: Holiday[] = []
): Array<{
  date: Date
  isBusinessDay: boolean
  reason?: "weekend" | "holiday"
}> {
  const days: Array<{
    date: Date
    isBusinessDay: boolean
    reason?: "weekend" | "holiday"
  }> = []
  
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    const isSaturday = dayOfWeek === 6
    const isSunday = dayOfWeek === 0
    
    const isWeekend = 
      (weekendDays.includes("SATURDAY") && isSaturday) ||
      (weekendDays.includes("SUNDAY") && isSunday)

    const holiday = holidays.find((h) => {
      const holidayStart = new Date(h.startDate)
      const holidayEnd = new Date(h.endDate)
      holidayStart.setHours(0, 0, 0, 0)
      holidayEnd.setHours(0, 0, 0, 0)
      return current >= holidayStart && current <= holidayEnd
    })

    days.push({
      date: new Date(current),
      isBusinessDay: !isWeekend && !holiday,
      reason: isWeekend ? "weekend" : holiday ? "holiday" : undefined,
    })

    current.setDate(current.getDate() + 1)
  }

  return days
}

/**
 * Gün adlarını Türkçe olarak döndürür
 */
export const dayNamesInTurkish: Record<number, string> = {
  0: "Pazar",
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
}

/**
 * WeekendDay enum'unu Türkçe'ye çevirir
 */
export const weekendDayLabels: Record<WeekendDay, string> = {
  SATURDAY: "Cumartesi",
  SUNDAY: "Pazar",
}

