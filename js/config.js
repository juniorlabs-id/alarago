/* ============================================================
   AlaraGo — KONFIGURASI FRONTEND
   Diisi sekali oleh penjual sebelum deploy ke GitHub Pages.
   ============================================================ */
window.PR_CONFIG = {
  // Client ID OAuth Google (tipe "Web application") milik penjual.
  // Authorized JavaScript origins: https://USERNAME.github.io
  // Kosong = tombol "Masuk dengan Google" diganti petunjuk pengaturan.
  GOOGLE_CLIENT_ID: '866391536524-30bfgv7hh6nal79jf0fm6scis2n4h44g.apps.googleusercontent.com',

  // URL /exec relay milik penjual (Relay.gs) — dipakai arsitektur baru (uji coba di /poc/).
  RELAY_URL: 'https://script.google.com/macros/s/AKfycbyfiq0EaGOnzn7-69-tha4xdk-Gk7viY63nuyiPut2clJdedaPeGfablf57zi7KY1I/exec',

  // Opsional: URL /exec backend default (untuk pemakaian sendiri / 1 RS).
  // Untuk produk yang dijual, biarkan kosong — tiap PPR menempelkan URL backend miliknya saat pertama masuk.
  DEFAULT_BACKEND_URL: '',

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

  APP_VERSION: '1.0.0'
};
