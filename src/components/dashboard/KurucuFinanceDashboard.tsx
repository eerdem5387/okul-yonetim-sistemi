"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { staffAuthHeaders } from "@/lib/permissions/client"

type SeriesPoint = { month: string; income: number; expense: number; net: number }

type RequestRow = {
  id: string
  title: string
  requesterName: string
  channel: string
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
  total: string | number | null
  notes: string | null
  founderApprovedAt: string | null
  founderApprovedByName: string | null
  rejectedByName: string | null
  rejectReason: string | null
  sourceCreatedAt: string | null
}

type Movement = {
  id: string
  side: string
  amount: string | number
  occurredAt: string
  channel: string
  bankName: string | null
  incomeCategory: string | null
  payerFirstName: string | null
  payerLastName: string | null
  expenseTitle: string | null
  invoiceNo: string | null
}

type OzetPayload = {
  currentMonth: string
  current: SeriesPoint
  series: SeriesPoint[]
  pendingRequests: RequestRow[]
  awaitingAccounting: RequestRow[]
  recentRequests: RequestRow[]
  recentMovements: Movement[]
  requestCounts: Record<string, number>
  breakdowns: {
    expenseByChannel: Record<string, number>
    incomeByCategory: Record<string, number>
  }
  live:
    | { available: false }
    | {
        available: true
        tenantName: string | null
        exportedAt: string
        schedule: { realized: number; expected: number; blocked: number }
        students: {
          total: number
          activeEnrollments: number
          collectedEnrollments: number
          collectionRate: number
          collectionAmount: number
        }
        requests: { pending: number; approvedAwaiting: number }
      }
  canApprove: boolean
}

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n)

const CHANNEL_TR: Record<string, string> = {
  BANK: "Banka",
  CHECK: "Çek",
  CREDIT_CARD: "Kredi kartı",
  CASH: "Nakit",
  PROMISSORY: "Senet",
  TRANSFER: "Havale",
}

const INCOME_TR: Record<string, string> = {
  STUDENT: "Öğrenci",
  TRIP: "Gezi",
  FOOD: "Yemek",
  OTHER: "Diğer",
}

const AYLAR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
]

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return `${AYLAR[m - 1]} ${y}`
}

function monthShort(ym: string) {
  const [, m] = ym.split("-").map(Number)
  return AYLAR[(m || 1) - 1]?.slice(0, 3) ?? ym
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function movementTitle(e: Movement) {
  if (e.side === "INCOME") {
    const cat = e.incomeCategory ? INCOME_TR[e.incomeCategory] ?? e.incomeCategory : "Gelir"
    const name = [e.payerFirstName, e.payerLastName].filter(Boolean).join(" ")
    return name ? `${cat} · ${name}` : cat
  }
  return e.expenseTitle || "Gider"
}

function BreakdownBars({
  data,
  labels,
  colorClass,
}: {
  data: Record<string, number>
  labels: Record<string, string>
  colorClass: string
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, v]) => v), 1)
  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-400">Bu ay veri yok.</p>
  }
  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-slate-700">{labels[key] ?? key}</span>
            <span className="tabular-nums text-slate-500">{money(value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function KurucuFinanceDashboard() {
  const defaultMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [month, setMonth] = useState(defaultMonth)
  const [data, setData] = useState<OzetPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [staffName, setStaffName] = useState("")

  useEffect(() => {
    setStaffName(localStorage.getItem("staff_name") || "Kurucu")
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finans/ozet?month=${month}`, {
        headers: staffAuthHeaders(),
        cache: "no-store",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Özet yüklenemedi")
      setData(json as OzetPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  const maxBar = useMemo(() => {
    if (!data?.series?.length) return 1
    return Math.max(...data.series.flatMap((s) => [s.income, s.expense]), 1)
  }, [data])

  async function syncFromMuhasebe() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/finans/talepler", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Senkron başarısız")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Senkron hatası")
    } finally {
      setSyncing(false)
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    const reason =
      action === "reject" ? window.prompt("Red gerekçesi (opsiyonel):") ?? "" : undefined
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch("/api/finans/talepler", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "İşlem başarısız")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Mali panel yükleniyor…
      </div>
    )
  }

  const current = data?.current ?? { month, income: 0, expense: 0, net: 0 }
  const pending = data?.pendingRequests ?? []
  const awaiting = data?.awaitingAccounting ?? []
  const live = data?.live?.available ? data.live : null
  const firstName = staffName.split(" ")[0] || "Kurucu"

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,#ecfdf5_0%,transparent_55%),radial-gradient(900px_500px_at_90%_0%,#f0f9ff_0%,transparent_50%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-50">
                <Scale className="h-3.5 w-3.5" />
                Kurucu mali panel
              </span>
              {live ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Muhasebe canlı
                  {live.tenantName ? ` · ${live.tenantName}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                  Yerel kopya · senkron önerilir
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Merhaba, {firstName}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Tahsilat durumu, kasa hareketleri ve harcama onayları — muhasebe sisteminden.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-sm">
              <button
                type="button"
                aria-label="Önceki ay"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2 text-sm font-semibold text-slate-800">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {monthLabel(month)}
              </div>
              <button
                type="button"
                aria-label="Sonraki ay"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Yenile
            </Button>
            <Button onClick={() => void syncFromMuhasebe()} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
              Muhasebeden çek
            </Button>
            <Link
              href="/finans"
              className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Finans modülü
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Tahsilat KPI (muhasebe canlı) */}
        {live ? (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Gerçekleşen tahsilat"
              value={money(live.schedule.realized)}
              hint="Sözleşme taksitleri"
              tone="income"
              icon={<ArrowUpRight className="h-4 w-4" />}
            />
            <Kpi
              label="Beklenen"
              value={money(live.schedule.expected)}
              hint="Vadesi gelmiş"
              tone="pending"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <Kpi
              label="Blokeli"
              value={money(live.schedule.blocked)}
              hint="Henüz vadesi yok"
              tone="blocked"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <Kpi
              label="Tahsilat oranı"
              value={`%${live.students.collectionRate}`}
              hint={`${live.students.collectedEnrollments}/${live.students.activeEnrollments} kayıt`}
              tone="info"
              icon={<Users className="h-4 w-4" />}
            />
          </section>
        ) : null}

        {/* Kasa KPI */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label={`Kasa gelir · ${monthShort(current.month)}`}
            value={money(current.income)}
            tone="income"
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
          <Kpi
            label={`Kasa gider · ${monthShort(current.month)}`}
            value={money(current.expense)}
            tone="expense"
            icon={<ArrowDownRight className="h-4 w-4" />}
          />
          <Kpi
            label="Net kasa"
            value={money(current.net)}
            tone={current.net >= 0 ? "income" : "expense"}
            icon={<Wallet className="h-4 w-4" />}
          />
          <Kpi
            label="Onay bekleyen"
            value={String(live?.requests.pending ?? data?.requestCounts?.PENDING ?? pending.length)}
            hint={
              (live?.requests.approvedAwaiting ?? data?.requestCounts?.APPROVED ?? 0) > 0
                ? `${live?.requests.approvedAwaiting ?? data?.requestCounts?.APPROVED} muhasebe bekliyor`
                : undefined
            }
            tone="alert"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
        </section>

        {/* Trend + Onay */}
        <section className="grid gap-4 lg:grid-cols-5">
          <Card className="border-0 bg-white/95 shadow-md ring-1 ring-slate-900/5 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Son 6 ay · kasa gelir / gider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-56 items-end gap-2 sm:gap-3">
                {(data?.series ?? []).map((s) => (
                  <div key={s.month} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-44 w-full items-end justify-center gap-1">
                      <div
                        className="w-2.5 rounded-t-md bg-emerald-500 sm:w-3.5"
                        style={{ height: `${Math.max(3, (s.income / maxBar) * 100)}%` }}
                        title={`Gelir ${money(s.income)}`}
                      />
                      <div
                        className="w-2.5 rounded-t-md bg-rose-400 sm:w-3.5"
                        style={{ height: `${Math.max(3, (s.expense / maxBar) * 100)}%` }}
                        title={`Gider ${money(s.expense)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 sm:text-xs">
                      {monthShort(s.month)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Gelir
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Gider
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/95 shadow-md ring-1 ring-slate-900/5 lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Harcama onayları</CardTitle>
                <Badge variant="outline">{pending.length}</Badge>
              </div>
              <p className="text-xs text-slate-500">Kurucu onayı sonrası muhasebe tutarı girer.</p>
            </CardHeader>
            <CardContent className="max-h-[22rem] space-y-3 overflow-y-auto">
              {pending.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  Bekleyen talep yok.
                </p>
              ) : (
                pending.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-500">
                          {r.requesterName} · {CHANNEL_TR[r.channel] ?? r.channel}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold">
                        {r.total != null && r.total !== "" ? money(Number(r.total)) : "Tutar yok"}
                      </p>
                    </div>
                    {r.notes ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.notes}</p>
                    ) : null}
                    {data?.canApprove ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, "approve")}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, "reject")}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reddet
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              <Link
                href="/finans/talepler"
                className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tüm talepler
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Breakdowns */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 bg-white/95 shadow-md ring-1 ring-slate-900/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Gider · ödeme kanalı</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownBars
                data={data?.breakdowns.expenseByChannel ?? {}}
                labels={CHANNEL_TR}
                colorClass="bg-rose-400"
              />
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/95 shadow-md ring-1 ring-slate-900/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Gelir · kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownBars
                data={data?.breakdowns.incomeByCategory ?? {}}
                labels={INCOME_TR}
                colorClass="bg-emerald-500"
              />
            </CardContent>
          </Card>
        </section>

        {/* Movements + awaiting + recent */}
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-0 bg-white/95 shadow-md ring-1 ring-slate-900/5 lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Son hareketler</CardTitle>
                <Link href="/finans/gelir-gider" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                  Detay
                </Link>
              </div>
            </CardHeader>
            <CardContent className="max-h-80 space-y-0 overflow-y-auto">
              {(data?.recentMovements ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Kasa hareketi yok. Senkron deneyin.
                </p>
              ) : (
                (data?.recentMovements ?? []).map((m) => {
                  const income = m.side === "INCOME"
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-100 py-2.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {movementTitle(m)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {CHANNEL_TR[m.channel] ?? m.channel} ·{" "}
                          {new Date(m.occurredAt).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-bold ${
                          income ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {income ? "+" : "−"}
                        {money(Number(m.amount))}
                      </p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/95 shadow-md ring-1 ring-slate-900/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Muhasebe tutar bekliyor</CardTitle>
              <p className="text-xs text-slate-500">Onaylandı, tutar henüz girilmedi.</p>
            </CardHeader>
            <CardContent className="max-h-80 space-y-2 overflow-y-auto">
              {awaiting.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Kayıt yok.</p>
              ) : (
                awaiting.map((r) => (
                  <div key={r.id} className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.requesterName}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/95 shadow-md ring-1 ring-slate-900/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Son talepler</CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 space-y-2 overflow-y-auto">
              {(data?.recentRequests ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Talep yok.</p>
              ) : (
                (data?.recentRequests ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {r.requesterName}
                        {r.founderApprovedByName
                          ? ` · Onay: ${r.founderApprovedByName}`
                          : r.rejectedByName
                            ? ` · Red: ${r.rejectedByName}`
                            : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {r.status === "PENDING"
                        ? "Bekliyor"
                        : r.status === "APPROVED"
                          ? "Onaylı"
                          : r.status === "COMPLETED"
                            ? "Tamam"
                            : "Red"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string
  hint?: string
  icon: ReactNode
  tone: "income" | "expense" | "pending" | "blocked" | "info" | "alert"
}) {
  const tones: Record<string, string> = {
    income: "from-emerald-800 to-teal-700",
    expense: "from-rose-700 to-orange-600",
    pending: "from-sky-700 to-indigo-700",
    blocked: "from-amber-700 to-orange-700",
    info: "from-slate-700 to-slate-900",
    alert: "from-violet-800 to-fuchsia-700",
  }
  return (
    <Card className="overflow-hidden border-0 shadow-md ring-1 ring-slate-900/5">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${tones[tone]} p-4 text-white`}>
          <div className="mb-2 flex items-center justify-between opacity-90">
            <span className="text-xs font-medium leading-snug">{label}</span>
            {icon}
          </div>
          <p className="text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-white/75">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
