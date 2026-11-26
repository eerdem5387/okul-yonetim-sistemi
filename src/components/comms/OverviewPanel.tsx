"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Bell, ClipboardList, MessagesSquare, Send } from "lucide-react"
import { NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import { commsApi, fullName, NOTICE_TYPE_BADGE, Pill, ReadProgress, shortTime } from "./shared"
import type { CommsMe, NoticeBatch, NoticeType, OfficialNotice, StaffCommsRequest } from "./types"

type Go =
  | { tab: "inbox"; id?: string }
  | { tab: "sent"; id?: string }
  | { tab: "requests"; id?: string }
  | { tab: "groups"; id?: string }

/** İç haberleşme özeti: yapılacak işler + hızlı eylemler */
export function OverviewPanel({
  me,
  onGo,
  onCompose,
}: {
  me: CommsMe
  onGo: (go: Go) => void
  onCompose: (type: NoticeType) => void
}) {
  const caps = me.capabilities
  const b = me.badges
  const [pending, setPending] = useState<StaffCommsRequest[]>([])
  const [batches, setBatches] = useState<NoticeBatch[]>([])
  const [unseen, setUnseen] = useState<OfficialNotice[]>([])

  useEffect(() => {
    if (caps.approveRequests) {
      void commsApi<{ requests: StaffCommsRequest[] }>("/api/comms/requests?box=inbox")
        .then((j) => setPending(j.requests.slice(0, 5)))
        .catch(() => undefined)
    }
    if (caps.sendOfficial) {
      void commsApi<{ batches: NoticeBatch[] }>(`/api/comms/notices/batches?scope=${caps.viewAllNotices ? "all" : "mine"}`)
        .then((j) => setBatches(j.batches.slice(0, 5)))
        .catch(() => undefined)
    }
    if (caps.showInbox) {
      void commsApi<{ notices: OfficialNotice[] }>("/api/comms/notices?box=inbox")
        .then((j) => setUnseen(j.notices.filter((n) => !n.seenAt).slice(0, 5)))
        .catch(() => undefined)
    }
  }, [caps.approveRequests, caps.sendOfficial, caps.showInbox, caps.viewAllNotices])

  const stats = [
    caps.showInbox && {
      key: "inbox",
      label: "Görülmemiş ileti",
      value: b.unreadNotices,
      icon: Bell,
      tone: "text-amber-600 bg-amber-50",
      go: { tab: "inbox" } as Go,
    },
    caps.approveRequests
      ? {
          key: "pending",
          label: "Onay bekleyen talep",
          value: b.pendingRequests,
          icon: ClipboardList,
          tone: "text-red-600 bg-red-50",
          go: { tab: "requests" } as Go,
        }
      : caps.createRequest && {
          key: "decided",
          label: "Yeni talep kararı",
          value: b.decidedRequests,
          icon: ClipboardList,
          tone: "text-blue-600 bg-blue-50",
          go: { tab: "requests" } as Go,
        },
    {
      key: "messages",
      label: "Okunmamış grup mesajı",
      value: b.unreadMessages,
      icon: MessagesSquare,
      tone: "text-indigo-600 bg-indigo-50",
      go: { tab: "groups" } as Go,
    },
  ].filter(Boolean) as { key: string; label: string; value: number; icon: typeof Bell; tone: string; go: Go }[]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {caps.sendOfficial ? (
          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-900">Personele ileti gönder</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Öğretmen, rehberlik ve diğer personele resmi ileti; kimin gördüğünü anlık izleyin.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(["PERSONEL_DUYURU", "TALIMAT", "IHTAR"] as NoticeType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onCompose(t)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-400 hover:shadow-sm"
                >
                  <span>
                    <Pill className={NOTICE_TYPE_BADGE[t]}>{NOTICE_TYPE_LABEL[t]}</Pill>
                    <span className="mt-1 block text-sm font-medium text-slate-800">Yeni {NOTICE_TYPE_LABEL[t].toLocaleLowerCase("tr-TR")}</span>
                  </span>
                  <Send className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onGo(s.go)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:shadow-sm"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-2xl font-bold tabular-nums text-slate-900">{s.value}</span>
                <span className="block text-xs text-slate-500">{s.label}</span>
              </span>
            </button>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {caps.approveRequests ? (
            <Card title="Onay bekleyen talepler" onAll={() => onGo({ tab: "requests" })}>
              {pending.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Bekleyen talep yok.</p>
              ) : (
                pending.map((r) => (
                  <Row key={r.id} onClick={() => onGo({ tab: "requests", id: r.id })}>
                    <p className="truncate text-sm font-medium text-slate-900">{r.subject}</p>
                    <p className="truncate text-xs text-slate-500">
                      {fullName(r.requesterStaff)} · {shortTime(r.createdAt)}
                    </p>
                  </Row>
                ))
              )}
            </Card>
          ) : null}

          {caps.sendOfficial ? (
            <Card title="Son gönderimler" onAll={() => onGo({ tab: "sent" })}>
              {batches.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Henüz gönderim yok.</p>
              ) : (
                batches.map((bt) => (
                  <Row key={bt.batchId} onClick={() => onGo({ tab: "sent", id: bt.batchId })}>
                    <div className="flex items-center gap-2">
                      <Pill className={NOTICE_TYPE_BADGE[bt.type]}>{NOTICE_TYPE_LABEL[bt.type]}</Pill>
                      <p className="truncate text-sm font-medium text-slate-900">{bt.subject}</p>
                    </div>
                    <div className="mt-1.5">
                      <ReadProgress seen={bt.seen} total={bt.total} />
                    </div>
                  </Row>
                ))
              )}
            </Card>
          ) : null}

          {caps.showInbox ? (
            <Card title="Görmeniz gereken iletiler" onAll={() => onGo({ tab: "inbox" })}>
              {unseen.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Tüm iletileri gördünüz ✓</p>
              ) : (
                unseen.map((n) => (
                  <Row key={n.id} onClick={() => onGo({ tab: "inbox", id: n.id })}>
                    <div className="flex items-center gap-2">
                      <Pill className={NOTICE_TYPE_BADGE[n.type]}>{NOTICE_TYPE_LABEL[n.type]}</Pill>
                      <p className="truncate text-sm font-semibold text-slate-900">{n.subject}</p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {fullName(n.senderStaff)} · {shortTime(n.createdAt)}
                    </p>
                  </Row>
                ))
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Card({ title, onAll, children }: { title: string; onAll: () => void; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <button type="button" onClick={onAll} className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
          Tümü <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="divide-y">{children}</div>
    </section>
  )
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block w-full px-4 py-3 text-left transition hover:bg-slate-50">
      {children}
    </button>
  )
}
