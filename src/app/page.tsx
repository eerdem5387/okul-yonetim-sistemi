import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Shirt, Utensils, Bus, BookOpen } from "lucide-react"

export default function HomePage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Okul Yönetim Sistemi</h1>
        <p className="text-gray-600 mt-2">Öğrenci kayıt ve sözleşme yönetim paneli</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kulüp Yönetimi
            </CardTitle>
            <CardDescription>
              Kulüp oluşturma ve öğrenci kulüp seçimlerini yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Yeni kulüpler oluşturun, kontejan belirleyin ve öğrenci seçimlerini takip edin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Yeni Kayıt
            </CardTitle>
            <CardDescription>
              Yeni öğrenci kayıt sözleşmelerini oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Yeni öğrenci kayıt sözleşmelerini doldurun ve PDF olarak indirin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Kayıt Yenileme
            </CardTitle>
            <CardDescription>
              Mevcut öğrenci kayıt yenileme sözleşmelerini oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Kayıt yenileme sözleşmelerini doldurun ve PDF olarak indirin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Forma Sözleşmesi
            </CardTitle>
            <CardDescription>
              Öğrenci forma sözleşmelerini oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Forma sözleşmelerini doldurun ve PDF olarak indirin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Yemek Sözleşmesi
            </CardTitle>
            <CardDescription>
              Öğrenci yemek sözleşmelerini oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Yemek sözleşmelerini doldurun ve PDF olarak indirin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Servis Sözleşmesi
            </CardTitle>
            <CardDescription>
              Öğrenci servis sözleşmelerini oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Servis sözleşmelerini doldurun ve PDF olarak indirin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Kitap Sözleşmesi
            </CardTitle>
            <CardDescription>
              Öğrenci kitap sözleşmelerini oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Kitap sözleşmelerini doldurun ve PDF olarak indirin.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}