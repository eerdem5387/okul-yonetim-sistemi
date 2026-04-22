import { NextRequest, NextResponse } from "next/server"
import { checkActivityAccess } from "@/lib/access-control"
import { generatePDF } from "@/lib/pdf-generator"
import { buildLanguageCertificateHTML } from "@/lib/certificates/dil-egitimi-katilim"
import { buildFenCertificateHTML } from "@/lib/certificates/ingilizce-fen-sertifika"
import { buildMatematikCertificateHTML } from "@/lib/certificates/ingilizce-matematik-sertifika"
import { buildRobotikCertificateHTML } from "@/lib/certificates/robotik-sertifika"
import { buildYapayZekaCertificateHTML } from "@/lib/certificates/yapay-zeka-sertifika"
import { buildGeziCertificateHTML } from "@/lib/certificates/gezi-katilim"
import { buildGorselSanatlarEgitimCertificateHTML } from "@/lib/certificates/gorsel-sanatlar-egitim"
import { buildGorselSanatlarEtkinlikCertificateHTML } from "@/lib/certificates/gorsel-sanatlar-etkinlik"
import { buildMuzikEgitimCertificateHTML } from "@/lib/certificates/muzik-egitim"
import { buildMuzikEserIcraCertificateHTML } from "@/lib/certificates/muzik-eser-icra"
import { buildBasketbolEgitimCertificateHTML } from "@/lib/certificates/basketbol-egitim"
import { buildBedenEgitimCertificateHTML } from "@/lib/certificates/beden-egitim"
import { buildHentbolEgitimCertificateHTML } from "@/lib/certificates/hentbol-egitim"
import { buildVoleybolEgitimCertificateHTML } from "@/lib/certificates/voleybol-egitim"
import { buildTurnuvaKatilimCertificateHTML } from "@/lib/certificates/turnuva-katilim"
import {
  buildTurnuvaBasariCertificateHTML,
  type TurnuvaBasariCertData,
} from "@/lib/certificates/turnuva-basari"
import { buildProjeKatilimCertificateHTML } from "@/lib/certificates/proje-katilim"
import { applyGlobalCertificateLayout } from "@/lib/certificates/global-certificate-layout"

export async function POST(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { certificateType, certData } = body

    if (!certificateType || !certData) {
      return NextResponse.json({ error: "Sertifika tipi ve verisi zorunludur" }, { status: 400 })
    }

    let html = ""

    if (certificateType === "DIL_EGITIMI_KATILIM") {
      html = buildLanguageCertificateHTML(certData)
    } else if (certificateType === "INGILIZCE_FEN_SERTIFIKA") {
      html = buildFenCertificateHTML(certData)
    } else if (certificateType === "INGILIZCE_MATEMATIK_SERTIFIKA") {
      html = buildMatematikCertificateHTML(certData)
    } else if (certificateType === "ROBOTIK_SERTIFIKA") {
      html = buildRobotikCertificateHTML(certData)
    } else if (certificateType === "YAPAY_ZEKA_SERTIFIKA") {
      html = buildYapayZekaCertificateHTML(certData)
    } else if (certificateType === "GEZI_KATILIM") {
      html = buildGeziCertificateHTML(certData)
    } else if (certificateType === "GORSEL_SANATLAR_EGITIM") {
      html = buildGorselSanatlarEgitimCertificateHTML(certData)
    } else if (certificateType === "GORSEL_SANATLAR_ETKINLIK") {
      html = buildGorselSanatlarEtkinlikCertificateHTML(certData)
    } else if (certificateType === "MUZIK_EGITIM") {
      html = buildMuzikEgitimCertificateHTML(certData)
    } else if (certificateType === "MUZIK_ESER_ICRA") {
      html = buildMuzikEserIcraCertificateHTML(certData)
    } else if (certificateType === "BASKETBOL_EGITIM") {
      html = buildBasketbolEgitimCertificateHTML(certData)
    } else if (certificateType === "BEDEN_EGITIMI_EGITIM") {
      html = buildBedenEgitimCertificateHTML(certData)
    } else if (certificateType === "HENTBOL_EGITIM") {
      html = buildHentbolEgitimCertificateHTML(certData)
    } else if (certificateType === "VOLEYBOL_EGITIM") {
      html = buildVoleybolEgitimCertificateHTML(certData)
    } else if (certificateType === "TURNUVA_KATILIM") {
      html = buildTurnuvaKatilimCertificateHTML(certData)
    } else if (certificateType === "PROJE_KATILIM") {
      html = buildProjeKatilimCertificateHTML(certData)
    } else if (certificateType === "TURNUVA_BASARI") {
      const d = certData as TurnuvaBasariCertData
      if (!d.participants?.length) {
        return NextResponse.json(
          { error: "Başarı belgesi için en az bir öğrenci için derece metni girilmelidir" },
          { status: 400 }
        )
      }
      if (!d.totalParticipants || d.totalParticipants < 1) {
        return NextResponse.json({ error: "Toplam yarışmacı sayısı zorunludur" }, { status: 400 })
      }
      html = buildTurnuvaBasariCertificateHTML(certData)
    } else {
      return NextResponse.json({ error: "Bilinmeyen sertifika tipi" }, { status: 400 })
    }

    const normalizedHtml = applyGlobalCertificateLayout(html)

    const pdfResult = await generatePDF(normalizedHtml, {
      format: "A4",
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      disableGlobalLogo: true,
    })
    const pdfBuffer = Buffer.from(pdfResult)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="onizleme-sertifika.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("preview-pdf error:", error)
    return NextResponse.json({ error: "PDF önizleme oluşturulurken hata oluştu" }, { status: 500 })
  }
}
