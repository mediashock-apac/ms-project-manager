// helpers -- browser test against index.html with Firebase stubbed (see tests/README.md).
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
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['production'] }),
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
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}

async function newPage(browser, when, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 1000 } }, opts || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed); await page.addInitScript(extra);
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
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000, state: 'attached' }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

async function skipTours(page) {
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
}
function extra() {
  var d = window.__fb.data;
  var T = d.tasks;
  // handoff
  T.t1.checklist = [
    { id: 'c1', text: 'Briefing', done: false, assignee: 'Mychelle Chen', assignees: ['Mychelle Chen', 'Arvind Kumaraguru'] },
    { id: 'c2', text: 'Draft deck', done: false, assignee: 'Zenon Kwok Ze Yong' },
    { id: 'c3', text: 'Edit', done: false, assignee: 'Chloe Hu' }
  ];
  // grouped order: Y (12th), X (9th, Mychelle), Z (12th, Chloe) -> shown X, Y, Z
  T.t2.checklist = [
    { id: 'y', text: 'Y step', due: '2026-10-12', done: false },
    { id: 'x', text: 'X step', due: '2026-10-09', done: false, assignee: 'Mychelle Chen' },
    { id: 'z', text: 'Z step', due: '2026-10-12', done: false, assignee: 'Chloe Hu' }
  ];
  // Friday: t1 has a status this week (seed, 2026-10-05); t2 has none
  T.t1.comments = [{ id: 'cm1', text: 'hi', author: 'Deane Cheng', date: '2026-10-06T03:00:00.000Z' }];
  T.t3.comments = [{ id: 'cm3', text: 'looks good', author: 'Deane Cheng', date: '2026-10-07T03:00:00.000Z' }];
  T.t1.timeEntries = [{ minutes: 30, note: '', author: 'Deane Cheng', date: '2026-10-06T04:00:00.000Z', billable: true }];
  d.activity = {
    a1: { type: 'task_updated', summary: 'x', user: 'Deane Cheng', taskId: 't2', at: '2026-10-07T03:00:00.000Z' },
    a2: { type: 'task_created', summary: 'x', user: 'Deane Cheng', taskId: 't3', at: '2026-10-07T03:00:00.000Z' },
    a3: { type: 'task_updated', summary: 'x', user: 'Deane Cheng', taskId: 't4', at: '2026-10-07T03:00:00.000Z' }
  };
  // dates
  T.t11 = { name: 'Undated old', project: 'P9', priority: 'Medium', status: 'In Progress', startDate: '', deadline: '', assignee: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' };
  T.t12 = { name: 'Undated new', project: 'P9', priority: 'Medium', status: 'In Progress', startDate: '', deadline: '', assignee: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-10-08T00:00:00Z' };
  T.t13 = { name: 'Pipeline undated', project: 'P9', priority: 'Medium', status: 'Pipeline', startDate: '', deadline: '', assignee: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' };
  if (window.__presetSent) Object.values(d.people).forEach(function (p) { if (p.name === 'Deane Cheng') p.helpersSent = ['2026-10-05|status', '2026-10-05|time']; });
}
(async () => {
  const browser = await chromium.launch();
  const notifs = (page, type) => page.evaluate((t) => Object.values(window.__fb.data.notifications).filter(n => n.type === t), type);
  // --- Friday 4pm
  let { page, errors } = await newPage(browser, '2026-10-09T16:00:00');
  await skipTours(page);
  await page.waitForTimeout(1500);
  check('no status nudge any more', (await notifs(page, 'status_nudge')).length === 0);
  let tm = await notifs(page, 'time_nudge');
  check('time nudge: only the edited task you own (not created-only, not comment-only, not someone else\'s, not one with time)', tm.length === 1 && tm[0].taskId === 't2' && /Post assets/.test(tm[0].snippet), JSON.stringify(tm.map(n => n.snippet)));
  let dm = await notifs(page, 'dates_missing');
  check('dates: one, only the old In Progress task', dm.length === 1 && dm[0].taskId === 't11' && !/Undated new|Pipeline/.test(dm[0].snippet), JSON.stringify(dm.map(n => n.snippet)));
  const sent = await page.evaluate(() => Object.values(window.__fb.data.people).find(p => p.name === 'Deane Cheng').helpersSent);
  check('sent slots recorded on own people doc', JSON.stringify(sent) === JSON.stringify(['2026-10-05|time']), JSON.stringify(sent));
  const dd = await page.evaluate(() => window.__fb.data.notificationDedup && window.__fb.data.notificationDedup.t11);
  check('dates dedup stamped', dd && dd.missingDatesFor === true);
  // bell texts + click
  await page.click('#btn-notifications'); await page.waitForTimeout(200);
  const bell = await page.textContent('#notification-list');
  check('bell headlines', /Log this week's time/.test(bell) && /Some of your work has no dates/.test(bell));
  await page.screenshot({ path: 'mob2/helpers-bell.png', clip: await page.$eval('#notification-panel', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 520) }; }) }).catch(() => {});
  // --- handoff
  await page.evaluate(() => { document.querySelector('[data-open-task="t1"]').click(); });
  await page.waitForTimeout(500); await skipTours(page);
  await page.click('#task-checklist-editor .checklist-toggle[data-checklist-i="0"]').catch(async () => { await page.evaluate(() => document.querySelectorAll('#task-checklist-editor .checklist-toggle')[0].click()); });
  await page.click('#task-save-btn'); await page.waitForTimeout(800);
  let up = await notifs(page, 'step_up');
  check('ticking Briefing: Zenon is up, with the right text', up.length === 1 && up[0].recipient === 'Zenon Kwok Ze Yong' && up[0].snippet === '"Briefing" is done. Next: Draft deck', JSON.stringify(up));
  await page.evaluate(() => { document.querySelector('[data-open-task="t2"]').click(); });
  await page.waitForTimeout(500); await skipTours(page);
  const order = await page.$$eval('#task-checklist-editor .checklist-toggle', els => els.map(e => e.closest('[data-checklist-row], .checklist-item-row, div').textContent.trim().slice(0, 6)));
  // tick Y (array index 0)
  await page.evaluate(() => { var el = document.querySelector('#task-checklist-editor .checklist-toggle[data-checklist-i="0"]'); el.click(); });
  await page.click('#task-save-btn'); await page.waitForTimeout(800);
  up = await notifs(page, 'step_up');
  const last = up.filter(n => n.taskId === 't2');
  check('grouped list: next is the step below on screen (Z, Chloe), not X', last.length === 1 && last[0].recipient === 'Chloe Hu', JSON.stringify(last) + ' order ' + JSON.stringify(order));
  console.log('errors', errors);
  await page.context().close();
  await browser.close();
  console.log(results.join('\n'));
})();
