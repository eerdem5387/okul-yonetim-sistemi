import type { NotificationPriority, NotificationType, Prisma, ProgressStatus, StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  canApproveForClass,
  canMarkTopicProgress,
  loadTopicContext,
  type NeredeyizActor,
} from "@/lib/neredeyiz/access"
import { dayKey, keyToDate, todayKey } from "@/lib/neredeyiz/calendar"

/**
 * Konu ilerleme kuralları (tek yer):
 *
 * Öğretmen (derse atanmış):  PLANLANDI ⇄ DEVAM_EDIYOR → PENDING_APPROVAL (onaya gönder)
 *                             Onaylanmış (TAMAMLANDI) konuyu geri alamaz.
 * Onaylayıcı (sınıf rehberi, baş rehberlik, neredeyiz.approve):
 *                             PENDING_APPROVAL → TAMAMLANDI (onay) ya da DEVAM_EDIYOR (ret),
 *                             doğrudan TAMAMLANDI / ERTELENDI / PLANLANDI (sıfırlama).
 * Kendi bildirdiği konuyu onaylayamaz (süper yönetici hariç).
 */

export const PROGRESS_STATUSES: ProgressStatus[] = [
  "PLANLANDI",
  "DEVAM_EDIYOR",
  "PENDING_APPROVAL",
  "TAMAMLANDI",
  "ERTELENDI",
]
const TEACHER_STATUSES = new Set<ProgressStatus>(["PLANLANDI", "DEVAM_EDIYOR", "PENDING_APPROVAL"])

export type ProgressChangeInput = {
  status?: unknown
  actualStartDate?: unknown
  actualEndDate?: unknown
  notes?: unknown
}

export type ServiceResult<T> = { ok: true; data: T; created?: boolean } | { ok: false; status: number; error: string }

function parseDay(raw: unknown): { ok: true; value: Date | null | undefined } | { ok: false } {
  if (raw === undefined) return { ok: true, value: undefined }
  if (raw === null || raw === "") return { ok: true, value: null }
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return { ok: false }
  // Gün olarak sakla (okul saatine göre), saat bilgisi karışıklık yaratmasın
  return { ok: true, value: keyToDate(dayKey(d)) }
}

function classLabel(s: { grade: number; section: string | null; class?: { name: string } | null }): string {
  return s.class?.name ?? `${s.grade}${s.section ? `/${s.section}` : ""}`
}

export async function notify(params: {
  type: NotificationType
  title: string
  message: string
  targetRole?: StaffDepartment | null
  targetUserId?: string | null
  priority?: NotificationPriority
  relatedSubjectId?: string | null
  relatedTopicId?: string | null
  relatedStaffId?: string | null
}) {
  try {
    await prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        targetRole: params.targetRole ?? null,
        targetUserId: params.targetUserId ?? null,
        priority: params.priority ?? "NORMAL",
        relatedSubjectId: params.relatedSubjectId ?? null,
        relatedTopicId: params.relatedTopicId ?? null,
        relatedStaffId: params.relatedStaffId ?? null,
      },
    })
  } catch (error) {
    console.error("[neredeyiz] Bildirim oluşturulamadı:", error)
  }
}

/** Konu ilerlemesini kurallara göre değiştirir (topic başına tek kayıt). */
export async function changeTopicProgress(
  actor: NeredeyizActor,
  topicId: string,
  input: ProgressChangeInput,
): Promise<ServiceResult<Prisma.ProgressGetPayload<object>>> {
  const status = String(input.status ?? "") as ProgressStatus
  if (!PROGRESS_STATUSES.includes(status)) {
    return { ok: false, status: 400, error: "Geçersiz durum" }
  }

  const ctx = await loadTopicContext(topicId)
  if (!ctx) return { ok: false, status: 404, error: "Konu bulunamadı" }
  const subject = ctx.unit.subject
  if (!subject.classId) {
    return { ok: false, status: 400, error: "Ders bir sınıfa bağlı değil; ilerleme kaydı oluşturulamaz" }
  }

  const [isApprover, isAssigned] = await Promise.all([
    canApproveForClass(actor, subject.class?.counselorId),
    canMarkTopicProgress(actor, subject.id),
  ])
  if (!isApprover && !isAssigned) {
    return { ok: false, status: 403, error: "Bu derse atanmamışsınız; ilerleme kaydı oluşturamazsınız" }
  }

  const existing = await prisma.progress.findUnique({ where: { topicId } })
  if (!isApprover) {
    if (!TEACHER_STATUSES.has(status)) {
      return { ok: false, status: 403, error: "Konuyu tamamlandı yapmak için onaya göndermelisiniz" }
    }
    if (existing?.status === "TAMAMLANDI") {
      return { ok: false, status: 403, error: "Onaylanmış konu yalnızca rehberlik / yönetim tarafından değiştirilebilir" }
    }
  }

  const start = parseDay(input.actualStartDate)
  const end = parseDay(input.actualEndDate)
  if (!start.ok || !end.ok) return { ok: false, status: 400, error: "Geçersiz tarih" }
  const today = todayKey()
  if (end.value && dayKey(end.value) > today) {
    return { ok: false, status: 400, error: "Bitiş tarihi ileri bir gün olamaz" }
  }
  if (start.value && end.value && end.value < start.value) {
    return { ok: false, status: 400, error: "Bitiş tarihi başlangıçtan önce olamaz" }
  }

  const now = new Date()
  const todayDate = keyToDate(today)
  const notes =
    input.notes === undefined ? undefined : input.notes === null ? null : String(input.notes).trim() || null

  let data: Prisma.ProgressUncheckedCreateInput
  switch (status) {
    case "PLANLANDI":
      data = {
        topicId,
        status,
        actualStartDate: null,
        actualEndDate: null,
        reportedBy: null,
        reportedAt: null,
        markedBy: null,
        markedAt: null,
        approvedBy: null,
        approvedAt: null,
      }
      break
    case "DEVAM_EDIYOR":
      data = {
        topicId,
        status,
        actualStartDate: start.value ?? existing?.actualStartDate ?? todayDate,
        actualEndDate: null,
        reportedBy: null,
        reportedAt: null,
        markedBy: null,
        markedAt: null,
        approvedBy: null,
        approvedAt: null,
      }
      break
    case "PENDING_APPROVAL":
      data = {
        topicId,
        status,
        actualStartDate: start.value ?? existing?.actualStartDate ?? null,
        actualEndDate: end.value ?? todayDate,
        reportedBy: actor.staffId,
        reportedAt: now,
        markedBy: null,
        markedAt: null,
        approvedBy: null,
        approvedAt: null,
      }
      break
    case "TAMAMLANDI":
      data = {
        topicId,
        status,
        actualStartDate: start.value ?? existing?.actualStartDate ?? null,
        actualEndDate: end.value ?? existing?.actualEndDate ?? todayDate,
        reportedBy: existing?.reportedBy ?? null,
        reportedAt: existing?.reportedAt ?? null,
        markedBy: actor.staffId,
        markedAt: now,
        approvedBy: actor.staffId,
        approvedAt: now,
      }
      break
    case "ERTELENDI":
    default:
      data = {
        topicId,
        status,
        actualStartDate: existing?.actualStartDate ?? null,
        actualEndDate: null,
        reportedBy: null,
        reportedAt: null,
        markedBy: actor.staffId,
        markedAt: now,
        approvedBy: null,
        approvedAt: null,
      }
  }
  if (notes !== undefined) data.notes = notes

  const { topicId: _t, ...update } = data
  void _t
  const progress = await prisma.progress.upsert({
    where: { topicId },
    create: data,
    update,
  })

  if (status === "PENDING_APPROVAL") {
    const counselorId = subject.class?.counselorId ?? null
    await notify({
      type: "ONAY_BEKLIYOR",
      title: "Onay Bekleyen Konu",
      message: `${actor.firstName} ${actor.lastName}, ${classLabel(subject)} ${subject.name} - ${ctx.name} konusunu tamamlandı olarak bildirdi.`,
      // Sınıfın rehberi varsa yalnız ona, yoksa rehberlik birimine
      targetRole: counselorId ? null : "REHBERLIK",
      targetUserId: counselorId,
      priority: "HIGH",
      relatedTopicId: topicId,
      relatedSubjectId: subject.id,
      relatedStaffId: actor.staffId,
    })
  }

  return { ok: true, data: progress, created: !existing }
}

/** Onay bekleyen kaydı onaylar ya da reddeder. */
export async function decideProgress(
  actor: NeredeyizActor,
  progressId: string,
  decision: "approve" | "reject",
  reason?: string | null,
): Promise<ServiceResult<Prisma.ProgressGetPayload<object>>> {
  const progress = await prisma.progress.findUnique({ where: { id: progressId } })
  if (!progress) return { ok: false, status: 404, error: "İlerleme kaydı bulunamadı" }
  if (progress.status !== "PENDING_APPROVAL") {
    return { ok: false, status: 400, error: "Bu kayıt onay bekliyor durumunda değil" }
  }
  const ctx = await loadTopicContext(progress.topicId)
  if (!ctx) return { ok: false, status: 404, error: "Konu bulunamadı" }
  const subject = ctx.unit.subject

  if (!(await canApproveForClass(actor, subject.class?.counselorId))) {
    return {
      ok: false,
      status: 403,
      error: "Bu konuyu onaylama yetkiniz yok. Yalnızca rehberi olduğunuz sınıfların konularını onaylayabilirsiniz.",
    }
  }
  if (progress.reportedBy === actor.staffId && !actor.superAdmin) {
    return { ok: false, status: 403, error: "Kendi bildirdiğiniz konuyu onaylayamazsınız" }
  }

  const now = new Date()
  const cleanReason = reason?.trim() || null
  if (decision === "reject" && !cleanReason) {
    return { ok: false, status: 400, error: "Reddetme gerekçesi zorunludur" }
  }

  const updated = await prisma.progress.update({
    where: { id: progressId },
    data:
      decision === "approve"
        ? { status: "TAMAMLANDI", approvedBy: actor.staffId, approvedAt: now, markedBy: actor.staffId, markedAt: now }
        : {
            status: "DEVAM_EDIYOR",
            actualEndDate: null,
            reportedBy: null,
            reportedAt: null,
            approvedBy: null,
            approvedAt: null,
            markedBy: actor.staffId,
            markedAt: now,
            notes: `Reddedildi (${actor.firstName} ${actor.lastName}): ${cleanReason}`,
          },
  })

  const label = `${classLabel(subject)} ${subject.name} - ${ctx.name}`
  if (progress.reportedBy) {
    await notify(
      decision === "approve"
        ? {
            type: "TAMAMLANDI",
            title: "Konu Onaylandı",
            message: `${label} konusu onaylandı.`,
            targetUserId: progress.reportedBy,
            relatedTopicId: progress.topicId,
            relatedSubjectId: subject.id,
            relatedStaffId: actor.staffId,
          }
        : {
            type: "GECIKMELI",
            title: "Konu Onayı Reddedildi",
            message: `${label} konusu geri çevrildi: ${cleanReason}`,
            targetUserId: progress.reportedBy,
            priority: "HIGH",
            relatedTopicId: progress.topicId,
            relatedSubjectId: subject.id,
            relatedStaffId: actor.staffId,
          },
    )
  }

  return { ok: true, data: updated }
}
