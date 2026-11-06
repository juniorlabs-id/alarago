/* AlaraGo — boot aplikasi: tampil instan dari cache, segarkan di latar, PWA */
(function (PR) {
  'use strict';
  const A = PR.api;
  let refreshing = false;

  async function refresh(force) {
    if (refreshing || !A.url() || !A.session()) return;
    refreshing = true;
    try { const changed = await A.boot(force); if (changed || !PR.me) PR.rerender(); }
    catch (e) { if (!PR.me && e.code !== 'NO_SESSION') { PR.toast(e.message, 'err'); PR.go('#/masuk'); } }
    finally { refreshing = false; }
  }

  function start() {
    // 1) tampil langsung dari cache lokal (0 ms) — tidak menunggu server
    const pub = PR.PUBLIC.includes(PR.parse().name);
    if (!pub && A.url() && A.session()) A.loadCache();
    PR.render();
    // 2) segarkan diam-diam; server membalas notModified bila tidak ada perubahan
    if (!pub) refresh(false).then(() => A.pending() && A.flush());
  }

  window.addEventListener('hashchange', () => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); PR.render(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && PR.me && !A.pending() && Date.now() - (A.lastBoot || 0) > 60000) refresh(false);
  });

  // ---------- PWA ----------
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PR.installEvt = e; PR.$$('[data-act=install]').forEach(x => x.hidden = false); });
  window.addEventListener('appinstalled', () => { PR.installEvt = null; PR.$$('[data-act=install]').forEach(x => x.hidden = true); PR.toast('AlaraGo terpasang', 'ok'); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              PR.toast('Versi baru AlaraGo tersedia.', 'ok', { label: 'Muat ulang', fn: () => nw.postMessage('skip') });
            }
          });
        });
      }).catch(() => { });
      let reloaded = false; const had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had || reloaded) return; reloaded = true; location.reload(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window.PR);
