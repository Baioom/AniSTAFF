/* 动画制作人员查询表 - AniStaff */
(function () {
  'use strict';

  const MOEGIRL = 'https://mzh.moegirl.org.cn';
  const WEBLIO = 'https://www.weblio.jp/content/';
  const $ = (sel) => document.querySelector(sel);

  const TYPE_LABEL = { tv: 'TV动画', movie: '剧场版', ova: 'OVA', web: '网络动画' };

  const state = {
    meta: null,
    staffIndex: [],
    worksDb: null,
    authors: null,
    companies: null,
    deceased: null,
    shardCache: new Map(),
    staffQuery: '', staffSort: 'pinyin', activeStaff: null,
    workType: 'tv', workYear: 'all', workQuery: '', workSort: 'time', workDir: -1,
    authorQuery: '', authorSort: 'count',
    companyQuery: '', companySort: 'count',
    deceasedQuery: '',
    groupMode: {},
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  const moegirlUrl = (p) => MOEGIRL + p;
  const weblioUrl = (name) => WEBLIO + encodeURIComponent(name);

  async function boot() {
    try {
      const [metaRes, idxRes] = await Promise.all([fetch('data/meta.json'), fetch('data/staff-index.json')]);
      state.meta = await metaRes.json();
      state.staffIndex = await idxRes.json();
    } catch (e) {
      document.getElementById('app').innerHTML = '<div class="loading">数据加载失败，请确认 data 目录完整部署。</div>';
      return;
    }
    renderFooterMeta();
    renderStaffList();
    bindEvents();
  }

  function renderFooterMeta() {
    const m = state.meta || {};
    if (!m.worksDb) { $('#footerMeta').textContent = ''; return; }
    const w = m.worksDb;
    $('#footerMeta').textContent =
      `已收录制作人员 ${m.staffCount.toLocaleString()} 位 · 作品库 TV动画 ${w.tv.toLocaleString()} / 剧场版 ${w.movie.toLocaleString()} / OVA ${w.ova.toLocaleString()} / 网络动画 ${w.web.toLocaleString()} · 原作 ${m.authorsCount} 人 · 制作公司 ${m.companiesCount} 家 · 去世人员 ${m.deceasedCount} 人 · 数据生成于 ${(m.generated || '').slice(0, 10)}`;
  }

  /* ============ staff view ============ */
  function filteredStaff() {
    const q = state.staffQuery.trim().toLowerCase().replace(/\s+/g, '');
    let list = state.staffIndex;
    if (q) {
      list = list.filter(s => s.n.toLowerCase().includes(q) || (s.py || '').replace(/\s+/g, '').includes(q));
    }
    if (state.staffSort === 'count') {
      list = [...list].sort((a, b) => b.total - a.total || (a.py || a.n).localeCompare(b.py || b.n, 'zh-Hans-CN'));
    } else {
      list = [...list].sort((a, b) => (a.py || a.n).localeCompare(b.py || b.n, 'zh-Hans-CN'));
    }
    return list;
  }

  function renderStaffList() {
    const wrap = $('#staffList');
    const list = filteredStaff();
    wrap.innerHTML = '';
    if (!list.length) { wrap.appendChild(el('div', 'noresult', '没有匹配的人员')); renderAz([]); return; }
    const groups = new Map();
    for (const s of list) {
      const g = /^[A-Z]$/.test(s.i) ? s.i : '#';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(s);
    }
    renderAz([...groups.keys()]);
    for (const [g, items] of groups) {
      const gdiv = el('div', 'letter-group');
      gdiv.id = 'az-' + g;
      gdiv.appendChild(el('div', 'letter-title', g));
      for (const s of items) {
        const item = el('div', 'staff-item' + (state.activeStaff === s.n ? ' active' : ''));
        item.appendChild(el('span', 'staff-name', s.n));
        const counts = el('span', 'staff-counts');
        const parts = [];
        if (s.tv) parts.push(`TV <b>${s.tv}</b>`);
        if (s.mo) parts.push(`剧场版 <b>${s.mo}</b>`);
        if (s.ov) parts.push(`OVA <b>${s.ov}</b>`);
        if (s.wb) parts.push(`网络 <b>${s.wb}</b>`);
        if (!parts.length) parts.push(`作品 <b>${s.total}</b>`);
        counts.innerHTML = parts.join(' · ');
        item.appendChild(counts);
        item.addEventListener('click', () => showStaff(s));
        gdiv.appendChild(item);
      }
      wrap.appendChild(gdiv);
    }
  }

  function renderAz(letters) {
    const bar = $('#azbar');
    bar.innerHTML = '';
    for (const g of letters) {
      const b = el('button', '', g);
      b.addEventListener('click', () => {
        const t = document.getElementById('az-' + g);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      bar.appendChild(b);
    }
  }

  async function showStaff(idxEntry) {
    state.activeStaff = idxEntry.n;
    document.querySelectorAll('.staff-item').forEach(n => n.classList.remove('active'));
    const detail = $('#staffDetail');
    detail.innerHTML = '<div class="loading">加载中…</div>';
    const g = /^[A-Z]$/.test(idxEntry.i) ? idxEntry.i : '#';
    const fileKey = g === '#' ? '%23' : g;
    let shard = state.shardCache.get(fileKey);
    if (!shard) {
      try {
        shard = await (await fetch(`data/staff-${fileKey}.json`)).json();
        state.shardCache.set(fileKey, shard);
      } catch (e) {
        detail.innerHTML = '<div class="detail-empty">数据加载失败</div>';
        return;
      }
    }
    const rec = shard.find(r => r.n === idxEntry.n);
    if (!rec) { detail.innerHTML = '<div class="detail-empty">未找到该人员数据</div>'; return; }
    renderDetail(rec);
    document.querySelectorAll('.staff-item').forEach(n => {
      if (n.querySelector('.staff-name').textContent === rec.n) n.classList.add('active');
    });
  }

  function renderDetail(rec) {
    const detail = $('#staffDetail');
    detail.innerHTML = '';
    const card = el('div', 'detail-card');
    const head = el('div', 'detail-head');
    head.appendChild(el('h2', '', rec.n));
    if (rec.u) {
      const a = el('a', 'moegirl-link', '萌娘百科 ↗');
      a.href = moegirlUrl(rec.u); a.target = '_blank'; a.rel = 'noopener';
      head.appendChild(a);
    }
    card.appendChild(head);
    const stats = el('div', 'detail-stats');
    const parts = [];
    if (rec.tv.length) parts.push(`TV动画 ${rec.tv.length} 部`);
    if (rec.mo.length) parts.push(`剧场版 ${rec.mo.length} 部`);
    if (rec.ov.length) parts.push(`OVA ${rec.ov.length} 部`);
    if (rec.wb.length) parts.push(`网络动画 ${rec.wb.length} 部`);
    stats.textContent = parts.join(' · ') || '暂无作品记录';
    card.appendChild(stats);

    for (const grp of [
      { key: 'tv', label: 'TV动画', color: 'var(--tv)', data: rec.tv },
      { key: 'mo', label: '剧场版', color: 'var(--movie)', data: rec.mo },
      { key: 'ov', label: 'OVA', color: 'var(--ova)', data: rec.ov },
      { key: 'wb', label: '网络动画', color: 'var(--web)', data: rec.wb },
    ]) {
      const gdiv = el('div', 'work-group');
      const ghead = el('div', 'work-group-head');
      const gtitle = el('div', 'work-group-title');
      const dot = el('span', 'dot'); dot.style.background = grp.color;
      gtitle.appendChild(dot);
      gtitle.appendChild(document.createTextNode(grp.label));
      gtitle.appendChild(el('span', 'count-badge', String(grp.data.length)));
      ghead.appendChild(gtitle);

      const stateKey = rec.n + '|' + grp.key;
      const gm = state.groupMode[stateKey] || { mode: 'time', dir: 1 };
      const sortWrap = el('div', 'mini-sort');
      for (const [label, mode] of [['时间', 'time'], ['首字母', 'letter']]) {
        const b = el('button', gm.mode === mode ? 'active' : '', label + (gm.mode === mode ? (gm.dir > 0 ? ' ↑' : ' ↓') : ''));
        b.addEventListener('click', () => {
          if (gm.mode === mode) gm.dir = -gm.dir;
          else { gm.mode = mode; gm.dir = 1; }
          state.groupMode[stateKey] = gm;
          renderDetail(rec);
        });
        sortWrap.appendChild(b);
      }
      ghead.appendChild(sortWrap);
      gdiv.appendChild(ghead);
      if (!grp.data.length) gdiv.appendChild(el('div', 'group-empty', '暂无记录'));
      else for (const w of sortWorks(grp.data, gm.mode, gm.dir)) gdiv.appendChild(renderWorkItem(w));
      card.appendChild(gdiv);
    }
    detail.appendChild(card);
  }

  function sortWorks(arr, mode, dir) {
    const copy = [...arr];
    if (mode === 'letter') {
      copy.sort((a, b) => ((a.py || a.t).localeCompare(b.py || b.t, 'zh-Hans-CN')) * dir || ((a.y || 0) - (b.y || 0)) * dir);
    } else {
      copy.sort((a, b) => ((a.y || 9999) - (b.y || 9999)) * dir || ((a.d || '') < (b.d || '') ? -dir : 1 * dir) || (a.py || a.t).localeCompare(b.py || b.t, 'zh-Hans-CN'));
    }
    return copy;
  }

  function renderWorkItem(w) {
    const item = el('div', 'work-item');
    item.appendChild(el('span', 'work-year', w.y ? String(w.y) : '—'));
    const tw = el('span', 'work-title');
    const link = w.u ? moegirlUrl(w.u) : (w.j ? weblioUrl(w.j) : null);
    if (link) {
      const a = el('a', '', w.t); a.href = link; a.target = '_blank'; a.rel = 'noopener';
      tw.appendChild(a);
    } else tw.appendChild(document.createTextNode(w.t));
    if (w.j && w.j !== w.t) tw.appendChild(el('span', 'ja', w.j));
    item.appendChild(tw);
    if (w.r && w.r.length) {
      const roles = el('span', 'work-roles');
      for (const r of w.r.slice(0, 6)) roles.appendChild(el('span', 'role-chip', r));
      item.appendChild(roles);
    }
    return item;
  }

  /* ============ works view ============ */
  async function ensureData(key, file) {
    if (state[key]) return;
    state[key] = await (await fetch(file)).json();
  }

  async function renderWorks() {
    const grid = $('#worksGrid');
    grid.innerHTML = '<div class="loading">加载中…</div>';
    try { await ensureData('worksDb', 'data/works-db.json'); } catch (e) { grid.innerHTML = '<div class="noresult">作品库加载失败</div>'; return; }
    const db = state.worksDb;
    // type chips
    const typebar = $('#workTypeTabs');
    typebar.innerHTML = '';
    for (const k of ['tv', 'movie', 'ova', 'web']) {
      const b = el('button', 'chip' + (state.workType === k ? ' active' : ''));
      b.appendChild(document.createTextNode(TYPE_LABEL[k] + ' '));
      const c = el('span', 'cnt', db[k].length.toLocaleString());
      b.appendChild(c);
      b.addEventListener('click', () => { state.workType = k; state.workYear = 'all'; renderWorks(); });
      typebar.appendChild(b);
    }
    const list0 = db[state.workType] || [];
    // year chips
    const ycounts = new Map();
    let undated = 0;
    for (const w of list0) { if (w.y) ycounts.set(w.y, (ycounts.get(w.y) || 0) + 1); else undated++; }
    const years = [...ycounts.entries()].sort((a, b) => b[0] - a[0]);
    const yearbar = $('#workYearTabs');
    yearbar.innerHTML = '';
    const mkYearChip = (label, key) => {
      const b = el('button', 'chip' + (state.workYear === key ? ' active' : ''));
      b.appendChild(document.createTextNode(label + ' '));
      b.appendChild(el('span', 'cnt', key === 'all' ? String(list0.length) : (key === 'undated' ? String(undated) : String(ycounts.get(key) || 0))));
      b.addEventListener('click', () => { state.workYear = key; renderWorks(); });
      yearbar.appendChild(b);
    };
    mkYearChip('全部', 'all');
    for (const [y, n] of years) mkYearChip(String(y), y);
    if (undated) mkYearChip('未定', 'undated');

    // filter + sort
    const q = state.workQuery.trim().toLowerCase();
    let list = list0;
    if (state.workYear !== 'all') {
      const sel = state.workYear === 'undated' ? null : Number(state.workYear);
      list = list.filter(w => state.workYear === 'undated' ? !w.y : w.y === sel);
    }
    if (q) {
      list = list.filter(w => (w.t || '').toLowerCase().includes(q) || (w.z || '').toLowerCase().includes(q));
    }
    if (state.workSort === 'letter') {
      list = [...list].sort((a, b) => ((a.py || a.t).localeCompare(b.py || b.t, 'zh')) * state.workDir || ((a.y || 0) - (b.y || 0)));
    } else {
      list = [...list].sort((a, b) => ((a.y || 9999) - (b.y || 9999)) * state.workDir || (a.d || '').localeCompare(b.d || '') * state.workDir);
    }
    $('#worksMeta').textContent = `共 ${list.length.toLocaleString()} 部`;
    $('#worksPageSub').textContent = `${TYPE_LABEL[state.workType]} · ${list0.length.toLocaleString()} 部`;
    grid.innerHTML = '';
    if (!list.length) { grid.appendChild(el('div', 'noresult', '没有匹配的作品')); return; }
    if (state.workSort === 'letter') {
      let lastG = null;
      for (const w of list) {
        const g = /^[A-Z]$/.test(w.i) ? w.i : (w.i || '#');
        if (g !== lastG) { grid.appendChild(el('div', 'letter-head', g)); lastG = g; }
        grid.appendChild(renderWorkCard(w));
      }
    } else {
      for (const w of list) grid.appendChild(renderWorkCard(w));
    }
  }

  function renderWorkCard(w) {
    const card = el('div', 'work-card');
    const head = el('div', 'work-card-head');
    const titleWrap = el('div');
    titleWrap.className = 'work-card-title';
    titleWrap.appendChild(document.createTextNode(w.z || w.t));
    if (w.z) titleWrap.appendChild(el('div', 'work-card-ja', w.t));
    head.appendChild(titleWrap);
    const badge = el('span', 'badge ' + w.k, TYPE_LABEL[w.k] || '其他');
    head.appendChild(badge);
    card.appendChild(head);
    const foot = el('div', 'work-card-foot');
    if (w.y) foot.appendChild(el('span', '', `${w.y}年${w.d ? '·' + w.d.slice(5, 7).replace(/^0/, '') + '月' : ''}`));
    else foot.appendChild(el('span', '', '年份未定'));
    if (w.sc) {
      const s = el('span', 'staff-n', `${w.sc} 人参与`);
      foot.appendChild(s);
    }
    card.appendChild(foot);
    card.addEventListener('click', () => window.open(weblioUrl(w.t), '_blank'));
    return card;
  }

  /* ============ authors / companies ============ */
  async function renderTable(kind) {
    const cfg = kind === 'authors'
      ? { key: 'authors', file: 'data/authors.json', wrap: '#authorList', q: 'authorQuery', sort: 'authorSort', sub: '#authorsPageSub', count: (m) => `${m.authorsCount} 人` }
      : { key: 'companies', file: 'data/companies.json', wrap: '#companyList', q: 'companyQuery', sort: 'companySort', sub: '#companiesPageSub', count: (m) => `${m.companiesCount} 家` };
    const wrap = $(cfg.wrap);
    wrap.innerHTML = '<div class="loading">加载中…</div>';
    try { await ensureData(cfg.key, cfg.file); } catch (e) { wrap.innerHTML = '<div class="noresult">数据加载失败</div>'; return; }
    const data = state[cfg.key];
    $(cfg.sub).textContent = cfg.count(state.meta);
    const q = state[cfg.q].trim().toLowerCase();
    let list = data;
    if (q) list = list.filter(x => x.n.toLowerCase().includes(q));
    if (state[cfg.sort] === 'count') list = [...list].sort((a, b) => b.works.length - a.works.length);
    else list = [...list].sort((a, b) => (a.py || a.n).localeCompare(b.py || b.n, 'zh-Hans-CN'));
    wrap.innerHTML = '';
    if (!list.length) { wrap.appendChild(el('div', 'noresult', '没有匹配结果')); return; }
    for (const x of list) {
      const row = el('div', 'entry-row');
      const main = el('div', 'entry-main');
      main.appendChild(el('span', 'entry-name', x.n));
      const ymin = x.works.filter(w => w.y).reduce((a, w) => Math.min(a, w.y), 9999);
      const ymax = x.works.filter(w => w.y).reduce((a, w) => Math.max(a, w.y), 0);
      if (ymin < 9999) main.appendChild(el('span', 'entry-meta', `${ymin}–${ymax}`));
      main.appendChild(el('span', 'entry-count', `${x.works.length} 部`));
      row.appendChild(main);
      const works = el('div', 'entry-works');
      for (const w of [...x.works].sort((a, b) => (a.y || 0) - (b.y || 0))) {
        const s = el('span', 'entry-work');
        s.appendChild(document.createTextNode(w.y ? `${w.y} ` : ''));
        const b = el('b', '', w.t);
        s.appendChild(b);
        if (w.r && w.r.length) s.appendChild(document.createTextNode(`（${w.r.join('、')}）`));
        works.appendChild(s);
      }
      row.appendChild(works);
      main.addEventListener('click', () => row.classList.toggle('open'));
      wrap.appendChild(row);
    }
  }

  /* ============ deceased ============ */
  async function renderDeceased() {
    const wrap = $('#deceasedList');
    wrap.innerHTML = '<div class="loading">加载中…</div>';
    try { await ensureData('deceased', 'data/deceased.json'); } catch (e) { wrap.innerHTML = '<div class="noresult">数据加载失败</div>'; return; }
    $('#deceasedPageSub').textContent = `${state.meta.deceasedCount} 人`;
    const q = state.deceasedQuery.trim().toLowerCase();
    let list = state.deceased;
    if (q) list = list.filter(x => x.n.toLowerCase().includes(q) || (x.o || '').toLowerCase().includes(q));
    wrap.innerHTML = '';
    if (!list.length) { wrap.appendChild(el('div', 'noresult', '没有匹配结果')); return; }
    for (const x of list) {
      const row = el('div', 'news-row');
      row.appendChild(el('span', 'news-date', x.d || '—'));
      const name = el('span', 'news-name', x.n);
      if (x.w) {
        const a = el('a', '', x.n);
        a.href = 'javascript:void(0)';
        a.style.fontWeight = '600';
        name.textContent = '';
        name.appendChild(a);
        a.addEventListener('click', () => openStaffByName(x.n));
      }
      row.appendChild(name);
      row.appendChild(el('span', 'news-badge', '去世'));
      const desc = el('span', 'news-desc');
      const parts = [];
      if (x.o) parts.push(x.o);
      if (x.a) parts.push(`享年${x.a}岁`);
      if (x.r && x.r.length) parts.push(`代表作：${x.r.join('、')}`);
      if (x.w) parts.push(`OP表记 ${x.w} 部`);
      desc.appendChild(document.createTextNode(parts.join('，') + (parts.length ? '。' : '')));
      row.appendChild(desc);
      wrap.appendChild(row);
    }
  }

  function openStaffByName(name) {
    const entry = state.staffIndex.find(s => s.n === name);
    if (entry) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelector('.tab[data-view="staff"]').classList.add('active');
      $('#view-staff').classList.add('active');
      showStaff(entry);
    }
  }

  /* ============ events ============ */
  function bindEvents() {
    document.querySelectorAll('#mainTabs .tab').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#mainTabs .tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        $('#view-' + b.dataset.view).classList.add('active');
        if (b.dataset.view === 'works') renderWorks();
        else if (b.dataset.view === 'authors') renderTable('authors');
        else if (b.dataset.view === 'companies') renderTable('companies');
        else if (b.dataset.view === 'deceased') renderDeceased();
      });
    });

    const sInput = $('#staffSearch');
    sInput.addEventListener('input', () => {
      state.staffQuery = sInput.value;
      $('#staffSearchClear').classList.toggle('visible', !!sInput.value);
      renderStaffList();
    });
    $('#staffSearchClear').addEventListener('click', () => {
      sInput.value = ''; state.staffQuery = '';
      $('#staffSearchClear').classList.remove('visible');
      renderStaffList();
    });
    document.querySelectorAll('[data-staffsort]').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-staffsort]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.staffSort = b.dataset.staffsort;
        renderStaffList();
      });
    });

    const wInput = $('#workSearch');
    wInput.addEventListener('input', () => { state.workQuery = wInput.value; renderWorks(); });
    document.querySelectorAll('[data-worksort]').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-worksort]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.workSort = b.dataset.worksort;
        renderWorks();
      });
    });
    $('#workOrderToggle').addEventListener('click', () => {
      state.workDir = -state.workDir;
      $('#workOrderToggle').textContent = state.workDir < 0 ? '↓ 降序' : '↑ 升序';
      renderWorks();
    });

    const aInput = $('#authorSearch');
    aInput.addEventListener('input', () => { state.authorQuery = aInput.value; renderTable('authors'); });
    document.querySelectorAll('[data-authorsort]').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-authorsort]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.authorSort = b.dataset.authorsort;
        renderTable('authors');
      });
    });

    const cInput = $('#companySearch');
    cInput.addEventListener('input', () => { state.companyQuery = cInput.value; renderTable('companies'); });
    document.querySelectorAll('[data-companysort]').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-companysort]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.companySort = b.dataset.companysort;
        renderTable('companies');
      });
    });

    const dInput = $('#deceasedSearch');
    dInput.addEventListener('input', () => { state.deceasedQuery = dInput.value; renderDeceased(); });
  }

  boot();
})();
