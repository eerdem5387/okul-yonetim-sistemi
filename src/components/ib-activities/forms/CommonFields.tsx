"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, X } from "lucide-react"
import type { IbActivityCommon } from "@/types/ib-activity"

interface CommonFieldsProps {
  data: IbActivityCommon
  onChange: (common: IbActivityCommon) => void
  participantOptions: { id: string; label: string }[]
  /** Eğitim türünde eğitmen dropdown için: personel listesi (id + ad soyad) */
  organizerOptions?: { id: string; label: string }[]
  /** Eğitmen seçildiğinde (id, ad soyad) – sadece organizerOptions verildiğinde kullanılır */
  onOrganizerSelect?: (id: string, name: string) => void
}

export function CommonFields({
  data,
  onChange,
  participantOptions,
  organizerOptions,
  onOrganizerSelect,
}: CommonFieldsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const update = (part: Partial<IbActivityCommon>) =>
    onChange({ ...data, ...part })

  const addParticipant = (id: string) => {
    if (data.participantIds.includes(id)) return
    update({ participantIds: [...data.participantIds, id] })
  }

  const removeParticipant = (id: string) => {
    update({ participantIds: data.participantIds.filter((x) => x !== id) })
  }

  const filteredOptions = participantOptions.filter((opt) => {
    if (!searchTerm.trim()) return true
    return opt.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
  })

  const selectedSet = new Set(data.participantIds)
  const selectedOptions = data.participantIds
    .map((id) => participantOptions.find((o) => o.id === id))
    .filter(Boolean) as { id: string; label: string }[]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <Label>Başlık *</Label>
        <Input
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Faaliyet başlığı"
          className="mt-1"
        />
      </div>
      <div ref={containerRef}>
        <Label>Katılımcı Seçimi *</Label>
        <p className="text-xs text-gray-500 mt-0.5 mb-1">
          Arama kutusuna yazarak öğrenci arayın; listeden tıklayarak birden fazla katılımcı ekleyin.
        </p>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setDropdownOpen(true)
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Öğrenci ara (ad, soyad, sınıf...)"
            className="pl-9 rounded-b-none border-b-0 focus-visible:ring-offset-0"
          />
          {dropdownOpen && (
            <div className="absolute z-50 w-full mt-0 rounded-b-lg border border-t-0 border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
              {participantOptions.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">Öğrenci listesi yükleniyor...</p>
              ) : filteredOptions.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">Eşleşen öğrenci yok.</p>
              ) : (
                filteredOptions.slice(0, 80).map((opt) => {
                  const isSelected = selectedSet.has(opt.id)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        addParticipant(opt.id)
                        setSearchTerm("")
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                        isSelected ? "bg-blue-50 text-blue-800" : "text-gray-900"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <span className="text-xs text-blue-600">Seçili</span>
                      )}
                    </button>
                  )
                })
              )}
              {filteredOptions.length > 80 && (
                <div className="px-3 py-2 text-xs text-gray-500 border-t">
                  {filteredOptions.length - 80} sonuç daha – arama metnini daraltın
                </div>
              )}
            </div>
          )}
        </div>
        {selectedOptions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-2">
            {selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-sm text-blue-800"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={() => removeParticipant(opt.id)}
                  className="rounded-full p-0.5 hover:bg-blue-200"
                  aria-label="Kaldır"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Başlangıç Tarihi *</Label>
          <Input
            type="date"
            value={data.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Bitiş Tarihi *</Label>
          <Input
            type="date"
            value={data.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>Organizatör / Eğitmen</Label>
        {organizerOptions ? (
          <select
            value={data.organizer}
            onChange={(e) => {
              const label = e.target.value
              const opt = organizerOptions.find((o) => o.label === label)
              update({ organizer: label })
              onOrganizerSelect?.(opt?.id ?? "", opt?.label ?? "")
            }}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seçiniz</option>
            {organizerOptions.map((opt) => (
              <option key={opt.id} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            value={data.organizer}
            onChange={(e) => update({ organizer: e.target.value })}
            placeholder="Ad Soyad"
            className="mt-1"
          />
        )}
      </div>
      <div>
        <Label>Açıklama, Sonuç ve Kazanım</Label>
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Kısa açıklama..."
          rows={3}
          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />
      </div>
    </div>
  )
}
