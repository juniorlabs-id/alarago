/* AlaraGo — "driver" PPR: data langsung di Google Sheets & Drive milik PPR (izin drive.file).
   Meniru aksi backend lama (bootstrap, batch, upload, …) sehingga halaman tidak perlu tahu
   dari mana data datang. Juga menerbitkan paket terenkripsi ke relay & memproses balasan. */
(function (PR) {
  'use strict';
  const G = PR.G, K = PR.K, R = PR.R, LS = PR.LS;
  const DRV = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files', SHT = 'https://sheets.googleapis.com/v4/spreadsheets';
  const TABLES = {
    RS: ['id', 'nama', 'instalasi', 'alamat', 'pemegang_izin', 'tanggal_mulai_operasi', 'aktif', 'dibuat'],
    Ruangan: ['id', 'nama', 'jenis', 'lantai', 'klasifikasi', 'ukuran', 'catatan'],
    Alat: ['id', 'ruangan_id', 'merek', 'tipe', 'jenis', 'no_seri', 'kv_ma', 'no_izin', 'izin_sd', 'izin_status', 'ukes_no', 'ukes_sd', 'ukes_status', 'status_balis', 'status_operasi', 'catatan'],
    Riwayat_Alat: ['id', 'alat_id', 'tanggal', 'jenis', 'pelaksana', 'no_ba', 'keterangan', 'memicu_survei', 'file_id'],
    Alat_Ukur: ['id', 'merek', 'tipe', 'no_seri', 'detektor', 'rentang_energi', 'rentang_ukur', 'kepemilikan', 'status', 'lab', 'no_sertifikat', 'kal_tanggal', 'kal_sd', 'fk', 'ketidakpastian', 'file_id'],
    Kalibrasi: ['id', 'alat_ukur_id', 'lab', 'no_sertifikat', 'tanggal', 'berlaku_sd', 'fk', 'ketidakpastian', 'file_id'],
    Perlengkapan: ['id', 'ruangan_id', 'item', 'status', 'tanggal_cek', 'keterangan', 'foto_id'],
    Pekerja: ['id', 'nama', 'npr', 'profesi', 'kategori', 'email', 'no_hp', 'metode', 'status_akun', 'pelatihan_terakhir', 'izin_bekerja', 'izin_bekerja_sd', 'aktif', 'catatan'],
    Dosis: ['id', 'pekerja_id', 'tahun', 'periode', 'hp10', 'hp3', 'lab', 'tanggal_terima', 'jenis_kegiatan', 'pengganti', 'dibaca_pada', 'keterangan'],
    MCU: ['id', 'pekerja_id', 'tanggal', 'faskes', 'kesimpulan', 'berlaku_sd', 'pembatasan', 'hamil', 'file_id'],
    Pembatas_Dosis: ['id', 'profesi', 'nilai', 'metode', 'masa_operasi', 'periode', 'berlaku_sd', 'status', 'disetujui_oleh', 'disetujui_pada', 'catatan_peninjau', 'dibuat'],
    Investigasi: ['id', 'pekerja_id', 'tahun', 'jenis', 'dosis', 'akar_penyebab', 'rencana', 'penanggung_jawab', 'tenggat', 'status'],
    Survei: ['id', 'alat_id', 'ruangan_id', 'tanggal', 'petugas', 'alat_ukur_id', 'fk', 'bg', 'kv', 'mas', 'fantom', 'ukuran_ruang', 'catatan'],
    Titik: ['id', 'survei_id', 'kode', 'lokasi', 'posisi', 'klasifikasi', 'mentah', 'bg', 'terkoreksi', 'x', 'y', 'denah_id', 'foto_id', 'tindak_lanjut'],
    Denah: ['id', 'nama', 'file_id', 'skala_m', 'sumber', 'ruangan_ids'],
    Dokumen: ['id', 'jenis', 'kategori', 'judul', 'nomor', 'revisi', 'status', 'objek_tipe', 'objek_id', 'tanggal_berlaku', 'berlaku_sd', 'tinjau_ulang', 'penyusun', 'pengesah', 'file_id', 'file_nama', 'file_ukuran', 'induk_id', 'ringkasan', 'cek_isi', 'diunggah'],
    Baca_SOP: ['id', 'dokumen_id', 'revisi', 'pekerja_id', 'waktu'],
    Kegiatan: ['id', 'jenis', 'tanggal', 'berlaku_sd', 'keterangan', 'file_id'],
    Temuan: ['id', 'no_lhi', 'tanggal_lhi', 'kode', 'bagian', 'tingkat', 'uraian', 'rekomendasi', 'batas_tl', 'status', 'bukti_ids', 'diunggah_tlhi', 'berulang', 'catatan'],
    Inspeksi: ['id', 'tanggal', 'ikk', 'good_practice', 'catatan'],
    Jadwal: ['id', 'status', 'catatan', 'event_ids', 'diubah'],
    Pengguna: ['id', 'nama', 'email', 'peran', 'jabatan', 'status', 'dibuat'],
    Kredensial: ['id', 'jenis', 'ref', 'paket', 'kunci', 'label', 'berlaku_sd', 'dicabut', 'dibuat'],
    Log: ['id', 'waktu', 'email', 'peran', 'aksi', 'objek'],
    Pengaturan: ['id', 'nilai']
  };
  const NAMES = Object.keys(TABLES);
  const D = PR.drive = { TABLES };
  const ok = d => ({ success: true, data: d });
  const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const nowISO = () => new Date().toISOString();
  const q = s => encodeURIComponent(s);
  const rng = (t, a1) => `'${t}'!${a1}`;

  // ======================= LOKASI DATABASE =======================
  let meta = null;   // { id, folder, berkas, mcu, sheets:{title:sheetId}, head:{title:[cols]} }
  const metaKey = () => 'ag_db_' + (LS.get('ag_email', '') || 'x');
  D.email = () => LS.get('ag_email', '');
  async function cariDb() {
    const r = await G.json(`${DRV}?q=${q("appProperties has { key='alarago' and value='db' } and trashed=false")}&fields=files(id,name,appProperties,modifiedTime)&orderBy=createdTime&spaces=drive`);
    return (r.files || [])[0] || null;
  }
  async function buatFolder(name, parent, tag) { return G.json(`${DRV}?fields=id`, 'POST', { name, mimeType: 'application/vnd.google-apps.folder', parents: parent ? [parent] : undefined, appProperties: { alarago: tag } }); }
  async function buatDb() {
    const root = await buatFolder('AlaraGo', null, 'folder');
    const berkas = await buatFolder('Berkas', root.id, 'berkas');
    const mcu = await buatFolder('MCU (terbatas)', root.id, 'mcu');
    const ss = await G.json(`${DRV}?fields=id,appProperties`, 'POST', { name: 'AlaraGo — Database', mimeType: 'application/vnd.google-apps.spreadsheet', parents: [root.id], appProperties: { alarago: 'db', folder: root.id, berkas: berkas.id, mcu: mcu.id } });
    const reqs = [{ updateSheetProperties: { properties: { sheetId: 0, title: NAMES[0], gridProperties: { frozenRowCount: 1 } }, fields: 'title,gridProperties.frozenRowCount' } }]
      .concat(NAMES.slice(1).map(n => ({ addSheet: { properties: { title: n, gridProperties: { frozenRowCount: 1 } } } })));
    await G.json(`${SHT}/${ss.id}:batchUpdate`, 'POST', { requests: reqs });
    await G.json(`${SHT}/${ss.id}/values:batchUpdate`, 'POST', { valueInputOption: 'RAW', data: NAMES.map(n => ({ range: rng(n, 'A1'), values: [TABLES[n]] })) });
    return { id: ss.id, appProperties: ss.appProperties };
  }
  async function siapkan() {
    if (meta) return meta;
    const c = LS.get(metaKey(), null);
    if (c && c.id && c.sheets && c.head) { meta = c; return meta; }
    let f = await cariDb();
    if (!f) f = await buatDb();
    const info = await G.json(`${SHT}/${f.id}?fields=sheets.properties(sheetId,title)`);
    const sheets = {}; info.sheets.forEach(s => sheets[s.properties.title] = s.properties.sheetId);
    const missing = NAMES.filter(n => sheets[n] == null);
    if (missing.length) {
      const r = await G.json(`${SHT}/${f.id}:batchUpdate`, 'POST', { requests: missing.map(n => ({ addSheet: { properties: { title: n, gridProperties: { frozenRowCount: 1 } } } })) });
      r.replies.forEach((x, i) => sheets[missing[i]] = x.addSheet.properties.sheetId);
      await G.json(`${SHT}/${f.id}/values:batchUpdate`, 'POST', { valueInputOption: 'RAW', data: missing.map(n => ({ range: rng(n, 'A1'), values: [TABLES[n]] })) });
    }
    const ap = f.appProperties || {};
    meta = { id: f.id, folder: ap.folder || '', berkas: ap.berkas || ap.folder || '', mcu: ap.mcu || ap.folder || '', sheets, head: {} };
    LS.set(metaKey(), meta);
    return meta;
  }
  D.reset = () => { meta = null; LS.del(metaKey()); };
  D.dbUrl = () => { const m = meta || LS.get(metaKey(), null); return m && m.id ? 'https://docs.google.com/spreadsheets/d/' + m.id + '/edit' : ''; };

  // ======================= BACA =======================
  let cacheKred = [];
  async function bacaSemua() {
    const m = await siapkan();
    let r;
    try { r = await G.json(`${SHT}/${m.id}/values:batchGet?${NAMES.map(n => 'ranges=' + q(rng(n, 'A1:BZ'))).join('&')}&valueRenderOption=FORMATTED_VALUE`); }
    catch (e) { if (e.status === 404 || e.status === 400) { D.reset(); throw new Error('Database AlaraGo tidak ditemukan lagi di Drive. Muat ulang untuk memeriksa ulang.'); } throw e; }
    const all = {};
    r.valueRanges.forEach((vr, i) => {
      const n = NAMES[i], vals = vr.values || [], head = (vals[0] && vals[0].length ? vals[0] : TABLES[n]).map(String);
      m.head[n] = head;
      all[n] = vals.slice(1).map(row => { const o = {}; head.forEach((h, j) => { if (h) o[h] = row[j] == null ? '' : String(row[j]); }); return o; }).filter(o => o.id !== '' && o.id != null);
    });
    LS.set(metaKey(), m);
    return all;
  }
  async function versi() { const m = await siapkan(); const f = await G.json(`${DRV}/${m.id}?fields=modifiedTime`); return f.modifiedTime; }

  // ======================= LISENSI =======================
  let lisensi = PR.SS.get('ag_lic', null);
  async function ambilLisensi(force) {
    if (lisensi && !force && lisensi._t > Date.now() - 30 * 60000) return lisensi;
    try { const s = await R.masuk({ rs: (PR.db && PR.db.RS && PR.db.RS[0] || {}).nama || '' }); lisensi = Object.assign({}, s.lisensi, { _t: Date.now() }); PR.SS.set('ag_lic', lisensi); }
    catch (e) { if (!lisensi) lisensi = { paket: '—', status: 'aktif', offline: true, _t: 0 }; }
    return lisensi;
  }

  // ======================= TULIS =======================
  async function tulis(ops) {
    const m = await siapkan();
    const by = {};
    ops.forEach(op => { (by[op.t] = by[op.t] || { save: {}, remove: {} }); if (op.op === 'remove') { by[op.t].remove[String(op.id)] = 1; delete by[op.t].save[String(op.id)]; } else { by[op.t].save[String(op.row.id)] = op.row; delete by[op.t].remove[String(op.row.id)]; } });
    const ts = Object.keys(by).filter(t => TABLES[t]);
    if (!ts.length) return;
    // id & judul kolom terkini (1 panggilan) → aman bila PPR membuka di 2 perangkat
    const cur = await G.json(`${SHT}/${m.id}/values:batchGet?${ts.map(t => 'ranges=' + q(rng(t, 'A1:BZ1')) + '&ranges=' + q(rng(t, 'A:A'))).join('&')}`);
    const data = [], appends = [], dels = [];
    ts.forEach((t, i) => {
      let head = ((cur.valueRanges[i * 2].values || [])[0] || TABLES[t]).map(String);
      const ids = (cur.valueRanges[i * 2 + 1].values || []).map(r => String(r[0] == null ? '' : r[0]));
      const saves = Object.values(by[t].save).map(row => { const local = (PR.db[t] || []).find(x => String(x.id) === String(row.id)); return Object.assign({}, row, local || {}); });
      const extra = []; saves.forEach(r => Object.keys(r).forEach(k => { if (k && !k.startsWith('_') && head.indexOf(k) < 0 && extra.indexOf(k) < 0) extra.push(k); }));
      if (extra.length) { head = head.concat(extra); data.push({ range: rng(t, 'A1'), values: [head] }); }
      m.head[t] = head;
      const add = [];
      saves.forEach(r => {
        const v = head.map(h => { const x = r[h]; return x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x).slice(0, 49000); });
        const idx = ids.indexOf(String(r.id));
        if (idx > 0) data.push({ range: rng(t, 'A' + (idx + 1)), values: [v] }); else add.push(v);
      });
      if (add.length) appends.push({ t, rows: add });
      Object.keys(by[t].remove).forEach(id => { const idx = ids.indexOf(id); if (idx > 0) dels.push({ sheetId: m.sheets[t], i: idx }); });
    });
    if (data.length) await G.json(`${SHT}/${m.id}/values:batchUpdate`, 'POST', { valueInputOption: 'RAW', data });
    for (const a of appends) await G.json(`${SHT}/${m.id}/values/${q(rng(a.t, 'A1'))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', { values: a.rows });
    if (dels.length) await G.json(`${SHT}/${m.id}:batchUpdate`, 'POST', { requests: dels.sort((a, b) => b.i - a.i).map(d => ({ deleteDimension: { range: { sheetId: d.sheetId, dimension: 'ROWS', startIndex: d.i, endIndex: d.i + 1 } } })) });
    LS.set(metaKey(), m);
  }
  D.tulis = tulis;

  // ======================= BERKAS =======================
  async function unggah(file, name, mime, kind) {
    const m = await siapkan(), b = 'agb' + Date.now();
    const metaF = { name: String(name || 'berkas').slice(0, 120), parents: [kind === 'mcu' ? m.mcu : m.berkas].filter(Boolean), appProperties: { alarago: kind === 'mcu' ? 'mcu' : 'berkas' } };
    const body = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metaF)}\r\n--${b}\r\nContent-Type: ${mime || 'application/octet-stream'}\r\n\r\n`, file, `\r\n--${b}--`]);
    return G.fetch(`${UP}?uploadType=multipart&fields=id,name,size`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
  }
  async function unduh(id) {
    const [mt, blob] = await Promise.all([G.json(`${DRV}/${id}?fields=name,mimeType`), G.fetch(`${DRV}/${id}?alt=media`)]);
    return { nama: mt.name, mime: mt.mimeType, blob };
  }
  D.unduh = unduh;

  // ======================= TAUTAN & KREDENSIAL =======================
  const tb = n => (PR.db && PR.db[n]) || [];
  const kred = () => tb('Kredensial');
  const base = () => PR.appBase();
  D.linkAkses = c => `${base()}#/qr?r=${R.dep()}&p=${c.paket}&k=${c.kunci}`;
  D.linkTamu = c => `${base()}#/tamu?r=${R.dep()}&p=${c.paket}&k=${c.kunci}`;
  D.linkPintu = c => `${base()}#/pintu?r=${R.dep()}&d=${c.paket}`;
  function buatKred(id, jenis, ref, extra) {
    const old = kred().find(k => k.id === id);
    const c = Object.assign({ id, jenis, ref: ref || '', paket: K.acak(18), kunci: jenis === 'pintu' ? '' : K.acak(32), label: '', berlaku_sd: '', dicabut: '', dibuat: nowISO() }, extra || {});
    PR.api.save('Kredensial', c);
    return { c, old };
  }
  function kredBersama() { return kred().find(k => k.id === 'bersama') || buatKred('bersama', 'bersama').c; }

  // ======================= PAKET =======================
  const pick = (o, ks) => { const r = {}; ks.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
  const PUB_SET = ['batas_pengendalian', 'batas_supervisi', 'batas_umum', 'periode_survei_bulan', 'tanggal_mulai_operasi', 'ppr_nama', 'ppr_izin_no', 'ppr_izin_sd', 'dc_metode_seragam', 'tampil_nama_peninjau'];
  const pubSet = () => pick(PR.set || {}, PUB_SET);
  const rsAktif = () => tb('RS').filter(r => r.aktif !== 'tidak').map(r => pick(r, ['id', 'nama', 'instalasi', 'alamat']));
  const MAX_FILE = 3.4 * 1024 * 1024;
  async function siapkanBerkas(ids) {
    // berkas dienkripsi dengan kunci per-berkas lalu diunggah ke relay sekali saja
    const peta = {};
    for (const fid of [...new Set(ids.filter(Boolean))]) {
      let c = kred().find(k => k.id === 'f:' + fid);
      if (!c) {
        try {
          const f = await unduh(fid); if (f.blob.size > MAX_FILE) { peta[fid] = { besar: 1, nama: f.nama }; continue; }
          const kk = K.acak(32), paket = K.acak(18);
          const data = await K.kunciBytes(kk, new Uint8Array(await f.blob.arrayBuffer()));
          await R.sesi('terbit', { items: [{ id: paket, jenis: 'berkas', data }] });
          c = buatKred('f:' + fid, 'berkas', fid, { paket, kunci: kk, label: f.nama + '|' + f.mime }).c;
        } catch (e) { continue; }
      }
      const [nama, mime] = String(c.label).split('|');
      peta[fid] = { p: c.paket, k: c.kunci, nama, mime };
    }
    return peta;
  }
  function paketPekerja(w, bersama) {
    const dcs = tb('Pembatas_Dosis').filter(d => d.profesi === w.profesi || d.profesi === 'Semua profesi');
    return { v: 1, jenis: 'pekerja', dibuat: nowISO(), bersama: { p: bersama.paket, k: bersama.kunci },
      tables: { Pekerja: [pick(w, ['id', 'nama', 'npr', 'profesi', 'kategori', 'email', 'no_hp', 'metode', 'izin_bekerja_sd', 'pelatihan_terakhir'])],
        Dosis: tb('Dosis').filter(d => d.pekerja_id === w.id), MCU: tb('MCU').filter(m => m.pekerja_id === w.id).map(m => pick(m, ['id', 'pekerja_id', 'tanggal', 'faskes', 'kesimpulan', 'berlaku_sd', 'pembatasan'])),
        Pembatas_Dosis: dcs, Investigasi: tb('Investigasi').filter(x => x.pekerja_id === w.id), Baca_SOP: tb('Baca_SOP').filter(b => b.pekerja_id === w.id) } };
  }
  async function paketBersama() {
    const sops = tb('Dokumen').filter(d => d.jenis === 'terkendali' && d.kategori === 'SOP' && d.status === 'disahkan').map(d => pick(d, ['id', 'judul', 'nomor', 'revisi', 'status', 'tanggal_berlaku', 'tinjau_ulang', 'ringkasan', 'file_id', 'file_nama', 'file_ukuran', 'kategori', 'jenis']));
    const berkas = await siapkanBerkas(sops.map(s => s.file_id).concat(tb('Denah').map(d => d.file_id)));
    return { v: 1, jenis: 'bersama', berkas, settings: pubSet(), tables: { RS: rsAktif(), Ruangan: tb('Ruangan'), Alat: tb('Alat').map(a => pick(a, ['id', 'ruangan_id', 'merek', 'tipe', 'jenis'])),
      Alat_Ukur: tb('Alat_Ukur').map(a => pick(a, ['id', 'merek', 'tipe', 'no_seri', 'kal_sd', 'fk'])), Survei: tb('Survei'), Titik: tb('Titik'), Denah: tb('Denah'),
      Riwayat_Alat: tb('Riwayat_Alat').map(r => pick(r, ['id', 'alat_id', 'tanggal', 'memicu_survei'])), Dokumen: sops } };
  }
  function overDC() {
    const yr = today().slice(0, 4), sum = {}, res = {}, dcBy = {};
    tb('Dosis').forEach(d => { if (String(d.tahun) === yr) sum[d.pekerja_id] = (sum[d.pekerja_id] || 0) + PR.n(d.hp10); });
    tb('Pembatas_Dosis').forEach(d => dcBy[d.profesi] = PR.n(d.nilai));
    tb('Pekerja').forEach(w => { const dc = dcBy[w.profesi] || dcBy['Semua profesi']; if (dc && sum[w.id] > dc) res[w.id] = true; });
    return res;
  }
  async function paketPeninjau(mode, tamu) {
    const t = {}; NAMES.filter(n => ['Kredensial', 'Log', 'Pengaturan', 'Pengguna'].indexOf(n) < 0).forEach(n => t[n] = tb(n));
    t.MCU = tb('MCU').map(m => pick(m, ['id', 'pekerja_id', 'tanggal', 'berlaku_sd']));
    const flagged = mode === 'analisis' ? overDC() : {};
    t.Pekerja = tb('Pekerja').map((w, i) => { const show = mode === 'semua' || (mode === 'analisis' && flagged[w.id]); return { id: w.id, nama: show ? w.nama : 'Pekerja #' + (i + 1), npr: show ? w.npr : '', profesi: w.profesi, kategori: w.kategori, aktif: w.aktif, pelatihan_terakhir: w.pelatihan_terakhir, izin_bekerja_sd: w.izin_bekerja_sd }; });
    if (tamu) { delete t.Jadwal; delete t.Temuan; delete t.Inspeksi; t.Dokumen = tb('Dokumen').filter(d => d.status !== 'draf' && d.status !== 'tidak berlaku'); t.Investigasi = tb('Investigasi').map(x => pick(x, ['id', 'pekerja_id', 'tahun', 'jenis', 'status', 'tenggat'])); }
    const fids = []; (t.Dokumen || []).filter(d => d.status !== 'draf').forEach(d => fids.push(d.file_id));
    ['Denah', 'Kalibrasi', 'Alat_Ukur', 'Riwayat_Alat', 'Kegiatan'].forEach(n => (t[n] || []).forEach(r => fids.push(r.file_id)));
    tb('Titik').forEach(r => fids.push(r.foto_id)); tb('Perlengkapan').forEach(r => fids.push(r.foto_id));
    const berkas = await siapkanBerkas(fids);
    return { v: 1, jenis: tamu ? 'tamu' : 'peninjau', dibuat: nowISO(), berkas, settings: pubSet(), ppr: (PR.set || {}).ppr_nama || '', today: today(), tables: t };
  }

  // ======================= JADWAL & PINTU =======================
  const PRIBADI = /^(g|pel|sib|inv.*)$/;
  function aturan() { const def = {}; PR.L.CATS.forEach(([k]) => def[k] = { tahapan: D.TAHAP_DEF[k], kritis: D.KRITIS_DEF[k] }); try { return Object.assign(def, JSON.parse((PR.set || {}).pengingat || '{}')); } catch (e) { return def; } }
  D.TAHAP_DEF = { izin: [90, 30, 7], kalibrasi: [60, 14], mcu: [30, 7], tld: [14, 3], dokumen: [30], laporan: [60, 30], temuan: [14, 3] };
  D.KRITIS_DEF = { izin: 7, kalibrasi: 0, mcu: 0, tld: 0, dokumen: 0, laporan: 30, temuan: 3 };
  D.aturan = aturan;
  function jadwalRelay() {
    const a = aturan(), L = PR.L;
    const items = L.dueItems(today()).filter(i => i.days > -120).map(i => { const id = i.key.split(':')[1] || ''; const pr = PRIBADI.test(id);
      return { key: i.key, kat: i.cat, judul: pr && i.cat === 'tld' ? 'Tenggat rencana korektif investigasi dosis' : i.title, objek: pr ? '' : String(i.obj || '').slice(0, 80), due: i.due, tahapan: (a[i.cat] || {}).tahapan || [], kritis: (a[i.cat] || {}).kritis || 0, status: i.status || '' }; });
    const R0 = PR.L.readiness ? PR.L.readiness(today()) : null;
    return { rs: (rsAktif()[0] || {}).nama || '', jendela: +((PR.set || {}).rekap_jendela || 60), ringkas: { temuan_terbuka: tb('Temuan').filter(t => t.status !== 'ditutup').length, skor: R0 ? Math.round(R0.score * 100) : undefined }, items };
  }
  function statusPintu(ruangId) {
    const L = PR.L, r = L.get('Ruangan', ruangId) || {};
    const sv = tb('Survei').filter(s => s.ruangan_id === ruangId || (L.get('Alat', s.alat_id) || {}).ruangan_id === ruangId).sort((a, b) => String(b.tanggal).localeCompare(a.tanggal))[0];
    let status = 'belum disurvei';
    if (sv) { const st = L.surveiStatus ? L.surveiStatus(sv) : null; status = st === 'kritis' ? 'melebihi batas' : st === 'tinjau' ? 'perlu perhatian' : 'aman';
      const ulang = tb('Alat').filter(a => a.ruangan_id === ruangId).some(a => tb('Riwayat_Alat').some(h => h.alat_id === a.id && h.memicu_survei === 'ya' && h.tanggal > sv.tanggal)); if (ulang) status = 'survei ulang diperlukan'; }
    return { ruang: r.nama || '', lantai: r.lantai || '', klasifikasi: r.klasifikasi || '', status, tanggal: sv ? sv.tanggal : '' };
  }

  // ======================= TERBITKAN (debounce) =======================
  const HK = () => 'ag_pub_' + (D.email() || 'x');
  let running = false, again = false, tmr = null;
  D.terbitkanNanti = (ms) => { clearTimeout(tmr); tmr = setTimeout(() => D.terbitkan().catch(e => console.warn('terbit', e)), ms || 4000); };
  D.terbitkan = async (opts) => {
    if (running) { again = true; return; }
    if (!PR.db || !PR.db.Pekerja || !R.url()) return;
    if (lisensi && lisensi.status === 'berakhir') return;
    running = true;
    try {
      const hs = LS.get(HK(), {}), items = [], buang = [];
      const kirim = async (c, jenis, obj, extra) => { const h = await K.hash(JSON.stringify(obj)); if (hs[c.paket] === h && !(opts && opts.paksa === c.paket)) return; items.push(Object.assign({ id: c.paket, jenis, data: await K.kunci(c.kunci, obj) }, extra || {})); hs[c.paket] = h; };
      const pk = kred().filter(c => c.jenis === 'pekerja' && !c.dicabut);
      if (pk.length) {
        const b = kredBersama();
        await kirim(b, 'bersama', await paketBersama());
        for (const c of pk) { const w = PR.L.get('Pekerja', c.ref); if (!w || w.aktif === 'tidak') { buang.push(c); continue; } await kirim(c, 'pekerja', paketPekerja(w, b)); }
      }
      const rv = kred().filter(c => c.jenis === 'peninjau' && !c.dicabut);
      if (rv.length) {
        const pkg = await paketPeninjau((PR.set || {}).tampil_nama_peninjau || 'analisis');
        for (const c of rv) { const u = PR.L.get('Pengguna', c.ref); if (!u || u.status === 'nonaktif') { buang.push(c); continue; } await kirim(c, 'peninjau', Object.assign({}, pkg, { saya: { id: u.id, nama: u.nama, jabatan: u.jabatan } })); }
      }
      for (let i = 0; i < items.length; i += 8) await R.sesi('terbit', { items: items.slice(i, i + 8) });
      if (buang.length) { await R.sesi('hapusPaket', { ids: buang.map(c => c.paket) }).catch(() => { }); buang.forEach(c => PR.api.save('Kredensial', Object.assign({}, c, { dicabut: 'ya' }))); }
      // jadwal & pintu (tanpa data pribadi)
      const j = jadwalRelay(), hj = await K.hash(JSON.stringify(j));
      if (hs._jadwal !== hj) { await R.sesi('jadwal', { data: j }); hs._jadwal = hj; }
      const doors = kred().filter(c => c.jenis === 'pintu' && !c.dicabut).map(c => ({ id: c.paket, data: statusPintu(c.ref) }));
      if (doors.length) { const hp = await K.hash(JSON.stringify(doors)); if (hs._pintu !== hp) { await R.sesi('pintu', { rooms: doors }); hs._pintu = hp; } }
      LS.set(HK(), hs);
      D.terakhirTerbit = Date.now();
    } finally { running = false; if (again) { again = false; D.terbitkanNanti(1500); } }
  };

  // ======================= BALASAN (pekerja / peninjau) =======================
  D.prosesBalasan = async () => {
    if (!R.url() || !PR.db) return 0;
    const list = await R.sesi('balasan');
    if (!list.length) return 0;
    const byPaket = {}; kred().forEach(c => byPaket[c.paket] = c);
    const done = [], ubah = {}; let n = 0;
    const put = (t, row) => { (ubah[t] = ubah[t] || {})[row.id] = row; };
    for (const b of list) {
      const c = byPaket[b.paket_id]; done.push(b.id);
      if (!c) continue;
      let m; try { m = await K.buka(c.kunci, b.data); } catch (e) { continue; }
      if (c.jenis === 'pekerja') {
        const d = m.dosis_id && tb('Dosis').find(x => x.id === m.dosis_id && x.pekerja_id === c.ref);
        if (m.t === 'baca' && d && !d.dibaca_pada) { put('Dosis', Object.assign({}, d, { dibaca_pada: m.waktu || nowISO() })); n++; }
        if (m.t === 'catatan' && d) { put('Dosis', Object.assign({}, d, (ubah.Dosis || {})[d.id] || {}, { keterangan: String(m.teks || '').slice(0, 1000) })); n++; }
        if (m.t === 'sop') { const doc = PR.L.get('Dokumen', m.dokumen_id); if (doc) { put('Baca_SOP', { id: 'B' + c.ref + doc.id + String(doc.revisi || '').replace(/\W/g, ''), dokumen_id: doc.id, revisi: doc.revisi, pekerja_id: c.ref, waktu: m.waktu || nowISO() }); n++; } }
      }
      if (c.jenis === 'peninjau' && (m.t === 'setuju' || m.t === 'revisi')) {
        const u = PR.L.get('Pengguna', c.ref) || {};
        (m.ids || []).forEach(id => { const d = PR.L.get('Pembatas_Dosis', id); if (d && d.status === 'menunggu') { put('Pembatas_Dosis', Object.assign({}, d, { status: m.t === 'setuju' ? 'disetujui' : 'revisi', disetujui_oleh: m.t === 'setuju' ? (u.nama || 'Peninjau') : '', disetujui_pada: m.t === 'setuju' ? (m.waktu || nowISO()) : '', catatan_peninjau: m.catatan || '' })); n++; } });
      }
      put('Log', { id: 'L' + b.id, waktu: m.waktu || b.waktu, email: '', peran: c.jenis, aksi: { baca: 'baca dosis', catatan: 'keterangan dosis', sop: 'baca SOP', setuju: 'setujui DC', revisi: 'minta revisi DC' }[m.t] || m.t, objek: c.jenis === 'pekerja' ? ((PR.L.get('Pekerja', c.ref) || {}).nama || '') : ((PR.L.get('Pengguna', c.ref) || {}).nama || '') });
    }
    Object.keys(ubah).forEach(t => PR.api.saveMany(t, Object.values(ubah[t])));
    await R.sesi('hapusBalasan', { ids: done }).catch(() => { });
    return n;
  };
  D.sinkron = async () => {
    try { const n = await D.prosesBalasan(); if (n) { PR.toast(n + ' konfirmasi dari pekerja/peninjau dicatat', 'ok'); PR.rerender && PR.rerender(); } } catch (e) { console.warn('balasan', e); }
    D.terbitkanNanti(800);
  };

  // ======================= AKSI (meniru backend lama) =======================
  const A = {};
  A.bootstrap = async b => {
    const ver = await versi();
    const lic = await ambilLisensi();
    if (b.ver && b.ver === ver) return { notModified: true, license: lic };
    const all = await bacaSemua();
    const settings = {}; (all.Pengaturan || []).forEach(r => settings[r.id] = r.nilai);
    const me = { role: 'ppr', email: D.email(), nama: LS.get('ag_nama', '') || settings.ppr_nama || D.email() };
    const tamu = (all.Kredensial || []).filter(c => c.jenis === 'tamu').map(c => ({ id: c.id, berlaku_sd: c.berlaku_sd, dibuat: c.dibuat, dicabut: c.dicabut, label: c.label }));
    const kr = (all.Kredensial || []).filter(c => c.jenis === 'pekerja' && !c.dicabut).map(c => ({ id: c.ref, dibuat: c.dibuat }));
    setTimeout(D.sinkron, 1500);
    return { tables: all, settings, me, license: lic, today: today(), ver, tautan: tamu, log: (all.Log || []).slice(-300).reverse(), kredensial: kr };
  };
  A.batch = async b => {
    const lic = await ambilLisensi();
    if (lic && lic.status === 'berakhir') { const e = new Error('Langganan berakhir. Data tetap bisa dilihat dan diekspor; perpanjang untuk mengubah data.'); e.code = 'LICENSE_EXPIRED'; throw e; }
    await tulis(b.ops || []); D.terbitkanNanti();
    return { ver: '', n: (b.ops || []).length };
  };
  A.upload = async b => { const f = b.file || new Blob([K.unb64u(String(b.data || '').replace(/\+/g, '-').replace(/\//g, '_'))], { type: b.mime }); if (f.size > 15 * 1024 * 1024) throw new Error('Berkas terlalu besar (maks 15 MB)'); const r = await unggah(f, b.name, b.mime, b.kind); return { id: r.id, nama: r.name, ukuran: +r.size || f.size }; };
  A.getFile = async b => unduh(b.id);
  A.issueQR = async b => {
    const w = PR.L.get('Pekerja', b.id); if (!w) throw new Error('Pekerja tidak ditemukan');
    const { c, old } = buatKred('p:' + w.id, 'pekerja', w.id);
    if (old && old.paket) await R.sesi('hapusPaket', { ids: [old.paket] }).catch(() => { });
    await PR.api.flush(); await D.terbitkan({ paksa: c.paket });
    return { link: D.linkAkses(c) };
  };
  A.unlockWorker = async () => ({ info: 'PIN tersimpan di HP pekerja. Bila lupa PIN, buat QR baru.' });
  A.inviteReviewer = async b => {
    const u = PR.L.get('Pengguna', b.id); if (!u) throw new Error('Peninjau tidak ditemukan');
    const { c, old } = buatKred('r:' + u.id, 'peninjau', u.id);
    if (old && old.paket) await R.sesi('hapusPaket', { ids: [old.paket] }).catch(() => { });
    await PR.api.flush(); await D.terbitkan({ paksa: c.paket });
    return { link: D.linkAkses(c) };
  };
  A.createGuest = async b => {
    const days = Math.min(Math.max(+b.days || 7, 1), 30), sd = new Date(Date.now() + days * 864e5).toISOString();
    const { c } = buatKred('t:' + K.acak(6), 'tamu', '', { berlaku_sd: sd, label: b.label || '' });
    const pkg = await paketPeninjau('semua', true); pkg.berlaku_sd = sd;
    await R.sesi('terbit', { items: [{ id: c.paket, jenis: 'tamu', data: await K.kunci(c.kunci, pkg), berlaku_sd: sd }] });
    PR.extra.tautan = (PR.extra.tautan || []).concat([{ id: c.id, berlaku_sd: sd, dibuat: c.dibuat }]);
    return { link: D.linkTamu(c), id: c.id, berlaku_sd: sd };
  };
  A.revokeGuest = async b => { const c = kred().find(k => k.id === b.id); if (c) { await R.sesi('hapusPaket', { ids: [c.paket] }).catch(() => { }); PR.api.save('Kredensial', Object.assign({}, c, { dicabut: 'ya' })); } return { ok: true }; };
  A.doorLink = async b => { let c = kred().find(k => k.id === 'd:' + b.id && !k.dicabut); if (!c) { c = buatKred('d:' + b.id, 'pintu', b.id).c; await PR.api.flush(); await D.terbitkan(); } return { link: D.linkPintu(c) }; };
  A.syncCalendar = async () => { await D.terbitkan(); return { n: jadwalRelay().items.length }; };
  A.testEmail = async () => { await D.terbitkan(); const r = await R.sesi('ujiRekap'); return Object.assign({ to: D.email() }, r); };
  A.notifInfo = async () => { const s = await R.sesi('setelan', {}); return s; };
  A.notifSet = async b => R.sesi('setelan', b);
  A.license = async () => ambilLisensi(true);
  A.moveRS = async b => {
    const lic = await R.sesi('pindahRS', { rs: b.nama });
    const m = await siapkan();
    await G.json(`${DRV}/${m.id}`, 'PATCH', { name: 'AlaraGo — Arsip ' + ((rsAktif()[0] || {}).nama || 'RS lama') + ' ' + today(), appProperties: { alarago: 'arsip' } });
    D.reset(); LS.del(HK()); lisensi = null; PR.SS.del('ag_lic');
    await siapkan(); PR.db = {}; await tulis([{ op: 'save', t: 'RS', row: { id: 'RS1', nama: b.nama, instalasi: b.instalasi || '', alamat: b.alamat || '', aktif: 'ya', dibuat: nowISO() } }]);
    return { lisensi: lic };
  };
  D.handle = async (action, body) => {
    if (!A[action]) return { success: false, message: 'Aksi tidak tersedia: ' + action };
    try { return ok(await A[action](body || {})); }
    catch (e) { const r = { success: false, message: e.message, code: e.code === 'NO_SESSION' ? 'RELAY' : e.code }; if (e.network) { const er = new Error(e.message); er.network = true; throw er; } return r; }
  };

  // ======================= LOGIN PPR =======================
  D.login = async () => {
    await G.minta('select_account');
    const p = await G.profil();
    LS.set('ag_email', String(p.email || '').toLowerCase()); LS.set('ag_nama', p.name || '');
    meta = null; R.lupa();
    await siapkan();
    return { email: p.email, nama: p.name };
  };
  D.keluar = () => { G.keluar(); R.lupa(); meta = null; PR.SS.del('ag_lic'); lisensi = null; };
})(window.PR);
