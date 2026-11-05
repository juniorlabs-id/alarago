/* ProteRad — logika domain: dosis, pembatas dosis (Q3), survei, kesiapan inspeksi, jatuh tempo */
(function (PR) {
  'use strict';
  const L = PR.L = {};
  const T = () => PR.db || {};
  const S = () => PR.set || {};
  const NBD = () => (window.PR_CONFIG || {}).NBD || { pekerja_rata5: 20, pekerja_tahun: 50, pekerja_5tahun: 100 };
  L.NBD = NBD;
  const n = PR.n;

  L.tb = t => T()[t] || [];
  L.get = (t, id) => L.tb(t).find(r => String(r.id) === String(id));
  L.rs = () => L.tb('RS').find(r => r.aktif !== 'tidak') || {};
  L.alatName = a => a ? ([a.merek, a.tipe].filter(Boolean).join(' ') || a.no_seri || 'Alat') : '—';
  L.ruangName = id => (L.get('Ruangan', id) || {}).nama || '—';
  L.activeWorkers = () => L.tb('Pekerja').filter(w => w.aktif !== 'tidak');
  L.profesiList = () => [...new Set(L.activeWorkers().map(w => w.profesi).filter(Boolean))].sort();

  L.WAJIB = ['PPKR', 'SOP', 'Laporan Verifikasi Keselamatan', 'Program Jaminan Mutu', 'Daftar Inventaris', 'Logbook Pasien', 'Laporan Hasil Uji Kesesuaian', 'Logbook Perbaikan & Perawatan', 'Logbook Pengoperasian'];
  L.TERKENDALI = ['PPKR', 'SOP', 'Kajian Keselamatan Radiasi', 'Sistem Manajemen', 'Program Jaminan Mutu', 'Laporan Verifikasi Keselamatan'];
  L.KATEGORI = L.WAJIB.concat(['Kajian Keselamatan Radiasi', 'Sistem Manajemen', 'Izin Pemanfaatan', 'Sertifikat Uji Kesesuaian', 'Sertifikat Kalibrasi', 'Sertifikat Pelatihan', 'Lainnya']);
  L.PERLENGKAPAN = ['Apron', 'Lampu merah', 'Tanda radiasi', 'Peringatan bahaya radiasi', 'Peringatan wanita hamil', 'Tabir Pb + kaca intip', 'Dosimeter baca langsung', 'Pelindung gonad', 'Pelindung tiroid', 'Ukuran ruangan'];
  L.CEK_ISI = [['dasar_hukum', 'Dasar hukum mengacu peraturan terbaru'], ['dc', 'Nilai pembatas dosis sesuai data dosis pekerja'], ['tugas', 'Uraian tugas PPR dan fisikawan medis terpisah'], ['pendamping', 'SOP pendamping pasien sesuai Perba BAPETEN 4/2020']];

  // ============ DOSIS ============
  L.doses = (pid, yr) => L.tb('Dosis').filter(d => d.pekerja_id === pid && (yr == null || +d.tahun === +yr) && d.jenis_kegiatan !== 'dekomisioning' && d.jenis_kegiatan !== 'abnormal');
  L.quarters = (pid, yr) => { const q = {}; L.doses(pid, yr).forEach(d => { const k = +String(d.periode).replace(/\D/g, '') || 1; q[k] = q[k] ? { ...q[k], hp10: n(q[k].hp10) + n(d.hp10), hp3: n(q[k].hp3) + n(d.hp3) } : d; }); return q; };
  L.annual = (pid, yr) => PR.sum(L.doses(pid, yr).map(d => n(d.hp10)));
  L.annualLens = (pid, yr) => PR.sum(L.doses(pid, yr).map(d => n(d.hp3)));
  L.five = (pid, yr) => { yr = yr || PR.year(); let s = 0; for (let y = yr - 4; y <= yr; y++) s += L.annual(pid, y); return s; };
  L.latestPeriod = () => { let best = null; L.tb('Dosis').forEach(d => { const k = +d.tahun * 10 + (+String(d.periode).replace(/\D/g, '') || 0); if (!best || k > best) best = k; }); return best ? { tahun: Math.floor(best / 10), tw: best % 10 } : null; };

  L.dcValue = profesi => {
    const rows = L.tb('Pembatas_Dosis').filter(d => d.profesi === profesi || d.profesi === 'Semua profesi');
    const pick = rows.filter(r => r.status === 'disetujui').sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)))[0] || rows.sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)))[0];
    return pick && PR.has(pick.nilai) ? n(pick.nilai) : null;
  };
  L.doseStatus = (w, yr) => {
    yr = yr || PR.year();
    const sum = L.annual(w.id, yr), five = L.five(w.id, yr), dc = L.dcValue(w.profesi);
    const ref = dc || NBD().pekerja_rata5;
    const q = L.quarters(w.id, yr);
    const qOver = Object.values(q).some(r => n(r.hp10) > ref / 4);
    const ratio = sum / ref;
    let status = 'aman';
    if (sum > NBD().pekerja_tahun || five > NBD().pekerja_5tahun) status = 'kritis';
    else if (dc && sum > dc) status = 'analisis';
    else if (ratio >= 0.5 || qOver) status = 'tinjau';
    return { sum, five, dc, ref, ratio, status, lens: L.annualLens(w.id, yr), q };
  };
  L.STATUS_LABEL = { aman: 'Aman', tinjau: 'Tinjau', analisis: 'Analisis', kritis: 'Kritis' };
  L.doseTag = s => PR.tag(L.STATUS_LABEL[s] || s, s);
  L.missingQuarter = (w, yr) => {   // triwulan kosong di antara periode yang sudah ada datanya
    const lp = L.latestPeriod(); if (!lp) return [];
    const maxQ = +yr === lp.tahun ? lp.tw : (+yr < lp.tahun ? 4 : 0);
    const q = L.quarters(w.id, yr), miss = [];
    for (let i = 1; i <= maxQ; i++) if (!q[i]) miss.push(i);
    return miss;
  };

  // ============ PEMBATAS DOSIS (Pedoman Teknis BAPETEN Rev.1 2021) ============
  L.q3 = arr => {   // posisi 3(n+1)/4 + interpolasi linier
    const x = arr.slice().sort((a, b) => a - b), N = x.length; if (!N) return null;
    const pos = 3 * (N + 1) / 4;
    if (pos <= 1) return x[0]; if (pos >= N) return x[N - 1];
    const lo = Math.floor(pos), fr = pos - lo;
    return x[lo - 1] + fr * (x[lo] - x[lo - 1]);
  };
  L.masaOperasi = tgl => {
    if (!tgl) return { kat: null, tahun: null };
    const th = PR.days(tgl, PR.today()) / 365.25;
    return { kat: th <= 2 ? 1 : th < 4 ? 2 : 3, tahun: th };
  };
  L.METODE = { 1: '½ NBD (tahap desain)', 2: 'Dosis tahunan maksimum', 3: 'Kuartil ke-3 (Q3), interpolasi' };
  // dosis tahunan pekerja dengan aturan III.10.a: triwulan kosong diisi nilai tetangga yang lebih tinggi
  L.annualFilled = (pid, yr) => {
    const q = L.quarters(pid, yr), vals = [];
    for (let i = 1; i <= 4; i++) vals.push(q[i] ? n(q[i].hp10) : null);
    if (vals.every(v => v == null)) return null;
    return PR.sum(vals.map((v, i) => v != null ? v : Math.max(vals[i - 1] || 0, vals[i + 1] || 0)));
  };
  L.dcCalc = () => {
    const mo = L.masaOperasi(S().tanggal_mulai_operasi);
    const cy = PR.year();
    const allYears = [...new Set(L.tb('Dosis').map(d => +d.tahun))].filter(y => y < cy || L.activeWorkers().some(w => Object.keys(L.quarters(w.id, y)).length === 4)).sort();
    const years = allYears.slice(-5);
    const rows = L.profesiList().map(p => {
      const ws = L.activeWorkers().filter(w => w.profesi === p);
      const per = years.map(y => { const v = ws.map(w => L.annualFilled(w.id, y)).filter(x => x != null); return { y, mean: v.length ? PR.sum(v) / v.length : null, max: v.length ? Math.max(...v) : null }; });
      const series = per.filter(x => x.mean != null).map(x => x.mean);
      const rerata = series.length ? PR.sum(series) / series.length : null;
      const maks = series.length ? Math.max(...series) : null;
      const q3 = L.q3(series);
      let usulan = null, aturan = '';
      if (mo.kat === 1 || !series.length) { usulan = NBD().pekerja_rata5 / 2; aturan = mo.kat === 1 ? '½ NBD (masa operasi 1)' : 'Belum ada data — ½ NBD'; }
      else if (series.every(v => v < 1)) { usulan = 1; aturan = 'Semua data < 1 mSv → 1 mSv'; }
      else if (mo.kat === 2) { usulan = maks; aturan = 'Dosis tahunan maksimum'; }
      else { usulan = q3; aturan = 'Kuartil ke-3 (Q3)'; }
      return { profesi: p, n: ws.length, per, rerata, maks, q3, usulan: usulan != null ? Math.round(usulan * 100) / 100 : null, aturan };
    });
    const means = rows.filter(r => r.rerata != null);
    const margin = means.length > 1 ? Math.max(...means.map(r => r.rerata)) - Math.min(...means.map(r => r.rerata)) : null;
    const top = means.sort((a, b) => b.rerata - a.rerata)[0];
    return { mo, years, rows, margin, seragam: margin != null && margin <= 1 ? (top && top.usulan) : null, seragamDari: top && top.profesi };
  };

  // ============ SURVEI PAPARAN ============
  L.batas = k => { const v = S()['batas_' + String(k || 'umum').toLowerCase()]; return PR.has(v) ? n(v) : null; };
  L.corrected = (mentah, bg, fk) => { if (String(mentah).toUpperCase() === 'BG') return 'BG'; if (!PR.has(mentah)) return ''; return Math.max(0, (n(mentah) - n(bg)) * (PR.has(fk) ? n(fk) : 1)); };
  L.titikStatus = t => {
    if (String(t.terkoreksi).toUpperCase() === 'BG') return { status: 'bg', ratio: 0 };
    const lim = L.batas(t.klasifikasi); if (!PR.has(t.terkoreksi)) return { status: 'kosong', ratio: 0 };
    if (!lim) return { status: 'nobatas', ratio: 0, lim };
    const r = n(t.terkoreksi) / lim;
    return { status: r > 1 ? 'kritis' : r >= 0.8 ? 'tinjau' : 'aman', ratio: r, lim };
  };
  L.TITIK_LABEL = { aman: 'Aman', tinjau: 'Perlu perhatian', kritis: 'Melebihi batas', bg: 'BG', kosong: 'Belum diukur', nobatas: 'Batas belum diatur' };
  L.titikTag = s => s === 'bg' ? PR.tag('BG', 'netral', 1) : s === 'nobatas' ? PR.tag('batas belum diatur', 'dash', 1) : s === 'kosong' ? PR.tag('belum diukur', 'dash', 1) : PR.tag(L.TITIK_LABEL[s], s);
  L.titikOf = sid => L.tb('Titik').filter(t => t.survei_id === sid);
  L.surveiStatus = sv => { const st = L.titikOf(sv.id).map(L.titikStatus); const rank = { kritis: 3, tinjau: 2, aman: 1 }; let w = 'aman'; st.forEach(s => { if ((rank[s.status] || 0) > (rank[w] || 0)) w = s.status; }); return st.length ? w : 'kosong'; };
  L.lastSurvey = alatId => L.tb('Survei').filter(s => s.alat_id === alatId).sort((a, b) => String(b.tanggal).localeCompare(a.tanggal))[0];
  L.needResurvey = a => { const sv = L.lastSurvey(a.id); return L.tb('Riwayat_Alat').filter(h => h.alat_id === a.id && h.memicu_survei === 'ya' && (!sv || h.tanggal > sv.tanggal)).sort((x, y) => String(y.tanggal).localeCompare(x.tanggal))[0] || null; };
  L.meterOk = (m, ref) => m && m.kal_sd && PR.days(ref || PR.today(), m.kal_sd) >= 0;

  // ============ JATUH TEMPO ============
  L.CATS = [['izin', 'Izin & Ukes'], ['kalibrasi', 'Kalibrasi'], ['mcu', 'MCU'], ['tld', 'TLD & Dosis'], ['dokumen', 'Dokumen'], ['laporan', 'Laporan & SDM'], ['temuan', 'Temuan LHI']];
  L.STAGE = { izin: 90, kalibrasi: 60, mcu: 30, tld: 14, dokumen: 30, laporan: 60, temuan: 14 };
  L.lastMcu = pid => L.tb('MCU').filter(m => m.pekerja_id === pid).sort((a, b) => String(b.tanggal).localeCompare(a.tanggal))[0];
  L.dueItems = ref => {
    ref = ref || PR.today();
    const out = [], J = {}; L.tb('Jadwal').forEach(j => J[j.id] = j);
    const add = (cat, id, due, title, obj, route) => { if (!due) return; due = String(due).slice(0, 10); const key = cat + ':' + id + ':' + due; out.push({ key, cat, due, title, obj, route, days: PR.days(ref, due), status: (J[key] || {}).status || '', catatan: (J[key] || {}).catatan || '' }); };
    L.tb('Alat').forEach(a => { add('izin', 'iz' + a.id, a.izin_sd, 'Izin pemanfaatan ' + L.alatName(a), L.ruangName(a.ruangan_id), '#/inventaris/alat/' + a.id); add('izin', 'uk' + a.id, a.ukes_sd, 'Uji kesesuaian ' + L.alatName(a), L.ruangName(a.ruangan_id), '#/inventaris/alat/' + a.id); });
    L.tb('Alat_Ukur').forEach(m => add('kalibrasi', m.id, m.kal_sd, 'Kalibrasi surveimeter ' + [m.merek, m.tipe].join(' '), 'SN ' + (m.no_seri || '—'), '#/inventaris/alat-ukur'));
    const grp = {}; L.activeWorkers().forEach(w => { const m = L.lastMcu(w.id); const d = m ? m.berlaku_sd : null; if (d) (grp[d] = grp[d] || []).push(w.nama); });
    Object.keys(grp).forEach(d => add('mcu', 'g', d, `MCU ${grp[d].length} pekerja`, grp[d].slice(0, 3).join(', ') + (grp[d].length > 3 ? '…' : ''), '#/dosis/mcu'));
    add('laporan', 'sib', S().ppr_izin_sd, 'Izin Bekerja PPR (ajukan ≥30 hari sebelum habis)', S().ppr_nama || 'PPR', '#/pengaturan/regulasi');
    L.tb('Dokumen').filter(d => d.status !== 'tidak berlaku').forEach(d => { add('dokumen', d.id, d.berlaku_sd, 'Masa berlaku ' + d.judul, d.nomor, '#/arsip/dok/' + d.id); if (d.jenis === 'terkendali') add('dokumen', 't' + d.id, d.tinjau_ulang, 'Tinjau ulang ' + d.judul, d.nomor, '#/arsip/dok/' + d.id); });
    [['balis', 'Laporan tahunan B@LIS', 12], ['laporan_tugas', 'Laporan tugas PPR tahunan', 12], ['latihan', 'Latihan kedaruratan', 12]].forEach(([j, lbl, m]) => {
      const last = L.tb('Kegiatan').filter(k => k.jenis === j).sort((a, b) => String(b.tanggal).localeCompare(a.tanggal))[0];
      if (last) add('laporan', j, last.berlaku_sd || PR.addMonths(last.tanggal, m), lbl, 'Terakhir ' + PR.d(last.tanggal), '#/arsip/kegiatan');
    });
    const pel = {}; L.activeWorkers().forEach(w => { if (w.pelatihan_terakhir) { const d = PR.addMonths(w.pelatihan_terakhir, 60); (pel[d] = pel[d] || []).push(w.nama); } });
    Object.keys(pel).forEach(d => add('laporan', 'pel', d, `Pelatihan penyegaran ${pel[d].length} pekerja`, pel[d].slice(0, 3).join(', '), '#/dosis'));
    L.tb('Pembatas_Dosis').forEach(d => { if (d.berlaku_sd) add('tld', 'dc' + d.id, String(d.berlaku_sd).length === 4 ? d.berlaku_sd + '-12-31' : d.berlaku_sd, 'Kaji ulang pembatas dosis ' + d.profesi, 'Pedoman: 1× per masa izin', '#/dc'); });
    L.tb('Investigasi').filter(x => x.status !== 'selesai').forEach(x => add('tld', 'inv' + x.id, x.tenggat, 'Tenggat rencana korektif investigasi', (L.get('Pekerja', x.pekerja_id) || {}).nama, '#/dc'));
    // TLD: kirim ke lab H-7 akhir triwulan; hasil belum masuk >45 hari setelah triwulan
    const y = +ref.slice(0, 4), qn = PR.quarter(ref), qEnd = q => `${y}-${String(q * 3).padStart(2, '0')}-${q === 1 || q === 4 ? '31' : '30'}`;
    if (L.activeWorkers().length) add('tld', 'kirim' + y + qn, qEnd(qn), `Ganti & kirim TLD TW${qn} ${y} ke laboratorium`, L.activeWorkers().length + ' dosimeter', '#/dosis/impor');
    const pq = qn === 1 ? 4 : qn - 1, py = qn === 1 ? y - 1 : y;
    const pqEnd = qn === 1 ? `${py}-12-31` : qEnd(pq);
    const has = L.tb('Dosis').some(d => +d.tahun === py && (+String(d.periode).replace(/\D/g, '')) === pq);
    if (!has && L.activeWorkers().length && L.tb('Dosis').length) add('tld', 'hasil' + py + pq, PR.addDays(pqEnd, 45), `Hasil TLD TW${pq} ${py} belum masuk`, 'Hubungi laboratorium dosimetri', '#/dosis/impor');
    L.tb('Temuan').filter(t => t.status !== 'ditutup').forEach(t => add('temuan', t.id, t.batas_tl, 'Batas tindak lanjut temuan ' + (t.kode || ''), String(t.uraian || '').slice(0, 60), '#/inspeksi/tl'));
    return out.sort((a, b) => a.days - b.days);
  };

  // ============ KESIAPAN INSPEKSI ============
  L.WEIGHT = { kritis: 3, penting: 2, pendukung: 1 };
  L.readiness = ref => {
    ref = ref || PR.today();
    const left = sd => sd ? PR.days(ref, sd) : null;
    const alat = L.tb('Alat'), ws = L.activeWorkers(), cy = +ref.slice(0, 4);
    const ratioItems = (arr, fn) => { if (!arr.length) return null; let v = 0, zero = 0, soon = 0; arr.forEach(x => { const r = fn(x); v += r.v; if (r.v === 0) zero++; if (r.soon) soon++; }); return { v: v / arr.length, zero, soon, ok: arr.filter(x => fn(x).v === 1).length, total: arr.length }; };
    const validity = (sd, proses) => { const d = left(sd); if (!sd) return { v: 0 }; if (d < 0) return { v: proses ? 0.5 : 0 }; return { v: 1, soon: d <= 30 }; };
    const docs = L.tb('Dokumen').filter(d => d.status !== 'tidak berlaku' && d.status !== 'draf');
    const docOf = k => docs.filter(d => d.kategori === k).sort((a, b) => String(b.tanggal_berlaku).localeCompare(a.tanggal_berlaku))[0];
    const ppkr = docOf('PPKR');
    const cek = ppkr ? (() => { try { return JSON.parse(ppkr.cek_isi || '{}'); } catch (e) { return {}; } })() : {};
    const lp = L.latestPeriod();
    const kegLast = j => L.tb('Kegiatan').filter(k => k.jenis === j).sort((a, b) => String(b.tanggal).localeCompare(a.tanggal))[0];
    const within = (d, months) => d && PR.days(ref, PR.addMonths(d, months)) >= 0;
    const rooms = L.tb('Ruangan');
    const perl = L.tb('Perlengkapan');
    const sec = [];
    const S1 = [], S2 = [], S3 = [], S4 = [], S5 = [], S6 = [], S7 = [], S8 = [];
    const item = (arr, code, label, level, r, route, detail) => { if (r == null) { arr.push({ code, label, level, na: true, v: 0, route, detail: detail || 'Belum ada data' }); return; } arr.push({ code, label, level, v: r.v, soon: r.soon, gate: level === 'kritis' && (r.zero > 0 || r.v === 0), route, detail: detail || (r.total != null ? `${r.ok}/${r.total} sesuai` : '') }); };

    item(S1, '1.1', 'Izin pemanfaatan setiap alat berlaku', 'kritis', ratioItems(alat, a => validity(a.izin_sd, a.izin_status === 'perpanjangan')), '#/inventaris');
    item(S1, '1.2', 'Uji kesesuaian setiap alat berlaku', 'kritis', ratioItems(alat, a => validity(a.ukes_sd, a.ukes_status === 'dijadwalkan')), '#/inventaris');
    item(S1, '1.3', 'Alat terdaftar di BALIS', 'penting', ratioItems(alat, a => ({ v: a.status_balis === 'terdaftar' ? 1 : a.status_balis === 'proses' ? 0.5 : 0 })), '#/inventaris');

    item(S2, '2.1', 'Izin Bekerja PPR berlaku', 'kritis', S().ppr_izin_sd ? Object.assign(validity(S().ppr_izin_sd), { zero: validity(S().ppr_izin_sd).v === 0 ? 1 : 0 }) : { v: 0, zero: 1 }, '#/pengaturan/regulasi', S().ppr_izin_sd ? 's.d. ' + PR.d(S().ppr_izin_sd) : 'Masa berlaku belum diisi');
    item(S2, '2.2', 'Data pekerja radiasi lengkap (NPR & profesi)', 'penting', ratioItems(ws, w => ({ v: w.npr && w.profesi ? 1 : 0 })), '#/dosis');
    item(S2, '2.3', 'Uraian tugas PPR & fisikawan medis terpisah', 'penting', ppkr ? { v: cek.tugas ? 1 : 0 } : { v: 0 }, '#/arsip/terkendali', ppkr ? (cek.tugas ? 'Dicek di PPKR' : 'Belum dicek di PPKR') : 'PPKR belum diunggah');

    item(S3, '3.1', 'Data TLD periode terakhir lengkap', 'penting', lp ? ratioItems(ws, w => ({ v: L.tb('Dosis').some(d => d.pekerja_id === w.id && +d.tahun === lp.tahun && +String(d.periode).replace(/\D/g, '') === lp.tw) ? 1 : 0 })) : null, '#/dosis/impor', lp ? `TW${lp.tw} ${lp.tahun}` : null);
    const intv = ws.filter(w => w.kategori === 'intervensional');
    item(S3, '3.2', 'TLD lensa mata pekerja intervensional', 'penting', intv.length && lp ? ratioItems(intv, w => ({ v: L.tb('Dosis').some(d => d.pekerja_id === w.id && +d.tahun === lp.tahun && PR.has(d.hp3)) ? 1 : 0 })) : intv.length ? null : { v: 1, total: 0, ok: 0 }, '#/dosis', intv.length ? null : 'Tidak ada pekerja intervensional');
    const over = ws.filter(w => { const s = L.doseStatus(w, cy); return s.status === 'analisis' || s.status === 'kritis'; });
    item(S3, '3.3', 'Investigasi untuk dosis melebihi pembatas/NBD', 'kritis', over.length ? ratioItems(over, w => ({ v: L.tb('Investigasi').some(x => x.pekerja_id === w.id && +x.tahun === cy) ? 1 : 0 })) : { v: 1, total: 0, ok: 0 }, '#/dc', over.length ? null : 'Tidak ada dosis melebihi pembatas');
    const profs = L.profesiList();
    item(S3, '3.4', 'Pembatas dosis ditetapkan & disetujui', 'penting', profs.length ? ratioItems(profs, p => { const r = L.tb('Pembatas_Dosis').filter(d => d.profesi === p || d.profesi === 'Semua profesi'); return { v: r.some(d => d.status === 'disetujui') ? 1 : r.length ? 0.5 : 0 }; }) : null, '#/dc');
    item(S3, '3.5', 'Pekerja mengonfirmasi kartu dosis', 'pendukung', lp ? ratioItems(L.tb('Dosis').filter(d => +d.tahun === lp.tahun && +String(d.periode).replace(/\D/g, '') === lp.tw), d => ({ v: d.dibaca_pada ? 1 : 0 })) : null, '#/dosis');

    item(S4, '4.1', 'MCU setiap pekerja berlaku (≤ 12 bulan)', 'penting', ratioItems(ws, w => { const m = L.lastMcu(w.id); return m ? validity(m.berlaku_sd || PR.addMonths(m.tanggal, 12)) : { v: 0 }; }), '#/dosis/mcu');

    item(S5, '5.1', 'Checklist 10 perlengkapan per ruangan', 'penting', rooms.length ? ratioItems(rooms, r => { const it = perl.filter(p => p.ruangan_id === r.id); const ok = L.PERLENGKAPAN.filter(k => it.some(p => p.item === k && (p.status === 'ada' || p.status === 'tidak perlu'))).length; return { v: ok / L.PERLENGKAPAN.length }; }) : null, '#/inventaris/perlengkapan');
    item(S5, '5.2', 'Foto bukti perlengkapan', 'pendukung', perl.filter(p => p.status === 'ada').length ? ratioItems(perl.filter(p => p.status === 'ada'), p => ({ v: p.foto_id ? 1 : 0 })) : null, '#/inventaris/perlengkapan');

    const per = +(S().periode_survei_bulan || 12);
    item(S6, '6.1', `Survei paparan setiap alat ≤ ${per} bulan`, 'penting', ratioItems(alat, a => { const s = L.lastSurvey(a.id); return { v: s && within(s.tanggal, per) ? 1 : 0 }; }), '#/survei');
    item(S6, '6.2', 'Survei ulang setelah perbaikan/renovasi', 'penting', ratioItems(alat, a => ({ v: L.needResurvey(a) ? 0 : 1 })), '#/survei');
    const hi = L.tb('Titik').filter(t => L.titikStatus(t).status === 'kritis');
    item(S6, '6.3', 'Titik melebihi batas punya tindak lanjut', 'penting', hi.length ? ratioItems(hi, t => ({ v: t.tindak_lanjut ? 1 : 0 })) : { v: 1, total: 0, ok: 0 }, '#/survei', hi.length ? null : 'Tidak ada titik melebihi batas');
    item(S6, '6.4', 'Surveimeter terkalibrasi', 'penting', ratioItems(L.tb('Alat_Ukur'), m => validity(m.kal_sd)), '#/inventaris/alat-ukur');
    item(S6, '6.5', 'Batas laju dosis RS ditetapkan', 'pendukung', { v: ['pengendalian', 'supervisi', 'umum'].filter(k => L.batas(k)).length / 3 }, '#/pengaturan/regulasi');

    item(S7, '7.1', 'PPKR berlaku & disahkan', 'kritis', ppkr ? Object.assign({ v: ppkr.status === 'disahkan' ? (ppkr.berlaku_sd && left(ppkr.berlaku_sd) < 0 ? 0 : 1) : 0.5 }, { zero: ppkr.status === 'disahkan' ? 0 : 0 }) : { v: 0, zero: 1 }, '#/arsip/terkendali', ppkr ? `${ppkr.nomor || ''} rev ${ppkr.revisi || '—'}` : 'PPKR belum diunggah');
    item(S7, '7.2', '9 dokumen wajib tersedia', 'penting', ratioItems(L.WAJIB, k => ({ v: k === 'Daftar Inventaris' ? (alat.length ? 1 : 0) : docOf(k) ? 1 : 0 })), '#/arsip');
    const ctrl = docs.filter(d => d.jenis === 'terkendali');
    item(S7, '7.3', 'Dokumen terkendali tidak lewat jadwal tinjau ulang', 'penting', ctrl.length ? ratioItems(ctrl, d => ({ v: !d.tinjau_ulang || left(d.tinjau_ulang) >= 0 ? 1 : 0 })) : null, '#/arsip/terkendali');
    item(S7, '7.4', 'Isi PPKR/SOP sudah dicek', 'penting', ppkr ? { v: L.CEK_ISI.filter(c => cek[c[0]]).length / L.CEK_ISI.length } : null, '#/arsip/terkendali');
    const sops = docs.filter(d => d.kategori === 'SOP' && d.status === 'disahkan');
    item(S7, '7.5', 'SOP terbaru dibaca pekerja', 'pendukung', sops.length && ws.length ? { v: PR.sum(sops.map(s => ws.filter(w => L.tb('Baca_SOP').some(b => b.dokumen_id === s.id && b.pekerja_id === w.id && String(b.revisi) === String(s.revisi))).length)) / (sops.length * ws.length) } : null, '#/arsip/baca');

    const kv = (j, m) => { const k = kegLast(j); return k ? { v: within(k.tanggal, m) ? 1 : 0, soon: PR.days(ref, PR.addMonths(k.tanggal, m)) <= 30 } : { v: 0 }; };
    item(S8, '8.1', 'Laporan tahunan B@LIS ≤ 1 tahun', 'penting', kv('balis', 12), '#/arsip/kegiatan');
    item(S8, '8.2', 'Laporan tugas PPR tahunan', 'penting', kv('laporan_tugas', 12), '#/arsip/kegiatan');
    item(S8, '8.3', 'Pelatihan penyegaran ≤ 5 tahun', 'penting', ratioItems(ws, w => ({ v: within(w.pelatihan_terakhir, 60) ? 1 : 0 })), '#/dosis');
    item(S8, '8.4', 'Latihan kedaruratan ≤ 1 tahun', 'pendukung', kv('latihan', 12), '#/arsip/kegiatan');
    item(S8, '8.5', 'Rekaman paparan tidak disengaja (termasuk nihil)', 'pendukung', { v: L.tb('Kegiatan').some(k => k.jenis === 'paparan_tidak_disengaja' && PR.days(k.tanggal, ref) <= 366) ? 1 : 0 }, '#/arsip/kegiatan');

    const titles = ['Kondisi Perizinan', 'Ketersediaan SDM', 'Pemantauan Dosis Pekerja', 'Pemantauan Kesehatan', 'Peralatan Keselamatan', 'Paparan Daerah Kerja', 'Dokumen & Rekaman', 'Pelaporan & Pelatihan'];
    [S1, S2, S3, S4, S5, S6, S7, S8].forEach((items, i) => {
      const valid = items.filter(x => !x.na);
      const w = PR.sum(valid.map(x => L.WEIGHT[x.level])), got = PR.sum(valid.map(x => L.WEIGHT[x.level] * x.v));
      const lv = items.some(x => x.level === 'kritis') ? 'kritis' : 'penting';
      sec.push({ no: i + 1, title: titles[i], items, w, got, pct: w ? got / w : 0, level: lv });
    });
    const W = PR.sum(sec.map(s => s.w)), G = PR.sum(sec.map(s => s.got));
    const raw = W ? G / W : 0;
    const gates = sec.flatMap(s => s.items.filter(x => x.gate));
    const score = gates.length ? Math.min(raw, 0.59) : raw;
    const label = score >= 0.9 ? 'Siap' : score >= 0.7 ? 'Hampir siap' : 'Belum siap';
    const fixes = sec.flatMap(s => s.items.filter(x => !x.na && x.v < 1).map(x => ({ ...x, sec: s.no, impact: W ? L.WEIGHT[x.level] * (1 - x.v) / W : 0 }))).sort((a, b) => (b.gate - a.gate) || b.impact - a.impact);
    return { score, raw, label, kind: score >= 0.9 ? 'aman' : score >= 0.7 ? 'tinjau' : 'kritis', gates, sections: sec, fixes, ref };
  };

  // ============ CEK KONSISTENSI DATA ============
  L.consistency = () => {
    const out = [], ws = L.activeWorkers(), lp = L.latestPeriod();
    if (lp) { const miss = ws.filter(w => !L.tb('Dosis').some(d => d.pekerja_id === w.id && +d.tahun === lp.tahun && +String(d.periode).replace(/\D/g, '') === lp.tw)); if (miss.length) out.push({ msg: `${miss.length} pekerja tanpa data dosis TW${lp.tw} ${lp.tahun}: ${miss.slice(0, 3).map(w => w.nama).join(', ')}${miss.length > 3 ? '…' : ''}`, route: '#/dosis/impor', act: 'Isi data' }); }
    const noMcu = ws.filter(w => !L.lastMcu(w.id)); if (noMcu.length) out.push({ msg: `${noMcu.length} pekerja belum punya data MCU`, route: '#/dosis/mcu', act: 'Catat MCU' });
    const names = PR.groupBy(ws, w => String(w.nama).toLowerCase().replace(/[^a-z]/g, '')); Object.values(names).filter(g => g.length > 1).forEach(g => out.push({ msg: `Nama ganda/mirip: ${g.map(w => w.nama).join(' · ')}`, route: '#/dosis', act: 'Periksa' }));
    const npr = PR.groupBy(ws.filter(w => w.npr), w => w.npr); Object.values(npr).filter(g => g.length > 1).forEach(g => out.push({ msg: `NPR sama dipakai ${g.length} pekerja (${g[0].npr})`, route: '#/dosis', act: 'Periksa' }));
    L.tb('Alat').filter(a => !a.no_izin || !a.izin_sd).forEach(a => out.push({ msg: `${L.alatName(a)}: nomor/masa berlaku izin kosong`, route: '#/inventaris/alat/' + a.id, act: 'Lengkapi' }));
    if (!S().ppr_izin_sd) out.push({ msg: 'Masa berlaku Izin Bekerja PPR belum diisi', route: '#/pengaturan/regulasi', act: 'Isi' });
    L.tb('Ruangan').forEach(r => { const it = L.tb('Perlengkapan').filter(p => p.ruangan_id === r.id); const miss = L.PERLENGKAPAN.filter(k => !it.some(p => p.item === k && (p.status === 'ada' || p.status === 'tidak perlu'))); if (miss.length && miss.length < L.PERLENGKAPAN.length) out.push({ msg: `${r.nama}: ${miss.slice(0, 2).join(', ')}${miss.length > 2 ? ' +' + (miss.length - 2) : ''} belum ada`, route: '#/inventaris/perlengkapan?r=' + r.id, act: 'Lengkapi' }); });
    L.tb('Alat').forEach(a => { const h = L.needResurvey(a); if (h) out.push({ msg: `${L.alatName(a)}: ${h.jenis} ${PR.d(h.tanggal)} — survei ulang diperlukan`, route: '#/survei', act: 'Input survei', crit: true }); });
    const dcs = L.tb('Pembatas_Dosis'), ppkr = L.tb('Dokumen').find(d => d.kategori === 'PPKR' && d.status === 'disahkan');
    if (dcs.length && ppkr) { let c = {}; try { c = JSON.parse(ppkr.cek_isi || '{}'); } catch (e) { } if (!c.dc) out.push({ msg: 'Nilai pembatas dosis di PPKR belum dicocokkan dengan hasil perhitungan', route: '#/arsip/dok/' + ppkr.id, act: 'Cek isi' }); }
    return out;
  };

  // ============ GRAFIK SVG ============
  L.barChart = (bars, opt) => {
    opt = opt || {}; const W = opt.w || 560, H = opt.h || 200, pl = 36, pb = 24, pt = 14, pr = 64;
    const lines = opt.lines || [];
    const max = Math.max(1e-9, ...bars.map(b => b.v || 0), ...lines.map(l => l.v)) * 1.15;
    const bw = (W - pl - pr) / Math.max(bars.length, 1);
    const y = v => H - pb - (v / max) * (H - pb - pt);
    const ticks = 4; let g = '';
    for (let i = 0; i <= ticks; i++) { const v = max / ticks * i; g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#EEF0F3"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${PR.f(v, v < 10 ? 1 : 0)}</text>`; }
    bars.forEach((b, i) => {
      const x = pl + i * bw + bw * 0.2, h = Math.max(0, H - pb - y(b.v || 0));
      g += `<rect x="${x}" y="${y(b.v || 0)}" width="${bw * 0.6}" height="${h}" fill="${b.c || '#9AA0A8'}" ${b.hl ? 'stroke="#121212" stroke-width="1.5"' : ''}/>`;
      g += `<text x="${x + bw * 0.3}" y="${y(b.v || 0) - 4}" text-anchor="middle" style="fill:#121212;font-weight:600">${b.v != null && b.v !== '' ? PR.f(b.v) : '—'}</text>`;
      g += `<text x="${x + bw * 0.3}" y="${H - 8}" text-anchor="middle">${PR.esc(b.l)}</text>`;
    });
    lines.forEach(l => { g += `<line x1="${pl}" x2="${W - pr}" y1="${y(l.v)}" y2="${y(l.v)}" stroke="${l.c}" stroke-width="${l.w || 1.5}" ${l.dash ? 'stroke-dasharray="5 4"' : ''}/><text x="${W - pr + 4}" y="${y(l.v) + 3}" style="fill:${l.c};font-weight:600">${PR.esc(l.label)}</text>`; });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${PR.esc(opt.label || 'Grafik')}">${g}<line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="#121212"/></svg>`;
  };
  L.lineChart = (pts, opt) => {
    opt = opt || {}; const W = opt.w || 560, H = opt.h || 200, pl = 36, pb = 24, pt = 14, pr = 70;
    const lines = opt.lines || []; const vals = pts.map(p => p.v).filter(v => v != null);
    const max = Math.max(1e-9, ...vals, ...lines.map(l => l.v)) * 1.15;
    const x = i => pl + (pts.length > 1 ? i * (W - pl - pr) / (pts.length - 1) : (W - pl - pr) / 2);
    const y = v => H - pb - (v / max) * (H - pb - pt);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = max / 4 * i; g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#EEF0F3"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${PR.f(v, v < 10 ? 1 : 0)}</text>`; }
    if (opt.band) g += `<rect x="${pl}" width="${W - pl - pr}" y="${y(opt.band[1])}" height="${y(opt.band[0]) - y(opt.band[1])}" fill="#EEF0F3"/>`;
    lines.forEach(l => { g += `<line x1="${pl}" x2="${W - pr}" y1="${y(l.v)}" y2="${y(l.v)}" stroke="${l.c}" stroke-width="${l.w || 1.5}" ${l.dash ? 'stroke-dasharray="5 4"' : ''}/><text x="${W - pr + 4}" y="${y(l.v) + 3}" style="fill:${l.c};font-weight:600">${PR.esc(l.label)}</text>`; });
    const path = pts.map((p, i) => p.v == null ? '' : `${x(i)},${y(p.v)}`).filter(Boolean);
    if (path.length > 1) g += `<polyline points="${path.join(' ')}" fill="none" stroke="#121212" stroke-width="1.75"/>`;
    pts.forEach((p, i) => { if (p.v != null) g += `<rect x="${x(i) - 4}" y="${y(p.v) - 4}" width="8" height="8" fill="${p.c || '#121212'}"/><text x="${x(i)}" y="${y(p.v) - 9}" text-anchor="middle" style="fill:#121212">${PR.f(p.v)}</text>`; g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${PR.esc(p.l)}</text>`; });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${PR.esc(opt.label || 'Grafik')}">${g}<line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="#121212"/></svg>`;
  };
  L.STATUS_COLOR = { aman: '#1F8A4C', tinjau: '#C9850F', analisis: '#B23A0B', kritis: '#C92A2A', bg: '#9AA0A8', kosong: '#D6D9DE', nobatas: '#5B616B' };
})(window.PR);
