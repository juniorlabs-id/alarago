/* ProteRad — tampilan cetak / simpan PDF (paket inspeksi, lampiran pembatas dosis, kartu & rekap dosis, MCU, survei, denah, QR pintu) */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const lvl = { kritis: 'Kritis', penting: 'Penting', pendukung: 'Pendukung' };
  const bar = (back) => `<div class="no-print ptool"><a class="btn" href="${back}">${PR.ic('arrow-left')}Kembali</a><span class="small muted grow">Gunakan "Simpan sebagai PDF" pada dialog cetak untuk membuat berkas PDF.</span><button class="btn btn-y" data-act="print">${PR.ic('printer')}Cetak / simpan PDF</button></div>`;
  const hdr = (judul, sub) => { const rs = L.rs(); return `<div class="phdr"><div class="row" style="gap:10px">${PR.logo()}<div><b>${PR.esc(rs.nama || '')}</b><span>${PR.esc(rs.instalasi || '')}${rs.alamat ? ' · ' + PR.esc(rs.alamat) : ''}</span></div></div><div class="r"><b>${judul}</b><span>${sub || 'Dicetak ' + PR.d(PR.today())}</span></div></div>`; };
  const foot = () => `<p class="tiny muted mt" style="border-top:1px solid var(--line2);padding-top:6px">Disusun dengan ProteRad dari data yang dicatat petugas proteksi radiasi. Ringkasan kelengkapan bersifat perkiraan internal, bukan hasil penilaian BAPETEN.</p>`;

  // ---------- paket siap inspeksi (dipakai juga oleh peninjau tamu) ----------
  PR.paketHTML = R => {
    const rs = L.rs();
    return `<div class="doc-sheet cover"><div class="hazard" style="margin:-32px -36px 28px"></div><div class="eyebrow">PAKET SIAP INSPEKSI · DISUSUN MENGIKUTI URUTAN BAGIAN LHI</div>
      <h1 style="text-align:left;font-size:34px;margin:12px 0 4px">${PR.esc(rs.nama || 'Rumah Sakit')}</h1><p style="margin:0 0 20px">${PR.esc(rs.instalasi || '')}${rs.alamat ? ' · ' + PR.esc(rs.alamat) : ''}</p>
      <div class="kv2"><div><small>Petugas Proteksi Radiasi</small>${PR.esc(PR.set.ppr_nama || '—')}</div><div><small>No. Izin Bekerja PPR</small><span class="mono">${PR.esc(PR.set.ppr_izin_no || '—')}</span></div><div><small>Tanggal acuan</small>${PR.d(R.ref)}</div><div><small>Jumlah alat / pekerja</small>${L.tb('Alat').length} alat · ${L.activeWorkers().length} pekerja</div></div>
      <div class="row mt" style="gap:24px;align-items:center;border:2px solid var(--ink);padding:16px"><div style="font:700 56px/1 var(--fm)">${Math.round(R.score * 100)}%</div><div class="grow"><b style="font:700 20px var(--fh);text-transform:uppercase">${R.label}</b><p class="small" style="margin:4px 0 0">Ringkasan kelengkapan (perkiraan internal ProteRad, bobot kritis 3 / penting 2 / pendukung 1)${R.gates.length ? ` · ${R.gates.length} butir kritis belum terpenuhi — skor dibatasi 59%` : ''}.</p></div></div>
      ${U.table([{ h: 'Bagian', v: s => `<b class="mono">${String(s.no).padStart(2, '0')}</b> ${PR.esc(s.title)}` }, { h: 'Butir', r: 1, v: s => s.items.filter(x => !x.na).length }, { h: 'Kelengkapan', r: 1, v: s => `<b>${Math.round(s.pct * 100)}%</b>` }], R.sections)}
      ${R.fixes.length ? `<h3 class="mt">Butir yang belum lengkap</h3>${U.table([{ h: 'Kode', v: x => `<span class="mono">${x.code}</span>` }, { h: 'Butir', v: x => PR.esc(x.label) + (x.detail ? `<span class="sub">${PR.esc(x.detail)}</span>` : '') }, { h: 'Tingkat', v: x => lvl[x.level] }, { h: 'Nilai', r: 1, v: x => Math.round(x.v * 100) + '%' }], R.fixes.slice(0, 15))}` : ''}${foot()}</div>
      ${R.sections.map(s => `<div class="doc-sheet pbreak mt"><div class="eyebrow">BAGIAN ${s.no} DARI 8</div><h1 style="text-align:left;margin:6px 0 10px">${PR.esc(PR.pkg.TITLES[s.no - 1])}</h1>
        ${U.table([{ h: 'Kode', v: x => `<span class="mono">${x.code}</span>` }, { h: 'Butir periksa', v: x => PR.esc(x.label) + (x.detail ? `<span class="sub">${PR.esc(x.detail)}</span>` : '') }, { h: 'Tingkat', v: x => lvl[x.level] }, { h: 'Status', v: x => x.na ? 'n/a' : x.v >= 1 ? 'Lengkap' : x.v >= 0.5 ? 'Dalam proses' : 'Belum' }], s.items)}
        ${PR.pkg.section(s.no)}</div>`).join('')}`;
  };

  // ---------- lampiran pembatas dosis ----------
  function dcDoc() {
    const c = L.dcCalc(), dc = L.dcRows(), rows = Object.values(dc);
    const L1 = c.rows.map(r => { const ws = L.activeWorkers().filter(w => w.profesi === r.profesi);
      return `<h3 class="mt">${PR.esc(r.profesi)} <span class="muted small">(${ws.length} pekerja)</span></h3>` + U.table([{ h: 'No', v: (w, i) => i + 1 }, { h: 'Nama', v: w => PR.esc(w.nama) }, { h: 'NPR', v: w => `<span class="num">${PR.esc(w.npr || '')}</span>` }].concat(c.years.map(y => ({ h: String(y), r: 1, v: w => (v => v == null ? '—' : PR.f(v))(L.annualFilled(w.id, y)) }))), ws); }).join('');
    return `<div class="doc-sheet">${hdr('LAMPIRAN 1', 'Lembar pengumpulan data dosis')}<h1>Lembar Pengumpulan Data Dosis Pekerja Radiasi</h1><p class="center small">Dosis efektif tahunan Hp(10), mSv · periode ${c.years.length ? c.years[0] + '–' + c.years[c.years.length - 1] : '—'}${c.years.length ? '' : ' (belum ada tahun lengkap)'}</p>${L1 || U.empty('Belum ada data dosis.')}<p class="tiny muted">Triwulan yang tidak tercatat diisi sesuai Pedoman III.10.a (nilai triwulan terdekat yang lebih besar).</p></div>
      <div class="doc-sheet pbreak mt">${hdr('LAMPIRAN 2', 'Lembar pengolahan data')}<h1>Lembar Pengolahan Data Dosis</h1>
        ${U.table([{ h: 'Profesi', v: r => `<b>${PR.esc(r.profesi)}</b>` }].concat(c.years.map(y => ({ h: 'Rerata ' + y, r: 1, v: r => (p => p && p.mean != null ? PR.f(p.mean) : '—')(r.per.find(x => x.y === y)) }))).concat([{ h: 'Rerata', r: 1, v: r => r.rerata != null ? PR.f(r.rerata) : '—' }, { h: 'Maks', r: 1, v: r => r.maks != null ? PR.f(r.maks) : '—' }, { h: 'Q3', r: 1, v: r => r.q3 != null ? PR.f(r.q3) : '—' }]), c.rows)}
        <p class="small">Q3 dihitung dengan interpolasi pada posisi 3(n+1)/4 dari rerata tahunan yang diurutkan. Selisih rerata antar-profesi (marjin): <b>${c.margin != null ? PR.f(c.margin) + ' mSv' : '—'}</b>${c.seragam != null ? ' — ≤ 1 mSv, dapat ditetapkan satu nilai seragam.' : '.'}</p></div>
      <div class="doc-sheet pbreak mt">${hdr('LAMPIRAN 3', 'Lembar penetapan')}<h1>Lembar Penetapan Nilai Pembatas Dosis</h1>
        <div class="kv2"><div><small>Tanggal mulai operasi</small>${PR.d(PR.set.tanggal_mulai_operasi)}</div><div><small>Masa operasi</small>${c.mo.kat || '—'} (${c.mo.tahun ? PR.f(c.mo.tahun, 1) + ' tahun' : '—'})</div><div style="grid-column:1/-1"><small>Metode</small>${PR.esc(L.METODE[c.mo.kat] || '—')}</div></div>
        ${U.table([{ h: 'Profesi', v: r => PR.esc(r.profesi) }, { h: 'Usulan hitung (mSv/thn)', r: 1, v: r => r.usulan != null ? PR.f(r.usulan) : '—' }, { h: 'Aturan', v: r => PR.esc(r.aturan) }, { h: 'Nilai ditetapkan', r: 1, v: r => (d => d ? `<b>${PR.f(PR.n(d.nilai))}</b>` : '—')(dc[r.profesi] || dc['Semua profesi']) }, { h: 'Status', v: r => PR.esc((dc[r.profesi] || dc['Semua profesi'] || {}).status || 'belum') }], c.rows)}</div>
      <div class="pbreak mt">${rows.length ? PR.baDoc(rows) : `<div class="doc-sheet">${U.empty('Berita acara tersedia setelah nilai pembatas dosis diterapkan.')}</div>`}</div>`;
  }

  // ---------- dosis ----------
  const ys5 = () => { const a = []; for (let y = PR.year() - 4; y <= PR.year(); y++) a.push(y); return a; };
  function kartu(id) {
    const w = L.get('Pekerja', id); if (!w) return U.empty('Pekerja tidak ditemukan.');
    const yrs = [...new Set(L.doses(w.id).map(d => +d.tahun))].sort(); const s = L.doseStatus(w), dcv = L.dcValue(w.profesi);
    return `<div class="doc-sheet">${hdr('KARTU DOSIS', 'Rekaman dosis pekerja radiasi')}<h1>Kartu Dosis Pekerja Radiasi</h1>
      <div class="kv2 mt"><div><small>Nama</small>${PR.esc(w.nama)}</div><div><small>NPR</small><span class="mono">${PR.esc(w.npr || '—')}</span></div><div><small>Profesi / kategori</small>${PR.esc(w.profesi || '')} · ${PR.esc(w.kategori || '')}</div><div><small>Pembatas dosis profesi</small>${dcv != null ? PR.f(dcv) + ' mSv/tahun' : '—'}</div></div>
      ${U.table([{ h: 'Tahun', v: y => `<b>${y}</b>` }, ...[1, 2, 3, 4].map(q => ({ h: 'TW' + q, r: 1, v: y => (r => r ? PR.f(PR.n(r.hp10)) : '—')(L.quarters(w.id, y)[q]) })), { h: 'Hp(10) total', r: 1, v: y => `<b>${PR.f(L.annual(w.id, y))}</b>` }, { h: 'Hp(3) lensa', r: 1, v: y => w.kategori === 'intervensional' ? PR.f(L.annualLens(w.id, y)) : '—' }], yrs, { empty: 'Belum ada data dosis.' })}
      <div class="kv2 mt"><div><small>Akumulasi 5 tahun</small><b>${PR.f(L.five(w.id))} mSv</b> / NBD ${L.NBD().pekerja_5tahun}</div><div><small>Status ${PR.year()}</small>${L.doseTag(s.status)}</div></div>
      <p class="small">Satuan mSv. Sumber: hasil evaluasi laboratorium dosimetri. ${L.doses(w.id).filter(d => d.dibaca_pada).length} periode telah dikonfirmasi dibaca oleh pekerja.</p>
      <div class="sigs"><div><span class="small">Pekerja radiasi</span><b>${PR.esc(w.nama)}</b></div><div><span class="small">Petugas Proteksi Radiasi</span><b>${PR.esc(PR.set.ppr_nama || '')}</b></div></div>${foot()}</div>`;
  }
  function rekap(yr) {
    yr = +yr || PR.year(); const ws = L.activeWorkers();
    return `<div class="doc-sheet">${hdr('REKAP DOSIS ' + yr, 'Hp(10), mSv')}<h1>Rekapitulasi Dosis Pekerja Radiasi ${yr}</h1>
      ${U.table([{ h: 'No', v: (w, i) => i + 1 }, { h: 'Nama', v: w => `${PR.esc(w.nama)}<span class="sub">${PR.esc(w.npr || '')}</span>` }, { h: 'Profesi', v: w => PR.esc(w.profesi || '') }, ...[1, 2, 3, 4].map(q => ({ h: 'TW' + q, r: 1, v: w => (r => r ? PR.f(PR.n(r.hp10)) : '—')(L.quarters(w.id, yr)[q]) })), { h: 'Total', r: 1, v: w => `<b>${PR.f(L.annual(w.id, yr))}</b>` }, { h: '5 thn', r: 1, v: w => PR.f(L.five(w.id, yr)) }, { h: 'DC', r: 1, v: w => (d => d != null ? PR.f(d) : '—')(L.dcValue(w.profesi)) }, { h: 'Status', v: w => L.doseTag(L.doseStatus(w, yr).status) }], ws)}
      <p class="small">NBD pekerja: ${L.NBD().pekerja_rata5} mSv/tahun rata-rata 5 tahun, ${L.NBD().pekerja_tahun} mSv dalam 1 tahun, ${L.NBD().pekerja_5tahun} mSv dalam 5 tahun.</p>${foot()}</div>`;
  }
  function mcu() {
    return `<div class="doc-sheet">${hdr('REKAP MCU', 'Kesimpulan kelaikan saja')}<h1>Rekap Pemeriksaan Kesehatan Pekerja Radiasi</h1>
      ${U.table([{ h: 'No', v: (w, i) => i + 1 }, { h: 'Nama', v: w => PR.esc(w.nama) }, { h: 'NPR', v: w => `<span class="num">${PR.esc(w.npr || '')}</span>` }, { h: 'Profesi', v: w => PR.esc(w.profesi || '') }, { h: 'Tanggal MCU', v: w => PR.d((L.lastMcu(w.id) || {}).tanggal) }, { h: 'Berlaku s.d.', v: w => (m => m ? PR.d(m.berlaku_sd) : '—')(L.lastMcu(w.id)) }, { h: 'Kesimpulan', v: w => PR.esc((L.lastMcu(w.id) || {}).kesimpulan || 'belum ada') }, { h: 'Pembatasan kerja', v: w => PR.esc((L.lastMcu(w.id) || {}).pembatasan || '') }], L.activeWorkers())}
      <p class="small">Detail medis (hasil laboratorium, diagnosis) tidak disimpan di ProteRad. Rujukan: dokumen asli di fasilitas pelayanan kesehatan.</p>${foot()}</div>`;
  }

  // ---------- survei ----------
  function survei(yr) {
    const svs = L.tb('Survei').filter(s => !yr || String(s.tanggal).startsWith(yr)).sort((a, b) => String(b.tanggal).localeCompare(a.tanggal));
    return `<div class="doc-sheet">${hdr('LAPORAN SURVEI PAPARAN', yr ? 'Tahun ' + yr : 'Semua survei')}<h1>Laporan Survei Paparan Radiasi Daerah Kerja</h1>
      <p class="small center">Batas RS (ditetapkan fasilitas): daerah pengendalian ≤ ${PR.f(L.batas('pengendalian'))} · supervisi ≤ ${PR.f(L.batas('supervisi'))} · umum ≤ ${PR.f(L.batas('umum'))} µSv/jam. Nilai terkoreksi = (bacaan − background) × FK.</p>
      ${svs.map(s => { const a = L.get('Alat', s.alat_id) || {}, m = L.get('Alat_Ukur', s.alat_ukur_id) || {};
        return `<div class="panel mt" style="box-shadow:none"><div class="panel-h"><h3>${PR.esc(L.alatName(a))} · ${PR.esc(L.ruangName(a.ruangan_id))}</h3><span class="mono small">${PR.d(s.tanggal)}</span></div><div class="panel-b">
          <p class="small" style="margin-top:0">Petugas: ${PR.esc(s.petugas || '')} · Surveimeter ${PR.esc((m.merek || '') + ' ' + (m.tipe || ''))} SN ${PR.esc(m.no_seri || '')} (kalibrasi s.d. ${PR.d(m.kal_sd)}) · FK ${PR.f(PR.n(s.fk), 3)} · ${PR.esc([s.kv && s.kv + ' kV', s.mas && s.mas + ' mAs', s.fantom].filter(Boolean).join(' · '))}${s.catatan ? ' · Catatan: ' + PR.esc(s.catatan) : ''}</p>
          ${U.table([{ h: 'Kode', v: t => `<b class="mono">${PR.esc(t.kode)}</b>` }, { h: 'Lokasi', v: t => PR.esc(t.lokasi) }, { h: 'Area', v: t => PR.esc(t.klasifikasi) }, { h: 'Bacaan', r: 1, v: t => PR.fr(t.mentah) }, { h: 'BG', r: 1, v: t => PR.fr(t.bg || s.bg) }, { h: 'Terkoreksi', r: 1, v: t => `<b>${String(t.terkoreksi).toUpperCase() === 'BG' ? 'BG' : PR.has(t.terkoreksi) ? PR.f(PR.n(t.terkoreksi)) : '—'}</b>` }, { h: 'Batas RS', r: 1, v: t => (b => b ? '≤ ' + PR.f(b) : '—')(L.batas(t.klasifikasi)) }, { h: 'Status', v: t => L.titikTag(L.titikStatus(t).status) }, { h: 'Tindak lanjut', v: t => PR.esc(t.tindak_lanjut || '') }], L.titikOf(s.id).sort((x, y) => x.kode.localeCompare(y.kode, undefined, { numeric: true })))}</div></div>`; }).join('') || U.empty('Belum ada survei.')}${foot()}</div>`;
  }
  function denah(id, yr) {
    const dn = L.get('Denah', id); if (!dn) return U.empty('Denah tidak ditemukan.');
    const pts = L.tb('Titik').filter(t => t.denah_id === id && ((L.get('Survei', t.survei_id) || {}).tanggal || '').startsWith(String(yr || '')));
    let src = []; try { src = JSON.parse(dn.sumber || '[]'); } catch (e) { }
    return `<div class="doc-sheet">${hdr('DENAH SURVEI', PR.esc(dn.nama) + (yr ? ' · ' + yr : ''))}<h1>Denah Titik Ukur Survei Paparan</h1>
      <div class="plan ${dn.file_id ? '' : 'blank'}" id="pplan" style="margin-top:12px">${dn.file_id ? '<img id="pImg" alt="Denah">' : ''}${src.map(s => `<span class="src" style="left:${s.x}%;top:${s.y}%">${PR.trefoil}</span>`).join('')}
        ${pts.map(t => `<span class="pt" style="left:${t.x}%;top:${t.y}%;background:${L.STATUS_COLOR[L.titikStatus(t).status]};animation:none">${PR.esc(t.kode)}</span>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--ok)"></i>Aman</span><span><i style="background:#C9850F"></i>Perlu perhatian</span><span><i style="background:var(--crit)"></i>Melebihi batas RS</span></div>
      ${U.table([{ h: 'Kode', v: t => `<b class="mono">${PR.esc(t.kode)}</b>` }, { h: 'Lokasi', v: t => PR.esc(t.lokasi) }, { h: 'Tanggal', v: t => PR.d((L.get('Survei', t.survei_id) || {}).tanggal) }, { h: 'Area', v: t => PR.esc(t.klasifikasi) }, { h: 'Laju dosis (µSv/jam)', r: 1, v: t => String(t.terkoreksi).toUpperCase() === 'BG' ? 'BG' : PR.has(t.terkoreksi) ? PR.f(PR.n(t.terkoreksi)) : '—' }, { h: 'Batas RS', r: 1, v: t => (b => b ? '≤ ' + PR.f(b) : '—')(L.batas(t.klasifikasi)) }, { h: 'Status', v: t => L.titikTag(L.titikStatus(t).status) }], pts.sort((x, y) => x.kode.localeCompare(y.kode, undefined, { numeric: true })))}${foot()}</div>`;
  }

  // ---------- QR pintu ----------
  function qr(id) {
    const r = L.get('Ruangan', id); if (!r) return U.empty('Ruangan tidak ditemukan.');
    const link = `${PR.appBase()}#/pintu?b=${encodeURIComponent(A.bId())}&r=${encodeURIComponent(id)}`;
    return `<div class="doc-sheet qr-a4"><div class="hazard" style="margin:-32px -36px 24px;height:16px"></div><div style="display:flex;justify-content:center">${PR.logo()}</div>
      <h1 style="font-size:40px;margin:16px 0 4px">${PR.esc(r.nama)}</h1><p class="center" style="margin:0">${PR.esc(L.rs().nama || '')}${r.lantai ? ' · ' + PR.esc(r.lantai) : ''}</p>
      <div class="qrbox" id="qrDoor" style="margin:28px auto;width:320px;height:320px"></div>
      <p class="center" style="font:700 22px var(--fh);text-transform:uppercase;letter-spacing:.04em">Pindai untuk melihat status paparan ruangan</p>
      <p class="center small">Menampilkan status area & tanggal survei terakhir. Tanpa login, tanpa data pribadi.</p><p class="center mono tiny muted" style="word-break:break-all">${PR.esc(link)}</p>
      <div class="hazard" style="margin:24px -36px -32px;height:16px"></div></div>`;
  }

  PR.page('cetak', {
    full: true, title: 'Cetak', roles: ['ppr', 'peninjau'],
    render: r => {
      const k = r.parts[0], id = r.parts[1];
      const back = { paket: '#/inspeksi', dc: PR.me.role === 'peninjau' ? '#/persetujuan' : '#/dc', kartu: '#/dosis/p/' + id, rekap: '#/dosis', mcu: '#/dosis/mcu', survei: '#/survei', denah: '#/survei/denah', qr: '#/survei' }[k] || '#/dasbor';
      let body = '';
      if (k === 'paket') body = PR.paketHTML(L.readiness(r.q.d || PR.today()));
      else if (k === 'dc') body = dcDoc();
      else if (k === 'kartu') body = kartu(id);
      else if (k === 'rekap') body = rekap(r.q.y);
      else if (k === 'mcu') body = mcu();
      else if (k === 'survei') body = survei(r.q.y);
      else if (k === 'denah') body = denah(id, r.q.y);
      else if (k === 'qr') body = qr(id);
      else body = U.empty('Tampilan cetak tidak dikenal.');
      const csv = k === 'survei' ? `<button class="btn" data-act="csvSurvei">${PR.ic('download')}CSV</button>` : k === 'rekap' ? `<button class="btn" data-act="csvRekap" data-y="${PR.esc(r.q.y || PR.year())}">${PR.ic('download')}CSV</button>` : '';
      return `<div class="print-wrap">${bar(back).replace('<button class="btn btn-y"', csv + '<button class="btn btn-y"')}${body}</div>`;
    },
    mount: async (root, r) => {
      const k = r.parts[0];
      if (k === 'qr') { const el = PR.$('#qrDoor', root); if (el) { try { await PR.qr(`${PR.appBase()}#/pintu?b=${encodeURIComponent(A.bId())}&r=${encodeURIComponent(r.parts[1])}`, el); } catch (e) { el.textContent = 'QR gagal dibuat (periksa koneksi).'; } } }
      if (k === 'denah') { const dn = L.get('Denah', r.parts[1]), img = PR.$('#pImg', root); if (img && dn && dn.file_id) { try { img.src = (await A.file(dn.file_id)).url; } catch (e) { } } }
    }
  });
  PR.acts.csvSurvei = () => PR.download('survei-paparan.csv', new Blob([PR.toCSV(L.tb('Titik').map(t => { const s = L.get('Survei', t.survei_id) || {}, a = L.get('Alat', s.alat_id) || {}; return Object.assign({ tanggal: s.tanggal, alat: L.alatName(a), ruangan: L.ruangName(a.ruangan_id), batas_rs: L.batas(t.klasifikasi) }, t); }), ['tanggal', 'alat', 'ruangan', 'kode', 'lokasi', 'posisi', 'klasifikasi', 'mentah', 'bg', 'terkoreksi', 'batas_rs', 'tindak_lanjut'])], { type: 'text/csv' }));
  PR.acts.csvRekap = el => { const y = +el.dataset.y; PR.download('rekap-dosis-' + y + '.csv', new Blob([PR.toCSV(L.activeWorkers().map(w => { const q = L.quarters(w.id, y); return { nama: w.nama, npr: w.npr, profesi: w.profesi, tw1: q[1] ? q[1].hp10 : '', tw2: q[2] ? q[2].hp10 : '', tw3: q[3] ? q[3].hp10 : '', tw4: q[4] ? q[4].hp10 : '', total: L.annual(w.id, y), lima_tahun: L.five(w.id, y) }; }), ['nama', 'npr', 'profesi', 'tw1', 'tw2', 'tw3', 'tw4', 'total', 'lima_tahun'])], { type: 'text/csv' })); };
})(window.PR);
