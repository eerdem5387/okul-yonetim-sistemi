"use client"

/**
 * IB Faaliyet PDF üretici – iskelet
 *
 * İş kuralı:
 * - "PDF İçeriği" alanları şablon değişkenlerini besler.
 * - Her katılımcı için (İsim + TC Kimlik No eşleşerek) ayrı PDF üretilebilir.
 *
 * Teknik seçenekler:
 * - Backend: Node.js + @react-pdf/renderer veya pdfkit / puppeteer
 * - Frontend: @react-pdf/renderer veya jspdf
 *
 * Bu bileşen, ileride PDF şablonları ve API entegrasyonu eklenecek şekilde modüler bırakıldı.
 */

import type { IbActivityFormData } from "@/types/ib-activity"

interface PdfGeneratorProps {
  /** Form verisi (şablon değişkenleri buradan alınacak) */
  formData: IbActivityFormData | null
  /** Katılımcı listesi (id, ad, tc) – bireysel PDF için */
  participants: Array<{ id: string; name: string; tcNumber: string }>
  /** Tekil PDF üret (katılımcı bazlı) */
  onGeneratePerParticipant?: (participantId: string) => void
  /** Tümü için PDF üret */
  onGenerateAll?: () => void
}

export function PdfGenerator({
  formData,
  participants,
  onGeneratePerParticipant,
  onGenerateAll,
}: PdfGeneratorProps) {
  if (!formData) return null

  const handleGenerateAll = () => {
    if (onGeneratePerParticipant && participants.length > 0) {
      participants.forEach((p) => onGeneratePerParticipant(p.id))
    } else if (onGenerateAll) {
      onGenerateAll()
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h4 className="text-sm font-semibold text-gray-700">PDF Üretimi</h4>
      <p className="text-xs text-gray-500 mt-1">
        Her katılımcı için ayrı PDF oluşturulur. Tekil veya toplu üretim
        seçebilirsiniz.
      </p>
      {participants.length > 0 && (
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span>
                {p.name} – {p.tcNumber}
              </span>
              {onGeneratePerParticipant && (
                <button
                  type="button"
                  className="text-blue-600 hover:underline shrink-0"
                  onClick={() => onGeneratePerParticipant(p.id)}
                >
                  PDF
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {participants.length > 0 && (onGeneratePerParticipant || onGenerateAll) && (
        <button
          type="button"
          className="mt-3 text-sm text-blue-600 hover:underline"
          onClick={handleGenerateAll}
        >
          Her katılımcı için ayrı PDF üret ({participants.length} adet)
        </button>
      )}
    </div>
  )
}
