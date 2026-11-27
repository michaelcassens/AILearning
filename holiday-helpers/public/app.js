'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  let config = null;
  let claims = [];
  let adminEnabled = false;
  let firstSnapshot = true;
  let openFormFor = null; // itemId whose claim form is open
  let pendingFocus = null;

  // ---- this device's own claims (so people can undo their own mistakes) ----
  const KEY = 'hh-my-claims';
  const mine = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  const saveMine = () => { try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch { /* private mode */ } };
  let adminPin = '';
  try { adminPin = sessionStorage.getItem('hh-pin') || ''; } catch { /* ignore */ }

  // ---- helpers ----
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  const allItems = () => config.lists.flatMap((l) => l.groups.flatMap((g) => g.items.map((i) => ({ list: l, item: i }))));
  const claimsFor = (itemId) => claims.filter((c) => c.itemId === itemId).sort((a, b) => a.at.localeCompare(b.at));
  const itemLabel = (id) => { const f = allItems().find((x) => x.item.id === id); return f ? f.item.label : 'an item'; };
  const listOf = (id) => { const f = allItems().find((x) => x.item.id === id); return f && f.list; };

  function ago(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' hr ago';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function toast(msg, err) {
    const t = h('div', { class: 'toast' + (err ? ' err' : '') }, msg);
    const box = $('toasts');
    box.append(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.remove(), err ? 6000 : 4500);
  }
  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  // ---- actions ----
  async function claim(item, name, btn) {
    btn.disabled = true;
    try {
      const res = await post('/api/claim', { itemId: item.id, name });
      mine[res.id] = res.token; saveMine();
      openFormFor = null;
      render();
      toast('Thank you! “' + item.label + '” is marked as covered.');
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  }
  async function unclaim(c, asAdmin) {
    try {
      await post('/api/unclaim', asAdmin ? { id: c.id, pin: adminPin } : { id: c.id, token: mine[c.id] });
      delete mine[c.id]; saveMine();
      toast('Removed — that item is available again.');
    } catch (e) { toast(e.message, true); }
  }

  // ---- rendering ----
  function currentListId() {
    const id = location.hash.slice(1);
    return config.lists.some((l) => l.id === id) ? id : config.lists[0].id;
  }
  function counts(list) {
    const items = list.groups.flatMap((g) => g.items);
    const covered = items.filter((i) => claimsFor(i.id).length).length;
    return { total: items.length, covered };
  }

  function renderTabs() {
    const cur = currentListId();
    $('tabs').replaceChildren(...config.lists.map((l) => {
      const c = counts(l);
      return h('a', { class: 'tab', href: '#' + l.id, 'aria-current': l.id === cur ? 'page' : null },
        h('strong', null, l.tab), h('small', null, c.covered + ' of ' + c.total + ' covered'));
    }));
  }

  function renderClaimForm(item) {
    const input = h('input', { type: 'text', id: 'name-' + item.id, maxlength: '30', autocomplete: 'off', placeholder: 'Leave blank to stay anonymous' });
    const go = h('button', { type: 'button', class: 'btn' }, 'Confirm — I’ll get this');
    const submit = () => claim(item, input.value, go);
    go.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { openFormFor = null; pendingFocus = 'btn-' + item.id; render(); } });
    const form = h('div', { class: 'claim-form' },
      h('label', { for: input.id }, 'Your first name (optional)', input),
      go,
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { openFormFor = null; pendingFocus = 'btn-' + item.id; render(); } }, 'Cancel'));
    pendingFocus = pendingFocus || input.id;
    return form;
  }

  function renderItem(list, item) {
    const cs = claimsFor(item.id);
    const taken = cs.length > 0;
    const nameEl = h('div', { class: 'item-name' },
      h('span', { class: 'label' }, item.label),
      item.detail ? h('span', { class: 'item-detail' }, ' — ' + item.detail) : null);
    const li = h('li', { class: 'item' + (taken && !list.multi ? ' taken' : '') }, nameEl);

    if (!list.multi && taken) {
      const c = cs[0];
      li.append(h('span', { class: 'badge' }, '✓ Covered'));
      const who = c.name ? 'Claimed by ' + c.name : 'Claimed by someone anonymously';
      li.append(h('div', { class: 'item-status' }, who + ' · ' + ago(c.at), ' ',
        mine[c.id] ? h('button', { type: 'button', class: 'btn ghost small', onclick: () => unclaim(c) }, 'Undo') : null,
        adminPin && !mine[c.id] ? h('button', { type: 'button', class: 'btn ghost small', onclick: () => unclaim(c, true) }, 'Remove (organizer)') : null));
      return li;
    }

    // available (single) or any state (multi)
    const open = openFormFor === item.id;
    li.append(h('button', {
      type: 'button', class: 'btn', id: 'btn-' + item.id, 'aria-expanded': String(open),
      onclick: () => { openFormFor = item.id; pendingFocus = null; render(); },
    }, list.multi ? 'I’ll bring one' : 'I’ll get this'));
    if (open) li.append(renderClaimForm(item));

    if (list.multi && taken) {
      li.append(h('div', { class: 'item-status' },
        h('span', { class: 'badge' }, '✓ ' + cs.length + (cs.length === 1 ? ' person is' : ' people are') + ' bringing this'),
        h('ul', { class: 'pledges' }, cs.map((c) => h('li', null,
          (c.name || 'Anonymous') + ' · ' + ago(c.at),
          mine[c.id] ? h('button', { type: 'button', class: 'btn ghost small', onclick: () => unclaim(c) }, 'Undo') : null,
          adminPin && !mine[c.id] ? h('button', { type: 'button', class: 'btn ghost small', onclick: () => unclaim(c, true) }, 'Remove') : null)))));
    }
    return li;
  }

  function renderPanel() {
    const list = config.lists.find((l) => l.id === currentListId());
    const c = counts(list);
    const pct = Math.round((c.covered / c.total) * 100);
    const card = h('div', { class: 'card' },
      h('h2', { id: 'list-h', tabindex: '-1' }, list.title),
      h('p', { class: 'intro' }, list.intro),
      list.notes && list.notes.length ? h('ul', { class: 'notes' }, list.notes.map((n) => h('li', null, n))) : null,
      h('div', { class: 'progress' },
        h('div', { class: 'progress-label' }, c.covered + ' of ' + c.total + ' items covered'),
        h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Items covered', 'aria-valuemin': '0', 'aria-valuemax': String(c.total), 'aria-valuenow': String(c.covered) },
          (() => { const f = h('span'); f.style.width = pct + '%'; return f; })())),
      list.groups.map((g) => [h('h3', null, g.title), h('ul', { class: 'items' }, g.items.map((i) => renderItem(list, i)))]));
    $('panel').replaceChildren(card);
  }

  function renderActivity() {
    const recent = [...claims].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
    $('activity').replaceChildren(...(recent.length
      ? recent.map((c) => {
          const l = listOf(c.itemId);
          return h('li', null, h('strong', null, c.name || 'Someone'), ' got ', h('strong', null, itemLabel(c.itemId)),
            ' for ', l ? l.tab : 'a list', ' ', h('span', { class: 'when' }, '· ' + ago(c.at)));
        })
      : [h('li', { class: 'empty' }, 'Nothing claimed yet — be the first!')]));
  }

  function renderStatic() {
    const d = config.dropoff;
    $('dropoff').replaceChildren(h('strong', null, 'Drop-off: '), d.text + ' Questions? ',
      h('a', { href: 'mailto:' + d.contact }, d.contact), '.');
  }

  function render() {
    if (!config) return;
    // keep a half-typed name when live updates re-render the page
    const active = document.activeElement;
    const typed = active && active.tagName === 'INPUT' ? { id: active.id, value: active.value, pos: active.selectionStart } : null;
    renderTabs(); renderPanel(); renderActivity();
    if (typed) {
      const el = $(typed.id);
      if (el) { el.value = typed.value; el.focus(); try { el.setSelectionRange(typed.pos, typed.pos); } catch { /* ignore */ } }
    } else if (pendingFocus) {
      const el = $(pendingFocus); if (el) el.focus();
    }
    pendingFocus = null;
  }

  // ---- live updates ----
  function applySnapshot(next) {
    if (!firstSnapshot) {
      const known = new Set(claims.map((c) => c.id));
      for (const c of next) {
        if (!known.has(c.id) && !mine[c.id]) {
          toast((c.name || 'Someone') + ' just got “' + itemLabel(c.itemId) + '”.');
        }
      }
    }
    firstSnapshot = false;
    claims = next;
    render();
  }

  function connect() {
    const es = new EventSource('/api/events');
    const live = $('live');
    es.addEventListener('claims', (e) => applySnapshot(JSON.parse(e.data).claims));
    es.onopen = () => { live.classList.add('on'); $('live-text').textContent = 'Live — updates appear instantly'; };
    es.onerror = () => { live.classList.remove('on'); $('live-text').textContent = 'Reconnecting…'; };
  }

  async function init() {
    try {
      const r = await fetch('/api/state');
      const s = await r.json();
      config = s.config; claims = s.claims; adminEnabled = s.adminEnabled;
    } catch {
      $('live-text').textContent = 'Could not load the lists. Please refresh.';
      return;
    }
    renderStatic();
    render();
    connect();
    window.addEventListener('hashchange', () => { openFormFor = null; render(); const h2 = $('list-h'); if (h2) h2.focus({ preventScroll: true }); });
    setInterval(() => { if (!document.hidden && !document.activeElement.matches('input')) { renderActivity(); } }, 30000);
    $('admin-btn').addEventListener('click', () => {
      if (!adminEnabled) return toast('Organizer tools are not enabled on this server.', true);
      if (adminPin) { adminPin = ''; try { sessionStorage.removeItem('hh-pin'); } catch { /* */ } render(); return toast('Signed out of organizer mode.'); }
      const pin = prompt('Organizer PIN:');
      if (!pin) return;
      adminPin = pin; try { sessionStorage.setItem('hh-pin', pin); } catch { /* */ }
      render(); toast('Organizer mode on — you can remove any claim.');
    });
  }
  init();
})();
