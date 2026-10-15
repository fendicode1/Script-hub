(function () {
  'use strict';

  const CFG = window.SITE_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const PAGE = 12;

  /* ---------- util ---------- */
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sh:' + k); return v ? JSON.parse(v) : d; } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem('sh:' + k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  };
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  const fmt = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
  };
  function icon(name) {
    const s = el('span');
    s.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>'; // string statis
    return s.firstChild;
  }
  function download(name, text, type) {
    const b = new Blob([text], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- data ---------- */
  const fp = (s) => hash(String(s.title).toLowerCase() + '\n' + s.code);
  function clean(input, source) {
    if (!input || typeof input !== 'object') return null;
    const cut = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
    const title = cut(input.title, 120), code = cut(input.code, 50000);
    if (!title || !code) return null;
    let d = new Date(input.createdAt); if (isNaN(d)) d = new Date();
    const tags = (Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(','))
      .map((t) => cut(t, 24).toLowerCase()).filter(Boolean).slice(0, 8);
    const s = {
      id: '', title, game: cut(input.game, 80) || 'Umum', description: cut(input.description, 400),
      code, tags, author: cut(input.author, 60) || 'Anonim', createdAt: d.toISOString(), source: source || 'manual'
    };
    s.id = (source === 'manual' ? 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) : 'i' + fp(s));
    return s;
  }
  function allScripts() {
    const deleted = new Set(store.get('deleted', []));
    const map = new Map();
    (window.SCRIPT_DATA || []).concat(store.get('local', [])).forEach((s) => { if (s && s.id && !deleted.has(s.id)) map.set(s.id, s); });
    return Array.from(map.values());
  }
  const byId = (id) => allScripts().find((s) => s.id === id);
  function mergeIn(list, source) {
    const known = new Set(allScripts().map(fp));
    const local = store.get('local', []);
    let added = 0;
    list.slice(0, 1000).forEach((item) => {
      const s = clean(item, source);
      if (!s || known.has(fp(s))) return;
      known.add(fp(s)); local.push(s); added++;
    });
    if (added) store.set('local', local);
    return added;
  }

  /* ---------- favorit & riwayat ---------- */
  const favs = () => store.get('favs', []);
  const isFav = (id) => favs().indexOf(id) !== -1;
  function toggleFav(id) {
    const f = favs(); const i = f.indexOf(id);
    if (i === -1) f.unshift(id); else f.splice(i, 1);
    store.set('favs', f);
    toast(i === -1 ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit');
    refreshView(); updateNavCounts();
    if ($('overlay').classList.contains('open') && current) syncModalFav();
  }
  function pushRecent(id) {
    const r = store.get('recent', []).filter((x) => x !== id); r.unshift(id);
    store.set('recent', r.slice(0, 30));
    updateNavCounts();
  }

  /* ---------- kartu & daftar ---------- */
  function card(s) {
    const a = el('article', 'card glass');
    const main = el('button', 'card-main'); main.type = 'button';
    const meta = el('div', 'meta'); meta.append(el('span', 'game', s.game), el('span', '', fmt(s.createdAt)));
    const tags = el('div', 'tags'); s.tags.forEach((t) => tags.append(el('span', 'tag', t)));
    main.append(meta, el('h3', '', s.title), el('p', '', s.description || 'Tanpa deskripsi.'), tags);
    main.onclick = () => openModal(s);
    const star = el('button', 'star'); star.type = 'button';
    star.setAttribute('aria-label', 'Favorit'); star.setAttribute('aria-pressed', String(isFav(s.id)));
    star.append(icon('star')); star.onclick = () => toggleFav(s.id);
    a.append(main, star);
    return a;
  }
  function fillGrid(grid, list, emptyMsg) {
    grid.replaceChildren();
    if (!list.length) grid.append(el('div', 'empty glass', emptyMsg));
    list.forEach((s) => grid.append(card(s)));
  }

  /* ---------- tampilan ---------- */
  const st = { view: 'home', q: '', game: '', sort: 'newest', page: 1, adminTab: 'add' };
  let isAdmin = false;
  try { isAdmin = sessionStorage.getItem('sh:admin') === '1'; } catch (e) { /* abaikan */ }

  const VIEWS = [
    { id: 'home', label: 'Beranda', icon: 'home' },
    { id: 'fav', label: 'Favorit', icon: 'star', count: () => favs().filter(byId).length },
    { id: 'recent', label: 'Terakhir dilihat', icon: 'clock' },
    { id: 'stats', label: 'Statistik', icon: 'chart' },
    { sep: true },
    { id: 'admin', label: 'Admin', icon: 'lock' },
    { id: 'settings', label: 'Pengaturan', icon: 'sliders' },
    { id: 'about', label: 'Tentang & keamanan', icon: 'info' }
  ];
  function buildNav() {
    const nav = $('nav'); nav.replaceChildren();
    VIEWS.forEach((v) => {
      if (v.sep) { nav.append(el('div', 'nav-sep')); return; }
      const b = el('button', 'nav-item'); b.type = 'button'; b.dataset.view = v.id;
      b.append(icon(v.icon), el('span', '', v.label));
      if (v.count) b.append(el('span', 'count', ''));
      b.onclick = () => showView(v.id);
      nav.append(b);
    });
    updateNavCounts();
  }
  function updateNavCounts() {
    VIEWS.forEach((v) => {
      if (!v.count) return;
      const b = $('nav').querySelector('[data-view="' + v.id + '"] .count');
      if (b) b.textContent = v.count() || '';
    });
  }
  function showView(name) {
    st.view = name;
    document.querySelectorAll('main > section').forEach((s) => { s.hidden = s.dataset.view !== name; });
    $('nav').querySelectorAll('.nav-item').forEach((b) => {
      if (b.dataset.view === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const v = VIEWS.find((x) => x.id === name);
    $('viewTitle').textContent = v ? v.label : '';
    closeDrawer(); refreshView();
    window.scrollTo(0, 0);
  }
  function refreshView() {
    const v = st.view;
    if (v === 'home') renderHome();
    else if (v === 'fav') fillGrid($('favGrid'), favs().map(byId).filter(Boolean), 'Belum ada favorit. Tekan bintang di kartu script untuk menyimpannya.');
    else if (v === 'recent') fillGrid($('recentGrid'), store.get('recent', []).map(byId).filter(Boolean), 'Belum ada riwayat. Buka sebuah script dan akan muncul di sini.');
    else if (v === 'stats') renderStats();
    else if (v === 'admin') renderAdmin();
    else if (v === 'settings') renderSettings();
  }

  /* beranda */
  function renderHome() {
    const all = allScripts();
    const counts = {};
    all.forEach((s) => { counts[s.game] = (counts[s.game] || 0) + 1; });
    const chips = $('chips'); chips.replaceChildren();
    const mk = (name, count) => {
      const b = el('button', 'chip', name || 'Semua'); b.type = 'button';
      if (count !== undefined) b.append(el('small', '', String(count)));
      b.setAttribute('aria-pressed', String(st.game === (name || '')));
      b.onclick = () => { st.game = name || ''; st.page = 1; renderHome(); };
      chips.append(b);
    };
    mk('');
    Object.keys(counts).sort((a, b) => counts[b] - counts[a]).forEach((g) => mk(g, counts[g]));

    const q = st.q.toLowerCase(), dir = st.sort === 'oldest' ? 1 : -1;
    const list = all.filter((s) => (!st.game || s.game === st.game) &&
      (!q || [s.title, s.game, s.description, s.author, s.tags.join(' ')].join(' ').toLowerCase().indexOf(q) !== -1))
      .sort((a, b) => dir * (new Date(a.createdAt) - new Date(b.createdAt)));
    fillGrid($('grid'), list.slice(0, st.page * PAGE), 'Tidak ada script yang cocok. Ubah kata kunci atau pilih "Semua".');
    $('more').hidden = list.length <= st.page * PAGE;
  }

  /* statistik */
  function renderStats() {
    const all = allScripts().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const games = {};
    all.forEach((s) => { games[s.game] = (games[s.game] || 0) + 1; });
    const grid = $('statGrid'); grid.replaceChildren();
    const stat = (n, label) => { const d = el('div', 'stat glass'); d.append(el('b', '', String(n)), el('span', '', label)); grid.append(d); };
    stat(all.length, 'Total script');
    stat(Object.keys(games).length, 'Jumlah game');
    stat(all.length ? fmt(all[0].createdAt) : '-', 'Script tertua');
    stat(all.length ? fmt(all[all.length - 1].createdAt) : '-', 'Script terbaru');
    stat(favs().filter(byId).length, 'Favoritmu');
    const bars = $('gameBars'); bars.replaceChildren();
    const names = Object.keys(games).sort((a, b) => games[b] - games[a]).slice(0, 8);
    const max = names.length ? games[names[0]] : 1;
    names.forEach((n) => {
      const r = el('div', 'bar-row'); const bar = el('div', 'bar'); const i = el('i'); i.style.width = (games[n] / max * 100) + '%'; bar.append(i);
      r.append(el('span', '', n), bar, el('span', '', String(games[n]))); bars.append(r);
    });
    if (!names.length) bars.textContent = 'Belum ada data.';
  }

  /* pengaturan */
  function applySettings() {
    const s = Object.assign({ lite: false, wrap: true, size: 14 }, store.get('settings', {}));
    document.body.classList.toggle('lite', !!s.lite);
    document.body.classList.toggle('nowrap', !s.wrap);
    document.documentElement.style.setProperty('--code-size', s.size + 'px');
    return s;
  }
  function renderSettings() {
    const s = applySettings();
    $('setLite').checked = !!s.lite; $('setWrap').checked = !!s.wrap; $('setSize').value = s.size;
    $('sizeLabel').textContent = s.size + ' px';
  }
  function saveSetting(k, v) { const s = Object.assign({ lite: false, wrap: true, size: 14 }, store.get('settings', {})); s[k] = v; store.set('settings', s); renderSettings(); }

  /* ---------- modal ---------- */
  let current = null;
  function syncModalFav() {
    const on = isFav(current.id);
    $('mFav').textContent = on ? 'Hapus dari favorit' : 'Tambah favorit';
    $('mFav').setAttribute('aria-pressed', String(on));
  }
  function openModal(s) {
    current = s; pushRecent(s.id);
    $('mTitle').textContent = s.title; $('mGame').textContent = s.game;
    $('mDate').textContent = fmt(s.createdAt) + ' oleh ' + s.author;
    $('mDesc').textContent = s.description; $('mCode').textContent = s.code;
    const t = $('mTags'); t.replaceChildren(); s.tags.forEach((x) => t.append(el('span', 'tag', x)));
    syncModalFav();
    $('overlay').classList.add('open'); $('close').focus();
  }
  const closeModal = () => $('overlay').classList.remove('open');
  $('close').onclick = closeModal;
  $('overlay').onclick = (e) => { if (e.target.id === 'overlay') closeModal(); };
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(current.code); toast('Script disalin'); }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents($('mCode'));
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      toast('Teks dipilih. Tekan Ctrl+C untuk menyalin.');
    }
  };
  $('dl').onclick = () => download((current.title.replace(/[^\w\-]+/g, '_') || 'script') + '.txt', current.code);
  $('mFav').onclick = () => toggleFav(current.id);

  /* ---------- menu samping ---------- */
  function openDrawer() { $('drawer').classList.add('open'); $('scrim').classList.add('open'); $('drawer').setAttribute('aria-hidden', 'false'); $('menuBtn').setAttribute('aria-expanded', 'true'); $('drawerClose').focus(); }
  function closeDrawer() { $('drawer').classList.remove('open'); $('scrim').classList.remove('open'); $('drawer').setAttribute('aria-hidden', 'true'); $('menuBtn').setAttribute('aria-expanded', 'false'); }
  $('menuBtn').onclick = openDrawer;
  $('drawerClose').onclick = () => { closeDrawer(); $('menuBtn').focus(); };
  $('scrim').onclick = closeDrawer;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });

  /* ---------- admin ---------- */
  function renderAdmin() {
    $('loginBox').hidden = isAdmin; $('adminBox').hidden = !isAdmin;
    if (!isAdmin) return;
    document.querySelectorAll('#adminTabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === st.adminTab)));
    document.querySelectorAll('#adminBox .panel[data-tab]').forEach((p) => { p.hidden = p.dataset.tab !== st.adminTab; });
    if (st.adminTab === 'manage') renderManage();
    if (st.adminTab === 'feed') renderFeeds();
  }
  function renderManage() {
    const q = $('manageQ').value.toLowerCase();
    const list = allScripts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((s) => !q || (s.title + ' ' + s.game).toLowerCase().indexOf(q) !== -1);
    const box = $('manageList'); box.replaceChildren();
    if (!list.length) box.textContent = 'Tidak ada script.';
    list.forEach((s) => {
      const row = el('div', 'list-row'); const info = el('div');
      info.append(el('strong', '', s.title), el('br'), el('span', '', s.game + ' · ' + fmt(s.createdAt) + ' · ' + s.source));
      const del = el('button', 'btn danger', 'Hapus'); del.type = 'button';
      del.onclick = () => {
        if (!confirm('Hapus "' + s.title + '"?')) return;
        store.set('local', store.get('local', []).filter((x) => x.id !== s.id));
        const d = store.get('deleted', []); d.push(s.id); store.set('deleted', d);
        toast('Script dihapus'); renderManage(); updateNavCounts();
      };
      row.append(info, del); box.append(row);
    });
  }
  function renderFeeds() {
    const box = $('feedList'); box.replaceChildren();
    const feeds = CFG.FEEDS || [];
    if (!feeds.length) box.append(el('p', 'hint', 'Belum ada feed. Tambahkan di config.js, contoh: { name: "Feed Saya", url: "https://.../scripts.json" }'));
    feeds.forEach((f) => { const r = el('div', 'list-row'); r.append(el('strong', '', f.name || f.url), el('span', '', f.url)); box.append(r); });
    const last = store.get('lastFeed', 0);
    $('feedLast').textContent = last ? 'Terakhir dicek: ' + new Date(last).toLocaleString('id-ID') : 'Belum pernah dicek.';
  }
  async function runFeeds(silent) {
    const feeds = CFG.FEEDS || [];
    let added = 0, failed = 0;
    for (const f of feeds) {
      try {
        const r = await fetch(f.url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        added += mergeIn(Array.isArray(data) ? data : (data.scripts || []), 'feed:' + (f.name || f.url));
      } catch (e) { failed++; }
    }
    store.set('lastFeed', Date.now());
    if (!silent || added) toast('Impor selesai: ' + added + ' baru' + (failed ? ', ' + failed + ' feed gagal' : ''));
    refreshView(); updateNavCounts();
  }
  function mergedJs() { return '// Dibuat dari menu Admin pada ' + new Date().toISOString() + '\nwindow.SCRIPT_DATA = ' + JSON.stringify(allScripts(), null, 2) + ';\n'; }

  $('loginForm').onsubmit = (e) => {
    e.preventDefault();
    if ($('pw').value !== CFG.ADMIN_PASSWORD) { toast('Password salah.'); return; }
    isAdmin = true; try { sessionStorage.setItem('sh:admin', '1'); } catch (x) { /* abaikan */ }
    $('pw').value = ''; renderAdmin(); toast('Berhasil masuk');
  };
  $('logout').onclick = () => { isAdmin = false; try { sessionStorage.removeItem('sh:admin'); } catch (x) { /* abaikan */ } renderAdmin(); };
  $('adminTabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; st.adminTab = b.dataset.tab; renderAdmin(); };
  $('addForm').onsubmit = (e) => {
    e.preventDefault();
    const s = clean(Object.fromEntries(new FormData(e.target)), 'manual');
    if (!s) { toast('Judul dan kode wajib diisi.'); return; }
    const local = store.get('local', []); local.push(s); store.set('local', local);
    e.target.reset(); toast('Script disimpan'); updateNavCounts();
  };
  $('manageQ').oninput = renderManage;
  $('expJs').onclick = () => download('scripts-data.js', mergedJs(), 'text/javascript');
  $('expJson').onclick = () => download('scripts.json', JSON.stringify(allScripts(), null, 2), 'application/json');
  $('impFile').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { const d = JSON.parse(r.result); toast('Impor selesai: ' + mergeIn(Array.isArray(d) ? d : (d.scripts || []), 'file') + ' baru'); updateNavCounts(); }
      catch (x) { toast('File bukan JSON yang valid.'); }
    };
    r.readAsText(f); e.target.value = '';
  };
  $('impUrlBtn').onclick = async () => {
    const u = $('impUrl').value.trim(); if (!u) return;
    try {
      const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      toast('Impor selesai: ' + mergeIn(Array.isArray(d) ? d : (d.scripts || []), 'url') + ' baru'); updateNavCounts();
    } catch (x) { toast('Gagal mengambil URL. Pastikan alamatnya benar dan mengizinkan akses (CORS).'); }
  };
  $('resetLocal').onclick = () => {
    if (!confirm('Reset semua data lokal di browser ini?')) return;
    store.set('local', []); store.set('deleted', []); store.set('lastFeed', 0);
    toast('Data lokal direset'); updateNavCounts();
  };
  $('runFeeds').onclick = () => runFeeds(false).then(renderFeeds);

  /* ---------- pengaturan & lain-lain ---------- */
  $('setLite').onchange = (e) => saveSetting('lite', e.target.checked);
  $('setWrap').onchange = (e) => saveSetting('wrap', e.target.checked);
  $('setSize').oninput = (e) => saveSetting('size', parseInt(e.target.value, 10));
  $('clearUser').onclick = () => { store.set('favs', []); store.set('recent', []); toast('Favorit dan riwayat dihapus'); updateNavCounts(); };
  $('clearRecent').onclick = () => { store.set('recent', []); refreshView(); updateNavCounts(); };

  let timer;
  $('q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { st.q = e.target.value; st.page = 1; renderHome(); }, 250); });
  document.querySelectorAll('.seg button').forEach((b) => {
    b.onclick = () => {
      st.sort = b.dataset.sort; st.page = 1;
      document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderHome();
    };
  });
  $('more').onclick = () => { st.page++; renderHome(); };

  /* ---------- mulai ---------- */
  const name = CFG.SITE_NAME || 'ScriptHub';
  $('brand').textContent = name; $('drawerBrand').textContent = name; document.title = name + ' — direktori script';
  $('drawerFoot').textContent = allScripts().length + ' script dalam koleksi';
  applySettings(); buildNav(); showView('home');

  const every = (CFG.FEED_INTERVAL_MINUTES || 60) * 60000;
  if ((CFG.FEEDS || []).length && Date.now() - store.get('lastFeed', 0) > every) runFeeds(true);
})();
