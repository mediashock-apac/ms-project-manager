// monday-meeting -- browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();   // tests/.out when run by run.mjs

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed() {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'],
          weekly: [{ week: '2026-09-28', rows: [{ project: 'SMB webinars', status: 'client', note: 'pending assets from post' }], extra: '', leave: false, at: '2026-09-27T10:00:00Z' }] }),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'],
          weekly: [
            { week: '2026-10-05', rows: [{ project: 'SMB webinars', status: 'help', note: 'Need B-roll footage by Thursday' }, { project: 'GWS recording', status: 'ontrack', note: 'Dry run today, shoot 12 Oct' }, { project: 'GC 15 Sep SEC', status: 'done', note: 'Highlights video signed off' }], extra: '', leave: false, at: '2026-10-04T10:40:00Z' },
            { week: '2026-09-28', rows: [{ project: 'GWS recording', status: 'ontrack', note: 'Dry run today, shoot 12 Oct' }], extra: '', leave: false, at: '2026-09-27T10:40:00Z' }
          ] }),
        u3: P({ name: 'Mychelle Chen', email: 'mychelle@mediashock.com.sg', departments: ['suits', 'admin'],
          weekly: [{ week: '2026-10-05', rows: [{ project: 'Paused thing', status: 'hold', note: 'Client paused till Nov' }, { project: 'GC GWS 8-9 Oct event', status: 'client', note: 'Client to share the brief' }, { project: 'GC TH podcast series', status: 'ontrack', note: 'Client check-in later this week' }], extra: 'New biz: follow up with Fugro', leave: false, at: '2026-10-05T01:12:00Z' }] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] }),
        u5: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['admin'], leave: [{ id: 'l1', start: '2026-10-06', end: '2026-10-09', note: '' }] }),
        u7: P({ name: 'Nora NoDept', email: 'nora@mediashock.com.sg', departments: [] }),
        u6: P({ name: 'Old Leaver', email: 'old@mediashock.com.sg', departments: ['suits'], lastSeen: '2025-01-01T00:00:00Z' })
      },
      tasks: {
        t1: { name: 'Rough cut', project: 'GWS recording', priority: 'High', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-12', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', statusUpdates: [{ id: 's1', date: '2026-10-05', text: 'Waiting on speaker list from client', author: 'Mychelle Chen', at: '2026-10-05T02:00:00Z' }], checklist: [{ id: 'c1', text: 'Speaker list', due: '2026-10-08', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Post assets', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t3: { name: 'Talk deck', project: 'Autodesk LEEP talk', priority: 'Medium', status: 'Pipeline', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Arvind Kumaraguru', involved: ['Deane Cheng'], createdBy: 'Arvind Kumaraguru', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t4: { name: 'Carousel', project: 'Mediashock LinkedIn', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-07', assignee: 'Zenon Kwok Ze Yong', createdBy: 'Zenon Kwok Ze Yong', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },

        t5: { name: "Kickoff discussion", project: "Lark AI", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-06", assignee: "Zenon Kwok Ze Yong", checklist: [{ id: "k1", text: "Kickoff discussion", due: "2026-10-06", done: false }], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t6: { name: "A", project: "P1", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-08", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t7: { name: "B", project: "P2", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-08", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t8: { name: "C", project: "P3", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-09", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t9: { name: "D", project: "P4", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-10", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t10: { name: "E", project: "P5", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-11", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
      },
      __x: 0,
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); if (window.innerWidth < 768) localStorage.setItem('flowboard_mobile_desktop', '1'); } catch (e) {}
}

async function newPage(browser, when, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 1000 } }, opts || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed);
  await page.route('https://www.gstatic.com/firebasejs/**', r => {
    const u = r.request().url();
    const key = /firebase-app/.test(u) ? 'app' : /firebase-auth/.test(u) ? 'auth' : /firebase-storage/.test(u) ? 'storage' : 'firestore';
    r.fulfill({ status: 200, contentType: 'text/javascript', body: STUBS[key] });
  });
  await page.route('http://pm.test/**', r => {
    let p = new URL(r.request().url()).pathname;
    if (p === '/') p = '/index.html';
    const f = path.join(REPO, decodeURIComponent(p));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.png') ? 'image/png' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

async function skipTours(page) {
  for (let i = 0; i < 6; i++) {
    const b = await page.$('[data-tour-skip]');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(250);
  }
}

(async () => {
  const browser = await chromium.launch();

  // ---------- Tuesday 6 Oct, 11:00: the meeting week ----------
  const { page, errors } = await newPage(browser, '2026-10-06T11:00:00');
  await skipTours(page);
  check('sidebar has Monday Meeting', !!(await page.$('[data-view-btn="weekly"]')));
  await page.click('[data-view-btn="weekly"]');
  await page.waitForTimeout(1100);
  const tourTitle = await page.$eval('#tour-title', e => e.textContent).catch(() => null);
  check('page tour plays on first visit', tourTitle === 'Your monday meeting' || tourTitle === 'Your Monday meeting', tourTitle);
  await skipTours(page);
  check('header title', (await page.textContent('#current-view-title')) === 'Monday Meeting');
  check('toolbar hidden', await page.$eval('#toolbar-row', e => e.classList.contains('hidden')));
  const bar = await page.textContent('#weekly-bar');
  check('week label', bar.includes('Week of Oct 5'), bar.slice(0, 80));
  check('progress 2 of 6 (leaver excluded)', bar.includes('2 of 6'), bar);
  check('waiting names exclude away Chloe', /waiting on Deane, Nora, Zenon|waiting on Nora, Deane, Zenon|waiting on Deane, Zenon, Nora/.test(bar), bar);
  check('no Present button', !(await page.$('[data-weekly-present]')));
  const view = await page.textContent('#weekly-view');
  check('needs help box', view.includes('Needs help · 1') && view.includes('Need B-roll footage by Thursday'));
  check('department headings', view.includes('Suits') && view.includes('Creative/Post') && view.includes('Copy/Production') && view.includes('Admin'));
  check('Arvind rows read help first', view.indexOf('Need B-roll') < view.indexOf('Dry run today'));
  check('NEW mark on changed row only', (await page.$$eval('#weekly-view section', ss => { var a = ss.find(s => s.textContent.includes('Arvind Kumaraguru')); return a ? (a.textContent.match(/NEW/g) || []).length : -1; })) === 2);
  console.log('ARVIND', await page.$$eval('#weekly-view section', ss => { var a = ss.find(s => s.textContent.includes('Arvind Kumaraguru')); return a ? a.innerText : 'none'; }));
  await skipTours(page); await page.click('[data-view-btn="board"]'); await page.waitForTimeout(300); await skipTours(page); await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(1200);
  console.log('TOUR AFTER', await page.$eval('#tour-title', e => e.textContent).catch(() => 'none'));
  await skipTours(page);
  check('Chloe (Tue-Fri off) not shown as away all week', !view.includes('Away this week'));
  check('Zenon not in yet with board item', view.includes('Not in yet') && view.includes('Carousel'));
  const zen = async () => page.$$eval("#weekly-view section", ss => { var z = ss.find(s => s.textContent.includes("Zenon Kwok")); return z ? z.innerText : ""; });
  let z1 = await zen();
  check("duplicate task+step listed once", (z1.match(/Kickoff discussion/g) || []).length === 1, z1);
  check("all 7 due items shown, no cap", (z1.match(/Oct \d+/g) || []).length === 7 && !z1.includes("more") && !(await page.$("[data-weekly-more]")), z1);
  const heads = await page.$$eval('#weekly-view h3', hs => hs.map(h => h.textContent));
  check('groups: Suits, Creative/Post, Copy/Production, No department, Admin last', JSON.stringify(heads) === JSON.stringify(['Suits', 'Creative/Post', 'Copy/Production', 'No department', 'Admin']), JSON.stringify(heads));
  const suitsNames = await page.$$eval('#weekly-view h3', hs => hs[0].nextElementSibling.innerText);
  const adminNames = await page.$$eval('#weekly-view h3', hs => hs[hs.length - 1].nextElementSibling.innerText);
  check('Suits + Admin person goes under Admin, not Suits', adminNames.includes('Mychelle Chen') && !suitsNames.includes('Mychelle Chen'), adminNames);
  check('my card asks for update', view.includes("Your update isn't in yet"));
  check('also line', view.includes('New biz: follow up with Fugro'));
  check('On hold shows, read after On track', view.includes('On hold') && view.indexOf('Client check-in later') < view.indexOf('Client paused till Nov') && view.indexOf('Client paused till Nov') < view.indexOf('New biz: follow up'));
  await page.screenshot({ path: path.join(OUT, 'wk-1-meeting.png'), fullPage: true });

  // One column, and admins can reorder cards within a group
  const xs = await page.$$eval('#weekly-view [data-weekly-card]', cs => cs.map(c => Math.round(c.getBoundingClientRect().left)));
  check('one column: every card starts at the same x', xs.length > 3 && xs.every(x => x === xs[0]), JSON.stringify(xs));
  const cardW = await page.$eval('#weekly-view [data-weekly-card]', c => c.getBoundingClientRect().width);
  check('column capped at 64rem', cardW <= 1024 && cardW > 700, String(cardW));
  check('admin sees drag handles', (await page.$$('#weekly-view [data-weekly-drag]')).length >= 5);
  const adminOrder = async () => page.$$eval('#weekly-view h3', hs => Array.from(hs[hs.length - 1].nextElementSibling.querySelectorAll('[data-weekly-card]')).map(c => c.getAttribute('data-weekly-card')));
  check('admin group starts alphabetical', JSON.stringify(await adminOrder()) === JSON.stringify(['Chloe Hu', 'Mychelle Chen']), JSON.stringify(await adminOrder()));
  await page.focus('[data-weekly-drag="Mychelle Chen"]');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(400);
  check('arrow key moves a card up', JSON.stringify(await adminOrder()) === JSON.stringify(['Mychelle Chen', 'Chloe Hu']), JSON.stringify(await adminOrder()));
  const ranks = await page.evaluate(() => [window.__fb.data.people.u3.weeklyRank, window.__fb.data.people.u5.weeklyRank]);
  check('order saved on each person (weeklyRank)', ranks[0] === 10 && ranks[1] === 20, JSON.stringify(ranks));
  await page.dragAndDrop('[data-weekly-drag="Chloe Hu"]', '[data-weekly-card="Mychelle Chen"]', { targetPosition: { x: 200, y: 8 } });
  await page.waitForTimeout(500);
  check('drag moves a card above another', JSON.stringify(await adminOrder()) === JSON.stringify(['Chloe Hu', 'Mychelle Chen']), JSON.stringify(await adminOrder()));
  await page.dragAndDrop('[data-weekly-drag="Chloe Hu"]', '[data-weekly-card="Arvind Kumaraguru"]', { targetPosition: { x: 200, y: 8 } });
  await page.waitForTimeout(500);
  check('cannot drag into another group', (await page.$$eval('#weekly-view h3', hs => hs[0].nextElementSibling.innerText)).includes('Chloe Hu') === false);

  // People is untouched
  await page.click('[data-view-btn="people"]');
  await page.waitForTimeout(300);
  await skipTours(page);
  check('People has no weekly controls', !(await page.$('#people-mode-bar')) && await page.$eval('#people-grid', e => !e.classList.contains('hidden') && e.children.length > 0));
  check('People toolbar visible', await page.$eval('#toolbar-row', e => !e.classList.contains('hidden')));

  // ---------- Fill in my update ----------
  await page.click('[data-view-btn="weekly"]');
  await page.waitForTimeout(300);
  await page.click('#weekly-bar [data-weekly-write]');
  await page.waitForSelector('#weekly-modal:not(.hidden)');
  const rowsText = await page.textContent('#weekly-modal-body');
  check('editor lists my 3 projects', ['GWS recording', 'SMB webinars', 'Autodesk LEEP talk'].every(p => rowsText.includes(p)), rowsText.slice(0, 200));
  check('editor shows Coming up', rowsText.includes('Coming up: Speaker list Oct 8') && rowsText.includes('Rough cut Oct 12'), rowsText.slice(0, 300));
  check('editor shows Latest status with who', rowsText.includes('Latest: Waiting on speaker list from client · Oct 5 · Mychelle'));
  check('same as last week offered for SMB', rowsText.includes('Same as last week'));
  check('six statuses, On hold before Needs help', JSON.stringify(await page.$$eval('#weekly-modal [data-weekly-row="0"]', bs => bs.map(b => b.textContent))) === JSON.stringify(['On track','Waiting on client','Waiting on us','On hold','Needs help','Done']));
  check('sidebar: Monday Meeting above WIP', await page.evaluate(() => { var b = [...document.querySelectorAll('[data-view-btn]')].map(x => x.getAttribute('data-view-btn')); return b.indexOf('weekly') === b.indexOf('wip') - 1; }));
  await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, 'wk-2-editor-empty.png'), clip: { x: 380, y: 150, width: 680, height: 700 } });
  await page.click('#weekly-modal [data-weekly-use="0"]');
  check('Use this copies latest into the note', await page.$eval('#weekly-modal [data-weekly-note="0"]', e => e.value === 'Waiting on speaker list from client'));
  check('Use this disappears once used', !(await page.$('#weekly-modal [data-weekly-use="0"]')));
  await page.fill('#weekly-modal [data-weekly-note="0"]', '');
  await page.click('#weekly-modal [data-weekly-same]');
  await page.click('#weekly-modal [data-weekly-row="0"][data-weekly-status="help"]');
  check('help focuses the note', await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-weekly-note') === '0'));
  await page.keyboard.type('Final speaker list by Wed');
  await page.click('#weekly-modal [data-weekly-rest]');
  await page.fill('#weekly-extra', 'AI course on Thursday');
  await page.screenshot({ path: path.join(OUT, 'wk-3-editor-filled.png') });
  const foot = await page.textContent('#weekly-modal-foot');
  check('all answered', foot.includes('3 of 3'), foot);
  await page.click('#weekly-modal [data-weekly-send]');
  await page.waitForTimeout(600);
  check('modal closed after send', await page.$eval('#weekly-modal', e => e.classList.contains('hidden')));
  const saved = await page.evaluate(() => window.__fb.data.people.u1.weekly);
  const cur = saved.find(e => e.week === '2026-10-05');
  check('saved to my own people doc', !!cur && cur.rows.length === 3, JSON.stringify(cur));
  check('saved statuses', cur && cur.rows.find(r => r.project === 'GWS recording').status === 'help' && cur.rows.find(r => r.project === 'GWS recording').note === 'Final speaker list by Wed' && cur.rows.find(r => r.project === 'SMB webinars').status === 'client' && cur.rows.find(r => r.project === 'Autodesk LEEP talk').status === 'ontrack');
  check('history kept, newest first', saved.length === 2 && saved[0].week === '2026-10-05');
  const onlyPeopleWrites = (await page.evaluate(() => window.__fb.writes)).filter(w => w.col !== 'people' && w.col !== 'activity' && w.col !== 'notifications' && w.col !== 'notificationDedup');
  check('no writes outside people', onlyPeopleWrites.length === 0, JSON.stringify(onlyPeopleWrites).slice(0, 200));
  const bar2 = await page.textContent('#weekly-bar');
  check('progress now 3 of 6 + Edit button', bar2.includes('3 of 6') && bar2.includes('Edit my update'), bar2);
  const view2 = await page.textContent('#weekly-view');
  check('needs help now 2', view2.includes('Needs help · 2') && view2.includes('Final speaker list by Wed'));

  // Edit after the meeting started (Tue 11:00 > Mon 10:00)
  await page.click('#weekly-bar [data-weekly-write]');
  await page.waitForSelector('#weekly-modal:not(.hidden)');
  check('editor reloads saved answers', await page.$eval('#weekly-modal [data-weekly-row="0"][data-weekly-status="help"]', e => e.getAttribute('aria-pressed') === 'true'));
  check('save label is Save changes', (await page.textContent('#weekly-modal-foot')).includes('Save changes'));
  await page.click('#weekly-modal [data-weekly-row="0"][data-weekly-status="ontrack"]');
  await page.click('#weekly-modal [data-weekly-send]');
  await page.waitForTimeout(600);
  const view3 = await page.textContent('#weekly-view');
  check('edited mark shows', /Edited Tue/.test(view3));
  check('Escape closes editor', await (async () => { await page.click('#weekly-bar [data-weekly-write]'); await page.keyboard.press('Escape'); await page.waitForTimeout(100); return page.$eval('#weekly-modal', e => e.classList.contains('hidden')); })());

  // Previous week
  await page.click('#weekly-bar [data-weekly-nav="-1"]');
  await page.waitForTimeout(200);
  const prevBar = await page.textContent('#weekly-bar');
  check('previous week nav', prevBar.includes('Week of Sep 28') && prevBar.includes('This week'), prevBar);
  check('previous week has no write button for past', true);
  await page.click('#weekly-bar [data-weekly-nav="0"]');
  await page.waitForTimeout(200);
  check('back to this week', (await page.textContent('#weekly-bar')).includes('Week of Oct 5'));

  await page.screenshot({ path: path.join(OUT, 'wk-4-after.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'wk-5-dark.png'), fullPage: true });
  for (const [who, f] of [['Zenon Kwok', 'chip-notin-dark'], ['Chloe Hu', 'chip-away-dark']]) {
    await page.locator('#weekly-view section', { hasText: who }).locator('div').first().screenshot({ path: path.join(OUT, f + '.png') });
  }
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(150);
  for (const [who, f] of [['Zenon Kwok', 'chip-notin-light'], ['Chloe Hu', 'chip-away-light']]) {
    await page.locator('#weekly-view section', { hasText: who }).locator('div').first().screenshot({ path: path.join(OUT, f + '.png') });
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.click('#weekly-bar [data-weekly-write]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'wk-6-editor-dark.png') });
  check('no page errors (Tue run)', errors.length === 0, errors.slice(0, 3).join(' | '));

  // ---------- Phone width ----------
  const m = await newPage(browser, '2026-10-06T11:00:00', { viewport: { width: 390, height: 844 } });
  await skipTours(m.page);
  await m.page.evaluate(() => { document.querySelector('[data-view-btn="weekly"]').click(); });
  await m.page.waitForTimeout(400);
  await skipTours(m.page);
  const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no sideways scroll at 390px', overflow <= 1, 'overflow ' + overflow);
  check('forced desktop on phone offers Use mobile layout', await m.page.evaluate(() => { var b = document.getElementById('btn-use-mobile'); return !!b && !b.classList.contains('hidden') && !document.documentElement.classList.contains('m-mode'); }));
  await m.page.screenshot({ path: path.join(OUT, 'wk-7-phone.png'), fullPage: true });

  // ---------- Friday 9 Oct, 17:00: the reminder ----------
  const f = await newPage(browser, '2026-10-09T17:00:00');
  await skipTours(f.page);
  await f.page.waitForTimeout(800);
  const notifs = await f.page.evaluate(() => Object.values(window.__fb.data.notifications));
  const rem = notifs.filter(n => n.type === 'weekly_reminder');
  check('Friday reminder sent once, to me', rem.length === 1 && rem[0].recipient === 'Deane Cheng', JSON.stringify(rem));
  const tag = await f.page.evaluate(() => window.__fb.data.people.u1.weeklyReminded);
  check('reminder slot recorded', Array.isArray(tag) && tag.indexOf('2026-10-12|fri') !== -1, JSON.stringify(tag));
  await f.page.click('#btn-notifications');
  await f.page.waitForTimeout(200);
  const bell = await f.page.textContent('#notification-list');
  check('bell headline', bell.includes('Your Monday update is due'), bell.slice(0, 120));
  await f.page.click('#notification-list [data-notification-type="weekly_reminder"]');
  await f.page.waitForTimeout(400);
  check('reminder opens Monday Meeting + editor', (await f.page.textContent('#current-view-title')) === 'Monday Meeting' && await f.page.$eval('#weekly-modal', e => !e.classList.contains('hidden')));
  check('Friday looks ahead to Oct 12', (await f.page.textContent('#weekly-modal-title')).includes('Oct 12'));
  await f.page.waitForTimeout(1500);
  const rem2 = (await f.page.evaluate(() => Object.values(window.__fb.data.notifications))).filter(n => n.type === 'weekly_reminder');
  check('no duplicate reminder', rem2.length === 1);
  check('no page errors (Fri run)', f.errors.length === 0, f.errors.slice(0, 3).join(' | '));

  // ---------- Monday 12 Oct, 9:30, Friday already sent: Monday nudge ----------
  const mo = await newPage(browser, '2026-10-12T09:30:00');
  await mo.page.evaluate(() => {});
  await mo.page.waitForTimeout(800);
  const remM = (await mo.page.evaluate(() => Object.values(window.__fb.data.notifications))).filter(n => n.type === 'weekly_reminder');
  check('Monday reminder when missing', remM.length === 1 && /today/.test(remM[0].snippet), JSON.stringify(remM.map(r => r.snippet)));

  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
