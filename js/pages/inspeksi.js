/* ProteRad — W-14 Siap Inspeksi, W-15 Tindak lanjut LHI, Mode Inspeksi, isi paket per bagian LHI */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const st = { ref: null, tl: 'semua', open: {} };
  const ST = [['terbuka', 'Terbuka'], ['dalam proses', 'Dalam proses'], ['bukti siap', 'Bukti siap'], ['diunggah', 'Diunggah ke TLHI'], ['ditutup', 'Ditutup']];
  const valTag = x => x.na ? PR.tag('n/a', 'dash', 1) : x.v >= 1 ? (x.soon ? PR.tag('≤ 30 hari', 'tinjau') : PR.tag('sesuai', 'aman')) : x.v >= 0.5 ? PR.tag(Math.round(x.v * 100) + '%', 'tinjau') : PR.tag(x.v > 0 ? Math.round(x.v * 100) + '%' : 'belum', 'kritis');

  // ========== isi paket per bagian LHI (dipakai: mode inspeksi, tamu, cetak) ==========
  const P = PR.pkg = {};
  P.TITLES = ['Kondisi Perizinan', 'Ketersediaan SDM', 'Pemantauan Dosis Pekerja', 'Pemantauan Kesehatan', 'Peralatan Keselamatan', 'Paparan Daerah Kerja', 'Dokumen & Rekaman', 'Pelaporan & Pelatihan'];
  const docList = (ds, guest) => ds.length ? `<div class="stack" style="gap:0">${ds.map(d => `<div class="list-row">${PR.ic('file-text')}<div class="grow"><b>${PR.esc(d.judul || d.kategori)}</b><span class="mono">${PR.esc(d.nomor || '')}${d.revisi ? ' · rev ' + PR.esc(d.revisi) : ''}${d.file_ukuran ? ' · ' + Math.round(PR.n(d.file_ukuran) / 1024) + ' KB' : ''}${d.tanggal_berlaku ? ' · ' + PR.d(d.tanggal_berlaku) : ''}</span></div>${d.file_id ? `<button class="btn btn-s no-print" data-act="openFile" data-id="${d.file_id}">${PR.ic('eye')}Buka berkas</button>` : '<span class="small muted">berkas belum diunggah</span>'}</div>`).join('')}</div>` : '<p class="small muted">Belum ada dokumen pendukung.</p>';
  P.section = no => {
    const docs = L.tb('Dokumen').filter(d => d.status !== 'tidak berlaku' && d.status !== 'draf'), cy = PR.year();
    const h = (t, sub) => `<h3 class="mt" style="text-transform:uppercase">${t}</h3>${sub ? `<p class="small muted" style="margin:4px 0 8px">${sub}</p>` : ''}`;
    switch (no) {
      case 1: return h('Tabel 1 · Izin pemanfaatan & uji kesesuaian') + U.table([{ h: 'Ruangan', v: a => PR.esc(L.ruangName(a.ruangan_id)) }, { h: 'Jenis & merek', v: a => `${PR.esc(L.alatName(a))}<span class="sub">${PR.esc(a.jenis || '')}</span>` }, { h: 'No. seri', v: a => `<span class="num">${PR.esc(a.no_seri || '')}</span>` }, { h: 'No. izin', v: a => `<span class="num small">${PR.esc(a.no_izin || '—')}</span>` }, { h: 'Izin s.d.', v: a => `<span class="num">${PR.d(a.izin_sd)}</span> ${PR.validTag(a.izin_sd, a.izin_status === 'perpanjangan')}` }, { h: 'Uji kesesuaian s.d.', v: a => `<span class="num">${PR.d(a.ukes_sd)}</span> ${PR.validTag(a.ukes_sd, a.ukes_status === 'dijadwalkan')}` }, { h: 'BALIS', v: a => PR.esc(a.status_balis || '—') }], L.tb('Alat'))
        + h('Dokumen pendukung') + docList(docs.filter(d => d.kategori === 'Izin Pemanfaatan' || d.kategori === 'Sertifikat Uji Kesesuaian'));
      case 2: return `<div class="kv2 mt"><div><small>Petugas Proteksi Radiasi</small>${PR.esc(PR.set.ppr_nama || '—')}</div><div><small>No. Izin Bekerja PPR</small><span class="mono">${PR.esc(PR.set.ppr_izin_no || '—')}</span></div><div><small>Berlaku s.d.</small>${PR.d(PR.set.ppr_izin_sd)} ${PR.validTag(PR.set.ppr_izin_sd)}</div><div><small>Jumlah pekerja radiasi</small>${L.activeWorkers().length}</div></div>`
        + h('Tabel 2 · Pekerja radiasi') + U.table([{ h: 'No', v: (w, i) => i + 1 }, { h: 'Nama', v: w => PR.esc(w.nama) }, { h: 'NPR', v: w => `<span class="num">${PR.esc(w.npr || '')}</span>` }, { h: 'Profesi', v: w => PR.esc(w.profesi || '') }, { h: 'Kategori', v: w => PR.esc(w.kategori || '') }, { h: 'Pelatihan terakhir', v: w => `<span class="num">${PR.d(w.pelatihan_terakhir)}</span>` }, { h: 'Izin bekerja s.d.', v: w => w.izin_bekerja_sd ? `<span class="num">${PR.d(w.izin_bekerja_sd)}</span>` : '—' }], L.activeWorkers());
      case 3: { const ys = [cy - 4, cy - 3, cy - 2, cy - 1, cy];
        return h('Tabel 3 · Dosis efektif Hp(10) 5 tahun (mSv)', 'Sumber: hasil evaluasi laboratorium dosimetri') + U.table([{ h: 'Nama', v: w => `${PR.esc(w.nama)}<span class="sub">${PR.esc(w.profesi)}</span>` }].concat(ys.map(y => ({ h: y === cy ? y + ' (YTD)' : String(y), r: 1, v: w => PR.f(L.annual(w.id, y)) }))).concat([{ h: 'Hp(3) ' + cy, r: 1, v: w => w.kategori === 'intervensional' ? PR.f(L.annualLens(w.id, cy)) : '—' }, { h: 'DC', r: 1, v: w => (d => d != null ? PR.f(d) : '—')(L.dcValue(w.profesi)) }, { h: 'Status', v: w => L.doseTag(L.doseStatus(w).status) }]), L.activeWorkers())
          + h('Pembatas dosis per profesi') + U.table([{ h: 'Profesi', v: d => PR.esc(d.profesi) }, { h: 'Nilai (mSv/tahun)', r: 1, v: d => PR.f(PR.n(d.nilai)) }, { h: 'Metode', v: d => PR.esc(d.metode || '') }, { h: 'Periode data', v: d => PR.esc(d.periode || '') }, { h: 'Status', v: d => PR.esc(d.status || '') }], L.tb('Pembatas_Dosis').filter(d => d.status !== 'revisi'))
          + `<p class="small">Investigasi dosis tercatat: <b>${L.tb('Investigasi').length}</b> (${L.tb('Investigasi').filter(x => x.status === 'selesai').length} selesai).</p>`; }
      case 4: return h('Tabel 4 · Pemeriksaan kesehatan pekerja radiasi', 'Hanya kesimpulan kelaikan — detail medis tidak dicantumkan') + U.table([{ h: 'Nama', v: w => PR.esc(w.nama) }, { h: 'NPR', v: w => `<span class="num">${PR.esc(w.npr || '')}</span>` }, { h: 'MCU terakhir', v: w => `<span class="num">${PR.d((L.lastMcu(w.id) || {}).tanggal)}</span>` }, { h: 'Berlaku s.d.', v: w => (m => m ? `<span class="num">${PR.d(m.berlaku_sd)}</span> ${PR.validTag(m.berlaku_sd)}` : PR.tag('belum ada', 'kritis'))(L.lastMcu(w.id)) }, { h: 'Kesimpulan', v: w => PR.esc((L.lastMcu(w.id) || {}).kesimpulan || '—') }], L.activeWorkers());
      case 5: return h('Tabel 5 · Peralatan keselamatan per ruangan') + `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th>${L.tb('Ruangan').map(r => `<th>${PR.esc(r.nama)}</th>`).join('')}</tr></thead><tbody>${L.PERLENGKAPAN.map(k => `<tr><td>${k}</td>${L.tb('Ruangan').map(r => { const p = L.tb('Perlengkapan').find(x => x.ruangan_id === r.id && x.item === k); return `<td>${p && p.status === 'ada' ? `<span style="color:var(--ok)">${PR.ic('check', 'ic-s')}</span>${p.foto_id ? ` <button class="link tiny no-print" data-act="openFile" data-id="${p.foto_id}">foto</button>` : ''}` : p && p.status === 'tidak perlu' ? '<span class="muted">n/a</span>' : `<span style="color:var(--crit)">${PR.ic('x', 'ic-s')}</span>`}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
      case 6: return h('Tabel 6 · Laju paparan daerah kerja (µSv/jam, terkoreksi)', `Batas RS: pengendalian ≤ ${PR.f(L.batas('pengendalian'))} · supervisi ≤ ${PR.f(L.batas('supervisi'))} · umum ≤ ${PR.f(L.batas('umum'))}`) + U.table([{ h: 'Alat & ruangan', v: x => `${PR.esc(L.alatName(x.a))}<span class="sub">${PR.esc(L.ruangName(x.a.ruangan_id))}</span>` }, { h: 'Tanggal', v: x => x.s ? `<span class="num">${PR.d(x.s.tanggal)}</span>` : '—' },
        ...['operator', 'pintu', 'sekitar'].map(p => ({ h: { operator: 'Posisi operator', pintu: 'Balik pintu', sekitar: 'Sekitar ruangan' }[p], r: 1, v: x => { if (!x.s) return '—'; const t = L.titikOf(x.s.id).filter(t => t.posisi === p); return t.map(t => String(t.terkoreksi).toUpperCase() === 'BG' ? 'BG' : PR.f(PR.n(t.terkoreksi))).join(' / ') || '—'; } })),
        { h: 'Ukuran ruang', v: x => PR.esc(x.s ? x.s.ukuran_ruang || '' : '') }, { h: 'Status', v: x => L.needResurvey(x.a) ? PR.tag('perlu survei ulang', 'tinjau') : x.s ? L.titikTag(L.surveiStatus(x.s)) : PR.tag('belum', 'dash', 1) }], L.tb('Alat').map(a => ({ a, s: L.lastSurvey(a.id) })))
        + h('Surveimeter') + U.table([{ h: 'Alat ukur', v: m => PR.esc(m.merek + ' ' + m.tipe) }, { h: 'No. seri', v: m => `<span class="num">${PR.esc(m.no_seri)}</span>` }, { h: 'FK', r: 1, v: m => PR.f(PR.n(m.fk), 3) }, { h: 'Kalibrasi s.d.', v: m => `${PR.d(m.kal_sd)} ${PR.validTag(m.kal_sd)}` }, { h: 'Sertifikat', v: m => m.file_id ? `<button class="link small no-print" data-act="openFile" data-id="${m.file_id}">buka</button>` : '—' }], L.tb('Alat_Ukur'));
      case 7: { const docOf = k => docs.filter(d => d.kategori === k)[0];
        return h('7.1 · Daftar dokumen prosedur') + U.table([{ h: 'Nama dokumen', v: d => PR.esc(d.judul) }, { h: 'Nomor', v: d => `<span class="num small">${PR.esc(d.nomor || '')}</span>` }, { h: 'Rev', v: d => PR.esc(d.revisi || '') }, { h: 'Tanggal pengesahan', v: d => `<span class="num">${PR.d(d.tanggal_berlaku)}</span>` }, { h: 'Berkas', v: d => d.file_id ? `<button class="btn btn-s no-print" data-act="openFile" data-id="${d.file_id}">${PR.ic('eye')}Buka</button>` : '—' }], docs.filter(d => d.jenis === 'terkendali'))
          + h('7.2 · Dokumen wajib') + U.table([{ h: 'No', v: (k, i) => i + 1 }, { h: 'Dokumen', v: k => PR.esc(k) }, { h: 'Ketersediaan', v: k => k === 'Daftar Inventaris' ? PR.tag('ada (inventaris)', 'aman') : docOf(k) ? PR.tag('ada', 'aman') : PR.tag('belum', 'kritis') }, { h: 'Nomor', v: k => PR.esc((docOf(k) || {}).nomor || '') }, { h: 'Berkas', v: k => (d => d && d.file_id ? `<button class="btn btn-s no-print" data-act="openFile" data-id="${d.file_id}">Buka</button>` : '')(docOf(k)) }], L.WAJIB); }
      case 8: return h('Tabel 8 · Pelaporan & pelatihan') + U.table([{ h: 'Tanggal', v: k => `<span class="num">${PR.d(k.tanggal)}</span>` }, { h: 'Kegiatan', v: k => PR.esc({ balis: 'Laporan tahunan B@LIS', laporan_tugas: 'Laporan tugas PPR', latihan: 'Latihan kedaruratan', paparan_tidak_disengaja: 'Rekaman paparan tidak disengaja', pelatihan: 'Pelatihan proteksi radiasi' }[k.jenis] || k.jenis) }, { h: 'Keterangan', v: k => PR.esc(k.keterangan || '') }, { h: 'Bukti', v: k => k.file_id ? `<button class="link small no-print" data-act="openFile" data-id="${k.file_id}">buka</button>` : '—' }], L.tb('Kegiatan').slice().sort((a, b) => String(b.tanggal).localeCompare(a.tanggal)))
        + `<p class="small">Pekerja dengan pelatihan penyegaran ≤ 5 tahun: <b>${L.activeWorkers().filter(w => w.pelatihan_terakhir && PR.days(PR.today(), PR.addMonths(w.pelatihan_terakhir, 60)) >= 0).length}/${L.activeWorkers().length}</b></p>`;
    }
    return '';
  };

  // ========== aksi ==========
  PR.acts.guestLink = async () => {
    const list = (PR.extra.tautan || []).filter(t => !t.dicabut && new Date(t.berlaku_sd) > new Date());
    PR.modal({ title: 'Tautan peninjau tamu', body: `<p class="small" style="margin-top:0">Tautan hanya-baca untuk inspektur atau pihak luar. Isinya: paket Siap Inspeksi 8 bagian dan dokumen pendukung — tanpa detail medis. Berakhir otomatis.</p>
      <div class="row">${PR.fieldHTML({ k: 'gdays', label: 'Berlaku', type: 'select', opts: [[3, '3 hari'], [7, '7 hari'], [14, '14 hari']] }, 7)}<button class="btn btn-y" id="gmake" style="margin-top:20px">${PR.ic('link')}Buat tautan</button></div><div id="gout" class="mt"></div>
      ${list.length ? `<div class="eyebrow mt">Tautan aktif</div>${list.map(t => `<div class="list-row"><div class="grow"><b>${PR.esc(t.id)}</b><span>Dibuat ${PR.dt(t.dibuat)} · berakhir ${PR.dt(t.berlaku_sd)}</span></div><button class="btn btn-s btn-x" data-revoke="${t.id}">Cabut</button></div>`).join('')}` : ''}`,
      onMount: m => {
        PR.$('#gmake', m).onclick = async () => { try { const d = await A.call('createGuest', { days: +m.querySelector('[name=gdays]').value }); const link = `${PR.appBase()}#/tamu?b=${encodeURIComponent(A.bId())}&g=${encodeURIComponent(d.token)}`; (PR.extra.tautan = PR.extra.tautan || []).push({ id: d.id, dibuat: new Date().toISOString(), berlaku_sd: d.berlaku_sd });
          PR.$('#gout', m).innerHTML = `<div class="ban ban-info" style="margin:0">${PR.ic('circle-check')}<div class="grow"><b style="font-size:13px">Berlaku s.d. ${PR.dt(d.berlaku_sd)}</b><input class="inp mono small mt8" readonly value="${PR.esc(link)}"><div class="row mt8"><button class="btn btn-s" id="gcopy">${PR.ic('link')}Salin</button><button class="btn btn-s" id="gwa">${PR.ic('message-circle')}WA</button></div></div></div>`;
          PR.$('#gcopy', m).onclick = () => PR.copy(link); PR.$('#gwa', m).onclick = () => PR.wa(`Tautan hanya-baca paket inspeksi ProteRad ${L.rs().nama || ''} (berlaku s.d. ${PR.dt(d.berlaku_sd)}): ${link}`); } catch (e) { PR.toast(e.message, 'err'); } };
        m.querySelectorAll('[data-revoke]').forEach(b => b.onclick = async () => { try { await A.call('revokeGuest', { id: b.dataset.revoke }); const t = PR.extra.tautan.find(x => x.id === b.dataset.revoke); if (t) t.dicabut = 'ya'; b.closest('.list-row').remove(); PR.toast('Tautan dicabut', 'ok'); } catch (e) { PR.toast(e.message, 'err'); } });
      } });
  };
  PR.acts.zipPack = async el => {
    el.disabled = true; PR.toast('Menyusun ZIP…');
    try {
      await PR.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const z = new window.JSZip(), root = z.folder('Paket-Inspeksi-' + (L.rs().nama || 'RS').replace(/[^\w]+/g, '-') + '-' + PR.today());
      const sec = n => root.folder(String(n).padStart(2, '0') + '-' + P.TITLES[n - 1].replace(/[^\w]+/g, '-'));
      sec(1).file('alat.csv', PR.toCSV(L.tb('Alat').map(a => Object.assign({ ruangan: L.ruangName(a.ruangan_id) }, a)), ['ruangan', 'jenis', 'merek', 'tipe', 'no_seri', 'no_izin', 'izin_sd', 'ukes_no', 'ukes_sd', 'status_balis']));
      sec(2).file('pekerja.csv', PR.toCSV(L.activeWorkers(), ['nama', 'npr', 'profesi', 'kategori', 'pelatihan_terakhir', 'izin_bekerja', 'izin_bekerja_sd']));
      sec(3).file('dosis.csv', PR.toCSV(L.tb('Dosis').map(d => Object.assign({ nama: (L.get('Pekerja', d.pekerja_id) || {}).nama }, d)), ['nama', 'tahun', 'periode', 'hp10', 'hp3', 'lab', 'jenis_kegiatan']));
      sec(4).file('mcu.csv', PR.toCSV(L.tb('MCU').map(m => ({ nama: (L.get('Pekerja', m.pekerja_id) || {}).nama, tanggal: m.tanggal, berlaku_sd: m.berlaku_sd, kesimpulan: m.kesimpulan })), ['nama', 'tanggal', 'berlaku_sd', 'kesimpulan']));
      sec(6).file('survei.csv', PR.toCSV(L.tb('Titik').map(t => { const s = L.get('Survei', t.survei_id) || {}; return Object.assign({ tanggal: s.tanggal, alat: L.alatName(L.get('Alat', s.alat_id)) }, t); }), ['tanggal', 'alat', 'kode', 'lokasi', 'posisi', 'klasifikasi', 'mentah', 'bg', 'terkoreksi']));
      const files = [];
      L.tb('Dokumen').filter(d => d.file_id && d.status !== 'tidak berlaku' && d.status !== 'draf').forEach(d => files.push([d.kategori === 'Izin Pemanfaatan' || d.kategori === 'Sertifikat Uji Kesesuaian' ? 1 : 7, d.file_id, (d.nomor || d.judul) + '-' + (d.file_nama || 'dokumen')]));
      L.tb('Alat_Ukur').filter(m => m.file_id).forEach(m => files.push([6, m.file_id, 'kalibrasi-' + m.no_seri]));
      L.tb('Kegiatan').filter(k => k.file_id).forEach(k => files.push([8, k.file_id, k.jenis + '-' + k.tanggal]));
      L.tb('Perlengkapan').filter(p => p.foto_id).forEach(p => files.push([5, p.foto_id, L.ruangName(p.ruangan_id) + '-' + p.item]));
      let i = 0; for (const [n, id, name] of files) { try { const f = await A.file(id, U.guest); const b = f.blob || await (await fetch(f.url)).blob(); const ext = (f.nama.match(/\.\w+$/) || [''])[0]; sec(n).file(name.replace(/[\\/:*?"<>|]+/g, '-') + (name.endsWith(ext) ? '' : ext), b); } catch (e) { } if (++i % 5 === 0) PR.toast(`Mengunduh berkas ${i}/${files.length}…`); }
      PR.download(root.name.replace(/\/$/, '') + '.zip', await z.generateAsync({ type: 'blob' }));
    } catch (e) { PR.toast(e.message, 'err'); }
    el.disabled = false;
  };
  PR.acts.addTemuan = async el => {
    const t = el.dataset.id ? L.get('Temuan', el.dataset.id) : { tanggal_lhi: PR.today(), tingkat: 'penting', status: 'terbuka', bagian: '1', batas_tl: PR.addDays(PR.today(), 60) };
    const v = await PR.form({ title: 'Temuan dari LHI', wide: true, del: !!el.dataset.id, fields: [
      { k: 'no_lhi', label: 'No. LHI', mono: 1, req: 1 }, { k: 'tanggal_lhi', label: 'Tanggal LHI', type: 'date' }, { k: 'kode', label: 'Kode temuan', mono: 1, req: 1 }, { k: 'bagian', label: 'Bagian LHI', type: 'select', opts: P.TITLES.map((t, i) => [String(i + 1), (i + 1) + '. ' + t]) },
      { k: 'tingkat', label: 'Tingkat', type: 'select', opts: [['kritis', 'Kritis'], ['penting', 'Penting'], ['pendukung', 'Pendukung']] }, { k: 'batas_tl', label: 'Batas waktu tindak lanjut', type: 'date', req: 1 },
      { k: 'uraian', label: 'Uraian temuan', type: 'textarea', req: 1 }, { k: 'rekomendasi', label: 'Rekomendasi', type: 'textarea' }, { k: 'status', label: 'Status', type: 'select', opts: ST }, { k: 'catatan', label: 'Catatan PPR', type: 'textarea' }] }, t);
    if (!v) return; if (v._delete) { A.remove('Temuan', t.id); return PR.render(); }
    delete v._files;
    const prev = L.tb('Temuan').find(x => x.id !== v.id && x.no_lhi !== v.no_lhi && (x.kode === v.kode || (x.bagian === v.bagian && String(x.uraian).slice(0, 30).toLowerCase() === String(v.uraian).slice(0, 30).toLowerCase())));
    if (prev && !t.id) { v.berulang = 'ya'; v.tingkat = 'kritis'; PR.toast('Temuan berulang dari ' + prev.no_lhi + ' — otomatis dinaikkan ke tingkat KRITIS', 'warn'); }
    A.save('Temuan', v); PR.render();
  };
  PR.acts.tlStatus = el => { const t = L.get('Temuan', el.dataset.id); A.save('Temuan', Object.assign({}, t, { status: el.value })); PR.render(); };
  PR.acts.tlUp = el => { const t = L.get('Temuan', el.dataset.id); const v = el.checked ? 'ya' : 'tidak'; A.save('Temuan', Object.assign({}, t, { diunggah_tlhi: v, status: v === 'ya' && t.status !== 'ditutup' ? 'diunggah' : t.status })); PR.render(); };
  PR.acts.addInsp = async el => {
    const x = el.dataset.id ? L.get('Inspeksi', el.dataset.id) : { tanggal: PR.today() };
    const v = await PR.form({ title: 'Riwayat inspeksi', del: !!el.dataset.id, fields: [{ k: 'tanggal', label: 'Tanggal inspeksi', type: 'date', req: 1 }, { k: 'ikk', label: 'Nilai IKK (dari LHI resmi)', type: 'number' }, { k: 'good_practice', label: 'Good practice', type: 'textarea' }, { k: 'catatan', label: 'Catatan', type: 'textarea' }] }, x);
    if (!v) return; if (v._delete) { A.remove('Inspeksi', x.id); return PR.render(); } delete v._files; A.save('Inspeksi', v); PR.render();
  };

  // ========== halaman ==========
  function checklist(r) {
    const ref = st.ref || PR.today(), R = L.readiness(ref), cons = L.consistency();
    if (r.q.s) st.open[r.q.s] = true;
    const links = (PR.extra.tautan || []).filter(t => !t.dicabut && new Date(t.berlaku_sd) > new Date());
    const insp = L.tb('Inspeksi').slice().sort((a, b) => String(b.tanggal).localeCompare(a.tanggal));
    return `${U.head('SIAP INSPEKSI', 'Daftar periksa mengikuti 7 bagian Laporan Hasil Inspeksi (LHI) BALIS + pelaporan & pelatihan. Terisi otomatis dari semua menu.',
      `<a class="btn" href="#/inspeksi/mode">${PR.ic('maximize')}Mode inspeksi</a>${U.btn('Tautan tamu (7 hari)', 'guestLink', 'share-2')}<button class="btn" data-act="zipPack">${PR.ic('download')}Unduh ZIP</button><a class="btn btn-y" href="#/cetak/paket?d=${ref}">${PR.ic('file-check')}Unduh paket PDF</a>`, 'AUDIT KESIAPAN · LHI BALIS')}
      ${U.tabs([['daftar', 'Daftar periksa (8 bagian)', null, '#/inspeksi'], ['tl', 'Tindak lanjut temuan LHI', L.tb('Temuan').filter(t => t.status !== 'ditutup').length, '#/inspeksi/tl']], 'daftar')}
      <div class="grid g4 mb">
        <div class="tile"><div class="spread"><span class="lbl">Skor kesiapan</span>${PR.tag(R.label, R.kind)}</div><div class="big">${Math.round(R.score * 100)}%</div><p>Perkiraan internal, bukan nilai IKK resmi</p><div class="bar"><i style="width:${R.score * 100}%"></i></div></div>
        <div class="tile"><div class="spread"><span class="lbl">Bobot kepentingan</span></div><div class="small">${PR.lvl('kritis')}<br><span style="display:inline-block;margin:4px 0">${PR.lvl('penting')}</span><br>${PR.lvl('pendukung')}</div></div>
        <div class="tile ${R.gates.length ? 'crit' : ''}"><div class="spread"><span class="lbl">Gerbang kritis</span>${R.gates.length ? '' : PR.tag('aman', 'aman')}</div><div class="big">${R.gates.length}</div><p>${R.gates.length ? 'item kritis gagal → skor maks 59%' : 'item kritis gagal'}</p></div>
        <div class="tile"><div class="spread"><span class="lbl">Simulasi tanggal inspeksi</span></div><input type="date" class="inp mono" id="simDate" value="${ref}"><p>${ref !== PR.today() ? `Dihitung untuk ${PR.d(ref)} · <button class="link small" data-act="simReset">kembali ke hari ini</button>` : 'Lihat apa yang kedaluwarsa pada hari kunjungan'}</p></div>
      </div>
      <div class="ban ban-info">${PR.ic('info')}<div class="grow small">Nilai item: lengkap 100%, sedang diproses 50%, kurang/kedaluwarsa 0%; item yang mencakup banyak alat/pekerja dihitung persentase. Jika satu item <b>kritis</b> gagal, skor dibatasi maksimal 59% (Belum siap).</div></div>
      <div class="grid g-8-4"><div>
        ${R.sections.map(s => `<details class="acc" ${st.open[s.no] || s.items.some(x => x.gate) ? 'open' : ''} data-sec="${s.no}"><summary><span class="tag t-ink">${s.no}</span><h3>Bagian ${s.no}. ${s.title}</h3>${s.items.some(x => x.gate) ? PR.tag('kritis gagal', 'kritis') : ''}<span class="pct">${Math.round(s.pct * 100)}%</span>${PR.tag(s.pct >= 0.9 ? 'siap' : s.pct >= 0.7 ? 'tinjau' : 'kurang', s.pct >= 0.9 ? 'aman' : s.pct >= 0.7 ? 'tinjau' : 'kritis', 1)}${PR.ic('chevron-down')}</summary>
          ${U.table([{ h: 'Kode', v: x => `<span class="num">${x.code}</span>` }, { h: 'Parameter / item periksa', v: x => `<b>${PR.esc(x.label)}</b><span class="sub">${PR.esc(x.detail || '')}</span>` }, { h: 'Bobot', v: x => `<span class="tag ${x.level === 'kritis' ? 't-ink' : x.level === 'pendukung' ? 't-dash' : ''}">[${x.level.toUpperCase()}]</span>` }, { h: 'Status', v: valTag },
            { h: '', v: x => x.v < 1 && !x.na ? `<button class="btn btn-s btn-d" data-go="${x.route}">Perbaiki</button>` : `<button class="btn btn-s" data-go="${x.route}">Lihat</button>` }], s.items)}</details>`).join('')}
      </div><div class="stack">
        <div class="panel"><div class="panel-h"><h3>${PR.ic('scan-search')} Cek konsistensi data otomatis</h3>${PR.tag(String(cons.length), cons.length ? 'tinjau' : 'aman', 1)}</div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">${cons.length ? cons.map(c => `<div class="list-row"><div class="grow"><b style="white-space:normal;font-size:13px">${PR.esc(c.msg)}</b></div><button class="btn btn-s" data-go="${c.route}">${PR.esc(c.act)}</button></div>`).join('') : '<p class="small muted">Tidak ada ketidakkonsistenan terdeteksi.</p>'}</div></div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('file-check')} Isi paket PDF</h3></div><div class="panel-b stack" style="gap:6px">${['Sampul & ringkasan kesiapan'].concat(P.TITLES.map((t, i) => `${i + 1}. ${t}`)).map(x => `<div class="small">${PR.ic('check', 'ic-s')} ${x}</div>`).join('')}<p class="tiny muted" style="margin:6px 0 0">Hanya dokumen berstatus berlaku. Detail medis MCU tidak dicantumkan.</p></div></div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('share-2')} Tautan tamu</h3>${links.length ? PR.tag(links.length + ' aktif', 'aman', 1) : ''}</div><div class="panel-b small">${links.length ? links.map(t => `<div>${PR.esc(t.id)} · s.d. ${PR.dt(t.berlaku_sd)}</div>`).join('') : 'Belum ada tautan aktif.'}${PR.can('edit') ? '<div class="mt8"><button class="btn btn-s" data-act="guestLink">Kelola tautan</button></div>' : ''}</div></div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('history')} Riwayat inspeksi & IKK</h3>${U.btn('Catat', 'addInsp', 'plus', 'btn-s')}</div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">${insp.length ? insp.map(x => `<div class="list-row"><div class="grow"><b>Inspeksi ${PR.d(x.tanggal)}</b><span>${PR.esc(x.good_practice || x.catatan || '')}</span></div>${x.ikk ? `<span class="tag t-ink">IKK ${PR.f(PR.n(x.ikk), 1)}</span>` : ''}${U.btn('', 'addInsp', 'pencil', 'btn-s', `data-id="${x.id}" aria-label="Ubah"`)}</div>`).join('') : '<p class="small muted">Belum ada riwayat. Nilai IKK diisi manual dari LHI resmi.</p>'}</div></div>
      </div></div>`;
  }
  function tl() {
    const all = L.tb('Temuan'), rows = all.filter(t => st.tl === 'semua' || t.status === st.tl).sort((a, b) => (a.status === 'ditutup') - (b.status === 'ditutup') || String(a.batas_tl).localeCompare(b.batas_tl));
    const open = all.filter(t => t.status !== 'ditutup'), next = open.slice().sort((a, b) => String(a.batas_tl).localeCompare(b.batas_tl))[0];
    const balis = PR.set.balis_url;
    const stepIdx = t => Math.max(0, ST.findIndex(s => s[0] === t.status));
    return `${U.head('TINDAK LANJUT TEMUAN LHI', 'Setiap temuan menjadi tugas dengan hitung mundur di Kalender Kepatuhan sampai bukti diunggah ke TLHI BALIS dan ditutup.', `${U.btn('Input temuan dari LHI', 'addTemuan', 'plus', 'btn-y')}`, 'SIAP INSPEKSI')}
      ${U.tabs([['daftar', 'Daftar periksa (8 bagian)', null, '#/inspeksi'], ['tl', 'Tindak lanjut temuan LHI', open.length, '#/inspeksi/tl']], 'tl')}
      <div class="grid g4 mb">${U.tile('', all.length, 'Total temuan', `${all.filter(t => t.status === 'ditutup').length} ditutup · ${open.length} terbuka`)}${U.tile(PR.tag('kritis', 'kritis'), open.filter(t => t.tingkat === 'kritis' || t.berulang === 'ya').length, 'Kritis & berulang', 'Prioritas utama')}
        ${U.tile(next ? PR.dueTag(PR.left(next.batas_tl)) : '', next ? PR.left(next.batas_tl) + '<span style="font-size:16px"> hari</span>' : '—', 'Sisa waktu terdekat', next ? PR.esc(next.kode) + ' · ' + PR.d(next.batas_tl) : 'Tidak ada temuan terbuka')}
        ${U.tile('', PR.pct(all.length ? all.filter(t => t.status === 'ditutup' || t.diunggah_tlhi === 'ya').length / all.length : 0), 'Progres tindak lanjut', 'Ditutup atau sudah diunggah')}</div>
      <div class="chips mb">${[['semua', 'Semua']].concat(ST).map(([k, l]) => `<button class="chip ${st.tl === k ? 'on' : ''}" data-act="tlF" data-k="${k}">${l}<span class="n">${k === 'semua' ? all.length : all.filter(t => t.status === k).length}</span></button>`).join('')}</div>
      <div class="stack">${rows.length ? rows.map(t => { let bukti = []; try { bukti = JSON.parse(t.bukti_ids || '[]'); } catch (e) { }
        return `<div class="panel" style="${t.status === 'ditutup' ? 'opacity:.75' : t.tingkat === 'kritis' ? 'border:2px solid var(--crit)' : ''}"><div class="panel-h" style="${t.tingkat === 'kritis' && t.status !== 'ditutup' ? 'background:var(--crit-b)' : ''}"><div class="row"><b class="mono">${PR.esc(t.kode)}</b><span class="small muted">${PR.esc(t.no_lhi)} · Bagian ${PR.esc(t.bagian)}: ${PR.esc(P.TITLES[+t.bagian - 1] || '')}</span><span class="tag ${t.tingkat === 'kritis' ? 't-kritis' : t.tingkat === 'pendukung' ? 't-dash' : ''}">[${String(t.tingkat).toUpperCase()}]</span>${t.berulang === 'ya' ? '<span class="tag t-y">[TEMUAN BERULANG]</span>' : ''}</div>${t.status === 'ditutup' ? PR.tag('ditutup', 'aman') : PR.dueTag(PR.left(t.batas_tl))}</div>
          <div class="panel-b"><div class="grid g2"><div><div class="eyebrow">Uraian temuan</div><p style="margin:6px 0 0">${PR.esc(t.uraian)}</p></div><div><div class="eyebrow">Rekomendasi</div><p style="margin:6px 0 0" class="small">${PR.esc(t.rekomendasi || '—')}</p></div></div>
            <div class="steps mt" style="margin-bottom:12px">${ST.map((s, i) => `<div class="${i < stepIdx(t) ? 'done' : i === stepIdx(t) ? 'on' : ''}" style="min-width:110px;padding:8px 10px"><span class="n" style="width:22px;height:22px;font-size:11px">${i < stepIdx(t) ? PR.ic('check', 'ic-s') : i + 1}</span><b style="font-size:12px">${s[1]}</b></div>`).join('')}</div>
            <div class="row">${bukti.map((b, i) => U.fileChip(b, 'Bukti ' + (i + 1))).join('')}${PR.can('edit') ? `<label class="btn btn-s">${PR.ic('file-up')}Unggah bukti<input type="file" hidden data-tlbukti="${t.id}"></label>
              <label class="chk small"><input type="checkbox" data-act="tlUp" data-id="${t.id}" ${t.diunggah_tlhi === 'ya' ? 'checked' : ''}> Sudah diunggah ke TLHI BALIS</label>
              <select class="inp" style="width:auto;height:30px" data-act="noop" data-tlst="${t.id}">${ST.map(([k, l]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
              ${balis ? `<a class="btn btn-s" href="${PR.esc(balis)}" target="_blank" rel="noopener">Buka BALIS ${PR.ic('external-link', 'ic-s')}</a>` : ''}<a class="btn btn-s btn-g" href="#/kalender">Lihat di kalender</a>${U.btn('Ubah', 'addTemuan', 'pencil', 'btn-s', `data-id="${t.id}"`)}` : ''}</div>
            ${t.catatan ? `<p class="small" style="background:var(--sub);padding:8px;margin:10px 0 0">${PR.esc(t.catatan)}</p>` : ''}</div></div>`; }).join('') : `<div class="panel">${U.empty('Belum ada temuan pada filter ini.', U.btn('Input temuan dari LHI', 'addTemuan', 'plus', 'btn-y'))}</div>`}</div>
      ${!balis && PR.can('edit') ? `<p class="small muted mt">Atur alamat BALIS di <a href="#/pengaturan/regulasi">Pengaturan</a> untuk menampilkan tombol “Buka BALIS”. ProteRad tidak terhubung langsung ke BALIS — unggah bukti ke TLHI dilakukan manual.</p>` : ''}`;
  }
  function mode(r) {
    const sec = +(r.parts[1] || 1), R = L.readiness(st.ref || PR.today()), s = R.sections[sec - 1];
    return `<div class="panel-dark" style="margin:-24px -24px 18px;padding:12px 24px;border-bottom:4px solid var(--y);display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="tag t-y">[MODE INSPEKSI]</span><b style="font:600 16px var(--fh);letter-spacing:.04em">${PR.esc(L.rs().nama || '')} · ${PR.esc(L.rs().instalasi || '')}</b><span style="flex:1"></span><span class="mono small">SKOR ${Math.round(R.score * 100)}% · ${R.label.toUpperCase()}</span><a class="btn btn-s btn-y" href="#/inspeksi">${PR.ic('x')}Keluar mode inspeksi</a></div>
      <div class="grid g-3-9"><div class="panel" style="align-self:start;position:sticky;top:72px"><div class="panel-h"><h3>Bagian LHI</h3></div>${R.sections.map(x => `<a href="#/inspeksi/mode/${x.no}" class="list-row" style="text-decoration:none;padding:10px 14px;${x.no === sec ? 'background:var(--y-t);box-shadow:inset 3px 0 var(--y)' : ''}"><span class="mono">${x.no}</span><div class="grow"><b>${x.title}</b></div><span class="mono small">${Math.round(x.pct * 100)}%</span></a>`).join('')}</div>
      <div class="panel"><div class="panel-h"><div><span class="tag t-ink">[BAGIAN ${sec}]</span><h2 style="margin-top:8px">${s.title.toUpperCase()}</h2></div><div class="row"><span class="pct">${Math.round(s.pct * 100)}%</span>${sec > 1 ? `<a class="btn btn-s" href="#/inspeksi/mode/${sec - 1}">${PR.ic('arrow-left')}</a>` : ''}${sec < 8 ? `<a class="btn btn-s btn-y" href="#/inspeksi/mode/${sec + 1}">Berikutnya ${PR.ic('arrow-right')}</a>` : ''}</div></div>
        <div class="panel-b"><div class="row" style="gap:6px">${s.items.map(x => `<span class="tag ${x.na ? 't-dash' : x.v >= 1 ? 't-aman' : x.v >= .5 ? 't-tinjau' : 't-kritis'}">${x.code} ${PR.esc(x.label)}</span>`).join('')}</div>${P.section(sec)}</div></div></div>`;
  }
  PR.acts.simReset = () => { st.ref = null; PR.render(); };
  PR.acts.tlF = el => { st.tl = el.dataset.k; PR.render(); };
  PR.acts.noop = () => { };

  PR.page('inspeksi', {
    title: 'Siap Inspeksi', roles: ['ppr', 'peninjau'],
    crumb: r => `SIAP INSPEKSI / <b>${r.parts[0] === 'tl' ? 'TINDAK LANJUT TEMUAN' : r.parts[0] === 'mode' ? 'MODE INSPEKSI' : 'DAFTAR PERIKSA KESIAPAN LHI'}</b>`,
    render: r => r.parts[0] === 'tl' ? tl() : r.parts[0] === 'mode' ? mode(r) : checklist(r),
    mount: root => {
      const d = PR.$('#simDate', root); if (d) d.onchange = () => { st.ref = d.value || null; PR.render(); };
      PR.$$('details.acc', root).forEach(x => x.addEventListener('toggle', () => st.open[x.dataset.sec] = x.open));
      PR.$$('[data-tlst]', root).forEach(s => s.onchange = () => { const t = L.get('Temuan', s.dataset.tlst); A.save('Temuan', Object.assign({}, t, { status: s.value })); PR.render(); });
      PR.$$('[data-tlbukti]', root).forEach(inp => inp.onchange = async () => { try { PR.toast('Mengunggah bukti…'); const f = await A.upload(inp.files[0]); const t = L.get('Temuan', inp.dataset.tlbukti); let b = []; try { b = JSON.parse(t.bukti_ids || '[]'); } catch (e) { } b.push(f.id); A.save('Temuan', Object.assign({}, t, { bukti_ids: JSON.stringify(b), status: t.status === 'terbuka' || t.status === 'dalam proses' ? 'bukti siap' : t.status })); PR.render(); } catch (e) { PR.toast(e.message, 'err'); } });
    }
  });
})(window.PR);
