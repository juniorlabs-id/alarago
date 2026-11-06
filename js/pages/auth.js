/* AlaraGo — Masuk (Google), aktivasi QR + PIN, buka PIN, wizard penyiapan awal */
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
    <div class="auth-brand">${PR.logo()}<div><b>AlaraGo</b><span>Protect. Record. Ready.</span></div></div>${inner}</div></div></div>`;

  const cfg = () => window.PR_CONFIG || {};
  async function masukSelesai() {
    try { await A.boot(true); } catch (e) { PR.toast(e.message, 'err'); return; }
    const role = PR.me && PR.me.role;
    PR.go(role === 'pekerja' ? '#/saya' : role === 'peninjau' ? '#/persetujuan' : '#/dasbor');
  }
  const pad = (stage, len, msg) => `<div class="pin-boxes" aria-live="polite">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i === len ? 'on' : ''}">${i < len ? '•' : ''}</i>`).join('')}</div>
    ${msg ? `<div class="small" style="color:var(--crit);margin:-8px 0 10px">${PR.esc(msg)}</div>` : ''}
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join('')}<button class="sub" data-k="c">Hapus</button><button data-k="0">0</button><button class="sub" data-k="b" aria-label="Hapus satu">${PR.ic('arrow-left')}</button></div>`;

  // ================= MASUK =================
  PR.page('masuk', {
    full: true, title: 'Masuk',
    render: () => {
      const ada = PR.akses && PR.akses.tersimpan();
      const kurang = !cfg().GOOGLE_CLIENT_ID || !cfg().RELAY_URL;
      return card(`<h2>Masuk</h2><p class="muted" style="margin:6px 0 20px">Rekaman proteksi radiasi fasilitas Anda, tersimpan di Google Drive Anda sendiri.</p>
        ${kurang ? `<div class="ban ban-warn">${PR.ic('triangle-alert')}<div class="grow small">Pengaturan aplikasi belum lengkap (${!cfg().GOOGLE_CLIENT_ID ? 'GOOGLE_CLIENT_ID' : ''}${!cfg().GOOGLE_CLIENT_ID && !cfg().RELAY_URL ? ' & ' : ''}${!cfg().RELAY_URL ? 'RELAY_URL' : ''} di js/config.js).</div></div>` : ''}
        <button class="btn btn-y btn-b" style="height:48px" data-act="loginPPR" ${kurang ? 'disabled' : ''}>${PR.ic('user')}Masuk dengan Google</button>
        <p class="small muted" style="margin:8px 0 0;text-align:center">Untuk Petugas Proteksi Radiasi. Pertama kali, AlaraGo membuat folder & spreadsheet di Drive Anda.</p>
        <div class="ban ban-crit mt8" id="lerr" hidden></div>
        <div class="divider">Pekerja & peninjau</div>
        ${ada ? `<a class="rowbtn" href="#/pin" style="margin-bottom:8px">${PR.ic('lock', 'ic-l')}<div style="flex:1"><b>Buka portal saya</b><span>Akses sudah tersimpan di perangkat ini — masukkan PIN</span></div>${PR.ic('chevron-right')}</a>` : ''}
        <button class="rowbtn" data-act="qrHelp">${PR.ic('qr-code', 'ic-l')}<div style="flex:1"><b>Punya QR dari PPR?</b><span>Pindai QR dengan kamera HP, lalu buat PIN</span></div>${PR.ic('chevron-right')}</button>
        <div class="divider">Atau</div>
        <button class="rowbtn" data-act="startDemo" style="border-style:dashed">${PR.ic('play')}<div style="flex:1"><b><span class="tag t-y">Uji coba</span> Lihat demo</b><span>Jelajahi semua fitur dengan data contoh, tanpa memasang apa pun</span></div>${PR.ic('chevron-right')}</button>
        <p class="small muted mt" style="text-align:center">${PR.ic('lock', 'ic-s')} <a href="privasi.html">Kebijakan privasi</a></p>`);
    }
  });
  PR.acts.loginPPR = async el => {
    const err = PR.$('#lerr'); err.hidden = true; el.disabled = true;
    try {
      const u = await PR.drive.login();
      A.setUrl('drive'); A.setSession('drive');
      PR.toast('Masuk sebagai ' + u.email, 'ok');
      await masukSelesai();
    } catch (e) { err.hidden = false; err.innerHTML = `${PR.ic('circle-x')}<div class="grow small">${PR.esc(e.message)}</div>`; }
    finally { el.disabled = false; }
  };
  PR.acts.startDemo = async () => { A.setUrl('demo'); PR.demo.setRole('ppr'); A.setSession('demo-session'); try { await A.boot(true); PR.go('#/dasbor'); } catch (e) { PR.toast(e.message, 'err'); } };
  PR.acts.qrHelp = () => PR.modal({ title: 'Masuk dengan QR + PIN', body: `<ol style="margin:0;padding-left:18px;line-height:1.8"><li>Minta <b>QR akses pribadi</b> ke PPR (pekerja: biasanya ditempel di ID card atau kartu TLD; peninjau: dikirim lewat pesan).</li><li>Pindai QR dengan kamera HP — AlaraGo terbuka.</li><li>Buat PIN 6 digit. Berikutnya cukup buka AlaraGo dan masukkan PIN.</li></ol><p class="small muted">Data Anda dikunci di HP Anda sendiri; PIN tidak pernah dikirim ke mana pun.</p>` });

  // ================= QR (aktivasi pekerja / peninjau) =================
  let pin = '', pin1 = '';
  PR.page('qr', {
    full: true, title: 'Aktifkan akses',
    render: () => `<div class="center-wrap"><div class="auth-card" style="max-width:420px"><div class="in" id="qrbox"><div class="sk"></div><div class="sk"></div></div></div></div>`,
    mount: async (root, r) => {
      const box = PR.$('#qrbox', root), q = Object.assign({}, r.q);
      const head = sub => `<div class="auth-brand" style="margin-bottom:16px">${PR.logo()}<div><b>AlaraGo</b><span>${sub}</span></div></div>`;
      const gagal = m => { box.innerHTML = head('Protect. Record. Ready.') + `<div class="ban ban-crit">${PR.ic('triangle-alert')}<div class="grow">${PR.esc(m)}</div></div><a class="btn btn-b mt" href="#/masuk">Ke halaman masuk</a>`; };
      if (q.demo) { A.setUrl('demo'); A.setSession('demo-session'); if (q.rv) PR.demo.setRole('peninjau'); else { PR.demo.setRole('pekerja'); if (q.w) PR.LS.set('pr_demo_worker', q.w); } await A.boot(true); return PR.go(q.rv ? '#/persetujuan' : '#/saya'); }
      if (!q.p || !q.k) return gagal(q.t ? 'QR ini dibuat oleh versi lama AlaraGo. Minta QR baru ke PPR.' : 'Tautan QR tidak lengkap. Pindai ulang QR dari PPR.');
      history.replaceState(null, '', location.pathname + '#/qr');   // kunci tidak tertinggal di riwayat browser
      let info;
      try { info = await PR.akses.periksa(q); } catch (e) { return gagal(e.message); }
      pin = ''; pin1 = '';
      const isW = info.jenis === 'pekerja';
      const draw = (stage, msg) => {
        box.innerHTML = head(isW ? 'Portal pekerja' : 'Akses peninjau') + `<h2>Halo, ${PR.esc(info.nama || '')}</h2><p class="muted small" style="margin:4px 0 0">${PR.esc(info.profesi || '')}${info.profesi ? ' · ' : ''}${stage === 'buat' ? 'Buat PIN 6 digit untuk perangkat ini' : 'Ulangi PIN'}</p>` + pad(stage, pin.length, msg) +
          (isW ? `<label class="chk mt"><input type="checkbox" id="consent"> Saya menyetujui pemakaian data dosis saya untuk pemantauan proteksi radiasi (UU PDP No. 27/2022).</label>` : '') +
          `<p class="small muted mt8">PIN mengunci data di perangkat ini. Lupa PIN? Minta QR baru ke PPR.</p>`;
        box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => press(b.dataset.k, stage));
      };
      const press = async (k, stage) => {
        const consent = PR.$('#consent') ? PR.$('#consent').checked : true;
        if (k === 'c') pin = ''; else if (k === 'b') pin = pin.slice(0, -1); else if (pin.length < 6) pin += k;
        draw(stage); if (PR.$('#consent')) PR.$('#consent').checked = consent;
        if (pin.length < 6) return;
        if (stage === 'buat') { pin1 = pin; pin = ''; draw('ulang'); if (PR.$('#consent')) PR.$('#consent').checked = consent; return; }
        if (pin !== pin1) { pin = ''; pin1 = ''; return draw('buat', 'PIN tidak sama. Ulangi.'); }
        if (!consent) { pin = ''; draw('ulang', 'Centang persetujuan pemakaian data terlebih dahulu.'); return; }
        try { await PR.akses.aktifkan(q, pin, info.jenis); A.setUrl('akses'); await masukSelesai(); }
        catch (e) { pin = ''; pin1 = ''; draw('buat', e.message); }
      };
      draw('buat');
    }
  });

  // ================= PIN (membuka akses tersimpan) =================
  PR.page('pin', {
    full: true, title: 'Masukkan PIN',
    render: () => `<div class="center-wrap"><div class="auth-card" style="max-width:420px"><div class="in" id="pinbox"></div></div></div>`,
    mount: root => {
      const box = PR.$('#pinbox', root), s = PR.akses.tersimpan();
      if (!s) return PR.go('#/masuk');
      pin = '';
      const draw = msg => {
        box.innerHTML = `<div class="auth-brand" style="margin-bottom:16px">${PR.logo()}<div><b>AlaraGo</b><span>${s.jenis === 'peninjau' ? 'Akses peninjau' : 'Portal pekerja'}</span></div></div><h2>Masukkan PIN</h2>` + pad('masuk', pin.length, msg) +
          `<p class="small muted mt">Bukan perangkat Anda? <button class="link small" data-act="hapusAkses">Hapus akses dari perangkat ini</button></p>`;
        box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => press(b.dataset.k));
      };
      const press = async k => {
        if (k === 'c') pin = ''; else if (k === 'b') pin = pin.slice(0, -1); else if (pin.length < 6) pin += k;
        draw(); if (pin.length < 6) return;
        try { await PR.akses.buka(pin); A.setUrl('akses'); await masukSelesai(); }
        catch (e) { pin = ''; if (e.code === 'WIPED') { PR.toast(e.message, 'err'); return PR.go('#/masuk'); } draw(e.message); }
      };
      draw();
    }
  });
  PR.acts.hapusAkses = async () => { if (!(await PR.confirm('Hapus akses AlaraGo dari perangkat ini? Anda perlu memindai QR lagi untuk masuk.', 'Hapus'))) return; PR.akses.hapus(); A.setUrl(''); PR.go('#/masuk'); };

  // ================= WIZARD =================
  const W = { step: 1, alat: null, pekerja: null };
  const TPL = {
    alat: ['kategori', 'ruangan', 'jenis', 'merek', 'tipe', 'no_seri', 'no_izin', 'izin_sd', 'ukes_sd', 'kalibrasi_sd', 'fk'],
    pekerja: ['nama', 'npr', 'profesi', 'kategori', 'email', 'no_hp', 'pelatihan_terakhir']
  };
  const TPL_EX = {
    alat: [{ kategori: 'alat', ruangan: 'R. X-Ray 1', jenis: 'Radiografi umum', merek: 'GE', tipe: 'Definium 646', no_seri: 'XR4819', no_izin: '0000/Izin/2023', izin_sd: '2028-01-22', ukes_sd: '2026-12-28' },
      { kategori: 'surveimeter', merek: 'Ludlum', tipe: 'Model 14C', no_seri: '289410', kalibrasi_sd: '2026-11-28', fk: '1.05' }],
    pekerja: [{ nama: 'Nama Pekerja, A.Md.Rad', npr: 'NPR-001', profesi: 'Radiografer Umum', kategori: 'umum', email: 'nama@gmail.com', no_hp: '0812…', pelatihan_terakhir: '2024-05-10' }]
  };
  PR.acts.tpl = el => { const k = el.dataset.k; PR.download(`template-${k}-alarago.csv`, PR.toCSV(TPL_EX[k], TPL[k])); };
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
      const imp = kind => { const x = W[kind]; return `<div class="panel"><div class="panel-b"><div class="spread"><div><div class="eyebrow">${kind === 'alat' ? 'Bagian 03' : 'Bagian 04'}</div><h3>${kind === 'alat' ? 'Alat radiasi & surveimeter' : 'Pekerja radiasi'}</h3></div>${PR.ic(kind === 'alat' ? 'boxes' : 'users', 'ic-l')}</div>
        <p class="small muted">${kind === 'alat' ? 'Pesawat sinar-X, CT, mammografi, dental, C-arm, surveimeter.' : 'Nama, NPR, profesi, kategori, email.'}</p>
        <label class="drop mt8">${PR.ic('file-up')} <span>${x ? `${x.errs.length ? PR.tag(x.errs.length + ' baris galat', 'tinjau') : PR.tag(x.data.length + ' baris terbaca · 0 galat', 'aman')}` : 'Pilih berkas <b>.xlsx / .csv</b>'}</span><input type="file" accept=".xlsx,.xls,.csv" hidden data-imp="${kind}"></label>
        ${x && x.errs.length ? `<div class="small mt8" style="color:var(--crit)">${x.errs.slice(0, 4).map(PR.esc).join('<br>')}</div>` : ''}
        <div class="spread mt8"><button class="link small" data-act="tpl" data-k="${kind}">Unduh template .csv</button>${x ? `<span class="small muted">Akan disimpan saat Lanjut</span>` : `<span class="small muted">Boleh dilewati, isi nanti di menu</span>`}</div></div></div>`; };
      const body = {
        1: `<div class="panel"><div class="panel-h"><h3><span class="tag">SEC.01</span> Data fasilitas</h3><span class="small muted">* wajib</span></div><div class="panel-b fgrid">
            ${PR.fieldHTML({ k: 'nama', label: 'Nama rumah sakit / instansi', req: 1, help: 'Sesuai nama pada izin pemanfaatan.' }, rs.nama)}${PR.fieldHTML({ k: 'instalasi', label: 'Instalasi', req: 1, ph: 'Instalasi Radiologi' }, rs.instalasi)}
            ${PR.fieldHTML({ k: 'alamat', label: 'Alamat lengkap', type: 'textarea' }, rs.alamat)}${PR.fieldHTML({ k: 'pemegang_izin', label: 'Pemegang izin', ph: 'Direktur Utama …' }, rs.pemegang_izin)}${PR.fieldHTML({ k: 'ppr_nama', label: 'Nama PPR (Anda)', req: 1 }, st.ppr_nama)}</div></div>`,
        2: `<div class="panel"><div class="panel-h"><h3><span class="tag">SEC.02</span> Masa operasi</h3></div><div class="panel-b grid g2">
            <div>${PR.fieldHTML({ k: 'tanggal_mulai_operasi', label: 'Tanggal mulai operasi modalitas pertama', type: 'date', req: 1 }, st.tanggal_mulai_operasi)}
            <div class="mt8" id="moChip">${mo.kat ? `<span class="tag t-y">Masa operasi ${mo.kat} · ${PR.L.METODE[mo.kat]}</span>` : ''}</div>
            <div class="fgrid mt">${PR.fieldHTML({ k: 'ppr_izin_no', label: 'No. Izin Bekerja PPR' }, st.ppr_izin_no)}${PR.fieldHTML({ k: 'ppr_izin_sd', label: 'Berlaku s.d.', type: 'date' }, st.ppr_izin_sd)}</div></div>
            <div class="ban ban-info" style="margin:0">${PR.ic('info')}<div class="grow small">Dipakai untuk menentukan masa operasi dan metode pembatas dosis sesuai <i>Pedoman Teknis Penetapan Pembatas Dosis Tahap Operasional</i> (BAPETEN, Rev. 1, 2021). Penambahan modalitas baru tidak mengulang masa operasi.</div></div></div></div>`,
        3: `<div class="grid">${imp('alat')}</div>`,
        4: `<div class="grid">${imp('pekerja')}</div>`,
        5: `<div class="panel"><div class="panel-h"><h3><span class="tag">SEC.05</span> Batas laju dosis RS (opsional)</h3></div><div class="panel-b"><p class="small muted" style="margin-top:0">Batas laju dosis per klasifikasi area ditetapkan RS dari kajian keselamatannya (bukan angka baku regulasi). Bisa diisi nanti di Pengaturan.</p>
            <div class="fgrid">${PR.fieldHTML({ k: 'batas_pengendalian', label: 'Daerah pengendalian (µSv/jam)', type: 'number' }, st.batas_pengendalian)}${PR.fieldHTML({ k: 'batas_supervisi', label: 'Daerah supervisi (µSv/jam)', type: 'number' }, st.batas_supervisi)}${PR.fieldHTML({ k: 'batas_umum', label: 'Area umum (µSv/jam)', type: 'number' }, st.batas_umum)}</div>
            <div class="ban ban-info mt" style="margin-bottom:0">${PR.ic('circle-check')}<div class="grow small">Setelah selesai, lengkapi data di menu Inventaris, Kartu Dosis, dan Arsip Dokumen. Skor Siap Inspeksi akan terisi otomatis.</div></div></div></div>`
      }[W.step];
      return `<div style="max-width:1100px;margin:0 auto;padding:32px 16px 120px">
        <div class="spread"><div><div class="eyebrow">Penyiapan awal</div><h1>Siapkan fasilitas anda</h1></div><button class="btn-g btn" data-act="logout">Keluar</button></div>
        <div class="steps mt">${steps.map((s, i) => `<div class="${i + 1 < W.step ? 'done' : i + 1 === W.step ? 'on' : ''}"><span class="n">${i + 1 < W.step ? PR.ic('check', 'ic-s') : i + 1}</span><div><small>${String(i + 1).padStart(2, '0')}${i + 1 === W.step ? ' · Aktif' : ''}</small><b>${s}</b></div></div>`).join('')}</div>
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
