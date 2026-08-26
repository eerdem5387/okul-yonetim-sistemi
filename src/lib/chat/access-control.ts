import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  isAnnouncementCreatorDepartment,
  isManagerDepartment,
  type ChatActor,
} from "./identity"

/**
 * Yetkilendirme katmanı:
 *   - Hangi aktör hangi hedefle PRIVATE sohbet başlatabilir?
 *   - Hangi aktör GROUP / ANNOUNCEMENT yaratabilir?
 *   - UI kişi seçici için reachable Staff / Parent listesi.
 */

export interface ContactStaff {
  id: string
  firstName: string
  lastName: string
  department: StaffDepartment
  position: string | null
  subject: string | null
}

export interface ContactParent {
  id: string
  displayName: string
  studentTcNumber: string
  studentNames: string[]
  studentClasses: string[]
}

export function canCreateGroup(actor: ChatActor): boolean {
  return actor.kind === "staff" && isAnnouncementCreatorDepartment(actor.department)
}

export function canCreateAnnouncement(actor: ChatActor): boolean {
  return actor.kind === "staff" && isAnnouncementCreatorDepartment(actor.department)
}

/**
 * Veli aktörün ulaşabileceği sınıf id'leri (kendi çocukları için).
 * Çocuk birden fazla sınıfa atanmış olsa bile hepsi dahildir.
 */
async function classIdsForParent(parentId: string): Promise<string[]> {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    select: {
      student: {
        select: {
          classAssignments: { select: { classId: true } },
        },
      },
    },
  })
  const ids = new Set<string>()
  for (const ps of links) {
    for (const ca of ps.student.classAssignments) ids.add(ca.classId)
  }
  return Array.from(ids)
}

/**
 * Bir öğretmenin yetkili olduğu sınıf id'leri (danışman + ders programı).
 */
async function classIdsForTeacher(staffId: string): Promise<string[]> {
  const [counseled, scheduled] = await Promise.all([
    prisma.class.findMany({ where: { counselorId: staffId }, select: { id: true } }),
    prisma.schedule.findMany({
      where: { teacherId: staffId },
      select: { classId: true },
      distinct: ["classId"],
    }),
  ])
  const ids = new Set<string>()
  for (const c of counseled) ids.add(c.id)
  for (const s of scheduled) ids.add(s.classId)
  return Array.from(ids)
}

/**
 * Bir Staff'ın aktif/yetkilendirilmiş olup olmadığını döner (giriş yetkisi olan departman).
 */
const ACTIVE_STAFF_DEPARTMENTS: StaffDepartment[] = [
  "SUPER_ADMIN",
  "MUDUR",
  "MUDUR_YARDIMCISI",
  "KURUCU",
  "OGRENCI_ISLERI",
  "REHBERLIK",
  "BAS_REHBERLIK",
  "OGRETMEN",
]

/**
 * Aktör için ulaşılabilir Staff listesi.
 *  - Yönetici Staff: tüm aktif Staff (kendisi hariç)
 *  - Öğretmen Staff: tüm aktif Staff (kendisi hariç)
 *  - Diğer Staff: tüm aktif Staff (kendisi hariç)
 *  - Parent: çocuklarının sınıflarındaki danışman/öğretmenler + tüm Yönetici Staff
 */
export async function getReachableStaffForActor(actor: ChatActor): Promise<ContactStaff[]> {
  if (actor.kind === "staff") {
    const rows = await prisma.staff.findMany({
      where: {
        isActive: true,
        department: { in: ACTIVE_STAFF_DEPARTMENTS },
        id: { not: actor.staffId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        subject: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })
    return rows
  }

  // Parent
  const classIds = await classIdsForParent(actor.parentId)

  const rows = await prisma.staff.findMany({
    where: {
      isActive: true,
      OR: [
        { department: { in: ["SUPER_ADMIN", "MUDUR", "MUDUR_YARDIMCISI", "OGRENCI_ISLERI", "REHBERLIK", "BAS_REHBERLIK"] } },
        { assignedClasses: classIds.length ? { some: { id: { in: classIds } } } : undefined },
        { teacherSchedules: classIds.length ? { some: { classId: { in: classIds } } } : undefined },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      position: true,
      subject: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
  return rows
}

/**
 * Aktör için ulaşılabilir Parent listesi.
 *  - Yönetici Staff: tüm aktif Parent
 *  - Öğretmen: kendi danışmanlığındaki/ders verdiği sınıfların velileri
 *  - Diğer Staff: hiç (yalnızca Staff ile DM)
 *  - Parent: BAŞKA velilere DM yok → boş liste
 */
export async function getReachableParentsForActor(actor: ChatActor): Promise<ContactParent[]> {
  if (actor.kind === "parent") return []

  if (!actor.isManager && !actor.isTeacher) return []

  let parentRows
  if (actor.isManager) {
    parentRows = await prisma.parent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        studentTcNumber: true,
        students: {
          select: {
            parentName: true,
            student: {
              select: {
                firstName: true,
                lastName: true,
                grade: true,
                classAssignments: {
                  select: { class: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } else {
    // Öğretmen
    const classIds = await classIdsForTeacher(actor.staffId)
    if (classIds.length === 0) return []
    parentRows = await prisma.parent.findMany({
      where: {
        isActive: true,
        students: {
          some: {
            student: {
              classAssignments: { some: { classId: { in: classIds } } },
            },
          },
        },
      },
      select: {
        id: true,
        studentTcNumber: true,
        students: {
          select: {
            parentName: true,
            student: {
              select: {
                firstName: true,
                lastName: true,
                grade: true,
                classAssignments: {
                  select: { class: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  return parentRows.map((p) => {
    const studentNames = p.students.map((s) =>
      `${s.student.firstName} ${s.student.lastName}`.trim()
    )
    const classes = new Set<string>()
    for (const s of p.students) {
      for (const ca of s.student.classAssignments) {
        if (ca.class?.name) classes.add(ca.class.name)
      }
    }
    const display = p.students[0]?.parentName?.trim() || studentNames[0] || "Veli"
    return {
      id: p.id,
      displayName: display,
      studentTcNumber: p.studentTcNumber,
      studentNames,
      studentClasses: Array.from(classes),
    }
  })
}

/**
 * Aktör 'targetStaffId' ile DM başlatabilir mi?
 */
export async function canStartPrivateWithStaff(
  actor: ChatActor,
  targetStaffId: string
): Promise<boolean> {
  if (actor.kind === "staff" && actor.staffId === targetStaffId) return false
  const target = await prisma.staff.findUnique({
    where: { id: targetStaffId },
    select: { id: true, isActive: true, department: true },
  })
  if (!target || !target.isActive) return false
  if (!ACTIVE_STAFF_DEPARTMENTS.includes(target.department)) return false

  if (actor.kind === "staff") return true // Tüm aktif Staff kendi aralarında DM

  // Parent → Staff
  // Yönetici Staff'a her parent ulaşabilir
  if (isManagerDepartment(target.department)) return true

  // Aksi halde, target çocukların sınıfında olmalı (counselor veya öğretmen)
  const classIds = await classIdsForParent(actor.parentId)
  if (classIds.length === 0) return false

  const isCounselor = await prisma.class.count({
    where: { id: { in: classIds }, counselorId: targetStaffId },
  })
  if (isCounselor > 0) return true

  const isScheduled = await prisma.schedule.count({
    where: { classId: { in: classIds }, teacherId: targetStaffId },
  })
  return isScheduled > 0
}

/**
 * Aktör 'targetParentId' ile DM başlatabilir mi?
 */
export async function canStartPrivateWithParent(
  actor: ChatActor,
  targetParentId: string
): Promise<boolean> {
  if (actor.kind === "parent") return false // veli ↔ veli DM yok

  const target = await prisma.parent.findUnique({
    where: { id: targetParentId },
    select: { id: true, isActive: true },
  })
  if (!target || !target.isActive) return false

  if (actor.isManager) return true

  if (!actor.isTeacher) return false

  const teacherClassIds = await classIdsForTeacher(actor.staffId)
  if (teacherClassIds.length === 0) return false

  // Hedef velinin çocuklarından biri öğretmenin sınıflarında olmalı
  const linked = await prisma.parentStudent.count({
    where: {
      parentId: targetParentId,
      student: {
        classAssignments: { some: { classId: { in: teacherClassIds } } },
      },
    },
  })
  return linked > 0
}
