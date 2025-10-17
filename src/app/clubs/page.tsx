"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2 } from "lucide-react"

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
        {clubs.map((club) => (
          <Card key={club.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{club.name}</CardTitle>
                  <CardDescription>
                    Kontejan: {club.selections.length}/{club.capacity}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(club)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(club.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {club.description && (
                <p className="text-sm text-gray-600 mb-4">{club.description}</p>
              )}
              <div>
                <h4 className="font-medium mb-2">Seçen Öğrenciler:</h4>
                {club.selections.length > 0 ? (
                  <ul className="space-y-1">
                    {club.selections.map((selection, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {selection.student.firstName} {selection.student.lastName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Henüz seçim yapılmamış</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
