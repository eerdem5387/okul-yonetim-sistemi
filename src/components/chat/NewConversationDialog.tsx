"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, Megaphone, Users, MessageSquare, GraduationCap } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  departmentLabel,
  getAuthHeaders,
} from "./chat-utils"
import type {
  ChatActorKind,
  ContactsResponse,
} from "./types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  actorKind: ChatActorKind
  canCreateGroup: boolean
  canCreateAnnouncement: boolean
  onCreated: (conversationId: string, type?: "PRIVATE" | "GROUP" | "ANNOUNCEMENT") => void
}

type DialogTab = "PRIVATE" | "GROUP" | "PARENT_GROUP" | "ANNOUNCEMENT"

export function NewConversationDialog({
  open,
  onOpenChange,
  actorKind,
  canCreateGroup,
  canCreateAnnouncement,
  onCreated,
}: Props) {
  const [tab, setTab] = useState<DialogTab>("PRIVATE")
  const [search, setSearch] = useState("")
  const [data, setData] = useState<ContactsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [selected, setSelected] = useState<Record<string, { staffId?: string; parentId?: string }>>({})
  const [announcementMode, setAnnouncementMode] = useState<"branch" | "people">("branch")
  const [branchId, setBranchId] = useState("")
  const [announcementBody, setAnnouncementBody] = useState("")
  const [classId, setClassId] = useState("")
  const [studentByParent, setStudentByParent] = useState<Record<string, string>>({})
  const [autoTitle, setAutoTitle] = useState(true)

  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelected({})
      setTitle("")
      setTab("PRIVATE")
      setAnnouncementMode("branch")
      setBranchId("")
      setAnnouncementBody("")
      setClassId("")
      setStudentByParent({})
      setAutoTitle(true)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch("/api/chat/contacts", { headers: getAuthHeaders(), cache: "no-store" })
      .then(async (r) => (await r.json()) as ContactsResponse)
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const filteredStaff = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.staff.filter((s) => {
      if (!q) return true
      return (
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.subject && s.subject.toLowerCase().includes(q)) ||
        departmentLabel(s.department).toLowerCase().includes(q)
      )
    })
  }, [data, search])

  const filteredParents = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.parents.filter((p) => {
      if (!q) return true
      return (
        p.displayName.toLowerCase().includes(q) ||
        p.studentNames.some((n) => n.toLowerCase().includes(q)) ||
        p.studentClasses.some((c) => c.toLowerCase().includes(q))
      )
    })
  }, [data, search])

  const classParents = useMemo(() => {
    if (!data || !classId || tab !== "PARENT_GROUP") return []
    return data.parents.filter((p) => (p.studentClassIds || []).includes(classId))
  }, [data, classId, tab])

  const toggleSelect = (key: string, target: { staffId?: string; parentId?: string }) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = target
      return next
    })
  }

  const selectedCount = Object.keys(selected).length
  const selectedTeachers = Object.values(selected).filter((row) => row.staffId)

  const startPrivate = async (target: { staffId?: string; parentId?: string; studentId?: string }) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: "PRIVATE",
          target: { staffId: target.staffId, parentId: target.parentId },
          studentId: target.studentId,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || "Sohbet açılamadı")
        return
      }
      onCreated(j.id, "PRIVATE")
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const createBranchAnnouncement = async () => {
    if (!branchId) {
      alert("Branş seçin")
      return
    }
    if (!announcementBody.trim()) {
      alert("Duyuru metni zorunlu")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: "ANNOUNCEMENT",
          branchId,
          title: title.trim() || undefined,
          message: announcementBody.trim(),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || "Duyuru gönderilemedi")
        return
      }
      onCreated(j.id, "ANNOUNCEMENT")
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const createGroup = async (kind: "GROUP" | "ANNOUNCEMENT") => {
    if (!title.trim()) {
      alert("Başlık zorunlu")
      return
    }
    if (selectedCount === 0) {
      alert("En az bir katılımcı seçin")
      return
    }
    setSubmitting(true)
    try {
      const participants = Object.values(selected)
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: kind,
          title,
          participants,
          classId: kind === "GROUP" && classId ? classId : undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || "Sohbet oluşturulamadı")
        return
      }
      onCreated(j.id, kind)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const createParentGroup = async () => {
    if (!classId) {
      alert("Sınıf seçimi zorunlu")
      return
    }
    if (!title.trim()) {
      alert("Grup adı zorunlu")
      return
    }
    if (classParents.length === 0) {
      alert("Bu sınıfta eklenecek veli yok")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: "GROUP",
          parentGroup: true,
          title: title.trim(),
          classId,
          participants: selectedTeachers,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || "Veli grubu oluşturulamadı")
        return
      }
      onCreated(j.id, "GROUP")
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const onSelectClassForParentGroup = (nextClassId: string) => {
    setClassId(nextClassId)
    const cls = data?.classes?.find((row) => row.id === nextClassId)
    if (autoTitle && cls) {
      setTitle(`${cls.name} veli grubu`)
    }
  }

  const showPeopleList =
    !(tab === "ANNOUNCEMENT" && announcementMode === "branch") && tab !== "PARENT_GROUP"
  const showParentGroupForm = tab === "PARENT_GROUP"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Yeni Sohbet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 border-b">
          <TabBtn active={tab === "PRIVATE"} onClick={() => setTab("PRIVATE")} icon={<MessageSquare className="h-4 w-4" />}>
            {actorKind === "staff" ? "Veli" : "Özel Sohbet"}
          </TabBtn>
          {canCreateGroup && (
            <TabBtn active={tab === "GROUP"} onClick={() => setTab("GROUP")} icon={<Users className="h-4 w-4" />}>
              Grup
            </TabBtn>
          )}
          {canCreateGroup && actorKind === "staff" && (
            <TabBtn
              active={tab === "PARENT_GROUP"}
              onClick={() => {
                setTab("PARENT_GROUP")
                setSelected({})
                setSearch("")
              }}
              icon={<GraduationCap className="h-4 w-4" />}
            >
              Veli Grupları
            </TabBtn>
          )}
          {canCreateAnnouncement && (
            <TabBtn active={tab === "ANNOUNCEMENT"} onClick={() => setTab("ANNOUNCEMENT")} icon={<Megaphone className="h-4 w-4" />}>
              Duyuru
            </TabBtn>
          )}
        </div>

        {(tab === "GROUP" || (tab === "ANNOUNCEMENT" && announcementMode === "people")) && (
          <div className="space-y-2 pt-3">
            <Input
              placeholder={tab === "GROUP" ? "Grup adı" : "Duyuru başlığı"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {tab === "GROUP" && (data?.classes?.length || 0) > 0 ? (
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Sınıfa bağlama (isteğe bağlı)</option>
                {data?.classes?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        )}

        {showParentGroupForm ? (
          <div className="space-y-3 pt-3">
            <select
              value={classId}
              onChange={(event) => onSelectClassForParentGroup(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              required
            >
              <option value="">Sınıf seçin (zorunlu)</option>
              {data?.classes?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Grup adı"
              value={title}
              onChange={(e) => {
                setAutoTitle(false)
                setTitle(e.target.value)
              }}
            />
            {classId ? (
              <p className="text-xs text-gray-500">
                {classParents.length} veli otomatik eklenecek. İsterseniz aşağıdan öğretmen de ekleyin.
              </p>
            ) : (
              <p className="text-xs text-amber-700">Veli grubu için önce sınıf seçmelisiniz.</p>
            )}
          </div>
        ) : null}

        {tab === "ANNOUNCEMENT" && (
          <div className="space-y-2 pt-3">
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                className={`rounded-md px-2 py-1 ${announcementMode === "branch" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                onClick={() => setAnnouncementMode("branch")}
              >
                Branşa göre
              </button>
              <button
                type="button"
                className={`rounded-md px-2 py-1 ${announcementMode === "people" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                onClick={() => setAnnouncementMode("people")}
              >
                Kişi seçerek
              </button>
            </div>
            {announcementMode === "branch" ? (
              <div className="space-y-2">
                <select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Branş seçin</option>
                  {(data?.branches || []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} · {branch.teacherCount} öğretmen
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Başlık (isteğe bağlı)"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <textarea
                  value={announcementBody}
                  onChange={(event) => setAnnouncementBody(event.target.value)}
                  placeholder="Duyuru metni. Seçtiğiniz branşın öğretmenlerine gider."
                  rows={4}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
                <Button onClick={() => void createBranchAnnouncement()} disabled={submitting || !branchId || !announcementBody.trim()}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Duyuruyu gönder
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {showPeopleList ? (
          <>
            <div className="relative pt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 mt-1.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, sınıf, branş veya departman ara…"
                className="pl-9"
              />
            </div>

            <div className="mt-3 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStaff.length > 0 && !(tab === "PRIVATE" && actorKind === "staff") && (
                    <section>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Personel
                      </h3>
                      <ul className="divide-y divide-gray-100">
                        {filteredStaff.map((s) => {
                          const key = `s:${s.id}`
                          const isSelected = !!selected[key]
                          return (
                            <li key={s.id} className="flex items-center justify-between py-2">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {s.firstName} {s.lastName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {departmentLabel(s.department)}
                                  {s.subject ? ` · ${s.subject}` : ""}
                                </div>
                              </div>
                              {tab === "PRIVATE" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={submitting}
                                  onClick={() => startPrivate({ staffId: s.id })}
                                >
                                  Sohbet Başlat
                                </Button>
                              ) : (
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(key, { staffId: s.id })}
                                  aria-label={`${s.firstName} ${s.lastName} seç`}
                                />
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )}
                  {filteredParents.length > 0 && actorKind === "staff" && (
                    <section>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Veliler
                      </h3>
                      <ul className="divide-y divide-gray-100">
                        {filteredParents.map((p) => {
                          const key = `p:${p.id}`
                          const isSelected = !!selected[key]
                          return (
                            <li key={p.id} className="flex items-center justify-between py-2">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {p.displayName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {p.studentNames.join(", ")}
                                  {p.studentClasses.length > 0 ? ` · ${p.studentClasses.join(", ")}` : ""}
                                </div>
                              </div>
                              {tab === "PRIVATE" ? (
                                <div className="flex items-center gap-2">
                                  {(p.students?.length || 0) > 1 ? (
                                    <select
                                      value={studentByParent[p.id] || p.students?.[0]?.id || ""}
                                      onChange={(event) =>
                                        setStudentByParent((current) => ({ ...current, [p.id]: event.target.value }))
                                      }
                                      className="max-w-[9rem] rounded-md border border-gray-200 px-2 py-1 text-xs"
                                    >
                                      {p.students?.map((student) => (
                                        <option key={student.id} value={student.id}>
                                          {student.name}
                                        </option>
                                      ))}
                                    </select>
                                  ) : null}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={submitting}
                                    onClick={() =>
                                      startPrivate({
                                        parentId: p.id,
                                        studentId:
                                          studentByParent[p.id] ||
                                          (p.students?.length === 1 ? p.students[0].id : undefined),
                                      })
                                    }
                                  >
                                    Sohbet Başlat
                                  </Button>
                                </div>
                              ) : (
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(key, { parentId: p.id })}
                                  aria-label={`${p.displayName} seç`}
                                />
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )}
                  {(tab === "PRIVATE" && actorKind === "staff" ? filteredParents.length === 0 : filteredStaff.length === 0 && filteredParents.length === 0) && (
                    <div className="py-8 text-center text-sm text-gray-500">
                      Eşleşen kişi bulunamadı.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}

        {showParentGroupForm ? (
          <div className="mt-3 flex-1 overflow-y-auto space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {classId ? (
                  <section>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Otomatik eklenecek veliler ({classParents.length})
                    </h3>
                    {classParents.length === 0 ? (
                      <p className="py-3 text-sm text-gray-500">Bu sınıfta veli bulunamadı.</p>
                    ) : (
                      <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-100">
                        {classParents.map((p) => (
                          <li key={p.id} className="px-3 py-2 text-sm">
                            <div className="font-medium text-gray-900">{p.displayName}</div>
                            <div className="text-xs text-gray-500">{p.studentNames.join(", ")}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ) : null}
                <section>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Öğretmen ara…"
                      className="pl-9"
                      disabled={!classId}
                    />
                  </div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Öğretmen ekle (isteğe bağlı)
                  </h3>
                  {!classId ? (
                    <p className="py-3 text-sm text-gray-500">Önce sınıf seçin.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {filteredStaff.map((s) => {
                        const key = `s:${s.id}`
                        return (
                          <li key={s.id} className="flex items-center justify-between py-2">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {s.firstName} {s.lastName}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {departmentLabel(s.department)}
                                {s.subject ? ` · ${s.subject}` : ""}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={!!selected[key]}
                              onChange={() => toggleSelect(key, { staffId: s.id })}
                              aria-label={`${s.firstName} ${s.lastName} seç`}
                            />
                          </li>
                        )
                      })}
                      {filteredStaff.length === 0 ? (
                        <li className="py-3 text-sm text-gray-500">Eşleşen personel yok.</li>
                      ) : null}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        ) : null}

        {(tab === "GROUP" || (tab === "ANNOUNCEMENT" && announcementMode === "people")) && (
          <div className="border-t pt-3 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-600">{selectedCount} kişi seçildi</span>
            <Button
              onClick={() => createGroup(tab)}
              disabled={submitting || !title.trim() || selectedCount === 0}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tab === "GROUP" ? "Grubu Oluştur" : "Duyuru Kanalını Oluştur"}
            </Button>
          </div>
        )}

        {tab === "PARENT_GROUP" ? (
          <div className="border-t pt-3 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-600">
              {classId
                ? `${classParents.length} veli${selectedTeachers.length ? ` · ${selectedTeachers.length} öğretmen` : ""}`
                : "Sınıf seçin"}
            </span>
            <Button
              onClick={() => void createParentGroup()}
              disabled={submitting || !classId || !title.trim() || classParents.length === 0}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Veli Grubunu Oluştur
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
        active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
