"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react"

const EXAM_ACCESS_ROLES = ["admin", "counselor", "head_counselor", "student_affairs"] as const

function canAccessExamPages(role: string | null): boolean {
  return role != null && (EXAM_ACCESS_ROLES as readonly string[]).includes(role)
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  CONFIGURED: "Yapılandırıldı",
  READY_FOR_SCAN: "Okutmaya hazır",
  SCANNING: "Okutuluyor",
  IN_REVIEW: "İncelemede",
  PUBLISHED: "Yayınlandı",
  ARCHIVED: "Arşiv",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  CONFIGURED: "bg-blue-100 text-blue-800",
  READY_FOR_SCAN: "bg-green-100 text-green-800",
  SCANNING: "bg-yellow-100 text-yellow-800",
  IN_REVIEW: "bg-orange-100 text-orange-800",
  PUBLISHED: "bg-purple-100 text-purple-800",
  ARCHIVED: "bg-gray-200 text-gray-600",
}

type Tab = "genel" | "kazanimlar" | "sorular" | "okutma" | "dogrulama" | "analiz"

interface ExamDetail {
  id: string
  name: string
  examType: string
  examDate: string
  status: string
  grade: number | null
  description: string | null
  definitionVersion: number
  expectedParticipantCount: number | null
  scanTemplate: { id: string; templateKey: string; label: string; questionCount: number } | null
  sections: Array<{ id: string; name: string; questionStart: number; questionEnd: number }>
  outcomes: Array<{ id: string; code: string | null; subject: string; topic: string; learningOutcome: string }>
  questions: Array<{
    id: string
    questionNo: number
    correctAnswer: string | null
    outcomeId: string | null
    outcome?: { subject: string; topic: string } | null
  }>
  scanBatches: Array<{
    id: string
    externalBatchId: string
    status: string
    summaryJson: Record<string, number> | null
    createdAt: string
    operator: { firstName: string; lastName: string }
    _count: { items: number }
  }>
  results: Array<{
    id: string
    netScore: number | null
    correctCount: number | null
    student: { firstName: string; lastName: string; grade: string }
  }>
}

interface Readiness {
  ready: boolean
  issues: string[]
  sectionCount: number
  questionCount: number
  questionsWithOutcome: number
  questionsWithKey: number
}

interface Template {
  id: string
  templateKey: string
  label: string
  questionCount: number
}

interface Analytics {
  participantCount: number
  outcomeSummary: Array<{ subject: string; topic: string; learningOutcome: string; rate: number; correctCount: number; totalQuestions: number }>
  studentWeakness: Array<{ firstName: string; lastName: string; grade: string; weakOutcomes: Array<{ subject: string; topic: string; rate: number }> }>
}

export default function ExamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>("genel")
  const [exam, setExam] = useState<ExamDetail | null>(null)
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [batchDetail, setBatchDetail] = useState<object | null>(null)

  const [sectionForm, setSectionForm] = useState({ name: "", questionStart: "1", questionEnd: "20" })
  const [outcomeForm, setOutcomeForm] = useState({ code: "", subject: "", topic: "", learningOutcome: "" })
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [outcomeMap, setOutcomeMap] = useState<Record<string, string>>({})
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [txtUploading, setTxtUploading] = useState(false)

  const fetchExam = useCallback(async () => {
    const res = await fetch(`/api/exams/${examId}`, { headers: getAuthHeaders() })
    if (!res.ok) return
    const data = await res.json()
    setExam(data.exam)
    setReadiness(data.readiness)
    const keys: Record<string, string> = {}
    const omap: Record<string, string> = {}
    for (const q of data.exam.questions) {
      if (q.correctAnswer) keys[q.id] = q.correctAnswer
      if (q.outcomeId) omap[q.id] = q.outcomeId
    }
    setAnswerKey(keys)
    setOutcomeMap(omap)
  }, [examId])

  useEffect(() => {
    const role = localStorage.getItem("auth_role")
    const token = localStorage.getItem("auth_token")
    if (!token || !canAccessExamPages(role)) {
      router.push(token ? "/" : "/login")
      return
    }
    Promise.all([
      fetchExam(),
      fetch("/api/exam-scan-templates", { headers: getAuthHeaders() }).then((r) => r.json()),
    ]).then(([, tplData]) => {
      setTemplates(tplData.templates ?? [])
      setLoading(false)
    })
  }, [fetchExam, router])

  useEffect(() => {
    if (tab === "analiz" && exam?.status === "PUBLISHED") {
      fetch(`/api/exams/${examId}/analytics`, { headers: getAuthHeaders() })
        .then((r) => r.json())
        .then((d) => setAnalytics(d.analytics))
    }
  }, [tab, exam?.status, examId])

  const saveTemplate = async (scanTemplateId: string) => {
    setSaving(true)
    await fetch(`/api/exams/${examId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ scanTemplateId }),
    })
    await fetchExam()
    setSaving(false)
  }

  const addSection = async () => {
    setSaving(true)
    await fetch(`/api/exams/${examId}/sections`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: sectionForm.name,
        questionStart: Number(sectionForm.questionStart),
        questionEnd: Number(sectionForm.questionEnd),
      }),
    })
    await fetchExam()
    setSaving(false)
  }

  const addOutcome = async () => {
    setSaving(true)
    await fetch(`/api/exams/${examId}/outcomes`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(outcomeForm),
    })
    setOutcomeForm({ code: "", subject: "", topic: "", learningOutcome: "" })
    await fetchExam()
    setSaving(false)
  }

  const saveQuestions = async () => {
    if (!exam) return
    setSaving(true)
    const questions = exam.questions.map((q) => ({
      id: q.id,
      correctAnswer: answerKey[q.id] ?? null,
      outcomeId: outcomeMap[q.id] ?? null,
    }))
    await fetch(`/api/exams/${examId}/questions`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ bulk: true, questions }),
    })
    await fetchExam()
    setSaving(false)
  }

  const markReady = async () => {
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/ready`, { method: "POST", headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) alert(data.error + (data.readiness?.issues ? "\n" + data.readiness.issues.join("\n") : ""))
    await fetchExam()
    setSaving(false)
  }

  const publish = async () => {
    if (!confirm("Sınav sonuçları veli ve öğretmenlere görünür olacak. Onaylıyor musunuz?")) return
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/publish`, { method: "POST", headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) alert(data.error)
    await fetchExam()
    setSaving(false)
  }

  const rejectReview = async () => {
    setSaving(true)
    await fetch(`/api/exams/${examId}/publish`, { method: "DELETE", headers: getAuthHeaders() })
    await fetchExam()
    setSaving(false)
  }

  const loadBatch = async (batchId: string) => {
    const res = await fetch(`/api/exams/${examId}/scan-batches/${batchId}`, { headers: getAuthHeaders() })
    const data = await res.json()
    setBatchDetail(data.batch)
  }

  const seedTemplates = async () => {
    await fetch("/api/exam-scan-templates", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ seed: true }),
    })
    const res = await fetch("/api/exam-scan-templates", { headers: getAuthHeaders() })
    const data = await res.json()
    setTemplates(data.templates ?? [])
  }

  const downloadImportTemplate = async (template: "outcomes" | "answer_key") => {
    const res = await fetch(`/api/exams/${examId}/import?template=${template}`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      alert("Şablon indirilemedi")
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = template === "outcomes" ? "kazanim-sablon.csv" : "cevap-anahtari-sablon.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result ?? "")
        const base64 = result.includes(",") ? result.split(",")[1] : result
        resolve(base64)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const importTabular = async (kind: "outcomes" | "answer_key", file: File) => {
    setSaving(true)
    setUploadMsg(null)
    try {
      const contentBase64 = await fileToBase64(file)
      const res = await fetch(`/api/exams/${examId}/import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ kind, contentBase64, fileName: file.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadMsg(data.error ?? "Import başarısız")
      } else if (kind === "outcomes") {
        setUploadMsg(`${data.imported} kazanım içe aktarıldı.`)
      } else {
        setUploadMsg(
          `${data.updated} cevap anahtarı güncellendi` +
            (data.skipped ? `, ${data.skipped} atlandı` : "") +
            (data.missingOutcomeCodes?.length
              ? `. Eksik kazanım kodu: ${data.missingOutcomeCodes.join(", ")}`
              : "")
        )
      }
      await fetchExam()
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Import hatası")
    } finally {
      setSaving(false)
    }
  }

  const uploadDeviceTxt = async (file: File) => {
    setTxtUploading(true)
    setUploadMsg(null)
    try {
      const contentBase64 = await fileToBase64(file)
      const res = await fetch(`/api/exams/${examId}/scan-batches/from-txt`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contentBase64,
          encoding: "cp1254",
          operatorNote: `Web TXT: ${file.name}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadMsg(data.error ?? "TXT yükleme başarısız")
      } else {
        setUploadMsg(
          `TXT kabul edildi (${data.parse?.rowCount ?? "?"} satır). ` +
            `Eşleşen: ${data.summary?.matched ?? 0}, eşleşmeyen: ${data.summary?.unmatched ?? 0}. ` +
            `Doğrulama sekmesinden inceleyin.`
        )
        setTab("dogrulama")
      }
      await fetchExam()
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "TXT yükleme hatası")
    } finally {
      setTxtUploading(false)
    }
  }

  if (loading || !exam) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </div>
    )
  }

  const locked = exam.status === "READY_FOR_SCAN" || exam.status === "PUBLISHED" || exam.status === "IN_REVIEW"
  const tabs: { id: Tab; label: string }[] = [
    { id: "genel", label: "Genel" },
    { id: "kazanimlar", label: "Kazanımlar" },
    { id: "sorular", label: "Sorular & Anahtar" },
    { id: "okutma", label: "Okutma" },
    { id: "dogrulama", label: "Doğrulama" },
    { id: "analiz", label: "Analiz" },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/rehberlik/sinavlar">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Geri
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{exam.name}</h1>
              <div className="flex gap-3 mt-1 text-sm text-gray-600">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[exam.status] ?? ""}`}>
                  {STATUS_LABELS[exam.status] ?? exam.status}
                </span>
                <span>Sürüm v{exam.definitionVersion}</span>
                <span>{exam.questions.length} soru</span>
                <span>{exam.results.length} sonuç</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-b pb-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${
                  tab === t.id ? "bg-white border border-b-0 text-purple-700" : "text-gray-600 hover:text-purple-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "genel" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Sınav Bilgileri</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Tip:</strong> {exam.examType}</p>
                  <p><strong>Tarih:</strong> {new Date(exam.examDate).toLocaleDateString("tr-TR")}</p>
                  {exam.grade && <p><strong>Sınıf:</strong> {exam.grade}</p>}
                  {exam.description && <p><strong>Açıklama:</strong> {exam.description}</p>}
                  <p><strong>Beklenen katılım:</strong> {exam.expectedParticipantCount ?? "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Optik Şablon</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {templates.length === 0 && (
                    <Button variant="outline" size="sm" onClick={seedTemplates}>Şablonları yükle</Button>
                  )}
                  <select
                    className="w-full p-2 border rounded-md"
                    value={exam.scanTemplate?.id ?? ""}
                    disabled={locked || saving}
                    onChange={(e) => saveTemplate(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.label} ({t.questionCount} soru)</option>
                    ))}
                  </select>
                </CardContent>
              </Card>
              {readiness && (
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle>Okutmaya Aç Checklist</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {readiness.issues.length === 0 ? (
                        <li className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="h-4 w-4" /> Tüm maddeler tamam
                        </li>
                      ) : (
                        readiness.issues.map((issue, i) => (
                          <li key={i} className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="h-4 w-4" /> {issue}
                          </li>
                        ))
                      )}
                    </ul>
                    {exam.status === "DRAFT" || exam.status === "CONFIGURED" ? (
                      <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={markReady} disabled={saving || !readiness.ready}>
                        Okutmaya Aç
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {tab === "kazanimlar" && (
            <Card>
              <CardHeader><CardTitle>Kazanım Kataloğu</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!locked && (
                  <div className="flex flex-wrap gap-3 items-center p-3 bg-indigo-50 rounded-lg text-sm">
                    <button
                      type="button"
                      className="text-indigo-700 underline"
                      onClick={() => void downloadImportTemplate("outcomes")}
                    >
                      Excel/CSV şablon indir
                    </button>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <span className="font-medium">Excel/CSV yükle</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="text-xs"
                        disabled={saving}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void importTabular("outcomes", f)
                          e.target.value = ""
                        }}
                      />
                    </label>
                  </div>
                )}
                {!locked && (
                  <div className="grid md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                    <Input placeholder="Kod" value={outcomeForm.code} onChange={(e) => setOutcomeForm({ ...outcomeForm, code: e.target.value })} />
                    <Input placeholder="Ders *" value={outcomeForm.subject} onChange={(e) => setOutcomeForm({ ...outcomeForm, subject: e.target.value })} />
                    <Input placeholder="Konu *" value={outcomeForm.topic} onChange={(e) => setOutcomeForm({ ...outcomeForm, topic: e.target.value })} />
                    <Input placeholder="Kazanım *" value={outcomeForm.learningOutcome} onChange={(e) => setOutcomeForm({ ...outcomeForm, learningOutcome: e.target.value })} />
                    <Button onClick={addOutcome} disabled={saving}>Ekle</Button>
                  </div>
                )}
                {uploadMsg && tab === "kazanimlar" && (
                  <p className="text-sm text-indigo-800 bg-indigo-50 p-2 rounded">{uploadMsg}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">Kod</th><th className="text-left p-2">Ders</th><th className="text-left p-2">Konu</th><th className="text-left p-2">Kazanım</th></tr></thead>
                    <tbody>
                      {exam.outcomes.map((o) => (
                        <tr key={o.id} className="border-b">
                          <td className="p-2">{o.code ?? "—"}</td>
                          <td className="p-2">{o.subject}</td>
                          <td className="p-2">{o.topic}</td>
                          <td className="p-2">{o.learningOutcome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === "sorular" && (
            <div className="space-y-4">
              {!locked && exam.sections.length === 0 && (
                <Card>
                  <CardHeader><CardTitle>Bölüm Ekle</CardTitle></CardHeader>
                  <CardContent className="grid md:grid-cols-4 gap-3">
                    <div><Label>Ad</Label><Input value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="Türkçe" /></div>
                    <div><Label>Başlangıç</Label><Input type="number" value={sectionForm.questionStart} onChange={(e) => setSectionForm({ ...sectionForm, questionStart: e.target.value })} /></div>
                    <div><Label>Bitiş</Label><Input type="number" value={sectionForm.questionEnd} onChange={(e) => setSectionForm({ ...sectionForm, questionEnd: e.target.value })} /></div>
                    <div className="flex items-end"><Button onClick={addSection} disabled={saving}>Bölüm Oluştur</Button></div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                  <CardTitle>Sorular & Cevap Anahtarı</CardTitle>
                  <div className="flex flex-wrap gap-2 items-center">
                    {!locked && (
                      <>
                        <button
                          type="button"
                          className="text-xs text-indigo-700 underline"
                          onClick={() => void downloadImportTemplate("answer_key")}
                        >
                          Anahtar şablon
                        </button>
                        <label className="text-xs cursor-pointer border rounded px-2 py-1 hover:bg-gray-50">
                          Excel/CSV import
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            disabled={saving}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) void importTabular("answer_key", f)
                              e.target.value = ""
                            }}
                          />
                        </label>
                        <Button size="sm" onClick={saveQuestions} disabled={saving}>Kaydet</Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {uploadMsg && tab === "sorular" && (
                    <p className="text-sm text-indigo-800 bg-indigo-50 p-2 rounded mb-3">{uploadMsg}</p>
                  )}
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b">
                          <th className="p-2 text-left">No</th>
                          <th className="p-2 text-left">Kazanım</th>
                          <th className="p-2 text-left">Cevap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.questions.map((q) => (
                          <tr key={q.id} className="border-b">
                            <td className="p-2">{q.questionNo}</td>
                            <td className="p-2">
                              <select
                                className="w-full p-1 border rounded text-xs"
                                disabled={locked}
                                value={outcomeMap[q.id] ?? ""}
                                onChange={(e) => setOutcomeMap({ ...outcomeMap, [q.id]: e.target.value })}
                              >
                                <option value="">—</option>
                                {exam.outcomes.map((o) => (
                                  <option key={o.id} value={o.id}>{o.subject} / {o.topic}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                className="w-16 p-1 border rounded"
                                disabled={locked}
                                value={answerKey[q.id] ?? ""}
                                onChange={(e) => setAnswerKey({ ...answerKey, [q.id]: e.target.value })}
                              >
                                <option value="">—</option>
                                {["A", "B", "C", "D", "E"].map((l) => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "okutma" && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Okutma Durumu</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {exam.status === "READY_FOR_SCAN" || exam.status === "SCANNING" ? (
                    <p className="text-green-700">
                      Sınav okutmaya açık. Cihaz TXT dosyasını buradan veya masaüstü uygulamadan yükleyebilirsiniz.
                    </p>
                  ) : (
                    <p className="text-gray-600">Okutma için sınav &quot;Okutmaya hazır&quot; durumunda olmalıdır.</p>
                  )}
                  {exam.scanTemplate && (
                    <p className="text-sm"><strong>Şablon:</strong> {exam.scanTemplate.label} ({exam.scanTemplate.templateKey})</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Eşleştirme sırası: TC → ad-soyad (tek aday). TC boyanmayan formlar incelemede işaretlenir.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Cihaz TXT Yükle</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Optik okuyucunun ürettiği <code>.txt</code> dosyasını seçin (CP1254 / Windows Türkçe).
                  </p>
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    disabled={txtUploading || (exam.status !== "READY_FOR_SCAN" && exam.status !== "SCANNING")}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void uploadDeviceTxt(f)
                      e.target.value = ""
                    }}
                  />
                  {txtUploading && (
                    <p className="text-sm flex items-center gap-2 text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
                    </p>
                  )}
                  {uploadMsg && tab === "okutma" && (
                    <p className="text-sm text-indigo-800 bg-indigo-50 p-2 rounded">{uploadMsg}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "dogrulama" && (
            <div className="space-y-4">
              {exam.status === "IN_REVIEW" && (
                <Card>
                  <CardHeader><CardTitle>İnceleme Onayı</CardTitle></CardHeader>
                  <CardContent className="flex gap-3">
                    <Button className="bg-purple-600" onClick={publish} disabled={saving}>Yayınla</Button>
                    <Button variant="outline" onClick={rejectReview} disabled={saving}>Reddet (okutmaya geri al)</Button>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle>Batch Geçmişi</CardTitle></CardHeader>
                <CardContent>
                  {exam.scanBatches.length === 0 ? (
                    <p className="text-gray-500">Henüz batch yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {exam.scanBatches.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{b.externalBatchId.slice(0, 8)}…</p>
                            <p className="text-xs text-gray-500">
                              {new Date(b.createdAt).toLocaleString("tr-TR")} — {b.operator.firstName} {b.operator.lastName} — {b._count.items} form
                            </p>
                            {b.summaryJson && (
                              <p className="text-xs text-gray-600">
                                Eşleşen: {b.summaryJson.matched ?? 0} / Eşleşmeyen: {b.summaryJson.unmatched ?? 0}
                              </p>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => loadBatch(b.externalBatchId)}>Detay</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {batchDetail && (
                    <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(batchDetail, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Sonuçlar ({exam.results.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="p-2 text-left">Öğrenci</th><th className="p-2 text-left">Sınıf</th><th className="p-2 text-right">Net</th><th className="p-2 text-right">Doğru</th></tr></thead>
                      <tbody>
                        {exam.results.map((r) => (
                          <tr key={r.id} className="border-b">
                            <td className="p-2">{r.student.firstName} {r.student.lastName}</td>
                            <td className="p-2">{r.student.grade}</td>
                            <td className="p-2 text-right">{r.netScore?.toFixed(2) ?? "—"}</td>
                            <td className="p-2 text-right">{r.correctCount ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "analiz" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Kazanım Analizi</CardTitle>
                {exam.status === "PUBLISHED" && (
                  <a href={`/api/exams/${examId}/analytics/export`} download>
                    <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Excel (CSV)</Button>
                  </a>
                )}
              </CardHeader>
              <CardContent>
                {exam.status !== "PUBLISHED" ? (
                  <p className="text-gray-600">Analiz yayınlanmış sınavlar için kullanılabilir.</p>
                ) : analytics ? (
                  <div className="space-y-6">
                    <p className="text-sm">Katılımcı: {analytics.participantCount}</p>
                    <div>
                      <h3 className="font-semibold mb-2">Sınıf Kazanım Özeti (en zayıf)</h3>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="p-2 text-left">Ders</th><th className="p-2 text-left">Konu</th><th className="p-2 text-right">Başarı</th></tr></thead>
                        <tbody>
                          {analytics.outcomeSummary.slice(0, 15).map((o, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{o.subject}</td>
                              <td className="p-2">{o.topic}</td>
                              <td className="p-2 text-right">{(o.rate * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Zayıf Kazanımlı Öğrenciler</h3>
                      {analytics.studentWeakness.filter((s) => s.weakOutcomes.length > 0).slice(0, 20).map((s, i) => (
                        <div key={i} className="mb-3 p-3 border rounded-lg text-sm">
                          <p className="font-medium">{s.firstName} {s.lastName} ({s.grade})</p>
                          <ul className="mt-1 text-gray-600">
                            {s.weakOutcomes.slice(0, 5).map((w, j) => (
                              <li key={j}>{w.subject} / {w.topic}: {(w.rate * 100).toFixed(0)}%</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin" />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
