/** Kayıt yenileme / yeni kayıt form alan doğrulama ve biçimlendirme. */

const TR = "tr-TR"

/** Ad-soyad: her kelimenin ilk harfi büyük, kalanı küçük (Türkçe). */
export function formatPersonName(input: string): string {
  const cleaned = input.replace(/[^\p{L}\s'\-]/gu, "")
  return cleaned
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      if (!part) return part
      const first = part.charAt(0).toLocaleUpperCase(TR)
      const rest = part.slice(1).toLocaleLowerCase(TR)
      return first + rest
    })
    .join("")
}

export function formatTcInput(input: string): string {
  return input.replace(/\D/g, "").slice(0, 11)
}

export function isValidTc(tc: string): boolean {
  return /^\d{11}$/.test(tc.trim())
}

/** Telefon: sadece rakam, baştaki 0 kaldırılır, en fazla 10 hane. */
export function formatPhoneInput(input: string): string {
  let digits = input.replace(/\D/g, "")
  while (digits.startsWith("0")) {
    digits = digits.slice(1)
  }
  return digits.slice(0, 10)
}

/** 10 haneli, 0 ile başlamayan Türkiye cep/sabit numarası. */
export function isValidPhone(phone: string): boolean {
  return /^[1-9]\d{9}$/.test(phone.trim())
}

export function isNonEmpty(value: unknown): boolean {
  return String(value ?? "").trim().length > 0
}

export function isValidFeeAmount(value: unknown): boolean {
  const s = String(value ?? "").trim()
  if (!s) return false
  const n = Number(s.replace(",", "."))
  return Number.isFinite(n) && n >= 0
}

export function isValidIsoOrDisplayDate(value: unknown): boolean {
  const s = String(value ?? "").trim()
  if (!s) return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s)
    return !Number.isNaN(d.getTime())
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [day, month, year] = s.split(".")
    const d = new Date(`${year}-${month}-${day}`)
    return !Number.isNaN(d.getTime())
  }
  return false
}

export type RegistrationContractFields = {
  studentName: string
  studentClass: string
  studentTC: string
  studentBirthDate: string
  schoolLicenseNo: string
  contractNo: string
  registrationResponsible: string
  registrationDate: string
  academicYear: string
  announcedTuitionFee: string
  announcedClothingFee: string
  announcedCourseFee: string
  announcedStudyHallFee: string
  announcedTotal: string
  studentTuitionFee: string
  studentClothingFee: string
  studentCourseFee: string
  studentStudyHallFee: string
  studentTotal: string
  paymentPlan: string
  contractDate: string
  registrarName: string
}

export type RegistrationUniformFields = {
  uniformSize: string
  uniformDeliveryDate: string
  uniformItems: string[]
  paymentReceived: boolean
  paymentNotReceived: boolean
}

export type StudentIdentityFields = {
  firstName: string
  lastName: string
  tcNumber: string
  birthDate: string
  grade: string
  address: string
  motherName: string
  motherTc: string
  motherPhone: string
  motherAddress: string
  motherOccupation: string
  fatherName: string
  fatherTc: string
  fatherPhone: string
  fatherAddress: string
  fatherOccupation: string
}

function pushRequired(
  errors: string[],
  ok: boolean,
  label: string
): void {
  if (!ok) errors.push(`${label} zorunludur.`)
}

export function validateContractFields(
  data: RegistrationContractFields,
  options?: { requireAcademicYearId?: boolean; academicYearId?: string }
): string[] {
  const errors: string[] = []

  pushRequired(errors, isNonEmpty(data.studentName), "Öğrenci adı soyadı")
  pushRequired(errors, isNonEmpty(data.studentClass), "Sınıf")
  if (!isValidTc(data.studentTC)) {
    errors.push("Öğrenci TC Kimlik No 11 haneli olmalıdır.")
  }
  pushRequired(errors, isValidIsoOrDisplayDate(data.studentBirthDate), "Doğum tarihi")
  pushRequired(errors, isNonEmpty(data.schoolLicenseNo), "Okul ruhsat no")
  pushRequired(errors, isNonEmpty(data.contractNo), "Sözleşme no")
  pushRequired(errors, isNonEmpty(data.registrationResponsible), "Kayıt sorumlusu")
  pushRequired(errors, isValidIsoOrDisplayDate(data.registrationDate), "Kayıt tarihi")
  pushRequired(errors, isNonEmpty(data.academicYear), "Eğitim öğretim yılı")
  if (options?.requireAcademicYearId && !isNonEmpty(options.academicYearId)) {
    errors.push("Eğitim öğretim yılı seçimi zorunludur.")
  }

  const feePairs: Array<[string, string]> = [
    [data.announcedTuitionFee, "İlan edilen öğrenim ücreti"],
    [data.announcedClothingFee, "İlan edilen kıyafet ücreti"],
    [data.announcedCourseFee, "İlan edilen takviye kursu ücreti"],
    [data.announcedStudyHallFee, "İlan edilen etüt ücreti"],
    [data.announcedTotal, "İlan edilen ücretler toplamı"],
    [data.studentTuitionFee, "Öğrenci öğrenim ücreti"],
    [data.studentClothingFee, "Öğrenci kıyafet ücreti"],
    [data.studentCourseFee, "Öğrenci takviye kursu ücreti"],
    [data.studentStudyHallFee, "Öğrenci etüt ücreti"],
    [data.studentTotal, "Öğrenci ücretleri toplamı"],
  ]
  for (const [value, label] of feePairs) {
    if (!isValidFeeAmount(value)) {
      errors.push(`${label} zorunludur ve geçerli bir tutar olmalıdır.`)
    }
  }

  pushRequired(errors, isNonEmpty(data.paymentPlan), "Ödeme planı")
  pushRequired(errors, isValidIsoOrDisplayDate(data.contractDate), "Sözleşme tarihi")
  pushRequired(errors, isNonEmpty(data.registrarName), "Kaydı yapan")

  return errors
}

export function validateUniformFields(data: RegistrationUniformFields): string[] {
  const errors: string[] = []
  pushRequired(errors, isNonEmpty(data.uniformSize), "Forma bedeni")
  pushRequired(errors, isValidIsoOrDisplayDate(data.uniformDeliveryDate), "Teslimat tarihi")
  if (!data.uniformItems?.length) {
    errors.push("En az bir forma kalemi seçilmelidir.")
  }
  if (!data.paymentReceived && !data.paymentNotReceived) {
    errors.push("Ödeme durumu seçilmelidir (Ödeme Alındı veya Ödeme Alınmadı).")
  }
  if (data.paymentReceived && data.paymentNotReceived) {
    errors.push("Ödeme durumu için yalnızca bir seçenek işaretlenmelidir.")
  }
  return errors
}

export function validateStudentIdentityFields(data: StudentIdentityFields): string[] {
  const errors: string[] = []

  pushRequired(errors, isNonEmpty(data.firstName), "Öğrenci adı")
  pushRequired(errors, isNonEmpty(data.lastName), "Öğrenci soyadı")
  if (!isValidTc(data.tcNumber)) {
    errors.push("Öğrenci TC Kimlik No 11 haneli olmalıdır.")
  }
  pushRequired(errors, isValidIsoOrDisplayDate(data.birthDate), "Öğrenci doğum tarihi")
  pushRequired(errors, isNonEmpty(data.grade), "Öğrenci sınıfı")
  pushRequired(errors, isNonEmpty(data.address), "Öğrenci adresi")

  pushRequired(errors, isNonEmpty(data.motherName), "Anne adı soyadı")
  if (!isValidTc(data.motherTc)) {
    errors.push("Anne TC Kimlik No 11 haneli olmalıdır.")
  }
  if (!isValidPhone(data.motherPhone)) {
    errors.push("Anne telefonu 10 haneli olmalı ve 0 ile başlamamalıdır (örn: 5XXXXXXXXX).")
  }
  pushRequired(errors, isNonEmpty(data.motherAddress), "Anne adresi")
  pushRequired(errors, isNonEmpty(data.motherOccupation), "Anne mesleği")

  pushRequired(errors, isNonEmpty(data.fatherName), "Baba adı soyadı")
  if (!isValidTc(data.fatherTc)) {
    errors.push("Baba TC Kimlik No 11 haneli olmalıdır.")
  }
  if (!isValidPhone(data.fatherPhone)) {
    errors.push("Baba telefonu 10 haneli olmalı ve 0 ile başlamamalıdır (örn: 5XXXXXXXXX).")
  }
  pushRequired(errors, isNonEmpty(data.fatherAddress), "Baba adresi")
  pushRequired(errors, isNonEmpty(data.fatherOccupation), "Baba mesleği")

  return errors
}

export function formatValidationAlert(errors: string[]): string {
  const unique = [...new Set(errors)]
  return `⚠️ Lütfen aşağıdaki zorunlu alanları düzeltin:\n\n${unique
    .map((e, i) => `${i + 1}. ${e}`)
    .join("\n")}`
}
