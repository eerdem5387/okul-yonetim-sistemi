"use client"

import { notify } from "@/lib/notify"

export type FormSection = { id: string; label: string; hint?: string }

/**
 * Uzun formların üstünde yapışkan bölüm çubuğu: bölüme tek tıkla gider.
 * Henüz görünmeyen bölüm (ör. sözleşme, öğrenci bilgileri girilmeden açılmaz) için ipucu gösterir.
 */
export function FormSectionNav({ sections }: { sections: FormSection[] }) {
  return (
    <nav
      aria-label="Form bölümleri"
      className="sticky top-0 z-20 -mx-1 mb-4 flex gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur"
    >
      {sections.map((section, index) => (
        <button
          key={section.id}
          type="button"
          onClick={() => {
            const el = document.getElementById(section.id)
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
            else if (section.hint) notify(section.hint, "info")
          }}
          className="flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
            {index + 1}
          </span>
          {section.label}
        </button>
      ))}
    </nav>
  )
}
