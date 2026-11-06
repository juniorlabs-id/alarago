# AlaraGo 2.0: panduan pembaruan

Mulai versi ini, semua menu memakai arsitektur baru:

- Data PPR disimpan di Google Drive milik PPR sendiri.
- Pekerja dan peninjau masuk lewat QR/tautan + PIN.
- Tamu, QR pintu, rekap bulanan, dan kalender lewat relay.
- `Kode.gs` (backend lama) **tidak dipakai lagi**.

Kerjakan langkah di bawah **berurutan**. Kirim screenshot setelah setiap bagian.

---

## Bagian A: Bersihkan data uji coba (PoC) di Google Drive

Halaman uji coba kemarin membuat spreadsheet berisi data contoh (Budi, Sari, Andi, 200 baris dosis). Aplikasi baru akan menemukan spreadsheet itu dan memakainya, jadi hapus dulu.

1. Buka https://drive.google.com dengan akun PPR yang kemarin dipakai uji coba.
2. Di kotak pencarian, ketik `AlaraGo`.
3. Pilih semua hasil yang muncul: folder **AlaraGo** dan spreadsheet **AlaraGo — Database** atau sejenisnya. Klik kanan → **Pindahkan ke sampah**.

---

## Bagian B: Perbarui relay (Relay.gs)

1. Buka https://script.google.com, lalu buka proyek relay AlaraGo.
2. Klik berkas **Relay.gs** di kiri. Tekan **Ctrl+A**, lalu **Delete**.
3. Buka berkas **Relay.gs** yang dikirim bersama panduan ini. Salin semua isinya, lalu tempel ke editor. Klik ikon 💾 **Simpan**.
4. Klik **Terapkan → Kelola penerapan**, lalu ikon ✏️ (pensil).
5. Pada **Versi**, pilih **Versi baru**, lalu klik **Terapkan**.

> URL relay **tidak berubah**, jadi `js/config.js` tidak perlu diubah.

---

## Bagian C: Perbarui situs di GitHub

1. Ekstrak **alarago-frontend-2.0.zip**.
2. Buka folder hasil ekstrak, pilih **semua isinya** (Ctrl+A), lalu salin (Ctrl+C).
3. Buka folder kerja Anda:
   `C:\Users\yanua\OneDrive\Documents\Google Apps Script\WebApps\4. ProteRad\proterad-frontend`
   Tempel (Ctrl+V), lalu pilih **Ganti berkas di tujuan**.
4. Di folder kerja yang sama, **hapus**:
   - folder `poc`
   - berkas `PANDUAN-UJI-COBA.md` (bila ada)
5. Buka PowerShell di folder itu: klik address bar → ketik `powershell` → Enter.
6. Periksa isinya. Baris teratas harus memuat `css`, `icons`, `js`, dan `index.html`.
   ```powershell
   dir
   ```
7. Kirim ke GitHub, satu perintah per baris:
   ```powershell
   git add .
   git commit -m "AlaraGo 2.0: semua menu memakai Drive PPR"
   git push
   ```
   Tanda berhasil: muncul `main -> main`.
8. Tunggu 1–2 menit, lalu buka https://juniorlabs-id.github.io/alarago/ dan tekan **Ctrl+Shift+R**.
   Bila muncul "Versi baru AlaraGo tersedia", klik **Muat ulang**.

---

## Bagian D: Uji

1. **PPR:** klik **Masuk dengan Google** (akun test user), lalu isi wizard sampai selesai.
   Di Drive akan muncul folder **AlaraGo** berisi spreadsheet **AlaraGo — Database**, folder **Berkas**, dan folder **MCU (terbatas)**.
2. **Pekerja:**
   1. Di Kartu dosis, tambah satu pekerja.
   2. Buka detail pekerja, lalu klik **Buat QR akses**.
   3. Pindai QR dengan HP, buat PIN, dan centang persetujuan.
3. **Peninjau:**
   1. Buka **Pengaturan → Akses pengguna → Tambah peninjau**.
   2. Buka tautannya di perangkat lain, lalu buat PIN.
4. **Notifikasi:**
   1. Buka **Pengaturan → Notifikasi**, lalu klik **Kirim rekap uji**.
   2. Cek email masuk.
5. **Kalender (opsional):** di menu yang sama, klik **Tampilkan skrip**, lalu ikuti 4 langkahnya.

Kirim screenshot hasil setiap uji, terutama bila ada pesan merah.
