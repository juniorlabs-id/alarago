/* ProteRad — W-10 Survei tabel, W-11 Denah (Pro), W-12 Input titik lapangan */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const st = { yr: null, room: '', denah: null, wave: true, heat: false, sel: null, mode: '', surv: '' };
  const POS = [['operator', 'Posisi operator'], ['pintu', 'Balik pintu'], ['sekitar', 'Sekitar ruangan / koridor'], ['lain', 'Titik lain']];
  const meterOpts = () => L.tb('Alat_Ukur').map(m => [m.id, `${m.merek} ${m.tipe} · SN ${m.no_seri}${L.meterOk(m) ? '' : ' (KALIBRASI KEDALUWARSA)'}`]);
  const val = t => String(t.terkoreksi).toUpperCase() === 'BG' ? '<span class="tag">[BG]</span>' : PR.has(t.terkoreksi) ? PR.f(PR.n(t.terkoreksi)) : '—';

  PR.acts.newSurvey = async el => {
    if (!L.tb('Alat').length) return PR.toast('Tambahkan alat di Inventaris lebih dulu', 'warn');
    const sv = el && el.dataset.id ? L.get('Survei', el.dataset.id) : { alat_id: (el && el.dataset.alat) || (PR.parse().q.alat) || '', tanggal: PR.today(), petugas: PR.set.ppr_nama || '', alat_ukur_id: (L.tb('Alat_Ukur').find(m => L.meterOk(m)) || {}).id, bg: '' };
    const v = await PR.form({ title: el && el.dataset.id ? 'Ubah data survei' : 'Catat survei paparan baru', wide: true, del: !!(el && el.dataset.id), fields: [
      { k: 'alat_id', label: 'Alat radiasi', type: 'select', opts: [['', '— pilih —']].concat(L.tb('Alat').map(a => [a.id, L.alatName(a) + ' · ' + L.ruangName(a.ruangan_id)])), req: 1 },
      { k: 'tanggal', label: 'Tanggal survei', type: 'date', req: 1 }, { k: 'petugas', label: 'Petugas ukur', req: 1 },
      { k: 'alat_ukur_id', label: 'Surveimeter', type: 'select', opts: [['', '— pilih —']].concat(meterOpts()), req: 1 },
      { k: 'bg', label: 'Background (µSv/jam)', type: 'number' }, { k: 'kv', label: 'kV', type: 'number' }, { k: 'mas', label: 'mAs / mA', type: 'number' }, { k: 'fantom', label: 'Fantom', ph: 'Air 20 cm' },
      { k: 'ukuran_ruang', label: 'Ukuran ruang', ph: '6,0 × 5,5 m' }, { k: 'catatan', label: 'Catatan', type: 'textarea', help: 'Wajib diisi bila surveimeter kalibrasinya kedaluwarsa' }],
      onMount: m => { const s = m.querySelector('[name=alat_id]'), u = m.querySelector('[name=ukuran_ruang]'); s.onchange = () => { const a = L.get('Alat', s.value); const r = a && L.get('Ruangan', a.ruangan_id); if (r && !u.value) u.value = r.ukuran || ''; }; } }, sv);
    if (!v) return;
    if (v._delete) { if (await PR.confirm('Hapus survei ini beserta seluruh titik ukurnya?', 'Hapus', 1)) { L.titikOf(sv.id).forEach(t => A.remove('Titik', t.id)); A.remove('Survei', sv.id); PR.go('#/survei'); } return; }
    const m = L.get('Alat_Ukur', v.alat_ukur_id);
    if (m && !L.meterOk(m, v.tanggal) && !v.catatan) return PR.toast('Surveimeter kedaluwarsa pada tanggal survei — isi catatan alasan, atau pilih alat ukur lain.', 'err');
    delete v._files; const a = L.get('Alat', v.alat_id); v.ruangan_id = a.ruangan_id; v.fk = m ? m.fk : '1';
    const row = A.save('Survei', v);
    if (!sv.id) { const room = L.get('Ruangan', a.ruangan_id) || {}; A.saveMany('Titik', [['P1', 'Posisi operator', 'operator', 'supervisi'], ['P2', 'Balik pintu', 'pintu', 'supervisi'], ['P3', 'Sekitar ruangan / koridor', 'sekitar', 'umum']].map(([kode, lokasi, posisi, klas]) => ({ survei_id: row.id, kode, lokasi, posisi, klasifikasi: klas, mentah: '', bg: v.bg, terkoreksi: '' }))); }
    else L.titikOf(row.id).forEach(t => { const c = L.corrected(t.mentah, t.bg, v.fk); if (c !== '' && String(c) !== t.terkoreksi) A.save('Titik', Object.assign({}, t, { terkoreksi: String(c === 'BG' ? 'BG' : Math.round(c * 1000) / 1000) })); });
    PR.go('#/survei/s/' + row.id);
  };
  PR.acts.editTitik = async el => {
    const t = el.dataset.id ? L.get('Titik', el.dataset.id) : { survei_id: el.dataset.sv, kode: 'P' + (L.titikOf(el.dataset.sv).length + 1), posisi: 'lain', klasifikasi: 'umum', x: el.dataset.x || '', y: el.dataset.y || '', denah_id: el.dataset.dn || '' };
    const sv = L.get('Survei', t.survei_id || el.dataset.sv); if (!sv) return PR.toast('Pilih survei lebih dulu', 'warn');
    if (!t.bg) t.bg = sv.bg;
    const v = await PR.form({ title: 'Titik ukur ' + (t.kode || ''), del: !!el.dataset.id, fields: [
      { k: 'kode', label: 'Kode', req: 1 }, { k: 'lokasi', label: 'Lokasi titik', req: 1 }, { k: 'posisi', label: 'Posisi (format LHI)', type: 'select', opts: POS }, { k: 'klasifikasi', label: 'Klasifikasi area', type: 'select', opts: [['pengendalian', 'Daerah pengendalian'], ['supervisi', 'Daerah supervisi'], ['umum', 'Area umum']] },
      { k: 'mentah', label: 'Bacaan mentah (µSv/jam) atau BG', mono: 1, req: 1 }, { k: 'bg', label: 'Background', type: 'number' },
      { k: 'tindak_lanjut', label: 'Tindak lanjut (wajib bila melebihi batas)', type: 'textarea' }, { k: 'foto_id', label: 'Foto titik ukur', type: 'file', accept: 'image/*' }],
      onMount: m => { const box = document.createElement('div'); box.className = 'full ban ban-info'; box.style.margin = '0'; m.querySelector('form').appendChild(box);
        const upd = () => { const c = L.corrected(m.querySelector('[name=mentah]').value, m.querySelector('[name=bg]').value, sv.fk); const s = L.titikStatus({ terkoreksi: c, klasifikasi: m.querySelector('[name=klasifikasi]').value }); box.innerHTML = `${PR.ic('gauge')}<div class="grow"><b style="font-size:14px">Nilai terkoreksi: <span class="mono">${c === 'BG' ? 'BG' : c === '' ? '—' : PR.f(c, 3)}</span> µSv/jam</b><p class="mono small">= (bacaan − background) × FK ${PR.f(PR.n(sv.fk), 3)}${s.lim ? ' · batas RS ' + PR.f(s.lim) : ''}</p></div>${L.titikTag(s.status)}`; };
        ['mentah', 'bg', 'klasifikasi'].forEach(k => m.querySelector(`[name=${k}]`).addEventListener('input', upd)); upd(); } }, t);
    if (!v) return; if (v._delete) { A.remove('Titik', t.id); return PR.render(); }
    try { v.foto_id = await A.uploadFrom(v, 'foto_id'); delete v._files; v.survei_id = sv.id; const c = L.corrected(v.mentah, v.bg, sv.fk); v.terkoreksi = c === 'BG' ? 'BG' : c === '' ? '' : String(Math.round(c * 1000) / 1000);
      if (L.titikStatus(v).status === 'kritis' && !v.tindak_lanjut) PR.toast('Titik melebihi batas RS — isi tindak lanjut agar memenuhi item 6.3.', 'warn');
      A.save('Titik', v); st.sel = v.id; PR.render(); } catch (e) { PR.toast(e.message, 'err'); }
  };

  const latestFor = a => { const yr = st.yr; return L.tb('Survei').filter(s => s.alat_id === a.id && (!yr || s.tanggal.slice(0, 4) === String(yr))).sort((x, y) => y.tanggal.localeCompare(x.tanggal))[0]; };
  const posVal = (sv, p) => { const t = L.titikOf(sv.id).filter(x => x.posisi === p); if (!t.length) return '—'; const w = t.reduce((m, x) => PR.n(x.terkoreksi) > PR.n(m.terkoreksi) ? x : m, t[0]); const s = L.titikStatus(w).status; return `<span style="color:${s === 'kritis' ? 'var(--crit)' : s === 'tinjau' ? 'var(--warn)' : 'inherit'}">${val(w)}</span>`; };
  const head = mode => U.head('SURVEI PAPARAN RADIASI', 'Pemantauan laju dosis daerah kerja berkala dan setelah perbaikan alat / renovasi (Perba 4/2020 Ps. 32), dalam format LHI bagian 6.',
    `<span class="seg"><button class="${mode === 'tabel' ? 'on' : ''}" data-go="#/survei">${PR.ic('list', 'ic-s')} Tabel</button><button class="${mode === 'denah' ? 'on' : ''}" data-go="#/survei/denah">${PR.ic('map', 'ic-s')} Denah <span class="tag t-y" style="padding:0 4px">PRO</span></button></span><a class="btn" href="#/cetak/survei">${PR.ic('download')}Ekspor format LHI</a>${U.btn('Catat survei baru', 'newSurvey', 'plus', 'btn-d')}`);

  function table() {
    const alat = L.tb('Alat').filter(a => !st.room || a.ruangan_id === st.room);
    const need = L.tb('Alat').map(a => ({ a, h: L.needResurvey(a) })).filter(x => x.h);
    const pts = L.tb('Titik').filter(t => { const s = L.get('Survei', t.survei_id); return s && latestFor(L.get('Alat', s.alat_id) || {}) === s; });
    const stt = pts.map(L.titikStatus), m = L.tb('Alat_Ukur').find(x => L.meterOk(x)) || L.tb('Alat_Ukur')[0];
    const years = [...new Set(L.tb('Survei').map(s => +s.tanggal.slice(0, 4)))].sort((a, b) => b - a);
    return `${head('tabel')}
      ${need.map(x => `<div class="ban ban-crit">${PR.ic('triangle-alert', 'ic-l')}<div class="grow"><b>${PR.esc(L.alatName(x.a))} · ${PR.esc(L.ruangName(x.a.ruangan_id))}: ${PR.esc(x.h.jenis.toLowerCase())} tercatat ${PR.d(x.h.tanggal)} — survei paparan ulang diperlukan</b><p>Sebelum alat digunakan kembali secara klinis (Perba BAPETEN 4/2020 Ps. 32).</p></div>${U.btn('Input survei sekarang', 'newSurvey', 'radar', 'btn-y', `data-alat="${x.a.id}"`)}</div>`).join('')}
      <div class="grid g4 mb">${U.tile(PR.tag('lengkap', 'netral', 1), pts.length, 'Titik ukur terdata', 'Survei terbaru tiap alat')}${U.tile(PR.tag('aman', 'aman'), stt.filter(s => s.status === 'aman' || s.status === 'bg').length, 'Titik status aman', '< 80% batas RS')}${U.tile(PR.tag('tinjau', 'tinjau'), stt.filter(s => s.status === 'tinjau' || s.status === 'kritis').length, 'Perlu tinjau', 'Mendekati / melebihi batas')}
        ${U.tile(m ? PR.dueTag(PR.left(m.kal_sd)) : PR.tag('belum ada', 'kritis'), `<span style="font-size:20px">${m ? PR.esc(m.merek + ' ' + m.tipe) : '—'}</span>`, 'Surveimeter aktif', m ? `SN ${PR.esc(m.no_seri)} · FK ${PR.f(PR.n(m.fk), 3)}` : '')}</div>
      <div class="filters"><select class="inp" data-sf="room"><option value="">Semua ruangan</option>${L.tb('Ruangan').map(r => `<option value="${r.id}" ${st.room === r.id ? 'selected' : ''}>${PR.esc(r.nama)}</option>`).join('')}</select>
        <select class="inp" data-sf="yr"><option value="">Survei terbaru</option>${years.map(y => `<option ${String(st.yr) === String(y) ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
      <div class="panel"><div class="panel-h"><h3>${PR.ic('file-text')} Lembar data survei per alat & ruangan (format LHI bagian 6)</h3><span class="mono tiny muted">NILAI TERKOREKSI µSv/jam</span></div>
      ${U.table([{ h: 'No', v: (x, i) => String(i + 1).padStart(2, '0') },
        { h: 'Alat radiasi', v: x => `<b>${PR.esc(L.alatName(x.a))}</b><span class="sub mono">SN ${PR.esc(x.a.no_seri || '—')} · ${PR.esc(x.a.jenis || '')}</span>` },
        { h: 'Ruangan & area', v: x => `${PR.esc(L.ruangName(x.a.ruangan_id))}<span class="sub">${PR.tag((L.get('Ruangan', x.a.ruangan_id) || {}).klasifikasi || '—', 'netral', 1)}</span>` },
        { h: 'Tanggal & petugas', v: x => x.sv ? `<span class="num">${PR.d(x.sv.tanggal)}</span><span class="sub">${PR.esc(x.sv.petugas || '')}</span>` : '' },
        { h: 'Posisi operator', r: 1, v: x => x.sv ? posVal(x.sv, 'operator') : '' }, { h: 'Balik pintu', r: 1, v: x => x.sv ? posVal(x.sv, 'pintu') : '' }, { h: 'Sekitar ruangan', r: 1, v: x => x.sv ? posVal(x.sv, 'sekitar') : '' },
        { h: 'Ukuran ruang', v: x => PR.esc(x.sv ? x.sv.ukuran_ruang || '' : '') },
        { h: 'Status', v: x => x.need ? PR.tag('belum diukur ulang', 'kritis') : x.sv ? L.titikTag(L.surveiStatus(x.sv)) : PR.tag('belum ada', 'dash', 1) },
        { h: '', v: x => x.sv ? `<a class="btn btn-s" href="#/survei/s/${x.sv.id}">Titik</a>` : U.btn('Survei', 'newSurvey', '', 'btn-s', `data-alat="${x.a.id}"`) }],
        alat.map(a => ({ a, sv: latestFor(a), need: L.needResurvey(a) })), { rowAttr: x => x.need ? 'class="critrow"' : '', empty: 'Belum ada alat.', foot: '<span>BG = setara background · nilai = (bacaan − background) × faktor kalibrasi</span>' })}</div>
      <div class="grid g2 mt">
        <div class="panel"><div class="panel-h"><h3>Σ Rumus laju dosis terkoreksi</h3></div><div class="panel-b"><div class="panel-dark mono" style="padding:12px 14px;border-left:4px solid var(--y)"><span style="color:var(--y)">Laju dosis terkoreksi</span> = (Bacaan mentah − Background) × FK</div>
          <p class="small">FK diambil otomatis dari sertifikat kalibrasi surveimeter di Inventaris. Bacaan setara background ditulis <span class="tag">[BG]</span>. Surveimeter yang kalibrasinya kedaluwarsa tidak dapat dipilih tanpa catatan.</p></div></div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('gauge')} Batas laju dosis RS</h3><span class="tag">PENGATURAN PPR</span></div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">
          ${[['pengendalian', 'Daerah pengendalian'], ['supervisi', 'Daerah supervisi'], ['umum', 'Area umum']].map(([k, l]) => `<div class="list-row"><div class="grow"><b>${l}</b><span>Ditetapkan dari kajian keselamatan RS</span></div><span class="num"><b>${L.batas(k) != null ? '≤ ' + PR.f(L.batas(k)) : '—'}</b> µSv/jam</span>${PR.can('edit') ? '<a class="small" href="#/pengaturan/regulasi">ubah ↗</a>' : ''}</div>`).join('')}
          <p class="small muted">Regulasi tidak menetapkan angka µSv/jam baku; batas ini ditetapkan pemegang izin.</p></div></div></div>`;
  }

  function denah() {
    if (!PR.isPro()) return `${head('denah')}<div class="panel">${U.empty('Survei berbasis denah tersedia di paket <b>Pro</b>.', `<span class="small">Hubungi ${PR.esc(window.PR_CONFIG.SELLER_CONTACT)} untuk upgrade.</span>`)}</div>`;
    const ds = L.tb('Denah'); const dn = ds.find(d => d.id === st.denah) || ds[0];
    if (!dn) return `${head('denah')}<div class="panel">${U.empty('Belum ada denah. Unggah gambar denah ruangan (JPG/PNG/PDF→gambar), lalu tandai sumber & titik ukur dengan ketukan.', U.btn('Unggah denah', 'addDenah', 'file-up', 'btn-y'))}</div>`;
    st.denah = dn.id;
    const pts = L.tb('Titik').filter(t => t.denah_id === dn.id && PR.has(t.x));
    const years = [...new Set(pts.map(t => (L.get('Survei', t.survei_id) || {}).tanggal).filter(Boolean).map(d => +d.slice(0, 4)))].sort();
    const yr = st.yr && years.includes(+st.yr) ? +st.yr : years[years.length - 1];
    const vis = pts.filter(t => ((L.get('Survei', t.survei_id) || {}).tanggal || '').startsWith(String(yr)));
    const src = (() => { try { return JSON.parse(dn.sumber || '[]'); } catch (e) { return []; } })();
    const sel = vis.find(t => t.id === st.sel) || vis[0];
    const ss = vis.map(L.titikStatus);
    const svOpts = L.tb('Survei').filter(s => s.tanggal.startsWith(String(yr || PR.year()))).map(s => [s.id, PR.d(s.tanggal) + ' · ' + L.alatName(L.get('Alat', s.alat_id))]);
    const trend = sel ? L.tb('Titik').filter(t => t.denah_id === dn.id && t.kode === sel.kode && PR.n(t.x) && Math.abs(PR.n(t.x) - PR.n(sel.x)) < 4).map(t => ({ t, s: L.get('Survei', t.survei_id) })).filter(x => x.s).sort((a, b) => a.s.tanggal.localeCompare(b.s.tanggal)) : [];
    return `${head('denah')}
      <div class="filters"><select class="inp" id="dnSel">${ds.map(d => `<option value="${d.id}" ${d.id === dn.id ? 'selected' : ''}>${PR.esc(d.nama)}</option>`).join('')}</select>
        <span class="seg">${years.map(y => `<button class="${y === yr ? 'on' : ''}" data-act="dnYr" data-y="${y}">${y}${y === years[years.length - 1] ? ' (terkini)' : ''}</button>`).join('') || '<button class="on">—</button>'}</span>
        <label class="chk small"><span class="switch"><input type="checkbox" data-act="dnWave" ${st.wave ? 'checked' : ''}><span></span></span>Animasi gelombang</label>
        <label class="chk small"><span class="switch"><input type="checkbox" data-act="dnHeat" ${st.heat ? 'checked' : ''}><span></span></span>Peta warna (perkiraan)</label>
        <span style="flex:1"></span><button class="btn btn-s" data-act="dnFull">${PR.ic('maximize')}Mode presentasi</button><a class="btn btn-s btn-y" href="#/cetak/denah/${dn.id}?y=${yr || ''}">${PR.ic('printer')}Laporan PDF</a>${U.btn('Denah baru', 'addDenah', 'plus', 'btn-s')}</div>
      ${PR.can('edit') ? `<div class="row mb"><span class="seg"><button class="${!st.mode ? 'on' : ''}" data-act="dnMode" data-m="">${PR.ic('eye', 'ic-s')} Lihat</button><button class="${st.mode === 'titik' ? 'on' : ''}" data-act="dnMode" data-m="titik">${PR.ic('plus', 'ic-s')} Tambah titik</button><button class="${st.mode === 'sumber' ? 'on' : ''}" data-act="dnMode" data-m="sumber">${PR.ic('radiation', 'ic-s')} Tambah sumber</button></span>
        ${st.mode === 'titik' ? `<select class="inp" style="width:auto" id="dnSurv"><option value="">— survei untuk titik baru —</option>${svOpts.map(([i, l]) => `<option value="${i}" ${st.surv === i ? 'selected' : ''}>${PR.esc(l)}</option>`).join('')}</select><span class="small muted">Ketuk denah untuk menaruh titik.</span>` : st.mode === 'sumber' ? '<span class="small muted">Ketuk denah untuk menaruh sumber (tabung / gantry). Ketuk sumber untuk menghapus.</span>' : ''}</div>` : ''}
      <div class="grid g-8-4"><div class="panel"><div class="panel-h"><h3><span class="dotc" style="background:var(--y);border-radius:0"></span>${PR.esc(dn.nama)}</h3><span class="mono tiny muted">${vis.length} TITIK · ${src.length} SUMBER${dn.skala_m ? ' · LEBAR ±' + dn.skala_m + ' m' : ''}</span></div>
        <div class="panel-b"><div class="plan ${dn.file_id ? '' : 'blank'} ${st.mode ? 'adding' : ''}" id="plan">${dn.file_id ? '<img id="planImg" alt="Denah">' : ''}<canvas id="heat" ${st.heat ? '' : 'hidden'}></canvas>
          ${st.wave ? src.map(s => [0, 1, 2].map(k => `<span class="ring" style="left:${s.x}%;top:${s.y}%;animation-delay:${k}s"></span>`).join('')).join('') : ''}
          ${src.map((s, i) => `<span class="src" style="left:${s.x}%;top:${s.y}%" title="${PR.esc(s.l || 'Sumber')}" data-src="${i}">${PR.trefoil}</span>`).join('')}
          ${vis.map(t => { const s = L.titikStatus(t).status; return `<button class="pt ${s === 'kritis' ? 'k' : ''} ${sel && sel.id === t.id ? 'sel' : ''}" style="left:${t.x}%;top:${t.y}%;background:${L.STATUS_COLOR[s]}" data-act="dnPt" data-id="${t.id}" aria-label="${PR.esc(t.kode + ' ' + t.lokasi)}">${PR.esc(t.kode)}<span class="v">${val(t)}</span></button>`; }).join('')}</div>
          <div class="legend"><span><i style="background:var(--ok)"></i>Aman (&lt; 80% batas)</span><span><i style="background:#C9850F"></i>Perlu perhatian (80–100%)</span><span><i style="background:var(--crit)"></i>Melebihi batas</span><span><i style="background:var(--y);outline:1px solid var(--ink)"></i>Sumber radiasi</span>${st.heat ? '<span class="tag t-ink">Peta warna = visualisasi perkiraan, bukan hasil ukur</span>' : ''}</div></div></div>
        <div class="stack">
          <div class="grid g3" style="gap:8px">${[['aman', 'Aman'], ['tinjau', 'Perhatian'], ['kritis', 'Melebihi']].map(([k, l]) => `<div class="tile" style="padding:10px;background:${k === 'aman' ? 'var(--ok-b)' : k === 'tinjau' ? 'var(--warn-b)' : 'var(--crit-b)'}"><div class="big" style="font-size:24px;color:${L.STATUS_COLOR[k]}">${ss.filter(s => s.status === k).length}</div><span class="small">${l}</span></div>`).join('')}</div>
          ${sel ? (() => { const sv = L.get('Survei', sel.survei_id) || {}, s = L.titikStatus(sel), m = L.get('Alat_Ukur', sv.alat_ukur_id) || {};
            return `<div class="panel"><div class="panel-h"><div><div class="eyebrow">Inspektor titik ukur</div><h3 style="margin-top:4px">${PR.esc(sel.kode)}: ${PR.esc(sel.lokasi)}</h3></div>${L.titikTag(s.status)}</div><div class="panel-b">
              <div class="panel-dark" style="padding:14px"><div class="eyebrow" style="color:#C9CDD3">Laju dosis setelah koreksi</div><div style="font:700 36px var(--fm);margin:6px 0">${val(sel)} <span style="font-size:14px">µSv/jam</span></div>
                <div class="small" style="color:#C9CDD3">Batas RS (${PR.esc(sel.klasifikasi)}): ${s.lim ? '≤ ' + PR.f(s.lim) : 'belum diatur'}${s.lim ? ' · ' + PR.pct(s.ratio) + ' dari batas' : ''}</div><div class="segbar mt8">${[0, 1, 2, 3, 4].map(i => `<i class="${s.ratio > i * 0.2 ? (s.ratio > 0.8 ? 'y' : 'f') : ''}" style="${s.ratio > i * 0.2 ? `background:${L.STATUS_COLOR[s.status === 'bg' ? 'aman' : s.status]}` : ''}"></i>`).join('')}</div></div>
              <dl class="kv mt"><dt>Bacaan mentah</dt><dd class="mono">${PR.fr(sel.mentah)}</dd><dt>Background</dt><dd class="mono">${PR.fr(sel.bg || sv.bg)}</dd><dt>Surveimeter</dt><dd>${PR.esc((m.merek || '') + ' ' + (m.tipe || ''))} · FK ${PR.f(PR.n(sv.fk), 3)}</dd><dt>Kondisi</dt><dd class="small">${PR.esc([sv.kv && sv.kv + ' kV', sv.mas && sv.mas + ' mAs', sv.fantom].filter(Boolean).join(' · ') || '—')}</dd><dt>Petugas</dt><dd>${PR.esc(sv.petugas || '')} · ${PR.d(sv.tanggal)}</dd></dl>
              ${trend.length > 1 ? `<div class="eyebrow mt">Tren antar survei</div>${L.barChart(trend.map(x => ({ l: x.s.tanggal.slice(0, 4), v: PR.n(x.t.terkoreksi), c: x.t.id === sel.id ? '#FFC21A' : '#9AA0A8', hl: x.t.id === sel.id })), { h: 140, lines: s.lim ? [{ v: s.lim, c: '#C92A2A', dash: 1, label: 'batas' }] : [] })}` : ''}
              ${sel.tindak_lanjut ? `<p class="small" style="background:var(--sub);padding:8px"><b>Tindak lanjut:</b> ${PR.esc(sel.tindak_lanjut)}</p>` : ''}
              <div class="row mt">${sel.foto_id ? U.fileChip(sel.foto_id, 'Foto titik') : ''}${U.btn('Ubah data titik', 'editTitik', 'pencil', 'btn-s', `data-id="${sel.id}"`)}</div></div></div>`; })() : `<div class="panel">${U.empty('Belum ada titik pada tahun ini. Pilih "Tambah titik".')}</div>`}
          <div class="panel"><div class="panel-h"><h3>${PR.ic('qr-code')} QR pintu ruangan</h3></div><div class="panel-b small">Ditempel di pintu: siapa pun dapat memindai untuk melihat status area & tanggal survei terakhir, tanpa login dan tanpa data pribadi.<div class="row mt8">${L.tb('Ruangan').map(r => `<a class="btn btn-s" href="#/cetak/qr/${r.id}">${PR.esc(r.nama)}</a>`).join('')}</div></div></div>
        </div></div>
      <div class="panel mt"><div class="panel-h"><h3>Rekapitulasi titik ukur ${yr || ''}</h3></div>${U.table([{ h: 'Kode', v: t => `<b class="mono">${PR.esc(t.kode)}</b>` }, { h: 'Lokasi', v: t => PR.esc(t.lokasi) }, { h: 'Area', v: t => PR.esc(t.klasifikasi) }, { h: 'Laju dosis', r: 1, v: t => val(t) }, { h: 'Batas RS', r: 1, v: t => (b => b ? '≤ ' + PR.f(b) : '—')(L.batas(t.klasifikasi)) }, { h: 'Status', v: t => L.titikTag(L.titikStatus(t).status) }], vis, { rowAttr: t => sel && t.id === sel.id ? 'class="sel"' : '', empty: 'Tidak ada titik.' })}</div>`;
  }

  function surveyDetail(id) {
    const sv = L.get('Survei', id); if (!sv) return U.empty('Survei tidak ditemukan.');
    const a = L.get('Alat', sv.alat_id) || {}, m = L.get('Alat_Ukur', sv.alat_ukur_id) || {}, pts = L.titikOf(id).sort((x, y) => x.kode.localeCompare(y.kode, undefined, { numeric: true }));
    return `<div class="page-head"><div><div class="eyebrow"><a href="#/survei">SURVEI PAPARAN</a> / INPUT TITIK</div><h1 style="margin-top:6px">${PR.esc(L.alatName(a))}</h1><p>${PR.esc(L.ruangName(a.ruangan_id))} · ${PR.d(sv.tanggal)} · ${PR.esc(sv.petugas || '')}</p></div>
      <div class="actions">${U.btn('Ubah data survei', 'newSurvey', 'pencil', '', `data-id="${id}"`)}${U.btn('Tambah titik', 'editTitik', 'plus', 'btn-y', `data-sv="${id}"`)}</div></div>
      ${!navigator.onLine ? `<div class="ban ban-warn">${PR.ic('wifi-off')}<div class="grow small">Offline — data titik tersimpan di perangkat dan tersinkron otomatis saat online.</div></div>` : ''}
      <div class="ban ${L.meterOk(m, sv.tanggal) ? 'ban-info' : 'ban-crit'}">${PR.ic(L.meterOk(m, sv.tanggal) ? 'circle-check' : 'triangle-alert')}<div class="grow"><b style="font-size:14px">${PR.esc((m.merek || '') + ' ' + (m.tipe || ''))} · SN ${PR.esc(m.no_seri || '—')}</b><p>Kalibrasi berlaku s.d. ${PR.d(m.kal_sd)} ${PR.dueTag(PR.left(m.kal_sd))} · FK ${PR.f(PR.n(sv.fk), 3)} diterapkan otomatis · BG ${PR.esc(sv.bg || '—')} µSv/jam${sv.catatan ? ' · ' + PR.esc(sv.catatan) : ''}</p></div></div>
      <div class="stack">${pts.map(t => { const s = L.titikStatus(t);
        return `<div class="panel"><div class="panel-b"><div class="spread"><div><span class="tag t-ink">${PR.esc(t.kode)}</span> <b>${PR.esc(t.lokasi)}</b><div class="small muted mt8">${PR.esc((POS.find(p => p[0] === t.posisi) || [])[1] || '')} · ${PR.esc(t.klasifikasi)}</div></div>${L.titikTag(s.status)}</div>
          ${PR.can('edit') ? `<div class="grid g3 mt" style="gap:10px;align-items:end"><div class="f"><label>Bacaan mentah</label><input class="inp mono" style="height:48px;font-size:18px" value="${PR.esc(t.mentah)}" inputmode="decimal" data-tin="${t.id}" data-k="mentah" placeholder="0,00 atau BG"></div><div class="f"><label>Background</label><input class="inp mono" style="height:48px;font-size:18px" value="${PR.esc(t.bg || sv.bg || '')}" inputmode="decimal" data-tin="${t.id}" data-k="bg"></div>
          <div style="background:${s.status === 'kritis' ? 'var(--crit-b)' : s.status === 'tinjau' ? 'var(--warn-b)' : 'var(--ok-b)'};padding:8px 12px"><div class="tiny muted">NILAI TERKOREKSI</div><div style="font:700 24px var(--fm)">${val(t)} <span style="font-size:12px">µSv/jam</span></div><div class="tiny">${s.lim ? 'Batas RS ≤ ' + PR.f(s.lim) : 'Batas belum diatur'}</div></div></div>` : `<div class="mt8 mono">${val(t)} µSv/jam</div>`}
          <div class="row mt8">${t.foto_id ? U.fileChip(t.foto_id, 'Foto') : ''}${PR.can('edit') ? `<label class="btn btn-s">${PR.ic('camera')}Ambil foto titik<input type="file" accept="image/*" capture="environment" hidden data-tfoto="${t.id}"></label>${U.btn('Detail', 'editTitik', 'pencil', 'btn-s', `data-id="${t.id}"`)}` : ''}${s.status === 'kritis' && !t.tindak_lanjut ? PR.tag('isi tindak lanjut', 'kritis', 1) : ''}</div></div></div>`; }).join('') || U.empty('Belum ada titik.')}</div>
      <div class="panel mt"><div class="panel-b spread"><span class="small muted">${PR.ic('wifi-off', 'ic-s')} Bisa diisi offline — tersinkron otomatis saat online.</span><a class="btn btn-y" href="#/survei">${PR.ic('check')}Selesai</a></div></div>`;
  }

  PR.acts.dnYr = el => { st.yr = el.dataset.y; st.sel = null; PR.render(); };
  PR.acts.dnWave = el => { st.wave = el.checked; PR.render(); };
  PR.acts.dnHeat = el => { st.heat = el.checked; PR.render(); };
  PR.acts.dnMode = el => { st.mode = el.dataset.m; PR.render(); };
  PR.acts.dnPt = (el, e) => { e.stopPropagation(); if (st.mode) return; st.sel = el.dataset.id; PR.render(); };
  PR.acts.dnFull = () => { const p = PR.$('#plan'); if (p && p.requestFullscreen) p.requestFullscreen().catch(() => { }); };
  PR.acts.addDenah = async el => {
    const v = await PR.form({ title: 'Denah baru', fields: [{ k: 'nama', label: 'Nama denah', req: 1, ph: 'Instalasi Radiologi Lt 1' }, { k: 'skala_m', label: 'Lebar denah sebenarnya (meter, opsional)', type: 'number' }, { k: 'file_id', label: 'Gambar denah (JPG/PNG/SVG)', type: 'file', accept: 'image/*', req: 1 }] }, {});
    if (!v) return; try { v.file_id = await A.uploadFrom(v, 'file_id'); delete v._files; v.sumber = '[]'; const r = A.save('Denah', v); st.denah = r.id; PR.go('#/survei/denah'); } catch (e) { PR.toast(e.message, 'err'); }
  };

  PR.page('survei', {
    title: 'Survei Paparan', roles: ['ppr', 'peninjau'],
    crumb: r => `SURVEI PAPARAN / <b>${r.parts[0] === 'denah' ? 'DENAH INTERAKTIF' : r.parts[0] === 's' ? 'INPUT TITIK' : 'PENGUKURAN DAERAH KERJA'}</b>`,
    render: r => { if (r.parts[0] === 'baru') { setTimeout(() => PR.acts.newSurvey({ dataset: { alat: r.q.alat } }), 0); return table(); } return r.parts[0] === 'denah' ? denah() : r.parts[0] === 's' ? surveyDetail(r.parts[1]) : table(); },
    mount: async (root, r) => {
      PR.$$('[data-sf]', root).forEach(el => el.onchange = () => { st[el.dataset.sf] = el.value; PR.render(); });
      PR.$$('[data-tin]', root).forEach(inp => inp.onchange = () => { const t = L.get('Titik', inp.dataset.tin), sv = L.get('Survei', t.survei_id); const row = Object.assign({}, t, { [inp.dataset.k]: inp.value.trim().replace(',', '.') }); const c = L.corrected(row.mentah, row.bg, sv.fk); row.terkoreksi = c === 'BG' ? 'BG' : c === '' ? '' : String(Math.round(c * 1000) / 1000); A.save('Titik', row); PR.render(); });
      PR.$$('[data-tfoto]', root).forEach(inp => inp.onchange = async () => { try { PR.toast('Mengunggah foto…'); const d = await A.upload(inp.files[0]); A.save('Titik', Object.assign({}, L.get('Titik', inp.dataset.tfoto), { foto_id: d.id })); PR.render(); } catch (e) { PR.toast(e.message, 'err'); } });
      const dsel = PR.$('#dnSel', root); if (dsel) dsel.onchange = () => { st.denah = dsel.value; st.sel = null; PR.render(); };
      const ssel = PR.$('#dnSurv', root); if (ssel) ssel.onchange = () => st.surv = ssel.value;
      const plan = PR.$('#plan', root); if (!plan) return;
      const dn = L.get('Denah', st.denah);
      const img = PR.$('#planImg', root);
      if (img && dn.file_id) { try { const f = await A.file(dn.file_id); img.src = f.url; img.onload = () => drawHeat(); } catch (e) { plan.classList.add('blank'); } }
      function drawHeat() {
        const cv = PR.$('#heat', root); if (!cv || cv.hidden) return; const w = plan.clientWidth, h = plan.clientHeight; cv.width = w; cv.height = h; const g = cv.getContext('2d');
        plan.querySelectorAll('.pt').forEach(p => { const t = L.get('Titik', p.dataset.id); const s = L.titikStatus(t).status; const col = { aman: '31,138,76', tinjau: '255,194,26', kritis: '201,42,42' }[s] || '154,160,168';
          const x = PR.n(t.x) / 100 * w, y = PR.n(t.y) / 100 * h, rr = w * 0.16; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${col},.55)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); });
      }
      if (!img) drawHeat();
      plan.onclick = e => {
        if (!st.mode || e.target.closest('.pt')) return;
        const b = plan.getBoundingClientRect(), x = Math.round((e.clientX - b.left) / b.width * 1000) / 10, y = Math.round((e.clientY - b.top) / b.height * 1000) / 10;
        if (st.mode === 'sumber') { const srcEl = e.target.closest('.src'); let src = []; try { src = JSON.parse(dn.sumber || '[]'); } catch (er) { }
          if (srcEl) src.splice(+srcEl.dataset.src, 1); else src.push({ x, y, l: 'Sumber ' + (src.length + 1) });
          A.save('Denah', Object.assign({}, dn, { sumber: JSON.stringify(src) })); PR.render(); return; }
        if (!st.surv) return PR.toast('Pilih survei untuk titik baru lebih dulu', 'warn');
        PR.acts.editTitik({ dataset: { sv: st.surv, x: String(x), y: String(y), dn: dn.id } });
      };
    }
  });
})(window.PR);
