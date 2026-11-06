/* AlaraGo — UJI COBA arsitektur baru:
   aplikasi ↔ Google Sheets/Drive milik PPR (izin drive.file, tanpa Apps Script di akun PPR)
   + relay milik penjual (paket terenkripsi, jadwal jatuh tempo, rekap bulanan). */
(function (PR) {
  'use strict';
  const $ = PR.$, esc = PR.esc;
  const CFG = window.PR_CONFIG || {};
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
  const SS = { get: (k, d) => { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const set = () => ({ cid: LS.get('poc_cid', CFG.GOOGLE_CLIENT_ID || ''), relay: LS.get('poc_relay', CFG.RELAY_URL || '') });
  const st = { tok: SS.get('poc_tok', null), email: '', relay: null, db: LS.get('poc_db', null), data: {}, rows: {}, log: [], items: null };

  // ---------------- log & waktu ----------------
  const log = (msg, ms) => { st.log.unshift(`${new Date().toLocaleTimeString('id-ID')}  ${msg}${ms != null ? `  <b>${ms} ms</b>` : ''}`); const el = $('#log'); if (el) el.innerHTML = st.log.slice(0, 80).join('\n'); };
  const timed = async (label, fn) => { const t = performance.now(); try { const r = await fn(); log(label, Math.round(performance.now() - t)); return r; } catch (e) { log('✗ ' + label + ': ' + e.message); throw e; } };

  // ================= GOOGLE (GIS token client, drive.file) =================
  const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';
  let tokenClient = null, pending = null;
  async function gisInit() {
    if (tokenClient) return;
    if (!set().cid) throw new Error('Isi Client ID dulu (langkah 0).');
    if (!(window.google && google.accounts && google.accounts.oauth2)) await PR.loadScript('https://accounts.google.com/gsi/client');
    tokenClient = google.accounts.oauth2.initTokenClient({ client_id: set().cid, scope: SCOPES,
      callback: r => { if (!pending) return; const p = pending; pending = null; if (r.error) return p.rej(new Error(r.error_description || r.error)); st.tok = { at: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 }; SS.set('poc_tok', st.tok); p.res(st.tok); },
      error_callback: e => { if (!pending) return; const p = pending; pending = null; p.rej(new Error(e && e.type === 'popup_closed' ? 'Jendela login ditutup' : (e && (e.message || e.type)) || 'Login gagal')); } });
  }
  function minta(prompt) { return gisInit().then(() => new Promise((res, rej) => { pending = { res, rej }; tokenClient.requestAccessToken({ prompt: prompt == null ? '' : prompt }); })); }
  const sisa = () => st.tok ? Math.round((st.tok.exp - Date.now()) / 60000) : 0;
  // penyegaran "menumpang" klik pengguna: popup diizinkan browser karena terjadi dalam gestur klik
  document.addEventListener('click', () => { if (st.tok && sisa() < 5 && !pending) minta('').then(() => { log('Token diperbarui otomatis saat klik (sisa ' + sisa() + ' menit)'); upd(); }).catch(() => { }); }, true);

  async function g(url, opt, retry) {
    if (!st.tok || st.tok.exp < Date.now() + 15000) { await minta(''); }
    opt = Object.assign({}, opt || {}); opt.headers = Object.assign({ Authorization: 'Bearer ' + st.tok.at }, opt.headers || {});
    const res = await fetch(url, opt);
    if (res.status === 401 && !retry) { st.tok = null; await minta(''); return g(url, opt, true); }
    if (!res.ok) { let m = res.status + ''; try { const j = await res.json(); m = (j.error && j.error.message) || m; } catch (e) { } throw new Error('Google API: ' + m); }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('json') ? res.json() : res.blob();
  }
  const gj = (url, method, body) => g(url, { method: method || 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

  // ================= DATABASE di Drive PPR =================
  const TABS = { Pekerja: ['id', 'nama', 'npr', 'profesi'], Dosis: ['id', 'pekerja_id', 'tahun', 'periode', 'hp10', 'dibaca_pada'], Kredensial: ['id', 'paket', 'kunci', 'dibuat'], Pengaturan: ['id', 'nilai'] };
  const DRV = 'https://www.googleapis.com/drive/v3/files', SHT = 'https://sheets.googleapis.com/v4/spreadsheets';
  async function cariAtauBuatDb() {
    const q = encodeURIComponent("appProperties has { key='alarago' and value='db' } and trashed=false");
    const found = await timed('Cari database di Drive', () => gj(`${DRV}?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`));
    if (found.files && found.files.length) { st.db = found.files[0].id; LS.set('poc_db', st.db); log('Database ditemukan: ' + found.files[0].name); return; }
    const folder = await timed('Buat folder AlaraGo', () => gj(DRV, 'POST', { name: 'AlaraGo', mimeType: 'application/vnd.google-apps.folder', appProperties: { alarago: 'folder' } }));
    const ss = await timed('Buat spreadsheet database', () => gj(DRV, 'POST', { name: 'AlaraGo — Database', mimeType: 'application/vnd.google-apps.spreadsheet', parents: [folder.id], appProperties: { alarago: 'db', folder: folder.id } }));
    const names = Object.keys(TABS);
    await timed('Siapkan tab tabel', () => gj(`${SHT}/${ss.id}:batchUpdate`, 'POST', { requests: [{ updateSheetProperties: { properties: { sheetId: 0, title: names[0] }, fields: 'title' } }].concat(names.slice(1).map(n => ({ addSheet: { properties: { title: n } } }))) }));
    await timed('Tulis judul kolom', () => gj(`${SHT}/${ss.id}/values:batchUpdate`, 'POST', { valueInputOption: 'RAW', data: names.map(n => ({ range: `${n}!A1`, values: [TABS[n]] })) }));
    st.db = ss.id; LS.set('poc_db', st.db); LS.set('poc_folder', folder.id);
  }
  async function bacaSemua() {
    const names = Object.keys(TABS);
    const r = await timed('Baca semua tabel (1 panggilan)', () => gj(`${SHT}/${st.db}/values:batchGet?${names.map(n => 'ranges=' + encodeURIComponent(n + '!A1:Z')).join('&')}`));
    r.valueRanges.forEach((vr, i) => { const n = names[i], vals = vr.values || [], head = vals[0] || TABS[n]; st.rows[n] = {}; st.data[n] = vals.slice(1).map((row, j) => { const o = {}; head.forEach((h, k) => o[h] = row[k] == null ? '' : String(row[k])); st.rows[n][o.id] = j + 2; return o; }).filter(o => o.id); });
  }
  async function simpan(tabel, rows) {
    const cols = TABS[tabel], upd = [], app = [];
    rows.forEach(o => { const v = cols.map(c => o[c] == null ? '' : String(o[c])); if (st.rows[tabel] && st.rows[tabel][o.id]) upd.push({ range: `${tabel}!A${st.rows[tabel][o.id]}`, values: [v] }); else app.push(v); });
    if (upd.length) await timed(`Perbarui ${upd.length} baris ${tabel}`, () => gj(`${SHT}/${st.db}/values:batchUpdate`, 'POST', { valueInputOption: 'RAW', data: upd }));
    if (app.length) {
      const r = await timed(`Tambah ${app.length} baris ${tabel}`, () => gj(`${SHT}/${st.db}/values/${encodeURIComponent(tabel + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', { values: app }));
      const m = (r.updates && r.updates.updatedRange || '').match(/!A(\d+)/); const start = m ? +m[1] : null;
      app.forEach((v, i) => { st.rows[tabel] = st.rows[tabel] || {}; if (start) st.rows[tabel][v[0]] = start + i; });
    }
    st.data[tabel] = st.data[tabel] || [];
    rows.forEach(o => { const i = st.data[tabel].findIndex(x => x.id === o.id); if (i >= 0) st.data[tabel][i] = Object.assign({}, st.data[tabel][i], o); else st.data[tabel].push(o); });
  }
  const pengaturan = (k, d) => { const r = (st.data.Pengaturan || []).find(x => x.id === k); return r ? r.nilai : d; };

  // ================= RELAY =================
  const depId = u => (String(u || '').match(/\/s\/([^/]+)\/exec/) || [])[1] || '';
  const urlDep = d => d ? `https://script.google.com/macros/s/${d}/exec` : '';
  async function relay(action, body, urlOverride) {
    const url = urlOverride || set().relay; if (!url) throw new Error('Isi URL relay dulu (langkah 0).');
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action }, body || {})) });
    const j = await res.json(); if (!j.success) { const e = new Error(j.message || 'Relay gagal'); e.code = j.code; throw e; } return j.data;
  }
  async function relaySesi(action, body) {
    if (!st.relay) st.relay = await timed('Masuk relay (verifikasi token Google)', () => relay('masuk', { at: st.tok.at, rs: 'RS Uji Coba' }));
    try { return await relay(action, Object.assign({ s: st.relay.sesi }, body || {})); }
    catch (e) { if (e.code === 'NO_SESSION') { st.relay = null; return relaySesi(action, body); } throw e; }
  }

  // ================= KRIPTO (AES-GCM 256, di browser) =================
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  const acak = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
  const kunciAes = raw => crypto.subtle.importKey('raw', unb64u(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function kunci(kB64, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await kunciAes(kB64), new TextEncoder().encode(JSON.stringify(obj))); return JSON.stringify({ v: 1, iv: b64u(iv), ct: b64u(ct) }); }
  async function buka(kB64, s) { const o = JSON.parse(s); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(o.iv) }, await kunciAes(kB64), unb64u(o.ct)); return JSON.parse(new TextDecoder().decode(pt)); }
  async function kunciPin(pin, salt) { const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64u(salt), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }

  // ================= PENGINGAT: diatur PPR sendiri =================
  const KAT = [['izin', 'Izin & uji kesesuaian', [90, 30, 7], 7], ['kalibrasi', 'Kalibrasi surveimeter', [60, 14], 0], ['mcu', 'MCU', [30, 7], 0], ['tld', 'TLD & dosis', [14, 3], 0],
    ['dokumen', 'Dokumen', [30], 0], ['laporan', 'Laporan & SDM (B@LIS, Izin Bekerja PPR, pelatihan)', [60, 30], 14], ['temuan', 'Temuan LHI', [14, 3], 3]];
  const aturan = () => { const def = {}; KAT.forEach(([k, , t, c]) => def[k] = { tahapan: t, kritis: c }); try { return Object.assign(def, JSON.parse(pengaturan('pengingat', '{}'))); } catch (e) { return def; } };
  const jendela = () => +pengaturan('rekap_jendela', '60') || 60;
  const contohItems = () => { const t = PR.today(); return [
    { kat: 'izin', judul: 'Izin pemanfaatan GE Definium 646', objek: 'R. X-Ray 1', due: PR.addDays(t, 5) },
    { kat: 'izin', judul: 'Uji kesesuaian Philips Zenition 70', objek: 'R. Bedah OK-3', due: PR.addDays(t, -10) },
    { kat: 'kalibrasi', judul: 'Kalibrasi surveimeter Ludlum 14C', objek: 'SN 289410', due: PR.addDays(t, 20) },
    { kat: 'mcu', judul: 'MCU 3 pekerja', objek: '', due: PR.addDays(t, 40) },
    { kat: 'dokumen', judul: 'Tinjau ulang SOP Pemakaian Apron', objek: 'SOP/RAD/012', due: PR.addDays(t, 95) }]; };

  // ================= TAMPILAN PPR =================
  const card = (n, title, body, done) => `<div class="panel mt ${done ? 'ok' : ''}"><div class="panel-h"><div class="step"><span class="n">${done ? '✓' : n}</span><h3>${title}</h3></div></div><div class="panel-b">${body}</div></div>`;
  function upd() { const e = $('#tokInfo'); if (e) e.textContent = st.tok ? `token berlaku ±${sisa()} menit lagi` : 'belum masuk'; }
  function renderPPR() {
    const c = set(), a = aturan(), items = st.items || (st.items = contohItems()), W = st.data.Pekerja || [], D = st.data.Dosis || [], K = st.data.Kredensial || [];
    $('#root').innerHTML = `<div class="hazard"></div><div class="poc">
      <div class="spread"><div class="row">${PR.logo()}<div><div class="eyebrow">Uji coba arsitektur baru</div><h1 style="margin:4px 0 0">AlaraGo tanpa backend di akun PPR</h1></div></div><a class="btn" href="../">${PR.ic('arrow-left')}Aplikasi utama</a></div>
      <p class="muted">Halaman ini menguji: login Google (izin <span class="mono">drive.file</span>), database langsung di Drive milik Anda, relay terenkripsi untuk pekerja, dan pengingat yang diatur sendiri. Setiap langkah mencatat waktunya di panel log.</p>

      ${card(0, 'Pengaturan uji coba', `<div class="fgrid"><div class="f"><label>Google OAuth Client ID</label><input class="inp mono" id="cid" value="${esc(c.cid)}" placeholder="…apps.googleusercontent.com"></div><div class="f"><label>URL relay (/exec)</label><input class="inp mono" id="rurl" value="${esc(c.relay)}" placeholder="https://script.google.com/macros/s/…/exec"></div></div><button class="btn btn-s mt8" data-a="simpanCfg">Simpan</button>`, c.cid && c.relay)}

      ${card(1, 'Masuk dengan Google', `<div class="row"><button class="btn btn-y" data-a="masuk">${PR.ic('user')}${st.tok ? 'Masuk ulang' : 'Masuk dengan Google'}</button><span class="small mono" id="tokInfo"></span>${st.email ? `<span class="tag t-aman">${esc(st.email)}</span>` : ''}</div>
        <p class="small muted">Izin yang diminta hanya: email & berkas yang dibuat AlaraGo di Drive Anda. Perhatikan: apakah muncul layar "aplikasi belum diverifikasi"?</p>
        <button class="btn btn-s" data-a="segarkan">Uji segarkan token tanpa klik login</button>`, !!st.email)}

      ${card(2, 'Database di Google Drive Anda', `<div class="row"><button class="btn" data-a="db">${PR.ic('folder-open')}Cari / buat database</button>${st.db ? `<a class="btn btn-s" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/${esc(st.db)}">Buka spreadsheet ↗</a>` : ''}</div>
        ${st.db ? `<div class="row mt8"><button class="btn btn-s" data-a="baca">Baca semua tabel</button><button class="btn btn-s" data-a="contoh">Isi contoh (3 pekerja + dosis 2026)</button><button class="btn btn-s" data-a="massal">Uji tulis 200 baris</button><label class="btn btn-s">${PR.ic('upload')}Uji unggah berkas<input type="file" hidden id="upf"></label></div>
        <p class="small">Pekerja: <b>${W.length}</b> · Dosis: <b>${D.length}</b> · Kredensial QR: <b>${K.length}</b></p>` : ''}`, !!st.db && W.length > 0)}

      ${card(3, 'Pengingat — diatur PPR sendiri', `<p class="small muted" style="margin-top:0">Tahapan = H-berapa pengingat muncul (dipisah koma). Kritis = mulai H-berapa email/Telegram "perlu tindakan segera" dikirim (0 = tidak ada). Pengingat Kalender muncul pukul 08.00.</p>
        <div class="tbl-wrap stg"><table class="tbl"><thead><tr><th>Kategori</th><th>Tahapan (H-)</th><th>Kritis (H-)</th></tr></thead><tbody>${KAT.map(([k, l]) => `<tr><td>${l}</td><td><input class="inp mono" data-th="${k}" value="${a[k].tahapan.join(', ')}"></td><td><input class="inp mono" data-kr="${k}" value="${a[k].kritis}"></td></tr>`).join('')}</tbody></table></div>
        <div class="row mt8"><label class="small">Rekap bulanan tgl 1 memuat jatuh tempo ≤ <input class="inp mono" style="width:70px;display:inline-block" id="jendela" value="${jendela()}"> hari</label><button class="btn btn-s" data-a="simpanAturan">Simpan pengaturan</button></div>
        <div class="eyebrow mt">Item jatuh tempo contoh</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Kategori</th><th>Jatuh tempo</th><th>Tahapan</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.judul)}<span class="sub">${esc(i.objek)}</span></td><td>${esc(i.kat)}</td><td class="num">${PR.d(i.due)}</td><td class="mono small">${a[i.kat].tahapan.map(x => 'H-' + x).join(' · ')}</td></tr>`).join('')}</tbody></table></div>
        <div class="row mt8"><button class="btn btn-y" data-a="kirimJadwal">${PR.ic('send')}Kirim jadwal ke relay</button><button class="btn" data-a="ujiRekap">${PR.ic('mail')}Kirim rekap uji sekarang</button></div>
        ${st.relay ? `<div class="kv2 mt"><div><small>Kode skrip mini Kalender</small><span class="mono">${esc(st.relay.kalender.kode)}</span> <button class="link small" data-a="salinKode">salin</button></div><div><small>Kalender langganan (tanpa pop-up)</small><button class="link small" data-a="salinIcs">salin tautan ICS</button></div><div><small>Telegram</small>${st.relay.telegram.terhubung ? 'terhubung' : st.relay.telegram.tautan ? `<a href="${esc(st.relay.telegram.tautan)}" target="_blank" rel="noopener">Hubungkan Telegram ↗</a>` : '<span class="muted">bot belum dipasang di relay</span>'}</div><div><small>Lisensi</small>${esc(st.relay.lisensi.paket)} · s.d. ${PR.d(st.relay.lisensi.berlaku_sd)}</div></div>` : ''}`, false)}

      ${card(4, 'QR pekerja terenkripsi', `${W.length ? U_tbl(W, K, D) : '<p class="small muted">Isi contoh di langkah 2 dulu.</p>'}
        <div class="row mt8"><button class="btn" data-a="ambilBalasan">${PR.ic('refresh-cw')}Ambil konfirmasi "sudah dibaca" dari pekerja</button></div>`, false)}

      <div class="panel mt"><div class="panel-h"><h3>Log & waktu</h3><span class="small muted">batas nyaman: &lt; 1.000 ms per aksi</span></div><div class="log" id="log"></div></div></div>`;
    $('#log').innerHTML = st.log.length ? st.log.slice(0, 80).join('\n') : 'Siap.';
    upd();
    const f = $('#upf'); if (f) f.onchange = () => unggah(f.files[0]);
  }
  function U_tbl(W, K, D) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pekerja</th><th class="r">Hp(10) 2026</th><th>Dibaca</th><th>Akses</th><th></th></tr></thead><tbody>${W.map(w => { const k = K.find(x => x.id === w.id), ds = D.filter(d => d.pekerja_id === w.id && d.tahun === '2026');
      return `<tr><td><b>${esc(w.nama)}</b><span class="sub">${esc(w.profesi)} · ${esc(w.npr)}</span></td><td class="r num">${PR.f(ds.reduce((s, d) => s + PR.n(d.hp10), 0))}</td><td class="small">${ds.filter(d => d.dibaca_pada).length}/${ds.length}</td><td>${k ? PR.tag('QR aktif', 'aman') : PR.tag('belum', 'dash', 1)}</td><td><button class="btn btn-s" data-a="qr" data-id="${esc(w.id)}">${PR.ic('qr-code')}${k ? 'Terbitkan ulang' : 'Buat QR'}</button></td></tr>`; }).join('')}</tbody></table></div>`;
  }

  // ---------------- aksi PPR ----------------
  const A = {};
  A.simpanCfg = () => { LS.set('poc_cid', $('#cid').value.trim()); LS.set('poc_relay', $('#rurl').value.trim()); tokenClient = null; PR.toast('Tersimpan', 'ok'); renderPPR(); };
  A.masuk = async () => { await timed('Login Google (popup izin)', () => minta(st.tok ? '' : 'consent')); const u = await timed('Ambil profil', () => gj('https://www.googleapis.com/oauth2/v3/userinfo')); st.email = u.email; renderPPR(); };
  A.segarkan = async () => { await timed('Segarkan token (prompt kosong)', () => minta('')); PR.toast('Token baru: berlaku ±' + sisa() + ' menit', 'ok'); upd(); };
  A.db = async () => { await cariAtauBuatDb(); await bacaSemua(); renderPPR(); };
  A.baca = async () => { await bacaSemua(); renderPPR(); };
  A.contoh = async () => {
    const W = [['W1', 'Budi Santoso, A.Md.Rad', 'NPR-019', 'Radiografer'], ['W2', 'Sari Dewi, A.Md.Rad', 'NPR-022', 'Radiografer'], ['W3', 'dr. Andi, Sp.Rad', 'NPR-003', 'Dokter Spesialis Radiologi']].map(([id, nama, npr, profesi]) => ({ id, nama, npr, profesi }));
    await simpan('Pekerja', W);
    await simpan('Dosis', W.flatMap((w, i) => [1, 2, 3].map(q => ({ id: `D${w.id}2026${q}`, pekerja_id: w.id, tahun: '2026', periode: 'TW' + q, hp10: String((0.12 + i * 0.1 + q * 0.03).toFixed(2)), dibaca_pada: '' }))));
    renderPPR();
  };
  A.massal = async () => { const rows = []; for (let i = 0; i < 200; i++) rows.push({ id: 'M' + i, pekerja_id: 'UJI-MASSAL', tahun: '2020', periode: 'TW' + (i % 4 + 1), hp10: '0.10', dibaca_pada: '' }); await simpan('Dosis', rows); renderPPR(); };
  async function unggah(file) {
    if (!file) return;
    const folder = LS.get('poc_folder', null), meta = { name: file.name, parents: folder ? [folder] : undefined, appProperties: { alarago: 'berkas' } }, b = 'prb' + Date.now();
    const body = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`, file, `\r\n--${b}--`]);
    const f = await timed(`Unggah ${file.name} (${Math.round(file.size / 1024)} KB)`, () => g('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body }));
    const blob = await timed('Unduh kembali berkas', () => g(`${DRV}/${f.id}?alt=media`));
    PR.toast(`Berkas tersimpan di Drive & terunduh utuh (${blob.size === file.size ? 'ukuran sama' : 'ukuran BERBEDA'})`, blob.size === file.size ? 'ok' : 'err');
  }
  A.simpanAturan = async () => {
    const a = aturan(); KAT.forEach(([k]) => { a[k] = { tahapan: $(`[data-th=${k}]`).value.split(/[,\s]+/).map(Number).filter(x => x > 0 && x <= 365).sort((x, y) => y - x).slice(0, 6), kritis: Math.max(0, Math.min(90, +$(`[data-kr=${k}]`).value || 0)) }; });
    await simpan('Pengaturan', [{ id: 'pengingat', nilai: JSON.stringify(a) }, { id: 'rekap_jendela', nilai: String(Math.max(14, Math.min(180, +$('#jendela').value || 60))) }]);
    PR.toast('Pengaturan pengingat tersimpan di Drive Anda', 'ok'); renderPPR();
  };
  A.kirimJadwal = async () => {
    const a = aturan();
    const items = st.items.map(i => ({ key: i.kat + ':' + i.judul.replace(/\W+/g, '').slice(0, 30) + ':' + i.due, kat: i.kat, judul: i.judul, objek: i.objek, due: i.due, tahapan: a[i.kat].tahapan, kritis: a[i.kat].kritis, status: '' }));
    const r = await timed('Kirim jadwal (tanpa nama & dosis) ke relay', () => relaySesi('jadwal', { data: { rs: 'RS Uji Coba', jendela: jendela(), ringkas: { temuan_terbuka: 2, skor: 84 }, items } }));
    PR.toast(r.n + ' item jatuh tempo terkirim', 'ok'); renderPPR();
  };
  A.ujiRekap = async () => { const r = await timed('Rekap uji via relay', () => relaySesi('ujiRekap')); PR.toast(`Rekap: ${r.lewat} lewat tempo, ${r.dekat} jatuh tempo · email ${r.email ? 'terkirim' : 'GAGAL'}${r.telegram ? ' · Telegram terkirim' : ''}`, r.email ? 'ok' : 'warn'); };
  A.salinKode = () => PR.copy(st.relay.kalender.kode);
  A.salinIcs = () => PR.copy(st.relay.kalender.ics);
  A.qr = async el => {
    const w = st.data.Pekerja.find(x => x.id === el.dataset.id), old = (st.data.Kredensial || []).find(k => k.id === w.id);
    if (old) await relaySesi('hapusPaket', { ids: [old.paket] }).catch(() => { });
    const cred = { id: w.id, paket: acak(18), kunci: acak(32), dibuat: new Date().toISOString() };
    await simpan('Kredensial', [cred]);
    await terbitkan([w.id]);
    const link = `${location.origin}${location.pathname}#/w?p=${cred.paket}&k=${cred.kunci}&r=${depId(set().relay)}`;
    PR.modal({ title: 'QR akses pekerja (uji coba)', body: `<div class="grid g2"><div class="qrbox" id="qrw"></div><div><h3>${esc(w.nama)}</h3><p class="small muted">Kunci pembuka ada di QR ini (bagian setelah #) dan tidak pernah dikirim ke relay. QR lama otomatis tidak berlaku.</p><input class="inp mono small" readonly value="${esc(link)}"><div class="row mt8"><button class="btn btn-s" id="cp">${PR.ic('link')}Salin tautan</button><a class="btn btn-s" href="${esc(link)}" target="_blank" rel="noopener">Buka sebagai pekerja ↗</a></div></div></div>`,
      onMount: m => { PR.qr(link, $('#qrw', m)); $('#cp', m).onclick = () => PR.copy(link); } });
    renderPPR();
  };
  async function terbitkan(ids) {
    const items = [];
    for (const id of ids) {
      const k = st.data.Kredensial.find(x => x.id === id), w = st.data.Pekerja.find(x => x.id === id); if (!k || !w) continue;
      const pkg = { rs: 'RS Uji Coba', pekerja: w, dosis: (st.data.Dosis || []).filter(d => d.pekerja_id === id && /^D/.test(d.id)), dibuat: new Date().toISOString() };
      items.push({ id: k.paket, jenis: 'pekerja', data: await kunci(k.kunci, pkg) });
    }
    if (items.length) await timed(`Enkripsi & terbitkan ${items.length} paket pekerja`, () => relaySesi('terbit', { items }));
  }
  A.ambilBalasan = async () => {
    const list = await timed('Ambil balasan dari relay', () => relaySesi('balasan'));
    const upd = [], done = [];
    for (const b of list) {
      const k = (st.data.Kredensial || []).find(x => x.paket === b.paket_id); if (!k) { done.push(b.id); continue; }
      try { const m = await buka(k.kunci, b.data); if (m.t === 'baca') { const d = st.data.Dosis.find(x => x.id === m.dosis_id && x.pekerja_id === k.id); if (d && !d.dibaca_pada) upd.push(Object.assign({}, d, { dibaca_pada: m.waktu })); } } catch (e) { log('Balasan tak bisa dibuka (kunci lama?)'); }
      done.push(b.id);
    }
    if (upd.length) await simpan('Dosis', upd);
    if (done.length) await relaySesi('hapusBalasan', { ids: done });
    if (upd.length) await terbitkan([...new Set(upd.map(d => d.pekerja_id))]);
    PR.toast(`${upd.length} konfirmasi baca dicatat di spreadsheet Anda`, 'ok'); renderPPR();
  };

  // ================= TAMPILAN PEKERJA (#/w) =================
  const WK = 'poc_pekerja';
  async function renderPekerja(q) {
    const root = $('#root');
    const shell = inner => `<div class="hazard"></div><div class="wk"><div class="row mb">${PR.logo()}<b style="font:700 18px var(--fh)">AlaraGo</b><span class="tag">Portal pekerja · uji coba</span></div>${inner}</div>`;
    if (q.p && q.k) {   // baru memindai QR → buat PIN, simpan kunci terkunci PIN di perangkat
      history.replaceState(null, '', location.pathname + '#/w');
      root.innerHTML = shell(`<div class="panel"><div class="panel-b"><h2 style="margin-top:0">Buat PIN 6 digit</h2><p class="small muted">PIN mengunci akses di perangkat ini. Lupa PIN? Minta QR baru ke PPR.</p><input class="inp mono" id="pin1" type="password" inputmode="numeric" maxlength="6" placeholder="••••••" style="font-size:24px;height:54px;letter-spacing:.4em"><input class="inp mono mt8" id="pin2" type="password" inputmode="numeric" maxlength="6" placeholder="ulangi" style="font-size:24px;height:54px;letter-spacing:.4em"><button class="btn btn-y btn-b mt" id="go">Simpan PIN & buka</button></div></div>`);
      $('#go').onclick = async () => { const p1 = $('#pin1').value, p2 = $('#pin2').value; if (!/^\d{6}$/.test(p1) || p1 !== p2) return PR.toast('PIN harus 6 digit dan sama', 'warn');
        const salt = acak(16), key = await kunciPin(p1, salt), iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ p: q.p, k: q.k, r: q.r || depId(set().relay) })));
        LS.set(WK, { salt, iv: b64u(iv), ct: b64u(ct), gagal: 0 }); muat({ p: q.p, k: q.k, r: q.r || depId(set().relay) }); };
      return;
    }
    const sv = LS.get(WK, null);
    if (!sv) { root.innerHTML = shell(`<div class="ban ban-info">${PR.ic('qr-code')}<div class="grow">Pindai QR dari PPR untuk membuka data dosis Anda.</div></div>`); return; }
    root.innerHTML = shell(`<div class="panel"><div class="panel-b"><h2 style="margin-top:0">Masukkan PIN</h2><input class="inp mono" id="pin" type="password" inputmode="numeric" maxlength="6" style="font-size:24px;height:54px;letter-spacing:.4em"><button class="btn btn-y btn-b mt" id="go">Buka</button><p class="small muted mt8">Sisa percobaan: ${5 - (sv.gagal || 0)}</p></div></div>`);
    $('#go').onclick = async () => {
      try { const key = await kunciPin($('#pin').value, sv.salt); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(sv.iv) }, key, unb64u(sv.ct)); sv.gagal = 0; LS.set(WK, sv); muat(JSON.parse(new TextDecoder().decode(pt))); }
      catch (e) { sv.gagal = (sv.gagal || 0) + 1; if (sv.gagal >= 5) { LS.del(WK); PR.toast('5× PIN salah — akses di perangkat ini dihapus. Pindai ulang QR.', 'err'); return renderPekerja({}); } LS.set(WK, sv); PR.toast('PIN salah', 'err'); renderPekerja({}); }
    };
    async function muat(cr) {
      root.innerHTML = shell('<div class="sk"></div><div class="sk"></div>');
      try {
        const t0 = performance.now(); const r = await relay('ambil', { p: cr.p }, urlDep(cr.r)); const d = await buka(cr.k, r.data); const ms = Math.round(performance.now() - t0);
        const tot = d.dosis.reduce((s, x) => s + PR.n(x.hp10), 0);
        root.innerHTML = shell(`<div class="panel"><div class="panel-b"><h2 style="margin:0">${esc(d.pekerja.nama)}</h2><p class="small muted" style="margin:4px 0 0">${esc(d.pekerja.profesi)} · ${esc(d.pekerja.npr)} · ${esc(d.rs)}</p></div></div>
          <div class="panel mt"><div class="panel-b"><div class="eyebrow">Dosis Hp(10) 2026</div><div style="font:700 40px var(--fm)">${PR.f(tot)} <span style="font-size:16px">mSv</span></div>
          ${d.dosis.map(x => `<div class="list-row"><div class="grow"><b>${esc(x.periode)} ${esc(x.tahun)}</b><span class="mono">${PR.f(PR.n(x.hp10))} mSv</span></div>${x.dibaca_pada ? `<span class="small">${PR.ic('circle-check', 'ic-s')} dibaca</span>` : `<button class="btn btn-s btn-y" data-baca="${esc(x.id)}">Sudah saya baca</button>`}</div>`).join('')}</div></div>
          <p class="small muted mt">Data diambil & dibuka di HP ini dalam ${ms} ms. Relay hanya menyimpan versi terkunci.</p><button class="btn btn-s" id="kel">Kunci (keluar)</button>`);
        root.querySelectorAll('[data-baca]').forEach(b => b.onclick = async () => { b.disabled = true; try { await relay('balas', { p: cr.p, data: await kunci(cr.k, { t: 'baca', dosis_id: b.dataset.baca, waktu: new Date().toISOString() }) }, urlDep(cr.r)); b.outerHTML = '<span class="small">✓ terkirim ke PPR</span>'; } catch (e) { PR.toast(e.message, 'err'); b.disabled = false; } });
        $('#kel').onclick = () => renderPekerja({});
      } catch (e) { root.innerHTML = shell(`<div class="ban ban-crit">${PR.ic('triangle-alert')}<div class="grow">${esc(e.message)}</div></div>`); }
    }
  }

  // ================= ROUTER =================
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b || !A[b.dataset.a]) return;
    e.preventDefault(); b.disabled = true;
    try { await A[b.dataset.a](b); } catch (err) { PR.toast(err.message, 'err'); } finally { b.disabled = false; }
  });
  function route() {
    const h = location.hash.slice(1), [path, qs] = h.split('?'), q = {}; new URLSearchParams(qs || '').forEach((v, k) => q[k] = v);
    if (path === '/w') return renderPekerja(q);
    renderPPR();
    if (st.tok && st.tok.exp > Date.now() && !st.email) gj('https://www.googleapis.com/oauth2/v3/userinfo').then(u => { st.email = u.email; if (st.db) return bacaSemua(); }).then(renderPPR).catch(() => { });
  }
  window.addEventListener('hashchange', route);
  setInterval(upd, 30000);
  route();
})(window.PR);
