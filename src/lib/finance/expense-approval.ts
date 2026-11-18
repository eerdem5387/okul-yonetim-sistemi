import type { StaffDepartment } from "@prisma/client"

/**
 * Harcama talebi onay kuralı.
 *
 * - Tutar 5.000 ₺ üzerindeyse hem kurucu hem müdür onayı gerekir.
 * - 5.000 ₺ ve altında ya da tutar girilmemişse kurucu veya müdürden birinin onayı yeterlidir.
 *
 * Asıl karar muhasebe projesinde (`src/lib/expense-approval-rule.ts`) verilir; eşik
 * değiştirilecekse ikisi birlikte güncellenmeli.
 *
 * Harcama Talepleri ekranını yalnızca KURUCU ve MUDUR rolündekiler görür ve onaylar.
 */
export const DUAL_APPROVAL_THRESHOLD_TRY = 5000

export type ApprovalSlot = "founder" | "principal"

const SLOT_BY_DEPARTMENT: Partial<Record<StaffDepartment | string, ApprovalSlot>> = {
  KURUCU: "founder",
  MUDUR: "principal",
}

/** Personelin onay rolü; null ise talepleri göremez/onaylayamaz. */
export function approvalSlotFor(department: StaffDepartment | string | null | undefined): ApprovalSlot | null {
  if (!department) return null
  return SLOT_BY_DEPARTMENT[department] ?? null
}

export function canAccessExpenseRequests(department: StaffDepartment | string | null | undefined): boolean {
  return approvalSlotFor(department) !== null
}

type Amount = { toString(): string } | number | string | null | undefined

export function requiresDualApproval(total: Amount): boolean {
  if (total == null || total === "") return false
  const n = Number(total.toString())
  if (!Number.isFinite(n)) return false
  return n > DUAL_APPROVAL_THRESHOLD_TRY
}

type ApprovalRow = {
  status: string
  total: Amount
  founderApprovedAt: Date | string | null
  founderApprovedByName: string | null
  principalApprovedAt: Date | string | null
  principalApprovedByName: string | null
}

type SlotState = { at: string; name: string | null } | null

export type ApprovalView = {
  /** "dual": kurucu + müdür, "single": biri yeterli */
  rule: "dual" | "single"
  founder: SlotState
  principal: SlotState
  /** Ekranda gösterilecek tek satırlık özet */
  summary: string
  /** Çift onaylı talepte tek onay gelmiş; rozet metni (yoksa null) */
  partialLabel: string | null
  /** Onaylayanların adları (onaylanmış talepler için) */
  approverNames: string
  /** Görüntüleyen kişi bu talebi şu an onaylayabilir mi */
  canApprove: boolean
  /** Görüntüleyen kişi reddedebilir mi */
  canReject: boolean
}

function slotState(at: Date | string | null, name: string | null): SlotState {
  if (!at) return null
  return { at: typeof at === "string" ? at : at.toISOString(), name: name?.trim() || null }
}

function who(state: SlotState, fallback: string) {
  return state?.name ? `${fallback} (${state.name})` : fallback
}

export function describeApproval(row: ApprovalRow, viewerSlot: ApprovalSlot | null): ApprovalView {
  const rule = requiresDualApproval(row.total) ? "dual" : "single"
  const founder = slotState(row.founderApprovedAt, row.founderApprovedByName)
  const principal = slotState(row.principalApprovedAt, row.principalApprovedByName)
  const pending = row.status === "PENDING"

  let summary: string
  if (row.status === "REJECTED") {
    summary = "Reddedildi"
  } else if (!pending) {
    summary = [founder ? who(founder, "Kurucu") : null, principal ? who(principal, "Müdür") : null]
      .filter(Boolean)
      .join(" ve ")
    summary = summary ? `${summary} onayladı` : "Onaylandı"
  } else if (rule === "dual") {
    if (founder && !principal) summary = `${who(founder, "Kurucu")} onayladı · müdür onayı bekleniyor`
    else if (principal && !founder) summary = `${who(principal, "Müdür")} onayladı · kurucu onayı bekleniyor`
    else summary = "5.000 ₺ üzeri · kurucu ve müdür onayı gerekli"
  } else {
    summary = "Kurucu veya müdür onayı yeterli"
  }

  const approverNames =
    [founder?.name, principal?.name].filter(Boolean).join(", ") || (founder || principal ? "Ad kaydı yok" : "")

  const partialLabel =
    pending && rule === "dual" && (founder != null) !== (principal != null)
      ? `1/2 onay · ${founder ? "müdür" : "kurucu"} onayı bekleniyor`
      : null

  const slotFilled = viewerSlot === "founder" ? founder != null : viewerSlot === "principal" ? principal != null : true
  return {
    rule,
    founder,
    principal,
    summary,
    partialLabel,
    approverNames,
    canApprove: pending && viewerSlot != null && !slotFilled,
    canReject: pending && viewerSlot != null,
  }
}
