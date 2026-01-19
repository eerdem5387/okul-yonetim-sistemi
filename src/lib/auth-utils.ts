/**
 * Auth Utility Functions
 * Basit yetkilendirme kontrolleri için helper fonksiyonlar
 */

export type UserRole = "admin" | "principal" | "student_affairs" | "counselor" | "head_counselor" | "teacher"

export interface UserPermissions {
  canManageClasses: boolean
  canApproveSchedules: boolean
  canManageStaff: boolean
  canManageStudents: boolean
  canViewAllClasses: boolean
  canManageApplications: boolean
  canManageOfferMeetings: boolean
  canManageTrips: boolean
  canManageClubs: boolean
  canManageIBActivities: boolean
  canManageParentMeetings: boolean
  canManageNeredeyiz: boolean
  canAddPrincipal: boolean
}

export function getRoleFromDepartment(department: string): UserRole {
  switch (department) {
    case "MUDUR":
      return "principal"
    case "MUDUR_YARDIMCISI":
    case "OGRENCI_ISLERI":
      return "student_affairs"
    case "BAS_REHBERLIK":
      return "head_counselor"
    case "REHBERLIK":
      return "counselor"
    case "OGRETMEN":
      return "teacher"
    default:
      return "teacher"
  }
}

export function getPermissions(role: UserRole): UserPermissions {
  const isAdmin = role === "admin"
  const isPrincipal = role === "principal"
  const isStudentAffairs = role === "student_affairs"
  const isHeadCounselor = role === "head_counselor"
  const isCounselor = role === "counselor"
  const isTeacher = role === "teacher"

  return {
    canManageClasses: isAdmin || isPrincipal || isStudentAffairs || isCounselor || isHeadCounselor,
    canApproveSchedules: isAdmin || isPrincipal,
    canManageStaff: isAdmin || isPrincipal || isStudentAffairs,
    canManageStudents: !isTeacher,
    canViewAllClasses: isAdmin || isPrincipal || isStudentAffairs || isHeadCounselor,
    canManageApplications: isAdmin || isPrincipal || isStudentAffairs || isHeadCounselor,
    canManageOfferMeetings: isAdmin || isPrincipal || isStudentAffairs || isHeadCounselor,
    canManageTrips: !isTeacher,
    canManageClubs: !isTeacher,
    canManageIBActivities: !isTeacher,
    canManageParentMeetings: !isTeacher,
    canManageNeredeyiz: !isTeacher, // Öğretmenler de erişebilir (sadece kendi dersleri)
    canAddPrincipal: isAdmin,
  }
}

export function hasPermission(role: UserRole | null, permission: keyof UserPermissions): boolean {
  if (!role) return false
  const permissions = getPermissions(role)
  return permissions[permission]
}

// Client-side auth check
export function getClientAuth() {
  if (typeof window === "undefined") return null
  
  return {
    role: localStorage.getItem("auth_role") as UserRole | null,
    staffId: localStorage.getItem("staff_id"),
    staffName: localStorage.getItem("staff_name"),
    department: localStorage.getItem("staff_department"),
    token: localStorage.getItem("auth_token"),
  }
}

// Check if user can access a specific class (for counselors)
export async function canAccessClass(staffId: string, classId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/classes/${classId}`)
    if (!response.ok) return false
    
    const data = await response.json()
    return data.class.counselorId === staffId
  } catch {
    return false
  }
}

