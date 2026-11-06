/* AlaraGo — MODE DEMO: data contoh + backend tiruan di browser (tanpa server) */
(function (PR) {
  'use strict';
  const D = PR.demo = {};
  const KEY = 'pr_demo_db_v1';
  const files = {};
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const r2 = v => Math.round(v * 100) / 100;

  D.reset = () => { try { localStorage.removeItem(KEY); } catch (e) { } };
  D.db = () => { let d = PR.LS.get(KEY, null); if (!d) { d = build(); PR.LS.set(KEY, d); } return d; };
  const persist = d => PR.LS.set(KEY, d);

  function build() {
    seed = 7;
    const T = PR.today(), Y = +T.slice(0, 4), A = n => PR.addDays(T, n), M = n => PR.addMonths(T, n);
    const db = {}; Object.assign(db, { RS: [], Ruangan: [], Alat: [], Riwayat_Alat: [], Alat_Ukur: [], Kalibrasi: [], Perlengkapan: [], Pekerja: [], Dosis: [], MCU: [], Pembatas_Dosis: [], Investigasi: [], Survei: [], Titik: [], Denah: [], Dokumen: [], Baca_SOP: [], Kegiatan: [], Temuan: [], Inspeksi: [], Jadwal: [], Pengguna: [], Log: [], Tautan: [] });
    db.RS.push({ id: 'RS1', nama: 'RS Contoh Medika', instalasi: 'Instalasi Radiologi', alamat: 'Jl. Contoh No. 1, Kota Contoh', pemegang_izin: 'Direktur Utama RS Contoh Medika', aktif: 'ya' });
    db.Pengaturan = [
      ['wizard_selesai', 'ya'], ['tanggal_mulai_operasi', '2018-03-01'], ['batas_pengendalian', '10'], ['batas_supervisi', '2.5'], ['batas_umum', '0.5'],
      ['periode_survei_bulan', '12'], ['ppr_nama', 'Yanuar A. S.'], ['ppr_email', 'ppr@contoh.id'], ['ppr_izin_no', 'IB-0000/PPR/2022'], ['ppr_izin_sd', '2027-12-14'],
      ['tampil_nama_peninjau', 'analisis'], ['notif_kalender', 'ya'], ['notif_mingguan', 'ya'], ['notif_aplikasi', 'ya'], ['notif_pekerja', 'ya'], ['paket', 'Pro']
    ].map(([id, nilai]) => ({ id, nilai }));
    const rooms = [['RU1', 'R. X-Ray 1', 'Radiografi umum', 'Lt 1', 'pengendalian'], ['RU2', 'R. CT Scan', 'CT Scan', 'Lt 1', 'pengendalian'], ['RU3', 'R. Mammografi', 'Mammografi', 'Lt 1', 'pengendalian'],
      ['RU4', 'R. Dental', 'Dental panoramik', 'Lt 1', 'pengendalian'], ['RU5', 'R. Angiografi (Cathlab)', 'Intervensional', 'Lt 2', 'pengendalian'], ['RU6', 'R. Bedah OK-3', 'C-Arm', 'Lt 2', 'pengendalian']];
    rooms.forEach(([id, nama, jenis, lantai, klasifikasi]) => db.Ruangan.push({ id, nama, jenis, lantai, klasifikasi, ukuran: (5 + rnd() * 3).toFixed(1).replace('.', ',') + ' × ' + (4 + rnd() * 2).toFixed(1).replace('.', ',') + ' m' }));
    const alat = [['AL1', 'RU1', 'GE', 'Definium 646', 'Radiografi umum', 'XR4819', M(20), M(14)], ['AL2', 'RU2', 'Canon', 'Aquilion Prime SP', 'CT Scan', 'CT9201', M(12), A(24)],
      ['AL3', 'RU3', 'Hologic', 'Selenia Dimensions', 'Mammografi', 'MG3312', M(26), M(9)], ['AL4', 'RU4', 'Carestream', 'CS 9600', 'Dental panoramik', 'DN1029', M(30), M(5)],
      ['AL5', 'RU5', 'Siemens', 'Artis Zee', 'Fluoroskopi intervensional', 'AZ8491', M(21), M(10)], ['AL6', 'RU6', 'Philips', 'Zenition 70', 'C-Arm mobile', 'CA7721', M(18), A(-20)]];
    alat.forEach(([id, ruangan_id, merek, tipe, jenis, no_seri, izin_sd, ukes_sd], i) => db.Alat.push({ id, ruangan_id, merek, tipe, jenis, no_seri, kv_ma: '150 kV · 500 mA', no_izin: `0${4812 + i * 113}/Izin/202${2 + (i % 3)}`, izin_sd, izin_status: 'berlaku', ukes_no: `UK-${2025 + (i % 2)}-${710 + i}`, ukes_sd, ukes_status: id === 'AL6' ? 'dijadwalkan' : '', status_balis: 'terdaftar', status_operasi: 'aktif' }));
    db.Riwayat_Alat.push({ id: 'RW1', alat_id: 'AL6', tanggal: A(-53), jenis: 'Ganti tabung', pelaksana: 'Vendor', no_ba: 'BA-SERV-01', keterangan: 'Penggantian insert tabung sinar-X', memicu_survei: 'ya' },
      { id: 'RW2', alat_id: 'AL5', tanggal: A(-92), jenis: 'Perawatan berkala', pelaksana: 'Teknisi RS', keterangan: 'Kalibrasi monitor & pembersihan', memicu_survei: 'tidak' },
      { id: 'RW3', alat_id: 'AL2', tanggal: A(-300), jenis: 'Perbaikan generator', pelaksana: 'Vendor', keterangan: 'Ganti kapasitor', memicu_survei: 'ya' });
    db.Alat_Ukur.push({ id: 'AU1', merek: 'Ludlum', tipe: 'Model 14C', no_seri: '289410', detektor: 'GM', rentang_energi: '60 keV – 1,25 MeV', rentang_ukur: '0–2000 mR/h', kepemilikan: 'RS', status: 'aktif', lab: 'Laboratorium kalibrasi terakreditasi', no_sertifikat: '289410-CAL-2025', kal_tanggal: A(-358), kal_sd: A(7), fk: '1.05', ketidakpastian: '5%' },
      { id: 'AU2', merek: 'Fluke', tipe: '451P', no_seri: 'IC-5521', detektor: 'Ion chamber', rentang_energi: '25 keV – 2 MeV', rentang_ukur: '0–50 mSv/h', kepemilikan: 'Pribadi PPR', status: 'aktif', lab: 'Laboratorium kalibrasi terakreditasi', no_sertifikat: 'IC-5521-2026', kal_tanggal: A(-90), kal_sd: A(275), fk: '0.98', ketidakpastian: '4%' });
    [[2022, 1.02], [2023, 1.03], [2024, 1.04], [2025, 1.05]].forEach(([y, fk]) => db.Kalibrasi.push({ id: 'KL' + y, alat_ukur_id: 'AU1', lab: 'Lab kalibrasi', no_sertifikat: '289410-CAL-' + y, tanggal: y + '-11-11', berlaku_sd: (y + 1) + '-11-11', fk: String(fk) }));
    rooms.forEach(([rid]) => PR.L.PERLENGKAPAN.forEach((it, k) => {
      const miss = rid === 'RU3' && it === 'Peringatan wanita hamil';
      db.Perlengkapan.push({ id: `PL${rid}${k}`, ruangan_id: rid, item: it, status: miss ? 'belum ada' : 'ada', tanggal_cek: A(-25 - k), keterangan: '', foto_id: miss || k > 7 ? '' : 'DEMO_FOTO' });
    }));
    const names = ['Budi Santoso, A.Md.Rad', 'Rina Kartika, A.Md.Rad', 'Agus Setiawan, A.Md.Rad', 'Lina Marlina, S.Tr.Rad', 'dr. Hendra Wijaya, Sp.Rad', 'dr. Maya Sari, Sp.Rad', 'dr. Bambang Prakoso, Sp.JP',
      'Siti Rahmawati, S.Tr.Rad', 'Ahmad Fauzi, A.Md.Rad', 'Dewi Lestari, A.Md.Rad', 'Rudi Hartono, A.Md.Rad', 'Fitri Handayani, A.Md.Rad', 'Joko Susilo, A.Md.Rad', 'Nia Ramadhani, S.Tr.Rad', 'Eko Prasetyo, A.Md.Rad', 'Wulan Sari, A.Md.Rad',
      'Nurul Hidayah, M.Si.', 'Arief Rahman, S.Si.', 'Yuni Astuti, S.Kep', 'Dedi Kurniawan, S.Kep', 'Ratna Dewi, S.Kep', 'Hari Purnomo, S.Kep'];
    const prof = i => i < 4 ? ['Radiografer Intervensional', 'intervensional', 3.4] : i < 7 ? ['Dokter Spesialis (Intervensional)', 'intervensional', 2.6] : i < 16 ? ['Radiografer Umum', 'umum', 0.55] : i < 18 ? ['Fisikawan Medis', 'umum', 0.3] : ['Perawat Radiologi', 'intervensional', 1.5];
    names.forEach((nama, i) => {
      const [p, kat, base] = prof(i), id = 'PK' + String(i + 1).padStart(2, '0');
      db.Pekerja.push({ id, nama, npr: `NPR-${String(19 + i * 7).padStart(3, '0')}`, profesi: p, kategori: kat, email: `pekerja${i + 1}@contoh.id`, no_hp: '0812' + String(10000000 + i * 7919).slice(0, 8), metode: i % 3 ? 'Google' : 'QR + PIN', status_akun: 'aktif', pelatihan_terakhir: i === 9 ? '2021-08-10' : `${2022 + (i % 4)}-0${1 + (i % 8)}-15`, aktif: 'ya' });
      const curQ = PR.quarter(T) - 1 || 0;
      for (let y = Y - 5; y <= Y; y++) for (let q = 1; q <= 4; q++) {
        if (y === Y && q > curQ) continue;
        if (id === 'PK09' && y === Y && q === curQ) continue; // TLD hilang
        let v = base / 4 * (0.7 + rnd() * 0.6) * (1 + (y - (Y - 5)) * 0.03);
        if (id === 'PK01' && y === Y) v *= 2.3;
        db.Dosis.push({ id: `DS${id}${y}${q}`, pekerja_id: id, tahun: String(y), periode: 'TW' + q, hp10: String(r2(v)), hp3: kat === 'intervensional' ? String(r2(v * 1.6)) : '', lab: 'Lab dosimetri', tanggal_terima: `${y}-${String(q * 3).padStart(2, '0')}-28`, jenis_kegiatan: 'rutin', dibaca_pada: (y < Y || q < curQ || i % 4) ? `${y}-${String(Math.min(12, q * 3 + 1)).padStart(2, '0')}-05T02:00:00Z` : '' });
      }
      const last = i === 8 ? M(-13) : i < 3 ? PR.addDays(M(-12), 20 + i * 4) : M(-(2 + (i % 9)));
      db.MCU.push({ id: 'MC' + id, pekerja_id: id, tanggal: last, faskes: i % 2 ? 'Klinik K3 Contoh' : 'Unit MCU RS', kesimpulan: i === 0 ? 'Laik dengan pembatasan' : i === 13 ? 'Laik dengan catatan' : 'Laik kerja', berlaku_sd: PR.addMonths(last, 12), pembatasan: i === 0 ? 'Tidak bertugas di intervensional beban tinggi s.d. ' + PR.d(M(4)) : '', hamil: i === 13 ? 'ya' : '' });
    });
    db.Inspeksi.push({ id: 'IN1', tanggal: (Y - 2) + '-10-14', ikk: '89.4', good_practice: 'Pemisahan uraian tugas PPR dan fisikawan medis sudah jelas.' }, { id: 'IN2', tanggal: (Y - 4) + '-09-20', ikk: '84.2' });
    // pembatas dosis — dihitung dari data, sebagian disetujui
    PR.db = db; PR.set = {}; db.Pengaturan.forEach(r => PR.set[r.id] = r.nilai);
    const calc = PR.L.dcCalc();
    calc.rows.forEach((r, i) => db.Pembatas_Dosis.push({ id: 'DC' + (i + 1), profesi: r.profesi, nilai: String(r.usulan), metode: r.aturan, masa_operasi: String(calc.mo.kat), periode: calc.years[0] + '–' + calc.years[calc.years.length - 1], berlaku_sd: String(Y + 4), status: i === 0 ? 'menunggu' : 'disetujui', disetujui_oleh: i === 0 ? '' : 'dr. H. Kepala Instalasi, Sp.Rad', disetujui_pada: i === 0 ? '' : PR.addDays(T, -120) + 'T03:00:00Z', dibuat: PR.addDays(T, -130) + 'T03:00:00Z' }));
    db.Investigasi.push({ id: 'IV1', pekerja_id: 'PK01', tahun: String(Y), jenis: 'melebihi DC', dosis: '', akar_penyebab: 'Peningkatan beban tindakan intervensional TW2–TW3; apron yang digunakan mulai retak.', rencana: 'Rotasi shift tindakan; pengadaan apron baru 0,5 mm Pb; evaluasi bulanan.', penanggung_jawab: 'Kepala Instalasi & PPR', tenggat: A(41), status: 'dalam proses' });
    // survei
    let sid = 0;
    const svDates = { AL1: [-760, -395, -40], AL2: [-700, -330, -22], AL3: [-730, -360, -60], AL4: [-720, -350, -75], AL5: [-740, -370, -18], AL6: [-750, -380, -120] };
    alat.forEach(([aid, rid]) => svDates[aid].forEach((off, k) => {
      const id = 'SV' + (++sid), tg = A(off);
      db.Survei.push({ id, alat_id: aid, ruangan_id: rid, tanggal: tg, petugas: 'Yanuar A. S.', alat_ukur_id: 'AU1', fk: '1.05', bg: '0.08', kv: aid === 'AL2' ? '120' : '80', mas: aid === 'AL2' ? '200' : '20', fantom: aid === 'AL2' ? 'Fantom CTDI 32 cm' : 'Air 20 cm', ukuran_ruang: (db.Ruangan.find(r => r.id === rid) || {}).ukuran });
      [['P1', 'Posisi operator', 'operator', 'supervisi', 0.9], ['P2', 'Balik pintu', 'pintu', 'supervisi', 0.5], ['P3', 'Sekitar ruangan / koridor', 'sekitar', 'umum', 0.12]].forEach(([kode, lokasi, posisi, klas, b], j) => {
        let m = b * (0.6 + rnd() * 0.8) * (aid === 'AL5' ? 2.2 : 1); if (aid === 'AL5' && j === 0 && k === 2) m = 2.25;
        const mentah = r2(m + 0.08);
        db.Titik.push({ id: `TT${id}${j}`, survei_id: id, kode, lokasi, posisi, klasifikasi: klas, mentah: String(mentah), bg: '0.08', terkoreksi: String(r2((mentah - 0.08) * 1.05)), x: '', y: '' });
      });
    }));
    // denah Cathlab (Pro)
    db.Denah.push({ id: 'DN1', nama: 'Instalasi Radiologi Lt 1–2', file_id: 'DEMO_DENAH', skala_m: '20', sumber: JSON.stringify([{ x: 21, y: 30, l: 'X-Ray 1' }, { x: 77, y: 28, l: 'CT Scan' }]), ruangan_ids: JSON.stringify(['RU1', 'RU2']) });
    const svX = db.Survei.filter(s => s.alat_id === 'AL1' || s.alat_id === 'AL2');
    const pos = { AL1: [[33, 61], [40, 19], [20, 82]], AL2: [[65, 61], [56, 19], [64, 84]] };
    svX.forEach(s => db.Titik.filter(t => t.survei_id === s.id).forEach((t, j) => { t.x = String(pos[s.alat_id][j][0]); t.y = String(pos[s.alat_id][j][1]); t.denah_id = 'DN1'; }));
    // dokumen
    const doc = (id, jenis, kategori, judul, nomor, revisi, status, tb, sd, tu, extra) => db.Dokumen.push(Object.assign({ id, jenis, kategori, judul, nomor, revisi, status, tanggal_berlaku: tb, berlaku_sd: sd || '', tinjau_ulang: tu || '', penyusun: 'Yanuar A. S. (PPR)', pengesah: 'Direktur Utama', file_id: 'DEMO_DOC', file_nama: nomor + '.pdf', file_ukuran: String(200000 + id.length * 9000), diunggah: tb }, extra || {}));
    doc('DK1', 'terkendali', 'PPKR', 'Program Proteksi dan Keselamatan Radiasi', 'PPKR-RAD-01', '3', 'disahkan', A(-460), '', M(8), { cek_isi: JSON.stringify({ dasar_hukum: true, dc: true, tugas: true, pendamping: false }), ringkasan: 'Pembaruan subbab IV.1 pembatas dosis metode Q3.' });
    doc('DK2', 'terkendali', 'SOP', 'SOP Penggunaan Apron & Alat Pelindung Diri', 'SOP-RAD-04', '2', 'disahkan', A(-40), '', M(23), { ringkasan: 'Kewajiban apron 0,5 mm Pb dan pelindung tiroid pada tindakan Cathlab.' });
    doc('DK3', 'terkendali', 'SOP', 'SOP Keselamatan Fluoroskopi Intervensional', 'SOP-RAD-01', '3', 'disahkan', A(-300), '', M(14), { ringkasan: 'Prinsip waktu, jarak, perisai pada fluoroskopi.' });
    doc('DK4', 'terkendali', 'SOP', 'SOP Pendamping Pasien', 'SOP-RAD-08', '1', 'disahkan', A(-700), '', A(-10), { ringkasan: 'Syarat pendamping pasien selama penyinaran.' });
    doc('DK5', 'terkendali', 'Kajian Keselamatan Radiasi', 'Kajian Keselamatan Radiasi', 'KKR-RAD-02', '2', 'disahkan', A(-580), '', M(18));
    doc('DK6', 'terkendali', 'Program Jaminan Mutu', 'Program Jaminan Mutu Radiodiagnostik', 'PJM-RAD-03', '3', 'disahkan', A(-500), '', M(12));
    doc('DK7', 'terkendali', 'Laporan Verifikasi Keselamatan', 'Laporan Verifikasi Keselamatan', 'LVK-' + (Y - 1), '1', 'disahkan', A(-200), '', M(5));
    doc('DK8', 'rekaman', 'Logbook Pasien', 'Logbook Pasien & Registrasi Tindakan', 'LOG-PAS-' + Y, '1', 'disahkan', A(-300));
    doc('DK9', 'rekaman', 'Laporan Hasil Uji Kesesuaian', 'Laporan Hasil Uji Kesesuaian 6 Alat', 'LHUK-' + Y, '1', 'disahkan', A(-150));
    doc('DK10', 'rekaman', 'Logbook Perbaikan & Perawatan', 'Logbook Perawatan, Servis & Tabung Sinar-X', 'LOG-SERV-' + Y, '1', 'disahkan', A(-200));
    doc('DK11', 'terkendali', 'SOP', 'SOP Tanggap Darurat Radiasi (draf revisi)', 'SOP-K3-02', '2', 'draf', A(-5), '', '');
    db.Pekerja.forEach((w, i) => ['DK2', 'DK3', 'DK4'].forEach(d => { if (!(d === 'DK2' && i % 5 === 0)) db.Baca_SOP.push({ id: `BS${d}${w.id}`, dokumen_id: d, revisi: (db.Dokumen.find(x => x.id === d) || {}).revisi, pekerja_id: w.id, waktu: A(-10 - i) + 'T02:00:00Z' }); }));
    db.Kegiatan.push({ id: 'KG1', jenis: 'balis', tanggal: (Y) + '-02-14', keterangan: 'Laporan tahunan dikirim via B@LIS' }, { id: 'KG2', jenis: 'laporan_tugas', tanggal: Y + '-01-05', keterangan: 'Laporan pelaksanaan tugas PPR' },
      { id: 'KG3', jenis: 'latihan', tanggal: PR.addDays(M(-12), 18), keterangan: 'Gladi kedaruratan radiasi' }, { id: 'KG4', jenis: 'paparan_tidak_disengaja', tanggal: A(-120), keterangan: 'Nihil kejadian semester I' });
    db.Temuan.push({ id: 'TM1', no_lhi: 'LHI-' + (Y - 2) + '-01', tanggal_lhi: (Y - 2) + '-10-14', kode: 'B5-01', bagian: '5', tingkat: 'penting', uraian: 'Belum terpasang tanda peringatan wanita hamil di ruang mammografi.', rekomendasi: 'Pasang tanda peringatan dan unggah foto bukti.', batas_tl: A(16), status: 'dalam proses', diunggah_tlhi: 'tidak' },
      { id: 'TM2', no_lhi: 'LHI-' + (Y - 2) + '-01', tanggal_lhi: (Y - 2) + '-10-14', kode: 'B7-01', bagian: '7', tingkat: 'penting', uraian: 'Nilai pembatas dosis di PPKR belum sesuai data dosis pekerja.', rekomendasi: 'Hitung ulang pembatas dosis sesuai pedoman dan revisi PPKR.', batas_tl: A(-200), status: 'ditutup', diunggah_tlhi: 'ya' },
      { id: 'TM3', no_lhi: 'LHI-' + (Y - 2) + '-01', tanggal_lhi: (Y - 2) + '-10-14', kode: 'B1-03', bagian: '1', tingkat: 'kritis', uraian: 'Uji kesesuaian C-Arm Ruang Bedah OK-3 berakhir.', rekomendasi: 'Laksanakan uji kesesuaian dan unggah sertifikat.', batas_tl: A(31), status: 'terbuka', diunggah_tlhi: 'tidak' });
    db.Pengguna.push({ id: 'U1', nama: 'Yanuar A. S.', email: 'ppr@contoh.id', peran: 'ppr', jabatan: 'PPR', status: 'aktif' }, { id: 'U2', nama: 'dr. H. Kepala Instalasi, Sp.Rad', email: 'kepala@contoh.id', peran: 'peninjau', jabatan: 'Kepala Instalasi Radiologi', status: 'aktif' });
    db.Log.push({ id: 'L1', waktu: A(-1) + 'T02:10:00Z', email: 'ppr@contoh.id', peran: 'ppr', aksi: 'ubah', objek: 'Dosis×22' });
    return db;
  }

  const role = () => PR.LS.get('pr_demo_role', 'ppr');
  D.setRole = r => PR.LS.set('pr_demo_role', r);
  const worker = () => PR.LS.get('pr_demo_worker', 'PK01');
  const omit = (o, ks) => { const r = {}; Object.keys(o).forEach(k => { if (ks.indexOf(k) < 0) r[k] = o[k]; }); return r; };
  const pick = (o, ks) => { const r = {}; ks.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; };
  const ok = data => ({ success: true, data });
  const settings = db => { const s = {}; db.Pengaturan.forEach(r => s[r.id] = r.nilai); return s; };
  const me = () => { const r = role(), db = D.db(); if (r === 'pekerja') { const w = db.Pekerja.find(x => x.id === worker()) || db.Pekerja[0]; return { role: r, nama: w.nama, email: w.email, id: w.id }; } if (r === 'peninjau') return { role: r, nama: 'dr. H. Kepala Instalasi, Sp.Rad', email: 'kepala@contoh.id', id: 'U2' }; return { role: 'ppr', nama: 'Yanuar A. S.', email: 'ppr@contoh.id', id: 'U1' }; };

  D.handle = async (action, b) => {
    await new Promise(r => setTimeout(r, 60));
    const db = D.db(), r = role();
    switch (action) {
      case 'bootstrap': {
        const st = settings(db); let tables;
        if (r === 'ppr') tables = omit(db, ['Pengaturan', 'Log', 'Tautan']);
        else if (r === 'peninjau') { tables = omit(db, ['Pengaturan', 'Log', 'Tautan', 'Pengguna']); tables.MCU = db.MCU.map(m => pick(m, ['id', 'pekerja_id', 'tanggal', 'berlaku_sd'])); }
        else {
          const w = db.Pekerja.find(x => x.id === worker()) || {};
          tables = { Pekerja: [w], Dosis: db.Dosis.filter(d => d.pekerja_id === w.id), MCU: db.MCU.filter(m => m.pekerja_id === w.id).map(m => pick(m, ['id', 'pekerja_id', 'tanggal', 'faskes', 'kesimpulan', 'berlaku_sd', 'pembatasan'])),
            Pembatas_Dosis: db.Pembatas_Dosis.filter(d => d.profesi === w.profesi || d.profesi === 'Semua profesi'), Investigasi: db.Investigasi.filter(x => x.pekerja_id === w.id), RS: db.RS, Ruangan: db.Ruangan, Alat: db.Alat, Alat_Ukur: db.Alat_Ukur,
            Survei: db.Survei, Titik: db.Titik, Denah: db.Denah, Riwayat_Alat: db.Riwayat_Alat, Dokumen: db.Dokumen.filter(d => d.kategori === 'SOP' && d.status === 'disahkan'), Baca_SOP: db.Baca_SOP.filter(x => x.pekerja_id === w.id) };
        }
        return ok({ me: me(), tables: JSON.parse(JSON.stringify(tables)), settings: r === 'ppr' ? st : pick(st, ['batas_pengendalian', 'batas_supervisi', 'batas_umum', 'periode_survei_bulan', 'tanggal_mulai_operasi', 'ppr_nama', 'ppr_izin_sd']), ver: 'demo', today: PR.today(),
          license: r === 'ppr' ? { paket: 'Pro', status: 'aktif', berlaku_sd: PR.addMonths(PR.today(), 12), mode: 'demo' } : null,
          tautan: (db.Tautan || []).map(t => pick(t, ['id', 'dibuat', 'berlaku_sd', 'dicabut'])), log: db.Log.slice().reverse(), kredensial: db.Pekerja.map(w => ({ id: w.id, aktif: w.metode === 'QR + PIN', terkunci: false })) });
      }
      case 'batch': {
        if (r !== 'ppr') return { success: false, message: 'Akses tidak diizinkan.' };
        (b.ops || []).forEach(op => { const t = db[op.t] = db[op.t] || []; if (op.op === 'remove') { const i = t.findIndex(x => String(x.id) === String(op.id)); if (i >= 0) t.splice(i, 1); } else { const i = t.findIndex(x => String(x.id) === String(op.row.id)); if (i >= 0) t[i] = Object.assign({}, t[i], op.row); else t.push(op.row); } });
        db.Log.push({ id: PR.uid('L'), waktu: new Date().toISOString(), email: 'ppr@contoh.id', peran: 'ppr', aksi: 'ubah', objek: (b.ops || []).length + ' perubahan' });
        persist(db); return ok({ ver: 'demo' });
      }
      case 'upload': { const id = PR.uid('DEMOF'); files[id] = { nama: b.name, mime: b.mime, data: b.data }; return ok({ id, nama: b.name, ukuran: Math.round(b.data.length * 0.75) }); }
      case 'getFile': case 'guestFile': {
        if (files[b.id]) return ok(files[b.id]);
        if (b.id === 'DEMO_DENAH') return ok({ nama: 'denah.svg', mime: 'image/svg+xml', data: btoa(planSVG()) });
        const html = `<!doctype html><meta charset=utf-8><title>Berkas contoh</title><body style="font-family:sans-serif;padding:40px;background:#F2F3F5"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #9AA0A8;padding:32px"><div style="height:8px;background:repeating-linear-gradient(-45deg,#FFC21A 0 10px,#121212 10px 20px);margin:-32px -32px 24px"></div><h2>Berkas contoh (mode demo)</h2><p>Di aplikasi sebenarnya, berkas PDF/foto asli yang Anda unggah akan tampil di sini dari Google Drive Anda.</p></div>`;
        return ok({ nama: 'contoh.html', mime: 'text/html', data: btoa(unescape(encodeURIComponent(html))) });
      }
      case 'confirmDose': { const d = db.Dosis.find(x => x.id === b.id); if (d) d.dibaca_pada = new Date().toISOString(); persist(db); return ok({ dibaca_pada: d && d.dibaca_pada }); }
      case 'doseNote': { const d = db.Dosis.find(x => x.id === b.id); if (d) d.keterangan = b.text; persist(db); return ok({}); }
      case 'readSop': { const doc = db.Dokumen.find(x => x.id === b.id); const row = { id: PR.uid('BS'), dokumen_id: b.id, revisi: doc.revisi, pekerja_id: worker(), waktu: new Date().toISOString() }; db.Baca_SOP.push(row); persist(db); return ok(row); }
      case 'changePin': return /^\d{6}$/.test(b.pin || '') ? ok({}) : { success: false, message: 'PIN baru harus 6 digit.' };
      case 'approveDC': { db.Pembatas_Dosis.filter(d => (b.ids || []).indexOf(d.id) >= 0).forEach(d => { d.status = b.decision === 'setuju' ? 'disetujui' : 'revisi'; d.disetujui_oleh = me().nama; d.disetujui_pada = new Date().toISOString(); d.catatan_peninjau = b.note || ''; }); persist(db); return ok({}); }
      case 'issueQR': { const w = db.Pekerja.find(x => x.id === b.id); if (w) { w.metode = 'QR + PIN'; w.status_akun = 'menunggu aktivasi'; } persist(db); return ok({ token: 'demo' + b.id }); }
      case 'unlockWorker': return ok({});
      case 'createGuest': { const row = { id: PR.uid('G'), dibuat: new Date().toISOString(), berlaku_sd: new Date(Date.now() + (b.days || 7) * 864e5).toISOString(), dicabut: '' }; (db.Tautan = db.Tautan || []).push(row); persist(db); return ok({ token: 'demoguest', id: row.id, berlaku_sd: row.berlaku_sd }); }
      case 'revokeGuest': { const t = (db.Tautan || []).find(x => x.id === b.id); if (t) t.dicabut = new Date().toISOString(); persist(db); return ok({}); }
      case 'syncCalendar': return ok({ created: PR.L.dueItems().filter(i => i.days > -30).length, removed: 0, demo: true });
      case 'testEmail': return ok({ to: 'ppr@contoh.id', demo: true });
      case 'license': return ok({ paket: 'Pro', status: 'aktif', berlaku_sd: PR.addMonths(PR.today(), 12), mode: 'demo', sisa_pindah: 2 });
      case 'moveRS': return { success: false, message: 'Pindah RS tidak tersedia di mode demo.' };
      case 'qrInfo': { const w = db.Pekerja.find(x => 'demo' + x.id === b.token) || db.Pekerja[0]; return ok({ nama: w.nama, profesi: w.profesi, rs: db.RS[0].nama, needPin: false }); }
      case 'loginPin': { if (!/^\d{6}$/.test(b.pin || '')) return { success: false, message: 'PIN harus 6 digit angka.' }; const w = db.Pekerja.find(x => 'demo' + x.id === b.token) || db.Pekerja[0]; D.setRole('pekerja'); PR.LS.set('pr_demo_worker', w.id); return ok({ session: 'demo-session', me: { role: 'pekerja', nama: w.nama, id: w.id } }); }
      case 'guest': {
        const t = omit(db, ['Pengaturan', 'Log', 'Tautan', 'Pengguna', 'Jadwal', 'Temuan', 'Inspeksi']);
        t.MCU = db.MCU.map(m => pick(m, ['id', 'pekerja_id', 'tanggal', 'berlaku_sd']));
        t.Dokumen = db.Dokumen.filter(d => d.status !== 'draf');
        return ok({ tables: JSON.parse(JSON.stringify(t)), settings: settings(db), berlaku_sd: new Date(Date.now() + 6 * 864e5).toISOString(), today: PR.today(), ppr: 'Yanuar A. S.' });
      }
      case 'door': {
        const rr = db.Ruangan.find(x => x.id === b.r); if (!rr) return { success: false, message: 'Ruangan tidak ditemukan.' };
        PR.db = PR.db || db; PR.set = PR.set || settings(db);
        const sv = db.Survei.filter(s => s.ruangan_id === rr.id).sort((x, y) => y.tanggal.localeCompare(x.tanggal))[0];
        let status = 'belum disurvei';
        if (sv) { const st = settings(db); let w = 0; db.Titik.filter(t => t.survei_id === sv.id).forEach(t => { const lim = +st['batas_' + t.klasifikasi]; if (lim) w = Math.max(w, +t.terkoreksi / lim); }); status = w > 1 ? 'melebihi batas' : w >= 0.8 ? 'perlu perhatian' : 'aman';
          if (db.Alat.filter(a => a.ruangan_id === rr.id).some(a => db.Riwayat_Alat.some(h => h.alat_id === a.id && h.memicu_survei === 'ya' && h.tanggal > sv.tanggal))) status = 'survei ulang diperlukan'; }
        return ok({ ruang: rr.nama, lantai: rr.lantai, klasifikasi: rr.klasifikasi, status, tanggal: sv && sv.tanggal, rs: db.RS[0].nama });
      }
      default: return { success: false, message: 'Aksi demo tidak dikenal: ' + action };
    }
  };

  function planSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600"><rect width="1000" height="600" fill="#fff"/>
<rect x="40" y="340" width="920" height="80" fill="#F3F5F8"/>
<g fill="#fff" stroke="#33475B"><rect x="40" y="40" width="340" height="300" stroke-width="10"/><rect x="580" y="40" width="380" height="300" stroke-width="10"/><rect x="380" y="40" width="200" height="160" stroke-width="5" fill="#F7F9FB"/><rect x="380" y="200" width="200" height="140" stroke-width="5" fill="#F7F9FB"/><rect x="40" y="420" width="520" height="140" stroke-width="5"/><rect x="560" y="420" width="160" height="140" stroke-width="5"/><rect x="720" y="420" width="240" height="140" stroke-width="5"/></g>
<g stroke="#4A90C2" stroke-width="12"><line x1="380" y1="80" x2="380" y2="150"/><line x1="580" y1="80" x2="580" y2="150"/></g>
<g stroke="#B07A4A" stroke-width="12"><line x1="300" y1="340" x2="360" y2="340"/><line x1="620" y1="340" x2="680" y2="340"/></g>
<rect x="120" y="160" width="170" height="44" fill="#E9EEF3" stroke="#9AA0A8" stroke-width="2"/><circle cx="790" cy="170" r="58" fill="none" stroke="#9AA0A8" stroke-width="20"/>
<g font-family="Arial" font-weight="700" fill="#33475B" font-size="18"><text x="60" y="76">RUANG X-RAY 1</text><text x="600" y="76">RUANG CT SCAN</text><text x="430" y="182" font-size="15">R. KONTROL</text><text x="438" y="276" font-size="15">R. PANEL</text><text x="60" y="456" font-size="15">RUANG TUNGGU PASIEN</text><text x="608" y="456" font-size="15">TOILET</text><text x="740" y="456" font-size="15">R. BACA / ADMIN</text><text x="820" y="386" font-size="15" fill="#5A6778">KORIDOR</text></g>
<g stroke="#33475B" stroke-width="3"><line x1="40" y1="584" x2="140" y2="584"/></g><text x="152" y="590" font-family="monospace" font-size="14" fill="#5A6778">2 m</text></svg>`;
  }
})(window.PR);
