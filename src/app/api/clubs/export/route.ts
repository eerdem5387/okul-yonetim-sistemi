import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        // Tüm kulüpleri öğrenci seçimleriyle birlikte çek
        const clubs = await prisma.club.findMany({
            include: {
                selections: {
                    include: {
                        student: {
                            select: {
                                firstName: true,
                                lastName: true,
                                grade: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            },
            orderBy: {
                name: "asc"
            }
        })

        // Dynamic import to keep edge/server compatibility
        const XLSX = await import("xlsx")

        // Ana veri sheet'i için satırlar oluştur
        interface MainRow {
            "Kulüp Adı": string
            "Kulüp Açıklama": string
            "Kontejan": number | string
            "Kayıtlı Öğrenci": number | string
            "Doluluk Oranı": string
            "Öğrenci Adı": string
            "Öğrenci Soyadı": string
            "Sınıf": string
        }
        const mainRows: MainRow[] = []
        
        clubs.forEach((club) => {
            if (club.selections.length === 0) {
                // Öğrencisi olmayan kulüpler için boş satır
                mainRows.push({
                    "Kulüp Adı": club.name,
                    "Kulüp Açıklama": club.description || "",
                    "Kontejan": club.capacity,
                    "Kayıtlı Öğrenci": 0,
                    "Doluluk Oranı": "0%",
                    "Öğrenci Adı": "",
                    "Öğrenci Soyadı": "",
                    "Sınıf": ""
                })
            } else {
                // Her öğrenci için ayrı satır
                club.selections.forEach((selection, index) => {
                    const student = selection.student
                    const capacityPercentage = Math.round((club.selections.length / club.capacity) * 100)
                    
                    mainRows.push({
                        "Kulüp Adı": index === 0 ? club.name : "", // İlk satırda kulüp adı, diğerlerinde boş
                        "Kulüp Açıklama": index === 0 ? (club.description || "") : "",
                        "Kontejan": index === 0 ? club.capacity : "",
                        "Kayıtlı Öğrenci": index === 0 ? club.selections.length : "",
                        "Doluluk Oranı": index === 0 ? `${capacityPercentage}%` : "",
                        "Öğrenci Adı": student.firstName,
                        "Öğrenci Soyadı": student.lastName,
                        "Sınıf": student.grade
                    })
                })
            }
        })

        // Özet sheet'i oluştur
        const summaryRows = clubs.map((club) => {
            const capacityPercentage = Math.round((club.selections.length / club.capacity) * 100)
            return {
                "Kulüp Adı": club.name,
                "Açıklama": club.description || "",
                "Kontejan": club.capacity,
                "Kayıtlı Öğrenci Sayısı": club.selections.length,
                "Boş Kontenjan": club.capacity - club.selections.length,
                "Doluluk Oranı (%)": capacityPercentage,
                "Durum": capacityPercentage >= 100 ? "Dolu" : capacityPercentage >= 80 ? "Dolu (Yakın)" : "Müsait"
            }
        })

        // Kulüp-Öğrenci Listesi sheet'i oluştur (pivot format: kulüpler yatay, öğrenciler dikey)
        // En uzun öğrenci listesini bul
        const maxStudents = Math.max(...clubs.map(club => club.selections.length), 0)
        
        // Pivot format için 2D array oluştur
        // İlk satır: Kulüp isimleri (başlık)
        const headerRow: string[] = clubs.map((club) => club.name)
        const pivotData: string[][] = [headerRow]
        
        // Her satır için öğrenci bilgilerini ekle
        for (let rowIndex = 0; rowIndex < maxStudents; rowIndex++) {
            const studentRow: string[] = []
            
            clubs.forEach((club) => {
                if (club.selections[rowIndex]) {
                    const student = club.selections[rowIndex].student
                    // Öğrenci adı, soyadı ve sınıfı birleştir
                    studentRow.push(`${student.firstName} ${student.lastName} (${student.grade})`)
                } else {
                    // Bu kulüpte bu satırda öğrenci yok
                    studentRow.push("")
                }
            })
            
            pivotData.push(studentRow)
        }

        // Workbook oluştur
        const wb = XLSX.utils.book_new()
        
        // Ana veri sheet'i
        const mainWs = XLSX.utils.json_to_sheet(mainRows)
        
        // Kolon genişliklerini ayarla
        const mainColWidths = [
            { wch: 25 }, // Kulüp Adı
            { wch: 30 }, // Kulüp Açıklama
            { wch: 10 }, // Kontejan
            { wch: 15 }, // Kayıtlı Öğrenci
            { wch: 12 }, // Doluluk Oranı
            { wch: 15 }, // Öğrenci Adı
            { wch: 15 }, // Öğrenci Soyadı
            { wch: 10 }  // Sınıf
        ]
        mainWs['!cols'] = mainColWidths
        
        // Özet sheet'i
        const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
        
        // Özet kolon genişliklerini ayarla
        const summaryColWidths = [
            { wch: 25 }, // Kulüp Adı
            { wch: 30 }, // Açıklama
            { wch: 10 }, // Kontejan
            { wch: 20 }, // Kayıtlı Öğrenci Sayısı
            { wch: 15 }, // Boş Kontenjan
            { wch: 15 }, // Doluluk Oranı (%)
            { wch: 15 }  // Durum
        ]
        summaryWs['!cols'] = summaryColWidths
        
        // Kulüp-Öğrenci Listesi sheet'i (pivot format)
        // Önce 2D array formatında sheet oluştur
        const clubStudentWs = XLSX.utils.aoa_to_sheet(pivotData)
        
        // Kulüp-Öğrenci kolon genişliklerini dinamik olarak ayarla (her kulüp için bir kolon)
        const clubStudentColWidths = clubs.map(() => ({ wch: 25 })) // Her kulüp için 25 karakter genişlik
        clubStudentWs['!cols'] = clubStudentColWidths
        
        // Sheet'leri workbook'a ekle (önce kulüp-öğrenci tablosu - varsayılan görünüm, sonra özet ve detay)
        try {
            XLSX.utils.book_append_sheet(wb, clubStudentWs, "Kulüp Öğrenci Tablosu")
            console.log("Kulüp Öğrenci Tablosu sheet eklendi, satır sayısı:", pivotData.length - 1)
        } catch (e) {
            console.error("Kulüp-Öğrenci Listesi sheet eklenirken hata:", e)
        }
        
        try {
            XLSX.utils.book_append_sheet(wb, summaryWs, "Özet")
            console.log("Özet sheet eklendi")
        } catch (e) {
            console.error("Özet sheet eklenirken hata:", e)
        }
        
        try {
            XLSX.utils.book_append_sheet(wb, mainWs, "Kulüp Detayları")
            console.log("Kulüp Detayları sheet eklendi")
        } catch (e) {
            console.error("Kulüp Detayları sheet eklenirken hata:", e)
        }
        
        // Excel dosyasını oluştur
        const wbout: Uint8Array = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as unknown as Uint8Array
        console.log("Excel dosyası oluşturuldu, sheet sayısı:", wb.SheetNames.length)

        // Tarih formatıyla dosya adı oluştur
        const date = new Date()
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD formatı
        const filename = `kulup-listesi_${dateStr}.xlsx`

        return new NextResponse(Buffer.from(wbout), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        })
    } catch (error) {
        console.error("Error exporting clubs:", error)
        return NextResponse.json({ error: "Kulüp listesi indirilirken hata oluştu" }, { status: 500 })
    }
}

