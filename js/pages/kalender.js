/* AlaraGo — W-03 Kalender Kepatuhan */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const st = { m: null, cat: 'semua', sel: null, view: 'bulan' };
  PR.page('kalender', {
    title: 'Kalender Kepatuhan', roles: ['ppr', 'peninjau'],
    crumb: () => `Kalender kepatuhan / <b>${st.view === 'bulan' ? 'Tampilan bulanan' : 'Daftar'}</b>`,
    render: () => {
      const all = L.dueItems(), T = PR.today();
      if (!st.m) st.m = T.slice(0, 7);
      const items = all.filter(i => st.cat === 'semua' || i.cat === st.cat);
      const cnt = k => all.filter(i => (k === 'semua' || i.cat === k) && i.days <= 90).length;
      const [yy, mm] = st.m.split('-').map(Number);
      const first = new Date(Date.UTC(yy, mm - 1, 1)), start = new Date(first); start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
      const days = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); days.push(d.toISOString().slice(0, 10)); }
      const byDay = PR.groupBy(items, i => i.due);
      const sel = st.sel && all.find(i => i.key === st.sel) || items.find(i => i.days >= 0) || items[0];
      const cls = i => i.status === 'selesai' ? 'done' : i.days <= 7 ? 'k' : i.days <= 30 ? 'w' : '';
      const cal = `<div class="panel"><div class="panel-h"><div class="row"><button class="icon-btn" data-act="calMove" data-d="-1" aria-label="Bulan sebelumnya">${PR.ic('chevron-left')}</button><h2 style="min-width:180px;text-align:center">${PR.BULAN[mm - 1]} ${yy}</h2><button class="icon-btn" data-act="calMove" data-d="1" aria-label="Bulan berikutnya">${PR.ic('chevron-right')}</button><button class="btn btn-s" data-act="calToday">Hari ini</button></div>
        <div class="legend" style="margin:0"><span><i style="background:var(--crit)"></i>≤ H-7</span><span><i style="background:var(--warn-b);border:1px dashed var(--warn)"></i>≤ H-30</span><span><i style="border:1px solid var(--line2)"></i>> H-30</span></div></div>
        <div class="cal">${['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'].map(d => `<div class="dh">${d}</div>`).join('')}
        ${days.map(d => `<div class="d ${d.slice(0, 7) !== st.m ? 'out' : ''} ${d === T ? 'today' : ''} ${sel && sel.due === d ? 'sel' : ''}" data-act="calDay" data-d="${d}"><span class="dn">${+d.slice(8)}${d === T ? ' · <b>Hari ini</b>' : ''}</span>${(byDay[d] || []).slice(0, 3).map(i => `<span class="ev ${cls(i)}" title="${PR.esc(i.title)}">${PR.esc(i.title)}</span>`).join('')}${(byDay[d] || []).length > 3 ? `<span class="tiny muted">+${byDay[d].length - 3}</span>` : ''}</div>`).join('')}</div></div>`;
      const list = `<div class="panel">${U.table([
        { h: 'Jatuh tempo', v: i => `<span class="num">${PR.d(i.due)}</span>` }, { h: 'Item', v: i => `<b>${PR.esc(i.title)}</b><span class="sub">${PR.esc(i.obj || '')}</span>` },
        { h: 'Kategori', v: i => PR.tag((L.CATS.find(c => c[0] === i.cat) || [])[1] || i.cat, 'netral', 1) }, { h: 'Status', v: i => i.status ? PR.tag(i.status, i.status === 'selesai' ? 'aman' : 'netral', 1) : '' }, { h: 'Sisa', v: i => PR.dueTag(i.days) },
        { h: '', v: i => `<button class="btn btn-s" data-act="calSel" data-k="${PR.esc(i.key)}">Detail</button>` }
      ], items.filter(i => i.days > -60), { rowAttr: i => sel && i.key === sel.key ? 'class="sel"' : '', empty: 'Tidak ada jatuh tempo pada kategori ini.' })}</div>`;
      const det = sel ? `<div class="panel" style="position:sticky;top:72px"><div class="panel-h panel-dark" style="border-bottom:3px solid var(--y)"><div><div class="eyebrow" style="color:var(--y)">Detail entri kepatuhan</div><h3 style="color:#fff;margin-top:4px">${PR.esc(sel.title)}</h3></div>${PR.dueTag(sel.days)}</div>
        <div class="panel-b">${sel.days <= 7 && sel.status !== 'selesai' ? `<div class="ban ban-warn" style="margin-top:0">${PR.ic('clock')}<div class="grow small"><b style="font-size:13px">${sel.days < 0 ? 'Sudah lewat ' + -sel.days + ' hari' : 'Berakhir ' + sel.days + ' hari lagi'}</b></div></div>` : ''}
          <dl class="kv"><dt>Objek</dt><dd>${PR.esc(sel.obj || '—')}</dd><dt>Jatuh tempo</dt><dd class="mono">${PR.d(sel.due)}</dd><dt>Kategori</dt><dd>${PR.esc((L.CATS.find(c => c[0] === sel.cat) || [])[1])}</dd><dt>Status</dt><dd>${sel.status ? PR.esc(sel.status) : 'Belum ditindaklanjuti'}</dd></dl>
          ${PR.can('edit') ? `<div class="f mt"><label>Catatan tindak lanjut</label><textarea class="inp" id="calNote" placeholder="Contoh: surat permohonan sudah diajukan…">${PR.esc(sel.catatan)}</textarea></div>
          <div class="stack mt" style="gap:8px"><button class="btn btn-y btn-b" data-act="calMark" data-s="dijadwalkan">${PR.ic('calendar-check')}Sudah dijadwalkan</button><button class="btn btn-b" data-act="calDone">${PR.ic('file-up')}Selesai — perbarui data</button>
          <button class="btn btn-g" data-act="calWA">${PR.ic('message-circle')}Kirim pengingat via WhatsApp</button></div>` : ''}
        </div></div>` : `<div class="panel">${U.empty('Pilih tanggal atau item untuk melihat detail.')}</div>`;
      return `${U.head('Kalender kepatuhan & jatuh tempo', 'Semua jadwal izin, uji kesesuaian, kalibrasi, TLD, MCU, dokumen, laporan, dan temuan LHI dalam satu tampilan.',
        `<span class="seg"><button class="${st.view === 'bulan' ? 'on' : ''}" data-act="calView" data-v="bulan">Bulan</button><button class="${st.view === 'daftar' ? 'on' : ''}" data-act="calView" data-v="daftar">Daftar</button></span>${U.btn('Sinkron Google Kalender', 'calSync', 'refresh-cw')}`)}
        <div class="chips mb">${[['semua', 'Semua']].concat(L.CATS).map(([k, l]) => `<button class="chip ${st.cat === k ? 'on' : ''}" data-act="calCat" data-k="${k}">${l}<span class="n">${cnt(k)}</span></button>`).join('')}</div>
        <div class="grid g-8-4"><div>${st.view === 'bulan' ? cal : list}</div><div>${det}</div></div>
        <div class="panel mt"><div class="panel-b spread"><span class="row">${PR.ic('mail')}<span><b>Ringkasan mingguan:</b> Senin ±07.00 WIB via Gmail · <span class="mono">${all.filter(i => i.days >= 0 && i.days <= 7).length} item minggu ini</span></span></span>${PR.can('edit') ? '<a class="btn btn-s" href="#/pengaturan/notifikasi">Atur notifikasi</a>' : ''}</div></div>`;
    }
  });
  PR.acts.calMove = el => { const [y, m] = st.m.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + +el.dataset.d, 1)); st.m = d.toISOString().slice(0, 7); PR.render(); };
  PR.acts.calToday = () => { st.m = PR.today().slice(0, 7); PR.render(); };
  PR.acts.calCat = el => { st.cat = el.dataset.k; st.sel = null; PR.render(); };
  PR.acts.calView = el => { st.view = el.dataset.v; PR.render(); };
  PR.acts.calSel = el => { st.sel = el.dataset.k; PR.render(); };
  PR.acts.calDay = el => { const it = L.dueItems().find(i => i.due === el.dataset.d && (st.cat === 'semua' || i.cat === st.cat)); if (it) { st.sel = it.key; PR.render(); } };
  const cur = () => L.dueItems().find(i => i.key === st.sel) || L.dueItems().filter(i => st.cat === 'semua' || i.cat === st.cat).find(i => i.days >= 0);
  PR.acts.calMark = el => { const i = cur(); if (!i) return; A.save('Jadwal', { id: i.key, status: el.dataset.s, catatan: (PR.$('#calNote') || {}).value || '', diubah: new Date().toISOString() }); st.sel = i.key; PR.toast('Ditandai ' + el.dataset.s + ' — pengingat item ini berhenti', 'ok'); PR.render(); };
  PR.acts.calDone = () => { const i = cur(); if (!i) return; A.save('Jadwal', { id: i.key, status: 'selesai', catatan: (PR.$('#calNote') || {}).value || '', diubah: new Date().toISOString() }); PR.toast('Ditandai selesai. Perbarui tanggal berlaku pada datanya agar jatuh tempo berikutnya terhitung.', 'ok'); PR.go(i.route); };
  PR.acts.calWA = () => { const i = cur(); if (i) PR.wa(`[AlaraGo] Pengingat: ${i.title} — jatuh tempo ${PR.d(i.due)} (${PR.hcount(i.days)}). ${i.obj || ''}`); };
  PR.acts.calSync = async el => { el.disabled = true; try { await A.flush(); const d = await A.call('syncCalendar', {}); PR.toast(`Jadwal terkirim (${d.n} item). Google Kalender menyesuaikan pada sinkron berikutnya (skrip mini: tiap pagi ±08.00).`, 'ok'); } catch (e) { PR.toast(e.message, 'err'); } el.disabled = false; };
})(window.PR);
