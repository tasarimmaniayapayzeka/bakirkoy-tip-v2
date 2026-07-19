# Özel Avrupa Tıp Merkezi — DEMO 2 (Lacivert + Bakır)

Bakırköy tıp merkezi projesi için **ikinci tasarım konsepti**. Demo 1'in
(petrol yeşili + altın, `bakirkoy-tip-merkezi-web`) içerik iskeletini kullanır;
görsel dil tamamen farklıdır.

## Konsept C: Lacivert + Bakır
- Renkler: lacivert `#0A1C33` (kurumsal güven) + bakır `#A85B2A` (premium vurgu)
- Tipografi: **Lora** (serif başlıklar) + **Inter** (gövde) — Google Fonts CDN
- Görsel dil: keskin köşeler, hairline çizgiler, lattice (kafes) ızgaralar,
  numaralı bölümler, bakır ofset çerçeveli görseller
- WCAG 2.2 AA kontrast, 44px dokunma hedefleri, mobil sabit CTA bar

## Çalıştırma
```
node server.js   →  http://localhost:7950
```

## Kapsam (çekirdek 18 sayfa)
index, bolumler (+kardiyoloji, +kadın hastalıkları detayları), hekimler
(branş filtreli, 12 hekim), 2 hekim profili (Physician schema), randevu
(demo form), sağlık raporları, sağlık rehberi (+tansiyon makalesi,
MedicalWebPage+FAQ schema), tahlil sonuçları (e-Nabız), anlaşmalı kurumlar,
hakkımızda, iletişim, hasta hakları, KVKK, 404.

Müşteri bu konsepti seçerse 50 sayfaya genişletilir (Demo 1 kapsam aynası).

## Notlar
- Tüm içerik **temsilidir** (kurum adı, hekimler, iletişim, görseller).
- `noindex` + `robots.txt Disallow` bilinçlidir; gerçek yayında kaldırılır.
- Mevzuat (12.11.2025/33075): fiyat, hasta yorumu, kampanya YOK; footer'da
  künye (mesul müdür + editör + son güncelleme) her sayfada var.
- Görseller Demo 1 ile ortak (AI üretimi, Higgsfield).
