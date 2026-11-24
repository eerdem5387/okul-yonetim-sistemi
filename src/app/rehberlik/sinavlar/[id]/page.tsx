"use client"
import { notify } from "@/lib/notify"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/layout/sidebar"
import { hasAnyModulePermission } from "@/lib/permissions/access"
import { fetchPermissionsMe } from "@/lib/permissions/client"
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
  Trash2,
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
  DRAFT: "Hazırlanıyor",
  CONFIGURED: "Hazırlanıyor",
  READY_FOR_SCAN: "Okutmaya açık",
  SCANNING: "Okutuluyor",
  IN_REVIEW: "Kontrol ediliyor",
  PUBLISHED: "Yayında",
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
    bookletVariant: string | null
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
    wrongCount: number | null
    blankCount: number | null
    ranking: number | null
    bookletVariant: string | null
    scores: { sections?: Array<{ name: string; net: number }>; rule?: string } | null
    student: { firstName: string; lastName: string; grade: string }
  }>
}

interface Readiness {
  ready: boolean
  issues: string[]
  warnings?: string[]
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
  averageNet?: number | null
  sectionAverages?: Array<{ name: string; averageNet: number }>
  outcomeSummary: Array<{ subject: string; topic: string; learningOutcome: string; rate: number; correctCount: number; totalQuestions: number }>
  studentWeakness: Array<{ firstName: string; lastName: string; grade: string; weakOutcomes: Array<{ subject: string; topic: string; rate: number }> }>
}

type FmtSection = { name: string; activeLength: number; startQuestion: number; endQuestion: number }
type FmtPreview = { file: File; base64: string; label: string; sections: FmtSection[]; warnings: string[] }

type PreviewRow = {
  index: number
  nameOnForm: string | null
  tcNumber: string | null
  bookletVariant: string | null
  matchedStudent: string | null
  errorCodes: string[]
  firstAnswers: string
  marked: number
}
type TxtPreview = {
  file: File
  base64: string
  parse: { rowCount: number; encodingUsed: string; formatMismatchRows?: number }
  summary: Record<string, number>
  rows: PreviewRow[]
}

type BatchItem = {
  id: string
  itemIndex: number
  studentNameRaw: string | null
  bookletVariant: string | null
  matchStatus: string
  errorCodes: string[]
  student: { id: string; firstName: string; lastName: string; grade: string } | null
}
type BatchDetail = { externalBatchId: string; items: BatchItem[] }
type ScopeStudent = { id: string; firstName: string; lastName: string; grade: string }

/** Okutma hata kodlarının Türkçe karşılıkları */
const ERROR_LABELS: Record<string, string> = {
  TC_MISSING: "TC okunamadı",
  TC_INVALID: "TC hatalı",
  STUDENT_NOT_FOUND: "Öğrenci bulunamadı",
  OUT_OF_SCOPE: "Başka sınıf/şube",
  DUPLICATE_TC: "Aynı TC iki kez",
  DUPLICATE_STUDENT: "Aynı öğrenci iki kez",
  LOW_CONFIDENCE: "Okuma güveni düşük",
  AMBIGUOUS_ANSWER: "Çift işaret var",
  NAME_FALLBACK: "İsimle eşleşti",
  NAME_AMBIGUOUS: "Birden çok benzer isim",
  NAME_MISMATCH: "İsim TC ile uyuşmuyor",
  BOOKLET_MISSING: "Kitapçık okunamadı (A sayıldı)",
  RESCANNED: "Yeniden okutuldu",
  FORMAT_MISMATCH: "Satır formu uyuşmuyor",
}
const BLOCKING = new Set(["STUDENT_NOT_FOUND", "DUPLICATE_TC", "DUPLICATE_STUDENT", "NAME_AMBIGUOUS", "TC_MISSING"])

function ErrorChips({ codes }: { codes: string[] }) {
  if (!codes.length) return <span className="text-xs text-green-700">Sorunsuz</span>
  return (
    <span className="flex flex-wrap gap-1">
      {codes.map((c) => (
        <span
          key={c}
          className={`rounded px-1.5 py-0.5 text-[11px] ${BLOCKING.has(c) ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
        >
          {ERROR_LABELS[c] ?? c}
        </span>
      ))}
    </span>
  )
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
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null)
  const [fmtPreview, setFmtPreview] = useState<FmtPreview | null>(null)
  const [txtPreview, setTxtPreview] = useState<TxtPreview | null>(null)
  const [keyPaste, setKeyPaste] = useState<Record<string, string>>({})
  const [showBooklet, setShowBooklet] = useState(false)
  const [scopeStudents, setScopeStudents] = useState<ScopeStudent[]>([])

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
      if (q.bookletVariant && q.bookletVariant !== "A") continue
      if (q.correctAnswer) keys[q.id] = q.correctAnswer
      if (q.outcomeId) omap[q.id] = q.outcomeId
    }
    setAnswerKey(keys)
    setOutcomeMap(omap)
  }, [examId])

  useEffect(() => {
    const role = localStorage.getItem("auth_role")
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }
    const load = () => {
    Promise.all([
      fetchExam(),
      fetch("/api/exam-scan-templates", { headers: getAuthHeaders() }).then((r) => r.json()),
    ]).then(([, tplData]) => {
      setTemplates(tplData.templates ?? [])
      setLoading(false)
    })
    }
    if (canAccessExamPages(role)) {
      load()
      return
    }
    fetchPermissionsMe({ redirectOn401: false }).then((me) => {
      if (me && hasAnyModulePermission(me.permissions, "exams")) {
        load()
        return
      }
      router.push("/")
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
    const baseQuestions = exam.questions.filter((q) => !q.bookletVariant || q.bookletVariant === "A")
    const questions = baseQuestions.map((q) => ({
      id: q.id,
      correctAnswer: answerKey[q.id] ?? null,
      outcomeId: outcomeMap[q.id] ?? null,
    }))
    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ bulk: true, questions }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) notify(data.error ?? "Kaydedilemedi")
    else notify(data.rescored ? `Kaydedildi. ${data.rescored} öğrencinin sonucu yeni anahtarla yeniden hesaplandı.` : "Cevap anahtarı kaydedildi.")
    await fetchExam()
    setSaving(false)
  }

  const markReady = async () => {
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/ready`, { method: "POST", headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) notify(data.error + (data.readiness?.issues ? "\n" + data.readiness.issues.join("\n") : ""))
    await fetchExam()
    setSaving(false)
  }

  const publish = async () => {
    if (!confirm("Sınav sonuçları veli ve öğretmenlere görünür olacak. Onaylıyor musunuz?")) return
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/publish`, { method: "POST", headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) notify(data.error)
    await fetchExam()
    setSaving(false)
  }

  const rejectReview = async () => {
    if (!confirm("Tüm okutmalar ve bunlardan gelen sonuçlar silinecek; sınav yeniden okutmaya açılacak. Devam edilsin mi?")) return
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/publish`, { method: "DELETE", headers: getAuthHeaders() })
    if (res.ok) notify("Okutmalar ve sonuçlar silindi. Dosyaları yeniden yükleyebilirsiniz.")
    setBatchDetail(null)
    await fetchExam()
    setSaving(false)
  }

  const applyKeyPaste = async (sectionId: string, variant: "A" | "B") => {
    const answers = keyPaste[`${variant}:${sectionId}`] ?? ""
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ keyPaste: { sectionId, variant, answers } }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) notify(data.error ?? "Anahtar kaydedilemedi")
    else {
      notify(
        `${variant} kitapçığı anahtarı kaydedildi.` +
          (data.rescored ? ` ${data.rescored} öğrencinin sonucu yeniden hesaplandı.` : "")
      )
      setKeyPaste((prev) => ({ ...prev, [`${variant}:${sectionId}`]: "" }))
    }
    await fetchExam()
    setSaving(false)
  }

  const removeBooklet = async () => {
    if (!confirm("B kitapçığının ayrı anahtarı silinsin mi? B kitapçıklı öğrenciler A anahtarıyla puanlanır.")) return
    setSaving(true)
    await fetch(`/api/exams/${examId}/questions`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ removeVariant: "B" }),
    })
    setShowBooklet(false)
    await fetchExam()
    setSaving(false)
  }

  const loadScopeStudents = async () => {
    if (scopeStudents.length) return
    const res = await fetch(`/api/exams/${examId}/students`, { headers: getAuthHeaders() })
    const data = await res.json().catch(() => ({}))
    setScopeStudents(data.students ?? [])
  }

  const assignItem = async (batchId: string, itemId: string, studentId: string) => {
    if (!studentId) return
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/scan-batches/${batchId}/items/${itemId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ studentId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) notify(data.error ?? "Eşleştirilemedi")
    else notify("Kağıt öğrenciyle eşleştirildi ve puanlandı.")
    await loadBatch(batchId)
    await fetchExam()
    setSaving(false)
  }

  const deleteBatch = async (batchId: string) => {
    if (!confirm("Bu okutma ve ondan gelen sonuçlar silinsin mi?")) return
    setSaving(true)
    const res = await fetch(`/api/exams/${examId}/scan-batches/${batchId}`, { method: "DELETE", headers: getAuthHeaders() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) notify(data.error ?? "Silinemedi")
    else notify("Okutma ve sonuçları silindi.")
    setBatchDetail(null)
    await fetchExam()
    setSaving(false)
  }

  const downloadAnalytics = async () => {
    const res = await fetch(`/api/exams/${examId}/analytics/export`, { headers: getAuthHeaders() })
    if (!res.ok) {
      notify("Analiz indirilemedi")
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${exam?.name ?? "sinav"}-kazanim-analizi.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteExam = async () => {
    if (!exam) return
    if (exam.status === "PUBLISHED") {
      notify("Yayınlanmış sınav silinemez.")
      return
    }
    const ok = confirm(
      `"${exam.name}" sınavını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
    )
    if (!ok) return
    setSaving(true)
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        notify(data.error || "Sınav silinemedi")
        setSaving(false)
        return
      }
      router.push("/rehberlik/sinavlar")
    } catch {
      notify("Sınav silinirken bir hata oluştu")
      setSaving(false)
    }
  }

  const loadBatch = async (batchId: string) => {
    const res = await fetch(`/api/exams/${examId}/scan-batches/${batchId}`, { headers: getAuthHeaders() })
    const data = await res.json()
    setBatchDetail(data.batch)
    if (data.batch?.items?.some((i: BatchItem) => !i.student)) void loadScopeStudents()
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
      notify("Şablon indirilemedi")
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
    setTxtPreview(null)
    try {
      const contentBase64 = await fileToBase64(file)
      const res = await fetch(`/api/exams/${examId}/scan-batches/from-txt`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ contentBase64, encoding: "cp1254", dryRun: true }),
      })
      const data = await res.json()
      if (!res.ok) setUploadMsg(data.error ?? "Dosya okunamadı")
      else setTxtPreview({ file, base64: contentBase64, parse: data.parse, summary: data.summary, rows: data.rows })
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Dosya okunamadı")
    } finally {
      setTxtUploading(false)
    }
  }

  const commitTxt = async () => {
    if (!txtPreview) return
    setTxtUploading(true)
    try {
      const res = await fetch(`/api/exams/${examId}/scan-batches/from-txt`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contentBase64: txtPreview.base64,
          encoding: "cp1254",
          operatorNote: `Web TXT: ${txtPreview.file.name}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadMsg(data.error ?? "Kaydedilemedi")
      } else {
        notify(
          `${data.summary?.matched ?? 0} kağıt kaydedildi` +
            (data.summary?.unmatched ? `, ${data.summary.unmatched} kağıt eşleşmedi (Kontrol sekmesinden elle eşleştirin).` : ".")
        )
        setTxtPreview(null)
        setTab("dogrulama")
      }
      await fetchExam()
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Kaydedilemedi")
    } finally {
      setTxtUploading(false)
    }
  }

  const previewFmt = async (file: File) => {
    setSaving(true)
    setUploadMsg(null)
    try {
      const contentBase64 = await fileToBase64(file)
      const res = await fetch("/api/exam-scan-templates/from-fmt", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ contentBase64, fileName: file.name, previewOnly: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadMsg(data.error ?? "Form şablonu okunamadı")
        return
      }
      setFmtPreview({
        file,
        base64: contentBase64,
        label: data.layout?.label ?? file.name,
        sections: (data.layout?.answerSections ?? []).map((s: FmtSection) => ({ ...s })),
        warnings: data.warnings ?? [],
      })
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Form şablonu okunamadı")
    } finally {
      setSaving(false)
    }
  }

  const saveFmt = async (createSections: boolean) => {
    if (!fmtPreview) return
    setSaving(true)
    try {
      const res = await fetch("/api/exam-scan-templates/from-fmt", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contentBase64: fmtPreview.base64,
          fileName: fmtPreview.file.name,
          sectionOverrides: fmtPreview.sections.map((s) => ({ activeLength: s.activeLength, name: s.name })),
          createSectionsForExamId: createSections ? examId : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadMsg(data.error ?? "Form şablonu kaydedilemedi")
        return
      }
      const tplRes = await fetch("/api/exam-scan-templates", { headers: getAuthHeaders() })
      const tplData = await tplRes.json()
      setTemplates(tplData.templates ?? [])
      if (!createSections && data.template?.id) await saveTemplate(data.template.id)
      notify(
        createSections
          ? `Form kaydedildi, ${data.layout?.answerSections?.length ?? 0} ders oluşturuldu. Şimdi cevap anahtarını girin.`
          : "Form şablonu kaydedildi ve sınava atandı."
      )
      setFmtPreview(null)
      if (createSections) setTab("sorular")
      await fetchExam()
    } finally {
      setSaving(false)
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

  // Yapı (ders/soru/form) okutmaya açılınca kilitlenir; anahtar yayına kadar düzeltilebilir (sonuçlar yeniden hesaplanır)
  const locked = exam.status !== "DRAFT" && exam.status !== "CONFIGURED"
  const keyLocked = exam.status === "PUBLISHED" || exam.status === "ARCHIVED"
  const scanOpen = exam.status === "READY_FOR_SCAN" || exam.status === "SCANNING" || exam.status === "IN_REVIEW"
  const ruleText = exam.results.find((r) => r.scores?.rule)?.scores?.rule ??
    (exam.examType === "LGS" || (exam.grade != null && exam.grade >= 5 && exam.grade <= 8 && exam.examType !== "YKS")
      ? "3 yanlış 1 doğruyu götürür; çift işaret yanlış sayılır"
      : "4 yanlış 1 doğruyu götürür; çift işaret yanlış sayılır")
  const hasBooklet = exam.questions.some((q) => q.bookletVariant && q.bookletVariant !== "A")
  const sectionNames = exam.sections.map((s) => s.name)
  const tabs: { id: Tab; label: string }[] = [
    { id: "genel", label: "Genel" },
    { id: "kazanimlar", label: "Kazanımlar" },
    { id: "sorular", label: "Sorular & Anahtar" },
    { id: "okutma", label: "Okutma" },
    { id: "dogrulama", label: "Kontrol ve sonuçlar" },
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
            {exam.status !== "PUBLISHED" && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={saving}
                onClick={() => void deleteExam()}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Sil
              </Button>
            )}
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
                <CardHeader><CardTitle>Optik Şablon (Sekonic FMT)</CardTitle></CardHeader>
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
                  {!locked && !fmtPreview && (
                    <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-sm">
                      <p className="text-gray-700">
                        Listede yoksa yayınevinin <code>.fmt</code> form dosyasını yükleyin. Dersler ve soru sayıları
                        kaydetmeden önce gösterilir; gerekirse düzeltirsiniz.
                      </p>
                      <input
                        type="file"
                        accept=".fmt,text/plain"
                        disabled={saving}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void previewFmt(f)
                          e.target.value = ""
                        }}
                      />
                    </div>
                  )}
                  {fmtPreview && (
                    <div className="space-y-3 rounded-lg border border-indigo-200 bg-white p-3 text-sm">
                      <p className="font-medium text-indigo-900">{fmtPreview.label}: dersleri ve soru sayılarını kontrol edin</p>
                      {fmtPreview.warnings.map((w) => (
                        <p key={w} className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4" /> {w}</p>
                      ))}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="p-1">Ders</th>
                            <th className="p-1 w-24">Soru sayısı</th>
                            <th className="p-1">Sorular</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let next = 1
                            return fmtPreview.sections.map((sec, i) => {
                              const from = next
                              next += sec.activeLength
                              return (
                                <tr key={i} className="border-b">
                                  <td className="p-1">
                                    <Input
                                      value={sec.name}
                                      onChange={(e) => {
                                        const sections = [...fmtPreview.sections]
                                        sections[i] = { ...sec, name: e.target.value }
                                        setFmtPreview({ ...fmtPreview, sections })
                                      }}
                                    />
                                  </td>
                                  <td className="p-1">
                                    <Input
                                      type="number"
                                      min={1}
                                      value={sec.activeLength}
                                      onChange={(e) => {
                                        const sections = [...fmtPreview.sections]
                                        sections[i] = { ...sec, activeLength: Math.max(1, Number(e.target.value) || 1) }
                                        setFmtPreview({ ...fmtPreview, sections })
                                      }}
                                    />
                                  </td>
                                  <td className="p-1 text-gray-600">{from}–{next - 1}</td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-500">
                        Toplam {fmtPreview.sections.reduce((n, s) => n + s.activeLength, 0)} soru. Soru sayısı formdaki
                        sütundan fazla olamaz; LGS formlarında çoğunlukla 20 veya 10 olur.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void saveFmt(true)} disabled={saving}>Kaydet ve dersleri oluştur</Button>
                        <Button size="sm" variant="outline" onClick={() => void saveFmt(false)} disabled={saving}>Yalnızca form şablonu olarak kaydet</Button>
                        <Button size="sm" variant="ghost" onClick={() => setFmtPreview(null)} disabled={saving}>Vazgeç</Button>
                      </div>
                    </div>
                  )}
                  {uploadMsg && tab === "genel" && (
                    <p className="text-sm text-indigo-800 bg-indigo-50 p-2 rounded">{uploadMsg}</p>
                  )}
                </CardContent>
              </Card>
              {readiness && (
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle>Okutmaya açmadan önce</CardTitle></CardHeader>
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
                    {readiness.warnings?.map((w, i) => (
                      <p key={i} className="mt-2 text-sm text-gray-600">ℹ️ {w}</p>
                    ))}
                    <p className="mt-2 text-sm text-gray-600">Net kuralı: {ruleText}.</p>
                    {exam.status === "DRAFT" || exam.status === "CONFIGURED" ? (
                      <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={markReady} disabled={saving || !readiness.ready}>
                        Okutmaya aç
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
              {exam.sections.length > 0 && !keyLocked && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                    <CardTitle>Hızlı cevap anahtarı</CardTitle>
                    {hasBooklet || showBooklet ? (
                      <Button size="sm" variant="outline" onClick={() => (hasBooklet ? void removeBooklet() : setShowBooklet(false))} disabled={saving}>
                        B kitapçığını kaldır
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setShowBooklet(true)}>
                        + B kitapçığı (ayrı anahtar)
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Her dersin cevaplarını yayınevinin anahtarından kopyalayıp yapıştırın (ör. <code>ABCDA BDCCA…</code>).
                      Boşluk ve rakamlar yok sayılır.
                      {scanOpen ? " Okutma sonrası anahtar değişirse sonuçlar otomatik yeniden hesaplanır." : ""}
                    </p>
                    {exam.sections.map((sec) => {
                      const count = sec.questionEnd - sec.questionStart + 1
                      const variants: Array<"A" | "B"> = hasBooklet || showBooklet ? ["A", "B"] : ["A"]
                      return (
                        <div key={sec.id} className="grid gap-2 md:grid-cols-[160px_1fr]">
                          <div className="text-sm font-medium pt-2">
                            {sec.name} <span className="text-gray-500 font-normal">({count} soru)</span>
                          </div>
                          <div className="space-y-2">
                            {variants.map((v) => {
                              const k = `${v}:${sec.id}`
                              const typed = (keyPaste[k] ?? "").toUpperCase().replace(/[^A-E]/g, "").length
                              const current = exam.questions
                                .filter((q) => q.questionNo >= sec.questionStart && q.questionNo <= sec.questionEnd)
                                .filter((q) => (v === "A" ? !q.bookletVariant || q.bookletVariant === "A" : q.bookletVariant === v))
                                .sort((a, b) => a.questionNo - b.questionNo)
                                .map((q) => q.correctAnswer ?? "·")
                                .join("")
                              return (
                                <div key={v} className="flex flex-wrap items-center gap-2">
                                  {variants.length > 1 && <span className="w-6 text-xs font-semibold text-gray-500">{v}</span>}
                                  <Input
                                    className="flex-1 min-w-[220px] font-mono uppercase"
                                    placeholder={current && current.replace(/·/g, "") ? current : `${count} harf yapıştırın`}
                                    value={keyPaste[k] ?? ""}
                                    onChange={(e) => setKeyPaste({ ...keyPaste, [k]: e.target.value })}
                                  />
                                  <span className={`text-xs ${typed === count ? "text-green-700" : "text-gray-500"}`}>{typed}/{count}</span>
                                  <Button size="sm" disabled={saving || typed !== count} onClick={() => void applyKeyPaste(sec.id, v)}>
                                    Uygula
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
              {!locked && (
                <Card>
                  <CardHeader><CardTitle>Ders / bölüm ekle (form şablonu kullanmıyorsanız)</CardTitle></CardHeader>
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
                    {!keyLocked && (
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
                        {exam.questions.filter((q) => !q.bookletVariant || q.bookletVariant === "A").map((q) => (
                          <tr key={q.id} className="border-b">
                            <td className="p-2">{q.questionNo}</td>
                            <td className="p-2">
                              <select
                                className="w-full p-1 border rounded text-xs"
                                disabled={keyLocked}
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
                                disabled={keyLocked}
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
                <CardHeader><CardTitle>Optik okuyucu dosyasını yükle</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {scanOpen ? (
                    <p className="text-sm text-gray-700">
                      Okuyucunun ürettiği <code>.txt</code> dosyasını seçin. Önce okunan kağıtlar gösterilir, onaylarsanız kaydedilir.
                      Şube şube birden çok dosya yükleyebilirsiniz.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Dosya yüklemek için önce Genel sekmesinde &quot;Okutmaya aç&quot; deyin (cevap anahtarı ve form şablonu tamam olmalı).
                    </p>
                  )}
                  {exam.scanTemplate && (
                    <p className="text-xs text-gray-500">Form: {exam.scanTemplate.label} · Net kuralı: {ruleText}</p>
                  )}
                  {!txtPreview && (
                    <input
                      type="file"
                      accept=".txt,text/plain"
                      disabled={txtUploading || !scanOpen}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void uploadDeviceTxt(f)
                        e.target.value = ""
                      }}
                    />
                  )}
                  {txtUploading && (
                    <p className="text-sm flex items-center gap-2 text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" /> İşleniyor…
                    </p>
                  )}
                  {uploadMsg && tab === "okutma" && (
                    <p className="text-sm text-red-800 bg-red-50 p-2 rounded">{uploadMsg}</p>
                  )}
                </CardContent>
              </Card>

              {txtPreview && (
                <Card className="border-indigo-200">
                  <CardHeader><CardTitle>Önizleme: {txtPreview.file.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded bg-gray-100 px-2 py-1">{txtPreview.parse.rowCount} kağıt</span>
                      <span className="rounded bg-green-100 px-2 py-1 text-green-800">{txtPreview.summary.matched ?? 0} eşleşti</span>
                      {(txtPreview.summary.unmatched ?? 0) > 0 && (
                        <span className="rounded bg-red-100 px-2 py-1 text-red-800">{txtPreview.summary.unmatched} eşleşmedi</span>
                      )}
                      {(txtPreview.summary.nameMatched ?? 0) > 0 && (
                        <span className="rounded bg-amber-100 px-2 py-1 text-amber-800">{txtPreview.summary.nameMatched} isimle eşleşti</span>
                      )}
                      {(txtPreview.summary.rescanned ?? 0) > 0 && (
                        <span className="rounded bg-amber-100 px-2 py-1 text-amber-800">{txtPreview.summary.rescanned} öğrencinin önceki sonucu değişecek</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      İlk sütunlardaki cevapların mantıklı göründüğünü kontrol edin (·: boş, *: çift işaret). Harfler kaymış görünüyorsa yanlış form şablonu seçilmiştir.
                    </p>
                    <div className="max-h-96 overflow-auto rounded border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr className="text-left text-gray-500">
                            <th className="p-2">Formdaki ad</th>
                            <th className="p-2">Eşleşen öğrenci</th>
                            <th className="p-2">Kitapçık</th>
                            <th className="p-2">İlk 10 cevap</th>
                            <th className="p-2">Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txtPreview.rows.map((r) => (
                            <tr key={r.index} className={`border-t ${r.matchedStudent ? "" : "bg-red-50/60"}`}>
                              <td className="p-2">{r.nameOnForm || "—"}</td>
                              <td className="p-2">{r.matchedStudent ?? <span className="text-red-700">Eşleşmedi</span>}</td>
                              <td className="p-2">{r.bookletVariant ?? "—"}</td>
                              <td className="p-2 font-mono tracking-wider">{r.firstAnswers}</td>
                              <td className="p-2"><ErrorChips codes={r.errorCodes} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void commitTxt()} disabled={txtUploading}>
                        {txtUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Onayla ve kaydet
                      </Button>
                      <Button variant="outline" onClick={() => setTxtPreview(null)} disabled={txtUploading}>Vazgeç</Button>
                    </div>
                    {(txtPreview.summary.unmatched ?? 0) > 0 && (
                      <p className="text-xs text-gray-600">Eşleşmeyen kağıtları kaydettikten sonra Kontrol sekmesinde öğrenci seçerek eşleştirebilirsiniz.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {tab === "dogrulama" && (
            <div className="space-y-4">
              {exam.status === "IN_REVIEW" && (
                <Card>
                  <CardHeader><CardTitle>Kontrol ve yayın</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {exam.results.length} öğrencinin sonucu hazır. Eşleşmeyen kağıt kalmadıysa yayınlayın; sonuçlar veli ve öğretmenlere görünür.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button className="bg-purple-600" onClick={publish} disabled={saving}>Yayınla</Button>
                      <Button variant="outline" onClick={rejectReview} disabled={saving}>Tüm okutmaları sil ve baştan başla</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle>Yüklenen dosyalar</CardTitle></CardHeader>
                <CardContent>
                  {exam.scanBatches.length === 0 ? (
                    <p className="text-gray-500">Henüz dosya yüklenmedi.</p>
                  ) : (
                    <div className="space-y-2">
                      {exam.scanBatches.map((b) => (
                        <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(b.createdAt).toLocaleString("tr-TR")} · {b._count.items} kağıt
                            </p>
                            <p className="text-xs text-gray-500">
                              {b.operator.firstName} {b.operator.lastName}
                              {b.summaryJson ? ` · eşleşen ${b.summaryJson.matched ?? 0} · eşleşmeyen ${b.summaryJson.unmatched ?? 0}` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => loadBatch(b.externalBatchId)}>Kağıtlar</Button>
                            {scanOpen && (
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => void deleteBatch(b.externalBatchId)} disabled={saving}>
                                Geri al
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {batchDetail && (
                    <div className="mt-4 max-h-[28rem] overflow-auto rounded border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr className="text-left text-gray-500">
                            <th className="p-2">#</th>
                            <th className="p-2">Formdaki ad</th>
                            <th className="p-2">Öğrenci</th>
                            <th className="p-2">Kitapçık</th>
                            <th className="p-2">Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchDetail.items.map((item) => (
                            <tr key={item.id} className={`border-t ${item.student ? "" : "bg-red-50/60"}`}>
                              <td className="p-2 text-gray-500">{item.itemIndex + 1}</td>
                              <td className="p-2">{item.studentNameRaw || "—"}</td>
                              <td className="p-2">
                                {scanOpen ? (
                                  <select
                                    className="w-full max-w-xs rounded border p-1 text-sm"
                                    value={item.student?.id ?? ""}
                                    disabled={saving}
                                    onFocus={() => void loadScopeStudents()}
                                    onChange={(e) => void assignItem(batchDetail.externalBatchId, item.id, e.target.value)}
                                  >
                                    <option value="">{item.student ? "" : "Öğrenci seçin…"}</option>
                                    {item.student && !scopeStudents.some((s) => s.id === item.student!.id) && (
                                      <option value={item.student.id}>{item.student.firstName} {item.student.lastName}</option>
                                    )}
                                    {scopeStudents.map((s) => (
                                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.grade})</option>
                                    ))}
                                  </select>
                                ) : item.student ? (
                                  `${item.student.firstName} ${item.student.lastName}`
                                ) : (
                                  <span className="text-red-700">Eşleşmedi</span>
                                )}
                              </td>
                              <td className="p-2">{item.bookletVariant ?? "—"}</td>
                              <td className="p-2">
                                {item.matchStatus === "MANUAL" ? <span className="text-xs text-indigo-700">Elle eşleştirildi</span> : <ErrorChips codes={item.errorCodes} />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Sonuçlar ({exam.results.length})</CardTitle></CardHeader>
                <CardContent>
                  <p className="mb-2 text-xs text-gray-500">Net kuralı: {ruleText}.</p>
                  <div className="overflow-x-auto max-h-[32rem]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b">
                          <th className="p-2 text-right">Sıra</th>
                          <th className="p-2 text-left">Öğrenci</th>
                          <th className="p-2 text-left">Sınıf</th>
                          {hasBooklet && <th className="p-2 text-center">Kit.</th>}
                          {sectionNames.map((n) => (
                            <th key={n} className="p-2 text-right whitespace-nowrap">{n}</th>
                          ))}
                          <th className="p-2 text-right">D / Y / B</th>
                          <th className="p-2 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.results.map((r) => (
                          <tr key={r.id} className="border-b">
                            <td className="p-2 text-right text-gray-500">{r.ranking ?? "—"}</td>
                            <td className="p-2">{r.student.firstName} {r.student.lastName}</td>
                            <td className="p-2">{r.student.grade}</td>
                            {hasBooklet && <td className="p-2 text-center">{r.bookletVariant ?? "A"}</td>}
                            {sectionNames.map((n) => (
                              <td key={n} className="p-2 text-right">
                                {r.scores?.sections?.find((s) => s.name === n)?.net.toFixed(2) ?? "—"}
                              </td>
                            ))}
                            <td className="p-2 text-right text-gray-600">{r.correctCount ?? 0} / {r.wrongCount ?? 0} / {r.blankCount ?? 0}</td>
                            <td className="p-2 text-right font-semibold">{r.netScore?.toFixed(2) ?? "—"}</td>
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
                  <Button size="sm" variant="outline" onClick={() => void downloadAnalytics()}>
                    <Download className="h-4 w-4 mr-1" /> Excel (CSV)
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {exam.status !== "PUBLISHED" ? (
                  <p className="text-gray-600">Analiz yayınlanmış sınavlar için kullanılabilir.</p>
                ) : analytics ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded bg-gray-100 px-3 py-1">Katılımcı: {analytics.participantCount}</span>
                      {analytics.averageNet != null && (
                        <span className="rounded bg-purple-100 px-3 py-1 text-purple-800">Ortalama net: {analytics.averageNet.toFixed(2)}</span>
                      )}
                      {analytics.sectionAverages?.map((s) => (
                        <span key={s.name} className="rounded bg-indigo-50 px-3 py-1 text-indigo-800">{s.name}: {s.averageNet.toFixed(2)}</span>
                      ))}
                    </div>
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
