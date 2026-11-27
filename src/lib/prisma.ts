import { PrismaClient, type Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

/**
 * Öğrenci listelerinde varsayılan olarak gizlenen öğrenciler:
 *  - leftAt dolu: okuldan ayrıldı (kayıt ve geçmiş korunur)
 *  - preEnrollment: yalnızca aktif olmayan sonraki akademik yıl için kaydı var (henüz okulda değil)
 *
 * Kural: student modelinde findMany / findFirst / count / aggregate / groupBy sorgularına bu
 * koşullar eklenir. Sorgunun where'inde ilgili alan zaten geçiyorsa (örn. "Ayrılanlar" listesi için
 * `{ leftAt: { not: null } }` ya da ön kayıtları da görmek için INCLUDE_PRE_ENROLLMENT) o koşula
 * dokunulmaz. findUnique (tek öğrenci) ve iç içe (include/select) ilişkiler filtrelenmez.
 */
const HIDDEN_BY_DEFAULT = [
    { key: 'leftAt', condition: { leftAt: null } },
    { key: 'preEnrollment', condition: { preEnrollment: false } },
] as const

/** where'e eklendiğinde ön kayıtlı öğrenciler de sonuçlara dahil edilir. */
export const INCLUDE_PRE_ENROLLMENT: Prisma.StudentWhereInput = {
    OR: [{ preEnrollment: true }, { preEnrollment: false }],
}

function createClient(): PrismaClient {
    const base = new PrismaClient()
    const withActive = <T extends { where?: unknown }>(args: T): T => {
        const whereJson = args?.where ? JSON.stringify(args.where) : ''
        const extra = HIDDEN_BY_DEFAULT.filter((h) => !whereJson.includes(`"${h.key}"`)).map((h) => h.condition)
        if (extra.length === 0) return args
        return { ...args, where: args?.where ? { AND: [args.where, ...extra] } : { AND: extra } } as T
    }

    const extended = base.$extends({
        query: {
            student: {
                findMany: ({ args, query }) => query(withActive(args)),
                findFirst: ({ args, query }) => query(withActive(args)),
                findFirstOrThrow: ({ args, query }) => query(withActive(args)),
                count: ({ args, query }) => query(withActive(args ?? {})),
                aggregate: ({ args, query }) => query(withActive(args)),
                groupBy: ({ args, query }) => query(withActive(args)),
            },
        },
    })
    // Uzantı yalnızca sorgu davranışını değiştirir; dönen tipler aynıdır.
    return extended as unknown as PrismaClient
}

// Tarayıcı paketine yanlışlıkla girerse (istemci bileşeni, prisma'yı da içe aktaran bir yardımcıyı
// kullandığında) $extends çağrısı modül yüklenirken hata fırlatıp sayfayı çökertir; orada uzantı kurulmaz.
export const prisma =
    globalForPrisma.prisma ?? (typeof window === 'undefined' ? createClient() : (new PrismaClient() as PrismaClient))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
