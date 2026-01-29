"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HistoryPage() {
  const router = useRouter()
  
  // Geçmiş sözleşmeler sayfası kaldırıldı - kullanıcıları yeni kayıt listeleme sayfasına yönlendir
  useEffect(() => {
    router.replace("/new-registrations/list")
  }, [router])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Geçmiş Sözleşmeler Sayfası Kaldırıldı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Geçmiş sözleşmeler sayfası kaldırılmıştır. Düzenleme işlemlerini kayıt görüntüleme sayfalarından yapabilirsiniz.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/new-registrations/list")}>
                Yeni Kayıtlar
              </Button>
              <Button onClick={() => router.push("/renewal/list")} variant="outline">
                Kayıt Yenilemeleri
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
