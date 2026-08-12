/** Yeni kayıt ve kayıt yenileme sözleşmelerinde sabit ücret kalemleri (TL, KDV dahil). */

export const FIXED_CLOTHING_FEE = "4000"
export const FIXED_COURSE_FEE = "50000"
export const FIXED_STUDY_HALL_FEE = "20000"

export const FIXED_CONTRACT_FEES = {
  announcedClothingFee: FIXED_CLOTHING_FEE,
  studentClothingFee: FIXED_CLOTHING_FEE,
  announcedCourseFee: FIXED_COURSE_FEE,
  studentCourseFee: FIXED_COURSE_FEE,
  announcedStudyHallFee: FIXED_STUDY_HALL_FEE,
  studentStudyHallFee: FIXED_STUDY_HALL_FEE,
} as const

export function formatFixedFeeDisplay(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return new Intl.NumberFormat("tr-TR").format(n)
}

export function applyFixedContractFees<T extends Record<string, unknown>>(data: T): T {
  return { ...data, ...FIXED_CONTRACT_FEES }
}
