/* AlaraGo — Pembatas Dosis (Pedoman Teknis Penetapan Pembatas Dosis Tahap Operasional, BAPETEN Rev.1 2021) */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const st = { prof: null };
  L.dcRows = () => { const by = {}; L.tb('Pembatas_Dosis').forEach(d => { if (!by[d.profesi] || String(d.dibuat) > String(by[d.profesi].dibuat)) by[d.profesi] = d; }); return by; };
  const statusTag = d => !d ? PR.tag('belum', 'dash', 1) : d.status === 'disetujui' ? PR.tag('disetujui', 'aman') : d.status === 'menunggu' ? PR.tag('menunggu persetujuan', 'tinjau') : d.status === 'revisi' ? PR.tag('diminta revisi', 'analisis') : PR.tag('draf', 'netral', 1);

  function saveDC(profesi, nilai, calc, extra) {
    const cur = L.dcRows()[profesi]; const now = new Date().toISOString();
    const base = { profesi, nilai: String(nilai), metode: extra && extra.metode || '', masa_operasi: String(calc.mo.kat || ''), periode: calc.years.length ? calc.years[0] + '–' + calc.years[calc.years.length - 1] : '', berlaku_sd: (cur && cur.berlaku_sd) || String(PR.year() + 5), status: 'draf', dibuat: now };
    if (cur && cur.status !== 'disetujui') A.save('Pembatas_Dosis', Object.assign({}, cur, base, { dibuat: cur.dibuat || now }));
    else A.save('Pembatas_Dosis', base);
  }
  PR.acts.dcApplyAll = () => { const c = L.dcCalc(); const uni = PR.set.dc_metode_seragam === 'seragam';
    if (uni && c.seragam != null) saveDC('Semua profesi', c.seragam, c, { metode: 'Seragam (marjin ≤ 1 mSv) dari ' + c.seragamDari });
    else c.rows.forEach(r => r.usulan != null && saveDC(r.profesi, r.usulan, c, { metode: r.aturan }));
    PR.toast('Usulan diterapkan sebagai draf. Ajukan persetujuan peninjau.', 'ok'); PR.render(); };
  PR.acts.dcMode = el => { A.setting('dc_metode_seragam', el.dataset.m); PR.render(); };
  PR.acts.dcSubmit = async () => {
    const rows = Object.values(L.dcRows()).filter(d => d.status === 'draf' || d.status === 'revisi');
    if (!rows.length) return PR.toast('Tidak ada draf. Terapkan atau ubah nilai DC lebih dulu.', 'warn');
    if (!(await PR.confirm(`Ajukan ${rows.length} nilai pembatas dosis ke peninjau (penanggung jawab) untuk disetujui?`, 'Ajukan'))) return;
    rows.forEach(d => A.save('Pembatas_Dosis', Object.assign({}, d, { status: 'menunggu' }))); PR.toast('Diajukan — menunggu persetujuan peninjau', 'ok'); PR.render();
  };
  PR.acts.dcBerlaku = async () => { const cur = Object.values(L.dcRows()); const v = await PR.form({ title: 'Masa berlaku pembatas dosis', fields: [{ k: 'th', label: 'Berlaku hingga tahun', type: 'number', req: 1, help: 'Pedoman: kaji ulang minimal 1× selama masa berlaku izin (5 tahun)' }] }, { th: (cur[0] || {}).berlaku_sd || PR.year() + 5 }); if (!v) return; cur.forEach(d => A.save('Pembatas_Dosis', Object.assign({}, d, { berlaku_sd: String(v.th) }))); PR.render(); };
  PR.acts.dcDraft = () => {
    const c = L.dcCalc(), dc = L.dcRows(), rs = L.rs();
    const lines = Object.values(dc).map(d => `- ${d.profesi}: ${PR.f(PR.n(d.nilai))} mSv/tahun (${d.metode || '-'})`).join('\n');
    const txt = `IV.1 PENETAPAN PEMBATAS DOSIS\n\na) Urgensi\nPembatas dosis ditetapkan sebagai alat optimisasi proteksi radiasi paparan kerja di ${rs.instalasi || 'instalasi'} ${rs.nama || ''}, dengan nilai tidak melampaui Nilai Batas Dosis (NBD) pekerja radiasi.\n\nb) Metode\nFasilitas berada pada masa operasi ${c.mo.kat || '-'} (${c.mo.tahun ? c.mo.tahun.toFixed(1).replace('.', ',') + ' tahun' : '-'} sejak modalitas pertama beroperasi). Sesuai Pedoman Teknis Penetapan Pembatas Dosis Tahap Operasional (BAPETEN, Rev. 1, 2021), metode yang digunakan: ${L.METODE[c.mo.kat] || '-'}. Data dosis yang digunakan: dosis tahunan Hp(10) dari TLD, dikelompokkan per profesi, periode ${c.years[0] || '-'}–${c.years[c.years.length - 1] || '-'}. Kuartil ke-3 dihitung pada posisi 3(n+1)/4 dengan interpolasi linier. Profesi dengan seluruh data < 1 mSv ditetapkan 1 mSv. Marjin dosis rerata antar profesi: ${c.margin != null ? PR.f(c.margin) + ' mSv' : '-'}.\n\nc) Nilai pembatas dosis yang diusulkan dan periode kaji ulang\n${lines || '-'}\nBerlaku hingga ${(Object.values(dc)[0] || {}).berlaku_sd || '-'}; kaji ulang minimal 1× selama masa berlaku izin, dengan pemantauan dosis tahunan terhadap pembatas dosis setiap tahun.\n\nd) Data dukung terlampir\ni. Lembar kerja pengumpulan data dosis pekerja (Lampiran 1)\nii. Lembar kerja pengolahan data dosis pekerja (Lampiran 2)\niii. Berita acara penetapan pembatas dosis (Lampiran 4)\niv. Hasil kaji ulang pembatas dosis (Lampiran 3), apabila telah dilakukan`;
    PR.modal({ title: 'Draf PPKR subbab IV.1', wide: true, body: `<textarea class="inp mono" style="min-height:360px;font-size:12px" id="dcTxt">${PR.esc(txt)}</textarea>`, foot: `<button class="btn" data-x>Tutup</button><button class="btn btn-y" data-c>${PR.ic('link')}Salin teks</button>`, onMount: m => m.querySelector('[data-c]').onclick = () => PR.copy(PR.$('#dcTxt', m).value) });
  };
  PR.acts.tldChk = el => { A.setting(el.dataset.k, el.checked ? PR.today() : ''); };

  PR.page('dc', {
    title: 'Pembatas Dosis', roles: ['ppr', 'peninjau'],
    crumb: () => 'Pembatas dosis / <b>Penetapan & kaji ulang tahap operasional</b>',
    render: () => {
      const c = L.dcCalc(), dc = L.dcRows(), uni = PR.set.dc_metode_seragam === 'seragam';
      const prof = st.prof && c.rows.find(r => r.profesi === st.prof) ? st.prof : (c.rows[0] || {}).profesi;
      const pr = c.rows.find(r => r.profesi === prof);
      const dcOf = p => uni && dc['Semua profesi'] ? dc['Semua profesi'] : dc[p];
      const berlaku = (Object.values(dc)[0] || {}).berlaku_sd;
      const inv = L.tb('Investigasi').sort((a, b) => String(b.tahun).localeCompare(a.tahun));
      const overNoInv = L.activeWorkers().filter(w => { const s = L.doseStatus(w); return (s.status === 'analisis' || s.status === 'kritis') && !inv.some(x => x.pekerja_id === w.id && +x.tahun === PR.year()); });
      const waiting = Object.values(dc).filter(d => d.status === 'menunggu').length;
      return `${U.head('Pembatas dosis (Dose constraint)', 'Penetapan nilai pembatas dosis per profesi sesuai Pedoman Teknis BAPETEN (Rev. 1, 2021), dihitung otomatis dari data TLD, dan evaluasi tren dosis.',
        `<a class="btn" href="#/cetak/dc">${PR.ic('file-text')}Lampiran 1–4 (PDF)</a><button class="btn" data-act="dcDraft">${PR.ic('file-check')}Draf PPKR IV.1</button>${U.btn('Ajukan persetujuan', 'dcSubmit', 'send', 'btn-y')}${waiting ? PR.tag('menunggu persetujuan', 'tinjau') : ''}`)}
        ${!PR.set.tanggal_mulai_operasi ? `<div class="ban ban-warn">${PR.ic('triangle-alert')}<div class="grow"><b>Tanggal mulai operasi belum diisi</b><p>Diperlukan untuk menentukan masa operasi & metode.</p></div><a class="btn btn-s" href="#/pengaturan/regulasi">Isi sekarang</a></div>` : ''}
        <div class="panel mb"><div class="panel-b row" style="gap:10px 28px">
          <span class="mono small">Masa operasi: <b>${c.mo.kat || '—'}</b> (${c.mo.tahun ? PR.f(c.mo.tahun, 1) + ' tahun' : '—'}) ${PR.tag(c.mo.kat === 3 ? 'operasional lanjut' : c.mo.kat === 2 ? 'operasional' : 'awal', 'aman', 1)}</span>
          <span class="mono small">Metode: <b>${L.METODE[c.mo.kat] || '—'}</b>${c.mo.kat === 3 ? ' · POSISI 3(n+1)/4' : ''}</span>
          <span class="mono small">Periode data: <b>${c.years.length ? c.years[0] + '–' + c.years[c.years.length - 1] : '—'}</b></span>
          <span class="mono small">Berlaku s.d.: <b>${PR.esc(berlaku || '—')}</b> ${PR.can('edit') && berlaku ? '<button class="link small" data-act="dcBerlaku">ubah</button>' : ''}</span>
          ${PR.can('edit') ? '<a class="small" href="#/pengaturan/regulasi">Ubah tanggal mulai operasi ↗</a>' : ''}</div></div>
        ${c.margin != null ? `<div class="ban ban-info">${PR.ic('scan-search')}<div class="grow"><b style="font-size:14px">Marjin rerata antar profesi: <span class="mono">${PR.f(c.margin)} mSv</span></b><p>${c.margin <= 1 ? `≤ 1 mSv → menurut pedoman (III.12) pembatas dosis dapat ditetapkan <b>seragam</b> dari profesi dengan rerata tertinggi (${PR.esc(c.seragamDari)}: ${PR.f(c.seragam)} mSv). Boleh tetap per profesi.` : '> 1 mSv → pembatas dosis ditetapkan per profesi.'}</p></div>
          ${c.margin <= 1 && PR.can('edit') ? `<span class="seg"><button class="${!uni ? 'on' : ''}" data-act="dcMode" data-m="per_profesi">DC per profesi</button><button class="${uni ? 'on' : ''}" data-act="dcMode" data-m="seragam">DC seragam (${PR.f(c.seragam)})</button></span>` : ''}</div>` : ''}
        <div class="panel"><div class="panel-h"><h3>${PR.ic('list')} Pengolahan dosis & penetapan DC per profesi</h3><div class="row">${U.btn('Terapkan semua usulan', 'dcApplyAll', 'check', 'btn-s')}<span class="mono tiny muted">Satuan mSv/Tahun · rerata profesi per tahun</span></div></div>
          ${U.table([
            { h: 'Profesi', v: r => `<b>${PR.esc(r.profesi)}</b><span class="sub">${r.n} pekerja</span>` },
            ...c.years.map(y => ({ h: String(y), r: 1, v: r => { const p = r.per.find(x => x.y === y); return p && p.mean != null ? PR.f(p.mean) : '—'; } })),
            { h: 'Rerata', r: 1, v: r => PR.f(r.rerata) }, { h: 'Maks', r: 1, v: r => PR.f(r.maks) }, { h: 'Q3', r: 1, v: r => `<b>${PR.f(r.q3)}</b>` },
            { h: 'Usulan', r: 1, v: r => PR.f(r.usulan) },
            { h: 'DC ditetapkan', v: r => { const d = dcOf(r.profesi); return PR.can('edit') && !uni ? `<input class="inp mono" style="width:90px;height:32px" value="${d ? PR.esc(d.nilai) : ''}" placeholder="${PR.f(r.usulan)}" data-dcset="${PR.esc(r.profesi)}" inputmode="decimal">` : `<b class="num">${d ? PR.f(PR.n(d.nilai)) : '—'}</b>`; } },
            { h: 'Status', v: r => statusTag(dcOf(r.profesi)) },
            { h: 'Catatan', v: r => `<span class="tag ${/Q3/.test(r.aturan) ? 't-aman' : 't-tinjau'}" style="white-space:normal">${PR.esc(r.aturan)}</span>` }
          ], c.rows, { empty: 'Belum ada data dosis. Impor hasil TLD terlebih dahulu.', foot: `<span>Data triwulan kosong diisi nilai triwulan sebelum/sesudah yang lebih tinggi (III.10.a). Dekomisioning & kondisi abnormal tidak dihitung.</span>` })}
          ${uni && dc['Semua profesi'] ? `<div class="panel-b" style="border-top:1px solid var(--line)"><b>DC seragam semua profesi: <span class="mono">${PR.f(PR.n(dc['Semua profesi'].nilai))} mSv/tahun</span></b> ${statusTag(dc['Semua profesi'])}</div>` : ''}
          ${Object.values(dc).some(d => d.status === 'revisi' && d.catatan_peninjau) ? `<div class="ban ban-warn" style="margin:12px">${PR.ic('message-circle')}<div class="grow"><b>Catatan peninjau</b><p>${Object.values(dc).filter(d => d.catatan_peninjau).map(d => PR.esc(d.profesi + ': ' + d.catatan_peninjau)).join('<br>')}</p></div></div>` : ''}
        </div>
        <div class="grid g-8-4 mt">
          <div class="panel"><div class="panel-h"><h3>${PR.ic('gauge')} Control chart dosis tahunan terhadap DC & NBD</h3><select class="inp" style="width:auto" id="dcProf">${c.rows.map(r => `<option ${r.profesi === prof ? 'selected' : ''}>${PR.esc(r.profesi)}</option>`).join('')}</select></div>
            <div class="panel-b">${pr ? L.lineChart(pr.per.map(p => ({ l: String(p.y), v: p.mean, c: dcOf(prof) && p.mean > PR.n(dcOf(prof).nilai) ? '#BD5427' : '#2A2A2E' })).concat(PR.year() > (c.years[c.years.length - 1] || 0) ? [{ l: PR.year() + ' (berjalan)', v: (v => v.length ? PR.sum(v) / v.length : null)(L.activeWorkers().filter(w => w.profesi === prof).map(w => L.annual(w.id, PR.year()))), c: '#F0B33E' }] : []),
              { lines: [dcOf(prof) ? { v: PR.n(dcOf(prof).nilai), c: '#E3A12A', w: 2, label: 'DC ' + PR.f(PR.n(dcOf(prof).nilai)) } : null, { v: L.NBD().pekerja_rata5, c: '#C23B3B', dash: 1, label: 'NBD ' + L.NBD().pekerja_rata5 }].filter(Boolean), h: 220, label: 'Control chart ' + prof }) : U.empty('Belum ada data.')}
              <p class="small muted" style="margin:6px 0 0">Rerata dosis tahunan profesi. Dosis di atas DC bukan pelanggaran — perlu analisis akar penyebab (Pedoman Bab V).</p></div></div>
          <div class="stack">
            <div class="panel"><div class="panel-h"><h3>${PR.ic('file-check')} Lampiran & persetujuan</h3></div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">
              ${[['Lampiran 1', 'Pengumpulan data dosis per profesi', c.rows.length ? 'siap' : 'draf'], ['Lampiran 2', 'Pengolahan data: rerata, maks, Q3, marjin', c.rows.length ? 'siap' : 'draf'], ['Lampiran 3', 'Formulir kaji ulang', Object.keys(dc).length ? 'siap' : 'draf'], ['Lampiran 4', 'Berita acara penetapan', Object.values(dc).every(d => d.status === 'disetujui') && Object.keys(dc).length ? 'disetujui' : Object.values(dc).some(d => d.status === 'menunggu') ? 'menunggu TTD' : 'draf']].map(([k, d, s]) => `<a class="list-row" href="#/cetak/dc" style="text-decoration:none">${PR.ic('file-text')}<div class="grow"><b>${k}</b><span>${d}</span></div>${PR.tag(s, s === 'siap' || s === 'disetujui' ? 'aman' : s === 'draf' ? 'netral' : 'tinjau', 1)}</a>`).join('')}</div></div>
            <div class="panel"><div class="panel-h"><h3>${PR.ic('clipboard-check')} Pengelolaan TLD</h3></div><div class="panel-b stack" style="gap:10px">
              ${[['tld_lokasi', 'Lokasi simpan TLD kerja & TLD kontrol di area background'], ['tld_kepatuhan', 'Kepatuhan pemakaian TLD pada apron/kerah'], ['tld_kirim', 'Pengiriman TLD ke laboratorium tepat waktu']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-act="tldChk" data-k="${k}" ${PR.set[k] ? 'checked' : ''} ${PR.ro() ? 'disabled' : ''}><span>${l}${PR.set[k] ? `<span class="sub tiny muted"> · dicek ${PR.d(PR.set[k])}</span>` : ''}</span></label>`).join('')}</div></div>
          </div>
        </div>
        <div class="panel mt"><div class="panel-h"><h3>${PR.ic('triangle-alert')} Investigasi pekerja melampaui DC (akar penyebab & tindak lanjut)</h3>${U.btn('Tambah investigasi', 'addInv', 'plus', 'btn-s btn-y')}</div>
          ${overNoInv.length ? `<div class="ban ban-crit" style="margin:12px">${PR.ic('triangle-alert')}<div class="grow"><b>${overNoInv.length} pekerja melampaui DC tanpa catatan investigasi</b><p>${overNoInv.map(w => PR.esc(w.nama)).join(', ')} — item kritis Siap Inspeksi 3.3.</p></div></div>` : ''}
          ${U.table([{ h: 'Pekerja', v: x => { const w = L.get('Pekerja', x.pekerja_id) || {}; return `<b>${PR.esc(w.nama || '—')}</b><span class="sub">${PR.esc(w.profesi || '')}</span>`; } }, { h: 'Tahun', v: x => x.tahun }, { h: 'Dosis', r: 1, v: x => PR.f(L.annual(x.pekerja_id, x.tahun)) },
            { h: 'Akar penyebab', v: x => `<span class="small">${PR.esc(x.akar_penyebab || '—')}</span>` }, { h: 'Rencana korektif', v: x => `<span class="small">${PR.esc(x.rencana || '—')}</span>` }, { h: 'PJ & tenggat', v: x => `<span class="small">${PR.esc(x.penanggung_jawab || '')}</span><span class="sub num">${PR.d(x.tenggat)}</span>` },
            { h: 'Status', v: x => PR.tag(x.status, x.status === 'selesai' ? 'aman' : 'analisis') }, { h: '', v: x => U.btn('Ubah', 'addInv', '', 'btn-s', `data-id="${x.id}"`) }], inv, { empty: 'Belum ada investigasi.' })}</div>`;
    },
    mount: root => {
      const s = PR.$('#dcProf', root); if (s) s.onchange = () => { st.prof = s.value; PR.render(); };
      const c = L.dcCalc();
      PR.$$('[data-dcset]', root).forEach(inp => inp.onchange = () => { const v = inp.value.replace(',', '.'); if (!PR.has(v)) return; if (+v > L.NBD().pekerja_rata5) { PR.toast('Pembatas dosis tidak boleh melampaui NBD ' + L.NBD().pekerja_rata5 + ' mSv', 'err'); return; } const r = c.rows.find(x => x.profesi === inp.dataset.dcset); saveDC(inp.dataset.dcset, v, c, { metode: r && Math.abs(PR.n(v) - (r.usulan || 0)) < 0.005 ? r.aturan : 'Ditetapkan PPR' }); PR.toast('DC ' + inp.dataset.dcset + ' disimpan sebagai draf', 'ok'); PR.render(); });
    }
  });
})(window.PR);
