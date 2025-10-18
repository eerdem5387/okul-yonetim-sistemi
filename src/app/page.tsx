import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Shirt, Utensils, Bus, BookOpen, UserPlus, History } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Okul Yönetim Sistemi</h1>
        <p className="text-gray-600 mt-2">Öğrenci kayıt ve sözleşme yönetim paneli</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        <Link href="/students">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <UserPlus className="h-6 w-6 icon-blue" />
                Öğrenci Yönetimi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci bilgilerini yönetin ve düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Öğrenci ekleyin, düzenleyin ve arama yapın.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clubs">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Users className="h-6 w-6 icon-green" />
                Kulüp Yönetimi
              </CardTitle>
              <CardDescription className="text-sm">
                Kulüp oluşturma ve öğrenci kulüp seçimlerini yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Yeni kulüpler oluşturun, kontejan belirleyin ve öğrenci seçimlerini takip edin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/new-registration">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <FileText className="h-6 w-6 icon-green" />
                Yeni Kayıt
              </CardTitle>
              <CardDescription className="text-sm">
                Yeni öğrenci kayıt sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Yeni öğrenci kayıt sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/renewal">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <FileText className="h-6 w-6 icon-orange" />
                Kayıt Yenileme
              </CardTitle>
              <CardDescription className="text-sm">
                Mevcut öğrenci kayıt yenileme sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Kayıt yenileme sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/uniform">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Shirt className="h-6 w-6 icon-purple" />
                Forma Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci forma sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Forma sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/meal">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Utensils className="h-6 w-6 icon-red" />
                Yemek Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci yemek sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Yemek sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/service">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Bus className="h-6 w-6 icon-cyan" />
                Servis Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci servis sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Servis sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/book">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <BookOpen className="h-6 w-6 icon-lime" />
                Kitap Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci kitap sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Kitap sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/history">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <History className="h-6 w-6 icon-pink" />
                Geçmiş Sözleşmeler
              </CardTitle>
              <CardDescription className="text-sm">
                Tüm sözleşmeleri görüntüleyin ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Geçmiş sözleşmeleri görüntüleyin, düzenleyin ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}