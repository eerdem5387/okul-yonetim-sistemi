import type { StaffDepartment } from "@prisma/client"

/** Sınıfa rehberlik uzmanı olarak atanabilecek personel departmanları */
export const CLASS_COUNSELOR_DEPARTMENTS: readonly StaffDepartment[] = [
  "REHBERLIK",
  "BAS_REHBERLIK",
]

export function isStaffEligibleAsClassCounselor(department: StaffDepartment): boolean {
  return (CLASS_COUNSELOR_DEPARTMENTS as readonly string[]).includes(department)
}

/**
 * Ders programı / ÖÇG / kulüp etüdüne sorumlu olarak atanabilecek personel.
 * Rehberlik rehabilitasyon ve öğrenci görüşmeleri için etüt/ders saatlerine girebilir.
 */
export const SCHEDULE_INSTRUCTOR_DEPARTMENTS: readonly StaffDepartment[] = [
  "OGRETMEN",
  ...CLASS_COUNSELOR_DEPARTMENTS,
]

export function isStaffEligibleAsScheduleInstructor(
  department: StaffDepartment
): boolean {
  return (SCHEDULE_INSTRUCTOR_DEPARTMENTS as readonly string[]).includes(department)
}

export function scheduleInstructorDeptLabel(department: string): string {
  if (department === "REHBERLIK") return "Rehberlik"
  if (department === "BAS_REHBERLIK") return "Baş Rehberlik"
  if (department === "OGRETMEN") return "Öğretmen"
  return department
}
