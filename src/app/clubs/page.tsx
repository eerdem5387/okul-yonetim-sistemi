"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Users, Eye } from "lucide-react"

interface Club {
  id: string
  name: string
  description: string | null
  capacity: number
  createdAt: string
  selections: {
    student: {
      firstName: string
      lastName: string
    }
  }[]
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: 0
  })

  useEffect(() => {
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    try {
      const response = await fetch("/api/clubs")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setClubs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching clubs:", error)
      setClubs([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingClub ? `/api/clubs/${editingClub.id}` : "/api/clubs"
      const method = editingClub ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchClubs()
        setShowForm(false)
        setEditingClub(null)
        setFormData({ name: "", description: "", capacity: 0 })
      } else {
        alert("Kulüp kaydedilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving club:", error)
    }
  }

  const handleEdit = (club: Club) => {
    setEditingClub(club)
    setFormData({
      name: club.name,
      description: club.description || "",
      capacity: club.capacity
    })
    setShowForm(true)
  }

  const handleDelete = async (clubId: string) => {
    if (confirm("Bu kulübü silmek istediğinizden emin misiniz?")) {
      try {
        const response = await fetch(`/api/clubs/${clubId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          fetchClubs()
        } else {
          alert("Kulüp silinirken hata oluştu!")
        }
      } catch (error) {
        console.error("Error deleting club:", error)
      }
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kulüp Yönetimi</h1>
          <p className="text-gray-600 mt-2">Kulüpleri oluşturun ve öğrenci seçimlerini yönetin</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kulüp
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingClub ? "Kulüp Düzenle" : "Yeni Kulüp"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Kulüp Adı</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="capacity">Kontejan</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingClub ? "Güncelle" : "Oluştur"}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false)
                  setEditingClub(null)
                  setFormData({ name: "", description: "", capacity: 0 })
                }}>
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => {
          const capacityPercentage = (club.selections.length / club.capacity) * 100
          const getCapacityColor = () => {
            if (capacityPercentage >= 100) return "bg-red-500"
            if (capacityPercentage >= 80) return "bg-orange-500"
            if (capacityPercentage >= 60) return "bg-yellow-500"
            return "bg-green-500"
          }
          
          return (
            <Card key={club.id} className="card-soft hover:shadow-lg transition-all duration-200 border-0">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Users className="h-6 w-6 icon-blue" />
                      {club.name}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {club.selections.length}/{club.capacity} öğrenci
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.location.href = `/clubs/${club.id}`}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(club)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(club.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {club.description && (
                  <p className="text-sm text-gray-600 mb-4">{club.description}</p>
                )}
                
                {/* Kontejan Dolum Barı */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Kontejan</span>
                    <span className="text-sm text-gray-500">{Math.round(capacityPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getCapacityColor()}`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Öğrenci Listesi */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-gray-700">Seçen Öğrenciler:</h4>
                  {club.selections.length > 0 ? (
                    <div className="max-h-20 overflow-y-auto">
                      {club.selections.slice(0, 3).map((selection, index) => (
                        <div key={index} className="text-sm text-gray-600 py-1">
                          {selection.student.firstName} {selection.student.lastName}
                        </div>
                      ))}
                      {club.selections.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{club.selections.length - 3} daha fazla
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Henüz öğrenci seçimi yapılmamış</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
