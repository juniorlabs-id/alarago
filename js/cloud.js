/* AlaraGo — fondasi arsitektur baru:
   PR.G  login Google (GIS token, izin drive.file) + pemanggil Google API
   PR.K  kripto di browser (AES-GCM 256, PIN via PBKDF2)
   PR.R  klien relay milik penjual */
(function (PR) {
  'use strict';
  const cfg = () => window.PR_CONFIG || {};
  const SS = { get: (k, d) => { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del: k => { try { sessionStorage.removeItem(k); } catch (e) { } } };
  PR.SS = SS;
  PR.LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };

  // ======================= GOOGLE =======================
  const G = PR.G = {};
  const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';
  let client = null, pending = null;
  G.tok = SS.get('ag_tok', null);
  G.sisa = () => G.tok ? Math.round((G.tok.exp - Date.now()) / 60000) : 0;
  async function init() {
    if (client) return;
    if (!cfg().GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID belum diisi di js/config.js.');
    if (!(window.google && google.accounts && google.accounts.oauth2)) await PR.loadScript('https://accounts.google.com/gsi/client');
    client = google.accounts.oauth2.initTokenClient({ client_id: cfg().GOOGLE_CLIENT_ID, scope: SCOPES,
      callback: r => { const p = pending; pending = null; if (!p) return; if (r.error) return p.rej(new Error(r.error_description || r.error));
        if (!google.accounts.oauth2.hasGrantedAllScopes(r, 'https://www.googleapis.com/auth/drive.file')) return p.rej(new Error('Izin "berkas yang dibuat AlaraGo di Drive" wajib dicentang agar data bisa disimpan.'));
        G.tok = { at: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 }; SS.set('ag_tok', G.tok); p.res(G.tok); },
      error_callback: e => { const p = pending; pending = null; if (p) p.rej(new Error(e && e.type === 'popup_closed' ? 'Jendela login ditutup sebelum selesai.' : e && e.type === 'popup_failed_to_open' ? 'Popup login diblokir browser. Izinkan popup untuk situs ini.' : 'Login Google gagal.')); } });
  }
  G.minta = prompt => init().then(() => new Promise((res, rej) => { if (pending) pending.rej(new Error('dibatalkan')); pending = { res, rej }; client.requestAccessToken({ prompt: prompt == null ? '' : prompt, hint: PR.LS && PR.LS.get('ag_email', '') || undefined }); }));
  G.valid = () => !!(G.tok && G.tok.exp > Date.now() + 60000);
  G.keluar = () => { try { if (G.tok && window.google && google.accounts.oauth2) google.accounts.oauth2.revoke(G.tok.at, () => { }); } catch (e) { } G.tok = null; SS.del('ag_tok'); };
  // penyegaran "menumpang" klik pengguna (popup diizinkan karena terjadi dalam gestur)
  document.addEventListener('click', () => { if (G.tok && G.sisa() < 6 && !pending && PR.api && PR.api.mode && PR.api.mode() === 'drive') G.minta('').catch(() => { }); }, true);
  G.perluLogin = () => { const e = new Error('Sesi Google berakhir. Klik "Lanjutkan" untuk masuk lagi.'); e.code = 'GOOGLE_AUTH'; return e; };
  G.fetch = async (url, opt, retry) => {
    if (!G.valid()) { try { await G.minta(''); } catch (e) { throw G.perluLogin(); } }
    opt = Object.assign({}, opt || {}); opt.headers = Object.assign({ Authorization: 'Bearer ' + G.tok.at }, opt.headers || {});
    let res;
    try { res = await fetch(url, opt); } catch (e) { const er = new Error(navigator.onLine ? 'Google tidak merespons. Coba lagi sebentar.' : 'Tidak ada koneksi internet.'); er.network = true; throw er; }
    if (res.status === 401 && !retry) { G.tok = null; try { await G.minta(''); } catch (e) { throw G.perluLogin(); } return G.fetch(url, opt, true); }
    if (res.status === 429 && !retry) { await new Promise(r => setTimeout(r, 1500)); return G.fetch(url, opt, true); }
    if (!res.ok) { let m = 'HTTP ' + res.status; try { const j = await res.json(); m = (j.error && j.error.message) || m; } catch (e) { } const er = new Error('Google: ' + m); er.status = res.status; throw er; }
    if (opt.raw) return res;
    const ct = res.headers.get('content-type') || ''; return ct.includes('json') ? res.json() : res.blob();
  };
  G.json = (url, method, body) => G.fetch(url, { method: method || 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  G.profil = () => G.json('https://www.googleapis.com/oauth2/v3/userinfo');

  // ======================= KRIPTO =======================
  const K = PR.K = {};
  K.b64u = buf => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  K.unb64u = s => { const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  K.acak = n => K.b64u(crypto.getRandomValues(new Uint8Array(n)));
  const imp = raw => crypto.subtle.importKey('raw', K.unb64u(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
  K.kunciBytes = async (k, bytes) => { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await imp(k), bytes); return JSON.stringify({ v: 1, iv: K.b64u(iv), ct: K.b64u(ct) }); };
  K.bukaBytes = async (k, s) => { const o = typeof s === 'string' ? JSON.parse(s) : s; return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: K.unb64u(o.iv) }, await imp(k), K.unb64u(o.ct))); };
  K.kunci = (k, obj) => K.kunciBytes(k, new TextEncoder().encode(JSON.stringify(obj)));
  K.buka = async (k, s) => JSON.parse(new TextDecoder().decode(await K.bukaBytes(k, s)));
  K.hash = async s => K.b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).slice(0, 22);
  async function pinKey(pin, salt) { const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: K.unb64u(salt), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
  K.bungkusPin = async (pin, obj) => { const salt = K.acak(16), iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await pinKey(pin, salt), new TextEncoder().encode(JSON.stringify(obj))); return { salt, iv: K.b64u(iv), ct: K.b64u(ct) }; };
  K.bukaPin = async (pin, w) => JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: K.unb64u(w.iv) }, await pinKey(pin, w.salt), K.unb64u(w.ct))));

  // ======================= RELAY =======================
  const R = PR.R = {};
  R.depId = u => (String(u || '').match(/\/s\/([^/]+)\/exec/) || [])[1] || '';
  R.urlDep = d => d ? `https://script.google.com/macros/s/${d}/exec` : '';
  R.url = () => cfg().RELAY_URL || '';
  R.dep = () => R.depId(R.url());
  R.call = async (action, body, url) => {
    url = url || R.url(); if (!url) throw new Error('RELAY_URL belum diisi di js/config.js.');
    let res;
    try { res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action }, body || {})) }); }
    catch (e) { const er = new Error(navigator.onLine ? 'Layanan AlaraGo tidak merespons. Coba lagi sebentar.' : 'Tidak ada koneksi internet.'); er.network = true; throw er; }
    let j; try { j = await res.json(); } catch (e) { throw new Error('Jawaban layanan AlaraGo tidak terbaca.'); }
    if (!j.success) { const e = new Error(j.message || 'Gagal'); e.code = j.code; throw e; }
    return j.data;
  };
  let sesi = SS.get('ag_relay', null);
  R.masuk = async extra => { if (!G.valid()) await G.minta(''); sesi = await R.call('masuk', Object.assign({ at: G.tok.at }, extra || {})); SS.set('ag_relay', sesi); return sesi; };
  R.info = () => sesi;
  R.sesi = async (action, body) => {
    if (!sesi) await R.masuk();
    try { return await R.call(action, Object.assign({}, body || {}, { s: sesi.sesi })); }
    catch (e) { if (e.code === 'NO_SESSION') { sesi = null; await R.masuk(); return R.call(action, Object.assign({}, body || {}, { s: sesi.sesi })); } throw e; }
  };
  R.lupa = () => { sesi = null; SS.del('ag_relay'); };
})(window.PR);
