/**
 * İmzalı oturum token'ı doğrulama kontrolü (DB gerektirmez).
 * Çalıştırma: npx tsx scripts/verify-session-token.ts
 */
import { createHmac } from "crypto"

process.env.AUTH_TOKEN_SECRET = "test-secret-for-verify-script"

async function main() {
  const m = await import("../src/lib/auth/session-token")
  const { parseStaffToken, isStaffTokenExpired } = await import("../src/lib/auth/token")
  let failed = 0
  const check = (name: string, ok: boolean) => {
    console.log(`${ok ? "✓" : "✗"} ${name}`)
    if (!ok) failed++
  }

  const staffId = "cmabc123staff"
  const founderId = "cmfounder999"
  const valid = m.createStaffSessionToken("student_affairs", staffId)
  const v = m.verifySessionToken(valid, "staff")
  check("geçerli imzalı personel token'ı kabul edilir", v?.subjectId === staffId && v.role === "student_affairs" && !v.legacy)

  const [payload, sig] = [valid.slice(0, valid.lastIndexOf(".")), valid.slice(valid.lastIndexOf(".") + 1)]
  check("staffId değiştirilmiş token reddedilir", m.verifySessionToken(payload.replace(staffId, founderId) + "." + sig) === null)
  check("rol değiştirilmiş token reddedilir", m.verifySessionToken(payload.replace("student_affairs", "admin") + "." + sig) === null)
  check("zaman damgası değiştirilmiş token reddedilir", m.verifySessionToken(payload.replace(/\d+$/, String(Date.now() + 1)) + "." + sig) === null)
  const otherSig = createHmac("sha256", "baska-anahtar").update(`admin_${founderId}_${Date.now()}`).digest("base64url")
  check("başka anahtarla imzalanmış token reddedilir", m.verifySessionToken(`admin_${founderId}_${Date.now()}.${otherSig}`) === null)
  check("boş imzalı token reddedilir", m.verifySessionToken(`${payload}.`) === null)

  const oldPayload = `admin_${founderId}_${Date.now() - 16 * 24 * 60 * 60 * 1000}`
  const oldSigned = `${oldPayload}.${createHmac("sha256", process.env.AUTH_TOKEN_SECRET!).update(oldPayload).digest("base64url")}`
  check("süresi dolmuş imzalı token reddedilir", m.verifySessionToken(oldSigned) === null)

  const parent = m.createParentSessionToken("cmparent1")
  check("geçerli veli token'ı veli olarak kabul edilir", m.verifySessionToken(parent, "parent")?.subjectId === "cmparent1")
  check("veli token'ı personel olarak reddedilir", m.verifySessionToken(parent, "staff") === null)
  const ib = m.createIbViewerSessionToken("cmib1")
  check("IB token'ı kabul edilir", m.verifySessionToken(ib, "ib_viewer")?.subjectId === "cmib1")

  const legacy = `admin_${founderId}_${Date.now()}`
  delete process.env.AUTH_ACCEPT_LEGACY_TOKENS
  check("imzasız eski token varsayılan olarak kabul edilir (legacy=true)", m.verifySessionToken(legacy, "staff")?.legacy === true)
  process.env.AUTH_ACCEPT_LEGACY_TOKENS = "false"
  check("AUTH_ACCEPT_LEGACY_TOKENS=false iken imzasız token reddedilir", m.verifySessionToken(legacy, "staff") === null)
  check("bayrak kapalıyken imzalı token yine kabul edilir", m.verifySessionToken(valid, "staff") !== null)
  delete process.env.AUTH_ACCEPT_LEGACY_TOKENS
  check("gelecek tarihli eski token reddedilir", m.verifySessionToken(`admin_${founderId}_${Date.now() + 365 * 86400000}`) === null)
  check("bilinmeyen rollü token reddedilir", m.verifySessionToken(`superuser_${founderId}_${Date.now()}`) === null)

  const headers = new Headers({ authorization: `Bearer ${valid}` })
  check("Bearer başlığı okunur", m.readBearerToken({ headers }) === valid)

  check("istemci parseStaffToken imzalı biçimi okur", parseStaffToken(valid)?.staffId === staffId)
  check("istemci isStaffTokenExpired imzalı token'ı süresi dolmamış sayar", !isStaffTokenExpired(valid))

  console.log(failed ? `\n${failed} kontrol BAŞARISIZ` : "\nTüm kontroller geçti")
  process.exit(failed ? 1 : 0)
}

main()
