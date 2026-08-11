/**
 * Türkçe karakter / büyük-küçük harf duyarsız öğrenci araması.
 * Postgres ILIKE Türkçe İ/ı ayrımını bozar; "Yilmaz" ↔ "Yılmaz" da kaçabilir.
 */

const MAX_VARIANTS = 96

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

/** en-US lowercasing sonrası İ → i + combining dot (U+0307) bozulmasını temizler. */
export function sanitizeSearchInput(input: string): string {
  return input
    .trim()
    .normalize("NFC")
    .replace(/\u0307/g, "")
}

function toAsciiFold(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
}

/** ASCII harflerden Türkçe diyakritik seçenekleri (küçük harf). */
function diacriticOptions(ch: string): string[] {
  switch (ch) {
    case "i":
      return ["i", "ı"]
    case "g":
      return ["g", "ğ"]
    case "u":
      return ["u", "ü"]
    case "s":
      return ["s", "ş"]
    case "o":
      return ["o", "ö"]
    case "c":
      return ["c", "ç"]
    default:
      return [ch]
  }
}

/** Arama terimi için DB `contains` ile denenecek yazım varyantları. */
export function expandTurkishSearchVariants(input: string): string[] {
  const cleaned = sanitizeSearchInput(input)
  if (!cleaned) return []

  const trLower = cleaned.toLocaleLowerCase("tr-TR")
  const trUpper = cleaned.toLocaleUpperCase("tr-TR")
  const ascii = toAsciiFold(cleaned)

  const base = uniqueStrings([cleaned, trLower, trUpper, ascii, ascii.toLocaleUpperCase("tr-TR")])

  // Yalnızca diyakritik konumlarında 2'li seçim (g/ğ, i/ı, ...); case cartesian yok → patlamaz
  const chars = Array.from(ascii)
  const optionGroups = chars.map(diacriticOptions)
  const total = optionGroups.reduce((n, g) => n * g.length, 1)

  const diacriticForms: string[] = []
  if (total <= MAX_VARIANTS) {
    let combos = [""]
    for (const opts of optionGroups) {
      const next: string[] = []
      for (const prefix of combos) {
        for (const o of opts) next.push(prefix + o)
      }
      combos = next
    }
    for (const form of combos) {
      diacriticForms.push(form)
      diacriticForms.push(form.toLocaleUpperCase("tr-TR"))
      // Baş harf büyük
      if (form.length > 0) {
        diacriticForms.push(
          form.charAt(0).toLocaleUpperCase("tr-TR") + form.slice(1)
        )
      }
    }
  }

  return uniqueStrings([...base, ...diacriticForms]).slice(0, MAX_VARIANTS)
}

/**
 * Öğrenci adı/soyadı/TC araması.
 * - Çok kelimeli: her kelime ad VEYA soyadda geçmeli ("Ali Yılmaz")
 * - Türkçe/ASCII yazım varyantları denenir
 */
export function buildStudentSearchWhere(search: string): Record<string, unknown> | null {
  const raw = sanitizeSearchInput(search)
  if (!raw) return null

  if (/^\d+$/.test(raw)) {
    return { tcNumber: { contains: raw } }
  }

  const tokens = raw.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null

  return {
    AND: tokens.map((token) => {
      const variants = expandTurkishSearchVariants(token)
      const or: Record<string, unknown>[] = []
      for (const v of variants) {
        or.push({ firstName: { contains: v } })
        or.push({ lastName: { contains: v } })
        or.push({ firstName: { contains: v, mode: "insensitive" as const } })
        or.push({ lastName: { contains: v, mode: "insensitive" as const } })
      }
      if (/^\d+$/.test(token)) {
        or.push({ tcNumber: { contains: token } })
      }
      return { OR: or }
    }),
  }
}
