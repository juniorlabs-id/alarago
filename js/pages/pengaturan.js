/* AlaraGo — W-18 Pengaturan */
(function (PR) {
  'use strict';
  const U = PR.ui, L = PR.L, A = PR.api;
  const TABS = [['akses', 'Akses pengguna', 'users'], ['notifikasi', 'Notifikasi', 'bell'], ['regulasi', 'Batas & regulasi', 'gauge'], ['lisensi', 'Lisensi & RS', 'building-2'], ['privasi', 'Privasi', 'lock'], ['log', 'Log akses', 'history'], ['aplikasi', 'Aplikasi', 'monitor-smartphone']];
  const sw = (k, label, desc, extra) => `<div class="list-row"><span class="icon-btn" style="border:0;background:var(--sub)">${PR.ic(extra && extra.icon || 'bell')}</span><div class="grow"><b style="white-space:normal">${label} ${extra && extra.tag || ''}</b><span style="white-space:normal">${desc}</span></div><label class="switch"><input type="checkbox" data-act="setSw" data-k="${k}" ${PR.set[k] !== 'tidak' ? 'checked' : ''}><span></span></label></div>`;
  PR.acts.setSw = el => { A.setting(el.dataset.k, el.checked ? 'ya' : 'tidak'); PR.toast('Pengaturan disimpan', 'ok'); };

  PR.acts.addReviewer = async el => {
    const u = el.dataset.id ? L.get('Pengguna', el.dataset.id) : { peran: 'peninjau', status: 'aktif' };
    const v = await PR.form({ title: 'Peninjau internal', intro: 'Peninjau (kepala instalasi / manajemen) membuka AlaraGo lewat tautan pribadi + PIN — tanpa akun Google. Hanya dapat melihat dan menyetujui berita acara pembatas dosis. Gratis, tidak dihitung lisensi.', del: !!el.dataset.id,
      fields: [{ k: 'nama', label: 'Nama', req: 1 }, { k: 'jabatan', label: 'Jabatan', ph: 'Kepala Instalasi Radiologi' }, { k: 'no_hp', label: 'No. HP / WA (opsional)', ph: '08…' }, { k: 'email', label: 'Email (opsional)', type: 'email' }, { k: 'status', label: 'Status', type: 'select', opts: [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif (tautan dicabut)']] }] }, u);
    if (!v) return;
    if (v._delete) { A.remove('Pengguna', u.id); PR.render(); return A.call('syncCalendar', {}).catch(() => { }); }
    delete v._files; v.email = String(v.email || '').toLowerCase(); v.peran = 'peninjau'; v.dibuat = v.dibuat || new Date().toISOString();
    const row = A.save('Pengguna', v) || v; PR.render();
    if (v.status === 'nonaktif') { PR.toast('Peninjau dinonaktifkan — tautannya berhenti berlaku setelah sinkron.', 'ok'); return A.call('syncCalendar', {}).catch(() => { }); }
    if (!el.dataset.id) PR.acts.reviewerLink({ dataset: { id: row.id || v.id } });
  };
  PR.acts.reviewerLink = async el => {
    const u = L.get('Pengguna', el.dataset.id); if (!u) return PR.toast('Simpan peninjau dulu', 'warn');
    const cr = (PR.db.Kredensial || []).find(c => c.id === 'r:' + u.id && !c.dicabut);
    if (cr && !(await PR.confirm(`Buat tautan baru untuk <b>${PR.esc(u.nama)}</b>? Tautan lama langsung tidak berlaku dan ia perlu membuat PIN baru.`, 'Buat tautan baru'))) return;
    PR.toast('Menyiapkan tautan…');
    try {
      const d = await A.call('inviteReviewer', { id: u.id }), link = d.link;
      const pesan = `Halo ${u.nama}, berikut tautan pribadi Anda untuk meninjau rekaman proteksi radiasi ${L.rs().nama || ''} di AlaraGo (jangan dibagikan). Buka di HP/laptop, lalu buat PIN 6 digit: ${link}`;
      PR.modal({ title: 'Tautan peninjau', body: `<div class="grid g2"><div class="qrbox" id="qrr"></div><div><div class="eyebrow">Untuk</div><h3>${PR.esc(u.nama)}</h3><p class="small muted">${PR.esc(u.jabatan || '')}</p><ol class="small" style="padding-left:18px;line-height:1.6"><li>Kirim tautan ini lewat WA/email, atau minta ia memindai QR.</li><li>Peninjau membuka tautan → membuat PIN 6 digit.</li><li>Tautan pribadi — siapa pun yang memegangnya bisa membuat PIN. Hilang? Buat tautan baru.</li></ol></div></div><input class="inp mono small mt8" readonly value="${PR.esc(link)}">`,
        foot: `<button class="btn" data-copy>${PR.ic('link')}Salin</button><button class="btn" data-wa>${PR.ic('message-circle')}WA</button>${u.email ? `<a class="btn" href="mailto:${PR.esc(u.email)}?subject=${encodeURIComponent('Akses peninjau AlaraGo')}&body=${encodeURIComponent(pesan)}">${PR.ic('mail')}Email</a>` : ''}`,
        onMount: m => { PR.qr(link, PR.$('#qrr', m)); m.querySelector('[data-copy]').onclick = () => PR.copy(link); m.querySelector('[data-wa]').onclick = () => PR.wa(pesan, u.no_hp); } });
      PR.render();
    } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.saveReg = () => {
    const f = PR.$('#regForm'); const ks = ['ppr_nama', 'ppr_izin_no', 'ppr_izin_sd', 'tanggal_mulai_operasi', 'batas_pengendalian', 'batas_supervisi', 'batas_umum', 'periode_survei_bulan', 'balis_url'];
    ks.forEach(k => { const v = f.elements[k].value.trim().replace(k.startsWith('batas') ? ',' : '\u0000', '.'); if (String(PR.set[k] || '') !== v) A.setting(k, v); });
    PR.toast('Pengaturan regulasi disimpan', 'ok'); PR.render();
  };
  PR.acts.calcBatas = () => {
    const f = PR.$('#calc'), t = PR.n(f.elements.c_target.value), j = PR.n(f.elements.c_jam.value), o = PR.n(f.elements.c_okup.value) || 1;
    PR.$('#calcOut').innerHTML = t && j ? `<b class="mono" style="font-size:18px">${PR.f(t / (j * o), 2)} µSv/jam</b> <span class="small muted">= ${PR.f(t, 0)} µSv/tahun ÷ (${PR.f(j, 0)} jam × okupansi ${PR.f(o, 2)})</span>` : '<span class="small muted">Isi target & jam penyinaran.</span>';
  };
  PR.acts.saveRS = async () => {
    const rs = L.rs(); const v = await PR.form({ title: 'Data rumah sakit', fields: [{ k: 'nama', label: 'Nama RS', req: 1 }, { k: 'instalasi', label: 'Instalasi' }, { k: 'alamat', label: 'Alamat', type: 'textarea' }, { k: 'pemegang_izin', label: 'Pemegang izin' }] }, rs);
    if (!v) return; delete v._files; A.save('RS', Object.assign({}, rs, v, { id: rs.id || 'RS1', aktif: 'ya' })); PR.render();
  };
  PR.acts.exportAll = async () => {
    PR.toast('Menyusun ekspor…');
    try { await PR.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); const z = new window.JSZip(); const f = z.folder('AlaraGo-ekspor-' + PR.today());
      Object.keys(PR.db).filter(t => t !== 'Kredensial').forEach(t => { const rows = PR.db[t] || []; if (!rows.length) return; const cols = Object.keys(rows.reduce((o, r) => Object.assign(o, r), {})); f.file(t + '.csv', PR.toCSV(rows, cols)); });
      f.file('pengaturan.json', JSON.stringify(PR.set, null, 2)); f.file('semua-data.json', JSON.stringify({ tables: Object.assign({}, PR.db, { Kredensial: undefined }), settings: PR.set, diekspor: new Date().toISOString() }));
      PR.download('AlaraGo-ekspor-' + (L.rs().nama || 'RS').replace(/[^\w]+/g, '-') + '-' + PR.today() + '.zip', await z.generateAsync({ type: 'blob' }));
      A.setting('ekspor_terakhir', new Date().toISOString());
    } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.moveRS = async () => {
    if (!PR.set.ekspor_terakhir || PR.days(PR.set.ekspor_terakhir, PR.today()) > 1) return PR.toast('Ekspor data RS lama lebih dulu (tombol "Ekspor data RS lama").', 'warn');
    const v = await PR.form({ title: 'Pindah ke RS baru', intro: 'Sesuai Perba BAPETEN 4/2024 Ps. 26, izin bekerja PPR hanya untuk 1 instansi. Data RS lama diarsipkan sebagai salinan spreadsheet di Drive Anda, lalu AlaraGo dikosongkan untuk RS baru. Akun pekerja & peninjau RS lama otomatis tidak bisa masuk. Maksimal 2× per tahun.', fields: [{ k: 'nama', label: 'Nama RS baru', req: 1 }, { k: 'instalasi', label: 'Instalasi' }, { k: 'alamat', label: 'Alamat', type: 'textarea' }, { k: 'ok', label: 'Saya sudah mengekspor & menyerahkan data RS lama', type: 'check', req: 1, valid: v => v === 'ya' ? '' : 'Wajib dicentang' }], ok: 'Nonaktifkan & pindah' }, {});
    if (!v) return;
    try { const d = await A.call('moveRS', v); PR.toast('Pindah RS berhasil. Arsip RS lama tersimpan di Drive.', 'ok'); await A.boot(true); PR.go('#/wizard'); } catch (e) { PR.toast(e.message, 'err'); }
  };
  PR.acts.testNotif = async el => { el.disabled = true; try { const d = await A.call('testEmail', {}); PR.toast(d.demo ? 'Mode demo: email uji tidak benar-benar dikirim.' : 'Rekap uji dikirim ke ' + d.to + (d.telegram ? ' + Telegram' : ''), 'ok'); } catch (e) { PR.toast(e.message, 'err'); } finally { el.disabled = false; } };
  let NF = null;
  let nfLoad = false;
  const muatNotif = async () => { if (nfLoad) return; nfLoad = true; try { NF = await A.call('notifInfo', {}); } catch (e) { NF = { err: e.message }; } nfLoad = false; if (PR.parse().name === 'pengaturan' && PR.parse().parts[0] === 'notifikasi') PR.render(); };
  PR.acts.nfSw = async el => { const k = el.dataset.k, val = el.checked ? 'ya' : 'tidak'; try { NF = Object.assign({}, NF, await A.call('notifSet', { notif: { [k]: val } })); PR.toast('Pengaturan notifikasi disimpan', 'ok'); } catch (e) { el.checked = !el.checked; PR.toast(e.message, 'err'); } };
  PR.acts.tgPutus = async () => { if (!(await PR.confirm('Putuskan Telegram dari AlaraGo?', 'Putuskan'))) return; try { NF = Object.assign({}, NF, await A.call('notifSet', { putusTelegram: true })); PR.render(); } catch (e) { PR.toast(e.message, 'err'); } };
  PR.acts.tgCek = () => { NF = null; PR.render(); };
  PR.acts.kalBaru = async () => { if (!(await PR.confirm('Buat kode kalender baru? Tautan langganan & skrip mini lama berhenti bekerja — Anda perlu memasang ulang.', 'Buat baru'))) return; try { NF = Object.assign({}, NF, await A.call('notifSet', { kalenderBaru: true })); PR.render(); } catch (e) { PR.toast(e.message, 'err'); } };
  PR.acts.kalSkrip = async () => {
    const kode = NF && NF.kalender && NF.kalender.kode; if (!kode) return;
    let src = ''; try { await PR.loadScript('js/kalender-mini.js'); src = PR.KALENDER_MINI || ''; } catch (e) { }
    if (!src || !/KODE_KALENDER/.test(src)) return PR.toast('Berkas skrip mini tidak ditemukan.', 'err');
    src = src.replace(/const KODE_KALENDER = '[^']*'/, `const KODE_KALENDER = '${kode}'`);
    PR.modal({ title: 'Skrip mini Google Kalender', body: `<ol class="small" style="padding-left:18px;line-height:1.7;margin-top:0"><li>Buka <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com → Proyek baru</a> (pakai akun Google yang kalendernya ingin dipakai).</li><li>Hapus isi <span class="mono">Code.gs</span>, tempel skrip di bawah (kode Anda sudah terisi), lalu simpan.</li><li>Pilih fungsi <b class="mono">pasang</b> → <b>Jalankan</b> → izinkan akses Kalender.</li><li>Selesai. Setiap hari ±08.00 acara & pengingat pop-up disegarkan otomatis.</li></ol><textarea class="inp mono" style="height:220px;font-size:11px" readonly>${PR.esc(src)}</textarea>`,
      foot: `<button class="btn btn-y" data-cp>${PR.ic('copy')}Salin skrip</button>`, onMount: m => { m.querySelector('[data-cp]').onclick = () => PR.copy(src); } });
  };
  PR.acts.copyV = el => PR.copy(el.dataset.v);
  PR.acts.saveTahap = () => {
    const f = PR.$('#tahapForm'), out = {}; let bad = '';
    L.CATS.forEach(([k, n]) => { const t = String(f.elements['t_' + k].value).split(/[^\d]+/).filter(Boolean).map(Number).filter(x => x > 0 && x <= 365); const kr = Math.max(0, Math.min(365, parseInt(f.elements['k_' + k].value, 10) || 0));
      if (!t.length) bad = n; out[k] = { tahapan: [...new Set(t)].sort((a, b) => b - a).slice(0, 5), kritis: kr }; });
    if (bad) return PR.toast(`Isi minimal satu tahap untuk ${bad}`, 'warn');
    A.setting('pengingat', JSON.stringify(out));
    const j = Math.max(7, Math.min(120, parseInt(f.elements.rekap_jendela.value, 10) || 60)); A.setting('rekap_jendela', String(j));
    PR.toast('Pengingat disimpan — kalender & rekap ikut diperbarui', 'ok'); PR.render(); A.call('syncCalendar', {}).catch(() => { });
  };
  PR.acts.resetTahap = async () => { if (!(await PR.confirm('Kembalikan semua tahap pengingat ke bawaan?', 'Kembalikan'))) return; A.setting('pengingat', ''); PR.render(); A.call('syncCalendar', {}).catch(() => { }); };
  PR.acts.clearCache = async () => { if (!(await PR.confirm('Hapus cache data di perangkat ini dan muat ulang dari server?', 'Muat ulang'))) return; try { A.clearCache(); } catch (e) { } if (window.caches) (await caches.keys()).forEach(k => caches.delete(k)); location.reload(); };

  const body = {
    akses: () => {
      const rev = L.tb('Pengguna').filter(u => u.peran === 'peninjau'), ws = L.tb('Pekerja'), cred = {}; (PR.db.Kredensial || []).filter(c => !c.dicabut).forEach(c => cred[c.id] = c);
      (PR.extra.kredensial || []).forEach(c => { if (!cred['p:' + c.id]) cred['p:' + c.id] = c; });
      return `<div class="panel"><div class="panel-h"><h3>Peninjau internal</h3>${U.btn('Tambah peninjau', 'addReviewer', 'plus', 'btn-y btn-s')}</div>${U.table([{ h: 'Nama', v: u => `<b>${PR.esc(u.nama)}</b><span class="sub">${PR.esc(u.jabatan || '')}</span>` }, { h: 'Kontak', v: u => `<span class="mono small">${PR.esc(u.no_hp || u.email || '—')}</span>` }, { h: 'Status', v: u => u.status === 'nonaktif' ? PR.tag('nonaktif', 'dash', 1) : cred['r:' + u.id] ? PR.tag('tautan aktif', 'aman', 1) : PR.tag('belum ada tautan', 'netral', 1) },
          { h: '', v: u => `<div class="row" style="gap:4px;flex-wrap:nowrap">${u.status !== 'nonaktif' ? `<button class="btn btn-s" data-act="reviewerLink" data-id="${u.id}">${PR.ic('link')}${cred['r:' + u.id] ? 'Tautan baru' : 'Buat tautan'}</button>` : ''}${U.btn('Ubah', 'addReviewer', '', 'btn-s', `data-id="${u.id}"`)}</div>` }], rev, { empty: 'Belum ada peninjau. Tambahkan kepala instalasi atau manajemen.' })}</div>
        <div class="panel mt"><div class="panel-h"><h3>Akun pekerja radiasi</h3><span class="small muted">Masuk dengan QR pribadi + PIN</span></div>${U.table([{ h: 'Nama', v: w => `<b>${PR.esc(w.nama)}</b><span class="sub">${PR.esc(w.profesi)}</span>` }, { h: 'NPR', v: w => `<span class="mono small">${PR.esc(w.npr || '—')}</span>` },
          { h: 'Status', v: w => w.aktif === 'tidak' ? PR.tag('nonaktif', 'dash', 1) : cred['p:' + w.id] ? PR.tag('QR aktif', 'aman', 1) : PR.tag('belum ada QR', 'netral', 1) }, { h: 'QR terakhir', v: w => cred['p:' + w.id] ? `<span class="num small">${PR.d(String(cred['p:' + w.id].dibuat || '').slice(0, 10))}</span>` : '—' },
          { h: '', v: w => `<div class="row" style="gap:4px;flex-wrap:nowrap">${w.aktif !== 'tidak' ? `<button class="btn btn-s" data-act="qrWorker" data-id="${w.id}">${PR.ic('qr-code')}QR</button>` : ''}<button class="btn btn-s" data-act="addWorker" data-id="${w.id}">Ubah</button></div>` }], ws, { empty: 'Belum ada pekerja. Tambahkan di Kartu Dosis.' })}</div>
        <p class="small muted mt">Akun pekerja & peninjau gratis. Setiap orang hanya menerima salinan terkunci berisi bagiannya: pekerja melihat dosisnya sendiri (semua tahun), hasil survei, dan SOP berlaku. PIN tersimpan di perangkat mereka — lupa PIN cukup buat QR/tautan baru.</p>`;
    },
    notifikasi: () => {
      if (!NF) setTimeout(muatNotif, 0);
      const nf = NF || {}, n = nf.notif || {}, kal = nf.kalender || {}, tgi = nf.telegram || {}, at = (PR.drive && PR.drive.aturan) ? PR.drive.aturan() : {};
      const tog = (k, label, desc, icon) => `<div class="list-row"><span class="icon-btn" style="border:0;background:var(--sub)">${PR.ic(icon)}</span><div class="grow"><b style="white-space:normal">${label}</b><span style="white-space:normal">${desc}</span></div><label class="switch"><input type="checkbox" data-act="nfSw" data-k="${k}" ${n[k] !== 'tidak' ? 'checked' : ''} ${NF ? '' : 'disabled'}><span></span></label></div>`;
      return `<div class="panel"><div class="panel-h"><h3>Saluran notifikasi</h3>${NF && NF.err ? PR.tag('gagal memuat', 'tinjau', 1) : !NF ? '<span class="small muted">memuat…</span>' : ''}</div><div class="panel-b" style="padding-top:4px;padding-bottom:4px">
        ${NF && NF.err ? `<div class="ban ban-warn">${PR.ic('triangle-alert')}<div class="grow small">${PR.esc(NF.err)} <button class="link small" data-act="tgCek">Coba lagi</button></div></div>` : ''}
        ${tog('rekap', 'Rekap bulanan via email', 'Tanggal 1 setiap bulan ±08.00 WIB: semua jatuh tempo dalam jendela rekap dalam satu email.', 'mail')}
        ${tog('kritis', 'Peringatan kritis via email', 'Dikirim sekali ketika item masuk ambang kritis kategori (lihat tabel di bawah).', 'triangle-alert')}
        <div class="list-row" style="align-items:flex-start"><span class="icon-btn" style="border:0;background:var(--sub)">${PR.ic('send')}</span><div class="grow"><b>Telegram (opsional)</b><span style="white-space:normal">${tgi.terhubung ? 'Terhubung. Rekap & peringatan kritis juga dikirim ke Telegram.' : 'Klik "Hubungkan", lalu tekan Start di Telegram. Tanpa token atau pengaturan bot.'}</span>
          <div class="row mt8">${tgi.terhubung ? `<span class="tag t-aman">Terhubung</span><button class="btn btn-s btn-g" data-act="tgPutus">Putuskan</button>` : tgi.tautan ? `<a class="btn btn-s" href="${PR.esc(tgi.tautan)}" target="_blank" rel="noopener">${PR.ic('send')}Hubungkan Telegram</a><button class="btn btn-s btn-g" data-act="tgCek">Sudah, periksa</button>` : `<span class="small muted">${NF ? 'Telegram belum disiapkan oleh penyedia layanan.' : A.isDemo() ? 'Tidak tersedia di mode demo.' : ''}</span>`}</div></div>${tgi.terhubung ? `<label class="switch"><input type="checkbox" data-act="nfSw" data-k="tg" ${n.tg !== 'tidak' ? 'checked' : ''}><span></span></label>` : ''}</div>
        ${sw('notif_aplikasi', 'Notifikasi di aplikasi', 'Lonceng & angka di menu.', { icon: 'bell' })}</div>
        <div class="panel-b" style="border-top:1px solid var(--line);background:var(--sub)"><div class="row">${PR.ic('clock')}<span class="grow small">Setiap item & tahap pengingat hanya dikirim sekali. Isi email tanpa nama pekerja dan tanpa angka dosis.</span><button class="btn btn-s btn-y" data-act="testNotif">${PR.ic('send')}Kirim rekap uji</button></div></div></div>

      <div class="panel mt"><div class="panel-h"><h3>${PR.ic('calendar')} Google Kalender</h3></div><div class="panel-b">
        <p class="small" style="margin-top:0">Pilih salah satu. <b>Skrip mini</b> memberi pengingat pop-up di HP pukul 08.00; <b>langganan</b> paling mudah tetapi tanpa pop-up (Google hanya menyegarkan beberapa jam sekali).</p>
        <div class="grid g2"><div class="card" style="margin:0"><div class="eyebrow">Disarankan</div><b>Skrip mini (pop-up pukul 08.00)</b><p class="small muted">Dipasang sekali di akun Google Anda, ±2 menit. Tahap ≤ 28 hari menjadi pengingat pop-up; tahap lebih lama dibuat sebagai acara "⏳ H-n" tersendiri.</p><button class="btn btn-s btn-y" data-act="kalSkrip" ${kal.kode ? '' : 'disabled'}>${PR.ic('code')}Tampilkan skrip</button></div>
          <div class="card" style="margin:0"><div class="eyebrow">Alternatif</div><b>Langganan kalender (ICS)</b><p class="small muted">Google Kalender → Setelan → Tambahkan kalender → <i>Dari URL</i> → tempel tautan ini.</p>${kal.ics ? `<input class="inp mono small" readonly value="${PR.esc(kal.ics)}"><div class="row mt8"><button class="btn btn-s" data-act="copyV" data-v="${PR.esc(kal.ics)}">${PR.ic('link')}Salin</button><button class="btn btn-s btn-g" data-act="kalBaru">Buat kode baru</button></div>` : `<span class="small muted">${A.isDemo() ? 'Tidak tersedia di mode demo.' : 'memuat…'}</span>`}</div></div>
        <div class="row mt"><button class="btn btn-s" data-act="calSync">${PR.ic('refresh-cw')}Kirim jadwal terbaru sekarang</button><span class="small muted">Jadwal juga dikirim otomatis setiap kali data berubah.</span></div></div></div>

      <div class="panel mt"><div class="panel-h"><h3>${PR.ic('bell')} Tahap pengingat per kategori</h3><button class="btn btn-s btn-g" data-act="resetTahap">Kembalikan bawaan</button></div><div class="panel-b"><form id="tahapForm" onsubmit="return false">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kategori</th><th>Ingatkan pada (hari sebelum jatuh tempo)</th><th>Kritis bila ≤ (hari)</th></tr></thead><tbody>${L.CATS.map(([k, nm]) => { const x = at[k] || {}; return `<tr><td><b>${nm}</b></td><td><input class="inp mono" name="t_${k}" value="${PR.esc((x.tahapan || []).join(', '))}" placeholder="90, 30, 7" style="max-width:200px"></td><td><input class="inp mono" name="k_${k}" value="${PR.esc(String(x.kritis == null ? 0 : x.kritis))}" inputmode="numeric" style="max-width:90px"></td></tr>`; }).join('')}</tbody></table></div>
        <div class="row mt"><div style="max-width:340px;flex:1 1 260px">${PR.fieldHTML({ k: 'rekap_jendela', label: 'Rekap bulanan memuat jatuh tempo hingga (hari ke depan)', type: 'text' }, PR.set.rekap_jendela || '60')}</div><span class="grow"></span><button class="btn btn-y" data-act="saveTahap" style="margin-top:20px">${PR.ic('check')}Simpan pengingat</button></div>
        <p class="tiny muted" style="margin:6px 0 0">Pisahkan tahap dengan koma, maksimal 5. "Kritis 0" berarti peringatan kritis dikirim saat jatuh tempo/terlewat.</p></form></div></div>
      <p class="small muted mt">Kirim pesan WhatsApp tetap bisa manual lewat tombol "Kirim via WA" di Kalender & Kartu Dosis — tanpa gateway berbayar.</p>`;
    },
    regulasi: () => `<form id="regForm" onsubmit="return false"><div class="grid g2">
        <div class="panel"><div class="panel-h"><h3>Identitas PPR</h3></div><div class="panel-b fgrid">${PR.fieldHTML({ k: 'ppr_nama', label: 'Nama PPR' }, PR.set.ppr_nama)}${PR.fieldHTML({ k: 'ppr_izin_no', label: 'No. Izin Bekerja PPR', mono: 1 }, PR.set.ppr_izin_no)}${PR.fieldHTML({ k: 'ppr_izin_sd', label: 'Izin Bekerja berlaku s.d.', type: 'date', help: 'Perpanjangan diajukan ≥ 30 hari sebelum habis (Perba 4/2024 Ps. 29)' }, PR.set.ppr_izin_sd)}${PR.fieldHTML({ k: 'tanggal_mulai_operasi', label: 'Tanggal mulai operasi modalitas pertama', type: 'date', help: 'Menentukan masa operasi & metode pembatas dosis' }, PR.set.tanggal_mulai_operasi)}</div></div>
        <div class="panel"><div class="panel-h"><h3>Batas laju dosis RS (µSv/jam)</h3><span class="tag">Ditetapkan RS</span></div><div class="panel-b fgrid">${PR.fieldHTML({ k: 'batas_pengendalian', label: 'Daerah pengendalian', type: 'number' }, PR.set.batas_pengendalian)}${PR.fieldHTML({ k: 'batas_supervisi', label: 'Daerah supervisi', type: 'number' }, PR.set.batas_supervisi)}${PR.fieldHTML({ k: 'batas_umum', label: 'Area umum', type: 'number' }, PR.set.batas_umum)}${PR.fieldHTML({ k: 'periode_survei_bulan', label: 'Periode survei berkala (bulan)', type: 'number' }, PR.set.periode_survei_bulan || 12)}
          <div class="full small muted">Regulasi tidak memberi angka µSv/jam baku; batas berasal dari kajian keselamatan RS.</div></div></div>
        <div class="panel"><div class="panel-h"><h3>Nilai Batas Dosis (dikunci sistem)</h3></div><div class="panel-b"><dl class="kv"><dt>Pekerja — rata-rata 5 tahun</dt><dd class="mono">${L.NBD().pekerja_rata5} mSv/tahun</dd><dt>Pekerja — maksimum 1 tahun</dt><dd class="mono">${L.NBD().pekerja_tahun} mSv</dd><dt>Akumulasi 5 tahun</dt><dd class="mono">${L.NBD().pekerja_5tahun} mSv</dd><dt>Lensa mata (acuan)</dt><dd class="mono">${L.NBD().lensa_rata5} mSv/tahun</dd><dt>Lokasi kerja pekerja hamil</dt><dd class="mono">&lt; ${L.NBD().hamil_lokasi} mSv/tahun</dd></dl><p class="small muted">Diperbarui pengembang mengikuti regulasi yang berlaku.</p></div></div>
        <div class="panel"><div class="panel-h"><h3>Lainnya</h3></div><div class="panel-b">${PR.fieldHTML({ k: 'balis_url', label: 'Alamat situs BALIS (untuk tombol "Buka BALIS")', ph: 'https://…' }, PR.set.balis_url)}</div></div>
      </div><div class="row mt" style="justify-content:flex-end"><button class="btn btn-y" data-act="saveReg">${PR.ic('check')}Simpan pengaturan</button></div></form>
      <div class="panel mt"><div class="panel-h"><h3>${PR.ic('gauge')} Kalkulator batas laju dosis</h3><span class="small muted">Contoh hitungan — sesuaikan dengan kajian RS</span></div><div class="panel-b"><form id="calc" class="fgrid" style="grid-template-columns:repeat(3,minmax(0,1fr))" oninput="PR.acts.calcBatas()" onsubmit="return false">${PR.fieldHTML({ k: 'c_target', label: 'Target dosis tahunan area (µSv/tahun)', type: 'number', ph: '1000' }, '')}${PR.fieldHTML({ k: 'c_jam', label: 'Jam penyinaran per tahun', type: 'number', ph: '50' }, '')}${PR.fieldHTML({ k: 'c_okup', label: 'Faktor okupansi', type: 'number', ph: '1' }, '1')}</form><div id="calcOut" class="mt8 small muted">Batas laju dosis = target ÷ (jam penyinaran × okupansi)</div></div></div>`,
    lisensi: () => { const l = PR.lic || {}, rs = L.rs();
      return `<div class="grid g2"><div class="panel"><div class="panel-h"><h3>Status langganan</h3>${PR.tag('paket ' + (l.paket || '—'), 'y', 1)}</div><div class="panel-b"><div style="font:700 28px var(--fh)">Paket ${PR.esc(String(l.paket || '—').toUpperCase())}</div><dl class="kv mt"><dt>Status</dt><dd>${PR.tag(l.status || '—', l.status === 'aktif' ? 'aman' : 'kritis', 1)}</dd><dt>Berlaku s.d.</dt><dd class="mono">${l.berlaku_sd ? PR.d(l.berlaku_sd) : l.mode === 'mandiri' ? 'Pemasangan mandiri' : '—'}</dd><dt>Kuota</dt><dd>1 PPR · 1 RS aktif · pekerja tak terbatas</dd>${l.sisa_pindah != null ? `<dt>Sisa pindah RS tahun ini</dt><dd>${l.sisa_pindah}×</dd>` : ''}</dl>
          <p class="small muted">Perpanjang / upgrade: hubungi ${PR.esc(window.PR_CONFIG.SELLER_CONTACT)}${window.PR_CONFIG.SELLER_WA ? ` · <a href="https://wa.me/${PR.esc(window.PR_CONFIG.SELLER_WA)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}.</p></div></div>
        <div class="panel"><div class="panel-h"><h3>Fasilitas kesehatan aktif</h3><button class="btn btn-s" data-act="saveRS">${PR.ic('pencil')}Ubah</button></div><div class="panel-b"><div style="font:700 22px var(--fh)">${PR.esc(rs.nama || '—')}</div><p class="small">${PR.esc(rs.instalasi || '')}<br>${PR.esc(rs.alamat || '')}</p><div class="kv2"><div><small>Pemegang izin</small>${PR.esc(rs.pemegang_izin || '—')}</div><div><small>Mulai operasi</small>${PR.d(PR.set.tanggal_mulai_operasi)}</div></div></div></div></div>
        <div class="panel mt" style="border-style:dashed"><div class="panel-b spread"><div><b>${PR.ic('arrow-right')} Prosedur pindah RS</b><p class="small muted" style="margin:4px 0 0">Ekspor data RS lama → serahkan ke RS lama/penerus PPR → nonaktifkan & pindah. Rekaman dosis wajib tetap tersimpan ≥ 30 tahun.${PR.set.ekspor_terakhir ? ' Ekspor terakhir: ' + PR.dt(PR.set.ekspor_terakhir) : ''}</p></div><div class="row"><button class="btn" data-act="exportAll">${PR.ic('download')}Ekspor data RS lama (ZIP)</button><button class="btn btn-x" data-act="moveRS">${PR.ic('circle-x')}Nonaktifkan & pindah RS</button></div></div></div>`; },
    privasi: () => { const m = PR.set.tampil_nama_peninjau || 'analisis';
      return `<div class="panel"><div class="panel-h"><h3>Privasi data dosis untuk peninjau</h3></div><div class="panel-b stack" style="gap:10px">${[['tidak', 'Tidak pernah (anonim penuh)', 'Peninjau hanya melihat "Pekerja #n" dan rekap per profesi.'], ['analisis', 'Hanya untuk status Analisis / Kritis (direkomendasikan)', 'Nama dibuka hanya untuk pekerja yang dosisnya melampaui pembatas dosis dan perlu tindakan manajemen.'], ['semua', 'Tampilkan semua nama', 'Peninjau melihat nama seluruh pekerja.']].map(([v, l, d]) => `<label class="rowbtn" style="border-width:1px;${m === v ? 'background:var(--y-t);border-color:var(--ink)' : 'border-color:var(--line2)'}"><input type="radio" name="tnp" value="${v}" ${m === v ? 'checked' : ''} data-tnp style="accent-color:var(--ink)"><div><b style="font-size:14px">${l}</b><span>${d}</span></div></label>`).join('')}
        <div class="ban ban-info" style="margin:0">${PR.ic('lock')}<div class="grow small">Detail MCU tidak pernah tampil ke peninjau atau tamu — hanya jumlah MCU yang berlaku. Surat laik kerja disimpan di folder Drive terbatas dan setiap pembukaan tercatat di Log Akses.</div></div></div></div>`; },
    log: () => `<div class="panel">${U.table([{ h: 'Waktu', v: x => `<span class="num small">${PR.dt(x.waktu)}</span>` }, { h: 'Pengguna', v: x => `<span class="small">${PR.esc(x.email || '—')}</span>` }, { h: 'Peran', v: x => PR.tag(x.peran || '—', 'netral', 1) }, { h: 'Aksi', v: x => PR.esc(x.aksi) }, { h: 'Objek', v: x => `<span class="small muted">${PR.esc(x.objek || '')}</span>` }], PR.extra.log || [], { empty: 'Belum ada log.', foot: '<span>300 entri terakhir · log lengkap di sheet "Log"</span>' })}</div>`,
    aplikasi: () => `<div class="grid g2"><div class="panel"><div class="panel-h"><h3>${PR.ic('monitor-smartphone')} Pasang AlaraGo</h3></div><div class="panel-b">
        <p class="small" style="margin-top:0">AlaraGo bisa dipasang seperti aplikasi di laptop maupun HP (PWA): ikon di layar utama, terbuka tanpa bilah browser, dan tetap bisa dibuka saat sinyal lemah.</p>
        ${PR.installEvt ? `<button class="btn btn-y" data-act="install">${PR.ic('download')}Pasang aplikasi</button>` : `<div class="ban ban-info" style="margin:0">${PR.ic('info')}<div class="grow small">${window.matchMedia('(display-mode: standalone)').matches ? 'AlaraGo sudah terpasang di perangkat ini.' : '<b>Android/Chrome/Edge:</b> menu ⋮ › "Instal aplikasi" / "Tambahkan ke layar utama".<br><b>iPhone/iPad (Safari):</b> tombol Bagikan › "Tambah ke Layar Utama".<br><b>Laptop (Chrome/Edge):</b> ikon pasang di bilah alamat.'}</div></div>`}</div></div>
      <div class="panel"><div class="panel-h"><h3>${PR.ic('info')} Tentang</h3></div><div class="panel-b"><dl class="kv"><dt>Versi aplikasi</dt><dd class="mono">${PR.esc(window.PR_CONFIG.APP_VERSION)}</dd><dt>Data</dt><dd class="small" style="word-break:break-all">${A.isDemo() ? 'mode demo' : `Google Drive · ${PR.esc(PR.LS.get('ag_email', ''))}${PR.drive && PR.drive.dbUrl() ? ` · <a href="${PR.drive.dbUrl()}" target="_blank" rel="noopener">buka spreadsheet</a>` : ''}`}</dd><dt>Perubahan tertunda</dt><dd class="mono">${A.pending()}</dd></dl>
        <div class="row mt"><button class="btn btn-s" data-act="clearCache">${PR.ic('refresh-cw')}Muat ulang data</button></div></div></div></div>`
  };

  PR.page('pengaturan', {
    title: 'Pengaturan', roles: ['ppr'],
    crumb: r => `Pengaturan / <b>${((TABS.find(t => t[0] === (r.parts[0] || 'akses')) || [])[1] || '')}</b>`,
    render: r => { const tab = TABS.find(t => t[0] === r.parts[0]) ? r.parts[0] : 'akses';
      return `${U.head('Konfigurasi & kebijakan proteksi radiasi', 'Akses pengguna, notifikasi, batas laju dosis RS, lisensi, privasi, dan log akses.')}
        <div class="grid" style="grid-template-columns:220px minmax(0,1fr);align-items:start" id="setGrid"><div class="panel" style="position:sticky;top:72px">${TABS.map(([k, l, i]) => `<a href="#/pengaturan/${k}" class="list-row" style="text-decoration:none;padding:11px 14px;${k === tab ? 'background:var(--y-t);box-shadow:inset 3px 0 var(--y)' : ''}">${PR.ic(i)}<div class="grow"><b>${l}</b></div></a>`).join('')}</div><div>${body[tab]()}</div></div>`; },
    mount: root => {
      if (window.innerWidth < 900) { const g = PR.$('#setGrid', root); if (g) g.style.gridTemplateColumns = 'minmax(0,1fr)'; }
      PR.$$('[data-tnp]', root).forEach(r => r.onchange = () => { A.setting('tampil_nama_peninjau', r.value); PR.toast('Pengaturan privasi disimpan', 'ok'); PR.render(); });
    }
  });
})(window.PR);
