# AlaraGo — Protect. Record. Ready.

Aplikasi web progresif (PWA) untuk **Petugas Proteksi Radiasi** rumah sakit. Menu utamanya:

- Dasbor
- Kalender Kepatuhan
- Inventaris
- Kartu Dosis
- Pembatas Dosis (Q3 interpolasi, mengikuti Pedoman Teknis Rev. 1 2021)
- Survei Paparan (tabel LHI + denah interaktif)
- Arsip Dokumen
- Siap Inspeksi (paket 8 bagian LHI, tautan peninjau tamu, ZIP/PDF)

## Struktur

```
index.html            ← titik masuk (GitHub Pages: root repository)
manifest.webmanifest  ← PWA
sw.js                 ← service worker (app shell offline)
css/style.css         ← sistem desain "Hazard Blueprint"
icons/                ← ikon aplikasi
js/config.js          ← ISI: GOOGLE_CLIENT_ID, kontak penjual
js/util.js · logic.js · api.js · ui.js · demo.js · app.js
js/pages/*.js         ← satu berkas per menu
js/vendor/qrcode.min.js (MIT, Kazuhiko Arase)
```

Backend (`Kode.gs`, `appsscript.json`) dan server lisensi (`LisensiServer.gs`) **tidak** berada di repository ini. Keduanya dipasang di Google Apps Script. Lihat **PANDUAN-INSTALASI.md**.

## Coba tanpa memasang apa pun

Buka situsnya → **Lihat demo**. Data contoh tersimpan di browser saja. Gunakan pengalih peran (PPR / Peninjau / Pekerja) di banner atas.

## Kinerja

- Halaman langsung tampil dari cache lokal, lalu disegarkan di latar. Server membalas `notModified` bila data tidak berubah.
- Penyimpanan bersifat optimistis: perubahan langsung tampil, lalu dikirim berkelompok (batch). Saat offline, perubahan masuk antrean dan dikirim ulang otomatis.
- Server memakai CacheService berversi dan LockService untuk penulisan.

Ikon: Lucide (ISC). Font: Barlow Semi Condensed, Inter, JetBrains Mono (Google Fonts, SIL OFL).
