/* ProteRad — Masuk, hubungkan backend, QR + PIN pekerja, wizard penyiapan awal */
(function (PR) {
  'use strict';
  const U = PR.ui, A = PR.api;
  PR.parseDate = v => {
    v = String(v || '').trim(); if (!v) return '';
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
    if (/^\d{5}$/.test(v)) { const d = new Date(Date.UTC(1899, 11, 30) + (+v) * 864e5); return d.toISOString().slice(0, 10); }
    return v;
  };

  const card = inner => `<div class="center-wrap"><div class="auth-card"><div class="hazard"></div><div class="in">
    <div class="auth-brand">${PR.logo()}<div><b>PROTERAD</b><span>PROTECT. RECORD. READY.</span></div></div>${inner}</div></div></div>`;

  async function afterLogin(d, remember) {
    A.setSession(d.session); PR.me = d.me;
    try { await A.boot(true); } catch (e) { PR.toast(e.message, 'err'); return; }
    PR.go(PR.me.role === 'pekerja' ? '#/saya' : PR.me.role === 'peninjau' ? '#/persetujuan' : '#/dasbor');
  }

  // ================= MASUK =================
  PR.page('masuk', {
    full: true, title: 'Masuk',
    render: r => {
      if (A.session() && PR.me) setTimeout(() => PR.go('#/dasbor'), 0);
      const url = A.url() && !A.isDemo() ? A.url() : '';
      if (!url) return card(`<h2>MASUK</h2><p class="muted" style="margin:6px 0 20px">Kelola rekaman proteksi radiasi fasilitas Anda.</p>
        <div class="f"><label for="burl">Alamat backend ProteRad (URL /exec)</label><input class="inp mono" id="burl" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"><div class="help">Didapat setelah memasang backend di akun Google Anda (lihat panduan instalasi).</div><div class="err" id="berr" hidden></div></div>
        <button class="btn btn-y btn-b mt" data-act="connect">${PR.ic('link')}Hubungkan</button>
        <div class="divider">ATAU</div>
        <button class="rowbtn" data-act="startDemo" style="border-style:dashed">${PR.ic('play')}<div style="flex:1"><b><span class="tag t-y">[UJI COBA]</span> Lihat demo</b><span>Jelajahi semua fitur dengan data contoh, tanpa memasang apa pun</span></div>${PR.ic('chevron-right')}</button>
        <p class="small muted mt" style="text-align:center">${PR.ic('lock', 'ic-s')} Data tersimpan di akun Google Anda sendiri.</p>`);
      const cid = (window.PR_CONFIG || {}).GOOGLE_CLIENT_ID;
      return card(`<h2>MASUK</h2><p class="muted" style="margin:6px 0 20px">Kelola rekaman proteksi radiasi fasilitas Anda.</p>
        ${cid ? `<div class="gbtn" id="gbtn"><div class="sk" style="width:100%;height:40px"></div></div>` : `<div class="ban ban-warn">${PR.ic('triangle-alert')}<div class="grow small">GOOGLE_CLIENT_ID belum diisi di <span class="mono">js/config.js</span>. Lihat panduan instalasi bagian “Login Google”.</div></div>`}
        <label class="chk mt8" style="justify-content:center"><input type="checkbox" id="remember" checked> Ingat perangkat ini (90 hari)</label>
        <div class="ban ban-crit mt8" id="lerr" hidden></div>
        <div class="divider">ATAU</div>
        <button class="rowbtn" data-act="qrHelp">${PR.ic('qr-code', 'ic-l')}<div style="flex:1"><b>Pekerja tanpa Gmail?</b><span>Masuk dengan QR + PIN</span></div>${PR.ic('chevron-right')}</button>
        <p class="small muted mt" style="text-align:center">${PR.ic('lock', 'ic-s')} Data tersimpan di akun Google Anda sendiri.<br><button class="link small" data-act="changeBackend">Ganti alamat backend</button> · <button class="link small" data-act="startDemo">Lihat demo</button></p>`);
    },
    mount: async root => {
      const el = PR.$('#gbtn', root); if (!el) return;
      try {
        await PR.loadScript('https://accounts.google.com/gsi/client');
        google.accounts.id.initialize({ client_id: window.PR_CONFIG.GOOGLE_CLIENT_ID, callback: async resp => {
          const err = PR.$('#lerr'); err.hidden = true;
          try { const d = await A.call('login', { idToken: resp.credential, remember: PR.$('#remember').checked }); await afterLogin(d); }
          catch (e) { err.hidden = false; err.innerHTML = `${PR.tag('kritis', 'kritis', 1)}<div class="grow small">${PR.esc(e.message)}</div>`; }
        }, ux_mode: 'popup', auto_select: false });
        el.innerHTML = ''; google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', locale: 'id', width: Math.min(376, el.offsetWidth || 376) });
      } catch (e) { el.innerHTML = `<div class="small muted">Tombol Google gagal dimuat. Periksa koneksi.</div>`; }
    }
  });
  PR.acts.connect = async () => {
    const v = PR.$('#burl').value.trim(), err = PR.$('#berr');
    const id = A.depId(v); if (!id) { err.hidden = false; err.textContent = 'Format URL tidak dikenali. Tempel URL yang diakhiri /exec.'; return; }
    const url = A.urlFromId(id); err.hidden = true; PR.toast('Memeriksa backend…');
    try {
      const j = await (await fetch(url + '?action=ping')).json();
      if (!j.success) throw new Error(j.message);
      if (!j.data.ready) { err.hidden = false; err.textContent = 'Backend ditemukan, tetapi setupAppEnvironment() belum dijalankan.'; return; }
      A.setUrl(url); PR.toast('Backend terhubung', 'ok'); PR.render();
    } catch (e) { err.hidden = false; err.textContent = 'Tidak dapat menghubungi backend. Pastikan deployment "Who has access: Anyone". (' + e.message + ')'; }
  };
  PR.acts.changeBackend = () => { A.setUrl(''); PR.render(); };
  PR.acts.startDemo = async () => { A.setUrl('demo'); PR.demo.setRole('ppr'); A.setSession('demo-session'); try { await A.boot(true); PR.go('#/dasbor'); } catch (e) { PR.toast(e.message, 'err'); } };
  PR.acts.qrHelp = () => PR.modal({ title: 'Masuk dengan QR + PIN', body: `<ol style="margin:0;padding-left:18px;line-height:1.7"><li>Minta <b>kode QR pribadi</b> ke PPR (biasanya ditempel di ID card atau kartu TLD).</li><li>Pindai QR dengan kamera HP — tautan ProteRad akan terbuka.</li><li>Pertama kali: buat PIN 6 digit. Berikutnya cukup PIN (atau langsung masuk jika perangkat diingat).</li></ol><p class="small muted">Lupa PIN atau QR hilang? Minta PPR membuat QR baru — QR lama otomatis tidak berlaku.</p>` });

  // ================= QR + PIN PEKERJA =================
  let pin = '', pin1 = '';
  PR.page('qr', {
    full: true, title: 'Masuk pekerja',
    render: () => `<div class="center-wrap"><div class="auth-card" style="max-width:420px"><div class="hazard"></div><div class="in" id="qrbox"><div class="sk"></div><div class="sk"></div></div></div></div>`,
    mount: async (root, r) => {
      const box = PR.$('#qrbox', root), url = A.urlFromId(r.q.b);
      if (!url || !r.q.t) { box.innerHTML = `<div class="ban ban-crit">${PR.ic('triangle-alert')}<div class="grow">Tautan QR tidak lengkap. Pindai ulang QR dari PPR.</div></div>`; return; }
      if (A.url() !== url) { A.setUrl(url); }
      let info;
      try { info = await A.call('qrInfo', { token: r.q.t }); }
      catch (e) { box.innerHTML = `<div class="auth-brand">${PR.logo()}<div><b>PROTERAD</b><span>PROTECT. RECORD. READY.</span></div></div><div class="ban ban-crit">${PR.ic('triangle-alert')}<div class="grow">${PR.esc(e.message)}</div></div>`; return; }
      pin = ''; pin1 = '';
      const step = info.needPin ? 'buat' : 'masuk';
      const draw = (stage, msg) => {
        const title = stage === 'buat' ? 'Buat PIN 6 digit' : stage === 'ulang' ? 'Ulangi PIN' : 'Masukkan PIN';
        box.innerHTML = `<div class="auth-brand" style="margin-bottom:16px">${PR.logo()}<div><b>PROTERAD</b><span>PORTAL PEKERJA</span></div></div>
          <div class="eyebrow">${PR.esc(info.rs)}</div><h2 style="margin-top:4px">Halo, ${PR.esc(info.nama)}</h2><p class="muted small" style="margin:4px 0 0">${PR.esc(info.profesi || '')} · ${title}</p>
          <div class="pin-boxes" aria-live="polite">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i === pin.length ? 'on' : ''}">${i < pin.length ? '•' : ''}</i>`).join('')}</div>
          ${msg ? `<div class="small" style="color:var(--crit);margin:-8px 0 10px">${PR.esc(msg)}</div>` : ''}
          <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join('')}<button class="sub" data-k="c">Hapus</button><button data-k="0">0</button><button class="sub" data-k="b" aria-label="Hapus satu">${PR.ic('arrow-left')}</button></div>
          ${stage !== 'masuk' ? `<label class="chk mt"><input type="checkbox" id="consent"> Saya menyetujui pemakaian data dosis saya untuk pemantauan proteksi radiasi (UU PDP No. 27/2022).</label>` : ''}
          <label class="chk mt8"><input type="checkbox" id="remember" checked> Ingat perangkat ini (90 hari)</label>
          <p class="small muted mt8">Lupa PIN? Hubungi PPR Anda untuk QR baru.</p>`;
        box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => press(b.dataset.k, stage));
      };
      const press = async (k, stage) => {
        const consent = PR.$('#consent') ? PR.$('#consent').checked : true, remember = PR.$('#remember').checked;
        if (k === 'c') pin = ''; else if (k === 'b') pin = pin.slice(0, -1); else if (pin.length < 6) pin += k;
        draw(stage);
        if (PR.$('#consent')) PR.$('#consent').checked = consent; PR.$('#remember').checked = remember;
        if (pin.length < 6) return;
        if (stage === 'buat') { pin1 = pin; pin = ''; draw('ulang'); if (PR.$('#consent')) PR.$('#consent').checked = consent; return; }
        if (stage === 'ulang' && pin !== pin1) { pin = ''; pin1 = ''; draw('buat', 'PIN tidak sama. Ulangi.'); return; }
        if (stage === 'ulang' && !consent) { pin = ''; draw('ulang', 'Centang persetujuan pemakaian data terlebih dahulu.'); return; }
        try { const d = await A.call('loginPin', { token: r.q.t, pin, consent, remember }); await afterLogin(d); }
        catch (e) { pin = ''; draw(stage === 'ulang' ? 'buat' : stage, e.message); }
      };
      draw(step);
    }
  });

  // ================= WIZARD =================
  const W = { step: 1, alat: null, pekerja: null };
  const TPL = {
    alat: ['kategori', 'ruangan', 'jenis', 'merek', 'tipe', 'no_seri', 'no_izin', 'izin_sd', 'ukes_sd', 'kalibrasi_sd', 'fk'],
    pekerja: ['nama', 'npr', 'profesi', 'kategori', 'email', 'no_hp', 'pelatihan_terakhir']
  };
  const TPL_EX = {
    alat: [{ kategori: 'alat', ruangan: 'R. X-Ray 1', jenis: 'Radiografi umum', merek: 'GE', tipe: 'Definium 646', no_seri: 'XR4819', no_izin: '0000/IZIN/2023', izin_sd: '2028-01-22', ukes_sd: '2026-12-28' },
      { kategori: 'surveimeter', merek: 'Ludlum', tipe: 'Model 14C', no_seri: '289410', kalibrasi_sd: '2026-11-28', fk: '1.05' }],
    pekerja: [{ nama: 'Nama Pekerja, A.Md.Rad', npr: 'NPR-001', profesi: 'Radiografer Umum', kategori: 'umum', email: 'nama@gmail.com', no_hp: '0812…', pelatihan_terakhir: '2024-05-10' }]
  };
  PR.acts.tpl = el => { const k = el.dataset.k; PR.download(`template-${k}-proterad.csv`, PR.toCSV(TPL_EX[k], TPL[k])); };
  PR.importRows = async (file, kind) => {
    const rows = await PR.readTable(file); if (rows.length < 2) throw new Error('Berkas kosong');
    const head = rows[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
    const data = rows.slice(1).map(r => { const o = {}; head.forEach((h, i) => o[h] = String(r[i] == null ? '' : r[i]).trim()); return o; });
    const errs = [];
    if (kind === 'pekerja') data.forEach((o, i) => { if (!o.nama) errs.push(`Baris ${i + 2}: nama kosong`); });
    else data.forEach((o, i) => { if (!o.no_seri && !o.tipe) errs.push(`Baris ${i + 2}: no_seri/tipe kosong`); });
    return { data, errs };
  };
  PR.commitImport = (kind, data) => {
    if (kind === 'pekerja') {
      const rows = data.filter(o => o.nama).map(o => ({ id: PR.uid('PK'), nama: o.nama, npr: o.npr, profesi: o.profesi, kategori: /interv/i.test(o.kategori) ? 'intervensional' : 'umum', email: o.email, no_hp: o.no_hp, pelatihan_terakhir: PR.parseDate(o.pelatihan_terakhir), metode: o.email ? 'Google' : 'QR + PIN', status_akun: o.email ? 'aktif' : 'menunggu aktivasi', aktif: 'ya' }));
      A.saveMany('Pekerja', rows); return rows.length;
    }
    let n = 0; const rooms = {};
    PR.L.tb('Ruangan').forEach(r => rooms[r.nama.toLowerCase()] = r.id);
    data.forEach(o => {
      if (/survei/i.test(o.kategori)) { A.save('Alat_Ukur', { merek: o.merek, tipe: o.tipe, no_seri: o.no_seri, kal_sd: PR.parseDate(o.kalibrasi_sd), fk: o.fk || '1', status: 'aktif', kepemilikan: 'RS' }); n++; return; }
      let rid = rooms[String(o.ruangan || '').toLowerCase()];
      if (!rid && o.ruangan) { rid = A.save('Ruangan', { nama: o.ruangan, jenis: o.jenis, klasifikasi: 'pengendalian' }).id; rooms[o.ruangan.toLowerCase()] = rid; }
      A.save('Alat', { ruangan_id: rid || '', jenis: o.jenis, merek: o.merek, tipe: o.tipe, no_seri: o.no_seri, no_izin: o.no_izin, izin_sd: PR.parseDate(o.izin_sd), ukes_sd: PR.parseDate(o.ukes_sd), izin_status: 'berlaku', status_balis: 'terdaftar', status_operasi: 'aktif' }); n++;
    });
    return n;
  };

  PR.page('wizard', {
    full: true, title: 'Penyiapan awal',
    render: () => {
      const rs = PR.L.rs(), st = PR.set || {}, mo = PR.L.masaOperasi(st.tanggal_mulai_operasi);
      const steps = ['Data RS', 'Tanggal operasi', 'Alat radiasi', 'Pekerja', 'Selesai'];
      const imp = kind => { const x = W[kind]; return `<div class="panel"><div class="panel-b"><div class="spread"><div><div class="eyebrow">${kind === 'alat' ? 'Bagian 03' : 'Bagian 04'}</div><h3>${kind === 'alat' ? 'ALAT RADIASI & SURVEIMETER' : 'PEKERJA RADIASI'}</h3></div>${PR.ic(kind === 'alat' ? 'boxes' : 'users', 'ic-l')}</div>
        <p class="small muted">${kind === 'alat' ? 'Pesawat sinar-X, CT, mammografi, dental, C-arm, surveimeter.' : 'Nama, NPR, profesi, kategori, email.'}</p>
        <label class="drop mt8">${PR.ic('file-up')} <span>${x ? `${x.errs.length ? PR.tag(x.errs.length + ' baris galat', 'tinjau') : PR.tag(x.data.length + ' baris terbaca · 0 galat', 'aman')}` : 'Pilih berkas <b>.xlsx / .csv</b>'}</span><input type="file" accept=".xlsx,.xls,.csv" hidden data-imp="${kind}"></label>
        ${x && x.errs.length ? `<div class="small mt8" style="color:var(--crit)">${x.errs.slice(0, 4).map(PR.esc).join('<br>')}</div>` : ''}
        <div class="spread mt8"><button class="link small" data-act="tpl" data-k="${kind}">Unduh template .csv</button>${x ? `<span class="small muted">Akan disimpan saat Lanjut</span>` : `<span class="small muted">Boleh dilewati, isi nanti di menu</span>`}</div></div></div>`; };
      const body = {
        1: `<div class="panel"><div class="panel-h"><h3><span class="tag">SEC.01</span> DATA FASILITAS</h3><span class="small muted">* wajib</span></div><div class="panel-b fgrid">
            ${PR.fieldHTML({ k: 'nama', label: 'Nama rumah sakit / instansi', req: 1, help: 'Sesuai nama pada izin pemanfaatan.' }, rs.nama)}${PR.fieldHTML({ k: 'instalasi', label: 'Instalasi', req: 1, ph: 'Instalasi Radiologi' }, rs.instalasi)}
            ${PR.fieldHTML({ k: 'alamat', label: 'Alamat lengkap', type: 'textarea' }, rs.alamat)}${PR.fieldHTML({ k: 'pemegang_izin', label: 'Pemegang izin', ph: 'Direktur Utama …' }, rs.pemegang_izin)}${PR.fieldHTML({ k: 'ppr_nama', label: 'Nama PPR (Anda)', req: 1 }, st.ppr_nama)}</div></div>`,
        2: `<div class="panel"><div class="panel-h"><h3><span class="tag">SEC.02</span> MASA OPERASI</h3></div><div class="panel-b grid g2">
            <div>${PR.fieldHTML({ k: 'tanggal_mulai_operasi', label: 'Tanggal mulai operasi modalitas pertama', type: 'date', req: 1 }, st.tanggal_mulai_operasi)}
            <div class="mt8" id="moChip">${mo.kat ? `<span class="tag t-y">Masa operasi ${mo.kat} · ${PR.L.METODE[mo.kat]}</span>` : ''}</div>
            <div class="fgrid mt">${PR.fieldHTML({ k: 'ppr_izin_no', label: 'No. Izin Bekerja PPR' }, st.ppr_izin_no)}${PR.fieldHTML({ k: 'ppr_izin_sd', label: 'Berlaku s.d.', type: 'date' }, st.ppr_izin_sd)}</div></div>
            <div class="ban ban-info" style="margin:0">${PR.ic('info')}<div class="grow small">Dipakai untuk menentukan masa operasi dan metode pembatas dosis sesuai <i>Pedoman Teknis Penetapan Pembatas Dosis Tahap Operasional</i> (BAPETEN, Rev. 1, 2021). Penambahan modalitas baru tidak mengulang masa operasi.</div></div></div></div>`,
        3: `<div class="grid">${imp('alat')}</div>`,
        4: `<div class="grid">${imp('pekerja')}</div>`,
        5: `<div class="panel"><div class="panel-h"><h3><span class="tag">SEC.05</span> BATAS LAJU DOSIS RS (opsional)</h3></div><div class="panel-b"><p class="small muted" style="margin-top:0">Batas laju dosis per klasifikasi area ditetapkan RS dari kajian keselamatannya (bukan angka baku regulasi). Bisa diisi nanti di Pengaturan.</p>
            <div class="fgrid">${PR.fieldHTML({ k: 'batas_pengendalian', label: 'Daerah pengendalian (µSv/jam)', type: 'number' }, st.batas_pengendalian)}${PR.fieldHTML({ k: 'batas_supervisi', label: 'Daerah supervisi (µSv/jam)', type: 'number' }, st.batas_supervisi)}${PR.fieldHTML({ k: 'batas_umum', label: 'Area umum (µSv/jam)', type: 'number' }, st.batas_umum)}</div>
            <div class="ban ban-info mt" style="margin-bottom:0">${PR.ic('circle-check')}<div class="grow small">Setelah selesai, lengkapi data di menu Inventaris, Kartu Dosis, dan Arsip Dokumen. Skor Siap Inspeksi akan terisi otomatis.</div></div></div></div>`
      }[W.step];
      return `<div style="max-width:1100px;margin:0 auto;padding:32px 16px 120px">
        <div class="spread"><div><div class="eyebrow">PENYIAPAN AWAL</div><h1>SIAPKAN FASILITAS ANDA</h1></div><button class="btn-g btn" data-act="logout">Keluar</button></div>
        <div class="steps mt">${steps.map((s, i) => `<div class="${i + 1 < W.step ? 'done' : i + 1 === W.step ? 'on' : ''}"><span class="n">${i + 1 < W.step ? PR.ic('check', 'ic-s') : i + 1}</span><div><small>${String(i + 1).padStart(2, '0')}${i + 1 === W.step ? ' · AKTIF' : ''}</small><b>${s}</b></div></div>`).join('')}</div>
        <form id="wz" novalidate>${body}</form>
        <div class="panel-dark" style="position:sticky;bottom:12px;margin-top:20px;display:flex;justify-content:space-between;gap:10px;padding:12px 16px;flex-wrap:wrap">
          <button class="btn" style="background:transparent;color:#fff;border-color:#555" data-act="wzBack" ${W.step === 1 ? 'disabled' : ''}>${PR.ic('arrow-left')}Kembali</button>
          <div class="row"><button class="btn btn-y" data-act="wzNext">${W.step === 5 ? 'Selesai & buka dasbor' : 'Lanjut'} ${PR.ic('arrow-right')}</button></div></div></div>`;
    },
    mount: root => {
      const t = PR.$('[name=tanggal_mulai_operasi]', root);
      if (t) t.oninput = () => { const mo = PR.L.masaOperasi(t.value); PR.$('#moChip').innerHTML = mo.kat ? `<span class="tag t-y">Masa operasi ${mo.kat} · ${PR.L.METODE[mo.kat]}</span>` : ''; };
      PR.$$('[data-imp]', root).forEach(inp => inp.onchange = async () => { try { W[inp.dataset.imp] = await PR.importRows(inp.files[0], inp.dataset.imp); PR.render(); } catch (e) { PR.toast(e.message, 'err'); } });
    }
  });
  PR.acts.wzBack = (el, e) => { e.preventDefault(); W.step = Math.max(1, W.step - 1); PR.render(); };
  PR.acts.wzNext = (el, e) => {
    e.preventDefault();
    const f = PR.$('#wz'), g = k => f.elements[k] ? f.elements[k].value.trim() : '';
    if (W.step === 1) {
      if (!g('nama') || !g('instalasi') || !g('ppr_nama')) return PR.toast('Lengkapi kolom wajib', 'warn');
      const rs = PR.L.rs(); A.save('RS', Object.assign({}, rs, { id: rs.id || 'RS1', nama: g('nama'), instalasi: g('instalasi'), alamat: g('alamat'), pemegang_izin: g('pemegang_izin'), aktif: 'ya' }));
      A.setting('ppr_nama', g('ppr_nama'));
    }
    if (W.step === 2) { if (!g('tanggal_mulai_operasi')) return PR.toast('Isi tanggal mulai operasi', 'warn'); ['tanggal_mulai_operasi', 'ppr_izin_no', 'ppr_izin_sd'].forEach(k => A.setting(k, g(k))); }
    if (W.step === 3 && W.alat) { const n = PR.commitImport('alat', W.alat.data); PR.toast(n + ' alat disimpan', 'ok'); W.alat = null; }
    if (W.step === 4 && W.pekerja) { const n = PR.commitImport('pekerja', W.pekerja.data); PR.toast(n + ' pekerja disimpan', 'ok'); W.pekerja = null; }
    if (W.step === 5) { ['batas_pengendalian', 'batas_supervisi', 'batas_umum'].forEach(k => g(k) && A.setting(k, g(k).replace(',', '.'))); A.setting('wizard_selesai', 'ya'); W.step = 1; return PR.go('#/dasbor'); }
    W.step++; PR.render();
  };
})(window.PR);
