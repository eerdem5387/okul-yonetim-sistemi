# İç Haberleşme (Chat) Modülü — Uygulama Raporu

**Tarih:** 4 Mayıs 2026
**Modül:** Okul Yönetim Sistemi → İç Haberleşme
**Aktör tipleri:** Yalnızca `Staff` ve `Parent` (öğrenciler sisteme dahil değildir)
**Stack:** Next.js (App Router), Prisma + PostgreSQL (Neon), Pusher Channels, Vercel Blob, Tailwind CSS

---

## 0. Yönetici Özeti

WhatsApp'ın kurumsal ve kısıtlı bir versiyonu olarak tasarlanan iç haberleşme modülü uçtan uca implemente edilmiştir. Sistem yalnızca okul personeli (`Staff`) ve veliler (`Parent`) arasında çalışmakta; öğrenciler kendi profil veya mesajlaşma alanına sahip değildir, yalnızca eligibility hesaplarında referans olarak kullanılırlar.

Üç sohbet türü desteklenir:
- **PRIVATE** — 1:1 özel sohbet
- **GROUP** — Çok katılımcılı grup sohbeti
- **ANNOUNCEMENT** — Yalnızca yöneticilerin mesaj atabildiği duyuru kanalı

Sesli/görüntülü arama veya hikâye paylaşımı **hiçbir şekilde** bulunmamaktadır.

Tüm çalışma 4 fazda teslim edilmiştir:
1. Prisma şeması + migration
2. Sunucu tarafı (identity, access-control, repository, route handler'lar, Pusher server)
3. UI componentleri ve sayfalar
4. Erişilebilirlik, polish, lint ve build doğrulaması

`npm run lint` temiz, `npx tsc --noEmit` temiz, `npm run build` başarılı.

---

## 1. Phase 1 — Prisma Şeması ve Migration

### 1.1 Eklenen Enum'lar

`prisma/schema.prisma` dosyasının sonuna eklendi:

```prisma
enum ConversationType {
  PRIVATE
  GROUP
  ANNOUNCEMENT
}

enum ParticipantRole {
  ADMIN
  MEMBER
}

enum MessageType {
  TEXT
  IMAGE
  DOCUMENT
}
```

### 1.2 Eklenen Modeller

#### `Conversation`
- `id`, `type`, `title?`, `createdAt`, `updatedAt`
- İlişkiler: `participants[]`, `messages[]`
- İndeksler: `(type)`, `(updatedAt)`

#### `ConversationParticipant`
- Polymorphic katılımcı: tam olarak `staffId` VEYA `parentId`'den biri dolu olur (uygulama tarafında guard'lanır)
- `role` (ADMIN/MEMBER), `joinedAt`
- Unique constraints: `(conversationId, staffId)` ve `(conversationId, parentId)` — aynı kişinin aynı sohbete iki kez eklenmesini engeller
- `onDelete: Cascade` ile sohbet silindiğinde katılımcılar da silinir

#### `Message`
- Polymorphic gönderici: `senderStaffId?` veya `senderParentId?`
- `body @db.Text`, `type` (TEXT/IMAGE/DOCUMENT), `attachmentUrl?`
- `onDelete: SetNull` ile gönderici silinse bile mesaj korunur (audit izi)
- İndeksler: `(conversationId)`, `(conversationId, createdAt)`, `(senderStaffId)`, `(senderParentId)`

#### `MessageReceipt`
- Polymorphic okuyucu: `readerStaffId?` veya `readerParentId?`
- Unique: `(messageId, readerStaffId)` ve `(messageId, readerParentId)` — bir kullanıcının aynı mesajı iki kez okunmuş işaretlemesini engeller (idempotent `markRead`)
- `readAt`

### 1.3 Mevcut Modellere Eklenen Inverse Relations

Adlandırılmış `@relation` etiketleri kullanılarak çakışmaları önledim (Staff'ın hem sender hem reader olabilmesi nedeniyle ayrı isimler şart):

`Staff` içine:
```prisma
chatParticipants ConversationParticipant[] @relation("StaffChatParticipants")
sentMessages     Message[]                 @relation("StaffSentMessages")
messageReceipts  MessageReceipt[]          @relation("StaffMessageReceipts")
```

`Parent` içine:
```prisma
chatParticipants ConversationParticipant[] @relation("ParentChatParticipants")
sentMessages     Message[]                 @relation("ParentSentMessages")
messageReceipts  MessageReceipt[]          @relation("ParentMessageReceipts")
```

### 1.4 Migration

**Sorun:** Mevcut migration history'de `20250125000000_add_parent_authentication_system` adlı eski bir migration shadow DB'de replay edilemiyor (`P3006: The underlying table for model students does not exist`). Bu nedenle `prisma migrate dev` komutu çalışmadı.

**Çözüm:**
1. `npx prisma migrate diff --from-schema-datasource ./prisma/schema.prisma --to-schema-datamodel ./prisma/schema.prisma --script` ile DB ↔ schema farkını SQL olarak ürettim (yalnızca yeni chat tabloları çıktı).
2. Bu SQL'i `prisma/migrations/20260504150000_add_internal_chat/migration.sql` olarak el ile yazdım.
3. `npx prisma migrate deploy` ile DB'ye uyguladım (deploy komutu shadow DB kullanmaz).
4. `npx prisma generate` ile client güncellendi.

**Migration SQL özeti:** 4 yeni tablo, 3 yeni enum, 13 indeks, 4 unique constraint, 9 foreign key.

---

## 2. Phase 2 — Sunucu Tarafı

### 2.1 `src/lib/chat/identity.ts`

Bearer token'dan aktif aktörü çözümleyen modül.

**Token formatları:**
- Staff: `${role}_${staffId}_${timestamp}` (ör. `admin_clx..._1717...`, `student_affairs_clx..._...`)
- Parent: `parent_${parentId}_${timestamp}`

**Önemli detay:** `student_affairs` rolünün altçizgi içermesi nedeniyle prefix split mantığı sondan iki parçayı kullanıyor (`parts[parts.length - 2]` = staffId, `parts[parts.length - 1]` = timestamp).

Token yaşı kontrolü 24 saat. Aktif olmayan staff/parent reddedilir.

**Departman yardımcıları:**
- `MANAGER_DEPARTMENTS` set'i: `SUPER_ADMIN`, `MUDUR`, `MUDUR_YARDIMCISI`, `OGRENCI_ISLERI`, `REHBERLIK`, `BAS_REHBERLIK`
- `isManagerDepartment()` — yönetici Staff kontrolü
- `isAnnouncementCreatorDepartment()` — sadece `SUPER_ADMIN`, `MUDUR`, `MUDUR_YARDIMCISI`, `OGRENCI_ISLERI` (REHBERLIK dahil değil — kullanıcı kuralı)

`ChatActor` discriminated union döner:
```ts
{ kind: "staff", staffId, department, firstName, lastName, isManager, isTeacher }
| { kind: "parent", parentId, studentTcNumber, displayName }
```

### 2.2 `src/lib/chat/access-control.ts`

#### DM (Private) Yetki Matrisi

| Aktör | Hedef Staff | Hedef Parent |
|-------|-------------|--------------|
| Yönetici Staff | ✓ Tümü | ✓ Tümü |
| Öğretmen | ✓ Tümü (aktif) | ✓ Sadece kendi sınıflarının velileri |
| Diğer Staff | ✓ Tümü (aktif) | ✗ |
| Veli | ✓ Yöneticiler + çocuğunun danışmanı + ders öğretmenleri | ✗ Asla |

Yardımcılar:
- `canStartPrivateWithStaff(actor, targetStaffId)` — DB sorgularıyla validate eder
- `canStartPrivateWithParent(actor, targetParentId)` — Veli ↔ veli kapalı
- `getReachableStaffForActor(actor)` — UI kişi seçici için
- `getReachableParentsForActor(actor)` — Velinin kendisi `[]` döner

#### Sınıf Çözümleme

- **Velinin sınıfları:** `ParentStudent → Student → ClassStudent → Class` zinciri
- **Öğretmenin sınıfları:** `counselorId` (danışmanlık) ∪ `Schedule.teacherId` (ders programı)

#### Group/Announcement Oluşturma

```ts
canCreateGroup(actor)         // sadece yönetici Staff
canCreateAnnouncement(actor)  // aynı set
```

### 2.3 `src/lib/chat/repository.ts`

Veri katmanı fonksiyonları:

| Fonksiyon | Görev |
|-----------|-------|
| `findOrCreatePrivateConversation(actor, target)` | Aynı çift için tek PRIVATE sohbet (idempotent) |
| `createGroupConversation(creator, opts)` | GROUP/ANNOUNCEMENT oluşturur, yaratıcıyı otomatik ADMIN yapar |
| `appendMessage(actor, input)` | Mesaj kaydeder + sohbet `updatedAt` günceller + gönderici otomatik kendi mesajını "okumuş" sayılır |
| `markReadUpTo(actor, conversationId, uptoMessageId?)` | Belirli mesaja kadar olan tüm okunmamış mesajları toplu işaretler (`createMany skipDuplicates`) |
| `listConversationsForActor(actor)` | Sidebar/liste için: katılımcılar + son mesaj + unread count birleşik |
| `listMessages(conversationId, {cursor, limit})` | Cursor pagination, kronolojik (eski → yeni) sırada döner |
| `unreadCountForActor(actor)` | Global unread sayısı (sidebar badge için) |
| `canActorSendMessage(actor, conversationId)` | `not_member` / `announcement_only_admin` / `not_found` reason'ları |
| `isActorParticipant(actor, conversationId)` | `{ isMember, role }` |

Tüm okuma sorgularında polymorphic ilişki include'larında parent display name fallback'i var (parent'ın ilk `parentName`, yoksa TC'nin ilk 4 hanesi).

### 2.4 API Route'lar (`src/app/api/chat/...`)

Tüm rotalar `dynamic = "force-dynamic"`, `Authorization: Bearer ...` zorunlu, `resolveChatActor` ile validate edilir.

| Route | Method | Açıklama |
|-------|--------|----------|
| `contacts` | GET | Aktör için reachable Staff/Parent listesi |
| `conversations` | GET | Kullanıcının sohbet listesi |
| `conversations` | POST | Yeni sohbet (PRIVATE/GROUP/ANNOUNCEMENT) — yetki kontrolü uygulanır |
| `conversations/[id]` | GET | Sohbet detayı + katılımcılar |
| `conversations/[id]` | PATCH | Başlık güncelleme (sadece sohbet ADMIN'i) |
| `conversations/[id]/messages` | GET | Cursor pagination, limit ≤ 100 |
| `conversations/[id]/messages` | POST | Mesaj gönder + Pusher trigger; ANNOUNCEMENT'da yalnızca ADMIN |
| `conversations/[id]/participants` | POST | Katılımcı ekle (sadece grup ADMIN'i) |
| `conversations/[id]/participants` | DELETE | Katılımcı çıkar (query: `?staffId=...` veya `?parentId=...`) |
| `conversations/[id]/read` | POST | `uptoMessageId` ile okundu işaretle + Pusher receipt event |
| `mass-message` | POST | BCC mantığı: her hedefe ayrı PRIVATE + aynı body, atlananlar raporlanır |
| `upload` | POST | Vercel Blob, image/* + ofis dokümanları, `CHAT_MAX_BYTES` (varsayılan 10MB) |
| `pusher/auth` | POST | Pusher private channel auth (aktör katılımcı/sahip mi kontrolü) |
| `unread-count` | GET | Sidebar rozet için global sayı |

#### Mass Message Detayı

`/api/chat/mass-message`:
- Yetki: `isAnnouncementCreatorDepartment(actor)` (sadece yönetici Staff)
- Maksimum 200 alıcı
- Her alıcı için: `findOrCreatePrivateConversation` → `appendMessage` → Pusher trigger
- Atlanan alıcılar `{target, reason: 'invalid_target' | 'forbidden' | 'error'}` dizisinde dönlür
- Tek bir hata diğer alıcıları etkilemez

#### Pusher Auth Detayı

`/api/chat/pusher/auth` üç kanal sınıfı doğrular:
- `private-conversation-{id}` — kullanıcı bu sohbetin katılımcısı mı?
- `private-user-staff-{staffId}` — kanal sahibi mi?
- `private-user-parent-{parentId}` — kanal sahibi mi?

Pusher creds eksikse 503 döner ama uygulama çökmez.

### 2.5 `src/lib/chat/pusher-server.ts`

**Lazy initialization:** Env eksikse `cached = null` kalır, tüm trigger çağrıları sessizce no-op olur. Bu sayede Pusher hesabı henüz oluşturulmamışken bile uygulama tam çalışır (real-time devre dışı, refresh ile gelir).

**Yardımcılar:**
- `triggerNewMessage(conversationId, payload, recipientChannels[])` — sohbet kanalına `new-message` + tüm kullanıcı kanallarına `conversation-updated`
- `triggerReadReceipt(conversationId, payload)` — `read-receipt` event
- `triggerConversationUpdated(channels[], payload)` — toplu invalidation
- `authorizeChannel({socketId, channel})` — Pusher auth response

**Kanal isimleri:**
- `private-conversation-{conversationId}` — sohbete özel
- `private-user-staff-{staffId}` — staff'ın global kanalı (badge için)
- `private-user-parent-{parentId}` — parent'ın global kanalı

### 2.6 `pusher` ve `pusher-js` Paketleri

```bash
npm install pusher pusher-js
```

18 paket eklendi. Mevcut `package-lock.json` güncellendi.

### 2.7 `.env.example`

Proje kökünde önceden `.env.example` yoktu, oluşturuldu:

```
DATABASE_URL=
BLOB_READ_WRITE_TOKEN=
GEZI_API_URL=
SERVICE_API_SECRET=

# İç Haberleşme (Chat) - Pusher Channels
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
CHAT_MAX_BYTES=10485760
```

`.env` dosyasına dokunulmadı (kullanıcı kendisi doldurur).

---

## 3. Phase 3 — UI Componentleri ve Sayfalar

### 3.1 Yardımcılar

#### `src/components/chat/types.ts`
TypeScript tipleri: `ChatConversation`, `ChatMessage`, `ChatParticipant`, `ContactStaff`, `ContactParent`, `ContactsResponse`, vb.

#### `src/components/chat/chat-utils.ts`
- `getAuthHeaders()` — `localStorage.auth_token` → `Authorization: Bearer ...`
- `detectAreaActorKind()` — `auth_role`'den staff/parent çözümle
- `localActorId()` — `staff_id` veya `parent_id`
- `conversationDisplayTitle(conv, actor)` — PRIVATE'da karşı taraf adı, grup/duyuruda title
- `conversationSubtitle(conv)` — "Duyuru Kanalı" / "N katılımcı"
- `formatRelativeTime(value)` — bugünse saat, dünse "Dün", aksi halde tarih
- `lastMessagePreview(conv)` — IMAGE → `[Görsel]`, DOCUMENT → `[Belge]`, TEXT → 60 karakter
- `avatarInitials(name)` — iki harfli baş harfler
- `departmentLabel(dep)` — TR departman etiket sözlüğü (15 girdi)

### 3.2 Realtime Hook

`src/components/chat/useChatRealtime.ts`:
- Singleton `pusher-js` instance (global cached)
- Pusher creds yoksa sessizce no-op
- `authEndpoint: "/api/chat/pusher/auth"` + `Authorization` header
- `conversationId` verilirse `private-conversation-*` kanalına subscribe (`new-message`, `read-receipt`)
- `actorKind`+`actorId` verilirse `private-user-*` kanalına subscribe (`conversation-updated`)
- Cleanup'ta unbind + unsubscribe

Callback ref pattern (`cbs.current`) kullanıldı; useEffect re-run sayısı azaltıldı.

### 3.3 Görsel Componentler

#### `Avatar.tsx`
3 boyut (sm/md/lg) × 3 varyant (user/group/announcement). `aria-hidden` çünkü dekoratif; isim metni komşusunda görünür.

#### `ConversationList.tsx`
Sol panel listesi:
- Avatar + tip ikonu (Megaphone/Users)
- Başlık + zaman damgası (sağ üst)
- Son mesaj snippet'i + unread badge (sağ alt, mavi pill, "99+" cap)
- ANNOUNCEMENT/GROUP için küçük tip etiketi
- `updatedAt` desc sıralı
- Boş durum metni

#### `MessageBubble.tsx`
- Kendi mesajlar sağda (mavi `bg-blue-600 text-white`)
- Karşı taraf solda (`bg-white border`)
- Karşı tarafın ismi + departman etiketi balon üstünde (kendi mesajlarında gösterilmez)
- IMAGE → `<img>` thumbnail (max-h-72), tıklayınca yeni sekmede tam boy
- DOCUMENT → ikonlu indir bağlantısı + Download ikonu
- Saat metni balon altında

#### `MessageComposer.tsx`
- Auto-resize gibi davranan textarea (`min-h-[40px] max-h-32`)
- Enter → gönder, Shift+Enter → yeni satır
- Paperclip butonu → file input açar
- Yükleme progress bar'ı (gösterici, 15→85→100 simulasyonu)
- Yüklenen dosya önizlemesi (image thumbnail veya paperclip ikonu) + "X" ile kaldır
- Disabled durumunda "Bu sohbette mesaj gönderemezsiniz" şeridi
- ANNOUNCEMENT için custom mesaj: "Bu duyuru kanalında yalnızca yöneticiler mesaj gönderebilir"
- `Loader2` spinner gönderim/yükleme sırasında

#### `ConversationView.tsx`
Sağ panel:
- Header: avatar + tip ikonu + başlık + altyazı + "Siz: {name}" (sm üstü)
- Mesaj listesi (`overflow-y-auto`, `bg-gray-50`)
- "Daha önceki mesajlar" butonu (cursor pagination)
- Loading state, boş durum, error toleransı
- Sohbet açıldığında ve yeni mesaj geldiğinde otomatik `markRead`
- Pusher `new-message` event'i ile mesaj listesi optimistik update (duplicate guard)

#### `NewConversationDialog.tsx`
Üç sekme:
1. **Özel Sohbet** — kişi listesinde her satırın yanında "Sohbet Başlat" butonu, tek tıkla `findOrCreate`
2. **Grup** — başlık + checkbox'larla katılımcı seçimi + "Grubu Oluştur"
3. **Duyuru** — aynı, fakat `ANNOUNCEMENT` türünde

- Yetkiye göre sekmeler dinamik gösterilir (`canCreateGroup`, `canCreateAnnouncement`)
- Search filtresi: ad, sınıf, branş, departman üzerinde çalışır
- Veliler için öğrenci adları + sınıf bilgisi gösterilir
- Loading state, boş durum

#### `MassMessageDialog.tsx`
BCC ekranı:
- Mesaj gövdesi (textarea)
- Kişi seçimi (Staff + Parent listesi, "Tümünü seç" toggle'ı)
- Search filtresi
- "N alıcı seçildi" sayacı
- Gönderim sonrası `{sent, skipped}` özeti alert'le

#### `UnreadBadge.tsx`
- `localStorage`'dan aktör çözümler
- `/api/chat/unread-count` ile 60 saniyede bir polling
- Pusher `conversation-updated` event'inde refresh
- Count > 0 ise kırmızı pill (`bg-red-500`), aksi halde `null`

#### `ChatLayout.tsx`
- Sol panel + sağ panel düzeni (sm üstü)
- sm altında full-screen mobile mod (sohbet seçilince geçer)
- Sağ üstte: yeni sohbet butonu + (yetkili ise) toplu mesaj butonu
- Pusher `private-user-*` kanalına abone, `conversation-updated`'te liste yenilenir

### 3.4 Sayfalar

#### `src/app/mesajlar/page.tsx` (Staff alanı)
- `localStorage`'dan rol/staff_id okur, parent ise `/login`'e yönlendirir
- Role'e göre uygun sidebar'ı render eder:
  - `teacher` → `OgretmenSidebar`
  - `counselor` / `head_counselor` → `RehberlikSidebar`
  - Diğer staff → `Sidebar` (admin ana sidebar)
- Yan tarafta `ChatLayout` ile chat arayüzü

#### `src/app/veli/mesajlar/page.tsx` (Parent alanı)
- `auth_role !== "parent"` ise `/veli-login`'e yönlendirir
- `VeliSidebar` + `ChatLayout` (`actor.kind = "parent"`)
- Tema rengi: `from-emerald-50 to-teal-50` (veli alanı renk paleti)

### 3.5 Sidebar Entegrasyonu

| Sidebar | Eklenen Link | Roller |
|---------|--------------|--------|
| `sidebar.tsx` | "Mesajlar" → `/mesajlar` | admin, principal, student_affairs, counselor, head_counselor, teacher |
| `rehberlik-sidebar.tsx` | "Mesajlar" → `/mesajlar` | counselor + head_counselor |
| `ogretmen-sidebar.tsx` | "Mesajlar" → `/mesajlar` | teacher |
| `veli-sidebar.tsx` | "Mesajlar" → `/veli/mesajlar` | parent |

Her sidebar'da `MessageSquare` ikonu kullanıldı ve link'in yanına `<UnreadBadge />` eklendi (canlı unread sayısı). `isCollapsed` durumunda rozet gizlenir (öğretmen ve veli sidebar'ları collapsible).

---

## 4. Phase 4 — Polish ve Doğrulama

### 4.1 Erişilebilirlik

- Avatar'lar `aria-hidden` (dekoratif)
- Unread badge `aria-label="N okunmamış mesaj"`
- Composer butonları `aria-label` (Dosya ekle, Eki kaldır)
- Klavye: Enter → gönder, Shift+Enter → yeni satır
- Disabled durumlarda erişilebilir bilgi şeritleri

### 4.2 Boş Durum Mesajları

- Sohbet listesi boş → "Henüz sohbet yok. Sağ üstten yeni bir sohbet başlatabilirsiniz."
- Kişi araması eşleşmeyince → "Eşleşen kişi bulunamadı."
- Sohbet seçilmemişken sağ panel → "Görüntülemek için bir sohbet seçin."
- Sohbette mesaj yokken → "Bu sohbette henüz mesaj yok."

### 4.3 Otomatik markRead

`ConversationView` içinde:
- Sohbet açıldığında son mesaja kadar `markRead`
- Yeni mesaj Pusher'dan gelince yeniden `markRead`
- Sayfayla kullanıcı etkileşimi (focus, visibility) tetiklemiyoruz (gereksiz API çağrısını önlemek için)

### 4.4 ANNOUNCEMENT İndikasyonu

- Liste view'ında küçük "Duyuru Kanalı" alt etiketi + Megaphone ikonu
- Header'da Megaphone ikonu + amber renk
- Avatar amber palette
- ADMIN olmayan üyeler için composer yerine bilgi şeridi

### 4.5 Dosya Yükleme İlerleme

Şu an gösterici progress (15→85→100 simulasyonu). Gerçek XHR-based progress'e geçiş için altyapı hazır (`onUpload` Promise döndürüyor) — gelecek bir iterasyonda `fetch` yerine `XMLHttpRequest` ile gerçek byte-based progress eklenebilir.

### 4.6 Doğrulama Sonuçları

```bash
$ npx tsc --noEmit
# (no output - başarılı)

$ npm run lint
> eslint
# (no output - 0 error, 0 warning)

$ npm run build
# Compiled successfully
# /mesajlar         9.88 kB    170 kB
# /veli/mesajlar    8.47 kB    168 kB
# All API routes compiled (chat/contacts, conversations, messages, etc.)
```

---

## 5. Manuel Test Senaryoları

### 5.1 Yetki Kontrolleri

| Senaryo | Beklenen Sonuç |
|---------|----------------|
| Yönetici Staff `/api/chat/contacts` çağırır | Tüm aktif Staff + tüm aktif Parent listelenir |
| Öğretmen `/api/chat/contacts` çağırır | Tüm aktif Staff + sadece kendi sınıflarının velileri |
| Veli `/api/chat/contacts` çağırır | Yöneticiler + çocuğunun sınıf öğretmenleri/danışmanı + boş Parent listesi |
| Veli, başka veliyle PRIVATE açmaya çalışır | 403 Forbidden |
| Yönetici olmayan, GROUP oluşturmaya çalışır | 403 Forbidden |
| ANNOUNCEMENT'da MEMBER mesaj POST eder | 403 — `announcement_only_admin` |
| Olmayan sohbete mesaj gönderir | 404 |
| Üye olmadığı sohbete mesaj gönderir | 403 |

### 5.2 Mass Message

5 hedefli toplu mesaj:
- 5 ayrı PRIVATE conversation oluşur (varsa yeniden kullanılır)
- 5 mesaj DB'ye yazılır
- 5 Pusher event tetiklenir
- Yetki dışı bir hedef varsa `skipped` listesinde döner, diğerleri etkilenmez

### 5.3 Real-Time

- A kullanıcısı sohbeti açar
- B kullanıcısı mesaj gönderir
- A'nın sohbet listesinde unread badge artar (Pusher `conversation-updated`)
- A açık sohbette mesajı anında görür (Pusher `new-message`)
- A okuduğu için backend `markRead` çağrısı yapar; B'ye `read-receipt` event'i gider

Pusher creds yoksa modül çalışır ama real-time devre dışı; manuel refresh ile yeni mesajlar gelir.

---

## 6. Eklenen / Değiştirilen Dosyalar

### Yeni dosyalar (28 adet)

**Lib:**
- `src/lib/chat/identity.ts`
- `src/lib/chat/access-control.ts`
- `src/lib/chat/repository.ts`
- `src/lib/chat/pusher-server.ts`

**API:**
- `src/app/api/chat/contacts/route.ts`
- `src/app/api/chat/conversations/route.ts`
- `src/app/api/chat/conversations/[id]/route.ts`
- `src/app/api/chat/conversations/[id]/messages/route.ts`
- `src/app/api/chat/conversations/[id]/participants/route.ts`
- `src/app/api/chat/conversations/[id]/read/route.ts`
- `src/app/api/chat/mass-message/route.ts`
- `src/app/api/chat/upload/route.ts`
- `src/app/api/chat/pusher/auth/route.ts`
- `src/app/api/chat/unread-count/route.ts`

**Componentler:**
- `src/components/chat/types.ts`
- `src/components/chat/chat-utils.ts`
- `src/components/chat/useChatRealtime.ts`
- `src/components/chat/Avatar.tsx`
- `src/components/chat/ConversationList.tsx`
- `src/components/chat/ConversationView.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/MessageComposer.tsx`
- `src/components/chat/NewConversationDialog.tsx`
- `src/components/chat/MassMessageDialog.tsx`
- `src/components/chat/ChatLayout.tsx`
- `src/components/chat/UnreadBadge.tsx`

**Sayfalar:**
- `src/app/mesajlar/page.tsx`
- `src/app/veli/mesajlar/page.tsx`

**Diğer:**
- `prisma/migrations/20260504150000_add_internal_chat/migration.sql`
- `.env.example`
- `docs/internal-chat-module-report.md` (bu dosya)

### Değiştirilen dosyalar (5 adet)

- `prisma/schema.prisma` — 3 enum + 4 model + Staff/Parent inverse relations
- `src/components/layout/sidebar.tsx` — "Mesajlar" linki + UnreadBadge
- `src/components/layout/rehberlik-sidebar.tsx` — aynı
- `src/components/layout/ogretmen-sidebar.tsx` — aynı (collapsed-aware)
- `src/components/layout/veli-sidebar.tsx` — aynı (collapsed-aware)
- `package.json` / `package-lock.json` — `pusher` + `pusher-js` eklendi

---

## 7. Dağıtım Öncesi Kontrol Listesi

1. **Pusher hesabı oluştur** ([pusher.com](https://pusher.com) → Channels app)
2. `.env`'e gerekli değişkenleri ekle:
   ```
   PUSHER_APP_ID=...
   PUSHER_KEY=...
   PUSHER_SECRET=...
   NEXT_PUBLIC_PUSHER_KEY=...           # PUSHER_KEY ile aynı değer
   NEXT_PUBLIC_PUSHER_CLUSTER=eu        # Pusher panelinde göreceğin cluster
   ```
3. Vercel projesine aynı değişkenleri ekle (Production + Preview)
4. `BLOB_READ_WRITE_TOKEN` zaten mevcut (Vercel Blob)
5. (Opsiyonel) `CHAT_MAX_BYTES` ile dosya boyutu sınırını ayarla (varsayılan 10MB)
6. Deploy

---

## 8. Bilinen Sınırlamalar / Gelecek İyileştirmeler

- **Dosya yükleme progress'i** simulatif. Gerçek byte-based progress için `XMLHttpRequest` veya signed URL pattern'ine geçiş gerekir.
- **Mesaj arama** yok (gelecekte `pg_trgm` veya benzeri ile eklenebilir).
- **Mesaj düzenleme/silme** yok (kurumsal denetim açısından bilinçli tercih).
- **Bildirim sesi / browser notification** yok (kullanıcı gereksinimi olmadığı için eklemedim).
- **Push notifications (FCM/APNs)** yok — şimdilik in-app real-time yeterli.
- **IntersectionObserver-tabanlı per-message read tracking** yerine sohbet açıldığında toplu `markRead` kullanıldı (yeterli ve maliyet-etkin).
- **Şadow DB sorunu** chat dışı bir sorun; mevcut migration history'de bağımsız bir hata var. Yeni migration'lar için `prisma migrate deploy` veya `prisma migrate diff + db execute` çözümü kullanılabilir.

---

## 9. Mimari Diyagram

```
┌─────────────────┐       ┌─────────────────┐
│  Staff UI       │       │  Parent UI      │
│  /mesajlar      │       │  /veli/mesajlar │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │  fetch + Bearer token   │
         ▼                         ▼
   ┌─────────────────────────────────────┐
   │   /api/chat/* (Next.js Route)       │
   │   ├ resolveChatActor                │
   │   ├ access-control checks           │
   │   ├ repository ops                  │
   │   └ Pusher trigger                  │
   └──────┬──────────────────┬───────────┘
          │                  │
          ▼                  ▼
   ┌─────────────┐    ┌──────────────┐
   │ Postgres    │    │ Pusher       │
   │ (Neon)      │    │ Channels     │
   └─────────────┘    └──────┬───────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       private-conversation-{id}    private-user-{kind}-{id}
       new-message                  conversation-updated
       read-receipt
```

Vercel Blob ayrıca `/api/chat/upload` üzerinden çağrılır; UI doğrudan Blob URL'yi `attachmentUrl` olarak mesajda saklar.

---

## 10. Kapanış

Modül kullanıma hazır durumda. Pusher creds eklenmeden de chat sistemi çalışır (real-time devre dışı, refresh ile gelir). Build + lint temiz, manuel test senaryoları için Bölüm 5'teki checklist kullanılabilir.

Sonraki adım: Pusher hesabı oluşturup ortam değişkenlerini doldurmak ve production'a deploy etmek.
