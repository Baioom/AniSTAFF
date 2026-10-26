/* 动画制作人员查询表 - AniStaff */
(function () {
  'use strict';

  const MOEGIRL = 'https://mzh.moegirl.org.cn';
  const WEBLIO = 'https://www.weblio.jp/content/';

  const $ = (sel) => document.querySelector(sel);
  const state = {
    staffIndex: [],
    meta: null,
    worksDb: null,
    shardCache: new Map(),
    staffQuery: '',
    staffSort: 'pinyin',
    activeStaff: null,
    workType: 'tv',
    workQuery: '',
    workSort: 'time',
    workDir: -1, // -1 desc, 1 asc
    groupMode: {}, // per staff+type: {mode, dir}
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function moegirlUrl(path) { return MOEGIRL + path; }
  function weblioUrl(name) { return WEBLIO + encodeURIComponent(name); }

  /* ---------- boot ---------- */
  async function boot() {
    try {
      const [metaRes, idxRes] = await Promise.all([
        fetch('data/meta.json'), fetch('data/staff-index.json'),
      ]);
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
    $('#footerMeta').textContent = m.worksDb
      ? `已收录 ${m.staffCount.toLocaleString()} 位制作人员 · 作品库：TV动画 ${m.worksDb.tv.toLocaleString()} 部 / 剧场版 ${m.worksDb.movie.toLocaleString()} 部 / OVA ${m.worksDb.ova.toLocaleString()} 部 · 数据生成于 ${(m.generated || '').slice(0, 10)}`
      : '';
  }

  /* ---------- staff list ---------- */
  function filteredStaff() {
    const q = state.staffQuery.trim().toLowerCase().replace(/\s+/g, '');
    let list = state.staffIndex;
    if (q) {
      list = list.filter(s => {
        if (s.n.toLowerCase().includes(q)) return true;
        if ((s.py || '').replace(/\s+/g, '').includes(q)) return true;
        return false;
      });
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
    if (!list.length) {
      wrap.appendChild(el('div', 'noresult', '没有匹配的人员'));
      renderAz([]);
      return;
    }
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
        const name = el('span', 'staff-name', s.n);
        const counts = el('span', 'staff-counts');
        counts.innerHTML = '';
        const parts = [];
        if (s.tv) parts.push(`TV <b>${s.tv}</b>`);
        if (s.mo) parts.push(`剧场 <b>${s.mo}</b>`);
        if (s.ov) parts.push(`OVA <b>${s.ov}</b>`);
        if (s.wb) parts.push(`网络 <b>${s.wb}</b>`);
        if (!parts.length) parts.push(`作品 <b>${s.total}</b>`);
        counts.innerHTML = parts.join(' · ');
        item.appendChild(name);
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
        const target = document.getElementById('az-' + g);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      bar.appendChild(b);
    }
  }

  /* ---------- staff detail ---------- */
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
        const res = await fetch(`data/staff-${fileKey}.json`);
        shard = await res.json();
        state.shardCache.set(fileKey, shard);
      } catch (e) {
        detail.innerHTML = '<div class="detail-empty">数据加载失败</div>';
        return;
      }
    }
    const rec = shard.find(r => r.n === idxEntry.n);
    if (!rec) {
      detail.innerHTML = '<div class="detail-empty">未找到该人员数据</div>';
      return;
    }
    renderDetail(rec);
    // mark active item in the possibly re-rendered list
    document.querySelectorAll('.staff-item').forEach(n => {
      if (n.querySelector('.staff-name').textContent === rec.n) n.classList.add('active');
    });
  }

  function renderDetail(rec) {
    const detail = $('#staffDetail');
    detail.innerHTML = '';
    const card = el('div', 'detail-card');

    const head = el('div', 'detail-head');
    const h2 = el('h2', '', rec.n);
    head.appendChild(h2);
    if (rec.u) {
      const a = el('a', 'moegirl-link', '萌娘百科 ↗');
      a.href = moegirlUrl(rec.u);
      a.target = '_blank';
      a.rel = 'noopener';
      head.appendChild(a);
    }
    card.appendChild(head);

    const stats = el('div', 'detail-stats');
    const statParts = [];
    if (rec.tv.length) statParts.push(`TV动画 ${rec.tv.length} 部`);
    if (rec.mo.length) statParts.push(`剧场版 ${rec.mo.length} 部`);
    if (rec.ov.length) statParts.push(`OVA ${rec.ov.length} 部`);
    if (rec.wb.length) statParts.push(`网络动画 ${rec.wb.length} 部`);
    stats.textContent = statParts.join(' · ') || '暂无作品记录';
    card.appendChild(stats);

    const groups = [
      { key: 'tv', label: 'TV动画', color: 'var(--tv)', data: rec.tv },
      { key: 'mo', label: '剧场版', color: 'var(--movie)', data: rec.mo },
      { key: 'ov', label: 'OVA', color: 'var(--ova)', data: rec.ov },
      { key: 'wb', label: '网络动画', color: 'var(--web)', data: rec.wb },
    ];

    for (const grp of groups) {
      const gdiv = el('div', 'work-group');
      const ghead = el('div', 'work-group-head');
      const gtitle = el('div', 'work-group-title');
      const dot = el('span', 'dot');
      dot.style.background = grp.color;
      gtitle.appendChild(dot);
      gtitle.appendChild(document.createTextNode(grp.label));
      const badge = el('span', 'count-badge', String(grp.data.length));
      gtitle.appendChild(badge);
      ghead.appendChild(gtitle);

      const stateKey = rec.n + '|' + grp.key;
      const gm = state.groupMode[stateKey] || { mode: 'time', dir: 1 };
      const sortWrap = el('div', 'mini-sort');
      const mkBtn = (label, mode) => {
        const b = el('button', gm.mode === mode ? 'active' : '', label + (gm.mode === mode ? (gm.dir > 0 ? ' ↑' : ' ↓') : ''));
        b.addEventListener('click', () => {
          if (gm.mode === mode) gm.dir = -gm.dir;
          else { gm.mode = mode; gm.dir = mode === 'time' ? 1 : 1; }
          state.groupMode[stateKey] = gm;
          renderDetail(rec);
        });
        sortWrap.appendChild(b);
      };
      mkBtn('时间', 'time');
      mkBtn('首字母', 'letter');
      ghead.appendChild(sortWrap);
      gdiv.appendChild(ghead);

      if (!grp.data.length) {
        gdiv.appendChild(el('div', 'group-empty', '暂无记录'));
      } else {
        const sorted = sortWorks(grp.data, gm.mode, gm.dir);
        for (const w of sorted) gdiv.appendChild(renderWorkItem(w));
      }
      card.appendChild(gdiv);
    }

    detail.appendChild(card);
  }

  function sortWorks(arr, mode, dir) {
    const copy = [...arr];
    if (mode === 'letter') {
      copy.sort((a, b) => ((a.py || a.t).localeCompare(b.py || b.t, 'zh-Hans-CN')) * dir || ((a.y || 0) - (b.y || 0)) * dir);
    } else {
      copy.sort((a, b) => ((a.y || 9999) - (b.y || 9999)) * dir || ((a.d || '') < (b.d || '') ? -1 * dir : 1 * dir) || (a.py || a.t).localeCompare(b.py || b.t, 'zh-Hans-CN'));
    }
    return copy;
  }

  function renderWorkItem(w) {
    const item = el('div', 'work-item');
    const year = el('span', 'work-year', w.y ? String(w.y) : '—');
    item.appendChild(year);
    const titleWrap = el('span', 'work-title');
    const linkText = w.t;
    const link = w.u
      ? moegirlUrl(w.u)
      : (w.j ? weblioUrl(w.j) : null);
    if (link) {
      const a = el('a', '', linkText);
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener';
      titleWrap.appendChild(a);
    } else {
      titleWrap.appendChild(document.createTextNode(linkText));
    }
    if (w.j && w.j !== w.t) {
      titleWrap.appendChild(el('span', 'ja', w.j));
    }
    item.appendChild(titleWrap);
    if (w.r && w.r.length) {
      const roles = el('span', 'work-roles');
      for (const r of w.r.slice(0, 6)) roles.appendChild(el('span', 'role-chip', r));
      item.appendChild(roles);
    }
    return item;
  }

  /* ---------- works db ---------- */
  async function ensureWorksDb() {
    if (state.worksDb) return;
    const res = await fetch('data/works-db.json');
    state.worksDb = await res.json();
  }

  async function renderWorks() {
    const wrap = $('#worksList');
    wrap.innerHTML = '<div class="loading">加载中…</div>';
    try { await ensureWorksDb(); } catch (e) {
      wrap.innerHTML = '<div class="noresult">作品库加载失败</div>';
      return;
    }
    const db = state.worksDb;
    let list = db[state.workType] || [];
    const q = state.workQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(w => (w.t || '').toLowerCase().includes(q) || (w.z || '').toLowerCase().includes(q));
    }
    if (state.workSort === 'letter') {
      list = [...list].sort((a, b) => ((a.py || a.t).localeCompare(b.py || b.t, 'ja')) * state.workDir || ((a.y || 0) - (b.y || 0)));
    } else {
      list = [...list].sort((a, b) => ((a.y || 9999) - (b.y || 9999)) * state.workDir || (a.d || '').localeCompare(b.d || '') * state.workDir);
    }
    $('#worksMeta').textContent = `共 ${list.length.toLocaleString()} 部作品${q ? '（已筛选）' : ''}`;
    wrap.innerHTML = '';
    if (!list.length) {
      wrap.appendChild(el('div', 'noresult', '没有匹配的作品'));
      return;
    }
    if (state.workSort === 'letter') {
      let lastG = null;
      for (const w of list) {
        const g = /^[A-Z]$/.test(w.i) ? w.i : (w.i || '#');
        if (g !== lastG) {
          wrap.appendChild(el('div', 'letter-head', g));
          lastG = g;
        }
        wrap.appendChild(renderWorksItem(w));
      }
    } else {
      for (const w of list) wrap.appendChild(renderWorksItem(w));
    }
  }

  function renderWorksItem(w) {
    const item = el('div', 'works-item');
    item.appendChild(el('span', 'works-year', w.y ? `${w.y}${w.d ? '·' + w.d.slice(5) : ''}` : '年份未知'));
    const tw = el('div', 'works-title');
    const a = el('a', '', w.z || w.t);
    a.href = weblioUrl(w.t);
    a.target = '_blank';
    a.rel = 'noopener';
    tw.appendChild(a);
    if (w.z && w.t !== w.z) tw.appendChild(el('span', 'z', w.t));
    item.appendChild(tw);
    const extra = [];
    if (w.dir) extra.push(`监督:${w.dir}`);
    if (w.c) extra.push(w.c);
    if (extra.length) item.appendChild(el('div', 'works-extra', extra.join(' · ')));
    return item;
  }

  /* ---------- events ---------- */
  function bindEvents() {
    // tabs
    document.querySelectorAll('#mainTabs .tab').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#mainTabs .tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        $('#view-' + b.dataset.view).classList.add('active');
        if (b.dataset.view === 'works') renderWorks();
      });
    });

    // staff search
    const sInput = $('#staffSearch');
    sInput.addEventListener('input', () => {
      state.staffQuery = sInput.value;
      $('#staffSearchClear').classList.toggle('visible', !!sInput.value);
      renderStaffList();
    });
    $('#staffSearchClear').addEventListener('click', () => {
      sInput.value = '';
      state.staffQuery = '';
      $('#staffSearchClear').classList.remove('visible');
      renderStaffList();
    });

    // staff sort chips
    document.querySelectorAll('[data-staffsort]').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-staffsort]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.staffSort = b.dataset.staffsort;
        renderStaffList();
      });
    });

    // works type tabs
    document.querySelectorAll('#workTypeTabs .chip').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#workTypeTabs .chip').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.workType = b.dataset.type;
        renderWorks();
      });
    });

    // works search
    const wInput = $('#workSearch');
    wInput.addEventListener('input', () => {
      state.workQuery = wInput.value;
      $('#workSearchClear').classList.toggle('visible', !!wInput.value);
      renderWorks();
    });
    $('#workSearchClear').addEventListener('click', () => {
      wInput.value = '';
      state.workQuery = '';
      $('#workSearchClear').classList.remove('visible');
      renderWorks();
    });

    // works sort
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
  }

  boot();
})();
