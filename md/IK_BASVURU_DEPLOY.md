# İK Başvuru Entegrasyonu — Deploy

## Ortam değişkenleri

### okul-yonetim-sistemi (Vercel)

```env
HR_WEBHOOK_SECRET=<ik projesi ile aynı gizli anahtar>
```

### ik-leventokullari (Vercel)

```env
YONETIM_WEBHOOK_URL=https://yonetim.leventokullari.com/api/webhook/ik-basvuru
HR_WEBHOOK_SECRET=<yukarıdaki ile aynı>
BLOB_READ_WRITE_TOKEN=<Vercel Blob token>
```

## Migration

```bash
npx prisma migrate deploy
```

Migration: `20260601120000_add_hr_job_applications`

## Panel

- URL: `/ik-basvurular`
- Yetki modülü: `hr_recruitment` (view, edit, delete, export)

## Webhook

- `POST /api/webhook/ik-basvuru`
- Header: `X-Webhook-Secret`, `X-Webhook-Source: ik-leventokullari`

## Sorun giderme (form 400 / 502)

| Belirti | Olası neden | Çözüm |
|--------|-------------|--------|
| `ik.../api/basvuru` **400** | Form doğrulama (telefon, doğum yılı, kısmi referans, CV) | Modalda alan adlı hata mesajlarına bakın |
| `ik.../api/basvuru` **502** | Webhook başarısız (yonetim) | Aşağıdaki kontrol listesi |
| Webhook **401** | `HR_WEBHOOK_SECRET` iki projede farklı | Vercel env’leri aynı değere güncelleyin, redeploy |
| Webhook **400** Invalid references | Eski yonetim deploy (min. 2 referans) | **okul-yonetim-sistemi** güncel kodu deploy edin |
| Webhook **503** / **500** | Migration çalışmamış | `npx prisma migrate deploy` (production DB) |

**502 için zorunlu:** `okul-yonetim-sistemi` production’da güncel webhook + `20260601120000_add_hr_job_applications` migration uygulanmış olmalı.
