"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft,
  FileText,
  Loader2,
  Lock,
  Megaphone,
  Paperclip,
  Plus,
  Send,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { notify } from "@/lib/notify"
import { formatCommsDate } from "@/lib/comms/labels"
import { getAuthHeaders } from "./auth"
import { notifyCommsUnreadChanged } from "./unread-events"
import {
  clockTime,
  commsApi,
  ConfirmDialog,
  CountBadge,
  dayKey,
  dayLabel,
  deptLabel,
  EmptyState,
  fullName,
  shortTime,
  Spinner,
} from "./shared"
import type {
  ClassGroupSummary,
  CommsTemplate,
  GroupDetail,
  GroupPermissions,
  GroupTimelineItem,
  StaffRef,
} from "./types"

const POLL_MS = 10_000

type MessagesResponse = {
  timeline: GroupTimelineItem[]
  hasMore: boolean
  nextBefore: string | null
  canPost: boolean
}

export function GroupsPanel({
  kind,
  actorId,
  canCreate,
  canSendAnnouncement,
  focusGroupId,
  onChanged,
}: {
  kind: "staff" | "parent"
  actorId: string
  canCreate: boolean
  canSendAnnouncement: boolean
  focusGroupId?: string | null
  onChanged: () => void
}) {
  const [groups, setGroups] = useState<ClassGroupSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(focusGroupId ?? null)
  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const loadGroups = useCallback(async () => {
    try {
      const j = await commsApi<{ groups: ClassGroupSummary[] }>("/api/comms/class-groups")
      setGroups(j.groups)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Gruplar yüklenemedi")
      setGroups([])
    }
  }, [])

  useEffect(() => {
    void loadGroups()
    const t = setInterval(() => void loadGroups(), 30_000)
    return () => clearInterval(t)
  }, [loadGroups])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR")
    if (!q) return groups ?? []
    return (groups ?? []).filter((g) => `${g.title} ${g.class.name}`.toLocaleLowerCase("tr-TR").includes(q))
  }, [groups, query])

  if (!groups) return <Spinner />

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        className={`min-h-0 w-full flex-col border-slate-200 md:flex md:w-80 md:shrink-0 md:border-r ${
          selectedId ? "hidden" : "flex"
        }`}
      >
        <div className="flex items-center gap-2 border-b bg-slate-50 p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Grup ara…"
            className="h-9 bg-white text-sm"
          />
          {canCreate ? (
            <Button size="icon" className="h-9 w-9 shrink-0" title="Yeni sınıf grubu" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
          {filtered.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className={`w-full px-3 py-3 text-left transition hover:bg-slate-50 ${selectedId === g.id ? "bg-blue-50" : ""}`}
                onClick={() => setSelectedId(g.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${g.unreadCount ? "font-bold text-slate-900" : "font-medium text-slate-800"}`}>
                    {g.title}
                  </p>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {g.lastMessage ? shortTime(g.lastMessage.createdAt) : ""}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-500">
                    {g.lastMessage
                      ? `${g.lastMessage.senderName ? `${g.lastMessage.senderName}: ` : ""}${g.lastMessage.body}`
                      : g.class.name}
                  </p>
                  <CountBadge count={g.unreadCount} tone="blue" />
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li>
              <EmptyState
                title="Grup yok"
                hint={
                  kind === "parent"
                    ? "Öğrencinizin sınıfı için grup açıldığında burada görünür."
                    : canCreate
                      ? "Bir sınıf için veli grubu oluşturun; sınıftaki veliler otomatik eklenir."
                      : "Üye olduğunuz sınıf grupları burada listelenir."
                }
              />
            </li>
          ) : null}
        </ul>
      </aside>

      <main className={`min-h-0 flex-1 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}>
        {!selectedId ? (
          <EmptyState title="Bir grup seçin" />
        ) : (
          <GroupThread
            key={selectedId}
            groupId={selectedId}
            kind={kind}
            actorId={actorId}
            canSendAnnouncement={canSendAnnouncement}
            onBack={() => setSelectedId(null)}
            onRead={() => {
              setGroups((prev) => (prev ?? []).map((g) => (g.id === selectedId ? { ...g, unreadCount: 0 } : g)))
              notifyCommsUnreadChanged()
              onChanged()
            }}
            onGroupChanged={() => void loadGroups()}
            onDeleted={() => {
              setSelectedId(null)
              void loadGroups()
            }}
          />
        )}
      </main>

      {canCreate ? (
        <CreateGroupDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false)
            void loadGroups()
            setSelectedId(id)
          }}
        />
      ) : null}
    </div>
  )
}

function mergeTimeline(a: GroupTimelineItem[], b: GroupTimelineItem[]) {
  const map = new Map<string, GroupTimelineItem>()
  for (const item of [...a, ...b]) map.set(`${item.kind}-${item.id}`, item)
  return [...map.values()].sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime())
}

function GroupThread({
  groupId,
  kind,
  actorId,
  canSendAnnouncement,
  onBack,
  onRead,
  onGroupChanged,
  onDeleted,
}: {
  groupId: string
  kind: "staff" | "parent"
  actorId: string
  canSendAnnouncement: boolean
  onBack: () => void
  onRead: () => void
  onGroupChanged: () => void
  onDeleted: () => void
}) {
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [perms, setPerms] = useState<GroupPermissions | null>(null)
  const [timeline, setTimeline] = useState<GroupTimelineItem[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [text, setText] = useState("")
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [annOpen, setAnnOpen] = useState(false)
  const [readersFor, setReadersFor] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: "message" | "announcement"; id: string }>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stickToBottom = useRef(true)
  const firstLoad = useRef(true)
  const loadedOnce = useRef(false)

  const loadDetail = useCallback(async () => {
    try {
      const j = await commsApi<{ group: GroupDetail; permissions: GroupPermissions }>(`/api/comms/class-groups/${groupId}`)
      setDetail(j.group)
      setPerms(j.permissions)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Grup yüklenemedi")
    }
  }, [groupId])

  const loadLatest = useCallback(async () => {
    try {
      const j = await commsApi<MessagesResponse>(`/api/comms/class-groups/${groupId}/messages`)
      if (!loadedOnce.current) {
        loadedOnce.current = true
        setHasMore(j.hasMore)
        setNextBefore(j.nextBefore)
      }
      setTimeline((prev) => (prev ? mergeTimeline(prev, j.timeline) : j.timeline))
      setPerms((p) => (p ? { ...p, canPost: j.canPost } : p))
      onRead()
    } catch {
      // geçici ağ hatasında sessiz kal; bir sonraki yoklamada tekrar denenir
    }
    // onRead her render'da değişir; yoklamayı yeniden kurmamak için bağımlılıklara eklenmiyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  useEffect(() => {
    void loadDetail()
    void loadLatest()
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void loadLatest()
    }, POLL_MS)
    return () => clearInterval(t)
  }, [loadDetail, loadLatest])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !timeline) return
    if (firstLoad.current || stickToBottom.current) {
      el.scrollTop = el.scrollHeight
      firstLoad.current = false
    }
  }, [timeline])

  const loadOlder = async () => {
    if (!nextBefore) return
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    setLoadingOlder(true)
    try {
      const j = await commsApi<MessagesResponse>(
        `/api/comms/class-groups/${groupId}/messages?before=${encodeURIComponent(nextBefore)}`
      )
      stickToBottom.current = false
      setTimeline((prev) => mergeTimeline(j.timeline, prev ?? []))
      setHasMore(j.hasMore)
      setNextBefore(j.nextBefore)
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight
      })
    } catch (e) {
      notify(e instanceof Error ? e.message : "Eski mesajlar yüklenemedi")
    } finally {
      setLoadingOlder(false)
    }
  }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const headers = getAuthHeaders() as Record<string, string>
      delete headers["Content-Type"]
      const res = await fetch("/api/comms/uploads", { method: "POST", headers, body: form })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Dosya yüklenemedi")
      setAttachment({ url: j.url, name: j.name, type: j.type })
    } catch (e) {
      notify(e instanceof Error ? e.message : "Dosya yüklenemedi")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const send = async () => {
    if ((!text.trim() && !attachment) || sending) return
    setSending(true)
    try {
      await commsApi(`/api/comms/class-groups/${groupId}/messages`, {
        method: "POST",
        body: {
          body: text,
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentType: attachment?.type,
        },
      })
      setText("")
      setAttachment(null)
      stickToBottom.current = true
      await loadLatest()
      onGroupChanged()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Gönderilemedi")
    } finally {
      setSending(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    try {
      const url =
        confirmDelete.kind === "message"
          ? `/api/comms/class-groups/${groupId}/messages/${confirmDelete.id}`
          : `/api/comms/class-announcements/${confirmDelete.id}`
      await commsApi(url, { method: "DELETE" })
      setTimeline((prev) => (prev ?? []).filter((t) => !(t.kind === confirmDelete.kind && t.id === confirmDelete.id)))
      setConfirmDelete(null)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Silinemedi")
    }
  }

  const items = timeline ?? []

  return (
    <>
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <button type="button" className="rounded-full p-1.5 hover:bg-slate-100 md:hidden" onClick={onBack} aria-label="Geri">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{detail?.title ?? "…"}</p>
          <p className="truncate text-xs text-slate-500">
            {detail ? `${detail.class.name} · ${detail.parentCount ?? 0} veli` : ""}
            {detail?.counselorStaff ? ` · Rehber: ${fullName(detail.counselorStaff)}` : ""}
            {detail && !detail.parentsCanPost ? " · Yalnızca okul yazabilir" : ""}
          </p>
        </div>
        {kind === "staff" && canSendAnnouncement ? (
          <Button size="sm" variant="outline" onClick={() => setAnnOpen(true)}>
            <Megaphone className="mr-1.5 h-4 w-4" /> Duyuru
          </Button>
        ) : null}
        {kind === "staff" && (perms?.canManage || perms?.canDelete) ? (
          <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)} title="Grup ayarları">
            <Settings className="h-4 w-4" />
          </Button>
        ) : kind === "staff" && detail ? (
          <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)} title="Üyeler">
            <Users className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-[#eef2f7] px-3 py-4 sm:px-6"
      >
        {timeline === null ? (
          <Spinner />
        ) : (
          <>
            {hasMore ? (
              <div className="flex justify-center pb-2">
                <Button size="sm" variant="outline" disabled={loadingOlder} onClick={() => void loadOlder()}>
                  {loadingOlder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Daha eski mesajlar
                </Button>
              </div>
            ) : null}
            {items.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Henüz mesaj yok. İlk mesajı siz yazın.</p> : null}
            {items.map((item, i) => {
              const prev = items[i - 1]
              const showDay = !prev || dayKey(prev.createdAt) !== dayKey(item.createdAt)
              const dayDivider = showDay ? (
                <div className="flex justify-center py-2">
                  <span className="rounded-full bg-white/80 px-3 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm">
                    {dayLabel(item.createdAt)}
                  </span>
                </div>
              ) : null

              if (item.kind === "announcement") {
                return (
                  <div key={`a-${item.id}`}>
                    {dayDivider}
                    <div className="mx-auto my-2 max-w-xl rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                          <Megaphone className="h-3.5 w-3.5" /> Duyuru · {item.sender?.displayName || "Okul"}
                        </p>
                        {perms?.canDelete ? (
                          <button
                            type="button"
                            title="Duyuruyu sil"
                            className="rounded-full p-1 text-amber-700 hover:bg-amber-100"
                            onClick={() => setConfirmDelete({ kind: "announcement", id: item.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-amber-950">{item.subject}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-950">{item.body}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-amber-700">
                        {item.readStats ? (
                          <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => setReadersFor(item.id)}>
                            {item.readStats.seen}/{item.readStats.total} veli okudu
                          </button>
                        ) : (
                          <span />
                        )}
                        <span>{clockTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              }

              const mine = Boolean(actorId) && item.sender?.id === actorId && item.sender?.kind === kind
              const prevSameSender =
                !showDay && prev?.kind === "message" && prev.sender?.id === item.sender?.id
              return (
                <div key={`m-${item.id}`}>
                  {dayDivider}
                  <div className={`group flex items-end gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                    {perms?.canDelete && mine ? (
                      <DeleteBtn onClick={() => setConfirmDelete({ kind: "message", id: item.id })} />
                    ) : null}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm ${
                        mine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-white text-slate-900"
                      }`}
                    >
                      {!mine && !prevSameSender ? (
                        <p
                          className={`mb-0.5 text-[11px] font-semibold ${
                            item.sender?.kind === "staff" ? "text-blue-700" : "text-slate-500"
                          }`}
                        >
                          {item.sender?.displayName || "Silinmiş kullanıcı"}
                          {item.sender?.kind === "staff" ? " · Okul" : ""}
                        </p>
                      ) : null}
                      {item.attachmentUrl ? <Attachment item={item} mine={mine} /> : null}
                      {item.body ? (
                        <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${mine ? "text-white" : "text-slate-800"}`}>
                          {item.body}
                        </p>
                      ) : null}
                      <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
                        {clockTime(item.createdAt)}
                      </p>
                    </div>
                    {perms?.canDelete && !mine ? (
                      <DeleteBtn onClick={() => setConfirmDelete({ kind: "message", id: item.id })} />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {perms && !perms.canPost ? (
        <div className="flex items-center justify-center gap-2 border-t bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Lock className="h-4 w-4" /> Bu grupta yalnızca okul personeli yazabilir.
        </div>
      ) : (
        <div className="border-t bg-white p-3">
          {attachment ? (
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
              <FileText className="h-4 w-4" />
              <span className="max-w-[14rem] truncate">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} aria-label="Eki kaldır">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              title="Fotoğraf veya PDF ekle"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <textarea
              value={text}
              rows={1}
              maxLength={4000}
              onChange={(e) => setText(e.target.value)}
              placeholder="Mesaj yazın… (Shift+Enter yeni satır)"
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <Button size="icon" onClick={() => void send()} disabled={sending || (!text.trim() && !attachment)} title="Gönder">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {kind === "staff" && detail && perms ? (
        <GroupSettingsDialog
          open={settingsOpen}
          detail={detail}
          perms={perms}
          onClose={() => setSettingsOpen(false)}
          onChanged={async () => {
            await loadDetail()
            onGroupChanged()
          }}
          onDeleted={() => {
            setSettingsOpen(false)
            onDeleted()
          }}
        />
      ) : null}
      {kind === "staff" && canSendAnnouncement && detail ? (
        <AnnouncementDialog
          open={annOpen}
          groupId={groupId}
          groupTitle={detail.title}
          parentCount={detail.parentCount}
          onClose={() => setAnnOpen(false)}
          onSent={async () => {
            setAnnOpen(false)
            stickToBottom.current = true
            await loadLatest()
            onGroupChanged()
          }}
        />
      ) : null}
      <ReadersDialog announcementId={readersFor} onClose={() => setReadersFor(null)} />
      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete?.kind === "announcement" ? "Duyuru silinsin mi?" : "Mesaj silinsin mi?"}
        description="Bu işlem geri alınamaz; gruptaki herkes için kaldırılır."
        confirmLabel="Sil"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />
    </>
  )
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Sil"
      onClick={onClick}
      className="mb-1 h-7 w-7 shrink-0 rounded-full text-red-600 opacity-0 transition hover:bg-red-50 group-hover:opacity-100 focus:opacity-100"
    >
      <Trash2 className="mx-auto h-3.5 w-3.5" />
    </button>
  )
}

function Attachment({
  item,
  mine,
}: {
  item: Extract<GroupTimelineItem, { kind: "message" }>
  mine: boolean
}) {
  const isImage = (item.attachmentType || "").startsWith("image/")
  if (isImage) {
    return (
      <a href={item.attachmentUrl!} target="_blank" rel="noopener noreferrer" className="mb-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.attachmentUrl!} alt={item.attachmentName || "Fotoğraf"} className="max-h-64 rounded-lg object-cover" />
      </a>
    )
  }
  return (
    <a
      href={item.attachmentUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
        mine ? "bg-blue-500/60 text-white" : "bg-slate-100 text-slate-800"
      }`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.attachmentName || "Dosya"}</span>
    </a>
  )
}

function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [guides, setGuides] = useState<StaffRef[]>([])
  const [classId, setClassId] = useState("")
  const [title, setTitle] = useState("")
  const [counselorStaffId, setCounselorStaffId] = useState("")
  const [parentsCanPost, setParentsCanPost] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void Promise.all([
      commsApi<{ classes: { id: string; name: string }[] }>("/api/comms/classes"),
      commsApi<{ staff: StaffRef[] }>("/api/comms/staff"),
    ])
      .then(([c, s]) => {
        setClasses(c.classes)
        setGuides(s.staff.filter((x) => x.department === "REHBERLIK" || x.department === "BAS_REHBERLIK"))
      })
      .catch(() => undefined)
  }, [open])

  const cls = classes.find((c) => c.id === classId)

  const submit = async () => {
    setBusy(true)
    try {
      const j = await commsApi<{ group: { id: string }; parentCount: number }>("/api/comms/class-groups", {
        method: "POST",
        body: { classId, title: title.trim() || undefined, counselorStaffId: counselorStaffId || undefined, parentsCanPost },
      })
      notify(`Grup oluşturuldu · ${j.parentCount} veli eklendi`)
      setClassId("")
      setTitle("")
      setCounselorStaffId("")
      setParentsCanPost(false)
      onCreated(j.group.id)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Oluşturulamadı")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">Yeni sınıf grubu</DialogTitle>
          <DialogDescription className="text-left">
            Sınıftaki öğrencilerin velileri otomatik eklenir; sınıf değişikliklerinde liste kendiliğinden güncellenir.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 space-y-3">
          <select
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Sınıf seçin</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={cls ? `${cls.name} Veli Grubu` : "Grup adı (boş bırakılırsa otomatik)"}
          />
          <select
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={counselorStaffId}
            onChange={(e) => setCounselorStaffId(e.target.value)}
          >
            <option value="">Rehber öğretmen (isteğe bağlı)</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {fullName(g)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={parentsCanPost} onChange={(e) => setParentsCanPost(e.target.checked)} />
            Veliler mesaj yazabilsin
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Vazgeç
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !classId}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Oluştur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GroupSettingsDialog({
  open,
  detail,
  perms,
  onClose,
  onChanged,
  onDeleted,
}: {
  open: boolean
  detail: GroupDetail
  perms: GroupPermissions
  onClose: () => void
  onChanged: () => Promise<void>
  onDeleted: () => void
}) {
  const [title, setTitle] = useState(detail.title)
  const [candidates, setCandidates] = useState<(StaffRef & { subject?: string | null })[]>([])
  const [addIds, setAddIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showParents, setShowParents] = useState(false)

  const loadCandidates = useCallback(async () => {
    if (!perms.canManage) return
    try {
      const j = await commsApi<{ staff: (StaffRef & { subject?: string | null })[] }>(
        `/api/comms/class-groups/${detail.id}/members`
      )
      setCandidates(j.staff)
    } catch {
      setCandidates([])
    }
  }, [detail.id, perms.canManage])

  useEffect(() => {
    if (open) {
      setTitle(detail.title)
      setAddIds([])
      void loadCandidates()
    }
  }, [open, detail.title, loadCandidates])

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true)
    try {
      await commsApi(`/api/comms/class-groups/${detail.id}`, { method: "PATCH", body })
      notify(msg)
      await onChanged()
      await loadCandidates()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Güncellenemedi")
    } finally {
      setBusy(false)
    }
  }

  const addMembers = async () => {
    setBusy(true)
    try {
      const j = await commsApi<{ added: number }>(`/api/comms/class-groups/${detail.id}/members`, {
        method: "POST",
        body: { staffIds: addIds },
      })
      notify(`${j.added} kişi eklendi`)
      setAddIds([])
      await onChanged()
      await loadCandidates()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Eklenemedi")
    } finally {
      setBusy(false)
    }
  }

  const removeMember = async (staffId: string) => {
    setBusy(true)
    try {
      await commsApi(`/api/comms/class-groups/${detail.id}/members?staffId=${staffId}`, { method: "DELETE" })
      notify("Gruptan çıkarıldı")
      await onChanged()
      await loadCandidates()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Çıkarılamadı")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    try {
      await commsApi(`/api/comms/class-groups/${detail.id}`, { method: "DELETE" })
      notify("Grup silindi")
      setConfirmDelete(false)
      onDeleted()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Grup silinemedi")
    }
  }

  const staffMembers = detail.members.filter((m) => m.staff)
  const parentMembers = detail.members.filter((m) => m.parent)
  const guides = candidates.filter((c) => c.department === "REHBERLIK" || c.department === "BAS_REHBERLIK")

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">{perms.canManage ? "Grup ayarları" : "Grup üyeleri"}</DialogTitle>
          <DialogDescription className="text-left">{detail.class.name}</DialogDescription>
        </DialogHeader>
        <div className="mt-3 space-y-5">
          {perms.canManage ? (
            <>
              <div className="flex gap-2">
                <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
                <Button
                  variant="outline"
                  disabled={busy || !title.trim() || title.trim() === detail.title}
                  onClick={() => void patch({ title: title.trim() }, "Grup adı güncellendi")}
                >
                  Kaydet
                </Button>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Veliler mesaj yazabilir</span>
                  <span className="block text-xs text-slate-500">
                    Kapalıyken veliler yalnızca okur; duyurular her durumda iletilir.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  disabled={busy}
                  checked={detail.parentsCanPost}
                  onChange={(e) =>
                    void patch(
                      { parentsCanPost: e.target.checked },
                      e.target.checked ? "Veliler artık yazabilir" : "Veli yazma kapatıldı"
                    )
                  }
                />
              </label>
              {perms.canChangeCounselor ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">Rehber öğretmen</p>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    disabled={busy}
                    value={detail.counselorStaffId ?? ""}
                    onChange={(e) => void patch({ counselorStaffId: e.target.value || null }, "Rehber güncellendi")}
                  >
                    <option value="">Rehber yok</option>
                    {detail.counselorStaff ? (
                      <option value={detail.counselorStaff.id}>{fullName(detail.counselorStaff)}</option>
                    ) : null}
                    {guides.map((g) => (
                      <option key={g.id} value={g.id}>
                        {fullName(g)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Okul personeli ({staffMembers.length})</p>
            <ul className="divide-y rounded-xl border border-slate-200">
              {staffMembers.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    {fullName(m.staff)}
                    <span className="ml-2 text-xs text-slate-500">
                      {m.role === "COUNSELOR" ? "Rehber" : deptLabel(m.staff?.department)}
                    </span>
                  </span>
                  {perms.canManage && m.role === "TEACHER" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeMember(m.staff!.id)}
                      className="text-xs font-medium text-red-700 hover:underline"
                    >
                      Çıkar
                    </button>
                  ) : null}
                </li>
              ))}
              {staffMembers.length === 0 ? <li className="px-3 py-2 text-sm text-slate-500">Henüz personel yok.</li> : null}
            </ul>
            {perms.canManage && candidates.length ? (
              <div className="flex gap-2">
                <select
                  multiple
                  className="h-28 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  value={addIds}
                  onChange={(e) => setAddIds([...e.target.selectedOptions].map((o) => o.value))}
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {fullName(c)} — {deptLabel(c.department)}
                      {c.subject ? ` (${c.subject})` : ""}
                    </option>
                  ))}
                </select>
                <Button variant="outline" disabled={busy || !addIds.length} onClick={() => void addMembers()}>
                  Ekle
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="text-sm font-semibold text-slate-900"
              onClick={() => setShowParents((v) => !v)}
            >
              Veliler ({parentMembers.length}) {showParents ? "▲" : "▼"}
            </button>
            {showParents ? (
              <ul className="max-h-56 divide-y overflow-y-auto rounded-xl border border-slate-200">
                {parentMembers.map((m) => (
                  <li key={m.id} className="px-3 py-2 text-sm text-slate-700">
                    {m.parent?.displayName}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-slate-500">Veli listesi sınıf listesinden otomatik güncellenir.</p>
          </div>

          {perms.canDelete ? (
            <div className="border-t pt-4">
              <Button variant="ghost" className="text-red-700" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Grubu sil
              </Button>
            </div>
          ) : null}
        </div>
        <ConfirmDialog
          open={confirmDelete}
          title="Grup silinsin mi?"
          description="Gruptaki tüm mesajlar ve duyurular kalıcı olarak silinir."
          confirmLabel="Grubu sil"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      </DialogContent>
    </Dialog>
  )
}

function AnnouncementDialog({
  open,
  groupId,
  groupTitle,
  parentCount,
  onClose,
  onSent,
}: {
  open: boolean
  groupId: string
  groupTitle: string
  parentCount: number
  onClose: () => void
  onSent: () => Promise<void>
}) {
  const [templates, setTemplates] = useState<CommsTemplate[]>([])
  const [templateId, setTemplateId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void commsApi<{ templates: CommsTemplate[] }>("/api/comms/templates?kind=SINIF_DUYURU")
      .then((j) => setTemplates(j.templates))
      .catch(() => setTemplates([]))
  }, [open])

  const submit = async () => {
    setBusy(true)
    try {
      const j = await commsApi<{ recipientCount: number }>("/api/comms/class-announcements", {
        method: "POST",
        body: { classGroupId: groupId, templateId: templateId || undefined, subject, body },
      })
      notify(`Duyuru ${j.recipientCount} veliye gönderildi`)
      setTemplateId("")
      setSubject("")
      setBody("")
      await onSent()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Duyuru gönderilemedi")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-left">Sınıf duyurusu</DialogTitle>
          <DialogDescription className="text-left">
            {groupTitle} · {parentCount} veliye bildirim gider ve kimin okuduğu izlenir.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 space-y-3">
          {templates.length ? (
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplateId(t.id)
                    setSubject(t.title)
                    setBody(t.body)
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    templateId === t.id ? "bg-blue-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          ) : null}
          <Input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />
          <textarea
            className="min-h-[9rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={body}
            maxLength={10000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Duyuru metni"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Vazgeç
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !subject.trim() || !body.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
              Duyuruyu gönder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReadersDialog({ announcementId, onClose }: { announcementId: string | null; onClose: () => void }) {
  const [data, setData] = useState<{
    total: number
    seen: number
    readers: { parentId: string; displayName: string; seenAt: string | null }[]
  } | null>(null)
  const [filter, setFilter] = useState<"UNSEEN" | "SEEN">("UNSEEN")

  useEffect(() => {
    setData(null)
    if (!announcementId) return
    void commsApi<typeof data>(`/api/comms/class-announcements/${announcementId}`)
      .then((j) => setData(j))
      .catch((e) => notify(e instanceof Error ? e.message : "Liste yüklenemedi"))
  }, [announcementId])

  const list = (data?.readers ?? []).filter((r) => (filter === "SEEN" ? r.seenAt : !r.seenAt))

  return (
    <Dialog open={announcementId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">Okunma durumu</DialogTitle>
          <DialogDescription className="text-left">
            {data ? `${data.seen}/${data.total} veli okudu` : "Yükleniyor…"}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 flex gap-1.5">
          {(["UNSEEN", "SEEN"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {f === "UNSEEN" ? `Okumayanlar (${(data?.total ?? 0) - (data?.seen ?? 0)})` : `Okuyanlar (${data?.seen ?? 0})`}
            </button>
          ))}
        </div>
        <ul className="mt-3 max-h-80 divide-y overflow-y-auto rounded-xl border border-slate-200">
          {list.map((r) => (
            <li key={r.parentId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="text-slate-800">{r.displayName}</span>
              {r.seenAt ? <span className="text-xs text-slate-500">{formatCommsDate(r.seenAt)}</span> : null}
            </li>
          ))}
          {data && list.length === 0 ? <li className="px-3 py-4 text-center text-sm text-slate-500">Kayıt yok.</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
