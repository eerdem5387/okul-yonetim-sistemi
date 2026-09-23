/**
 * Excel ders programından 8–12. sınıf (ve EA) programlarını içe aktarır.
 * Excel saatlerini yok sayar; gün içindeki N. ders → sistemdeki N. ders dilimi.
 * 5–7’ye dokunmaz.
 *
 * Kullanım: npx tsx scripts/import-schedule-from-excel.ts
 */
import * as XLSX from "xlsx"
import { PrismaClient } from "@prisma/client"
import {
  ensureCourseLinkedToBranch,
  syncStaffBranches,
  upsertBranchByName,
} from "../src/lib/branches"

const prisma = new PrismaClient()
const EXCEL_PATH = "/Users/emreerdem/Downloads/ders programı.xlsx"

const DAY_MAP: Record<string, number> = {
  PAZARTESİ: 1,
  SALI: 2,
  ÇARŞAMBA: 3,
  PERŞEMBE: 4,
  CUMA: 5,
  "C.TESİ": 6,
  CUMARTESİ: 6,
}

const CLASS_COLS: Array<{ excel: string; dbName: string; grade: number }> = [
  { excel: "8A", dbName: "8/A", grade: 8 },
  { excel: "8B", dbName: "8/B", grade: 8 },
  { excel: "8C", dbName: "8/C", grade: 8 },
  { excel: "9A", dbName: "9/A", grade: 9 },
  { excel: "9B", dbName: "9/B", grade: 9 },
  { excel: "10A", dbName: "10/A", grade: 10 },
  { excel: "10B", dbName: "10/B", grade: 10 },
  { excel: "10C", dbName: "10/C", grade: 10 },
  { excel: "11A", dbName: "11/A", grade: 11 },
  { excel: "11B", dbName: "11/B", grade: 11 },
  { excel: "11 EA", dbName: "11/C", grade: 11 },
  { excel: "12A", dbName: "12/A", grade: 12 },
  { excel: "12B", dbName: "12/B", grade: 12 },
  { excel: "12 EA", dbName: "12/C", grade: 12 },
]

const SUBJECT_ALIASES: Record<string, string> = {
  INGILIZCE: "İngilizce",
  İNGİLİZCE: "İngilizce",
  MATEMATIK: "Matematik",
  MATEMATİK: "Matematik",
  "TEMEL ISLEMLER": "Temel İşlemler",
  "TEMEL İŞLEMLER": "Temel İşlemler",
  "SOSYAL BILGILER": "Sosyal Bilgiler",
  "SOSYAL BİLGİLER": "Sosyal Bilgiler",
  TURKCE: "Türkçe",
  TÜRKÇE: "Türkçe",
  "FEN BILGISI": "Fen Bilimleri",
  "FEN BİLGİSİ": "Fen Bilimleri",
  "FEN BILIMLERI": "Fen Bilimleri",
  "FEN BİLİMLERİ": "Fen Bilimleri",
  BILISIM: "Bilişim Teknolojileri",
  BİLİŞİM: "Bilişim Teknolojileri",
  "BEDEN EGITIMI": "Beden Eğitimi",
  "BEDEN EĞİTİMİ": "Beden Eğitimi",
  DIKAB: "Din Kültürü",
  DİKAB: "Din Kültürü",
  "DIN KULTURU": "Din Kültürü",
  MUZIK: "Müzik",
  MÜZİK: "Müzik",
  GORSEL: "Görsel Sanatlar",
  GÖRSEL: "Görsel Sanatlar",
  "GORSEL SANATLAR": "Görsel Sanatlar",
  ESP: "İspanyolca",
  ESPANOL: "İspanyolca",
  ESPAÑOL: "İspanyolca",
  "LGS ON. HAZ. MAT": "LGS Ön Haz. Mat.",
  "LGS ÖN. HAZ. MAT": "LGS Ön Haz. Mat.",
  PROBLEM: "Problem",
  "METIN ANALIZI": "Metin Analizi",
  "METİN ANALİZİ": "Metin Analizi",
  GEOMETRI: "Geometri",
  GEOMETRİ: "Geometri",
  FIZIK: "Fizik",
  FİZİK: "Fizik",
  KIMYA: "Kimya",
  KİMYA: "Kimya",
  BIYOLOJI: "Biyoloji",
  BİYOLOJİ: "Biyoloji",
  "9 BIYOLOJI": "Biyoloji",
  "9 BİYOLOJİ": "Biyoloji",
  TDE: "Türk Dili ve Edebiyatı",
  "TURK DILI VE EDEBIYATI": "Türk Dili ve Edebiyatı",
  COGRAFYA: "Coğrafya",
  COĞRAFYA: "Coğrafya",
  TARIH: "Tarih",
  TARİH: "Tarih",
  FELSEFE: "Felsefe",
  REHBERLIK: "Rehberlik",
  REHBERLİK: "Rehberlik",
  INKILAP: "İnkılap Tarihi",
  İNKILAP: "İnkılap Tarihi",
  "INKILAP TARIHI": "İnkılap Tarihi",
  "AYT MATEMATIK": "AYT Matematik",
  "AYT MATEMATİK": "AYT Matematik",
  "AYT MAT": "AYT Matematik",
  ISLEM: "İşlem",
  İŞLEM: "İşlem",
}

const SUBJECT_WHEN_TEACHER_NAME: Record<string, string> = {
  "RUMEYSA BARANER": "Matematik",
  "RÜMEYSA BARANER": "Matematik",
}

const SKIP_SUBJECTS = new Set([
  "ETUT",
  "ETÜT",
  "TATIL",
  "TATİL",
  "LGS SINAV",
  "YKS SINAV",
  "MESAI YOK",
  "MESAİ YOK",
])

function clean(s: unknown): string {
  return String(s ?? "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normKey(s: unknown): string {
  return clean(s).toLocaleUpperCase("tr-TR")
}

function titleSubject(raw: string): string {
  const key = normKey(raw)
  if (SUBJECT_WHEN_TEACHER_NAME[key]) return SUBJECT_WHEN_TEACHER_NAME[key]
  if (SUBJECT_ALIASES[key]) return SUBJECT_ALIASES[key]
  return clean(raw)
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ")
}

function hasTimeRange(raw: string): boolean {
  return /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(clean(raw))
}

type StaffRow = {
  id: string
  firstName: string
  lastName: string
  department: string
}

function buildTeacherIndex(staff: StaffRow[]) {
  const byFull = new Map<string, StaffRow>()
  const byLast = new Map<string, StaffRow[]>()
  const byFirstLastParts = new Map<string, StaffRow>()

  for (const s of staff) {
    const full = normKey(`${s.firstName} ${s.lastName}`)
    byFull.set(full, s)
    const last = normKey(s.lastName)
    const list = byLast.get(last) ?? []
    list.push(s)
    byLast.set(last, list)
    const fi = normKey(s.firstName).charAt(0)
    byFirstLastParts.set(`${fi}.${last}`, s)
    byFirstLastParts.set(`${fi}${last}`, s)
  }
  return { byFull, byLast, byFirstLastParts }
}

const TEACHER_ALIASES: Record<string, string> = {
  "ZEYNEP OZEL": "ZEYNEP MERVE ÖZEL",
  "ZEYNEP ÖZEL": "ZEYNEP MERVE ÖZEL",
  "BERRANUR OMER": "BERRANUR ÖKSÜZÖMER",
  "BERRANUR ÖMER": "BERRANUR ÖKSÜZÖMER",
  "BERRANUR OKSUZOMER": "BERRANUR ÖKSÜZÖMER",
  CELIK: "MURSELİN ÇELİK",
  ÇELİK: "MURSELİN ÇELİK",
  ERDOGAN: "ESRA ERDOĞAN",
  ERDOĞAN: "ESRA ERDOĞAN",
  ATMACA: "NİSANUR ATMACA",
  "G.DERINGOL": "GÖKSU DERİNGÖL",
  "G.DERİNGÖL": "GÖKSU DERİNGÖL",
  "A.I.G": "ALI İHSAN GENİŞ",
  "A.İ.G": "ALI İHSAN GENİŞ",
  "ALI IHSAN GENIS": "ALI İHSAN GENİŞ",
  "Ü.KAYA": "ÜMİT KAYA",
  "U.KAYA": "ÜMİT KAYA",
  "UMIT KAYA": "ÜMİT KAYA",
  "ÜMIT KAYA": "ÜMİT KAYA",
  "M.UZUN": "MUSTAFA UZUN",
  UZUN: "MUSTAFA UZUN",
  AKBULUT: "İREM AKBULUT",
  "IREM AKBULUT": "İREM AKBULUT",
  "İREM AKBULUT": "İREM AKBULUT",
  AKYILDIZ: "ESRA AKYILDIZ",
  "NISANUR SAC": "NISA NUR SAÇ",
  "NİSANUR SAÇ": "NISA NUR SAÇ",
  "NISA NUR SAC": "NISA NUR SAÇ",
  "SEMRA AVCI": "SEMRA ŞAHİN",
  "EDANUR KADIR": "EDANUR KADİR",
}

async function ensureTeacher(
  rawName: string,
  index: ReturnType<typeof buildTeacherIndex>,
  subjectHint: string,
  created: StaffRow[]
): Promise<StaffRow | null> {
  let key = normKey(rawName)
  if (!key || key === "MESAİ YOK" || key === "MESAI YOK") return null

  const aliased = Boolean(TEACHER_ALIASES[key])
  if (TEACHER_ALIASES[key]) key = normKey(TEACHER_ALIASES[key])

  let found =
    index.byFull.get(key) ||
    index.byFirstLastParts.get(key) ||
    null

  if (!found && !aliased) {
    const parts = key.split(" ")
    const last = parts[parts.length - 1]
    const candidates = index.byLast.get(last) ?? []
    if (candidates.length === 1) found = candidates[0]
    else if (candidates.length > 1) {
      const first = parts[0]
      found =
        candidates.find((c) => normKey(c.firstName).startsWith(first)) ||
        candidates.find((c) => normKey(c.firstName).includes(first)) ||
        null
    }
  }

  if (!found && aliased) {
    const parts = key.split(" ")
    const first = parts[0]
    const last = parts[parts.length - 1]
    const candidates = index.byLast.get(last) ?? []
    found =
      candidates.find((c) => normKey(c.firstName) === first) ||
      candidates.find((c) => normKey(c.firstName).startsWith(first)) ||
      null
  }

  if (!found && !aliased) {
    for (const [full, row] of index.byFull) {
      if (full.includes(key) || key.includes(full)) {
        found = row
        break
      }
      const fullParts = full.split(" ")
      const keyParts = key.split(" ")
      if (
        keyParts.length >= 2 &&
        fullParts[0] === keyParts[0] &&
        fullParts[fullParts.length - 1] === keyParts[keyParts.length - 1]
      ) {
        found = row
        break
      }
    }
  }

  if (found) return found

  const aliasTarget = TEACHER_ALIASES[normKey(rawName)]
  const display = aliasTarget || clean(rawName)
  const bits = display.split(/\s+/)
  const lastName = bits[bits.length - 1]
  const firstName = bits.slice(0, -1).join(" ") || lastName

  let tc = `9${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1e4)
    .toString()
    .padStart(4, "0")}`
  while (tc.length < 11) tc += "0"
  tc = tc.slice(0, 11)

  const createdStaff = await prisma.staff.create({
    data: {
      firstName,
      lastName,
      tcNumber: tc,
      department: "OGRETMEN",
      subject: subjectHint || null,
      isActive: true,
      position: "Öğretmen",
    },
  })
  const row: StaffRow = {
    id: createdStaff.id,
    firstName: createdStaff.firstName,
    lastName: createdStaff.lastName,
    department: createdStaff.department,
  }
  created.push(row)
  index.byFull.set(normKey(`${row.firstName} ${row.lastName}`), row)
  const last = normKey(row.lastName)
  index.byLast.set(last, [...(index.byLast.get(last) ?? []), row])
  console.log("CREATED_TEACHER", row.firstName, row.lastName, "for", rawName, "→", subjectHint)
  return row
}

type ParsedLesson = {
  classExcel: string
  dbName: string
  grade: number
  dayOfWeek: number
  /** 0-based index among weekday LESSON slots */
  periodIndex: number
  subjectRaw: string
  subjectName: string
  teacherRaw: string
}

/**
 * Excel saatlerini yok sayar. Her gün içinde saati olan her satır bir ders dilimidir
 * (öğle arası boş satır sayılmaz). N. satır → N. sistem dersi.
 */
function parseExcel(rows: unknown[][]): ParsedLesson[] {
  const header = rows[0] || []
  const classAtCol = new Map<number, (typeof CLASS_COLS)[number]>()
  for (let c = 0; c < header.length; c++) {
    const label = clean(header[c])
    const meta = CLASS_COLS.find((x) => x.excel === label)
    if (meta) classAtCol.set(c, meta)
  }

  const out: ParsedLesson[] = []
  let currentDay = 0
  /** classExcel -> period index within current day */
  const periodByClass = new Map<string, number>()

  const resetPeriods = () => periodByClass.clear()

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || []
    const c0 = normKey(row[0])

    if (DAY_MAP[c0]) {
      currentDay = DAY_MAP[c0]
      resetPeriods()
    }

    if (c0 === "ETÜT") {
      currentDay = 0
      resetPeriods()
      continue
    }
    if (!currentDay) continue
    if (clean(row[2]) === "5A") continue

    for (const [subjectCol, meta] of classAtCol) {
      const timeCol = subjectCol - 1
      const teacherCol = subjectCol + 1
      const timeRaw = clean(row[timeCol])
      if (!hasTimeRange(timeRaw)) continue

      const periodIndex = periodByClass.get(meta.excel) ?? 0
      periodByClass.set(meta.excel, periodIndex + 1)

      const subjectRaw = clean(row[subjectCol])
      const teacherRaw = clean(row[teacherCol])
      if (!subjectRaw || !teacherRaw) continue
      if (SKIP_SUBJECTS.has(normKey(subjectRaw))) continue
      if (["MESAİ YOK", "MESAI YOK"].includes(normKey(teacherRaw))) continue

      out.push({
        classExcel: meta.excel,
        dbName: meta.dbName,
        grade: meta.grade,
        dayOfWeek: currentDay,
        periodIndex,
        subjectRaw,
        subjectName: titleSubject(subjectRaw),
        teacherRaw,
      })
    }
  }
  return out
}

type Slot = { startTime: string; endTime: string; label: string }

type SlotSets = {
  ortaokulWeekday: Slot[]
  liseWeekday: Slot[]
  ortaokulSaturday: Slot[]
  liseSaturday: Slot[]
}

async function loadLessonSlots(): Promise<SlotSets> {
  const templates = await prisma.schoolDayTemplate.findMany({
    include: {
      slots: { orderBy: { sortOrder: "asc" } },
    },
  })

  const pick = (band: "ORTAOKUL" | "LISE", scope: "WEEKDAY" | "SATURDAY"): Slot[] => {
    const t = templates.find((x) => x.band === band && x.scope === scope)
    if (!t) throw new Error(`${scope} template missing for ${band}`)
    return t.slots
      .filter((s) => s.kind === "LESSON")
      .map((s) => ({ startTime: s.startTime, endTime: s.endTime, label: s.label }))
  }

  return {
    ortaokulWeekday: pick("ORTAOKUL", "WEEKDAY"),
    liseWeekday: pick("LISE", "WEEKDAY"),
    ortaokulSaturday: pick("ORTAOKUL", "SATURDAY"),
    liseSaturday: pick("LISE", "SATURDAY"),
  }
}

function slotsFor(grade: number, dayOfWeek: number, slots: SlotSets): Slot[] {
  const saturday = dayOfWeek === 6
  if (grade <= 8) return saturday ? slots.ortaokulSaturday : slots.ortaokulWeekday
  return saturday ? slots.liseSaturday : slots.liseWeekday
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][]
  const lessons = parseExcel(rows)
  console.log("PARSED_LESSONS", lessons.length)

  const slotSets = await loadLessonSlots()
  console.log(
    "SLOTS ortaokul weekday",
    slotSets.ortaokulWeekday.map((s) => `${s.label} ${s.startTime}-${s.endTime}`).join(" | ")
  )
  console.log(
    "SLOTS lise weekday",
    slotSets.liseWeekday.map((s) => `${s.label} ${s.startTime}-${s.endTime}`).join(" | ")
  )
  console.log(
    "SLOTS lise saturday",
    slotSets.liseSaturday.map((s) => `${s.label} ${s.startTime}-${s.endTime}`).join(" | ")
  )

  const byClass = new Map<string, number>()
  for (const l of lessons) byClass.set(l.dbName, (byClass.get(l.dbName) || 0) + 1)
  console.log("BY_CLASS", Object.fromEntries(byClass))

  const classes = await prisma.class.findMany({
    select: { id: true, name: true, grade: true },
  })
  const classByName = new Map(classes.map((c) => [c.name, c]))

  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      department: { in: ["OGRETMEN", "REHBERLIK", "BAS_REHBERLIK"] },
    },
    select: { id: true, firstName: true, lastName: true, department: true },
  })
  const index = buildTeacherIndex(staff)
  const createdTeachers: StaffRow[] = []

  for (const [name, sub] of [
    ["ÜMİT KAYA", "Biyoloji"],
    ["MUSTAFA UZUN", "Matematik"],
    ["İREM AKBULUT", "Felsefe"],
  ] as const) {
    await ensureTeacher(name, index, sub, createdTeachers)
  }

  const subjectsNeeded = new Set(lessons.map((l) => l.subjectName))
  for (const name of subjectsNeeded) {
    const branch = await upsertBranchByName(name)
    const course = await prisma.scheduleCourse.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (course) {
      await ensureCourseLinkedToBranch(course.id, name)
      if (!course.isActive) {
        await prisma.scheduleCourse.update({
          where: { id: course.id },
          data: { isActive: true },
        })
      }
    } else {
      await prisma.scheduleCourse.create({
        data: {
          name,
          branchId: branch?.id,
          isActive: true,
          sortOrder: 100,
        },
      })
      console.log("CREATED_COURSE", name)
    }
  }

  const targetNames = CLASS_COLS.map((c) => c.dbName)
  for (const name of targetNames) {
    const cls = classByName.get(name)
    if (!cls) continue
    const del = await prisma.schedule.deleteMany({ where: { classId: cls.id } })
    console.log("CLEARED", name, del.count)
  }

  let created = 0
  let skipped = 0
  let unmatchedTeacher = 0
  let noSlot = 0
  const unmatchedNames = new Set<string>()
  const teacherBranchAdds = new Map<string, Set<string>>()
  const toCreate: Array<{
    classId: string
    teacherId: string
    subjectName: string
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }> = []

  for (const lesson of lessons) {
    const cls = classByName.get(lesson.dbName)
    if (!cls) {
      skipped++
      continue
    }

    const bandSlots = slotsFor(lesson.grade, lesson.dayOfWeek, slotSets)
    const slot = bandSlots[lesson.periodIndex]
    if (!slot) {
      noSlot++
      console.warn(
        "NO_SLOT",
        lesson.dbName,
        "day",
        lesson.dayOfWeek,
        "period",
        lesson.periodIndex + 1,
        lesson.subjectName
      )
      skipped++
      continue
    }

    const teacher = await ensureTeacher(
      lesson.teacherRaw,
      index,
      lesson.subjectName,
      createdTeachers
    )
    if (!teacher) {
      unmatchedTeacher++
      unmatchedNames.add(lesson.teacherRaw)
      skipped++
      continue
    }

    toCreate.push({
      classId: cls.id,
      teacherId: teacher.id,
      subjectName: lesson.subjectName,
      dayOfWeek: lesson.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: true,
    })
    const set = teacherBranchAdds.get(teacher.id) ?? new Set<string>()
    set.add(lesson.subjectName)
    teacherBranchAdds.set(teacher.id, set)
  }

  // bulk insert
  const BATCH = 100
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const chunk = toCreate.slice(i, i + BATCH)
    const res = await prisma.schedule.createMany({ data: chunk })
    created += res.count
  }

  for (const [staffId, subjectNames] of teacherBranchAdds) {
    const branchIds: string[] = []
    for (const name of subjectNames) {
      const b = await upsertBranchByName(name)
      if (b) branchIds.push(b.id)
    }
    const existing = await prisma.staffBranch.findMany({
      where: { staffId },
      select: { branchId: true },
    })
    const merged = [...new Set([...existing.map((e) => e.branchId), ...branchIds])]
    await syncStaffBranches(staffId, merged)
  }

  // sample verify
  const sample = await prisma.schedule.findMany({
    where: { class: { name: "11/A" }, dayOfWeek: 1 },
    orderBy: { startTime: "asc" },
    select: { startTime: true, endTime: true, subjectName: true },
  })
  console.log(
    "VERIFY 11/A Mon:",
    sample.map((s) => `${s.startTime}-${s.endTime} ${s.subjectName}`).join(" | ")
  )

  console.log(
    JSON.stringify(
      {
        created,
        skipped,
        noSlot,
        unmatchedTeacher,
        unmatchedNames: [...unmatchedNames],
        createdTeachers: createdTeachers.map((t) => `${t.firstName} ${t.lastName}`),
      },
      null,
      2
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
