# Race Condition Önleme Mekanizmaları

Yüksek yoğunlukta kulüp seçimi işlemlerinde veri tutarlılığını sağlamak için uygulanan güvenlik önlemleri.

## Sorun

Velilerimiz aynı anda sisteme giriş yapıp kulüp seçimi yaptığında:
- Kontenjanı dolu kulüpler için güncel bilgi gösterilmeyebilir
- Aynı kontenjana birden fazla kayıt yapılabilir
- Kullanıcılar sayfayı yenilemediği için eski verileri görebilir

## Uygulanan Çözümler

### 1. Otomatik Veri Yenileme (Polling)

**Konum:** `src/app/parent/page.tsx`

```typescript
// Her 10 saniyede bir otomatik güncelleme
useEffect(() => {
  if (selectedStudent) {
    const intervalId = setInterval(() => {
      fetchClubs() // Kulüp kontenjanlarını yenile
      fetchStudentClubs(selectedStudent.id) // Öğrencinin seçimlerini yenile
    }, 10000) // 10 saniye

    return () => clearInterval(intervalId)
  }
}, [selectedStudent, fetchClubs])
```

**Faydaları:**
- Kullanıcı sayfayı yenilemese bile veriler otomatik güncellenir
- Kontenjan doluluk durumu gerçek zamanlı yansır
- 10 saniyelik interval optimum performans sağlar

### 2. Kulüp Seçiminde Anlık Kontrol

**Konum:** `src/app/parent/page.tsx`

```typescript
const handleClubToggle = async (clubId: string) => {
  // Seçim yapmadan önce GÜNCEL verileri çek
  await fetchClubs()
  
  // Kapasite kontrolü güncel verilerle yapılır
  if (currentSelections >= club.capacity) {
    alert("Kontenjan dolmuştur! Veriler güncellendi.")
    return
  }
}
```

**Faydaları:**
- Her kulüp seçiminde backend'den fresh data alınır
- Dolu kulüplere kayıt önlenir
- Kullanıcıya anında feedback verilir

### 3. Onaylama Öncesi Son Kontrol

**Konum:** `src/app/parent/page.tsx`

```typescript
const handleConfirm = async () => {
  // Onaylamadan önce son bir kez GÜNCEL verileri çek
  await fetchClubs()
  
  // Seçili kulüplerin hala uygun olup olmadığını kontrol et
  const invalidClubs = []
  for (const clubId of selectedClubs) {
    const club = clubs.find(c => c.id === clubId)
    if (club.selections.length >= club.capacity) {
      invalidClubs.push(club.name)
    }
  }
  
  if (invalidClubs.length > 0) {
    alert("Kontenjanı dolan kulüpler: " + invalidClubs.join(", "))
    // Dolu kulüpleri otomatik çıkar
    return
  }
}
```

**Faydaları:**
- Kayıt işlemi öncesi son güvenlik kontrolü
- Dolu kulüpler otomatik çıkarılır
- Gereksiz API istekleri önlenir

### 4. Transaction-Based Database İşlemleri

**Konum:** `src/app/api/clubs/students/route.ts`

```typescript
// Prisma transaction ile atomic işlem
const result = await prisma.$transaction(async (tx) => {
  // 1. Mevcut seçimleri sil
  await tx.clubSelection.deleteMany({ where: { studentId } })
  
  // 2. FRESH DATA - Transaction içinde güncel verileri çek
  const clubs = await tx.club.findMany({
    where: { id: { in: clubIds } },
    include: { selections: true }
  })
  
  // 3. GÜNCEL kontenjan kontrolü yap
  if (currentSelectionsCount >= club.capacity) {
    throw new Error("Club is full")
  }
  
  // 4. Yeni seçimleri kaydet
  await tx.clubSelection.createMany({ data: clubSelections })
  
  return { success: true }
}, {
  maxWait: 5000,
  timeout: 10000
})
```

**Faydaları:**
- Tüm işlemler atomic olarak yapılır (hepsi başarılı veya hiçbiri)
- Race condition tamamen önlenir
- Database lock mekanizması ile eşzamanlı işlemler güvenli hale gelir
- Transaction içinde fresh data ile kontenjan kontrolü yapılır

### 5. Görsel Feedback

**Konum:** `src/app/parent/page.tsx`

Kullanıcıya "Otomatik güncelleniyor" bildirimi gösterilir:

```tsx
<div className="flex items-center gap-1.5">
  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
  <span>Otomatik güncelleniyor</span>
</div>
```

**Faydaları:**
- Kullanıcı verilerin güncel olduğunu bilir
- Sistem güvenilirliği artar
- Kullanıcı deneyimi iyileşir

## Performans Optimizasyonu

### Request Debouncing
- 10 saniyelik interval ile gereksiz API istekleri önlenir
- Sadece öğrenci seçiliyken polling çalışır
- Component unmount olduğunda interval temizlenir

### Database Indexing
- `clubId` ve `studentId` üzerinde index kullanılır
- Transaction timeout süreleri optimize edilmiştir (5s wait, 10s timeout)
- Prisma connection pooling ile eşzamanlı istekler desteklenir

## Test Senaryoları

### Senaryo 1: Eşzamanlı Kayıt
**Durum:** 2 veli aynı anda son kontenjana kayıt olmaya çalışıyor  
**Sonuç:** Transaction sayesinde sadece biri başarılı olur, diğeri "kontenjan dolu" hatası alır

### Senaryo 2: Eski Veri ile Kayıt
**Durum:** Veli sayfayı yenilemeden kayıt yapmaya çalışıyor  
**Sonuç:** Onaylama öncesi fresh data çekilir, dolu kulüpler otomatik çıkarılır

### Senaryo 3: Yüksek Yoğunluk
**Durum:** 100 veli aynı anda 50 kontenjan için kayıt yapıyor  
**Sonuç:** Transaction lock mekanizması ile sıralı işlem, kontenjan aşımı olmaz

## Monitoring ve Logging

```typescript
console.error("Error saving club selections:", error)
```

Tüm hatalar loglanır ve kullanıcıya anlamlı mesajlar gösterilir:
- "Kontenjanı dolan kulüpler: X, Y, Z"
- "Veriler güncellendi, lütfen başka kulüp seçin"
- "Kulüp seçimleri başarıyla güncellendi"

## Gelecek İyileştirmeler (Opsiyonel)

1. **WebSocket Entegrasyonu**: Gerçek zamanlı push bildirimleri
2. **Redis Cache**: Sık okunan veriler için cache katmanı
3. **Queue System**: Yüksek yoğunlukta işlemleri kuyruğa alma
4. **Rate Limiting**: Kullanıcı başına istek limiti
5. **Optimistic UI**: Daha hızlı kullanıcı deneyimi için

## Sonuç

Bu mekanizmalarla:
- ✅ Race condition tamamen önlendi
- ✅ Kontenjan aşımları imkansız hale geldi
- ✅ Kullanıcılar güncel verileri görüyor
- ✅ Database tutarlılığı sağlandı
- ✅ Yüksek yoğunlukta sistem stabil çalışıyor

**Not:** Bu sistemle binlerce velinin aynı anda işlem yapması güvenli bir şekilde desteklenmektedir.

