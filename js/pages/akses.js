/* AlaraGo — W-23 Persetujuan peninjau, W-24 Peninjau tamu, W-25 QR pintu ruangan */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;

  // ================= PERSETUJUAN (peninjau internal) =================
  PR.baDoc = (rows, opt) => {
    opt = opt || {}; const rs = L.rs(), c = L.dcCalc(), first = rows[0] || {};
    const appr = rows.filter(d => d.status === 'disetujui');
    return `<div class="doc-sheet"><div class="center eyebrow">Lampiran 4 · contoh format pedoman teknis pembatas dosis</div>
      <h1 style="margin-top:10px">Berita Acara Penetapan Pembatas Dosis</h1><p class="center mono small">No. BA-DC/${PR.esc((rs.nama || 'RS').replace(/[^A-Z]/gi, '').slice(0, 6).toUpperCase())}/${PR.year()} · Tahun penetapan ${PR.year()}</p>
      <div class="kv2 mt"><div><small>Nama instansi</small>${PR.esc(rs.nama || '—')}</div><div><small>Unit / instalasi</small>${PR.esc(rs.instalasi || '—')}</div><div style="grid-column:1/-1"><small>Alamat</small>${PR.esc(rs.alamat || '—')}</div></div>
      <p style="line-height:1.7">Telah dilakukan penetapan pembatas dosis pekerja radiasi tahap operasional dengan metode perhitungan <b>${PR.esc(L.METODE[c.mo.kat] || '—')}</b> (masa operasi ${c.mo.kat || '—'}) terhadap data dosis pekerja radiasi periode <b>${PR.esc(first.periode || '—')}</b>, dengan rincian:</p>
      ${U.table([{ h: 'Profesi / kategori pekerja', v: d => `<b>${PR.esc(d.profesi)}</b>` }, { h: 'Nilai DC (mSv/tahun)', r: 1, v: d => `<b>${PR.f(PR.n(d.nilai))}</b>` }, { h: 'Metode perhitungan', v: d => PR.esc(d.metode || '') }], rows)}
      <p>Pembatas dosis ini berlaku hingga tahun <b>${PR.esc(first.berlaku_sd || '—')}</b>.</p>
      <div class="sigs"><div style="border:1px ${appr.length === rows.length && rows.length ? 'solid var(--ok)' : 'dashed var(--warn)'};padding:12px"><div class="small">Mengetahui,<br><b>Penanggung jawab fasilitas / Kepala Instalasi</b></div><div class="center mono small" style="padding:16px 0">${appr.length === rows.length && rows.length ? `<span class="tag t-aman">Disetujui digital</span><div class="tiny mt8">${PR.dt(appr[0].disetujui_pada)}</div>` : '<span class="tag t-tinjau">Menunggu persetujuan</span>'}</div><b>${PR.esc(appr[0] && appr[0].disetujui_oleh || '')}</b></div>
        <div style="border:1px solid var(--line2);padding:12px"><div class="small">Pelaksana,<br><b>Petugas Proteksi Radiasi</b></div><div style="padding:16px 0"></div><b>${PR.esc(PR.set.ppr_nama || '')}</b></div></div></div>`;
  };
  PR.page('persetujuan', {
    title: 'Persetujuan', roles: ['peninjau'],
    crumb: () => 'Tindakan peninjau / <b>Persetujuan</b>',
    render: () => {
      const by = L.dcRows(), all = Object.values(by), wait = all.filter(d => d.status === 'menunggu'), c = L.dcCalc();
      const rows = wait.length ? wait : all;
      return `${U.head(`Persetujuan ${wait.length ? PR.tag('menunggu persetujuan', 'tinjau') : ''}`, 'Berita acara penetapan pembatas dosis memerlukan persetujuan penanggung jawab ("Mengetahui") sesuai format Lampiran 4 Pedoman Teknis.', `<a class="btn" href="#/dasbor">Lihat dasbor (hanya baca) ${PR.ic('arrow-right')}</a>`)}
        ${!all.length ? `<div class="panel">${U.empty('Belum ada pembatas dosis yang diajukan PPR.')}</div>` : `<div class="grid g-7-5"><div class="panel"><div class="panel-h"><h3>${PR.ic('file-text')} Lampiran 4 · Berita acara</h3><a class="btn btn-s" href="#/cetak/dc">${PR.ic('download')}Unduh PDF lampiran 1–4</a></div><div class="panel-b" style="background:var(--sub)">${PR.baDoc(rows)}</div></div>
        <div class="stack"><div class="panel"><div class="panel-h"><h3>Parameter penetapan</h3>${PR.tag('dihitung AlaraGo', 'netral', 1)}</div><div class="panel-b"><div class="kv2"><div><small>Masa operasi</small><b>${c.mo.kat || '—'}</b> (${c.mo.tahun ? PR.f(c.mo.tahun, 1) + ' tahun' : '—'})</div><div><small>Metode</small>${PR.esc(L.METODE[c.mo.kat] || '—')}</div><div><small>Periode data</small>${PR.esc((rows[0] || {}).periode || '—')}</div><div><small>Berlaku s.d.</small>${PR.esc((rows[0] || {}).berlaku_sd || '—')}</div></div></div></div>
          <div class="panel"><div class="panel-h"><h3>Perbandingan terhadap NBD</h3><span class="mono tiny muted">NBD ${L.NBD().pekerja_rata5} mSv/thn</span></div><div class="panel-b stack" style="gap:12px">${rows.map(d => `<div><div class="spread small"><span>${PR.esc(d.profesi)}</span><span class="mono">${PR.f(PR.n(d.nilai))} / ${L.NBD().pekerja_rata5} mSv (${PR.pct(PR.n(d.nilai) / L.NBD().pekerja_rata5, 1)})</span></div><div class="bar mt8"><i style="width:${PR.n(d.nilai) / L.NBD().pekerja_rata5 * 100}%;background:var(--ok)"></i></div></div>`).join('')}
            <a class="small" href="#/cetak/dc">Lihat lembar pengumpulan & pengolahan data (Lampiran 1–2) ↗</a></div></div>
          ${wait.length ? `<div class="panel" style="border:2px solid var(--ink)"><div class="panel-h"><h3>Keputusan peninjau</h3></div><div class="panel-b stack" style="gap:10px"><button class="btn btn-y btn-b" style="height:48px" data-act="apprDC" data-d="setuju">${PR.ic('stamp')}Setujui berita acara</button><button class="btn btn-b" data-act="apprDC" data-d="revisi">${PR.ic('pencil')}Minta revisi</button></div></div>`
            : `<div class="ban ban-info">${PR.ic('circle-check')}<div class="grow"><b style="font-size:14px">${all.every(d => d.status === 'disetujui') ? 'Semua pembatas dosis sudah disetujui' : 'Tidak ada yang menunggu persetujuan'}</b><p>${all.filter(d => d.disetujui_pada).map(d => PR.esc(d.profesi) + ': ' + PR.esc(d.status) + ' ' + PR.dt(d.disetujui_pada)).join('<br>')}</p></div></div>`}</div></div>`}`;
    }
  });
  PR.acts.apprDC = async el => {
    const ids = Object.values(L.dcRows()).filter(d => d.status === 'menunggu').map(d => d.id);
    let note = '';
    if (el.dataset.d === 'revisi') { const v = await PR.form({ title: 'Minta revisi', fields: [{ k: 'note', label: 'Catatan untuk PPR', type: 'textarea', req: 1 }], ok: 'Kirim' }, {}); if (!v) return; note = v.note; }
    else if (!(await PR.confirm('Setujui berita acara penetapan pembatas dosis ini? Persetujuan digital tercatat dengan nama dan waktu Anda.', 'Setujui'))) return;
    try { await A.call('approveDC', { ids, decision: el.dataset.d, note }); await A.boot(true); PR.toast(el.dataset.d === 'setuju' ? 'Berita acara disetujui' : 'Permintaan revisi dikirim ke PPR', 'ok'); PR.render(); } catch (e) { PR.toast(e.message, 'err'); }
  };

  // ================= TAMU (inspektur / pihak luar) =================
  const G = { data: null, err: null };
  PR.page('tamu', {
    full: true, title: 'Paket Siap Inspeksi',
    render: r => {
      const sec = +(r.q.s || 1);
      if (G.err) return `<div class="center-wrap"><div class="auth-card"><div class="hazard"></div><div class="in"><div class="auth-brand">${PR.logo()}<div><b>AlaraGo</b><span>Paket siap inspeksi</span></div></div><div class="ban ban-crit">${PR.ic('lock')}<div class="grow">${PR.esc(G.err)}</div></div></div></div></div>`;
      if (!G.data) return `<div class="center-wrap"><div class="sk" style="width:240px"></div><div class="sk" style="width:180px"></div></div>`;
      const d = G.data, rs = L.rs(), R = L.readiness(PR.today());
      if (r.q.print) return `<div class="page" style="max-width:1000px"><div class="no-print row mb"><a class="btn" href="#/tamu?${G.qs}">${PR.ic('arrow-left')}Kembali</a><button class="btn btn-y" data-act="print">${PR.ic('printer')}Cetak / simpan PDF</button></div>${PR.paketHTML(R)}</div>`;
      return `<header class="top" style="position:sticky;flex-wrap:wrap;height:auto;min-height:56px;padding:8px 24px">${PR.logo()}<b style="font:700 16px var(--fh)">Paket siap inspeksi · ${PR.esc(rs.nama || '')}</b><span class="tag">Hanya baca · berlaku s.d. ${PR.esc(PR.d(d.berlaku_sd))}</span><span style="flex:1"></span><span class="small mono">${PR.ic('clock', 'ic-s')} Sisa ${Math.max(0, Math.ceil((new Date(d.berlaku_sd) - new Date()) / 864e5))} hari</span>
          <button class="btn btn-s" data-act="zipPack">${PR.ic('download')}Unduh ZIP</button><a class="btn btn-s btn-y" href="#/tamu?${G.qs}&print=1">${PR.ic('file-check')}Unduh paket PDF</a></header>
        <div class="page"><div class="panel mb"><div class="panel-b row" style="gap:8px 28px"><span class="small">RS: <b>${PR.esc(rs.nama || '')}</b></span><span class="small">PPR: <b>${PR.esc(d.ppr || PR.set.ppr_nama || '')}</b> · Izin Bekerja ${PR.esc(PR.set.ppr_izin_no || '—')}</span><span class="small">Tanggal paket: <b>${PR.d(PR.today())}</b></span><span class="small">Ringkasan kelengkapan <b class="mono">${Math.round(R.score * 100)}%</b> <span class="muted">(perkiraan internal)</span></span></div></div>
          <div class="grid g-3-9"><div class="panel" style="align-self:start"><div class="panel-h"><h3>8 bagian LHI</h3></div>${R.sections.map(x => `<a href="#/tamu?${G.qs}&s=${x.no}" class="list-row" style="text-decoration:none;padding:10px 14px;${x.no === sec ? 'background:var(--y-t);box-shadow:inset 3px 0 var(--y)' : ''}"><span class="mono">${String(x.no).padStart(2, '0')}</span><div class="grow"><b>${x.title}</b></div><span class="mono small">${Math.round(x.pct * 100)}%</span></a>`).join('')}</div>
            <div class="panel"><div class="panel-h"><div><span class="tag t-ink">Bagian ${sec}</span><h2 style="margin-top:8px">${PR.pkg.TITLES[sec - 1]}</h2></div><span class="pct">${Math.round(R.sections[sec - 1].pct * 100)}%</span></div><div class="panel-b">${PR.pkg.section(sec)}
              <div class="spread mt">${sec > 1 ? `<a class="btn" href="#/tamu?${G.qs}&s=${sec - 1}">${PR.ic('arrow-left')}Bagian sebelumnya</a>` : '<span></span>'}${sec < 8 ? `<a class="btn btn-y" href="#/tamu?${G.qs}&s=${sec + 1}">Bagian berikutnya ${PR.ic('arrow-right')}</a>` : ''}</div></div></div></div>
          <p class="small muted mt" style="text-align:center">Tautan hanya baca · dibuat oleh PPR · berakhir ${PR.dt(d.berlaku_sd)}. Dokumen ditampilkan sebagai berkas asli yang diunggah fasilitas.</p></div>`;
    },
    mount: async (root, r) => {
      if (G.data || G.err) return;
      try {
        if (r.q.demo) { const j = await PR.demo.handle('guest', {}); G.data = j.data; U.guest = { g: 'demo', url: 'demo' }; G.qs = 'demo=1'; }
        else {
          if (!r.q.p || !r.q.k) throw new Error(r.q.g ? 'Tautan ini dibuat oleh versi lama AlaraGo. Minta tautan baru ke PPR.' : 'Tautan tidak lengkap.');
          const pkg = await PR.akses.tamu(r.q);
          if (pkg.berlaku_sd && new Date(pkg.berlaku_sd) < new Date()) throw new Error('Tautan ini sudah berakhir. Minta tautan baru ke PPR.');
          G.data = { tables: pkg.tables, settings: pkg.settings || {}, berlaku_sd: pkg.berlaku_sd, today: PR.today(), ppr: pkg.ppr || (pkg.settings || {}).ppr_nama || '' };
          U.guest = { peta: pkg.berkas || {}, cr: { r: r.q.r } }; G.qs = `r=${encodeURIComponent(r.q.r || '')}&p=${encodeURIComponent(r.q.p)}&k=${encodeURIComponent(r.q.k)}`;
        }
        PR.db = G.data.tables; PR.set = G.data.settings; PR._today = G.data.today; PR.extra = {};
      } catch (e) { G.err = e.code === 'BAD_LINK' || /tidak ditemukan|kedaluwarsa|expired/i.test(e.message) ? 'Tautan ini tidak berlaku lagi (berakhir atau dicabut PPR).' : e.message; }
      PR.render();
    }
  });

  // ================= QR PINTU RUANGAN (publik) =================
  const D = {};
  PR.page('pintu', {
    full: true, title: 'Status ruangan',
    render: r => { const key = (r.q.r || r.q.demo || '') + '|' + r.q.d, d = D[key];
      const sty = { 'aman': ['var(--ok)', 'var(--ok-b)', 'circle-check', 'Aman'], 'perlu perhatian': ['var(--warn)', 'var(--warn-b)', 'circle-alert', 'Perlu perhatian'], 'melebihi batas': ['#fff', 'var(--crit)', 'triangle-alert', 'Melebihi batas'], 'survei ulang diperlukan': ['var(--warn)', 'var(--warn-b)', 'radar', 'Survei ulang diperlukan'], 'belum disurvei': ['var(--muted)', 'var(--sub)', 'info', 'Belum disurvei'] };
      if (!d) return `<div class="door"><div class="sk"></div><div class="sk t"></div></div>`;
      if (d.err) return `<div class="door"><div class="row">${PR.logo()}<b style="font:700 18px var(--fh)">AlaraGo</b></div><div class="ban ban-crit mt">${PR.ic('triangle-alert')}<div class="grow">${PR.esc(d.err)}</div></div></div>`;
      const s = sty[d.status] || sty['belum disurvei'];
      return `<div class="door"><div class="hazard" style="margin:-24px -16px 20px"></div><div class="row">${PR.logo()}<b style="font:700 18px var(--fh)">AlaraGo</b></div>
        <h1 class="mt">${PR.esc(d.ruang)}</h1><p class="muted" style="margin:4px 0 0">${PR.esc(d.rs)}${d.lantai ? ' · ' + PR.esc(d.lantai) : ''}</p>
        <div class="status" style="border-color:${s[0] === '#fff' ? 'var(--crit)' : s[0]};background:${s[1]};color:${s[0]}">${PR.ic(s[2], 'ic-l')}<b>${s[3]}</b></div>
        <dl class="kv" style="font-size:15px"><dt>Survei terakhir</dt><dd>${d.tanggal ? PR.d(d.tanggal) : '—'}</dd><dt>Klasifikasi area</dt><dd>${PR.esc(d.klasifikasi ? 'Daerah ' + d.klasifikasi : '—')}</dd></dl>
        <p class="small muted mt">Halaman ini tidak memuat data pribadi. Status berdasarkan survei paparan terakhir terhadap batas laju dosis yang ditetapkan rumah sakit. Informasi lebih lanjut: hubungi petugas proteksi radiasi.</p></div>`; },
    mount: async (root, r) => {
      const key = (r.q.r || r.q.demo || '') + '|' + r.q.d; if (D[key]) return;
      try {
        if (r.q.demo) { const j = await PR.demo.handle('door', { r: r.q.d }); D[key] = j.success ? j.data : { err: j.message }; }
        else if (!r.q.d) D[key] = { err: r.q.b ? 'QR pintu ini dibuat oleh versi lama AlaraGo. Minta PPR mencetak ulang QR pintu.' : 'QR tidak lengkap.' };
        else D[key] = await PR.akses.pintuStatus(r.q);
      } catch (e) { D[key] = { err: e.network || e instanceof TypeError ? 'Tidak dapat memuat status. Periksa koneksi.' : e.message }; }
      PR.render();
    }
  });
})(window.PR);
