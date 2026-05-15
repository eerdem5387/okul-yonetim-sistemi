"use client"

import { useEffect, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import { Bold, Italic, List, ListOrdered, Heading2, Link as LinkIcon, Undo2, Redo2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAuthHeaders, formatDateTime } from "./hr-utils"

interface AdminNotesEditorProps {
  staffId: string
}

interface AdminNotesPayload {
  adminNotes: unknown
  adminNotesUpdatedAt: string | null
  updatedByLabel: string | null
}

export function AdminNotesEditor({ staffId }: AdminNotesEditorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ updatedAt: string | null; updatedBy: string | null }>({
    updatedAt: null,
    updatedBy: null,
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline" },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[260px] focus:outline-none px-4 py-3 text-gray-900",
      },
    },
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/hr/staff/${staffId}/admin-notes`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Yönetici notları yüklenemedi")
        const data = (await res.json()) as AdminNotesPayload
        if (cancelled) return
        if (data.adminNotes && editor) {
          editor.commands.setContent(data.adminNotes as never, { emitUpdate: false })
        } else if (editor) {
          editor.commands.clearContent(false)
        }
        setMeta({
          updatedAt: data.adminNotesUpdatedAt ?? null,
          updatedBy: data.updatedByLabel ?? null,
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Hata")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (editor) void load()
    return () => {
      cancelled = true
    }
  }, [editor, staffId])

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    setError(null)
    try {
      const json = editor.getJSON()
      const isEmpty = editor.isEmpty
      const res = await fetch(`/api/hr/staff/${staffId}/admin-notes`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminNotes: isEmpty ? null : json }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Kaydedilemedi")
      }
      const updated = await res.json()
      setMeta({
        updatedAt: updated.adminNotesUpdatedAt ?? null,
        updatedBy: meta.updatedBy,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setSaving(false)
    }
  }

  function handleAddLink() {
    if (!editor) return
    const previous = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Bağlantı URL'i", previous ?? "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  if (!editor) return null

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap items-center gap-1 border-b bg-gray-50 px-2 py-1.5">
          <ToolbarButton
            label="Kalın"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={<Bold className="h-4 w-4" />}
          />
          <ToolbarButton
            label="İtalik"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={<Italic className="h-4 w-4" />}
          />
          <ToolbarButton
            label="Başlık"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            icon={<Heading2 className="h-4 w-4" />}
          />
          <ToolbarButton
            label="Madde"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon={<List className="h-4 w-4" />}
          />
          <ToolbarButton
            label="Sıralı"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            icon={<ListOrdered className="h-4 w-4" />}
          />
          <ToolbarButton
            label="Bağlantı"
            active={editor.isActive("link")}
            onClick={handleAddLink}
            icon={<LinkIcon className="h-4 w-4" />}
          />
          <div className="mx-2 h-5 w-px bg-gray-300" />
          <ToolbarButton
            label="Geri al"
            onClick={() => editor.chain().focus().undo().run()}
            icon={<Undo2 className="h-4 w-4" />}
          />
          <ToolbarButton
            label="İleri al"
            onClick={() => editor.chain().focus().redo().run()}
            icon={<Redo2 className="h-4 w-4" />}
          />
        </div>
        <div className="bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor…
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          {meta.updatedAt ? (
            <>
              Son güncelleme: {formatDateTime(meta.updatedAt)}
              {meta.updatedBy ? ` · ${meta.updatedBy}` : null}
            </>
          ) : (
            "Henüz kaydedilmemiş"
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-rose-600">{error}</span>}
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ToolbarButtonProps {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick: () => void
}

function ToolbarButton({ label, icon, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-600 transition-colors hover:bg-white hover:text-gray-900 hover:shadow-sm",
        active && "bg-white text-gray-900 shadow-sm border-gray-200"
      )}
    >
      {icon}
    </button>
  )
}
