// monday-wip-calendar -- browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = __dirname;

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
  var T = window.__fb.data.tasks;
  T.t3.deadline = '2026-10-09';
  var seen = ['board','gantt','calendar','people','projects','chat','wip','weekly','activity','archived','suggestions','updates'].map(function (v) { return 'page:' + v; });
  'abcdefgh'.split('').forEach(function (c) { seen.push('cl-2026-10-07' + c); });
  try { localStorage.setItem('flowboard_tours_seen', JSON.stringify(seen)); } catch (e) {}
}
(async () => {
  const browser = await chromium.launch();
  const dark = process.argv[2] === 'dark';
  const { page, errors } = await newPage(browser, '2026-10-06T10:00:00', { colorScheme: dark ? 'dark' : 'light' });
  await skipTours(page);
  // 1. WIP
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(500); await skipTours(page);
  const hdr = await page.evaluate(() => { var b = [...document.querySelectorAll('[data-wip-fold]')].find(x => /SMB webinars/.test(x.textContent)); return b ? b.textContent : ''; });
  check('WIP header shows "Needs help"', /Needs help/.test(hdr), hdr.slice(0, 80));
  await page.evaluate(() => { var b = [...document.querySelectorAll('[data-wip-fold]')].find(x => /SMB webinars/.test(x.textContent)); if (b && b.getAttribute('aria-expanded') === 'false') b.click(); });
  await page.waitForTimeout(400);
  const card = await page.evaluate(() => { var b = [...document.querySelectorAll('[data-wip-fold]')].find(x => /SMB webinars/.test(x.textContent)); return b ? b.closest('.border-b').textContent : ''; });
  check('open card says who needs what', /Need B-roll footage by Thursday/.test(card), card.slice(0, 160));
  const box = await page.evaluate(() => { var b = [...document.querySelectorAll('[data-wip-fold]')].find(x => /SMB webinars/.test(x.textContent)); var r = b.closest('.border-b').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 260) }; });
  await page.screenshot({ path: 'mob2/wip-help' + (dark ? '-dark' : '') + '.png', clip: box });
  // 2. Monday editor hint
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(500); await skipTours(page);
  await page.click('[data-weekly-write]'); await page.waitForTimeout(300);
  const rowIdx = await page.evaluate(() => { var rows = [...document.querySelectorAll('#weekly-modal-body [data-weekly-status="done"]')]; var b = rows.find(x => /GWS recording/.test(x.closest('.flex-col').textContent)); return b ? b.getAttribute('data-weekly-row') : null; });
  await page.click('#weekly-modal-body [data-weekly-status="done"][data-weekly-row="' + rowIdx + '"]'); await page.waitForTimeout(200);
  const hint = await page.evaluate((i) => document.querySelector('#weekly-modal-body [data-weekly-status="done"][data-weekly-row="' + i + '"]').closest('.flex-col').textContent, rowIdx);
  check('Done on a project with open tasks shows the hint', /still open on the board/.test(hint), hint.slice(-90));
  const rb = await page.evaluate((i) => { var r = document.querySelector('#weekly-modal-body [data-weekly-status="done"][data-weekly-row="' + i + '"]').closest('.flex-col').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, rowIdx);
  await page.screenshot({ path: 'mob2/weekly-done-hint' + (dark ? '-dark' : '') + '.png', clip: rb });
  await page.click('#weekly-modal-body [data-weekly-status="ontrack"][data-weekly-row="' + rowIdx + '"]'); await page.waitForTimeout(200);
  check('hint goes away for another status', !/still open on the board/.test(await page.textContent('#weekly-modal-body')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.evaluate(() => { var c = document.getElementById('weekly-modal-close'); if (c && !document.getElementById('weekly-modal').classList.contains('hidden')) c.click(); });
  // 3. Calendar Mine
  await page.click('[data-view-btn="calendar"]'); await page.waitForTimeout(500); await skipTours(page);
  await page.click('#calendar-scope-mine'); await page.waitForTimeout(300);
  check('Calendar Mine shows a deadline on a task you\'re involved in', /Talk deck/.test(await page.textContent('#calendar-grid')));
  await page.click('#calendar-scope-all'); await page.waitForTimeout(200);
  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
