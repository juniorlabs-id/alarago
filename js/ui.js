/* AlaraGo — shell aplikasi (sidebar bisa diciutkan, bottom nav HP), router, aksi global */
(function (PR) {
  'use strict';
  const U = PR.ui = {};
  PR.routes = {};
  PR.acts = {};
  PR.page = (name, def) => { PR.routes[name] = def; };

  // ---------- router ----------
  PR.parse = () => {
    const h = (location.hash || '#/').slice(1); const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const q = {}; new URLSearchParams(qs || '').forEach((v, k) => q[k] = v);
    return { name: parts[0] || '', parts: parts.slice(1), q, hash: '#' + h };
  };
  PR.go = h => { if (location.hash === h) PR.render(); else location.hash = h; };
  PR.can = what => { const r = PR.me && PR.me.role; if (what === 'edit') return r === 'ppr' && !(PR.lic && PR.lic.status === 'berakhir'); return r === what; };
  PR.ro = () => !PR.can('edit');

  const NAV = [
    ['dasbor', 'Dasbor', 'layout-dashboard'], ['kalender', 'Kalender kepatuhan', 'calendar-check'], ['inventaris', 'Inventaris', 'boxes'], ['dosis', 'Kartu dosis', 'id-card'],
    ['dc', 'Pembatas dosis', 'gauge'], ['survei', 'Survei paparan', 'radar'], ['arsip', 'Arsip dokumen', 'folder-open'], ['inspeksi', 'Siap inspeksi', 'clipboard-check']
  ];
  U.badges = () => {
    if (!PR.db) return {};
    const due = PR.L.dueItems().filter(i => i.days <= 30 && i.status !== 'selesai' && i.status !== 'dijadwalkan').length;
    const tl = PR.L.tb('Temuan').filter(t => t.status !== 'ditutup').length;
    const wait = PR.L.tb('Pembatas_Dosis').filter(d => d.status === 'menunggu').length;
    return { kalender: due, inspeksi: tl, persetujuan: wait };
  };
  const navItems = () => PR.me && PR.me.role === 'peninjau' ? [['persetujuan', 'Persetujuan', 'stamp']].concat(NAV) : NAV;

  U.collapsed = () => PR.LS.get('pr_side', window.innerWidth < 1180 && window.innerWidth >= 768 ? 'c' : 'o') === 'c';
  PR.acts.toggleSide = () => { const c = !document.body.classList.contains('collapsed'); document.body.classList.toggle('collapsed', c); PR.LS.set('pr_side', c ? 'c' : 'o'); U.sideIcon(); };
  U.sideIcon = () => { const b = PR.$('.side-tog'); if (b) { const c = document.body.classList.contains('collapsed'); b.innerHTML = PR.ic(c ? 'panel-left-open' : 'panel-left-close'); b.title = c ? 'Tampilkan menu' : 'Ciutkan menu (ikon saja)'; b.setAttribute('aria-label', b.title); } };

  U.shell = () => {
    const me = PR.me || {}, rs = PR.L.rs(), b = U.badges();
    document.body.classList.toggle('collapsed', U.collapsed());
    const items = navItems();
    const mob = me.role === 'peninjau' ? [['persetujuan', 'Setuju', 'stamp'], ['dasbor', 'Dasbor', 'layout-dashboard'], ['dosis', 'Dosis', 'id-card'], ['inspeksi', 'Inspeksi', 'clipboard-check']] : [['dasbor', 'Dasbor', 'layout-dashboard'], ['kalender', 'Kalender', 'calendar-check'], ['dosis', 'Dosis', 'id-card'], ['inspeksi', 'Inspeksi', 'clipboard-check']];
    return `<div class="app">
      <aside class="side" aria-label="Menu utama">
        <div class="side-head">${PR.logo()}<div class="brand"><b>AlaraGo</b><span>Protect. Record. Ready.</span></div><button class="side-tog" data-act="toggleSide"></button></div>
        <nav class="nav">${items.map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}" data-tip="${l}">${PR.ic(i)}<span class="lbl">${l}</span>${b[k] ? `<span class="bdg">${b[k]}</span><span class="dot"></span>` : ''}</a>`).join('')}</nav>
        <div class="side-foot">
          <nav class="nav" style="padding:4px 0">${me.role === 'ppr' ? `<a href="#/pengaturan" data-nav="pengaturan" data-tip="Pengaturan">${PR.ic('settings')}<span class="lbl">Pengaturan</span></a>` : ''}
          <a href="#" data-act="install" data-tip="Pasang aplikasi" id="installNav" ${PR.installEvt ? '' : 'hidden'}>${PR.ic('monitor-smartphone')}<span class="lbl">Pasang aplikasi</span></a>
          <a href="#" data-act="logout" data-tip="Keluar">${PR.ic('log-out')}<span class="lbl">Keluar</span></a></nav>
          <div class="side-user"><span class="avatar">${PR.esc(PR.initials(me.nama))}</span><div><b>${PR.esc(me.nama || '')}</b><span>${me.role === 'peninjau' ? 'Peninjau · hanya baca' : 'Petugas proteksi radiasi'}</span></div></div>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <div class="m-brand">${PR.logo()}<b>AlaraGo</b></div>
          <div class="crumb" id="crumb"></div>
          ${me.role === 'peninjau' ? '<span class="ro-tag hide-m">Hanya baca</span>' : ''}
          <span class="rs-pill" title="Rumah sakit aktif">${PR.ic('building-2', 'ic-s')}<span class="trunc">${PR.esc(rs.nama || 'RS belum diatur')}${rs.instalasi ? ' · ' + PR.esc(rs.instalasi) : ''}</span></span>
          <button class="icon-btn" data-go="#/kalender" title="Jatuh tempo" aria-label="Jatuh tempo">${PR.ic('bell')}${b.kalender ? '<span class="pip"></span>' : ''}</button>
        </header>
        ${PR.api.isDemo() ? `<div class="banner-lic no-print" style="padding:8px 28px">${PR.ic('info')}<span class="grow" style="flex:1"><b>Mode demo</b><span class="hide-m"> — data contoh tersimpan di browser ini saja.</span></span><span class="seg" style="background:rgba(255,255,255,.6)">${[['ppr', 'PPR'], ['peninjau', 'Peninjau'], ['pekerja', 'Pekerja']].map(([r, l]) => `<button data-act="demoRole" data-r="${r}" class="${me.role === r ? 'on' : ''}">${l}</button>`).join('')}</span><button class="btn btn-s btn-y" data-act="demoReset">Reset</button></div>` : ''}
        ${PR.lic && PR.lic.status === 'berakhir' ? `<div class="banner-lic no-print">${PR.ic('lock')}<span style="flex:1">Langganan berakhir ${PR.d(PR.lic.berlaku_sd)}. Data tetap bisa dilihat & diekspor. Hubungi ${PR.esc(window.PR_CONFIG.SELLER_CONTACT)} untuk perpanjangan.</span></div>` : ''}
        ${PR.lic && PR.lic.paket === 'Uji coba' && PR.lic.status !== 'berakhir' ? `<div class="banner-lic no-print" style="padding:8px 28px">${PR.ic('clock')}<span style="flex:1">Uji coba berakhir ${PR.d(PR.lic.berlaku_sd)} (${PR.hcount(PR.left(PR.lic.berlaku_sd))}).</span></div>` : ''}
        <div class="offline-bar no-print" id="syncbar" hidden></div>
        <main class="page" id="page"></main>
      </div>
      <nav class="bnav no-print" aria-label="Menu bawah">${mob.map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}">${PR.ic(i)}${l}${b[k] ? `<span class="bdg">${b[k]}</span>` : ''}</a>`).join('')}<a href="#" data-act="mobileMenu" data-nav="menu">${PR.ic('menu')}Menu</a></nav>
    </div>`;
  };
  PR.acts.mobileMenu = (el, e) => {
    e.preventDefault();
    const extra = PR.me.role === 'peninjau' ? [['kalender', 'Kalender kepatuhan', 'calendar-check', 'Jatuh tempo kepatuhan'], ['inventaris', 'Inventaris', 'boxes', 'Alat, alat ukur, ruangan'], ['dc', 'Pembatas dosis', 'gauge', 'Nilai DC per profesi'], ['survei', 'Survei paparan', 'radar', 'Laju dosis daerah kerja'], ['arsip', 'Arsip dokumen', 'folder-open', 'Dokumen berlaku & terkendali']]
      : [['inventaris', 'Inventaris', 'boxes', 'Alat, alat ukur, ruangan, perlengkapan'], ['dc', 'Pembatas dosis', 'gauge', 'Hitung & kaji ulang DC'], ['survei', 'Survei paparan', 'radar', 'Survei daerah kerja & denah'], ['arsip', 'Arsip dokumen', 'folder-open', 'Dokumen, SOP, laporan'], ['pengaturan', 'Pengaturan', 'settings', 'Akses, notifikasi, lisensi']];
    PR.modal({ title: 'Menu', body: `<div class="stack" style="gap:0">${extra.map(([k, l, i, d]) => `<a class="list-row" href="#/${k}" data-x style="text-decoration:none">${PR.ic(i, 'ic-l')}<div class="grow"><b>${l}</b><span>${d}</span></div>${PR.ic('chevron-right')}</a>`).join('')}
      ${PR.installEvt ? `<button class="list-row link" data-act="install" style="text-decoration:none;width:100%;text-align:left">${PR.ic('monitor-smartphone', 'ic-l')}<div class="grow"><b>Pasang aplikasi</b><span>Tambahkan ke layar utama</span></div></button>` : ''}
      <button class="list-row link" data-act="logout" style="text-decoration:none;width:100%;text-align:left">${PR.ic('log-out', 'ic-l')}<div class="grow"><b>Keluar</b><span>${PR.esc(PR.me.nama)}</span></div></button></div>` });
  };

  U.syncBar = (n, offline) => {
    const el = PR.$('#syncbar'); if (!el) return;
    if (!n && navigator.onLine) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `${PR.ic(navigator.onLine && !offline ? 'refresh-cw' : 'wifi-off', 'ic-s')} ${navigator.onLine && !offline ? `Menyimpan ${n} perubahan…` : `Offline — ${n} perubahan tersimpan di perangkat dan akan dikirim saat online`}`;
  };
  window.addEventListener('offline', () => U.syncBar(PR.api.pending(), true));

  // ---------- render ----------
  const PUBLIC = ['masuk', 'qr', 'tamu', 'pintu', 'hubungkan'];
  let mountedRole = null;
  PR.render = () => {
    const r = PR.parse(); let name = r.name;
    const root = PR.$('#root');
    if (!PUBLIC.includes(name)) {
      if (!PR.api.url() || !PR.api.session()) { if (name !== 'masuk') return PR.go('#/masuk'); }
      if (!PR.me) { root.innerHTML = '<div class="center-wrap"><div class="sk" style="width:200px"></div></div>'; return; }
      const role = PR.me.role;
      if (role === 'pekerja') { if (!['saya'].includes(name)) return PR.go('#/saya'); }
      else if (role === 'ppr' && PR.set && PR.set.wizard_selesai !== 'ya' && name !== 'wizard' && !PR.api.isDemo()) return PR.go('#/wizard');
      else if (!name || !PR.routes[name] || (PR.routes[name].roles && !PR.routes[name].roles.includes(role))) return PR.go(role === 'peninjau' ? '#/persetujuan' : '#/dasbor');
    }
    const def = PR.routes[name]; if (!def) return PR.go('#/masuk');
    const full = def.full || PR.me && PR.me.role === 'pekerja';
    if (full) { mountedRole = null; root.innerHTML = def.render(r); def.mount && def.mount(root, r); document.title = (def.title ? def.title + ' · ' : '') + 'AlaraGo'; window.scrollTo(0, 0); return; }
    const key = PR.me.role + '|' + (PR.lic && PR.lic.status) + '|' + JSON.stringify(U.badges()) + PR.api.isDemo();
    if (mountedRole !== key || !PR.$('#page')) { root.innerHTML = U.shell(); mountedRole = key; U.sideIcon(); }
    PR.$$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === name));
    const page = PR.$('#page');
    try { page.innerHTML = def.render(r); } catch (e) { console.error(e); page.innerHTML = `<div class="ban ban-crit">${PR.ic('triangle-alert')}<div class="grow"><b>Halaman gagal dimuat</b><p>${PR.esc(e.message)}</p></div></div>`; }
    PR.$('#crumb').innerHTML = def.crumb ? def.crumb(r) : PR.esc(def.title || '');
    document.title = (def.title || 'AlaraGo') + ' · AlaraGo';
    def.mount && def.mount(page, r);
    if (U.lastHash !== r.hash.split('?')[0]) window.scrollTo(0, 0);
    U.lastHash = r.hash.split('?')[0];
    U.syncBar(PR.api.pending());
  };
  PR.rerender = () => { if (!PR.$('.modal-bg')) PR.render(); else U.dirty = true; };

  // ---------- aksi global ----------
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); PR.go(go.dataset.go); return; }
    const a = e.target.closest('[data-act]');
    if (a && PR.acts[a.dataset.act]) { if (a.tagName === 'A') e.preventDefault(); PR.acts[a.dataset.act](a, e); }
  });
  PR.acts.logout = async (el, e) => { e && e.preventDefault(); if (PR.api.pending() && !(await PR.confirm('Masih ada perubahan yang belum terkirim. Keluar tetap?', 'Keluar'))) return; PR.api.logout(); PR.me = null; PR.db = null; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); PR.go('#/masuk'); };
  PR.acts.install = async (el, e) => { e && e.preventDefault(); if (!PR.installEvt) return PR.toast('Gunakan menu browser › "Tambahkan ke layar utama" / "Instal aplikasi".'); PR.installEvt.prompt(); await PR.installEvt.userChoice; PR.installEvt = null; PR.$$('[data-act=install]').forEach(x => x.hidden = true); };
  PR.acts.demoRole = async el => { PR.demo.setRole(el.dataset.r); await PR.api.boot(true); mountedRole = null; PR.go(el.dataset.r === 'pekerja' ? '#/saya' : el.dataset.r === 'peninjau' ? '#/persetujuan' : '#/dasbor'); PR.render(); };
  PR.acts.demoReset = async () => { if (!(await PR.confirm('Kembalikan semua data contoh ke awal?', 'Reset'))) return; PR.demo.reset(); PR.demo.setRole('ppr'); await PR.api.boot(true); mountedRole = null; PR.go('#/dasbor'); PR.render(); };
  PR.acts.openFile = el => PR.api.openFile(el.dataset.id, U.guest);
  PR.acts.print = () => window.print();

  // ---------- potongan UI bersama ----------
  U.head = (title, desc, actions, eyebrow) => `<div class="page-head"><div>${eyebrow ? `<div class="eyebrow" style="margin-bottom:6px">${eyebrow}</div>` : ''}<h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${actions ? `<div class="actions no-print">${actions}</div>` : ''}</div>`;
  U.tile = (tag, big, lbl, p, cls) => `<div class="tile ${cls || ''}"><div class="spread"><span class="lbl">${lbl}</span>${tag || ''}</div><div class="big">${big}</div>${p ? `<p>${p}</p>` : ''}</div>`;
  U.empty = (msg, btn) => `<div class="empty"><div class="hz"></div><div>${msg}</div>${btn ? `<div class="mt">${btn}</div>` : ''}</div>`;
  U.table = (cols, rows, opt) => {
    opt = opt || {};
    if (!rows.length) return U.empty(opt.empty || 'Belum ada data', opt.emptyBtn);
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th class="${c.r ? 'r' : ''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr ${opt.rowAttr ? opt.rowAttr(r, i) : ''}>${cols.map(c => `<td class="${c.r ? 'r num' : ''}">${c.v(r, i)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${opt.foot ? `<div class="tbl-foot">${opt.foot}</div>` : ''}`;
  };
  U.btn = (label, act, icon, cls, attrs) => PR.ro() && !(cls || '').includes('ro-ok') ? '' : `<button class="btn ${cls || ''}" ${act ? `data-act="${act}"` : ''} ${attrs || ''}>${icon ? PR.ic(icon) : ''}${label}</button>`;
  U.tabs = (items, cur) => `<div class="tabs">${items.map(([k, l, n, href]) => `<a href="${href}" class="${k === cur ? 'on' : ''}">${l}${n != null ? `<span class="n">${n}</span>` : ''}</a>`).join('')}</div>`;
  U.fileChip = (id, name) => id ? `<button class="tag" data-act="openFile" data-id="${PR.esc(id)}" style="cursor:pointer">${PR.ic('file-text')}${PR.esc(name || 'Lihat berkas')}</button>` : '<span class="muted small">—</span>';
})(window.PR);
