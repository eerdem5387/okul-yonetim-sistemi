import type { StaffDepartment } from "@prisma/client"

/** Sınıfa rehberlik uzmanı olarak atanabilecek personel departmanları */
export const CLASS_COUNSELOR_DEPARTMENTS: readonly StaffDepartment[] = [
  "REHBERLIK",
  "BAS_REHBERLIK",
]

export function isStaffEligibleAsClassCounselor(department: StaffDepartment): boolean {
  return (CLASS_COUNSELOR_DEPARTMENTS as readonly string[]).includes(department)
}
