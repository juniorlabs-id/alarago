/* ProteRad — W-01/W-02 Dasbor */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L;
  PR.page('dasbor', {
    title: 'Dasbor', roles: ['ppr', 'peninjau'],
    crumb: () => 'SISTEM KONTROL PROTEKSI RADIASI / <b>DASBOR</b>',
    render: () => {
      const R = L.readiness(), due = L.dueItems().filter(i => i.days <= 30 && i.status !== 'selesai').slice(0, 6);
      const ws = L.activeWorkers().map(w => ({ w, s: L.doseStatus(w) })).filter(x => x.s.status !== 'aman').sort((a, b) => b.s.ratio - a.s.ratio);
      const cons = L.consistency();
      return `${U.head('DASBOR KEPATUHAN', 'Kesiapan inspeksi dan status keselamatan radiasi fasilitas — diperbarui otomatis dari semua menu.',
        `<button class="btn" data-go="#/inspeksi">${PR.ic('sliders-horizontal')}Simulasi inspeksi</button>${U.btn('Buat paket inspeksi', '', 'file-check', 'btn-y ro-ok', 'data-go="#/cetak/paket"')}`, 'KONTROL MONITORING UTAMA')}
      ${R.gates.length ? `<div class="ban ban-crit">${PR.ic('triangle-alert', 'ic-l')}<div class="grow"><b>Item kritis gagal — skor dibatasi maksimal 59%</b><p>${R.gates.map(g => PR.esc(g.label)).join(' · ')}</p></div><button class="btn btn-d btn-s" data-go="${R.gates[0].route}">Perbaiki</button></div>` : ''}
      <div class="grid g-4-8">
        <div class="panel"><div class="panel-b">
          <div class="spread"><span class="eyebrow">Skor kesiapan fasilitas</span><span class="tag">ESTIMASI</span></div>
          <div class="row mt8" style="align-items:flex-end;gap:14px"><span class="score">${Math.round(R.score * 100)}%</span>${PR.tag(R.label, R.kind)}</div>
          <p class="small muted" style="margin:6px 0 16px">Perkiraan internal, bukan nilai IKK resmi.</p>
          <div class="spread small"><span>Progres menuju siap</span><span class="mono">target ≥ 90%</span></div>
          <div class="bar mt8" style="height:12px"><i style="width:${R.score * 100}%"></i><span style="position:absolute;left:90%;top:-4px;bottom:-4px;width:2px;background:var(--crit)"></span></div>
          ${R.score !== R.raw ? `<p class="small mt8">Skor tanpa gerbang kritis: <b class="mono">${Math.round(R.raw * 100)}%</b></p>` : ''}
          <div class="mt" style="border-top:1px solid var(--line);padding-top:12px"><a href="#/inspeksi" class="spread" style="text-decoration:none"><span>Lihat daftar periksa lengkap</span>${PR.ic('arrow-right')}</a></div>
        </div></div>
        <div class="panel"><div class="panel-h"><h3>Kesiapan 8 bagian LHI</h3><span class="small muted">Rata-rata berbobot mengikuti format Laporan Hasil Inspeksi</span></div>
          <div class="panel-b grid g2" style="gap:10px">${R.sections.map(s => {
            const bad = s.items.filter(x => !x.na && x.v < 1).length, gate = s.items.some(x => x.gate);
            return `<a href="#/inspeksi?s=${s.no}" class="tile" style="text-decoration:none;gap:6px;padding:10px 12px"><div class="spread"><span style="font-weight:500">${s.no}. ${s.title}</span><span class="row" style="gap:6px">${gate ? PR.tag('kritis', 'kritis', 1) : ''}<b class="mono">${Math.round(s.pct * 100)}%</b></span></div><div class="bar"><i style="width:${s.pct * 100}%"></i></div><span class="small muted mono">${bad ? bad + ' item perlu tindakan' : 'Semua item terpenuhi'}</span></a>`;
          }).join('')}</div></div>
      </div>
      <div class="grid g2 mt">
        <div class="panel"><div class="panel-h"><h3>${PR.ic('zap')} Perbaiki ini dulu</h3><span class="tag t-ink">${R.fixes.length} ITEM</span></div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">
          ${R.fixes.length ? R.fixes.slice(0, 5).map((f, i) => `<div class="list-row"><span class="mono muted">${String(i + 1).padStart(2, '0')}.</span><div class="grow"><b>${PR.esc(f.label)}</b><span>Bagian ${f.sec} · ${PR.esc(f.detail || '')}</span></div>${f.gate ? PR.tag('kritis', 'kritis', 1) : ''}<span class="impact">+${Math.max(1, Math.round(f.impact * 100))}%</span><button class="btn btn-d btn-s" data-go="${f.route}">Perbaiki</button></div>`).join('') : U.empty('Semua item terpenuhi. Pertahankan!')}
        </div></div>
        <div class="panel"><div class="panel-h"><h3>${PR.ic('calendar-check')} Jatuh tempo 30 hari</h3><a class="small" href="#/kalender">Buka Kalender Kepatuhan →</a></div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">
          ${due.length ? due.map(i => `<div class="list-row"><span class="mono small" style="width:86px">${PR.d(i.due)}</span><div class="grow"><b>${PR.esc(i.title)}</b><span>${PR.esc(i.obj || '')}</span></div>${i.status === 'dijadwalkan' ? PR.tag('dijadwalkan', 'netral', 1) : ''}${PR.dueTag(i.days)}</div>`).join('') : U.empty('Tidak ada jatuh tempo dalam 30 hari.')}
        </div></div>
      </div>
      <div class="panel mt"><div class="panel-h"><h3>${PR.ic('triangle-alert')} Pekerja radiasi perlu perhatian</h3><span class="small muted">Dosis mendekati atau melampaui pembatas dosis (DC) tahun ${PR.year()}</span></div>
        ${U.table([
          { h: 'Nama', v: x => `<b>${PR.esc(x.w.nama)}</b><span class="sub">${PR.esc(x.w.npr || '')}</span>` }, { h: 'Profesi', v: x => PR.esc(x.w.profesi) },
          { h: 'Dosis tahunan (mSv)', r: 1, v: x => PR.f(x.s.sum) }, { h: 'Pembatas dosis (mSv)', r: 1, v: x => x.s.dc ? PR.f(x.s.dc) : '<span class="muted">belum</span>' },
          { h: '% DC', r: 1, v: x => x.s.dc ? PR.pct(x.s.sum / x.s.dc) : '—' }, { h: 'Status', v: x => L.doseTag(x.s.status) },
          { h: '', v: x => `<button class="btn btn-s ${x.s.status === 'analisis' || x.s.status === 'kritis' ? 'btn-d' : ''}" data-go="#/dosis/p/${x.w.id}">${x.s.status === 'analisis' ? 'Investigasi' : 'Detail'}</button>` }
        ], ws.slice(0, 8), { empty: 'Semua pekerja di bawah 50% pembatas dosis.', foot: `<span>Total ${L.activeWorkers().length} pekerja dipantau · ${ws.length} perlu perhatian</span><a href="#/dosis">Lihat Kartu Dosis →</a>` })}
      </div>
      ${cons.length ? `<div class="panel mt"><div class="panel-h"><h3>${PR.ic('scan-search')} Cek konsistensi data</h3>${PR.tag(cons.length + ' temuan', 'tinjau', 1)}</div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">${cons.slice(0, 6).map(c => `<div class="list-row">${PR.tag(c.crit ? 'kritis' : 'tinjau', c.crit ? 'kritis' : 'tinjau', 1)}<div class="grow"><b style="white-space:normal">${PR.esc(c.msg)}</b></div><button class="btn btn-s" data-go="${c.route}">${PR.esc(c.act)}</button></div>`).join('')}</div></div>` : ''}`;
    }
  });
})(window.PR);
