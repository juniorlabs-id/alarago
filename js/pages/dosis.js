/* AlaraGo — W-06 Kartu Dosis, W-06B Impor TLD, W-07 MCU, W-08 Detail pekerja */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const st = { yr: null, q: '', prof: '', status: '', kat: '', mq: '', imp: null };
  const KES = ['Laik kerja', 'Laik dengan catatan', 'Laik dengan pembatasan', 'Tidak laik sementara'];
  const kesTag = k => PR.tag(k || '—', k === 'Laik kerja' ? 'aman' : k === 'Tidak laik sementara' ? 'kritis' : k ? 'tinjau' : 'dash', 1);

  const fWorker = () => ({ title: 'Pekerja radiasi', wide: true, fields: [
    { k: 'nama', label: 'Nama lengkap & gelar', req: 1 }, { k: 'npr', label: 'NPR / nomor dosimeter', mono: 1, req: 1 },
    { k: 'profesi', label: 'Profesi', req: 1, ph: 'Radiografer Umum', help: 'Dipakai untuk mengelompokkan pembatas dosis per profesi' }, { k: 'kategori', label: 'Kategori kerja', type: 'select', opts: [['umum', 'Umum'], ['intervensional', 'Intervensional (wajib TLD lensa mata)']] },
    { k: 'email', label: 'Email Google (untuk masuk portal)', ph: 'kosongkan jika memakai QR + PIN' }, { k: 'no_hp', label: 'No. HP / WhatsApp', mono: 1 },
    { k: 'izin_bekerja', label: 'No. Izin Bekerja (jika wajib)', mono: 1 }, { k: 'izin_bekerja_sd', label: 'Izin bekerja berlaku s.d.', type: 'date' },
    { k: 'pelatihan_terakhir', label: 'Pelatihan proteksi radiasi terakhir', type: 'date', help: 'Penyegaran minimal tiap 5 tahun (Perba 4/2020 Ps. 14)' }, { k: 'aktif', label: 'Status', type: 'select', opts: [['ya', 'Aktif'], ['tidak', 'Tidak aktif / pindah']] }],
    onMount: m => { const dl = document.createElement('datalist'); dl.id = 'proflist'; dl.innerHTML = L.profesiList().concat(['Radiografer Umum', 'Radiografer Intervensional', 'Dokter Spesialis Radiologi', 'Fisikawan Medis', 'Perawat Radiologi']).filter((v, i, a) => a.indexOf(v) === i).map(p => `<option value="${PR.esc(p)}">`).join(''); m.appendChild(dl); m.querySelector('[name=profesi]').setAttribute('list', 'proflist'); } });
  PR.acts.addWorker = async el => {
    const w = el.dataset.id ? L.get('Pekerja', el.dataset.id) : { kategori: 'umum', aktif: 'ya' };
    const def = fWorker(); if (el.dataset.id) def.del = true;
    const v = await PR.form(def, w); if (!v) return;
    if (v._delete) { if (L.tb('Dosis').some(d => d.pekerja_id === w.id)) { A.save('Pekerja', Object.assign({}, w, { aktif: 'tidak', status_akun: 'nonaktif' })); PR.toast('Pekerja memiliki rekaman dosis (wajib disimpan ≥ 30 tahun) — status diubah menjadi tidak aktif.', 'warn'); } else { A.remove('Pekerja', w.id); } return PR.go('#/dosis'); }
    delete v._files; if (!w.id) { v.metode = v.email ? 'Google' : 'QR + PIN'; v.status_akun = v.email ? 'aktif' : 'menunggu aktivasi'; }
    if (v.aktif === 'tidak') v.status_akun = 'nonaktif';
    A.save('Pekerja', v); PR.toast('Data pekerja disimpan', 'ok'); PR.render();
  };
  PR.acts.addDose = async el => {
    const w = L.get('Pekerja', el.dataset.w), d = el.dataset.id ? L.get('Dosis', el.dataset.id) : { tahun: String(PR.year()), periode: 'TW' + (PR.quarter() - 1 || 1), jenis_kegiatan: 'rutin', pekerja_id: w.id };
    const v = await PR.form({ title: 'Data dosis · ' + w.nama, del: !!el.dataset.id, fields: [
      { k: 'tahun', label: 'Tahun', type: 'number', req: 1 }, { k: 'periode', label: 'Periode', type: 'select', opts: ['TW1', 'TW2', 'TW3', 'TW4'] },
      { k: 'hp10', label: 'Hp(10) seluruh tubuh (mSv)', type: 'number', req: 1 }, { k: 'hp3', label: 'Hp(3) lensa mata (mSv)', type: 'number' },
      { k: 'lab', label: 'Laboratorium dosimetri' }, { k: 'tanggal_terima', label: 'Tanggal hasil diterima', type: 'date', def: PR.today() },
      { k: 'jenis_kegiatan', label: 'Jenis kegiatan', type: 'select', opts: [['rutin', 'Operasi rutin'], ['komisioning', 'Komisioning (dicatat terpisah)'], ['pengujian', 'Pengujian setelah modifikasi'], ['abnormal', 'Penanggulangan kondisi abnormal'], ['dekomisioning', 'Dekomisioning']], help: 'Dekomisioning & kondisi abnormal tidak ikut perhitungan pembatas dosis' },
      { k: 'pengganti', label: 'Data pengganti (TLD hilang/rusak — berita acara)', type: 'check' }, { k: 'keterangan', label: 'Keterangan', type: 'textarea' }] }, d);
    if (!v) return; if (v._delete) { A.remove('Dosis', d.id); return PR.render(); }
    delete v._files; v.id = v.id || `DS${w.id}${v.tahun}${String(v.periode).replace(/\D/g, '')}${v.jenis_kegiatan === 'rutin' ? '' : v.jenis_kegiatan.slice(0, 3)}`; v.pekerja_id = w.id;
    A.save('Dosis', v, { notify: 'dosis' }); PR.toast('Data dosis disimpan', 'ok'); PR.render();
  };
  PR.acts.addMcu = async el => {
    const w = L.get('Pekerja', el.dataset.w), m = el.dataset.id ? L.get('MCU', el.dataset.id) : { pekerja_id: w.id, tanggal: PR.today(), kesimpulan: 'Laik kerja' };
    const v = await PR.form({ title: 'Hasil MCU · ' + w.nama, del: !!el.dataset.id, intro: 'Simpan hanya <b>kesimpulan kelaikan</b>. Hasil laboratorium dan diagnosis tetap di unit kesehatan / rekam medis RS.', fields: [
      { k: 'tanggal', label: 'Tanggal MCU', type: 'date', req: 1 }, { k: 'faskes', label: 'Fasilitas pemeriksa', req: 1 },
      { k: 'kesimpulan', label: 'Kesimpulan', type: 'select', opts: KES }, { k: 'berlaku_sd', label: 'Berlaku s.d.', type: 'date', help: 'Otomatis +12 bulan (PP 45/2023 Ps. 24: minimal 1× setahun)' },
      { k: 'pembatasan', label: 'Pembatasan tugas (tanpa diagnosis)', ph: 'Contoh: tidak bertugas di intervensional s.d. Mar 2027', full: 1 },
      { k: 'hamil', label: 'Pekerja hamil — hanya terlihat PPR; tempatkan di lokasi kerja < 1 mSv/tahun', type: 'check' },
      { k: 'file_id', label: 'Surat keterangan laik kerja (opsional, akses terbatas)', type: 'file' }],
      onMount: mm => { const t = mm.querySelector('[name=tanggal]'), b = mm.querySelector('[name=berlaku_sd]'); const upd = () => { if (t.value) b.value = PR.addMonths(t.value, 12); }; t.onchange = upd; if (!b.value) upd(); } }, m);
    if (!v) return; if (v._delete) { A.remove('MCU', m.id); return PR.render(); }
    try { v.file_id = await A.uploadFrom(v, 'file_id', 'mcu'); delete v._files; v.pekerja_id = w.id; if (!v.berlaku_sd) v.berlaku_sd = PR.addMonths(v.tanggal, 12); A.save('MCU', v); PR.toast('MCU disimpan', 'ok'); PR.render(); } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.addInv = async el => {
    const x = el.dataset.id ? L.get('Investigasi', el.dataset.id) : { pekerja_id: el.dataset.w || '', tahun: String(PR.year()), jenis: 'melebihi DC', status: 'terbuka' };
    const v = await PR.form({ title: 'Investigasi dosis', wide: true, del: !!el.dataset.id, intro: 'Dosis di atas pembatas dosis bukan pelanggaran, tetapi wajib dianalisis akar penyebabnya (Pedoman Teknis BAPETEN, Bab V). Dosis di atas NBD: rekonstruksi dosis & lapor ≤ 10 hari kerja (Perba 4/2020 Ps. 37).', fields: [
      { k: 'pekerja_id', label: 'Pekerja', type: 'select', opts: L.activeWorkers().map(w => [w.id, w.nama]), req: 1 }, { k: 'tahun', label: 'Tahun', type: 'number' },
      { k: 'jenis', label: 'Jenis', type: 'select', opts: [['melebihi DC', 'Melebihi pembatas dosis'], ['melebihi NBD', 'Melebihi NBD (lapor ≤ 10 hari kerja)'], ['dosis tinggi triwulan', 'Dosis triwulan tinggi']] },
      { k: 'status', label: 'Status', type: 'select', opts: ['terbuka', 'dalam proses', 'selesai'] },
      { k: 'akar_penyebab', label: 'Akar penyebab', type: 'textarea', help: 'SDM, peralatan, prosedur, beban kerja, perlengkapan proteksi, insiden, posisi TLD kontrol' },
      { k: 'rencana', label: 'Rencana tindakan korektif', type: 'textarea' }, { k: 'penanggung_jawab', label: 'Penanggung jawab' }, { k: 'tenggat', label: 'Tenggat', type: 'date', def: PR.addDays(PR.today(), 30) }] }, x);
    if (!v) return; if (v._delete) { A.remove('Investigasi', x.id); return PR.render(); }
    delete v._files; A.save('Investigasi', v); PR.toast('Investigasi disimpan — tenggat masuk Kalender Kepatuhan', 'ok'); PR.render();
  };
  PR.acts.qrWorker = async el => {
    const w = L.get('Pekerja', el.dataset.id);
    if (!(await PR.confirm(`Buat QR akses baru untuk <b>${PR.esc(w.nama)}</b>? QR lama (jika ada) langsung tidak berlaku dan pekerja perlu membuat PIN baru.`, 'Buat QR'))) return;
    try {
      const d = await A.call('issueQR', { id: w.id }); A.save('Pekerja', Object.assign({}, w, { metode: 'QR + PIN', status_akun: 'menunggu aktivasi' }));
      const link = `${PR.appBase()}#/qr?b=${encodeURIComponent(A.bId())}&t=${encodeURIComponent(d.token)}`;
      PR.modal({ title: 'QR akses pekerja', body: `<div class="grid g2"><div class="qrbox" id="qrw"></div><div><div class="eyebrow">Untuk</div><h3>${PR.esc(w.nama)}</h3><p class="small muted">${PR.esc(w.profesi)} · ${PR.esc(w.npr)}</p><ol class="small" style="padding-left:18px;line-height:1.6"><li>Serahkan QR ini langsung ke pekerja (tempel di ID card / kartu TLD).</li><li>Pekerja memindai QR → membuat PIN 6 digit.</li><li>QR hanya ditampilkan sekali. Hilang? Buat QR baru.</li></ol></div></div>`,
        foot: `<button class="btn" data-copy>${PR.ic('link')}Salin tautan</button><button class="btn" data-wa>${PR.ic('message-circle')}Kirim via WA</button><button class="btn btn-y" data-print>${PR.ic('printer')}Cetak</button>`,
        onMount: m => { PR.qr(link, PR.$('#qrw', m)); m.querySelector('[data-copy]').onclick = () => PR.copy(link); m.querySelector('[data-wa]').onclick = () => PR.wa(`Halo ${w.nama}, ini tautan akses AlaraGo pribadi Anda (jangan dibagikan): ${link}`, w.no_hp); m.querySelector('[data-print]').onclick = () => { const win = window.open('', '_blank'); win.document.write(`<title>QR ${PR.esc(w.nama)}</title><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>AlaraGo · Akses Pekerja</h2><div style="width:260px;margin:auto">${PR.$('#qrw', m).innerHTML}</div><h3>${PR.esc(w.nama)}</h3><p>${PR.esc(w.npr)} · ${PR.esc(w.profesi)}</p><p style="font-size:12px;color:#555">Pindai dengan kamera HP, lalu buat PIN 6 digit. Jangan dibagikan.</p><script>setTimeout(()=>print(),300)<\/script>`); }; } });
      PR.render();
    } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.unlockW = async el => { try { await A.call('unlockWorker', { id: el.dataset.id }); PR.toast('Kunci PIN dibuka', 'ok'); } catch (e) { PR.toast(e.message, 'err'); } };

  // ------------ halaman ------------
  const tabs = cur => U.tabs([['dosis', 'Dosis', L.activeWorkers().length + ' pekerja', '#/dosis'], ['mcu', 'MCU (pemeriksaan kesehatan)', null, '#/dosis/mcu']], cur);
  function list() {
    const yr = st.yr || PR.year(), ws = L.activeWorkers();
    const rows = ws.map(w => ({ w, s: L.doseStatus(w, yr), miss: L.missingQuarter(w, yr) })).filter(x => (!st.q || (x.w.nama + ' ' + x.w.npr).toLowerCase().includes(st.q.toLowerCase())) && (!st.prof || x.w.profesi === st.prof) && (!st.status || x.s.status === st.status) && (!st.kat || x.w.kategori === st.kat));
    const all = ws.map(w => L.doseStatus(w, yr).status), c = k => all.filter(s => s === k).length;
    const years = [...new Set(L.tb('Dosis').map(d => +d.tahun))].concat([PR.year()]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a);
    const lp = L.latestPeriod();
    const tile = (k, n, t, p) => `<div class="tile ${k === 'kritis' && n ? 'crit' : ''}"><div class="spread">${L.doseTag(k)}<span class="eyebrow">${t}</span></div><div class="big">${String(n).padStart(2, '0')}</div><p>${p}</p></div>`;
    return `${U.head('Kartu dosis pekerja radiasi', 'Pencatatan dosis perorangan Hp(10) dan lensa mata Hp(3) per triwulan. Rekaman disimpan minimal 30 tahun (Perba 4/2020 Ps. 36).',
      `<select class="inp" style="width:auto" data-st="yr">${years.map(y => `<option ${y === yr ? 'selected' : ''}>${y}</option>`).join('')}</select><a class="btn" href="#/cetak/rekap">${PR.ic('printer')}Rekap PDF</a>${U.btn('Tambah pekerja', 'addWorker', 'plus')}${PR.can('edit') ? `<a class="btn btn-y" href="#/dosis/impor">${PR.ic('file-up')}Impor hasil TLD</a>` : ''}`)}
      ${tabs('dosis')}
      <div class="grid g4 mb">${tile('aman', c('aman'), 'Status', '< 50% pembatas dosis')}${tile('tinjau', c('tinjau'), 'Peringatan', '50–100% DC atau triwulan tinggi')}${tile('analisis', c('analisis'), 'Investigasi', 'Dosis tahunan > DC (bukan pelanggaran)')}${tile('kritis', c('kritis'), 'Ambang NBD', `> ${L.NBD().pekerja_tahun} mSv/tahun atau > ${L.NBD().pekerja_5tahun} mSv/5 tahun`)}</div>
      <div class="filters"><div class="search">${PR.ic('search')}<input class="inp" placeholder="Cari nama pekerja atau NPR…" value="${PR.esc(st.q)}" data-st="q"></div>
        <select class="inp" data-st="prof"><option value="">Semua profesi</option>${L.profesiList().map(p => `<option ${st.prof === p ? 'selected' : ''}>${PR.esc(p)}</option>`).join('')}</select>
        <select class="inp" data-st="status"><option value="">Semua status</option>${['aman', 'tinjau', 'analisis', 'kritis'].map(s => `<option value="${s}" ${st.status === s ? 'selected' : ''}>${L.STATUS_LABEL[s]}</option>`).join('')}</select>
        <select class="inp" data-st="kat"><option value="">Kategori: semua</option><option value="intervensional" ${st.kat === 'intervensional' ? 'selected' : ''}>Intervensional</option><option value="umum" ${st.kat === 'umum' ? 'selected' : ''}>Umum</option></select></div>
      <div class="panel"><div class="panel-h panel-dark"><h3 style="color:#fff">${PR.ic('list')} Lembar dosis perorangan ${yr}</h3><span class="mono tiny" >Satuan mSv${lp ? ` · Data terakhir TW${lp.tw} ${lp.tahun}` : ''}</span></div>
      ${U.table([
        { h: 'Nama & kategori', v: x => `<a href="#/dosis/p/${x.w.id}"><b>${PR.esc(x.w.nama)}</b></a><span class="sub mono">${PR.esc(x.w.kategori || '')}</span>` }, { h: 'NPR', v: x => `<span class="num">${PR.esc(x.w.npr)}</span>` }, { h: 'Profesi', v: x => PR.esc(x.w.profesi) },
        ...[1, 2, 3, 4].map(q => ({ h: 'TW' + q, r: 1, v: x => x.s.q[q] ? PR.f(PR.n(x.s.q[q].hp10)) + (x.s.q[q].pengganti === 'ya' ? '*' : '') : x.miss.includes(q) ? '<span class="tag t-tinjau">TLD hilang</span>' : '<span class="muted">—</span>' })),
        { h: `Total ${yr}`, r: 1, v: x => `<b style="color:${x.s.status === 'analisis' || x.s.status === 'kritis' ? 'var(--crit)' : 'inherit'}">${PR.f(x.s.sum)}</b>` },
        { h: '% DC', v: x => x.s.dc ? `<div class="row" style="gap:6px;flex-wrap:nowrap"><span class="num small" style="width:40px">${PR.pct(x.s.sum / x.s.dc)}</span><div class="bar ${x.s.ratio > 1 ? 'b-ana' : x.s.ratio >= 0.5 ? 'b-warn' : 'b-ok'}" style="flex:1"><i style="width:${Math.min(100, x.s.sum / x.s.dc * 100)}%"></i></div></div><span class="sub mono">DC ${PR.f(x.s.dc)}</span>` : '<span class="tag t-dash">DC belum</span>' },
        { h: 'Lensa Hp(3)', r: 1, v: x => x.w.kategori === 'intervensional' ? PR.f(x.s.lens) : '<span class="muted">—</span>' },
        { h: 'Dibaca', v: x => { const lp2 = L.latestPeriod(); const d = lp2 && L.tb('Dosis').find(r => r.pekerja_id === x.w.id && +r.tahun === lp2.tahun && +String(r.periode).replace(/\D/g, '') === lp2.tw); return d ? (d.dibaca_pada ? PR.tag('dibaca', 'aman', 1) : PR.tag('belum', 'dash', 1)) : ''; } },
        { h: 'Status', v: x => L.doseTag(x.s.status) }
      ], rows, { rowAttr: x => x.miss.length ? 'class="warnrow"' : '', empty: ws.length ? 'Tidak ada pekerja sesuai filter.' : 'Belum ada pekerja radiasi.', emptyBtn: ws.length ? '' : U.btn('Tambah pekerja', 'addWorker', 'plus', 'btn-y'), foot: `<span>Menampilkan ${rows.length} dari ${ws.length} pekerja · * data pengganti</span><span>NBD: ${L.NBD().pekerja_rata5} mSv/tahun (rata-rata 5 tahun), maks ${L.NBD().pekerja_tahun} mSv/tahun</span>` })}</div>`;
  }
  function mcu() {
    const ws = L.activeWorkers(), rows = ws.map(w => ({ w, m: L.lastMcu(w.id) })).filter(x => !st.mq || x.w.nama.toLowerCase().includes(st.mq.toLowerCase()));
    const valid = rows.filter(x => x.m && PR.left(x.m.berlaku_sd) >= 0).length, soon = rows.filter(x => x.m && PR.left(x.m.berlaku_sd) >= 0 && PR.left(x.m.berlaku_sd) <= 30);
    const restr = rows.filter(x => x.m && x.m.kesimpulan === 'Laik dengan pembatasan').length;
    return `${U.head('Pemantauan kesehatan (MCU)', 'Pemeriksaan kesehatan pekerja radiasi minimal 1× setahun (PP 45/2023 Ps. 24). Yang disimpan hanya kesimpulan kelaikan — bukan hasil laboratorium atau diagnosis.', `<a class="btn" href="#/cetak/mcu">${PR.ic('printer')}Ekspor rekap MCU</a>`)}
      ${tabs('mcu')}
      <div class="grid g4 mb">${U.tile(PR.tag('aman', 'aman'), `${valid}<span style="font-size:20px"> / ${ws.length}</span>`, 'MCU berlaku', 'Dalam 12 bulan terakhir')}${U.tile(PR.tag('tinjau', 'tinjau'), soon.length, 'Jatuh tempo ≤ 30 hari', 'Jadwalkan pemeriksaan ulang')}${U.tile(PR.tag('analisis', 'analisis'), restr, 'Pembatasan tugas', 'Atur penugasan')}${U.tile('', ws.length - valid, 'Kedaluwarsa / belum ada', 'Prioritas tindak lanjut', ws.length - valid ? 'crit' : '')}</div>
      ${soon.length ? `<div class="ban ban-warn">${PR.ic('bell')}<div class="grow"><b>MCU ${soon.length} pekerja akan berakhir</b><p>${soon.slice(0, 4).map(x => PR.esc(x.w.nama) + ' (' + PR.d(x.m.berlaku_sd) + ')').join(', ')}</p></div><a class="btn btn-s" href="#/kalender">Lihat di kalender</a></div>` : ''}
      <div class="filters"><div class="search">${PR.ic('search')}<input class="inp" placeholder="Cari nama pekerja…" value="${PR.esc(st.mq)}" data-st="mq"></div></div>
      <div class="panel">${U.table([
        { h: 'Nama', v: x => `<b>${PR.esc(x.w.nama)}</b><span class="sub">${PR.esc(x.w.profesi)}</span>` }, { h: 'NPR', v: x => `<span class="num">${PR.esc(x.w.npr)}</span>` },
        { h: 'Tgl MCU', v: x => `<span class="num">${x.m ? PR.d(x.m.tanggal) : '—'}</span>` }, { h: 'Faskes', v: x => PR.esc(x.m ? x.m.faskes : '') },
        { h: 'Kesimpulan', v: x => x.m ? kesTag(x.m.kesimpulan) + (x.m.hamil === 'ya' && PR.can('edit') ? ' ' + PR.tag('hamil · privat', 'netral', 1) : '') : PR.tag('belum ada', 'kritis') },
        { h: 'Berlaku s.d.', v: x => x.m ? `<span class="num">${PR.d(x.m.berlaku_sd)}</span><span class="sub">${PR.dueTag(PR.left(x.m.berlaku_sd))}</span>` : '' },
        { h: 'Pembatasan tugas', v: x => `<span class="small">${PR.esc(x.m && x.m.pembatasan || '—')}</span>` }, { h: 'Surat', v: x => x.m && x.m.file_id ? U.fileChip(x.m.file_id, 'Laik kerja') : '' },
        { h: '', v: x => `<div class="row" style="gap:4px;flex-wrap:nowrap">${x.m ? U.btn('Ubah', 'addMcu', '', 'btn-s', `data-w="${x.w.id}" data-id="${x.m.id}"`) : ''}${U.btn('Catat MCU', 'addMcu', 'plus', 'btn-s btn-y', `data-w="${x.w.id}"`)}</div>` }
      ], rows, { empty: 'Belum ada pekerja.' })}</div>
      <p class="small muted mt">${PR.ic('lock', 'ic-s')} Surat laik kerja disimpan di folder Drive terbatas; setiap pembukaan tercatat di Log Akses. Peninjau hanya melihat jumlah MCU yang berlaku.</p>`;
  }
  function impor() {
    const s = st.imp || (st.imp = { step: 1, tahun: PR.year(), tw: PR.quarter() - 1 || 1, lab: '', rows: null, head: null, map: {} });
    const ws = L.activeWorkers(), byNpr = {}, byName = {}; ws.forEach(w => { if (w.npr) byNpr[String(w.npr).toLowerCase().replace(/\s/g, '')] = w; byName[String(w.nama).toLowerCase()] = w; });
    let preview = [];
    if (s.rows && s.map.hp10 != null) preview = s.rows.map(r => { const npr = s.map.npr != null ? String(r[s.map.npr] || '').toLowerCase().replace(/\s/g, '') : ''; const nm = s.map.nama != null ? String(r[s.map.nama] || '').toLowerCase() : ''; const w = byNpr[npr] || byName[nm]; return { raw: r, w, hp10: r[s.map.hp10], hp3: s.map.hp3 != null ? r[s.map.hp3] : '' }; });
    const matched = preview.filter(p => p.w && PR.has(p.hp10)), missing = ws.filter(w => !preview.some(p => p.w && p.w.id === w.id));
    const steps = ['Unggah berkas', 'Cocokkan kolom', 'Periksa & validasi', 'Simpan'];
    const sel = (k, lbl) => `<div class="f"><label>${lbl}</label><select class="inp" data-map="${k}"><option value="">— tidak ada —</option>${(s.head || []).map((h, i) => `<option value="${i}" ${s.map[k] === i ? 'selected' : ''}>${PR.esc(h || 'Kolom ' + (i + 1))}</option>`).join('')}</select></div>`;
    return `${U.head('Impor hasil evaluasi TLD', 'Impor hasil pembacaan dosimeter perorangan dari berkas laporan laboratorium dosimetri (CSV / Excel). Pencocokan otomatis berdasarkan NPR.', `<button class="btn" data-act="tldTpl">${PR.ic('download')}Unduh format contoh CSV</button>`, '<a href="#/dosis">Kartu dosis</a> / Impor hasil TLD')}
      <div class="steps">${steps.map((t, i) => `<div class="${i + 1 < s.step ? 'done' : i + 1 === s.step ? 'on' : ''}"><span class="n">${i + 1 < s.step ? PR.ic('check', 'ic-s') : i + 1}</span><div><small>Langkah ${String(i + 1).padStart(2, '0')}</small><b>${t}</b></div></div>`).join('')}</div>
      <div class="panel"><div class="panel-b">
        <div class="fgrid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${PR.fieldHTML({ k: 'imp_tahun', label: 'Tahun', type: 'number' }, s.tahun)}${PR.fieldHTML({ k: 'imp_tw', label: 'Periode', type: 'select', opts: [[1, 'TW1 (Jan–Mar)'], [2, 'TW2 (Apr–Jun)'], [3, 'TW3 (Jul–Sep)'], [4, 'TW4 (Okt–Des)']] }, s.tw)}${PR.fieldHTML({ k: 'imp_lab', label: 'Laboratorium penerbit' }, s.lab)}</div>
        <label class="drop mt">${PR.ic('file-up')} ${s.rows ? `<b>${PR.esc(s.fname)}</b> · ${s.rows.length} baris terdeteksi — ganti berkas` : 'Tarik & lepas berkas hasil TLD, atau <b>pilih berkas</b> (.csv / .xlsx)'}<input type="file" accept=".csv,.xlsx,.xls" hidden id="tldFile"></label>
        ${s.head ? `<div class="eyebrow mt">Cocokkan kolom</div><div class="fgrid mt8" style="grid-template-columns:repeat(4,minmax(0,1fr))">${sel('npr', 'NPR / no. dosimeter')}${sel('nama', 'Nama (cadangan)')}${sel('hp10', 'Hp(10) mSv *')}${sel('hp3', 'Hp(3) mSv (lensa)')}</div>` : ''}
      </div></div>
      ${preview.length ? `${missing.length ? `<div class="ban ban-warn mt">${PR.ic('triangle-alert')}<div class="grow"><b>${missing.length} pekerja tidak ditemukan di berkas</b><p>${missing.slice(0, 5).map(w => PR.esc(w.nama) + ' (' + PR.esc(w.npr) + ')').join(', ')}${missing.length > 5 ? '…' : ''} — tandai sebagai <span class="tag t-tinjau">TLD hilang</span> dan isi data pengganti bila perlu.</p></div></div>` : ''}
        <div class="panel mt"><div class="panel-h"><h3>Matriks pencocokan dosimeter perorangan</h3><span class="row"><span class="tag t-aman">[Cocok ${matched.length}]</span><span class="tag ${preview.length - matched.length ? 't-kritis' : ''}">[Tidak cocok ${preview.length - matched.length}]</span></span></div>
        ${U.table([{ h: 'No', v: (p, i) => i + 1 }, { h: 'NPR (berkas)', v: p => `<span class="num">${PR.esc(s.map.npr != null ? p.raw[s.map.npr] : '')}</span>` }, { h: 'Pekerja', v: p => p.w ? `<b>${PR.esc(p.w.nama)}</b><span class="sub">${PR.esc(p.w.profesi)}</span>` : `<span style="color:var(--crit)">${PR.esc(s.map.nama != null ? p.raw[s.map.nama] : 'tidak dikenal')}</span>` },
          { h: 'Hp(10)', r: 1, v: p => PR.has(p.hp10) ? PR.f(PR.n(p.hp10)) : '<span class="tag t-kritis">Kosong</span>' }, { h: 'Hp(3)', r: 1, v: p => PR.has(p.hp3) ? PR.f(PR.n(p.hp3)) : '—' },
          { h: 'Status', v: p => p.w && PR.has(p.hp10) ? PR.tag('cocok', 'aman') : PR.tag(p.w ? 'nilai kosong' : 'tidak ditemukan', 'kritis') },
          { h: 'Catatan', v: p => { if (!p.w) return '<span class="small muted">Periksa NPR / tambahkan pekerja</span>'; const prev = L.annual(p.w.id, s.tahun); const dc = L.dcValue(p.w.profesi); const tot = prev + PR.n(p.hp10); return `<span class="small">Akumulasi ${s.tahun}: <b class="mono">${PR.f(tot)}</b> mSv${dc && tot > dc ? ' · <b style="color:var(--ana)">melampaui DC ' + PR.f(dc) + '</b>' : ''}</span>`; } }],
          preview, { rowAttr: p => p.w && PR.has(p.hp10) ? '' : 'class="critrow"' })}</div>
        <div class="panel mt"><div class="panel-b spread"><div><b>${matched.length} data siap disimpan</b><p class="small muted" style="margin:4px 0 0">Pekerja menerima email "hasil dosis baru tersedia" (tanpa angka dosis). Skor Siap Inspeksi bagian 3 ikut diperbarui.</p></div>
          <div class="row"><button class="btn" data-act="tldReset">Mulai ulang</button><button class="btn btn-y" data-act="tldSave" ${matched.length ? '' : 'disabled'}>${PR.ic('check')}Simpan & terapkan</button></div></div></div>` : ''}`;
  }
  PR.acts.tldTpl = () => PR.download('format-hasil-tld.csv', PR.toCSV(L.activeWorkers().slice(0, 50).map(w => ({ npr: w.npr, nama: w.nama, hp10: '', hp3: '' })), ['npr', 'nama', 'hp10', 'hp3']));
  PR.acts.tldReset = () => { st.imp = null; PR.render(); };
  PR.acts.tldSave = () => {
    const s = st.imp; const ws = L.activeWorkers(), byNpr = {}, byName = {}; ws.forEach(w => { if (w.npr) byNpr[String(w.npr).toLowerCase().replace(/\s/g, '')] = w; byName[w.nama.toLowerCase()] = w; });
    const rows = [];
    s.rows.forEach(r => { const npr = s.map.npr != null ? String(r[s.map.npr] || '').toLowerCase().replace(/\s/g, '') : ''; const w = byNpr[npr] || (s.map.nama != null && byName[String(r[s.map.nama] || '').toLowerCase()]); if (!w || !PR.has(r[s.map.hp10])) return;
      rows.push({ id: `DS${w.id}${s.tahun}${s.tw}`, pekerja_id: w.id, tahun: String(s.tahun), periode: 'TW' + s.tw, hp10: String(PR.n(r[s.map.hp10])), hp3: s.map.hp3 != null && PR.has(r[s.map.hp3]) ? String(PR.n(r[s.map.hp3])) : '', lab: s.lab, tanggal_terima: PR.today(), jenis_kegiatan: 'rutin', dibaca_pada: '' }); });
    A.saveMany('Dosis', rows, { notify: 'dosis' }); st.imp = null; PR.toast(`${rows.length} hasil TLD TW${s.tw} ${s.tahun} disimpan`, 'ok'); PR.go('#/dosis');
  };

  function detail(id) {
    const w = L.get('Pekerja', id); if (!w) return U.empty('Pekerja tidak ditemukan.');
    const yr = st.yr || PR.year(), s = L.doseStatus(w, yr), m = L.lastMcu(w.id), inv = L.tb('Investigasi').filter(x => x.pekerja_id === id).sort((a, b) => String(b.tahun).localeCompare(a.tahun));
    const years = []; for (let y = PR.year() - 4; y <= PR.year(); y++) years.push(y);
    const cred = (PR.extra.kredensial || []).find(c => c.id === id);
    const rows = L.tb('Dosis').filter(d => d.pekerja_id === id && +d.tahun === +yr).sort((a, b) => a.periode.localeCompare(b.periode));
    const notes = L.tb('Dosis').filter(d => d.pekerja_id === id && d.keterangan).sort((a, b) => (b.tahun + b.periode).localeCompare(a.tahun + a.periode));
    return `<div class="page-head"><div><div class="eyebrow"><a href="#/dosis">Kartu dosis</a> / Pekerja radiasi / detail</div><h1 style="margin-top:6px">${PR.esc(w.nama)}</h1>
      <div class="row mt8"><span class="tag t-ink">${PR.esc(w.kategori || 'umum')}</span><span class="tag">NPR ${PR.esc(w.npr)}</span><span class="tag">${PR.esc(w.profesi)}</span>${w.izin_bekerja ? PR.tag('izin bekerja s.d. ' + PR.d(w.izin_bekerja_sd), PR.left(w.izin_bekerja_sd) < 0 ? 'kritis' : 'netral', 1) : ''}${L.doseTag(s.status)}</div></div>
      <div class="actions"><a class="btn" href="#/cetak/kartu/${id}">${PR.ic('download')}Kartu dosis (PDF)</a><button class="btn" data-act="waW" data-id="${id}">${PR.ic('message-circle')}Kirim via WhatsApp</button>${U.btn('Ubah data', 'addWorker', 'pencil', '', `data-id="${id}"`)}${U.btn('Input dosis manual', 'addDose', 'plus', 'btn-y', `data-w="${id}"`)}</div></div>
      <div class="grid g4">
        <div class="tile"><div class="spread"><span class="lbl">Dosis akumulasi ${yr} · Hp(10)</span>${L.doseTag(s.status)}</div><div class="big" style="color:${s.status === 'analisis' || s.status === 'kritis' ? 'var(--crit)' : 'inherit'}">${PR.f(s.sum)} <span style="font-size:16px">mSv</span></div><div class="bar ${s.ratio > 1 ? 'b-ana' : s.ratio >= .5 ? 'b-warn' : 'b-ok'}"><i style="width:${Math.min(100, s.ratio * 100)}%"></i></div><p>${s.dc ? PR.pct(s.sum / s.dc) + ' dari pembatas dosis ' + PR.f(s.dc) + ' mSv' : 'Pembatas dosis profesi belum ditetapkan'}</p></div>
        <div class="tile"><div class="spread"><span class="lbl">Dosis lensa mata Hp(3)</span>${w.kategori === 'intervensional' ? PR.tag(s.lens > L.NBD().lensa_rata5 ? 'tinjau' : 'aman', s.lens > L.NBD().lensa_rata5 ? 'tinjau' : 'aman') : ''}</div><div class="big">${w.kategori === 'intervensional' ? PR.f(s.lens) : '—'} <span style="font-size:16px">mSv</span></div><p>${w.kategori === 'intervensional' ? 'Acuan NBD lensa ' + L.NBD().lensa_rata5 + ' mSv/tahun' : 'Tidak wajib (kategori umum)'}</p></div>
        <div class="tile"><div class="spread"><span class="lbl">Akumulasi 5 tahun</span></div><div class="big">${PR.f(s.five)} <span style="font-size:16px">mSv</span></div><p>Batas ${L.NBD().pekerja_5tahun} mSv / 5 tahun</p></div>
        <div class="tile"><div class="spread"><span class="lbl">Pemeriksaan MCU</span>${m ? kesTag(m.kesimpulan) : PR.tag('belum ada', 'kritis')}</div><div class="big" style="font-size:20px">${m ? PR.d(m.berlaku_sd) : '—'}</div><p>${m ? 'Berlaku s.d. · ' + PR.hcount(PR.left(m.berlaku_sd)) : ''}${m && m.pembatasan ? '<br>' + PR.esc(m.pembatasan) : ''}</p></div>
      </div>
      <div class="grid g-8-4 mt"><div class="stack">
        <div class="panel"><div class="panel-h"><h3>${PR.ic('list')} Riwayat penerimaan dosis triwulan</h3><div class="seg">${years.slice().reverse().map(y => `<button class="${y === +yr ? 'on' : ''}" data-act="detYr" data-y="${y}">${y}</button>`).join('')}</div></div>
          ${U.table([{ h: 'Periode', v: d => `<b>${d.periode} ${d.tahun}</b>${d.pengganti === 'ya' ? '<span class="sub">data pengganti</span>' : ''}` }, { h: 'Lab', v: d => PR.esc(d.lab || '—') }, { h: 'Hp(10)', r: 1, v: d => PR.f(PR.n(d.hp10)) }, { h: 'Hp(3)', r: 1, v: d => PR.has(d.hp3) ? PR.f(PR.n(d.hp3)) : '—' }, { h: 'Diterima', v: d => `<span class="num small">${PR.d(d.tanggal_terima)}</span>` },
            { h: 'Konfirmasi pekerja', v: d => d.dibaca_pada ? `<span class="small">${PR.ic('circle-check', 'ic-s')} ${PR.dt(d.dibaca_pada)}</span>` : PR.tag('belum dibaca', 'dash', 1) }, { h: 'Kegiatan', v: d => d.jenis_kegiatan !== 'rutin' ? PR.tag(d.jenis_kegiatan, 'netral', 1) : '' }, { h: '', v: d => U.btn('Ubah', 'addDose', '', 'btn-s', `data-w="${id}" data-id="${d.id}"`) }],
            rows, { empty: 'Belum ada data dosis untuk ' + yr, foot: `<span>Total ${yr}: ${PR.f(s.sum)} mSv</span>${L.missingQuarter(w, yr).length ? `<span class="tag t-tinjau">[TW${L.missingQuarter(w, yr).join(', TW')} Kosong]</span>` : ''}` })}</div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('gauge')} Tren dosis tahunan 5 tahun</h3><span class="small muted mono">mSv/tahun</span></div><div class="panel-b">${L.barChart(years.map(y => ({ l: y === PR.year() ? y + ' (YTD)' : String(y), v: L.annual(id, y), c: y === PR.year() ? '#F0B33E' : '#D3D1C9', hl: y === PR.year() })), { lines: [s.dc ? { v: s.dc, c: '#2A2A2E', label: 'DC ' + PR.f(s.dc) } : null, { v: L.NBD().pekerja_rata5, c: '#C23B3B', dash: 1, label: 'NBD ' + L.NBD().pekerja_rata5 }].filter(Boolean), label: 'Tren dosis tahunan' })}</div></div>
        ${inv.length || s.status === 'analisis' || s.status === 'kritis' ? `<div class="panel" style="border:2px solid var(--ink)"><div class="panel-h panel-dark"><h3 style="color:#fff">${PR.ic('triangle-alert')} Investigasi dosis</h3>${U.btn('Tambah', 'addInv', 'plus', 'btn-y btn-s', `data-w="${id}"`)}</div><div class="panel-b">${inv.length ? inv.map(x => `<div class="grid g2" style="border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px"><div><div class="eyebrow">Akar penyebab · ${x.tahun}</div><p class="small">${PR.esc(x.akar_penyebab || '—')}</p></div><div><div class="eyebrow">Tindakan korektif</div><p class="small">${PR.esc(x.rencana || '—')}</p><div class="row small">${PR.tag(x.status, x.status === 'selesai' ? 'aman' : 'tinjau', 1)}<span class="mono">Tenggat ${PR.d(x.tenggat)}</span>${U.btn('Ubah', 'addInv', '', 'btn-s', `data-id="${x.id}"`)}</div></div></div>`).join('') : `<div class="ban ban-crit" style="margin:0">${PR.ic('triangle-alert')}<div class="grow small">Dosis ${yr} melampaui pembatas dosis — catat analisis akar penyebab (item kritis Siap Inspeksi 3.3).</div></div>`}</div></div>` : ''}
      </div><div class="stack">
        <div class="panel"><div class="panel-h"><h3>${PR.ic('key-round')} Akses portal pekerja</h3></div><div class="panel-b"><dl class="kv"><dt>Metode masuk</dt><dd>${PR.esc(w.metode || '—')}</dd>${w.email ? `<dt>Email Google</dt><dd class="small">${PR.esc(w.email)}</dd>` : ''}<dt>Status akun</dt><dd>${PR.esc(w.status_akun || '—')}</dd>${cred ? `<dt>PIN dibuat</dt><dd>${cred.aktif ? 'ya' : 'belum'}${cred.terkunci ? ' · terkunci' : ''}</dd>` : ''}</dl>
          ${PR.can('edit') ? `<div class="stack mt" style="gap:8px"><button class="btn btn-b" data-act="qrWorker" data-id="${id}">${PR.ic('qr-code')}${cred ? 'Buat ulang QR / reset PIN' : 'Buat QR akses'}</button>${cred && cred.terkunci ? `<button class="btn btn-b" data-act="unlockW" data-id="${id}">${PR.ic('lock')}Buka kunci PIN</button>` : ''}</div>` : ''}</div></div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('shield-check')} MCU & kelaikan</h3>${U.btn('Catat', 'addMcu', 'plus', 'btn-s', `data-w="${id}"`)}</div><div class="panel-b">${m ? `<div class="eyebrow">Kesimpulan terkini</div><div class="mt8">${kesTag(m.kesimpulan)}</div><dl class="kv mt"><dt>Tanggal</dt><dd>${PR.d(m.tanggal)}</dd><dt>Berlaku s.d.</dt><dd>${PR.d(m.berlaku_sd)}</dd><dt>Faskes</dt><dd>${PR.esc(m.faskes || '—')}</dd></dl>${m.pembatasan ? `<p class="small" style="background:var(--sub);padding:8px">${PR.esc(m.pembatasan)}</p>` : ''}` : '<p class="small muted">Belum ada data MCU.</p>'}</div></div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('message-circle')} Keterangan dari pekerja</h3></div><div class="panel-b">${notes.length ? notes.slice(0, 3).map(d => `<blockquote style="margin:0 0 10px;padding:10px;background:var(--sub);border-left:0;font-size:13px">"${PR.esc(d.keterangan)}"<div class="tiny muted mt8">${d.periode} ${d.tahun}</div></blockquote>`).join('') : '<p class="small muted" style="margin:0">Belum ada keterangan. Pekerja dapat menambahkan keterangan dari portalnya bila dosisnya tinggi.</p>'}</div></div>
        <div class="panel panel-dark"><div class="panel-b"><div class="eyebrow" style="color:var(--y)">Penyimpanan rekaman</div><p class="small" style="margin:6px 0 0;color:#ddd">Rekaman dosis wajib disimpan minimal 30 tahun setelah pekerja berhenti atau hingga usia 75 tahun (Perba 4/2020 Ps. 36). Pekerja yang berhenti cukup dinonaktifkan — datanya tetap tersimpan.</p></div></div>
      </div></div>`;
  }
  PR.acts.detYr = el => { st.yr = +el.dataset.y; PR.render(); };
  PR.acts.waW = el => { const w = L.get('Pekerja', el.dataset.id); PR.wa(`Halo ${w.nama}, hasil pemantauan dosis periode terbaru Anda sudah tersedia di AlaraGo. Silakan buka portal dan tandai "Sudah saya baca".`, w.no_hp); };

  PR.page('dosis', {
    title: 'Kartu Dosis', roles: ['ppr', 'peninjau'],
    crumb: r => `Kartu dosis / <b>${r.parts[0] === 'mcu' ? 'MCU' : r.parts[0] === 'impor' ? 'Impor TLD' : r.parts[0] === 'p' ? 'Detail pekerja' : 'Pemantauan dosis pekerja'}</b>`,
    render: r => r.parts[0] === 'mcu' ? mcu() : r.parts[0] === 'impor' && PR.can('edit') ? impor() : r.parts[0] === 'p' ? detail(r.parts[1]) : list(),
    mount: root => {
      PR.$$('[data-st]', root).forEach(el => { const k = el.dataset.st; el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = PR.debounce(() => { st[k] = k === 'yr' ? +el.value : el.value; PR.render(); const f = PR.$(`[data-st="${k}"]`); if (f && f.tagName === 'INPUT') { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }, el.tagName === 'INPUT' ? 250 : 0); });
      const f = PR.$('#tldFile', root);
      if (f) {
        const s = st.imp;
        ['imp_tahun', 'imp_tw', 'imp_lab'].forEach(k => { const el = root.querySelector(`[name=${k}]`); if (el) el.onchange = () => { s[k.slice(4)] = k === 'imp_lab' ? el.value : +el.value; if (s.rows) PR.render(); }; });
        f.onchange = async () => { try { const rows = await PR.readTable(f.files[0]); s.fname = f.files[0].name; s.head = rows[0].map(String); s.rows = rows.slice(1); const H = s.head.map(h => h.toLowerCase());
          const find = re => { const i = H.findIndex(h => re.test(h)); return i >= 0 ? i : null; };
          s.map = { npr: find(/npr|dosimeter|no\.?\s*(tld|badge)|nomor/), nama: find(/nama|name/), hp10: find(/hp\s*\(?10|hp10|seluruh|whole|efektif/), hp3: find(/hp\s*\(?3|hp3|lensa|lens/) };
          s.step = s.map.hp10 != null ? 3 : 2; PR.render(); } catch (e) { PR.toast(e.message, 'err'); } };
        PR.$$('[data-map]', root).forEach(el => el.onchange = () => { s.map[el.dataset.map] = el.value === '' ? null : +el.value; s.step = s.map.hp10 != null ? 3 : 2; PR.render(); });
      }
    }
  });
})(window.PR);
