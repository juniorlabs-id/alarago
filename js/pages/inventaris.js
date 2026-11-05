/* ProteRad — W-04/W-05 Inventaris: alat radiasi, alat ukur, ruangan, perlengkapan + detail alat */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  PR.isPro = () => { const p = String((PR.lic && PR.lic.paket) || (PR.set && PR.set.paket) || 'Pro'); return !/dasar/i.test(p); };
  PR.appBase = () => location.origin + location.pathname;
  const JENIS = ['Radiografi umum', 'Radiografi mobile', 'Fluoroskopi', 'Fluoroskopi intervensional', 'C-Arm mobile', 'CT Scan', 'Mammografi', 'Dental intraoral', 'Dental panoramik', 'Dental CBCT', 'Bone densitometri', 'Lainnya'];
  const RIW = ['Ganti tabung', 'Perbaikan generator', 'Ubah software', 'Renovasi ruang', 'Perawatan berkala', 'Uji kesesuaian', 'Lainnya'];
  const TRIG = ['Ganti tabung', 'Perbaikan generator', 'Ubah software', 'Renovasi ruang'];
  const rooms = () => L.tb('Ruangan').map(r => [r.id, r.nama]);

  const fAlat = () => ({ title: 'Alat radiasi', wide: true, fields: [
    { k: 'ruangan_id', label: 'Ruangan', type: 'select', opts: [['', '— pilih —']].concat(rooms()), req: 1 }, { k: 'jenis', label: 'Jenis/modalitas', type: 'select', opts: JENIS },
    { k: 'merek', label: 'Merek', req: 1 }, { k: 'tipe', label: 'Tipe/model', req: 1 }, { k: 'no_seri', label: 'Nomor seri', mono: 1, req: 1 }, { k: 'kv_ma', label: 'Kapasitas (kV · mA)' },
    { k: 'no_izin', label: 'Nomor izin pemanfaatan', mono: 1 }, { k: 'izin_sd', label: 'Izin berlaku s.d.', type: 'date' },
    { k: 'izin_status', label: 'Status izin', type: 'select', opts: [['berlaku', 'Berlaku'], ['perpanjangan', 'Sedang diperpanjang']] }, { k: 'status_balis', label: 'Status BALIS', type: 'select', opts: [['terdaftar', 'Terdaftar'], ['proses', 'Dalam proses'], ['belum', 'Belum terdaftar']] },
    { k: 'ukes_no', label: 'No. sertifikat uji kesesuaian', mono: 1 }, { k: 'ukes_sd', label: 'Uji kesesuaian berlaku s.d.', type: 'date' },
    { k: 'ukes_status', label: 'Status uji kesesuaian', type: 'select', opts: [['', 'Normal'], ['dijadwalkan', 'Sudah dijadwalkan ulang']] }, { k: 'status_operasi', label: 'Status operasional', type: 'select', opts: [['aktif', 'Aktif'], ['nonaktif', 'Tidak digunakan']] },
    { k: 'file_izin', label: 'Unggah berkas izin (opsional)', type: 'file' }, { k: 'file_ukes', label: 'Unggah sertifikat uji kesesuaian (opsional)', type: 'file' }] });
  const fMeter = () => ({ title: 'Alat ukur (surveimeter)', wide: true, fields: [
    { k: 'merek', label: 'Merek', req: 1 }, { k: 'tipe', label: 'Tipe', req: 1 }, { k: 'no_seri', label: 'Nomor seri', mono: 1, req: 1 }, { k: 'detektor', label: 'Jenis detektor', type: 'select', opts: ['GM', 'Ion chamber', 'Sintilator', 'Semikonduktor', 'Lainnya'] },
    { k: 'rentang_energi', label: 'Rentang energi' }, { k: 'rentang_ukur', label: 'Rentang ukur' }, { k: 'kepemilikan', label: 'Kepemilikan', type: 'select', opts: ['RS', 'Pribadi PPR'] }, { k: 'status', label: 'Status', type: 'select', opts: [['aktif', 'Aktif'], ['sedang dikalibrasi', 'Sedang dikalibrasi'], ['rusak', 'Rusak / tidak dipakai']] },
    { k: 'lab', label: 'Laboratorium kalibrasi' }, { k: 'no_sertifikat', label: 'No. sertifikat kalibrasi', mono: 1 }, { k: 'kal_tanggal', label: 'Tanggal kalibrasi', type: 'date' }, { k: 'kal_sd', label: 'Kalibrasi berlaku s.d.', type: 'date', req: 1 },
    { k: 'fk', label: 'Faktor kalibrasi (FK)', type: 'number', req: 1, help: 'Bacaan × FK = nilai sebenarnya' }, { k: 'ketidakpastian', label: 'Ketidakpastian' }, { k: 'file_id', label: 'Sertifikat kalibrasi (PDF)', type: 'file' }] });
  const fRoom = () => ({ title: 'Ruangan', fields: [{ k: 'nama', label: 'Nama ruangan', req: 1 }, { k: 'jenis', label: 'Jenis', type: 'select', opts: JENIS }, { k: 'lantai', label: 'Lokasi / lantai' }, { k: 'klasifikasi', label: 'Klasifikasi area', type: 'select', opts: [['pengendalian', 'Daerah pengendalian'], ['supervisi', 'Daerah supervisi']] }, { k: 'ukuran', label: 'Ukuran ruangan', ph: '6,0 × 5,5 m' }, { k: 'catatan', label: 'Catatan', type: 'textarea' }] });
  const fRiw = a => ({ title: 'Catat perbaikan / servis', fields: [
    { k: 'jenis', label: 'Jenis intervensi', type: 'select', opts: RIW, req: 1 }, { k: 'tanggal', label: 'Tanggal', type: 'date', req: 1, def: PR.today() }, { k: 'pelaksana', label: 'Pelaksana / vendor' }, { k: 'no_ba', label: 'No. berita acara', mono: 1 },
    { k: 'keterangan', label: 'Keterangan pekerjaan', type: 'textarea' }, { k: 'memicu_survei', label: 'Intervensi ini dapat mengubah pancaran radiasi (memicu survei paparan ulang)', type: 'check', full: 1, def: 'ya', help: 'Ganti tabung, perbaikan generator, ubah software, dan renovasi ruang otomatis memicu survei ulang (Perba 4/2020 Ps. 32).' },
    { k: 'file_id', label: 'Berita acara / laporan servis', type: 'file' }] });

  PR.acts.addAlat = async el => {
    const a = el.dataset.id ? L.get('Alat', el.dataset.id) : { izin_status: 'berlaku', status_balis: 'terdaftar', status_operasi: 'aktif', jenis: 'Radiografi umum' };
    if (!L.tb('Ruangan').length) { PR.toast('Tambahkan ruangan lebih dulu', 'warn'); return PR.acts.addRoom(el); }
    const def = fAlat(); if (el.dataset.id) def.del = true;
    const v = await PR.form(def, a); if (!v) return;
    if (v._delete) { if (await PR.confirm('Hapus alat ini beserta riwayatnya dari inventaris?', 'Hapus', 1)) { A.remove('Alat', a.id); PR.go('#/inventaris'); } return; }
    try {
      const id = v.id || PR.uid('AL'); const row = Object.assign({}, v, { id }); delete row._files; delete row.file_izin; delete row.file_ukes;
      A.save('Alat', row);
      for (const [k, kat, no, sd] of [['file_izin', 'Izin Pemanfaatan', v.no_izin, v.izin_sd], ['file_ukes', 'Sertifikat Uji Kesesuaian', v.ukes_no, v.ukes_sd]]) {
        if (v._files[k]) { const d = await A.upload(v._files[k]); A.save('Dokumen', { jenis: 'rekaman', kategori: kat, judul: kat + ' ' + L.alatName(row), nomor: no, revisi: '1', status: 'disahkan', objek_tipe: 'alat', objek_id: id, tanggal_berlaku: PR.today(), berlaku_sd: sd, file_id: d.id, file_nama: d.nama, file_ukuran: d.ukuran, diunggah: PR.today() }); }
      }
      PR.toast('Alat disimpan', 'ok'); PR.render();
    } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.addMeter = async el => {
    const m = el.dataset.id ? L.get('Alat_Ukur', el.dataset.id) : { status: 'aktif', kepemilikan: 'RS', detektor: 'GM' };
    const def = fMeter(); if (el.dataset.id) def.del = true;
    const v = await PR.form(def, m); if (!v) return;
    if (v._delete) { if (await PR.confirm('Hapus alat ukur ini?', 'Hapus', 1)) A.remove('Alat_Ukur', m.id), PR.render(); return; }
    try {
      v.file_id = await A.uploadFrom(v, 'file_id'); delete v._files;
      const row = A.save('Alat_Ukur', v);
      if (!m.id || m.kal_sd !== v.kal_sd || m.fk !== v.fk) A.save('Kalibrasi', { alat_ukur_id: row.id, lab: v.lab, no_sertifikat: v.no_sertifikat, tanggal: v.kal_tanggal || PR.today(), berlaku_sd: v.kal_sd, fk: v.fk, ketidakpastian: v.ketidakpastian, file_id: v.file_id });
      PR.toast('Alat ukur disimpan — pengingat kalibrasi diperbarui', 'ok'); PR.render();
    } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.addRoom = async el => {
    const r = el && el.dataset.id ? L.get('Ruangan', el.dataset.id) : { klasifikasi: 'pengendalian' };
    const def = fRoom(); if (el && el.dataset.id) def.del = true;
    const v = await PR.form(def, r); if (!v) return;
    if (v._delete) { if (L.tb('Alat').some(a => a.ruangan_id === r.id)) return PR.toast('Ruangan masih dipakai alat. Pindahkan alatnya dulu.', 'warn'); if (await PR.confirm('Hapus ruangan ini?', 'Hapus', 1)) A.remove('Ruangan', r.id), PR.render(); return; }
    delete v._files; A.save('Ruangan', v); PR.toast('Ruangan disimpan', 'ok'); PR.render();
  };
  PR.acts.addRiw = async el => {
    const a = L.get('Alat', el.dataset.alat), h = el.dataset.id ? L.get('Riwayat_Alat', el.dataset.id) : { alat_id: a.id };
    const def = fRiw(a); if (el.dataset.id) def.del = true;
    def.onMount = m => { const j = m.querySelector('[name=jenis]'), c = m.querySelector('[name=memicu_survei]'); j.onchange = () => c.checked = TRIG.includes(j.value); if (!el.dataset.id) c.checked = TRIG.includes(j.value); };
    const v = await PR.form(def, h); if (!v) return;
    if (v._delete) { A.remove('Riwayat_Alat', h.id); PR.render(); return; }
    try { v.file_id = await A.uploadFrom(v, 'file_id'); delete v._files; v.alat_id = a.id; A.save('Riwayat_Alat', v); PR.toast(v.memicu_survei === 'ya' ? 'Tercatat — alat ditandai PERLU SURVEI ULANG' : 'Riwayat tercatat', v.memicu_survei === 'ya' ? 'warn' : 'ok'); PR.render(); } catch (e) { PR.toast(e.message, 'err'); }
  };

  const tabs = cur => U.tabs([['alat', 'Alat radiasi', L.tb('Alat').length, '#/inventaris'], ['alat-ukur', 'Alat ukur', L.tb('Alat_Ukur').length, '#/inventaris/alat-ukur'], ['ruangan', 'Ruangan', L.tb('Ruangan').length, '#/inventaris/ruangan'], ['perlengkapan', 'Perlengkapan', L.tb('Perlengkapan').filter(p => p.status === 'ada').length, '#/inventaris/perlengkapan']], cur);
  const flt = { q: '', room: '', st: '' };

  function alatList() {
    const rows = L.tb('Alat').filter(a => (!flt.q || [a.merek, a.tipe, a.no_seri, a.no_izin].join(' ').toLowerCase().includes(flt.q.toLowerCase())) && (!flt.room || a.ruangan_id === flt.room)
      && (!flt.st || (flt.st === 'masalah' ? [a.izin_sd, a.ukes_sd].some(d => !d || PR.left(d) <= 30) : true)));
    return `<div class="filters"><div class="search">${PR.ic('search')}<input class="inp" placeholder="Cari nomor seri, merek, tipe, atau nomor izin…" value="${PR.esc(flt.q)}" data-flt="q"></div>
      <select class="inp" data-flt="room"><option value="">Semua ruangan</option>${rooms().map(([i, n]) => `<option value="${i}" ${flt.room === i ? 'selected' : ''}>${PR.esc(n)}</option>`).join('')}</select>
      <select class="inp" data-flt="st"><option value="">Semua status</option><option value="masalah" ${flt.st ? 'selected' : ''}>Perlu tindakan (≤ 30 hari)</option></select></div>
    <div class="panel"><div class="panel-h"><h3><span class="dotc" style="background:var(--y);border-radius:0"></span>Alat radiasi diagnostik & intervensional</h3><span class="small muted">${rows.length} dari ${L.tb('Alat').length} alat</span></div>
    ${U.table([
      { h: 'Merek / tipe', v: a => `<a href="#/inventaris/alat/${a.id}"><b>${PR.esc(L.alatName(a))}</b></a><span class="sub">${PR.esc(a.jenis || '')}</span>` }, { h: 'No. seri', v: a => `<span class="num">${PR.esc(a.no_seri || '—')}</span>` },
      { h: 'Ruangan', v: a => PR.esc(L.ruangName(a.ruangan_id)) }, { h: 'No. izin', v: a => `<span class="num small">${PR.esc(a.no_izin || '—')}</span>` },
      { h: 'Izin s.d.', v: a => `<span class="num">${PR.d(a.izin_sd)}</span><span class="sub">${PR.validTag(a.izin_sd, a.izin_status === 'perpanjangan')}</span>` },
      { h: 'Ukes s.d.', v: a => `<span class="num">${PR.d(a.ukes_sd)}</span><span class="sub">${PR.validTag(a.ukes_sd, a.ukes_status === 'dijadwalkan')}</span>` },
      { h: 'BALIS', v: a => PR.tag(a.status_balis === 'terdaftar' ? 'terdaftar' : a.status_balis === 'proses' ? 'proses' : 'belum', a.status_balis === 'terdaftar' ? 'netral' : 'tinjau', 1) },
      { h: 'Survei', v: a => L.needResurvey(a) ? PR.tag('perlu survei ulang', 'tinjau') : (s => s ? `<span class="num small">${PR.d(s.tanggal)}</span>` : PR.tag('belum', 'dash', 1))(L.lastSurvey(a.id)) },
      { h: '', v: a => `<div class="row" style="gap:4px;flex-wrap:nowrap">${U.btn('Ubah', 'addAlat', '', 'btn-s', `data-id="${a.id}"`)}<a class="btn btn-s btn-d" href="#/inventaris/alat/${a.id}">Detail</a></div>` }
    ], rows, { empty: 'Belum ada alat. Tambahkan alat atau impor dari Excel.', emptyBtn: U.btn('Tambah alat', 'addAlat', 'plus', 'btn-y') })}</div>`;
  }
  function meterList() {
    const ms = L.tb('Alat_Ukur');
    return `<div class="grid g-8-4"><div class="panel"><div class="panel-h"><h3>Alat ukur / surveimeter</h3></div>${U.table([
      { h: 'Alat', v: m => `<b>${PR.esc(m.merek + ' ' + m.tipe)}</b><span class="sub">SN ${PR.esc(m.no_seri)} · ${PR.esc(m.detektor || '')}</span>` }, { h: 'Kepemilikan', v: m => PR.esc(m.kepemilikan || '') },
      { h: 'FK', r: 1, v: m => PR.f(PR.n(m.fk), 3) }, { h: 'Kalibrasi s.d.', v: m => `<span class="num">${PR.d(m.kal_sd)}</span><span class="sub">${m.status === 'sedang dikalibrasi' ? PR.tag('sedang dikalibrasi', 'netral', 1) : PR.validTag(m.kal_sd)}</span>` },
      { h: 'Sertifikat', v: m => U.fileChip(m.file_id, m.no_sertifikat || 'Sertifikat') }, { h: '', v: m => U.btn('Ubah', 'addMeter', '', 'btn-s', `data-id="${m.id}"`) }
    ], ms, { empty: 'Belum ada alat ukur.', emptyBtn: U.btn('Tambah alat ukur', 'addMeter', 'plus', 'btn-y') })}</div>
    <div class="stack">${ms.map(m => { const h = L.tb('Kalibrasi').filter(k => k.alat_ukur_id === m.id).sort((a, b) => a.tanggal.localeCompare(b.tanggal)); const fk = h.map(k => PR.n(k.fk)); const drift = fk.length > 1 && Math.abs(fk[fk.length - 1] - fk[fk.length - 2]) / fk[fk.length - 2] > 0.2;
      return `<div class="panel"><div class="panel-h panel-dark"><div><div class="eyebrow" style="color:var(--y)">${PR.esc(m.detektor || 'Detektor')}</div><h3 style="color:#fff">${PR.esc(m.merek + ' ' + m.tipe)}</h3></div>${PR.dueTag(PR.left(m.kal_sd))}</div><div class="panel-b">
        <div class="kv2"><div><small>No. seri</small><span class="num">${PR.esc(m.no_seri)}</span></div><div><small>Faktor kalibrasi</small><span class="num">${PR.f(PR.n(m.fk), 3)}</span></div></div>
        ${drift ? `<div class="ban ban-warn mt8">${PR.ic('triangle-alert')}<div class="grow small">FK berubah >20% dari kalibrasi sebelumnya — periksa kondisi detektor.</div></div>` : ''}
        <div class="eyebrow mt">Tren faktor kalibrasi</div>${h.length > 1 ? L.lineChart(h.map(k => ({ l: k.tanggal.slice(0, 4), v: PR.n(k.fk) })), { h: 150, band: [0.9, 1.1], label: 'Tren faktor kalibrasi' }) : '<p class="small muted">Tren muncul setelah ≥ 2 kalibrasi.</p>'}</div></div>`; }).join('')}</div></div>`;
  }
  function roomList() {
    return `<div class="panel">${U.table([
      { h: 'Ruangan', v: r => `<b>${PR.esc(r.nama)}</b><span class="sub">${PR.esc(r.lantai || '')}</span>` }, { h: 'Jenis', v: r => PR.esc(r.jenis || '') }, { h: 'Klasifikasi', v: r => PR.tag(r.klasifikasi || '—', 'netral', 1) }, { h: 'Ukuran', v: r => PR.esc(r.ukuran || '—') },
      { h: 'Alat', r: 1, v: r => L.tb('Alat').filter(a => a.ruangan_id === r.id).length }, { h: 'Perlengkapan', v: r => { const it = L.tb('Perlengkapan').filter(p => p.ruangan_id === r.id && (p.status === 'ada' || p.status === 'tidak perlu')).length; return `<span class="num">${it}/10</span>`; } },
      { h: '', v: r => `<div class="row" style="gap:4px;flex-wrap:nowrap">${PR.isPro() ? `<a class="btn btn-s" href="#/cetak/qr/${r.id}" title="QR pintu ruangan">${PR.ic('qr-code')}QR pintu</a>` : ''}${U.btn('Ubah', 'addRoom', '', 'btn-s', `data-id="${r.id}"`)}</div>` }
    ], L.tb('Ruangan'), { empty: 'Belum ada ruangan.', emptyBtn: U.btn('Tambah ruangan', 'addRoom', 'plus', 'btn-y') })}</div>`;
  }
  function perlList(q) {
    const rs = L.tb('Ruangan'); const rid = q.r || (rs[0] || {}).id; if (!rid) return U.empty('Tambahkan ruangan lebih dulu.', U.btn('Tambah ruangan', 'addRoom', 'plus', 'btn-y'));
    const it = L.tb('Perlengkapan').filter(p => p.ruangan_id === rid);
    const ok = L.PERLENGKAPAN.filter(k => it.some(p => p.item === k && (p.status === 'ada' || p.status === 'tidak perlu'))).length;
    return `<div class="panel"><div class="panel-h"><div><h3>Checklist perlengkapan proteksi radiasi</h3><span class="small muted">10 item sesuai LHI bagian 5 · per ruangan</span></div>
      <div class="row"><label class="small mono" for="perlRoom">LOKASI</label><select class="inp" id="perlRoom" style="width:auto">${rs.map(r => `<option value="${r.id}" ${r.id === rid ? 'selected' : ''}>${PR.esc(r.nama)}</option>`).join('')}</select><span class="tag ${ok === 10 ? 't-aman' : 't-tinjau'}">[${ok}/10]</span></div></div>
      <div class="panel-b" style="padding-top:0;padding-bottom:0">${L.PERLENGKAPAN.map((k, i) => { const p = it.find(x => x.item === k) || {}; const bad = p.status !== 'ada' && p.status !== 'tidak perlu';
        return `<div class="list-row" style="${bad ? 'background:var(--crit-b);margin:0 -16px;padding:10px 16px' : ''}"><span class="mono muted">${String(i + 1).padStart(2, '0')}</span><div class="grow"><b>${k}</b><span>${p.tanggal_cek ? 'Dicek ' + PR.d(p.tanggal_cek) : 'Belum dicek'}${p.keterangan ? ' · ' + PR.esc(p.keterangan) : ''}</span></div>
          ${PR.ro() ? PR.tag(p.status || 'belum dicek', bad ? 'kritis' : 'aman') : `<select class="inp" style="width:150px" data-perl="${PR.esc(k)}" data-room="${rid}">${[['', '— status —'], ['ada', 'Ada & laik'], ['belum ada', 'Belum ada'], ['rusak', 'Rusak'], ['tidak perlu', 'Tidak diperlukan']].map(([v, l]) => `<option value="${v}" ${p.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`}
          ${p.foto_id ? U.fileChip(p.foto_id, 'Foto') : ''}${PR.can('edit') ? `<label class="btn btn-s" title="Unggah foto bukti">${PR.ic('camera')}<input type="file" accept="image/*" capture="environment" hidden data-perlfoto="${PR.esc(k)}" data-room="${rid}"></label>` : ''}</div>`; }).join('')}</div></div>`;
  }

  PR.page('inventaris', {
    title: 'Inventaris', roles: ['ppr', 'peninjau'],
    crumb: r => `INVENTARIS / <b>${r.parts[0] === 'alat' && r.parts[1] ? 'DETAIL ALAT' : (r.parts[0] || 'ALAT RADIASI').replace('-', ' ').toUpperCase()}</b>`,
    render: r => {
      const tab = r.parts[0] || 'alat';
      if (tab === 'alat' && r.parts[1]) return detail(r.parts[1]);
      const acts = { alat: `${U.btn('Impor Excel', 'impAlat', 'file-up')}${U.btn('Tambah alat', 'addAlat', 'plus', 'btn-y')}`, 'alat-ukur': U.btn('Tambah alat ukur', 'addMeter', 'plus', 'btn-y'), ruangan: U.btn('Tambah ruangan', 'addRoom', 'plus', 'btn-y'), perlengkapan: '' }[tab];
      return `${U.head('INVENTARIS FASILITAS RADIOLOGI', 'Alat pemanfaat radiasi, alat ukur surveimeter, ruangan, dan perlengkapan proteksi.', `<button class="btn" data-act="expInv">${PR.ic('download')}Ekspor daftar</button>${acts}`)}
        ${tabs(tab)}${tab === 'alat' ? alatList() : tab === 'alat-ukur' ? meterList() : tab === 'ruangan' ? roomList() : perlList(r.q)}`;
    },
    mount: (root, r) => {
      PR.$$('[data-flt]', root).forEach(el => { el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = PR.debounce(() => { flt[el.dataset.flt] = el.value; PR.render(); setTimeout(() => { const f = PR.$(`[data-flt="${el.dataset.flt}"]`); if (f && f.tagName === 'INPUT') { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }, 0); }, el.tagName === 'INPUT' ? 250 : 0); });
      const pr = PR.$('#perlRoom', root); if (pr) pr.onchange = () => PR.go('#/inventaris/perlengkapan?r=' + pr.value);
      PR.$$('[data-perl]', root).forEach(s => s.onchange = () => { const p = L.tb('Perlengkapan').find(x => x.ruangan_id === s.dataset.room && x.item === s.dataset.perl) || { ruangan_id: s.dataset.room, item: s.dataset.perl }; A.save('Perlengkapan', Object.assign({}, p, { status: s.value, tanggal_cek: PR.today() })); PR.render(); });
      PR.$$('[data-perlfoto]', root).forEach(inp => inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { PR.toast('Mengunggah foto…'); const d = await A.upload(f); const p = L.tb('Perlengkapan').find(x => x.ruangan_id === inp.dataset.room && x.item === inp.dataset.perlfoto) || { ruangan_id: inp.dataset.room, item: inp.dataset.perlfoto, status: 'ada' }; A.save('Perlengkapan', Object.assign({}, p, { foto_id: d.id, tanggal_cek: PR.today() })); PR.toast('Foto bukti tersimpan', 'ok'); PR.render(); } catch (e) { PR.toast(e.message, 'err'); } });
    }
  });

  function detail(id) {
    const a = L.get('Alat', id); if (!a) return U.empty('Alat tidak ditemukan.', '<a class="btn" href="#/inventaris">Kembali</a>');
    const need = L.needResurvey(a), last = L.lastSurvey(a.id), riw = L.tb('Riwayat_Alat').filter(h => h.alat_id === id).sort((x, y) => y.tanggal.localeCompare(x.tanggal));
    const docs = L.tb('Dokumen').filter(d => d.objek_tipe === 'alat' && d.objek_id === id);
    const room = L.get('Ruangan', a.ruangan_id) || {};
    return `<div class="page-head"><div><div class="eyebrow"><a href="#/inventaris">INVENTARIS</a> / ALAT RADIASI / DETAIL & RIWAYAT</div><h1 style="margin-top:6px">${PR.esc(L.alatName(a))}</h1><div class="row mt8">${PR.tag(a.status_operasi === 'nonaktif' ? 'tidak digunakan' : 'aktif', 'netral', 1)}${PR.tag(a.status_balis === 'terdaftar' ? 'terdaftar di BALIS' : 'BALIS: ' + (a.status_balis || 'belum'), a.status_balis === 'terdaftar' ? 'netral' : 'tinjau', 1)}</div></div>
      <div class="actions">${U.btn('Ubah data', 'addAlat', 'pencil', '', `data-id="${a.id}"`)}${U.btn('Catat perbaikan / servis', 'addRiw', 'history', 'btn-y', `data-alat="${a.id}"`)}<button class="btn" data-act="print">${PR.ic('printer')}Cetak</button></div></div>
      ${need ? `<div class="ban ban-crit">${PR.ic('triangle-alert', 'ic-l')}<div class="grow"><b>${PR.esc(need.jenis)} tercatat ${PR.d(need.tanggal)} — survei paparan ulang diperlukan</b><p>Perba BAPETEN 4/2020 Ps. 32: pemantauan paparan dilakukan setelah perbaikan alat, perubahan perangkat lunak, atau renovasi ruang.</p></div>${U.btn('Input hasil survei', '', 'radar', 'btn-y', `data-go="#/survei/baru?alat=${a.id}"`)}</div>` : ''}
      <div class="grid g4">
        ${U.tile(PR.validTag(a.izin_sd, a.izin_status === 'perpanjangan'), `<span style="font-size:20px">${PR.d(a.izin_sd)}</span>`, 'Izin pemanfaatan', `No. ${PR.esc(a.no_izin || '—')}`)}
        ${U.tile(PR.validTag(a.ukes_sd, a.ukes_status === 'dijadwalkan'), `<span style="font-size:20px">${PR.d(a.ukes_sd)}</span>`, 'Uji kesesuaian', `No. ${PR.esc(a.ukes_no || '—')}`)}
        ${U.tile(need ? PR.tag('perlu ulang', 'tinjau') : last ? PR.tag('ada', 'aman') : PR.tag('belum', 'dash', 1), `<span style="font-size:20px">${last ? PR.d(last.tanggal) : '—'}</span>`, 'Survei paparan terakhir', last ? 'Status: ' + L.TITIK_LABEL[L.surveiStatus(last)] : 'Belum ada survei')}
        ${U.tile(PR.tag(riw.length + ' catatan', 'netral', 1), riw.length, 'Logbook intervensi', riw.filter(h => h.memicu_survei === 'ya').length + ' memicu survei ulang')}
      </div>
      <div class="grid g-8-4 mt">
        <div class="stack">
          <div class="panel"><div class="panel-h"><h3>${PR.ic('settings')} Spesifikasi teknis</h3></div><div class="panel-b"><div class="kv2">
            ${[['Merek', a.merek], ['Tipe / model', a.tipe], ['Jenis', a.jenis], ['Nomor seri', a.no_seri], ['Ruangan', room.nama], ['Klasifikasi ruang', room.klasifikasi], ['Nomor izin', a.no_izin], ['Kapasitas', a.kv_ma], ['Ukuran ruangan', room.ukuran], ['Catatan', a.catatan]].map(([k, v]) => `<div><small>${k}</small>${PR.esc(v || '—')}</div>`).join('')}</div></div></div>
          <div class="panel"><div class="panel-h"><h3>${PR.ic('history')} Logbook intervensi, servis & modifikasi</h3>${U.btn('Tambah', 'addRiw', 'plus', 'btn-s', `data-alat="${a.id}"`)}</div>
            ${U.table([{ h: 'Tanggal', v: h => `<span class="num">${PR.d(h.tanggal)}</span>` }, { h: 'Jenis', v: h => PR.tag(h.jenis, 'netral', 1) }, { h: 'Pelaksana', v: h => PR.esc(h.pelaksana || '—') }, { h: 'Keterangan', v: h => `<span class="small">${PR.esc(h.keterangan || '')}</span>` },
              { h: 'Memicu survei', v: h => h.memicu_survei === 'ya' ? (last && last.tanggal > h.tanggal ? PR.tag('ya · sudah disurvei', 'aman') : PR.tag('ya · perlu survei', 'tinjau')) : PR.tag('tidak', 'netral', 1) }, { h: 'Berkas', v: h => U.fileChip(h.file_id, 'BA') },
              { h: '', v: h => U.btn('Ubah', 'addRiw', '', 'btn-s', `data-alat="${a.id}" data-id="${h.id}"`) }], riw, { empty: 'Belum ada catatan intervensi.' })}</div>
        </div>
        <div class="stack"><div class="panel"><div class="panel-h"><h3>${PR.ic('file-text')} Dokumen alat</h3></div><div class="panel-b">${docs.length ? docs.map(d => `<div class="list-row">${PR.ic('file-text')}<div class="grow"><b>${PR.esc(d.kategori)}</b><span>${PR.esc(d.nomor || '')} · s.d. ${PR.d(d.berlaku_sd)}</span></div>${U.fileChip(d.file_id, 'Buka')}</div>`).join('') : '<p class="small muted" style="margin:0">Unggah berkas izin / sertifikat uji kesesuaian lewat tombol Ubah data.</p>'}</div></div>
          <div class="panel"><div class="panel-h"><h3>${PR.ic('radar')} Riwayat survei</h3></div><div class="panel-b">${L.tb('Survei').filter(s => s.alat_id === id).sort((x, y) => y.tanggal.localeCompare(x.tanggal)).map(s => `<div class="list-row"><span class="num small">${PR.d(s.tanggal)}</span><div class="grow"><span>${PR.esc(s.petugas || '')}</span></div>${L.titikTag(L.surveiStatus(s))}</div>`).join('') || '<p class="small muted" style="margin:0">Belum ada survei.</p>'}</div></div></div>
      </div>`;
  }

  PR.acts.expInv = () => PR.download(`inventaris-${PR.today()}.csv`, PR.toCSV(L.tb('Alat').map(a => Object.assign({}, a, { ruangan: L.ruangName(a.ruangan_id) })), ['ruangan', 'jenis', 'merek', 'tipe', 'no_seri', 'kv_ma', 'no_izin', 'izin_sd', 'ukes_no', 'ukes_sd', 'status_balis']));
  PR.acts.impAlat = () => PR.modal({ title: 'Impor alat dari Excel / CSV', body: `<p class="small" style="margin-top:0">Kolom: ${['kategori (alat/surveimeter)', 'ruangan', 'jenis', 'merek', 'tipe', 'no_seri', 'no_izin', 'izin_sd', 'ukes_sd', 'kalibrasi_sd', 'fk'].join(', ')}. Tanggal format YYYY-MM-DD atau DD/MM/YYYY.</p><label class="drop">${PR.ic('file-up')} Pilih berkas <b>.xlsx / .csv</b><input type="file" accept=".xlsx,.xls,.csv" hidden id="impA"></label><div id="impRes" class="mt8 small"></div><div class="mt8"><button class="link small" data-act="tpl" data-k="alat">Unduh template</button></div>`,
    onMount: (m, close) => { PR.$('#impA', m).onchange = async e => { try { const x = await PR.importRows(e.target.files[0], 'alat'); if (x.errs.length) { PR.$('#impRes', m).innerHTML = x.errs.slice(0, 5).map(PR.esc).join('<br>'); return; } const n = PR.commitImport('alat', x.data); close(); PR.toast(n + ' data diimpor', 'ok'); PR.render(); } catch (er) { PR.toast(er.message, 'err'); } }; } });
})(window.PR);
