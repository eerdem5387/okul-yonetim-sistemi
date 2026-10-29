"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAuthHeaders } from "./auth"
import { NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import type { CommsTemplate } from "./types"

type NoticeType = "IHTAR" | "TALIMAT" | "PERSONEL_DUYURU"
type StaffRow = { id: string; firstName: string; lastName: string; department: string }

const STEPS = [
  { id: 1, title: "Alıcı seç" },
  { id: 2, title: "Şablon seç" },
  { id: 3, title: "Gözden geçir" },
  { id: 4, title: "Gönder" },
] as const

export function ComposeNoticeWizard({
  type,
  onDone,
}: {
  type: NoticeType
  onDone: () => void
}) {
  const [step, setStep] = useState(1)
  const [templates, setTemplates] = useState<CommsTemplate[]>([])
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [templateId, setTemplateId] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [allStaff, setAllStaff] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [customizing, setCustomizing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState("")

  const label = NOTICE_TYPE_LABEL[type]
  const labelLower = label.toLocaleLowerCase("tr-TR")

  useEffect(() => {
    setStep(1)
    setTemplateId("")
    setSelected({})
    setAllStaff(false)
    setSubject("")
    setBody("")
    setCustomizing(false)
    setQ("")
    void Promise.all([
      fetch(`/api/comms/templates?kind=${type}`, { headers: getAuthHeaders(), cache: "no-store" }).then((r) =>
        r.json()
      ),
      fetch("/api/comms/staff", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
    ]).then(([t, s]) => {
      setTemplates(t.templates || [])
      setStaff(s.staff || [])
    })
  }, [type])

  const tpl = templates.find((t) => t.id === templateId)

  useEffect(() => {
    if (!tpl || customizing) return
    setSubject(tpl.title)
    setBody(tpl.body)
  }, [tpl, customizing])

  const recipientIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  )
  const recipientCount = allStaff ? staff.length : recipientIds.length

  const filtered = staff.filter((s) => {
    const hay = `${s.firstName} ${s.lastName} ${s.department}`.toLocaleLowerCase("tr-TR")
    return hay.includes(q.trim().toLocaleLowerCase("tr-TR"))
  })

  const canNext =
    step === 1
      ? allStaff || recipientIds.length > 0
      : step === 2
        ? Boolean(templateId)
        : step === 3
          ? Boolean(subject.trim() && body.trim())
          : true

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      alert("Konu ve metin zorunlu")
      return
    }
    if (!allStaff && recipientIds.length === 0) {
      alert("Alıcı seçin")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/comms/notices", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type,
          templateId: templateId || undefined,
          subject,
          body,
          allStaff,
          recipientStaffIds: recipientIds,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j.error || "Gönderilemedi")
        return
      }
      alert(`${j.count} kişiye ${labelLower} iletildi`)
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b bg-slate-50 px-4 py-4 sm:px-6">
        <p className="text-sm font-semibold text-slate-900">Yeni {label}</p>
        <p className="mt-0.5 text-xs text-slate-500">Adım adım oluşturup gönderin</p>
        <ol className="mt-4 flex flex-wrap gap-2">
          {STEPS.map((s) => {
            const done = step > s.id
            const active = step === s.id
            return (
              <li
                key={s.id}
                className={`flex min-w-[8.5rem] flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                  active
                    ? "border-blue-600 bg-white shadow-sm"
                    : done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white/60 text-slate-500"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-blue-600 text-white"
                      : done
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                </span>
                <span className={`font-medium ${active ? "text-slate-900" : ""}`}>{s.title}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {step === 1 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">1. Kimlere gönderilecek?</h2>
            <p className="text-sm text-slate-500">Tek kişi, birden fazla kişi veya tüm personeli seçebilirsiniz.</p>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium">
              <input type="checkbox" checked={allStaff} onChange={(e) => setAllStaff(e.target.checked)} />
              Tüm personele gönder (gönderim yetkilileri hariç)
            </label>
            {!allStaff ? (
              <>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Personel ara…" />
                <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-slate-200">
                  {filtered.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 text-sm last:border-0 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selected[s.id])}
                        onChange={() => setSelected((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                      />
                      <span className="font-medium text-slate-900">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className="text-xs text-slate-400">{s.department}</span>
                    </label>
                  ))}
                  {filtered.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">Personel bulunamadı.</p>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">{recipientCount} kişi seçildi</p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Gönderim yetkisi olmayan tüm aktif personel alıcı olacak.
              </p>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">2. {label} şablonunu seçin</h2>
            <p className="text-sm text-slate-500">Hazır şablonlardan birini seçin. Sonraki adımda metni özelleştirebilirsiniz.</p>
            <div className="space-y-2">
              {templates.map((t) => {
                const on = templateId === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTemplateId(t.id)
                      setCustomizing(false)
                      setSubject(t.title)
                      setBody(t.body)
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      on ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{t.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 whitespace-pre-wrap">{t.body}</p>
                  </button>
                )
              })}
              {templates.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                  Bu tür için aktif şablon yok. Sistem yöneticisi şablon eklemelidir.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">3. Metni gözden geçirin</h2>
            <p className="text-sm text-slate-500">
              İsterseniz bu {labelLower} için şablonu özelleştirin. Her alıcıya ayrı kayıt oluşur.
            </p>
            {!customizing ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-base font-semibold text-slate-900">{subject}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{body}</p>
                <Button variant="outline" onClick={() => setCustomizing(true)}>
                  Bu {labelLower} için şablonu özelleştir
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />
                <textarea
                  className="min-h-[16rem] w-full rounded-md border px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Metin"
                />
                <p className="text-xs text-amber-700">Metni serbestçe düzenleyebilirsiniz.</p>
              </div>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">4. Gönderimi onaylayın</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800">{label}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {allStaff ? "Tüm personel" : `${recipientCount} alıcı`}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{subject}</h3>
              <div className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
                {body}
              </div>
              <p className="text-xs text-slate-500">
                Gönderildiğinde her alıcı için bağımsız kayıt oluşur. Alıcılar Görüldü ile dijital iz bırakır.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-white px-4 py-3 sm:px-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || busy}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Geri
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={!canNext}>
            İleri
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => void submit()} disabled={busy || !canNext}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {label} gönder
          </Button>
        )}
      </div>
    </div>
  )
}
