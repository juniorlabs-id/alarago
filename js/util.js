/* ProteRad — utilitas umum */
window.PR = window.PR || {};
(function (PR) {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  PR.$ = $; PR.$$ = $$;

  PR.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PR.ic = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${(window.ICONS || {})[n] || ''}</svg>`;
  PR.trefoil = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M55.50 59.53L69.00 82.91A38 38 0 0 1 31.00 82.91L44.50 59.53A11 11 0 0 0 55.50 59.53ZM39.00 50.00L12.00 50.00A38 38 0 0 1 31.00 17.09L44.50 40.47A11 11 0 0 0 39.00 50.00ZM55.50 40.47L69.00 17.09A38 38 0 0 1 88.00 50.00L61.00 50.00A11 11 0 0 0 55.50 40.47Z" fill="#121212"/><circle cx="50" cy="50" r="7" fill="#121212"/></svg>';
  PR.logo = () => `<span class="logo">${PR.trefoil}</span>`;
  PR.uid = p => (p || 'X') + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);

  // ---------- angka & tanggal ----------
  PR.n = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(x) ? 0 : x; };
  PR.fr = v => PR.has(v) ? PR.f(PR.n(v), String(v).split(/[.,]/)[1] ? Math.min(3, Math.max(2, String(v).split(/[.,]/)[1].length)) : 2) : PR.esc(v == null || v === '' ? '—' : v);
  PR.has = v => v !== '' && v != null && !isNaN(parseFloat(String(v).replace(',', '.')));
  PR.f = (v, d = 2) => (v === '' || v == null || isNaN(v)) ? '—' : Number(v).toFixed(d).replace('.', ',');
  PR.pct = (v, d = 0) => (isFinite(v) ? (v * 100).toFixed(d).replace('.', ',') : '—') + '%';
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  PR.BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  PR.today = () => PR._today || new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  PR.d = s => { if (!s) return '—'; const t = String(s).slice(0, 10).split('-'); if (t.length < 3) return String(s); return `${+t[2]} ${BLN[+t[1] - 1]} ${t[0]}`; };
  PR.dt = s => { if (!s) return '—'; const x = new Date(s); if (isNaN(x)) return s; const j = new Date(x.getTime() + 7 * 3600e3); return PR.d(j.toISOString()) + ' ' + j.toISOString().slice(11, 16) + ' WIB'; };
  PR.addDays = (s, n) => { const x = new Date(String(s).slice(0, 10) + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  PR.addMonths = (s, n) => { const x = new Date(String(s).slice(0, 10) + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
  PR.days = (a, b) => Math.round((new Date(String(b).slice(0, 10) + 'T00:00:00Z') - new Date(String(a).slice(0, 10) + 'T00:00:00Z')) / 864e5);
  PR.left = s => s ? PR.days(PR.today(), s) : null;
  PR.year = () => +PR.today().slice(0, 4);
  PR.quarter = s => Math.floor((+String(s || PR.today()).slice(5, 7) - 1) / 3) + 1;
  PR.hcount = n => n == null ? '' : n < 0 ? `lewat ${-n} hr` : `H-${n}`;

  // ---------- tag status ----------
  const TAGS = {
    aman: ['t-aman', 'circle-check'], tinjau: ['t-tinjau', 'circle-alert'], analisis: ['t-analisis', 'scan-search'], kritis: ['t-kritis', 'triangle-alert'],
    netral: ['', ''], ink: ['t-ink', ''], y: ['t-y', ''], dash: ['t-dash', '']
  };
  PR.tag = (label, kind, noicon) => { const t = TAGS[kind] || TAGS.netral; return `<span class="tag ${t[0]}">${t[1] && !noicon ? PR.ic(t[1]) : ''}[${PR.esc(label)}]</span>`; };
  PR.lvl = l => l === 'kritis' ? `<span class="tag t-ink">[KRITIS · BOBOT 3]</span>` : l === 'penting' ? `<span class="tag" style="border-color:var(--ink)">[PENTING · BOBOT 2]</span>` : `<span class="tag t-dash">[PENDUKUNG · BOBOT 1]</span>`;
  PR.dueTag = n => n == null ? '' : n < 0 ? PR.tag('lewat ' + -n + ' hr', 'kritis') : n <= 7 ? PR.tag('H-' + n, 'kritis') : n <= 30 ? PR.tag('H-' + n, 'tinjau') : PR.tag('H-' + n, 'netral');
  PR.validTag = (sd, proses) => { const n = PR.left(sd); if (!sd) return PR.tag('belum ada', 'kritis'); if (n < 0) return proses ? PR.tag('diproses', 'tinjau') : PR.tag('kedaluwarsa', 'kritis'); if (n <= 30) return PR.tag('≤ 30 hari', 'tinjau'); return PR.tag('berlaku', 'aman'); };

  // ---------- toast ----------
  PR.toast = (msg, type, action) => {
    let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = 'toast ' + (type || '');
    el.innerHTML = `${PR.ic(type === 'err' ? 'circle-x' : type === 'warn' ? 'triangle-alert' : type === 'ok' ? 'circle-check' : 'info')}<span>${PR.esc(msg)}</span>${action ? `<button class="btn btn-s">${PR.esc(action.label)}</button>` : ''}`;
    if (action) el.querySelector('button').onclick = () => { action.fn(); el.remove(); };
    box.appendChild(el); setTimeout(() => el.remove(), action ? 12000 : 3800);
  };

  // ---------- modal ----------
  PR.modal = ({ title, body, foot, wide, onMount, onClose }) => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${PR.esc(title)}"><div class="modal-h"><h2>${PR.esc(title)}</h2><button type="button" data-x aria-label="Tutup">${PR.ic('x')}</button></div><div class="modal-b">${body || ''}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
    const close = () => { bg.remove(); document.removeEventListener('keydown', esc); onClose && onClose(); if (PR.ui && PR.ui.dirty && !document.querySelector('.modal-bg')) { PR.ui.dirty = false; setTimeout(PR.render, 0); } };
    const esc = e => { if (e.key === 'Escape') close(); };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x]')) close(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(bg);
    onMount && onMount(bg.querySelector('.modal'), close);
    const f = bg.querySelector('input,select,textarea'); f && setTimeout(() => f.focus(), 30);
    return close;
  };
  PR.confirm = (msg, okLabel, danger) => new Promise(res => {
    let done = false;
    PR.modal({ title: 'Konfirmasi', body: `<p style="margin:0">${msg}</p>`, foot: `<button class="btn" data-x>Batal</button><button class="btn ${danger ? 'btn-x' : 'btn-y'}" data-ok>${PR.esc(okLabel || 'Ya, lanjutkan')}</button>`,
      onMount: (m, close) => { m.querySelector('[data-ok]').onclick = () => { done = true; close(); res(true); }; }, onClose: () => { if (!done) res(false); } });
  });

  // ---------- form generik ----------
  // field: {k,label,type:text|number|date|select|textarea|check|file|year,opts:[[v,l]],req,help,full,ph,step,accept,kind}
  PR.fieldHTML = (f, v) => {
    const id = 'f_' + f.k, val = v == null ? '' : v;
    const req = f.req ? ' <span class="req">*</span>' : '';
    let inp;
    if (f.type === 'select') inp = `<select class="inp" id="${id}" name="${f.k}">${(f.opts || []).map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${PR.esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${PR.esc(ol)}</option>`; }).join('')}</select>`;
    else if (f.type === 'textarea') inp = `<textarea class="inp" id="${id}" name="${f.k}" placeholder="${PR.esc(f.ph || '')}">${PR.esc(val)}</textarea>`;
    else if (f.type === 'check') return `<div class="f ${f.full ? 'full' : ''}"><label class="chk" style="text-transform:none;font-weight:400;letter-spacing:0"><input type="checkbox" name="${f.k}" ${val === true || val === 'ya' ? 'checked' : ''}> <span>${f.label}</span></label>${f.help ? `<div class="help">${f.help}</div>` : ''}</div>`;
    else if (f.type === 'file') inp = `<label class="drop" for="${id}">${PR.ic('file-up')} <span data-fname>${val ? 'Berkas tersimpan · ganti dengan berkas baru' : `Tarik & lepas berkas di sini, atau <b>pilih berkas</b>`}</span><input type="file" id="${id}" name="${f.k}" accept="${f.accept || '.pdf,image/*'}" hidden></label>`;
    else inp = `<input class="inp ${f.type === 'number' || f.mono ? 'mono' : ''}" id="${id}" name="${f.k}" type="${f.type === 'year' ? 'number' : f.type === 'number' ? 'text' : f.type || 'text'}" value="${PR.esc(f.type === 'number' && val != null ? String(val).replace('.', ',') : val)}" placeholder="${PR.esc(f.ph || '')}" ${f.step && f.type !== 'number' ? `step="${f.step}"` : ''} ${f.type === 'number' ? 'inputmode="decimal" autocomplete="off" data-num' : ''}>`;
    return `<div class="f ${f.full || f.type === 'textarea' || f.type === 'file' ? 'full' : ''}"><label for="${id}">${f.label}${req}</label>${inp}${f.help ? `<div class="help">${f.help}</div>` : ''}<div class="err" hidden></div></div>`;
  };
  PR.form = (def, values) => new Promise(res => {
    values = values || {}; let done = false;
    const body = `${def.intro ? `<div class="ban ban-info">${PR.ic('info')}<div class="grow small">${def.intro}</div></div>` : ''}<form class="fgrid" novalidate>${def.fields.map(f => f.html ? `<div class="full">${f.html}</div>` : PR.fieldHTML(f, values[f.k] != null ? values[f.k] : f.def)).join('')}</form>`;
    PR.modal({
      title: def.title, wide: def.wide, body,
      foot: `${def.del ? `<button class="btn btn-x" data-del style="margin-right:auto">${PR.ic('trash-2')} Hapus</button>` : ''}<button class="btn" data-x>Batal</button><button class="btn btn-y" data-ok>${PR.ic('check')} ${PR.esc(def.ok || 'Simpan')}</button>`,
      onMount: (m, close) => {
        const fm = m.querySelector('form');
        m.querySelectorAll('input[type=file]').forEach(inp => {
          const lab = inp.closest('.drop');
          inp.onchange = () => { if (inp.files[0]) lab.querySelector('[data-fname]').textContent = inp.files[0].name + ' · ' + Math.round(inp.files[0].size / 1024) + ' KB'; };
          lab.addEventListener('dragover', e => { e.preventDefault(); lab.classList.add('over'); });
          lab.addEventListener('dragleave', () => lab.classList.remove('over'));
          lab.addEventListener('drop', e => { e.preventDefault(); lab.classList.remove('over'); if (e.dataTransfer.files[0]) { inp.files = e.dataTransfer.files; inp.onchange(); } });
        });
        def.onMount && def.onMount(m);
        const submit = () => {
          const out = Object.assign({}, values), files = {}; let bad = false;
          def.fields.forEach(f => {
            if (f.html) return;
            const el = fm.elements[f.k]; if (!el) return;
            let v;
            if (f.type === 'check') v = el.checked ? 'ya' : 'tidak';
            else if (f.type === 'file') { if (el.files[0]) files[f.k] = el.files[0]; v = values[f.k] || ''; }
            else v = String(el.value).trim();
            if (f.type === 'number' && v !== '') v = String(v).replace(/\s/g, '').replace(',', '.');
            const box = el.closest('.f'), err = box && box.querySelector('.err');
            const numBad = f.type === 'number' && v !== '' && !/^-?\d*\.?\d+$/.test(v) && !(f.allowBG && /^bg$/i.test(v));
            const msg = f.req && (v === '' || v == null) && !(f.type === 'file' && files[f.k]) ? 'Wajib diisi' : numBad ? 'Isi angka, mis. 2,5' : f.valid ? f.valid(v, out) : '';
            if (err) { err.hidden = !msg; err.textContent = msg || ''; box.classList.toggle('bad', !!msg); }
            if (msg) bad = true;
            out[f.k] = v;
          });
          if (bad) return;
          done = true; close(); res(Object.assign(out, { _files: files }));
        };
        m.querySelector('[data-ok]').onclick = submit;
        fm.addEventListener('submit', e => { e.preventDefault(); submit(); });
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = async () => { done = true; close(); res({ _delete: true }); };
      },
      onClose: () => { if (!done) res(null); }
    });
  });

  // ---------- berkas ----------
  PR.fileToB64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
  PR.download = (name, content, mime) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  PR.toCSV = (rows, cols) => [cols.join(',')].concat(rows.map(r => cols.map(c => { const v = r[c] == null ? '' : String(r[c]); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','))).join('\n');
  PR.parseCSV = text => {
    const rows = []; let row = [], cell = '', q = false;
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim()));
  };
  const loaded = {};
  PR.loadScript = src => loaded[src] || (loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }));
  PR.readTable = async file => {
    if (/\.csv$/i.test(file.name) || file.type === 'text/csv') return PR.parseCSV(await file.text());
    await PR.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).filter(r => r.some(x => String(x).trim()));
  };
  PR.qr = async (text, el) => {
    if (!window.qrcode) await PR.loadScript('js/vendor/qrcode.min.js');
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    el.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  };
  PR.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  PR.copy = async text => { try { await navigator.clipboard.writeText(text); PR.toast('Tautan disalin', 'ok'); } catch (e) { prompt('Salin tautan ini:', text); } };
  PR.wa = (text, phone) => window.open('https://wa.me/' + (phone ? String(phone).replace(/\D/g, '').replace(/^0/, '62') : '') + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  PR.initials = s => String(s || '?').replace(/^(dr|drs|ir|prof)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
  PR.groupBy = (arr, fn) => arr.reduce((o, x) => { const k = fn(x); (o[k] = o[k] || []).push(x); return o; }, {});
  PR.sum = arr => arr.reduce((a, b) => a + b, 0);
})(window.PR);
