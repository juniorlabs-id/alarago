/* ProteRad — W-13 Arsip Dokumen: dokumen wajib, terkendali (versi & cek isi), status baca SOP, laporan & kegiatan */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const st = { q: '', kat: '', status: '' };
  const KEG = [['balis', 'Laporan tahunan B@LIS'], ['laporan_tugas', 'Laporan tugas PPR tahunan'], ['latihan', 'Latihan kedaruratan'], ['paparan_tidak_disengaja', 'Rekaman paparan tidak disengaja (termasuk nihil)'], ['pelatihan', 'Pelatihan proteksi radiasi'], ['lainnya', 'Lainnya']];
  const docTag = d => d.status === 'disahkan' ? (d.berlaku_sd && PR.left(d.berlaku_sd) < 0 ? PR.tag('kedaluwarsa', 'kritis') : d.tinjau_ulang && PR.left(d.tinjau_ulang) < 0 ? PR.tag('lewat tinjau ulang', 'tinjau') : PR.tag('berlaku', 'aman')) : d.status === 'tidak berlaku' ? PR.tag('tidak berlaku', 'dash', 1) : PR.tag(d.status || 'draf', 'netral', 1);
  const docs = () => L.tb('Dokumen');
  const current = () => docs().filter(d => d.status !== 'tidak berlaku');
  const cekOf = d => { try { return JSON.parse(d.cek_isi || '{}'); } catch (e) { return {}; } };
  const fDoc = () => ({ title: 'Dokumen', wide: true, fields: [
    { k: 'jenis', label: 'Jenis', type: 'select', opts: [['terkendali', 'Dokumen terkendali (nomor, revisi, tinjau ulang)'], ['rekaman', 'Rekaman / dokumen berlaku–kedaluwarsa']] }, { k: 'kategori', label: 'Kategori', type: 'select', opts: L.KATEGORI, req: 1 },
    { k: 'judul', label: 'Judul dokumen', req: 1, full: 1 }, { k: 'nomor', label: 'Nomor dokumen', mono: 1 }, { k: 'revisi', label: 'Revisi', ph: '1' },
    { k: 'status', label: 'Status', type: 'select', opts: [['disahkan', 'Disahkan'], ['ditinjau', 'Ditinjau'], ['draf', 'Draf'], ['tidak berlaku', 'Tidak berlaku']] }, { k: 'tanggal_berlaku', label: 'Tanggal berlaku / pengesahan', type: 'date' },
    { k: 'berlaku_sd', label: 'Berlaku s.d. (jika ada)', type: 'date' }, { k: 'tinjau_ulang', label: 'Jadwal tinjau ulang', type: 'date', help: 'Masuk otomatis ke Kalender Kepatuhan' },
    { k: 'penyusun', label: 'Penyusun' }, { k: 'pengesah', label: 'Pengesah' }, { k: 'ringkasan', label: 'Ringkasan isi / perubahan revisi', type: 'textarea' }, { k: 'file_id', label: 'Berkas dokumen (PDF)', type: 'file', accept: '.pdf,image/*,.doc,.docx' }] });
  async function saveDocForm(v) {
    const f = v._files && v._files.file_id;
    if (f) { const d = await A.upload(f); v.file_id = d.id; v.file_nama = d.nama; v.file_ukuran = String(d.ukuran); v.diunggah = PR.today(); }
    delete v._files; return A.save('Dokumen', v);
  }
  PR.acts.addDoc = async el => {
    const d = el.dataset.id ? L.get('Dokumen', el.dataset.id) : { jenis: L.TERKENDALI.includes(el.dataset.kat) ? 'terkendali' : el.dataset.kat ? 'rekaman' : 'terkendali', kategori: el.dataset.kat || 'SOP', revisi: '1', status: 'disahkan', tanggal_berlaku: PR.today(), tinjau_ulang: PR.addMonths(PR.today(), 24), penyusun: PR.set.ppr_nama || '' };
    const def = fDoc(); if (el.dataset.id) def.del = true;
    const v = await PR.form(def, d); if (!v) return;
    if (v._delete) { if (await PR.confirm('Hapus dokumen ini? Gunakan status "Tidak berlaku" bila hanya ingin mengarsipkan.', 'Hapus', 1)) { A.remove('Dokumen', d.id); PR.go('#/arsip'); } return; }
    try { const r = await saveDocForm(v); PR.toast('Dokumen disimpan', 'ok'); PR.go('#/arsip/dok/' + r.id); } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.revDoc = async el => {
    const d = L.get('Dokumen', el.dataset.id);
    const nv = Object.assign({}, d, { id: '', revisi: String((parseInt(d.revisi, 10) || 0) + 1), status: 'disahkan', tanggal_berlaku: PR.today(), ringkasan: '', file_id: '', file_nama: '', cek_isi: '', induk_id: d.induk_id || d.id });
    const def = fDoc(); def.title = 'Unggah revisi baru'; def.intro = `Revisi lama (${PR.esc(d.nomor)} rev ${PR.esc(d.revisi)}) otomatis ditandai <b>tidak berlaku</b> saat revisi baru disahkan, tetapi tetap tersimpan di riwayat.`;
    const v = await PR.form(def, nv); if (!v) return;
    try { delete v.id; const r = await saveDocForm(v); if (v.status === 'disahkan') A.save('Dokumen', Object.assign({}, d, { status: 'tidak berlaku' })); PR.toast('Revisi baru disimpan' + (d.kategori === 'SOP' ? ' — pekerja perlu mengonfirmasi baca ulang' : ''), 'ok'); PR.go('#/arsip/dok/' + r.id); } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.cekIsi = el => { const d = L.get('Dokumen', el.dataset.id); const c = cekOf(d); c[el.dataset.k] = el.checked; A.save('Dokumen', Object.assign({}, d, { cek_isi: JSON.stringify(c) })); PR.render(); };
  PR.acts.addKeg = async el => {
    const k = el.dataset.id ? L.get('Kegiatan', el.dataset.id) : { jenis: el.dataset.j || 'balis', tanggal: PR.today() };
    const v = await PR.form({ title: 'Laporan / kegiatan', del: !!el.dataset.id, fields: [{ k: 'jenis', label: 'Jenis', type: 'select', opts: KEG }, { k: 'tanggal', label: 'Tanggal', type: 'date', req: 1 }, { k: 'berlaku_sd', label: 'Jatuh tempo berikutnya (opsional)', type: 'date', help: 'Kosong = otomatis 1 tahun setelah tanggal' }, { k: 'keterangan', label: 'Keterangan', type: 'textarea', ph: 'Contoh: laporan dikirim via B@LIS, no. tanda terima …' }, { k: 'file_id', label: 'Bukti (tanda terima / BA / foto)', type: 'file' }] }, k);
    if (!v) return; if (v._delete) { A.remove('Kegiatan', k.id); return PR.render(); }
    try { v.file_id = await A.uploadFrom(v, 'file_id'); delete v._files; A.save('Kegiatan', v); PR.toast('Tersimpan — jatuh tempo berikutnya masuk kalender', 'ok'); PR.render(); } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.remindSop = el => { const d = L.get('Dokumen', el.dataset.id); const un = L.activeWorkers().filter(w => !L.tb('Baca_SOP').some(b => b.dokumen_id === d.id && b.pekerja_id === w.id && String(b.revisi) === String(d.revisi))); PR.wa(`[ProteRad] Mohon baca & konfirmasi ${d.nomor} "${d.judul}" rev ${d.revisi} di portal ProteRad. Belum: ${un.map(w => w.nama).join(', ')}`); };

  const tabs = cur => { const sops = current().filter(d => d.kategori === 'SOP' && d.status === 'disahkan'); const ws = L.activeWorkers(); const p = sops.length && ws.length ? PR.sum(sops.map(s => ws.filter(w => L.tb('Baca_SOP').some(b => b.dokumen_id === s.id && b.pekerja_id === w.id && String(b.revisi) === String(s.revisi))).length)) / (sops.length * ws.length) : null;
    return U.tabs([['wajib', 'Dokumen wajib', current().filter(d => d.jenis !== 'terkendali').length, '#/arsip'], ['terkendali', 'Dokumen terkendali', current().filter(d => d.jenis === 'terkendali').length, '#/arsip/terkendali'], ['baca', 'Status baca SOP', p != null ? PR.pct(p) : null, '#/arsip/baca'], ['kegiatan', 'Laporan & kegiatan', L.tb('Kegiatan').length, '#/arsip/kegiatan']], cur); };
  const head = () => U.head('ARSIP DOKUMEN & REKAMAN TERKENDALI', 'Dokumen wajib, dokumen terkendali (nomor, revisi, tinjau ulang), konfirmasi baca SOP, serta laporan & kegiatan proteksi radiasi.', `${U.btn('Unggah dokumen', 'addDoc', 'file-up', 'btn-y')}`);

  function wajib() {
    const docOf = k => current().filter(d => d.kategori === k).sort((a, b) => String(b.tanggal_berlaku).localeCompare(a.tanggal_berlaku))[0];
    const rows = current().filter(d => (!st.q || [d.judul, d.nomor].join(' ').toLowerCase().includes(st.q.toLowerCase())) && (!st.kat || d.kategori === st.kat) && (!st.status || d.status === st.status));
    const okCount = L.WAJIB.filter(k => k === 'Daftar Inventaris' ? L.tb('Alat').length : docOf(k)).length;
    return `${head()}${tabs('wajib')}
      <div class="panel mb"><div class="panel-h"><h3>${PR.ic('clipboard-check')} Status 9 dokumen wajib — LHI bagian 7.2</h3>${PR.tag(okCount + '/9 tersedia', okCount === 9 ? 'aman' : 'tinjau')}</div>
        <div class="panel-b grid g3" style="gap:8px">${L.WAJIB.map((k, i) => { const d = docOf(k), auto = k === 'Daftar Inventaris';
          return `<div class="tile" style="padding:10px 12px;flex-direction:row;align-items:center;gap:10px;${!d && !auto ? 'border-style:dashed' : ''}">${PR.ic(d || (auto && L.tb('Alat').length) ? 'circle-check' : 'circle-alert', 'ic-l')}<div style="flex:1;min-width:0"><b class="trunc" style="display:block">${i + 1}. ${PR.esc(k)}</b>
            <span class="small muted">${auto ? `Otomatis dari Inventaris (${L.tb('Alat').length} alat)` : d ? `${PR.esc(d.nomor || '')} · rev ${PR.esc(d.revisi || '—')}` : 'Belum diunggah'}</span></div>${auto ? `<a class="btn btn-s" href="#/inventaris">Lihat</a>` : d ? `<a class="btn btn-s" href="#/arsip/dok/${d.id}">Buka</a>` : U.btn('Unggah', 'addDoc', '', 'btn-s btn-y', `data-kat="${PR.esc(k)}"`)}</div>`; }).join('')}</div></div>
      <div class="filters"><div class="search">${PR.ic('search')}<input class="inp" placeholder="Cari judul atau nomor dokumen…" value="${PR.esc(st.q)}" data-af="q"></div>
        <select class="inp" data-af="kat"><option value="">Semua kategori</option>${L.KATEGORI.map(k => `<option ${st.kat === k ? 'selected' : ''}>${PR.esc(k)}</option>`).join('')}</select>
        <select class="inp" data-af="status"><option value="">Semua status</option>${['disahkan', 'ditinjau', 'draf'].map(s => `<option ${st.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="panel"><div class="panel-h panel-dark"><h3 style="color:#fff">${PR.ic('folder-open')} Daftar dokumen & rekaman</h3><span class="mono tiny" style="color:#C9CDD3">${rows.length} DOKUMEN</span></div>
      ${U.table([{ h: 'Kode & nomor', v: d => `<span class="num small">${PR.esc(d.nomor || '—')}</span>` }, { h: 'Judul', v: d => `<a href="#/arsip/dok/${d.id}"><b>${PR.esc(d.judul)}</b></a><span class="sub">${PR.esc(d.kategori)}</span>` },
        { h: 'Objek', v: d => d.objek_tipe === 'alat' ? PR.tag(L.alatName(L.get('Alat', d.objek_id)), 'netral', 1) : PR.tag('fasilitas', 'netral', 1) }, { h: 'Revisi', v: d => PR.esc(d.revisi || '—') },
        { h: 'Berlaku / tinjau ulang', v: d => `<span class="num small">${PR.d(d.berlaku_sd || d.tinjau_ulang)}</span>${(d.berlaku_sd || d.tinjau_ulang) ? `<span class="sub">${PR.dueTag(PR.left(d.berlaku_sd || d.tinjau_ulang))}</span>` : ''}` },
        { h: 'Status', v: docTag }, { h: 'Berkas', v: d => U.fileChip(d.file_id, d.file_nama ? 'PDF' : 'Berkas') }], rows, { empty: 'Belum ada dokumen.', emptyBtn: U.btn('Unggah dokumen', 'addDoc', 'file-up', 'btn-y') })}</div>`;
  }
  function terkendali() {
    const rows = current().filter(d => d.jenis === 'terkendali').sort((a, b) => a.kategori.localeCompare(b.kategori));
    return `${head()}${tabs('terkendali')}<div class="panel">${U.table([{ h: 'No. dokumen', v: d => `<span class="num small">${PR.esc(d.nomor || '—')}</span>` }, { h: 'Judul', v: d => `<a href="#/arsip/dok/${d.id}"><b>${PR.esc(d.judul)}</b></a><span class="sub">${PR.esc(d.kategori)}</span>` },
      { h: 'Rev', v: d => PR.esc(d.revisi) }, { h: 'Status', v: docTag }, { h: 'Tinjau ulang', v: d => `<span class="num small">${PR.d(d.tinjau_ulang)}</span><span class="sub">${d.tinjau_ulang ? PR.dueTag(PR.left(d.tinjau_ulang)) : ''}</span>` }, { h: 'Pengesah', v: d => PR.esc(d.pengesah || '—') },
      { h: 'Cek isi', v: d => d.kategori === 'PPKR' || d.kategori === 'SOP' ? (c => { const n = L.CEK_ISI.filter(x => c[x[0]]).length; return PR.tag(n + '/' + L.CEK_ISI.length, n === L.CEK_ISI.length ? 'aman' : 'tinjau', 1); })(cekOf(d)) : '' },
      { h: '', v: d => `<a class="btn btn-s" href="#/arsip/dok/${d.id}">Buka</a>` }], rows, { empty: 'Belum ada dokumen terkendali (PPKR, kajian keselamatan, sistem manajemen, SOP).', emptyBtn: U.btn('Unggah dokumen', 'addDoc', 'file-up', 'btn-y') })}</div>`;
  }
  function baca() {
    const sops = current().filter(d => d.kategori === 'SOP' && d.status === 'disahkan'), ws = L.activeWorkers();
    const has = (s, w) => L.tb('Baca_SOP').find(b => b.dokumen_id === s.id && b.pekerja_id === w.id && String(b.revisi) === String(s.revisi));
    return `${head()}${tabs('baca')}
      <div class="grid g3 mb">${sops.map(s => { const n = ws.filter(w => has(s, w)).length; return `<div class="tile"><div class="spread"><span class="lbl trunc">${PR.esc(s.nomor)} · rev ${PR.esc(s.revisi)}</span>${PR.tag(PR.pct(ws.length ? n / ws.length : 0), n === ws.length ? 'aman' : 'tinjau', 1)}</div><b class="small">${PR.esc(s.judul)}</b><div class="bar"><i style="width:${ws.length ? n / ws.length * 100 : 0}%"></i></div><div class="spread small"><span>${n}/${ws.length} pekerja</span>${PR.can('edit') && n < ws.length ? `<button class="link small" data-act="remindSop" data-id="${s.id}">Ingatkan via WA</button>` : ''}</div></div>`; }).join('') || `<div class="tile">${U.empty('Belum ada SOP berstatus disahkan.')}</div>`}</div>
      <div class="panel"><div class="panel-h"><h3>Matriks konfirmasi baca SOP (versi terbaru)</h3></div>${U.table([{ h: 'Pekerja', v: w => `<b>${PR.esc(w.nama)}</b><span class="sub">${PR.esc(w.profesi)}</span>` }].concat(sops.map(s => ({ h: PR.esc(s.nomor), v: w => { const b = has(s, w); return b ? `<span class="small">${PR.ic('circle-check', 'ic-s')} ${PR.d(b.waktu)}</span>` : PR.tag('belum', 'dash', 1); } }))), ws, { empty: 'Belum ada pekerja.' })}</div>`;
  }
  function kegiatan() {
    const rows = L.tb('Kegiatan').slice().sort((a, b) => String(b.tanggal).localeCompare(a.tanggal));
    return `${head()}${tabs('kegiatan')}
      <div class="grid g4 mb">${KEG.slice(0, 4).map(([j, l]) => { const last = rows.find(k => k.jenis === j); const due = last ? (last.berlaku_sd || PR.addMonths(last.tanggal, 12)) : null; return `<div class="tile"><div class="spread"><span class="lbl">${l}</span>${last ? PR.dueTag(PR.left(due)) : PR.tag('belum ada', 'kritis')}</div><div class="big" style="font-size:20px">${last ? PR.d(last.tanggal) : '—'}</div><p>${last ? 'Berikutnya ' + PR.d(due) : 'Catat untuk memenuhi LHI bagian 8'}</p>${U.btn('Catat', 'addKeg', 'plus', 'btn-s', `data-j="${j}"`)}</div>`; }).join('')}</div>
      <div class="panel">${U.table([{ h: 'Tanggal', v: k => `<span class="num">${PR.d(k.tanggal)}</span>` }, { h: 'Jenis', v: k => PR.esc((KEG.find(x => x[0] === k.jenis) || [, k.jenis])[1]) }, { h: 'Keterangan', v: k => `<span class="small">${PR.esc(k.keterangan || '')}</span>` }, { h: 'Bukti', v: k => U.fileChip(k.file_id, 'Bukti') }, { h: '', v: k => U.btn('Ubah', 'addKeg', '', 'btn-s', `data-id="${k.id}"`) }], rows, { empty: 'Belum ada laporan/kegiatan.' })}</div>`;
  }
  function detail(id) {
    const d = L.get('Dokumen', id); if (!d) return U.empty('Dokumen tidak ditemukan.');
    const root = d.induk_id || d.id, hist = docs().filter(x => x.id === root || x.induk_id === root).sort((a, b) => (parseInt(b.revisi, 10) || 0) - (parseInt(a.revisi, 10) || 0));
    const c = cekOf(d), showCek = d.kategori === 'PPKR' || d.kategori === 'SOP';
    const dcs = Object.values(L.dcRows ? L.dcRows() : {});
    return `<div class="page-head"><div><div class="eyebrow"><a href="#/arsip">ARSIP DOKUMEN</a> / ${PR.esc(d.kategori.toUpperCase())}</div><h1 style="margin-top:6px">${PR.esc(d.judul)}</h1><div class="row mt8"><span class="tag">${PR.esc(d.nomor || '—')}</span><span class="tag">REV ${PR.esc(d.revisi || '—')}</span>${docTag(d)}</div></div>
      <div class="actions">${d.file_id ? `<button class="btn" data-act="openFile" data-id="${d.file_id}">${PR.ic('eye')}Lihat PDF asli</button>` : ''}${U.btn('Ubah', 'addDoc', 'pencil', '', `data-id="${d.id}"`)}${d.status !== 'tidak berlaku' ? U.btn('Unggah revisi baru', 'revDoc', 'file-up', 'btn-y', `data-id="${d.id}"`) : ''}</div></div>
      <div class="grid g-8-4"><div class="stack">
        <div class="panel"><div class="panel-b"><div class="kv2">${[['Kategori', d.kategori], ['Jenis', d.jenis === 'terkendali' ? 'Dokumen terkendali' : 'Rekaman'], ['Tanggal berlaku', PR.d(d.tanggal_berlaku)], ['Berlaku s.d.', PR.d(d.berlaku_sd)], ['Tinjau ulang', PR.d(d.tinjau_ulang)], ['Penyusun', d.penyusun], ['Pengesah', d.pengesah], ['Berkas', d.file_nama ? d.file_nama + (d.file_ukuran ? ' · ' + Math.round(PR.n(d.file_ukuran) / 1024) + ' KB' : '') : '—']].map(([k, v]) => `<div><small>${k}</small>${PR.esc(v || '—')}</div>`).join('')}</div>
          ${d.ringkasan ? `<p class="small" style="margin:12px 0 0"><b>Ringkasan:</b> ${PR.esc(d.ringkasan)}</p>` : ''}</div></div>
        ${showCek ? `<div class="panel"><div class="panel-h"><h3>${PR.ic('scan-search')} Cek isi dokumen sebelum inspeksi</h3>${PR.tag(L.CEK_ISI.filter(x => c[x[0]]).length + '/' + L.CEK_ISI.length, L.CEK_ISI.every(x => c[x[0]]) ? 'aman' : 'tinjau', 1)}</div><div class="panel-b stack" style="gap:10px">
          ${L.CEK_ISI.map(([k, l]) => `<label class="chk"><input type="checkbox" data-act="cekIsi" data-id="${d.id}" data-k="${k}" ${c[k] ? 'checked' : ''} ${PR.ro() ? 'disabled' : ''}><span><b style="font-weight:500">${l}</b>${k === 'dc' && dcs.length ? `<span class="sub tiny muted"> · Hasil perhitungan ProteRad: ${dcs.map(x => PR.esc(x.profesi) + ' ' + PR.f(PR.n(x.nilai)) + ' mSv').join(' · ')}</span>` : ''}${k === 'dasar_hukum' ? '<span class="sub tiny muted"> · contoh acuan: PP 45/2023, Perba BAPETEN 4/2020, Perba BAPETEN 4/2024, Pedoman Teknis Pembatas Dosis 2021</span>' : ''}</span></label>`).join('')}
          <p class="small muted" style="margin:0">Daftar cek ini disusun dari temuan inspeksi yang umum terjadi; bukan pengganti penilaian inspektur.</p></div></div>` : ''}
      </div><div class="stack">
        <div class="panel"><div class="panel-h"><h3>${PR.ic('history')} Riwayat revisi</h3><span class="small muted">${hist.length} versi</span></div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">${hist.map(h => `<a class="list-row" href="#/arsip/dok/${h.id}" style="text-decoration:none;${h.id === d.id ? 'background:var(--y-t);margin:0 -16px;padding:10px 16px' : ''}"><span class="tag">REV ${PR.esc(h.revisi)}</span><div class="grow"><b>${PR.d(h.tanggal_berlaku)}</b><span>${PR.esc(h.ringkasan || '')}</span></div>${docTag(h)}</a>`).join('')}</div></div>
        ${d.kategori === 'SOP' && d.status === 'disahkan' ? (() => { const ws = L.activeWorkers(), n = ws.filter(w => L.tb('Baca_SOP').some(b => b.dokumen_id === d.id && b.pekerja_id === w.id && String(b.revisi) === String(d.revisi))).length; return `<div class="panel panel-dark"><div class="panel-b"><div class="spread"><span class="eyebrow" style="color:var(--y)">Konfirmasi baca pekerja</span><b class="mono">${n}/${ws.length}</b></div><div class="bar mt8" style="background:#333"><i style="width:${ws.length ? n / ws.length * 100 : 0}%;background:var(--y)"></i></div>${PR.can('edit') && n < ws.length ? `<button class="btn btn-s btn-y mt" data-act="remindSop" data-id="${d.id}">${PR.ic('message-circle')}Ingatkan via WA</button>` : ''}</div></div>`; })() : ''}
      </div></div>`;
  }
  PR.page('arsip', {
    title: 'Arsip Dokumen', roles: ['ppr', 'peninjau'],
    crumb: r => `ARSIP DOKUMEN / <b>${{ terkendali: 'DOKUMEN TERKENDALI', baca: 'STATUS BACA SOP', kegiatan: 'LAPORAN & KEGIATAN', dok: 'DETAIL DOKUMEN' }[r.parts[0]] || 'DOKUMEN WAJIB'}</b>`,
    render: r => ({ terkendali, baca, kegiatan }[r.parts[0]] || (r.parts[0] === 'dok' ? () => detail(r.parts[1]) : wajib))(),
    mount: root => PR.$$('[data-af]', root).forEach(el => { el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = PR.debounce(() => { st[el.dataset.af] = el.value; PR.render(); const f = PR.$(`[data-af="${el.dataset.af}"]`); if (f && f.tagName === 'INPUT') { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }, el.tagName === 'INPUT' ? 250 : 0); })
  });
})(window.PR);
