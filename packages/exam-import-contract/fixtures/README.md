# Optik fixtures

| Dosya | Açıklama |
|-------|----------|
| `EYOTEK_YKS_2022_1.fmt` | Sekonic MarkView şablonu (EYOTEK YKS). 14 veri alanı: kimlik + TR/SOSYAL/MAT/FEN. |
| `sample-markview-tyt.txt` | MarkView TXT çıktısı (Yayın Denizi TYT örneği). `\`` ayırıcılı, CP1254. |

## Önemli

`sample-markview-tyt.txt` ile `EYOTEK_YKS_2022_1.fmt` **aynı form değil**. Yayın Denizi TXT’sinde kitapçık + 4 cevap bloğu daha erken indekslerde (cevaplar 9–12); EYOTEK FMT’de SINIF/ŞUBE ayrı alanlar olduğu için cevaplar 10–13’te.

Doğrulama:
- FMT parser → 120 soru, identityMap + answerSections (EYOTEK)
- TXT parser → `device-txt-v1` veya eşleşen FMT layout ile

Gerçek okutmada **aynı sınavın FMT’si** ile üretilmiş TXT kullanılmalıdır.
