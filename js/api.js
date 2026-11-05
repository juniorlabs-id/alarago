/* ProteRad — lapisan API: fetch ke GAS, cache lokal (instan), antrean tulis (optimistic + offline) */
(function (PR) {
  'use strict';
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { } }
  };
  PR.LS = LS;
  const cfg = () => window.PR_CONFIG || {};
  const A = PR.api = {};

  // ---------- alamat backend ----------
  A.depId = url => { const m = String(url || '').match(/\/s\/([^/]+)\/exec/); return m ? m[1] : (/^[\w-]{20,}$/.test(url || '') ? url : ''); };
  A.urlFromId = id => id === 'demo' ? 'demo' : id ? `https://script.google.com/macros/s/${id}/exec` : '';
  A.url = () => LS.get('pr_backend', '') || cfg().DEFAULT_BACKEND_URL || '';
  A.setUrl = u => { LS.set('pr_backend', u); };
  A.isDemo = () => A.url() === 'demo';
  A.bId = () => A.isDemo() ? 'demo' : A.depId(A.url());
  const ns = () => 'pr_' + (A.bId() || 'x').slice(-10) + '_';
  A.session = () => LS.get(ns() + 'sess', null);
  A.setSession = s => LS.set(ns() + 'sess', s);
  A.logout = () => { LS.del(ns() + 'sess'); LS.del(ns() + 'cache'); };

  // ---------- panggilan dasar ----------
  A.raw = async (url, action, body) => {
    if (url === 'demo') return PR.demo.handle(action, body || {});
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 45000);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action }, body || {})), signal: ctl.signal, redirect: 'follow' });
      const j = await res.json();
      return j;
    } catch (e) {
      const err = new Error(navigator.onLine ? 'Server tidak merespons. Coba lagi sebentar.' : 'Tidak ada koneksi internet.'); err.network = true; throw err;
    } finally { clearTimeout(to); }
  };
  A.call = async (action, body, url) => {
    const j = await A.raw(url || A.url(), action, Object.assign({ s: A.session() }, body || {}));
    if (!j || !j.success) {
      const e = new Error((j && j.message) || 'Gagal'); e.code = j && j.code;
      if (e.code === 'NO_SESSION') { A.logout(); setTimeout(() => PR.go('#/masuk'), 50); }
      throw e;
    }
    return j.data;
  };

  // ---------- bootstrap dengan cache (stale-while-revalidate) ----------
  A.apply = d => {
    PR.db = d.tables || {}; PR.set = d.settings || {}; PR.me = d.me; PR.lic = d.license || PR.lic; PR._today = d.today || PR._today;
    PR.extra = { tautan: d.tautan || [], log: d.log || [], kredensial: d.kredensial || [] };
    applyOutbox();
  };
  A.loadCache = () => { const c = LS.get(ns() + 'cache', null); if (c && c.tables) { A.apply(c); A.ver = c.ver; return true; } return false; };
  A.boot = async force => {
    const c = force ? null : LS.get(ns() + 'cache', null);
    const d = await A.call('bootstrap', { ver: c && c.ver });
    if (d.notModified && c) { if (d.license) { c.license = d.license; PR.lic = d.license; LS.set(ns() + 'cache', c); } A.lastBoot = Date.now(); return false; }
    LS.set(ns() + 'cache', d); A.ver = d.ver; A.apply(d); A.lastBoot = Date.now();
    return true;
  };
  const saveCache = () => { const c = LS.get(ns() + 'cache', null); if (!c) return; c.tables = PR.db; c.settings = PR.set; c.ver = A.ver; LS.set(ns() + 'cache', c); };

  // ---------- antrean tulis ----------
  const outbox = () => LS.get(ns() + 'outbox', []);
  const setOutbox = o => { LS.set(ns() + 'outbox', o); PR.ui && PR.ui.syncBar && PR.ui.syncBar(o.length); };
  function applyLocal(op) {
    const t = PR.db[op.t] = PR.db[op.t] || [];
    if (op.op === 'remove') { const i = t.findIndex(r => String(r.id) === String(op.id)); if (i >= 0) t.splice(i, 1); }
    else { const i = t.findIndex(r => String(r.id) === String(op.row.id)); if (i >= 0) t[i] = Object.assign({}, t[i], op.row); else t.push(op.row); }
    if (op.t === 'Pengaturan') { if (op.op === 'remove') delete PR.set[op.id]; else PR.set[op.row.id] = op.row.nilai; }
  }
  function applyOutbox() { outbox().forEach(applyLocal); }
  A.pending = () => outbox().length;
  A.save = (t, row, opt) => {
    row = Object.assign({}, row); if (!row.id) row.id = PR.uid(t.slice(0, 2).toUpperCase());
    const op = { op: 'save', t, row }; if (opt && opt.notify) op.notify = opt.notify;
    applyLocal(op); setOutbox(outbox().concat([op])); saveCache(); A.flushSoon();
    return row;
  };
  A.saveMany = (t, rows, opt) => { const ops = rows.map(r => { r = Object.assign({}, r); if (!r.id) r.id = PR.uid(t.slice(0, 2).toUpperCase()); const op = { op: 'save', t, row: r }; if (opt && opt.notify) op.notify = opt.notify; applyLocal(op); return op; }); setOutbox(outbox().concat(ops)); saveCache(); A.flushSoon(); return ops.map(o => o.row); };
  A.remove = (t, id) => { const op = { op: 'remove', t, id }; applyLocal(op); setOutbox(outbox().concat([op])); saveCache(); A.flushSoon(); };
  A.setting = (k, v) => A.save('Pengaturan', { id: k, nilai: v == null ? '' : String(v) });
  let flushing = false, timer = null;
  A.flushSoon = () => { clearTimeout(timer); timer = setTimeout(A.flush, 350); };
  A.flush = async () => {
    if (flushing) return A.flushSoon(); const ops = outbox(); if (!ops.length) return;
    flushing = true;
    try {
      const d = await A.call('batch', { ops });
      const rest = outbox().slice(ops.length); setOutbox(rest);
      A.ver = rest.length ? A.ver : d.ver; saveCache();
    } catch (e) {
      if (e.network) { PR.ui && PR.ui.syncBar && PR.ui.syncBar(outbox().length, true); }
      else { setOutbox(outbox().slice(ops.length)); PR.toast('Gagal menyimpan: ' + e.message, 'err'); A.boot(true).then(() => PR.render()).catch(() => { }); }
    } finally { flushing = false; }
  };
  window.addEventListener('online', () => A.flush());

  // ---------- berkas ----------
  const fileCache = {};
  A.upload = async (file, kind) => {
    if (file.size > 15 * 1024 * 1024) throw new Error('Berkas terlalu besar (maks 15 MB)');
    const data = await PR.fileToB64(file);
    const d = await A.call('upload', { name: file.name, mime: file.type || 'application/octet-stream', data, kind: kind || '' });
    fileCache[d.id] = { url: URL.createObjectURL(file), nama: file.name, mime: file.type };
    return d;
  };
  A.file = async (id, guest) => {
    if (fileCache[id]) return fileCache[id];
    const d = guest ? await A.call('guestFile', { id, g: guest.g }, guest.url) : await A.call('getFile', { id });
    const bin = atob(d.data), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: d.mime }));
    return (fileCache[id] = { url, nama: d.nama, mime: d.mime, blob: new Blob([arr], { type: d.mime }) });
  };
  A.openFile = async (id, guest) => {
    if (!id) return PR.toast('Berkas belum diunggah', 'warn');
    const w = window.open('', '_blank');
    try { const f = await A.file(id, guest); if (w) w.location = f.url; else PR.download(f.nama, f.blob || await (await fetch(f.url)).blob()); }
    catch (e) { if (w) w.close(); PR.toast(e.message, 'err'); }
  };
  // simpan berkas dari form (_files) → id; dipakai semua form
  A.uploadFrom = async (vals, key, kind) => {
    const f = vals._files && vals._files[key]; if (!f) return vals[key] || '';
    PR.toast('Mengunggah ' + f.name + '…');
    const d = await A.upload(f, kind); return d.id;
  };
})(window.PR);
