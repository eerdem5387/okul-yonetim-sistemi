"use client"

/** "Öğrenci adresiyle aynı" kısayolu: öğrencinin adresini veli adres alanına kopyalar. */
export function CopyAddressButton({ source, onCopy }: { source: string; onCopy: (value: string) => void }) {
  if (!source.trim()) return null
  return (
    <button
      type="button"
      onClick={() => onCopy(source)}
      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
    >
      Öğrenci adresiyle aynı
    </button>
  )
}
