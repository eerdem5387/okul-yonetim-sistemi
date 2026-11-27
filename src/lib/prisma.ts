import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

/**
 * Okuldan ayrılan öğrenciler (Student.leftAt dolu) silinmez; bunun yerine bütün öğrenci
 * listelerinden varsayılan olarak gizlenir. Bu, sınıf, kulüp, istatistik, arama gibi
 * öğrenci listeleyen her sorguya tek tek filtre eklemek zorunda kalmamak içindir.
 *
 * Kural: student modelinde findMany / findFirst / count / aggregate / groupBy sorgularına
 * `leftAt: null` eklenir — sorgunun where'inde zaten `leftAt` geçiyorsa (örn. "Ayrılanlar"
 * listesi için `{ leftAt: { not: null } }`) dokunulmaz. findUnique (tek öğrenci) filtrelenmez,
 * böylece ayrılmış öğrencinin sayfası ve geçmişi açılabilir.
 */
function createClient(): PrismaClient {
    const base = new PrismaClient()
    const mentionsLeftAt = (where: unknown) => !!where && JSON.stringify(where).includes('"leftAt"')
    const withActive = <T extends { where?: unknown }>(args: T): T =>
        mentionsLeftAt(args?.where)
            ? args
            : ({ ...args, where: args?.where ? { AND: [args.where, { leftAt: null }] } : { leftAt: null } } as T)

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
