/* AlaraGo — "driver" penerima: pekerja & peninjau (QR + PIN), tamu (tautan), QR pintu.
   Data datang dari relay dalam bentuk terkunci dan hanya dibuka di perangkat ini. */
(function (PR) {
  'use strict';
  const K = PR.K, R = PR.R, LS = PR.LS, SS = PR.SS;
  const P = PR.akses = {};
  const ok = d => ({ success: true, data: d });
  const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const nowISO = () => new Date().toISOString();
  const KEY = 'ag_akses';

  P.tersimpan = () => LS.get(KEY, null);
  P.terbuka = () => SS.get('ag_akses_buka', null);
  P.hapus = () => { LS.del(KEY); SS.del('ag_akses_buka'); try { localStorage.removeItem('pr_akses_cache'); } catch (e) { } };
  P.kunci = () => SS.del('ag_akses_buka');
  const relayUrl = cr => R.urlDep(cr.r) || R.url();

  async function ambil(cr, p, k) { const r = await R.call('ambil', { p }, relayUrl(cr)); return { raw: r.data, obj: await K.buka(k, r.data) }; }

  // paket utama (+ paket bersama untuk pekerja) → bentuk data seperti bootstrap lama
  function rakit(cr, main, bersama) {
    let tables, settings, berkas, me;
    if (main.jenis === 'pekerja') {
      tables = Object.assign({}, (bersama && bersama.tables) || {}, main.tables);
      settings = (bersama && bersama.settings) || {}; berkas = (bersama && bersama.berkas) || {};
      const w = main.tables.Pekerja[0] || {}; me = { role: 'pekerja', id: w.id, nama: w.nama };
    } else {
      tables = main.tables; settings = main.settings || {}; berkas = main.berkas || {};
      me = { role: 'peninjau', id: (main.saya || {}).id, nama: (main.saya || {}).nama || 'Peninjau', jabatan: (main.saya || {}).jabatan };
    }
    P.berkas = berkas;
    const d = { tables, settings, me, license: { status: 'aktif', paket: 'akses' }, today: today(), ver: main.dibuat, kredensial: [], tautan: [], log: [] };
    terapkanOverlay(d.tables);
    return d;
  }
  async function muatJaringan(cr) {
    const m = await ambil(cr, cr.p, cr.k);
    let b = null, bRaw = null;
    if (m.obj.jenis === 'pekerja' && m.obj.bersama) { try { const x = await ambil(cr, m.obj.bersama.p, m.obj.bersama.k); b = x.obj; bRaw = x.raw; } catch (e) { } }
    const s = P.tersimpan(); if (s) { s.cache = { main: m.raw, bersama: bRaw }; LS.set(KEY, s); }
    return rakit(cr, m.obj, b);
  }
  async function muatCache(cr) {
    const s = P.tersimpan(); if (!s || !s.cache || !s.cache.main) return null;
    try { const main = await K.buka(cr.k, s.cache.main); const b = s.cache.bersama && main.bersama ? await K.buka(main.bersama.k, s.cache.bersama) : null; return rakit(cr, main, b); } catch (e) { return null; }
  }

  // perubahan lokal yang sudah dikirim tapi belum muncul di paket berikutnya dari PPR
  function overlay() { const s = P.tersimpan(); return (s && s.overlay) || []; }
  function tambahOverlay(o) { const s = P.tersimpan(); if (!s) return; s.overlay = (s.overlay || []).concat([Object.assign({ w: Date.now() }, o)]).filter(x => Date.now() - x.w < 30 * 864e5); LS.set(KEY, s); }
  function terapkanOverlay(t) {
    overlay().forEach(o => { const arr = t[o.t] = t[o.t] || []; const i = arr.findIndex(r => r.id === o.id);
      if (i >= 0) arr[i] = Object.assign({}, arr[i], o.set); else if (o.baru) arr.push(Object.assign({ id: o.id }, o.set)); });
  }
  async function balas(obj) { const cr = P.terbuka(); await R.call('balas', { p: cr.p, data: await K.kunci(cr.k, Object.assign({ waktu: nowISO() }, obj)) }, relayUrl(cr)); }

  // ---------- mulai baru dari QR ----------
  P.periksa = async q => { const cr = { r: q.r, p: q.p, k: q.k }; const m = await ambil(cr, cr.p, cr.k); return { jenis: m.obj.jenis, nama: m.obj.jenis === 'pekerja' ? (m.obj.tables.Pekerja[0] || {}).nama : (m.obj.saya || {}).nama, profesi: m.obj.jenis === 'pekerja' ? (m.obj.tables.Pekerja[0] || {}).profesi : (m.obj.saya || {}).jabatan, rs: '' }; };
  P.aktifkan = async (q, pin, jenis) => {
    const cr = { r: q.r, p: q.p, k: q.k, jenis };
    P.hapus();
    LS.set(KEY, { wrap: await K.bungkusPin(pin, cr), gagal: 0, jenis, overlay: [] });
    SS.set('ag_akses_buka', cr);
    return cr;
  };
  P.buka = async pin => {
    const s = P.tersimpan(); if (!s) throw new Error('Akses belum diatur di perangkat ini. Pindai QR dari PPR.');
    try { const cr = await K.bukaPin(pin, s.wrap); s.gagal = 0; LS.set(KEY, s); SS.set('ag_akses_buka', cr); return cr; }
    catch (e) { s.gagal = (s.gagal || 0) + 1; if (s.gagal >= 5) { P.hapus(); const er = new Error('5× PIN salah. Akses di perangkat ini dihapus — pindai ulang QR dari PPR.'); er.code = 'WIPED'; throw er; } LS.set(KEY, s); throw new Error('PIN salah. Sisa percobaan ' + (5 - s.gagal) + '.'); }
  };

  // ---------- aksi ----------
  let segar = false;
  const A = {};
  A.bootstrap = async () => {
    const cr = P.terbuka(); if (!cr) { const e = new Error('Masukkan PIN'); e.code = 'NO_SESSION'; throw e; }
    const c = await muatCache(cr);
    if (c) {   // tampil instan dari salinan di perangkat, lalu periksa pembaruan di latar
      if (!segar) { segar = true; muatJaringan(cr).then(d => { segar = false; if (d.ver !== c.ver) { PR.api.apply(d); PR.rerender(); } }).catch(e => { segar = false; if (e.code === 'BAD_LINK') { P.hapus(); PR.toast(e.message, 'err'); PR.go('#/masuk'); } }); }
      return c;
    }
    try { return await muatJaringan(cr); }
    catch (e) { if (e.code === 'BAD_LINK') { P.hapus(); } throw e; }
  };
  A.confirmDose = async b => { const w = nowISO(); await balas({ t: 'baca', dosis_id: b.id }); tambahOverlay({ t: 'Dosis', id: b.id, set: { dibaca_pada: w } }); return { dibaca_pada: w }; };
  A.doseNote = async b => { await balas({ t: 'catatan', dosis_id: b.id, teks: b.text }); tambahOverlay({ t: 'Dosis', id: b.id, set: { keterangan: b.text } }); return {}; };
  A.readSop = async b => { const doc = (PR.db.Dokumen || []).find(d => d.id === b.id) || {}; const row = { id: 'B' + (PR.me || {}).id + b.id, dokumen_id: b.id, revisi: doc.revisi, pekerja_id: (PR.me || {}).id, waktu: nowISO() }; await balas({ t: 'sop', dokumen_id: b.id }); tambahOverlay({ t: 'Baca_SOP', id: row.id, baru: 1, set: row }); return row; };
  A.approveDC = async b => { const t = b.decision === 'setuju' ? 'setuju' : 'revisi'; await balas({ t, ids: b.ids, catatan: b.note || '' }); (b.ids || []).forEach(id => tambahOverlay({ t: 'Pembatas_Dosis', id, set: t === 'setuju' ? { status: 'disetujui', disetujui_oleh: (PR.me || {}).nama, disetujui_pada: nowISO() } : { status: 'revisi', catatan_peninjau: b.note || '' } })); return { n: (b.ids || []).length }; };
  A.changePin = async b => { const s = P.tersimpan(); let cr; try { cr = await K.bukaPin(b.old, s.wrap); } catch (e) { throw new Error('PIN lama salah.'); } if (!/^\d{6}$/.test(b.pin)) throw new Error('PIN baru harus 6 digit.'); s.wrap = await K.bungkusPin(b.pin, cr); LS.set(KEY, s); return {}; };
  A.getFile = async b => P.berkasBlob(b.id, P.terbuka());
  A.batch = async () => { throw new Error('Akses ini hanya untuk melihat.'); };
  P.handle = async (action, body) => {
    if (!A[action]) return { success: false, message: 'Tidak tersedia untuk akses ini.' };
    try { return ok(await A[action](body || {})); }
    catch (e) { if (e.network) throw e; return { success: false, message: e.message, code: e.code }; }
  };

  // berkas terenkripsi (SOP, denah, dokumen untuk peninjau/tamu)
  P.berkasBlob = async (fid, cr, peta) => {
    const ref = (peta || P.berkas || {})[fid];
    if (!ref) throw new Error('Berkas ini tidak dibagikan untuk akses Anda.');
    if (ref.besar) throw new Error('Berkas terlalu besar untuk dibagikan lewat tautan. Minta salinan ke PPR.');
    const r = await R.call('ambil', { p: ref.p }, relayUrl(cr || {}));
    const bytes = await K.bukaBytes(ref.k, r.data);
    return { nama: ref.nama, mime: ref.mime, blob: new Blob([bytes], { type: ref.mime || 'application/octet-stream' }) };
  };

  // ---------- tamu & pintu ----------
  P.tamu = async q => { const cr = { r: q.r }; const m = await ambil(cr, q.p, q.k); return m.obj; };
  P.pintuStatus = async q => { const url = R.urlDep(q.r) || R.url(); const j = await (await fetch(url + '?action=pintu&d=' + encodeURIComponent(q.d || ''))).json(); if (!j.success) throw new Error(j.message); return j.data; };
})(window.PR);
