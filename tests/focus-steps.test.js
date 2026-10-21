// focus-steps -- Focus of the Day ranks by the nearer of a task's deadline and its next open step, and names the step. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
        tA: { name: 'High far', project: 'P tA', priority: 'High', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-11-09', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tB: { name: 'Low with step today', project: 'P tB', priority: 'Low', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-11-09', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 'b1', text: 'Client review', due: '2026-10-19', done: false, assignees: ['Kan Lim'], assignee: 'Kan Lim' }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tC: { name: 'Deadline first', project: 'P tC', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-21', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 'c1', text: 'After deadline', due: '2026-10-24', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tD: { name: 'Done step ignored', project: 'P tD', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-29', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 'd1', text: 'Old', due: '2026-10-18', done: true }, { id: 'd2', text: 'Storyboard', due: '2026-10-23', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tE: { name: 'In review', project: 'P tE', priority: 'Medium', status: 'Review', startDate: '2026-10-01', deadline: '2026-11-09', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 'e1', text: 'Late one', due: '2026-10-15', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tF: { name: 'Late shot list', project: 'P tF', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-11-09', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 'f1', text: 'Shot list', due: '2026-10-17', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
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
  const { page, errors } = await newPage(browser, '2026-10-19T10:00:00', { viewport: { width: 1440, height: 1000 } });
  await skipTours(page);
  const cards = await page.$$eval('#focus-list [data-open-task]', bs => bs.map(b => ({ id: b.getAttribute('data-open-task'), text: b.innerText })));
  const card = id => cards.find(c => c.id === id) || { text: '' };
  const order = cards.map(c => c.id);
  check('a Low task with a step due today ranks above a High task due in 3 weeks', order.indexOf('tB') !== -1 && (order.indexOf('tA') === -1 || order.indexOf('tB') < order.indexOf('tA')), order.join(','));
  check('its chip counts to the step', /Step due today/.test(card('tB').text), card('tB').text);
  check('its card names the step and who is on it', /Step: Client review · Kan Lim/.test(card('tB').text));
  check('an overdue step ranks as overdue and says so', /Step 2d overdue/.test(card('tF').text) && order.indexOf('tF') === 0, order.join(','));
  check('a step after the deadline is ignored', /Due in 2d/.test(card('tC').text) && !/Step:/.test(card('tC').text), card('tC').text);
  check('a done step is ignored; the next open one counts', /Step due in 4d/.test(card('tD').text) && /Storyboard/.test(card('tD').text), card('tD').text);
  check('a task in review still says Under review', /Under review/.test(card('tE').text) && !/Step:/.test(card('tE').text), card('tE').text);
  check('a task without steps is unchanged', !card('tA').text || (/Due in 21d/.test(card('tA').text) && !/Step/.test(card('tA').text)), card('tA').text);
  const board = await page.textContent('#view-board');
  check('Board overdue badges still go by the task deadline', !/OVERDUE/i.test(board), (board.match(/.{60}overdue.{60}/i) || [''])[0]);
  await page.screenshot({ path: path.join(OUT, 'focus-steps.png'), clip: { x: 240, y: 120, width: 1200, height: 260 } });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'focus-steps-dark.png'), clip: { x: 240, y: 120, width: 1200, height: 260 } });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
