# Panduan Uji Coba — Arsitektur Baru ProteRad

Tujuan uji coba: membuktikan di akun Google **sungguhan** bahwa ProteRad bisa berjalan **tanpa backend di akun PPR**.

```
Aplikasi (GitHub Pages)
   ├─(izin drive.file)→ Sheets & Drive milik PPR        ← data lengkap RS
   └──────────────────→ Relay milik Mas Bro (Relay.gs)  ← paket terenkripsi, jadwal, rekap bulanan
Skrip mini Kalender (opsional, di akun PPR) → pop-up Google Kalender pukul 08.00
```

## Isi paket

| Berkas | Untuk | Dipasang di |
|---|---|---|
| `proterad-frontend.zip` | Aplikasi + halaman uji coba di folder `poc/` | GitHub Pages (seperti sebelumnya) |
| `Relay.gs` + `appsscript-relay.json` | Backend tunggal milik penjual | Apps Script **akun Mas Bro** |
| `KalenderMini.gs` | Pengingat pop-up Kalender (opsional) | Apps Script **akun PPR** |

> Untuk Mas Bro, langkah A dan B hanya dikerjakan **sekali**. Untuk PPR, cukup login. Skrip mini Kalender hanya dipasang bila PPR menginginkan pop-up.

---

## A. Google Cloud — 5 menit (penjual, sekali)

Gunakan project dan **OAuth Client ID yang sama** seperti sebelumnya.

1. **APIs & Services → Library** → aktifkan **Google Drive API** dan **Google Sheets API**. Tanpa ini, aplikasi akan ditolak saat membaca atau menulis Drive.
2. **OAuth consent screen → Data access → Add or remove scopes**:
   - Centang **`.../auth/drive.file`**. Pastikan tertulis *non-sensitive*.
   - Tambahkan juga `openid`, `email`, dan `profile`.
   - **Jangan** menambahkan izin Kalender atau Gmail.
3. **Audience / Publishing status** → **In production** (Publish app).
4. **Credentials → Client ID** → Authorized JavaScript origins tetap `https://juniorlabs-id.github.io`.

## B. Relay — 10 menit (penjual, sekali)

1. Masuk ke **akun Google Mas Bro** → buka **https://script.new** → beri nama `ProteRad Relay`.
2. **⚙️ Project Settings** → centang *Show "appsscript.json"* → tempel isi berkas **`appsscript-relay.json`**.
3. Tempel seluruh isi **`Relay.gs`** ke `Code.gs`. Di bagian atas berkas, isi:
   - `CLIENT_ID` dengan Client ID yang sama dengan `js/config.js`;
   - `APP_URL` dengan `https://juniorlabs-id.github.io/proterad/`.
4. Pilih fungsi **`setupRelay`** → **Run** → izinkan akses.
   - Folder **📡 ProteRad Relay** dan sheet **Akun & Lisensi** akan dibuat.
   - Pemicu harian ±08.00 WIB juga dipasang otomatis.
5. **Deploy → New deployment → Web app** → Execute as **Me** · Who has access **Anyone** → salin URL `/exec`.
6. **Telegram (opsional):**
   - Buat bot lewat **@BotFather**, lalu salin token-nya.
   - Di **Project Settings → Script Properties**, tambahkan `TG_TOKEN` berisi token itu.
   - Jalankan **`pasangTelegram`**.
7. Isi URL relay ke `js/config.js` → `RELAY_URL: '…/exec'`. Untuk uji coba, URL ini juga bisa langsung ditempel di halaman uji coba.

**Mengelola lisensi:** buka sheet relay → tab **Akun**, lalu ubah kolom `paket` (Uji coba / Dasar / Pro / Founding) dan `berlaku_sd`. Akun baru otomatis mendapat uji coba 7 hari.

## C. Unggah frontend

Ekstrak `proterad-frontend.zip` dan timpa folder **`proterad-frontend`** yang lama. Lalu dari folder itu, jalankan:

```bash
git add .
git commit -m "Uji coba arsitektur baru"
git push
```

Halaman uji coba ada di: **https://juniorlabs-id.github.io/proterad/poc/**

---

## D. Daftar uji (catat hasilnya)

Di halaman uji coba, ikuti kartu 0–4. Panel **Log & waktu** di bawah mencatat lama setiap aksi.

| # | Lakukan | Yang perlu diperhatikan |
|---|---|---|
| 1 | **Langkah 0:** isi Client ID & URL relay → Simpan | — |
| 2 | **Langkah 1:** Masuk dengan Google | ❓ Apakah muncul layar **"Google belum memverifikasi aplikasi ini"**? (seharusnya **tidak**) |
| 3 | **Langkah 2:** Cari/buat database → Isi contoh → Uji tulis 200 baris → Uji unggah berkas | Spreadsheet **ProteRad — Database** muncul di Drive Anda. Waktu tiap aksi idealnya < 1.000 ms. |
| 4 | Buka aplikasi di **perangkat lain** (mis. HP) → login → Cari/buat database | Harus **menemukan** spreadsheet yang sama, bukan membuat baru |
| 5 | **Langkah 3:** ubah tahapan/kritis → Simpan pengaturan → Kirim jadwal → **Kirim rekap uji** | Email rekap masuk (cek juga folder Spam). Telegram masuk bila sudah dihubungkan. |
| 6 | Salin **tautan ICS** → Google Kalender → *Tambah kalender → Dari URL* | Kalender "ProteRad" muncul. Tanpa pop-up, dan bisa butuh beberapa jam untuk tampil. |
| 7 | **Langkah 4:** Buat QR untuk Budi → pindai dari **HP lain** → buat PIN → **Sudah saya baca** → kembali ke laptop → Ambil konfirmasi | Kolom `dibaca_pada` di spreadsheet terisi. |
| 8 | Di HP pekerja: tutup → buka lagi → masukkan PIN | Terbuka tanpa memindai QR lagi |
| 9 | Biarkan halaman PPR terbuka **> 1 jam**, lalu klik tombol apa pun | ❓ Apakah token diperbarui otomatis (popup sekilas) atau perlu login ulang? |
| 10 | Terbitkan ulang QR Budi → buka di HP pekerja | Muncul "Akses tidak berlaku lagi" |

### Skrip mini Kalender (opsional)

1. Di **akun Google PPR** → **https://script.new** → tempel isi **`KalenderMini.gs`**.
2. Isi dua nilai:
   - `RELAY_URL` dengan URL relay;
   - `KODE_KALENDER` dengan kode dari langkah 3 di halaman uji coba.
3. Pilih fungsi **`pasang`** → **Run** → izinkan Kalender.
4. Periksa Google Kalender:
   - acara **[ProteRad] ⏰ …** muncul pukul 08.00 di hari jatuh tempo, dengan pop-up pukul 08.00 sesuai tahapan;
   - tahapan lebih dari 28 hari dibuat sebagai acara **⏳ H-n** tersendiri.
5. Untuk melepas: jalankan **`lepas`**.

---

## Yang mohon dilaporkan balik

1. Muncul layar "belum diverifikasi"? (ya / tidak, kirim tangkapan layar bila ya)
2. Angka di panel **Log & waktu** (tangkapan layar)
3. Perilaku token setelah 1 jam (uji no. 9)
4. Email rekap masuk ke kotak masuk atau Spam?
5. Pop-up Kalender muncul pukul 08.00?

## Yang belum dicakup uji coba ini

Peninjau internal, tautan tamu (termasuk berkas dokumen untuk tamu), dan QR pintu dari aplikasi utama. Relay sudah mendukung QR pintu. Semua itu memakai pola yang sama dengan QR pekerja dan dikerjakan saat migrasi aplikasi penuh, setelah hasil uji ini baik.
