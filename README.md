# AlaraGo — Protect. Record. Ready.

Aplikasi web progresif (PWA) untuk **Petugas Proteksi Radiasi (PPR)** rumah sakit. Menunya: Dasbor, Kalender kepatuhan, Inventaris, Kartu dosis, Pembatas dosis, Survei paparan, Arsip dokumen, dan Siap inspeksi.

## Cara kerja

- **PPR** masuk dengan akun Google. Data tersimpan di Google Drive milik PPR sendiri, di folder **AlaraGo**: spreadsheet *AlaraGo — Database*, subfolder *Berkas*, dan subfolder *MCU (terbatas)*. Izin yang diminta hanya `drive.file`, sehingga AlaraGo hanya bisa membuka berkas yang ia buat sendiri.
- **Pekerja** memakai QR pribadi + PIN. **Peninjau** memakai tautan pribadi + PIN. Keduanya tanpa akun Google. Setiap orang hanya menerima salinan terkunci (AES-256) berisi bagiannya. Kunci ada di QR/tautan dan tidak pernah dikirim ke server.
- **Tamu/inspektur** menerima tautan hanya-baca yang berakhir otomatis.
- **QR pintu** menampilkan status ruangan tanpa data pribadi.
- **Relay penjual** (`Relay.gs`, dipasang terpisah di Apps Script) menangani:
  - lisensi;
  - titipan paket terkunci;
  - rekap email bulanan (tanggal 1, ±08.00 WIB);
  - peringatan kritis;
  - Telegram;
  - jadwal untuk skrip mini Google Kalender (`KalenderMini.gs`, opsional, dipasang PPR sendiri).

## Struktur

```
index.html            ← titik masuk (root repository)
manifest.webmanifest  ← PWA
sw.js                 ← service worker
privasi.html          ← kebijakan privasi
css/style.css         ← tema "Madu"
icons/
js/config.js          ← GOOGLE_CLIENT_ID, RELAY_URL, kontak penjual
js/cloud.js           ← login Google, kripto, klien relay
js/drive.js           ← data PPR di Google Drive/Sheets
js/penerima.js        ← pekerja, peninjau, tamu, QR pintu
js/api.js · ui.js · logic.js · util.js · demo.js · app.js
js/pages/*.js         ← satu berkas per menu
js/kalender-mini.js   ← salinan KalenderMini.gs untuk ditampilkan di Pengaturan
js/vendor/qrcode.min.js (MIT, Kazuhiko Arase)
```

`Relay.gs`, `KalenderMini.gs`, dan `appsscript.json` **tidak** berada di repository ini.

## Coba tanpa memasang apa pun

Buka situsnya → **Lihat demo**. Data contoh tersimpan di browser saja.

Ikon: Lucide (ISC). Font: Nunito (Google Fonts, SIL OFL).
