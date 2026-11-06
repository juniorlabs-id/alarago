/* AlaraGo — W-19..W-22 Portal pekerja (mobile-first) */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const me = () => L.tb('Pekerja')[0] || {};
  const shell = (tab, inner) => `<div class="ptop">${PR.logo()}<div class="grow"><b style="font:700 16px var(--fh)">AlaraGo</b> <span class="tag t-y">Portal pekerja</span></div>${PR.api.isDemo() ? `<button class="btn btn-s btn-y" data-act="demoRole" data-r="ppr">Kembali ke PPR</button>` : ''}<span class="avatar">${PR.esc(PR.initials(me().nama))}</span></div>
    <div class="portal">${inner}</div>
    <nav class="bnav" style="display:flex">${[['', 'Dosis', 'id-card'], ['survei', 'Survei', 'radar'], ['sop', 'SOP', 'book-open'], ['profil', 'Profil', 'user']].map(([k, l, i]) => `<a href="#/saya${k ? '/' + k : ''}" class="${tab === k ? 'on' : ''}">${PR.ic(i)}${l}${k === 'sop' && unread().length ? `<span class="bdg">${unread().length}</span>` : ''}</a>`).join('')}</nav>`;
  const sops = () => L.tb('Dokumen').filter(d => d.kategori === 'SOP');
  const isRead = s => L.tb('Baca_SOP').some(b => b.dokumen_id === s.id && String(b.revisi) === String(s.revisi));
  const unread = () => sops().filter(s => !isRead(s));
  const saveLocal = () => { try { const k = 'pr_' + (A.bId() || 'x').slice(-10) + '_cache'; const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c) { c.tables = PR.db; localStorage.setItem(k, JSON.stringify(c)); } } catch (e) { } };

  function dosis() {
    const w = me(), yr = PR.year(), s = L.doseStatus(w, yr), lp = L.tb('Dosis').slice().sort((a, b) => (b.tahun + b.periode).localeCompare(a.tahun + a.periode))[0];
    const dc = s.dc, ref = dc || L.NBD().pekerja_rata5;
    const q = [1, 2, 3, 4].map(i => ({ l: 'TW' + i, v: s.q[i] ? PR.n(s.q[i].hp10) : null, c: lp && +lp.tahun === yr && lp.periode === 'TW' + i ? '#F0B33E' : '#CFCDC6', hl: lp && +lp.tahun === yr && lp.periode === 'TW' + i }));
    const inv = L.tb('Investigasi').find(x => +x.tahun === yr);
    return `<div class="card"><div class="spread"><div><b style="font-size:17px">${PR.esc(w.nama)}</b><div class="small muted">${PR.esc(w.profesi)}</div></div><span class="tag">Aktif</span></div><div class="row mt8 small mono"><span>NPR ${PR.esc(w.npr || '—')}</span></div></div>
      <div class="card"><div class="spread"><span class="eyebrow">Status dosis tahunan ${yr}</span>${L.doseTag(s.status)}</div>
        <div class="statement mt8">Anda menerima ${PR.pct(s.sum / ref)} dari ${dc ? 'pembatas dosis' : 'nilai batas dosis'} tahunan</div>
        <p class="small muted" style="margin:6px 0 12px">${s.status === 'aman' ? 'Dosis Anda tahun ini jauh di bawah batas.' : s.status === 'tinjau' ? 'Mendekati pembatas dosis — PPR akan meninjau penugasan bila perlu.' : 'Di atas pembatas dosis — PPR sedang menganalisis penyebabnya. Ini bukan pelanggaran.'}</p>
        <div class="spread tiny mono muted"><span>0 mSv</span>${dc ? `<span>DC ${PR.f(dc)} mSv</span>` : ''}<span>NBD ${L.NBD().pekerja_rata5} mSv</span></div>
        <div class="bar mt8" style="height:10px"><i style="width:${Math.min(100, s.sum / L.NBD().pekerja_rata5 * 100)}%"></i>${dc ? `<span style="position:absolute;left:${dc / L.NBD().pekerja_rata5 * 100}%;top:-4px;bottom:-4px;width:2px;background:var(--y-h)"></span>` : ''}</div>
        <p class="small mono" style="margin:8px 0 0">Total ${yr}: <b>${PR.f(s.sum)} mSv</b>${w.kategori === 'intervensional' ? ` · Lensa Hp(3): <b>${PR.f(s.lens)} mSv</b>` : ''}</p></div>
      <div class="card"><div class="spread"><span class="eyebrow">Dosis per triwulan Hp(10)</span><span class="tag">mSv</span></div>${L.barChart(q, { h: 180, w: 420, lines: [{ v: ref / 4, c: '#2A2A2E', label: 'DC/TW ' + PR.f(ref / 4) }], label: 'Dosis per triwulan' })}</div>
      ${inv ? `<div class="card" style="background:var(--sub)"><div class="eyebrow">${PR.ic('info', 'ic-s')} Catatan investigasi</div><p class="small" style="margin:6px 0 0">${PR.esc(inv.rencana || inv.akar_penyebab || 'Sedang dianalisis PPR.')}</p></div>` : ''}
      <div class="card"><div class="spread"><span class="eyebrow">Akumulasi 5 tahun (${yr - 4}–${yr})</span></div><div style="font:700 30px var(--fm);margin-top:6px">${PR.f(s.five)} <span style="font-size:14px">mSv</span></div><div class="bar mt8"><i style="width:${Math.min(100, s.five / L.NBD().pekerja_5tahun * 100)}%"></i></div><div class="spread tiny mono mt8"><span>${PR.pct(s.five / L.NBD().pekerja_5tahun)} dari ${L.NBD().pekerja_5tahun} mSv</span><span>rata-rata ${PR.f(s.five / 5)} mSv/thn</span></div></div>
      ${lp ? `<div class="card"><div class="eyebrow">Konfirmasi hasil ${lp.periode} ${lp.tahun}</div><p class="small" style="margin:6px 0 12px">Tandai bahwa Anda sudah melihat hasil dosis periode ini. Hp(10): <b class="mono">${PR.f(PR.n(lp.hp10))} mSv</b></p>
        ${lp.dibaca_pada ? `<div class="tag t-aman" style="width:100%;justify-content:center;padding:10px">${PR.ic('circle-check')} Dibaca ${PR.dt(lp.dibaca_pada)}</div>` : `<button class="btn btn-d btn-b" style="height:48px" data-act="pConfirm" data-id="${lp.id}">${PR.ic('check')}Sudah saya baca</button>`}</div>` : `<div class="card">${U.empty('Hasil dosis belum tersedia. Anda akan mendapat email saat hasil masuk.')}</div>`}
      <div class="grid g2" style="gap:10px">${lp ? `<button class="btn" style="height:48px" data-act="pNote" data-id="${lp.id}">${PR.ic('pencil')}Beri keterangan</button>` : ''}<a class="btn" style="height:48px" href="#/saya/kartu">${PR.ic('download')}Riwayat PDF</a></div>`;
  }
  function survei() {
    const rooms = L.tb('Ruangan').map(r => { const sv = L.tb('Survei').filter(s => s.ruangan_id === r.id).sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0]; const pts = sv ? L.titikOf(sv.id) : []; const mx = pts.reduce((m, t) => Math.max(m, PR.n(t.terkoreksi)), 0); const ulang = L.tb('Alat').filter(a => a.ruangan_id === r.id).some(a => L.needResurvey(a)); return { r, sv, mx, st: ulang ? 'ulang' : sv ? L.surveiStatus(sv) : 'kosong' }; });
    const m = L.tb('Alat_Ukur').find(x => L.meterOk(x));
    return `<div class="card"><h2>Survei paparan & keselamatan ruangan</h2><p class="small muted" style="margin:6px 0 0">Transparansi laju dosis seluruh ruangan untuk pekerja radiasi.</p></div>
      ${rooms.map(x => `<div class="card"><div class="spread"><div><b>${PR.esc(x.r.nama)}</b><div class="small muted">${PR.esc(x.r.lantai || '')} · ${PR.esc(x.r.klasifikasi || '')}</div></div>${x.st === 'ulang' ? PR.tag('survei ulang diperlukan', 'tinjau') : L.titikTag(x.st)}</div>
        <div class="kv2 mt8"><div><small>Survei terakhir</small>${x.sv ? PR.d(x.sv.tanggal) : '—'}</div><div><small>Laju tertinggi</small><span class="num">${x.sv ? PR.f(x.mx) + ' µSv/jam' : '—'}</span></div></div></div>`).join('') || `<div class="card">${U.empty('Belum ada data ruangan.')}</div>`}
      <p class="small muted">Batas mengikuti pengaturan RS.${m ? ` Surveimeter: ${PR.esc(m.merek + ' ' + m.tipe)}, kalibrasi berlaku s.d. ${PR.d(m.kal_sd)}.` : ''}</p>`;
  }
  function sop(id) {
    const list = sops().slice().sort((a, b) => isRead(a) - isRead(b));
    if (id) { const s = L.get('Dokumen', id); if (!s) return U.empty('SOP tidak ditemukan.');
      return `<a href="#/saya/sop" class="small">${PR.ic('arrow-left', 'ic-s')} Semua SOP</a><div class="card mt8"><div class="spread"><span class="mono">${PR.esc(s.nomor)}</span><span class="tag">REV ${PR.esc(s.revisi)}</span></div><h2 style="margin-top:6px">${PR.esc(s.judul)}</h2><p class="small muted">Berlaku sejak ${PR.d(s.tanggal_berlaku)}</p>
        ${s.ringkasan ? `<div class="eyebrow mt">Ringkasan</div><p class="small" style="margin:6px 0 0">${PR.esc(s.ringkasan)}</p>` : ''}
        <button class="btn btn-b mt" style="height:48px" data-act="openFile" data-id="${s.file_id}">${PR.ic('file-text')}Buka dokumen SOP</button>
        ${isRead(s) ? `<div class="tag t-aman mt" style="width:100%;justify-content:center;padding:10px">${PR.ic('circle-check')} Sudah dibaca</div>` : `<button class="btn btn-d btn-b mt" style="height:48px" data-act="pSop" data-id="${s.id}">${PR.ic('check')}Saya sudah membaca SOP ini</button>`}</div>`; }
    return `<div class="card"><h2>SOP terkendali</h2><p class="small muted" style="margin:6px 0 0">Baca SOP versi terbaru lalu konfirmasi.</p></div>${list.map(s => `<a class="card" href="#/saya/sop/${s.id}" style="display:block;text-decoration:none"><div class="spread"><span class="mono small">${PR.esc(s.nomor)}</span><span class="tag">REV ${PR.esc(s.revisi)}</span></div><b style="display:block;margin:6px 0">${PR.esc(s.judul)}</b><div class="spread small"><span class="muted">Berlaku sejak ${PR.d(s.tanggal_berlaku)}</span>${isRead(s) ? PR.tag('sudah dibaca', 'aman') : PR.tag('belum dibaca', 'tinjau')}</div></a>`).join('') || `<div class="card">${U.empty('Belum ada SOP.')}</div>`}`;
  }
  function profil() {
    const w = me(), m = L.tb('MCU').slice().sort((a, b) => String(b.tanggal).localeCompare(a.tanggal))[0];
    return `<div class="card"><span class="avatar" style="width:52px;height:52px;font-size:20px">${PR.esc(PR.initials(w.nama))}</span><h2 class="mt8">${PR.esc(w.nama)}</h2><p class="small muted" style="margin:4px 0 0">${PR.esc(w.profesi)} · ${PR.esc((L.rs() || {}).nama || '')}</p></div>
      <div class="card"><dl class="kv"><dt>NPR</dt><dd class="mono">${PR.esc(w.npr || '—')}</dd><dt>Email</dt><dd class="small">${PR.esc(w.email || '—')}</dd><dt>No. HP</dt><dd class="mono">${PR.esc(w.no_hp || '—')}</dd><dt>Metode masuk</dt><dd>${PR.esc(w.metode || '—')}</dd><dt>Pelatihan terakhir</dt><dd>${PR.d(w.pelatihan_terakhir)}</dd></dl></div>
      <div class="card"><div class="eyebrow">Pemeriksaan kesehatan (MCU)</div>${m ? `<div class="row mt8">${PR.tag(m.kesimpulan, m.kesimpulan === 'Laik kerja' ? 'aman' : 'tinjau', 1)}<span class="small">berlaku s.d. <b>${PR.d(m.berlaku_sd)}</b> ${PR.dueTag(PR.left(m.berlaku_sd))}</span></div>${m.pembatasan ? `<p class="small" style="background:var(--sub);padding:8px;margin:8px 0 0">${PR.esc(m.pembatasan)}</p>` : ''}` : '<p class="small muted">Belum ada data MCU.</p>'}</div>
      <div class="stack" style="gap:10px">${w.metode === 'QR + PIN' ? `<button class="btn btn-b" style="height:48px" data-act="pPin">${PR.ic('key-round')}Ganti PIN</button>` : ''}${PR.installEvt ? `<button class="btn btn-b" style="height:48px" data-act="install">${PR.ic('monitor-smartphone')}Pasang aplikasi</button>` : ''}<button class="btn btn-b" style="height:48px" data-act="logout">${PR.ic('log-out')}Keluar</button></div>
      <p class="small muted mt" style="text-align:center">Data Anda hanya dapat dilihat oleh Anda dan PPR.</p>`;
  }
  function kartu() {
    const w = me(), ys = []; for (let y = PR.year() - 4; y <= PR.year(); y++) ys.push(y);
    return `<div class="no-print row mb"><a class="btn" href="#/saya">${PR.ic('arrow-left')}Kembali</a><button class="btn btn-y" data-act="print">${PR.ic('printer')}Cetak / simpan PDF</button></div>
      <div class="doc-sheet" style="padding:20px"><h1 style="font-size:18px">Kartu dosis pekerja radiasi</h1><p class="center small">${PR.esc((L.rs() || {}).nama || '')}</p>
      <div class="kv2 mt"><div><small>Nama</small>${PR.esc(w.nama)}</div><div><small>NPR</small>${PR.esc(w.npr)}</div><div><small>Profesi</small>${PR.esc(w.profesi)}</div><div><small>Dicetak</small>${PR.d(PR.today())}</div></div>
      ${U.table([{ h: 'Tahun', v: y => y }, ...[1, 2, 3, 4].map(q => ({ h: 'TW' + q, r: 1, v: y => (r => r ? PR.f(PR.n(r.hp10)) : '—')(L.quarters(w.id, y)[q]) })), { h: 'Total', r: 1, v: y => `<b>${PR.f(L.annual(w.id, y))}</b>` }], ys)}
      <p class="small">Satuan mSv, Hp(10). Akumulasi 5 tahun: <b>${PR.f(L.five(w.id))} mSv</b>.</p></div>`;
  }

  PR.acts.pConfirm = async el => { el.disabled = true; try { const d = await A.call('confirmDose', { id: el.dataset.id }); const r = L.get('Dosis', el.dataset.id); if (r) r.dibaca_pada = d.dibaca_pada; saveLocal(); PR.toast('Terima kasih — konfirmasi tercatat', 'ok'); PR.render(); } catch (e) { PR.toast(e.message, 'err'); el.disabled = false; } };
  PR.acts.pNote = async el => { const d = L.get('Dosis', el.dataset.id); const v = await PR.form({ title: 'Keterangan untuk PPR', intro: 'Misalnya: dosimeter tertinggal di ruang pemeriksaan, beban tindakan meningkat, atau apron rusak.', fields: [{ k: 'keterangan', label: 'Keterangan', type: 'textarea', req: 1 }], ok: 'Kirim' }, d); if (!v) return; try { await A.call('doseNote', { id: d.id, text: v.keterangan }); d.keterangan = v.keterangan; saveLocal(); PR.toast('Keterangan terkirim ke PPR', 'ok'); } catch (e) { PR.toast(e.message, 'err'); } };
  PR.acts.pSop = async el => { el.disabled = true; try { const row = await A.call('readSop', { id: el.dataset.id }); PR.db.Baca_SOP = (PR.db.Baca_SOP || []).concat([row]); saveLocal(); PR.toast('Konfirmasi baca SOP tercatat', 'ok'); PR.render(); } catch (e) { PR.toast(e.message, 'err'); el.disabled = false; } };
  PR.acts.pPin = async () => { const v = await PR.form({ title: 'Ganti PIN', fields: [{ k: 'old', label: 'PIN lama', type: 'password', req: 1 }, { k: 'pin', label: 'PIN baru (6 digit)', type: 'password', req: 1, valid: v => /^\d{6}$/.test(v) ? '' : 'Harus 6 digit angka' }] }, {}); if (!v) return; try { await A.call('changePin', v); PR.toast('PIN diganti', 'ok'); } catch (e) { PR.toast(e.message, 'err'); } };

  PR.page('saya', {
    full: true, title: 'Portal pekerja', roles: ['pekerja'],
    render: r => { const t = r.parts[0] || ''; if (t === 'kartu') return `<div class="portal" style="max-width:820px">${kartu()}</div>`; return shell(t, t === 'survei' ? survei() : t === 'sop' ? sop(r.parts[1]) : t === 'profil' ? profil() : dosis()); }
  });
})(window.PR);
