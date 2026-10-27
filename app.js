/* 动画制作人员查询表 - AniStaff */
(function () {
  'use strict';

  const MOEGIRL = 'https://mzh.moegirl.org.cn';
  const WEBLIO = 'https://www.weblio.jp/content/';
  const LS_KEY = 'anistaff:zh-overrides';
  const $ = (sel) => document.querySelector(sel);

  const TYPE_LABEL = { tv: 'TV动画', movie: '剧场版', ova: 'OVA', web: '网络动画' };
  const PROF_ORDER = ['监督·演出', '脚本', '作画', '美术·色彩', '摄影·特效', '音响', '制作人', '编集', '企划', '制作', '其他'];

  const state = {
    meta: null,
    staffIndex: [],
    worksDb: null,
    authors: null,
    companies: null,
    deceased: null,
    credits: null,
    creditMap: null,
    shardCache: new Map(),
    staffQuery: '', staffSort: 'pinyin', activeStaff: null, profFilter: 'all',
    workType: 'tv', workYear: 'all', workQuery: '', workSort: 'time', workDir: -1,
    authorQuery: '', authorSort: 'count',
    companyQuery: '', companySort: 'count',
    deceasedQuery: '',
    untType: 'tv', untQuery: '', untPage: 1,
    fileZh: {},     // data/zh-overrides.json (committed)
    localZh: {},    // localStorage edits
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
  function normKey(s) {
    return String(s || '')
      .replace(/[\s\u3000\u00b7\u30fb·・.、,，!！?？〜~～♪☆★×_\-—–:：]/g, '')
      .replace(/[（(【\[].*?[）)】\]]/g, '')
      .replace(/[「」『』“”《》]/g, '')
      .toLowerCase();
  }
  function zhOfWork(w) {
    return state.localZh[w.t] || state.fileZh[w.t] || w.z || '';
  }
  function loadLocal() {
    try { state.localZh = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { state.localZh = {}; }
  }
  function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(state.localZh)); } catch { } }

  async function boot() {
    try {
      const [metaRes, idxRes] = await Promise.all([fetch('data/meta.json'), fetch('data/staff-index.json')]);
      state.meta = await metaRes.json();
      state.staffIndex = await idxRes.json();
    } catch (e) {
      document.getElementById('app').innerHTML = '<div class="loading">数据加载失败，请确认 data 目录完整部署。</div>';
      return;
    }
    try {
      const r = await fetch('data/zh-overrides.json');
      if (r.ok) state.fileZh = await r.json();
    } catch { }
    loadLocal();
    renderFooterMeta();
    renderProfFilter();
    renderStaffList();
    bindEvents();
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeWorkModal(); });
  }

  function renderFooterMeta() {
    const m = state.meta || {};
    if (!m.worksDb) { $('#footerMeta').textContent = ''; return; }
    const w = m.worksDb;
    $('#footerMeta').textContent =
      `已收录制作人员 ${m.staffCount.toLocaleString()} 位 · 作品库（1963 年起）TV动画 ${w.tv.toLocaleString()} / 剧场版 ${w.movie.toLocaleString()} / OVA ${w.ova.toLocaleString()} / 网络动画 ${w.web.toLocaleString()} · 原作 ${m.authorsCount} 人 · 制作公司 ${m.companiesCount} 家 · 去世人员 ${m.deceasedCount} 人 · 数据生成于 ${(m.generated || '').slice(0, 10)}`;
  }

  /* ============ staff view ============ */
  function renderProfFilter() {
    const bar = $('#profFilter');
    bar.innerHTML = '';
    const counts = new Map();
    for (const s of state.staffIndex) for (const p of s.p || []) {
      if (p === '制作' || p === '其他') continue;
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    const mk = (label, key, count) => {
      const b = el('button', 'chip' + (state.profFilter === key ? ' active' : ''));
      b.appendChild(document.createTextNode(label + ' '));
      if (count !== undefined) b.appendChild(el('span', 'cnt', String(count)));
      b.addEventListener('click', () => {
        state.profFilter = key;
        renderProfFilter();
        renderStaffList();
      });
      bar.appendChild(b);
    };
    mk('全部职业', 'all', state.staffIndex.length);
    for (const p of PROF_ORDER) {
      if (p === '制作' || p === '其他') continue;
      if (counts.get(p)) mk(p, p, counts.get(p));
    }
  }

  function filteredStaff() {
    const q = state.staffQuery.trim().toLowerCase().replace(/\s+/g, '');
    let list = state.staffIndex;
    if (state.profFilter !== 'all') list = list.filter(s => (s.p || []).includes(state.profFilter));
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
      if (!/^[A-Z]$/.test(s.i)) continue; // 不保留 # 分类
      const g = s.i;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(s);
    }
    if (!groups.size) { wrap.appendChild(el('div', 'noresult', '没有匹配的人员')); renderAz([]); return; }
    renderAz([...groups.keys()]);
    for (const [g, items] of groups) {
      const gdiv = el('div', 'letter-group');
      gdiv.id = 'az-' + g;
      gdiv.appendChild(el('div', 'letter-title', g));
      for (const s of items) {
        const item = el('div', 'staff-item' + (state.activeStaff === s.n ? ' active' : ''));
        const left = el('div', 'staff-left');
        left.appendChild(el('span', 'staff-name', s.n));
        const proftags = el('span', 'prof-tags');
        for (const p of (s.p || []).filter(p2 => p2 !== '制作' && p2 !== '其他').slice(0, 4)) proftags.appendChild(el('span', 'prof-tag', p));
        left.appendChild(proftags);
        item.appendChild(left);
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
        if (t) {
          const y = t.getBoundingClientRect().top + window.scrollY - 116;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
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
    if (rec.p && rec.p.length) parts.push(`职业：${rec.p.join(' · ')}`);
    if (rec.tv.length) parts.push(`TV动画 ${rec.tv.length} 部`);
    if (rec.mo.length) parts.push(`剧场版 ${rec.mo.length} 部`);
    if (rec.ov.length) parts.push(`OVA ${rec.ov.length} 部`);
    if (rec.wb.length) parts.push(`网络动画 ${rec.wb.length} 部`);
    stats.textContent = parts.join(' ｜ ') || '暂无作品记录';
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
    const zh = state.localZh[w.j] || state.fileZh[w.j] || '';
    const link = w.u ? moegirlUrl(w.u) : (w.j ? weblioUrl(w.j) : null);
    const label = zh ? `${w.t}（${zh}）` : w.t;
    if (link) {
      const a = el('a', '', label); a.href = link; a.target = '_blank'; a.rel = 'noopener';
      tw.appendChild(a);
    } else tw.appendChild(document.createTextNode(label));
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
    const typebar = $('#workTypeTabs');
    typebar.innerHTML = '';
    for (const k of ['tv', 'movie', 'ova', 'web']) {
      const b = el('button', 'chip' + (state.workType === k ? ' active' : ''));
      b.appendChild(document.createTextNode(TYPE_LABEL[k] + ' '));
      b.appendChild(el('span', 'cnt', db[k].length.toLocaleString()));
      b.addEventListener('click', () => { state.workType = k; state.workYear = 'all'; renderWorks(); });
      typebar.appendChild(b);
    }
    const list0 = db[state.workType] || [];
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

    const q = state.workQuery.trim().toLowerCase();
    let list = list0;
    if (state.workYear !== 'all') {
      const sel = state.workYear === 'undated' ? null : Number(state.workYear);
      list = list.filter(w => state.workYear === 'undated' ? !w.y : w.y === sel);
    }
    if (q) {
      list = list.filter(w => (w.t || '').toLowerCase().includes(q) || (zhOfWork(w) || '').toLowerCase().includes(q));
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
        const g = /^[A-Z]$/.test(w.i) ? w.i : null;
        if (!g) continue; // 不保留 # 分类
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
    const zh = zhOfWork(w);
    titleWrap.appendChild(document.createTextNode(zh || w.t));
    if (zh) titleWrap.appendChild(el('div', 'work-card-ja', w.t));
    head.appendChild(titleWrap);
    const badge = el('span', 'badge ' + w.k, TYPE_LABEL[w.k] || '其他');
    head.appendChild(badge);
    card.appendChild(head);
    const foot = el('div', 'work-card-foot');
    if (w.y) foot.appendChild(el('span', '', `${w.y}年${w.d ? '·' + w.d.slice(5, 7).replace(/^0/, '') + '月' : ''}`));
    else foot.appendChild(el('span', '', '年份未定'));
    if (w.sc) foot.appendChild(el('span', 'staff-n', `${w.sc} 人参与`));
    foot.appendChild(el('span', 'open-hint', '查看表记 →'));
    card.appendChild(foot);
    card.addEventListener('click', () => openWorkModal(w));
    return card;
  }

  /* ---------- work modal ---------- */
  async function ensureCredits() {
    if (state.creditMap) return;
    if (!state.credits) {
      try { state.credits = await (await fetch('data/works-credits.json')).json(); } catch { state.credits = []; }
    }
    const map = new Map();
    for (const c of state.credits) {
      const k1 = normKey(c.t);
      const k2 = normKey(c.j);
      if (k1) map.set(k1, c);
      if (k2 && !map.has(k2)) map.set(k2, c);
    }
    state.creditMap = map;
  }

  function closeWorkModal() { $('#workModal').hidden = true; }

  async function openWorkModal(w) {
    const modal = $('#workModal');
    const body = $('#workModalBody');
    $('#workModalTitle').textContent = zhOfWork(w) || w.t;
    $('#workModalSub').textContent = [w.y ? `${w.y}年` : '年份未定', TYPE_LABEL[w.k] || '', w.c || '', w.dir ? `监督：${w.dir}` : '', w.z && w.z !== (zhOfWork(w)) ? `中文：${zhOfWork(w)}` : ''].filter(Boolean).join(' · ');
    body.innerHTML = '<div class="loading">加载表记…</div>';
    modal.hidden = false;
    await ensureCredits();
    const rec = state.creditMap.get(normKey(zhOfWork(w))) || state.creditMap.get(normKey(w.t)) || state.creditMap.get(normKey(w.z));
    body.innerHTML = '';
    if (!rec || !rec.c || !rec.c.length) {
      body.appendChild(el('div', 'noresult', '暂无制作人员表记数据'));
    } else {
      const list = [...rec.c].sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'));
      body.appendChild(el('div', 'modal-count', `共 ${list.length} 位制作人员`));
      const ul = el('div', 'credit-list');
      for (const [name, roles] of list) {
        const row = el('div', 'credit-row');
        row.appendChild(el('span', 'credit-name', name));
        const rs = el('span', 'credit-roles');
        for (const r of String(roles || '').split('、').filter(Boolean).slice(0, 6)) rs.appendChild(el('span', 'role-chip', r));
        row.appendChild(rs);
        ul.appendChild(row);
      }
      body.appendChild(ul);
    }
    const linkLine = el('div', 'modal-links');
    const wl = el('a', '', '在 Weblio 查看 ↗');
    wl.href = weblioUrl(w.t); wl.target = '_blank'; wl.rel = 'noopener';
    linkLine.appendChild(wl);
    body.appendChild(linkLine);
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
      const years = x.works.filter(w => w.y).map(w => w.y);
      if (years.length) main.appendChild(el('span', 'entry-meta', `${Math.min(...years)}–${Math.max(...years)}`));
      main.appendChild(el('span', 'entry-count', `${x.works.length} 部`));
      row.appendChild(main);
      const works = el('div', 'entry-works');
      for (const w of [...x.works].sort((a, b) => (a.y || 0) - (b.y || 0))) {
        const s = el('span', 'entry-work');
        s.appendChild(document.createTextNode(w.y ? `${w.y} ` : ''));
        s.appendChild(el('b', '', w.t));
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
      row.addEventListener('click', () => openStaffByName(x.n));
      wrap.appendChild(row);
    }
  }

  function openStaffByName(name) {
    const entry = state.staffIndex.find(s => s.n === name);
    if (!entry) return;
    document.querySelectorAll('#mainTabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelector('.tab[data-view="staff"]').classList.add('active');
    $('#view-staff').classList.add('active');
    showStaff(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============ untranslated editor ============ */
  async function renderUntranslated() {
    const wrap = $('#untranslatedList');
    wrap.innerHTML = '<div class="loading">加载中…</div>';
    try { await ensureData('worksDb', 'data/works-db.json'); } catch (e) { wrap.innerHTML = '<div class="noresult">数据加载失败</div>'; return; }
    const typebar = $('#untranslatedTypeTabs');
    typebar.innerHTML = '';
    const types = ['tv', 'movie', 'ova'];
    const untCount = {};
    for (const k of types) untCount[k] = state.worksDb[k].filter(w => !zhOfWork(w)).length;
    for (const k of types) {
      const b = el('button', 'chip' + (state.untType === k ? ' active' : ''));
      b.appendChild(document.createTextNode(TYPE_LABEL[k] + ' '));
      b.appendChild(el('span', 'cnt', String(untCount[k])));
      b.addEventListener('click', () => { state.untType = k; state.untPage = 1; renderUntranslated(); });
      typebar.appendChild(b);
    }
    const q = state.untQuery.trim().toLowerCase();
    let list = state.worksDb[state.untType].filter(w => !zhOfWork(w));
    if (q) list = list.filter(w => (w.t || '').toLowerCase().includes(q));
    list = [...list].sort((a, b) => ((a.y || 9999) - (b.y || 9999)) || (a.t || '').localeCompare(b.t || '', 'zh'));
    $('#untranslatedPageSub').textContent = `待翻译 ${list.length.toLocaleString()} 部（${TYPE_LABEL[state.untType]}）· 已编辑 ${Object.keys(state.localZh).length} 条`;
    const PAGE = 150;
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (state.untPage > pages) state.untPage = pages;
    const start = (state.untPage - 1) * PAGE;
    const view = list.slice(start, start + PAGE);
    wrap.innerHTML = '';
    if (!view.length) {
      wrap.appendChild(el('div', 'noresult', '没有待翻译的作品'));
      return;
    }
    for (const w of view) {
      const row = el('div', 'edit-row');
      row.appendChild(el('span', 'edit-year', w.y ? String(w.y) : '—'));
      row.appendChild(el('span', 'edit-ja', w.t));
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.placeholder = '输入中文名';
      input.value = state.localZh[w.t] || state.fileZh[w.t] || '';
      input.addEventListener('change', () => {
        const v = input.value.trim();
        if (v) state.localZh[w.t] = v;
        else delete state.localZh[w.t];
        saveLocal();
        const sub = $('#untranslatedPageSub');
        if (sub) sub.textContent = sub.textContent.replace(/已编辑 \d+ 条/, `已编辑 ${Object.keys(state.localZh).length} 条`);
      });
      row.appendChild(input);
      wrap.appendChild(row);
    }
    const pager = el('div', 'pager');
    const prev = el('button', 'chip', '上一页');
    prev.disabled = state.untPage <= 1;
    prev.addEventListener('click', () => { state.untPage--; renderUntranslated(); });
    const info = el('span', 'pager-info', `${state.untPage} / ${pages} 页（共 ${list.length} 条）`);
    const next = el('button', 'chip', '下一页');
    next.disabled = state.untPage >= pages;
    next.addEventListener('click', () => { state.untPage++; renderUntranslated(); });
    pager.appendChild(prev); pager.appendChild(info); pager.appendChild(next);
    wrap.appendChild(pager);
  }

  function exportOverrides() {
    const merged = { ...state.fileZh, ...state.localZh };
    const blob = new Blob([JSON.stringify(merged, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'zh-overrides.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function importOverrides(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        if (data && typeof data === 'object') {
          for (const [k, v] of Object.entries(data)) if (v) state.localZh[k] = String(v);
          saveLocal();
          renderUntranslated();
          alert(`已导入 ${Object.keys(data).length} 条中文名`);
        }
      } catch (e) { alert('JSON 解析失败：' + e.message); }
    };
    reader.readAsText(file);
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
        else if (b.dataset.view === 'untranslated') renderUntranslated();
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

    const uInput = $('#untranslatedSearch');
    uInput.addEventListener('input', () => { state.untQuery = uInput.value; state.untPage = 1; renderUntranslated(); });
    $('#exportZhBtn').addEventListener('click', exportOverrides);
    $('#importZhBtn').addEventListener('click', () => $('#importZhFile').click());
    $('#importZhFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importOverrides(f);
      e.target.value = '';
    });
    $('#clearZhBtn').addEventListener('click', () => {
      if (!confirm('确定清空浏览器本地编辑（不影响仓库中的 zh-overrides.json）？')) return;
      state.localZh = {};
      saveLocal();
      renderUntranslated();
    });

    $('#workModalClose').addEventListener('click', closeWorkModal);
    $('#workModal').addEventListener('click', (e) => { if (e.target === $('#workModal')) closeWorkModal(); });
  }

  boot();
})();
