/* ============================================================
   AlaraGo — KONFIGURASI FRONTEND
   Diisi sekali oleh penjual sebelum deploy ke GitHub Pages.
   ============================================================ */
window.PR_CONFIG = {
  // Client ID OAuth Google (tipe "Web application") milik penjual. Bersifat publik.
  // Authorized JavaScript origins: https://juniorlabs-id.github.io
  GOOGLE_CLIENT_ID: '866391536524-30bfgv7hh6nal79jf0fm6scis2n4h44g.apps.googleusercontent.com',

  // URL /exec relay milik penjual (Relay.gs): lisensi, paket terkunci, rekap email, kalender.
  RELAY_URL: 'https://script.google.com/macros/s/AKfycbyfiq0EaGOnzn7-69-tha4xdk-Gk7viY63nuyiPut2clJdedaPeGfablf57zi7KY1I/exec',

  // Kontak penjual untuk pembelian / perpanjangan
  SELLER_CONTACT: 'Yanuar A. S.',
  SELLER_WA: '',          // contoh: '6281234567890'

  // Nilai Batas Dosis (mSv). Cocokkan dengan teks resmi peraturan yang berlaku sebelum dipakai.
  NBD: {
    pekerja_rata5: 20,     // dosis efektif rata-rata per tahun selama 5 tahun
    pekerja_tahun: 50,     // dosis efektif maksimum dalam satu tahun
    pekerja_5tahun: 100,   // akumulasi 5 tahun
    lensa_rata5: 20,       // dosis ekivalen lensa mata (rata-rata/tahun) — verifikasi
    hamil_lokasi: 1        // lokasi kerja pekerja hamil < 1 mSv/tahun (Perba 4/2020 Ps. 38)
  },

  APP_VERSION: '2.0.0'
};
