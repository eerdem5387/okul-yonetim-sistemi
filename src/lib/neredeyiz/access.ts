import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor, type StaffActor } from "@/lib/hr/actor"
import { hasPermission, isSuperAdmin } from "@/lib/permissions"
import type { PermissionAction } from "@/lib/permissions/constants"

/**
 * Neredeyiz? yetki katmanı.
 *
 * Kimlik her zaman oturum token'ından okunur; istek gövdesindeki reportedBy / markedBy /
 * approvedBy / createdBy alanları yok sayılır.
 *
 * Roller:
 * - Süper yönetici: her şey.
 * - Öğretmen: görüntüleme; yalnızca ATANDIĞI derslerin ünite/konu planını düzenler ve
 *   konularını "devam ediyor" / "onaya gönder" olarak işaretler. Onaylayamaz.
 * - Rehberlik / Baş rehberlik: görüntüleme; rehberi olduğu sınıfların konularını onaylar/reddeder.
 * - Diğer personel: StaffPermission'daki neredeyiz.* izinleri (view/create/edit/delete/approve/export).
 * - Akademik yıl ve okul takvimi (tatiller) değişikliği: settings.edit.
 */

export type NeredeyizActor = StaffActor & { superAdmin: boolean }

export type GuardResult = { ok: true; actor: NeredeyizActor } | { ok: false; response: NextResponse }

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Oturum bulunamadı veya süresi doldu. Lütfen tekrar giriş yapın." }, { status: 401 })
}

export function forbidden(message = "Bu işlem için yetkiniz yok."): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

function isCounselorDept(actor: StaffActor): boolean {
  return actor.department === "REHBERLIK" || actor.department === "BAS_REHBERLIK"
}

/** Aktif bir personel oturumu ister (akademik yıl listesi gibi okul geneli okumalar için). */
export async function requireStaff(request: NextRequest): Promise<GuardResult> {
  const actor = await resolveStaffActor(request)
  if (!actor) return { ok: false, response: unauthorized() }
  return { ok: true, actor: { ...actor, superAdmin: isSuperAdmin(actor.department, actor.staffId) } }
}

/** Kullanıcının neredeyiz.<action> izni var mı (öğretmen/rehberlik varsayılanları dahil)? */
export async function canNeredeyiz(actor: NeredeyizActor, action: PermissionAction): Promise<boolean> {
  if (actor.superAdmin) return true
  if (actor.isTeacher) return action === "view" || action === "create" || action === "edit"
  if (isCounselorDept(actor) && (action === "view" || action === "approve")) return true
  return hasPermission(actor.staffId, actor.department, "neredeyiz", action)
}

/** Öğretmen dışı yönetim izni (ders kabuğu, atama, aksama gibi okul geneli işlemler). */
export async function canManageNeredeyiz(actor: NeredeyizActor, action: PermissionAction): Promise<boolean> {
  if (actor.superAdmin) return true
  if (actor.isTeacher) return false
  if (isCounselorDept(actor)) return hasPermission(actor.staffId, actor.department, "neredeyiz", action)
  return canNeredeyiz(actor, action)
}

export async function requireNeredeyiz(request: NextRequest, action: PermissionAction): Promise<GuardResult> {
  const base = await requireStaff(request)
  if (!base.ok) return base
  if (!(await canNeredeyiz(base.actor, action))) return { ok: false, response: forbidden() }
  return base
}

export async function requireNeredeyizManager(request: NextRequest, action: PermissionAction): Promise<GuardResult> {
  const base = await requireStaff(request)
  if (!base.ok) return base
  if (!(await canManageNeredeyiz(base.actor, action))) return { ok: false, response: forbidden() }
  return base
}

/** Akademik yıl / okul takvimi değişiklikleri: settings.edit */
export async function requireSettingsEdit(request: NextRequest): Promise<GuardResult> {
  const base = await requireStaff(request)
  if (!base.ok) return base
  const a = base.actor
  if (a.superAdmin || (await hasPermission(a.staffId, a.department, "settings", "edit"))) return base
  return { ok: false, response: forbidden("Akademik takvimi değiştirmek için Ayarlar düzenleme yetkisi gerekir.") }
}

/** Öğretmen yalnızca kendi verisini sorgulayabilir; diğerleri neredeyiz.view ile herkesi. */
export function canQueryStaff(actor: NeredeyizActor, staffId: string): boolean {
  if (actor.staffId === staffId) return true
  return !actor.isTeacher
}

async function isAssignedToSubject(staffId: string, subjectId: string): Promise<boolean> {
  const row = await prisma.subjectAssignment.findUnique({
    where: { subjectId_staffId: { subjectId, staffId } },
    select: { id: true },
  })
  return !!row
}

/** Ders planını (ünite/konu) düzenleyebilir mi? Öğretmen: yalnız atandığı ders. */
export async function canEditSubjectPlan(actor: NeredeyizActor, subjectId: string): Promise<boolean> {
  if (actor.superAdmin) return true
  if (actor.isTeacher) return isAssignedToSubject(actor.staffId, subjectId)
  return canManageNeredeyiz(actor, "edit")
}

export async function canMarkTopicProgress(actor: NeredeyizActor, subjectId: string): Promise<boolean> {
  if (actor.superAdmin) return true
  return isAssignedToSubject(actor.staffId, subjectId)
}

/**
 * Konu tamamlamayı onaylayabilir / doğrudan tamamlandı işaretleyebilir mi?
 * Rehberlik: yalnız rehberi olduğu sınıf. Diğer: neredeyiz.approve. Öğretmen: hayır.
 */
export async function canApproveForClass(
  actor: NeredeyizActor,
  classCounselorId: string | null | undefined,
): Promise<boolean> {
  if (actor.superAdmin) return true
  if (actor.isTeacher) return false
  if (isCounselorDept(actor)) {
    if (classCounselorId && classCounselorId === actor.staffId) return true
    // Baş rehberlik veya açıkça approve izni verilmiş rehber tüm sınıfları onaylayabilir
    if (actor.department === "BAS_REHBERLIK") return true
    // Başka sınıflar için yalnız açıkça verilmiş neredeyiz.approve izni
    return hasPermission(actor.staffId, actor.department, "neredeyiz", "approve")
  }
  return hasPermission(actor.staffId, actor.department, "neredeyiz", "approve")
}

/** Bir konunun ders ve sınıf bilgisi (yetki kararları için). */
export async function loadTopicContext(topicId: string) {
  return prisma.topic.findUnique({
    where: { id: topicId },
    select: {
      id: true,
      name: true,
      plannedStartDate: true,
      plannedEndDate: true,
      unit: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              grade: true,
              section: true,
              classId: true,
              academicYearId: true,
              class: { select: { id: true, name: true, counselorId: true } },
            },
          },
        },
      },
    },
  })
}
