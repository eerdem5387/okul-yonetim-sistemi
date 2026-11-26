"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Loader2, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"
import { NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import { applyNoticePlaceholders, RECIPIENT_NAME_TOKEN } from "@/lib/comms/placeholders"
import { PlaceholderInsertBar } from "./PlaceholderInsert"
import { commsApi, deptLabel, fullName, NOTICE_TYPE_BADGE, Pill } from "./shared"
import type { CommsTemplate, NoticeType } from "./types"

type StaffRow = { id: string; firstName: string; lastName: string; department: string; subject?: string | null }

export type ComposeDraft = {
  type: NoticeType
  templateId: string
  subject: string
  body: string
  allStaff: boolean
  departments: string[]
  recipientIds: string[]
  step: 1 | 2 | 3
}

export function emptyDraft(type: NoticeType = "PERSONEL_DUYURU"): ComposeDraft {
  return { type, templateId: "", subject: "", body: "", allStaff: false, departments: [], recipientIds: [], step: 1 }
}

export function isDraftDirty(d: ComposeDraft) {
  return Boolean(d.subject.trim() || d.body.trim() || d.recipientIds.length || d.departments.length || d.allStaff)
}

const TYPE_HINT: Record<NoticeType, string> = {
  IHTAR: "Resmi uyarı. Alıcının görme kaydı ve PDF çıktısı resmi belge niteliğindedir.",
  TALIMAT: "Yapılması istenen görev / iş emri.",
  PERSONEL_DUYURU: "Personele genel bilgilendirme.",
}

/**
 * Resmi ileti oluşturma: 1) içerik (şablon isteğe bağlı) 2) alıcılar (birim / kişi) 3) önizleme + gönder.
 * Taslak üst bileşende tutulur; sekme değişince kaybolmaz.
 */
export function ComposeNotice({
  draft,
  setDraft,
  onCancel,
  onSent,
}: {
  draft: ComposeDraft
  setDraft: (updater: (d: ComposeDraft) => ComposeDraft) => void
  onCancel: () => void
  onSent: (batchId: string) => void
}) {
  const [templates, setTemplates] = useState<CommsTemplate[]>([])
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const patch = (p: Partial<ComposeDraft>) => setDraft((d) => ({ ...d, ...p }))

  useEffect(() => {
    void commsApi<{ staff: StaffRow[] }>("/api/comms/staff")
      .then((j) => setStaff(j.staff))
      .catch(() => setStaff([]))
  }, [])

  useEffect(() => {
    void commsApi<{ templates: CommsTemplate[] }>(`/api/comms/templates?kind=${draft.type}`)
      .then((j) => setTemplates(j.templates))
      .catch(() => setTemplates([]))
  }, [draft.type])

  const departments = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of staff) map.set(s.department, (map.get(s.department) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [staff])

  const recipientSet = useMemo(() => {
    if (draft.allStaff) return new Set(staff.map((s) => s.id))
    const set = new Set(draft.recipientIds)
    const depts = new Set(draft.departments)
    for (const s of staff) if (depts.has(s.department)) set.add(s.id)
    return set
  }, [draft.allStaff, draft.recipientIds, draft.departments, staff])

  const filteredStaff = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr-TR")
    if (!needle) return staff
    return staff.filter((s) =>
      `${s.firstName} ${s.lastName} ${deptLabel(s.department)} ${s.subject || ""}`
        .toLocaleLowerCase("tr-TR")
        .includes(needle)
    )
  }, [staff, q])

  const label = NOTICE_TYPE_LABEL[draft.type]
  const sampleRecipient = staff.find((s) => recipientSet.has(s.id))
  const canNext = draft.step === 1 ? Boolean(draft.subject.trim() && draft.body.trim()) : recipientSet.size > 0

  const toggleDept = (dept: string) => {
    setDraft((d) => {
      const on = d.departments.includes(dept)
      return {
        ...d,
        allStaff: false,
        departments: on ? d.departments.filter((x) => x !== dept) : [...d.departments, dept],
      }
    })
  }

  const togglePerson = (id: string) => {
    setDraft((d) => {
      // Kişi birim seçimiyle geldiyse: birimi açıp diğerlerini tek tek seçili bırak
      const person = staff.find((s) => s.id === id)
      if (d.allStaff || (person && d.departments.includes(person.department))) {
        const current = new Set(recipientSet)
        current.delete(id)
        return { ...d, allStaff: false, departments: [], recipientIds: [...current] }
      }
      const on = d.recipientIds.includes(id)
      return { ...d, recipientIds: on ? d.recipientIds.filter((x) => x !== id) : [...d.recipientIds, id] }
    })
  }

  const submit = async () => {
    setBusy(true)
    try {
      const j = await commsApi<{ count: number; batchId: string }>("/api/comms/notices", {
        method: "POST",
        body: {
          type: draft.type,
          templateId: draft.templateId || undefined,
          subject: draft.subject,
          body: draft.body,
          allStaff: draft.allStaff,
          departments: draft.departments,
          recipientStaffIds: draft.recipientIds,
        },
      })
      notify(`${label} ${j.count} kişiye gönderildi`)
      onSent(j.batchId)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Gönderilemedi")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {[
            { n: 1, t: "İçerik" },
            { n: 2, t: "Alıcılar" },
            { n: 3, t: "Önizle ve gönder" },
          ].map((s, i) => {
            const active = draft.step === s.n
            const done = draft.step > s.n
            return (
              <div key={s.n} className="flex items-center gap-2">
                {i > 0 ? <span className="h-px w-4 bg-slate-300 sm:w-8" /> : null}
                <button
                  type="button"
                  disabled={s.n > draft.step && !canNext}
                  onClick={() => s.n < draft.step && patch({ step: s.n as 1 | 2 | 3 })}
                  className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium ${
                    active ? "bg-white text-slate-900 shadow-sm ring-1 ring-blue-600" : done ? "text-emerald-700" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-blue-600 text-white" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </span>
                  <span className="hidden sm:inline">{s.t}</span>
                </button>
              </div>
            )
          })}
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1 h-4 w-4" /> Kapat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {draft.step === 1 ? (
          <div className="mx-auto max-w-2xl space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">İleti türü</p>
              <div className="grid grid-cols-3 gap-2">
                {(["PERSONEL_DUYURU", "TALIMAT", "IHTAR"] as NoticeType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patch({ type: t, templateId: "" })}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      draft.type === t ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Pill className={NOTICE_TYPE_BADGE[t]}>{NOTICE_TYPE_LABEL[t]}</Pill>
                    <p className="mt-1.5 hidden text-xs text-slate-500 sm:block">{TYPE_HINT[t]}</p>
                  </button>
                ))}
              </div>
            </div>

            {templates.length ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Şablondan başla <span className="font-normal text-slate-400">(isteğe bağlı)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => patch({ templateId: t.id, subject: t.title, body: t.body })}
                      className={`rounded-full px-3 py-1.5 text-sm transition ${
                        draft.templateId === t.id
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Konu</span>
              <Input value={draft.subject} maxLength={200} onChange={(e) => patch({ subject: e.target.value })} placeholder={`${label} konusu`} />
            </label>
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Metin</span>
              <PlaceholderInsertBar textareaRef={bodyRef} value={draft.body} onChange={(body) => patch({ body })} />
              <textarea
                ref={bodyRef}
                className="min-h-[16rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 focus:border-blue-500 focus:outline-none"
                value={draft.body}
                maxLength={10000}
                onChange={(e) => patch({ body: e.target.value })}
                placeholder={`Örn: Sayın ${RECIPIENT_NAME_TOKEN},\n\n…`}
              />
            </div>
          </div>
        ) : null}

        {draft.step === 2 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Hızlı seçim</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => patch({ allStaff: !draft.allStaff, departments: [], recipientIds: [] })}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    draft.allStaff ? "bg-blue-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Tüm personel ({staff.length})
                </button>
                {departments.map(([dept, count]) => {
                  const on = draft.allStaff || draft.departments.includes(dept)
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDept(dept)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                        on ? "bg-blue-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {deptLabel(dept)} ({count})
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Kurucu, Müdür ve resmi gönderim yetkisi olanlar alıcı listesinde yer almaz.
              </p>
            </div>

            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, birim veya branş ara…" />
            <div className="max-h-[24rem] overflow-y-auto rounded-xl border border-slate-200">
              {filteredStaff.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={recipientSet.has(s.id)}
                    onChange={() => togglePerson(s.id)}
                  />
                  <span className="font-medium text-slate-900">{fullName(s)}</span>
                  <span className="text-xs text-slate-500">
                    {deptLabel(s.department)}
                    {s.subject ? ` · ${s.subject}` : ""}
                  </span>
                </label>
              ))}
              {filteredStaff.length === 0 ? <p className="p-4 text-sm text-slate-500">Personel bulunamadı.</p> : null}
            </div>
          </div>
        ) : null}

        {draft.step === 3 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Pill className={NOTICE_TYPE_BADGE[draft.type]}>{label}</Pill>
              <span className="font-semibold text-slate-900">{recipientSet.size} alıcı</span>
              {draft.allStaff ? <span className="text-slate-500">· Tüm personel</span> : null}
              {draft.departments.length ? (
                <span className="text-slate-500">· {draft.departments.map(deptLabel).join(", ")}</span>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              {sampleRecipient && (draft.body + draft.subject).includes("{{") ? (
                <p className="mb-3 text-xs text-blue-700">Önizleme: {fullName(sampleRecipient)} adına nasıl görüneceği</p>
              ) : null}
              <h3 className="text-xl font-semibold text-slate-900">
                {applyNoticePlaceholders(draft.subject, { recipientFullName: fullName(sampleRecipient) })}
              </h3>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {applyNoticePlaceholders(draft.body, { recipientFullName: fullName(sampleRecipient) })}
              </div>
            </div>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>• Her alıcı için ayrı resmi kayıt oluşur; alıcılar telefonlarına bildirim alır.</li>
              <li>• Kimin gördüğünü “Gönderilenler” sekmesinden izleyip görmeyenlere hatırlatabilirsiniz.</li>
              {draft.type === "IHTAR" ? <li>• İhtar yüksek öncelikli bildirim olarak iletilir.</li> : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-white px-4 py-3 sm:px-6">
        <Button
          variant="outline"
          onClick={() => patch({ step: Math.max(1, draft.step - 1) as 1 | 2 | 3 })}
          disabled={draft.step === 1 || busy}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Geri
        </Button>
        <span className="hidden text-xs text-slate-500 sm:block">
          {draft.step === 2 ? `${recipientSet.size} kişi seçildi` : null}
        </span>
        {draft.step < 3 ? (
          <Button onClick={() => patch({ step: (draft.step + 1) as 2 | 3 })} disabled={!canNext}>
            İleri
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => void submit()} disabled={busy || !canNext}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {label} gönder
          </Button>
        )}
      </div>
    </div>
  )
}
