// clash-steps -- 3+ things due one person on one day, steps included and one task's batch counted once: WIP Clash, the Timeline tag and a heads-up two working days before. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
        tA: { name: 'Board deck', project: 'P tA', priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', deadline: '2026-10-29', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tB: { name: 'Launch film', project: 'P tB', priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', deadline: '2026-11-20', assignee: 'Zenon Kwok Ze Yong', createdBy: 'Zenon Kwok Ze Yong', checklist: [{ id: 'b1', text: 'Client review', due: '2026-10-29', done: false, assignees: ['Deane Cheng'], assignee: 'Deane Cheng' }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tC: { name: 'Event recap', project: 'P tC', priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', deadline: '2026-11-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 'c1', text: 'Final export', due: '2026-10-29', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tD: { name: 'Social ads', project: 'P tD', priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', deadline: '2026-11-25', assignee: 'Zenon Kwok Ze Yong', createdBy: 'Zenon Kwok Ze Yong', checklist: [{ id: 'ad1', text: 'Ad size 1', due: '2026-11-02', done: false, assignees: ['Zenon Kwok Ze Yong'], assignee: 'Zenon Kwok Ze Yong' }, { id: 'ad2', text: 'Ad size 2', due: '2026-11-02', done: false, assignees: ['Zenon Kwok Ze Yong'], assignee: 'Zenon Kwok Ze Yong' }, { id: 'ad3', text: 'Ad size 3', due: '2026-11-02', done: false, assignees: ['Zenon Kwok Ze Yong'], assignee: 'Zenon Kwok Ze Yong' }, { id: 'ad4', text: 'Ad size 4', due: '2026-11-02', done: false, assignees: ['Zenon Kwok Ze Yong'], assignee: 'Zenon Kwok Ze Yong' }, { id: 'ad5', text: 'Ad size 5', due: '2026-11-02', done: false, assignees: ['Zenon Kwok Ze Yong'], assignee: 'Zenon Kwok Ze Yong' }, { id: 'ad6', text: 'Ad size 6', due: '2026-11-02', done: false, assignees: ['Zenon Kwok Ze Yong'], assignee: 'Zenon Kwok Ze Yong' }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tE1: { name: 'Far one', project: 'P tE1', priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', deadline: '2026-11-02', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tE2: { name: 'Far two', project: 'P tE2', priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', deadline: '2026-11-02', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        tE3: { name: 'Far three', project: 'P tE3', priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', deadline: '2026-11-02', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
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
  const { page, errors } = await newPage(browser, '2026-10-27T10:00:00', { viewport: { width: 1600, height: 1000 } });
  await skipTours(page);
  await page.waitForTimeout(800);
  const notifs = () => page.evaluate(() => Object.values(window.__fb.data.notifications).filter(n => n.type === 'clash_heads_up'));
  let hs = await notifs();
  check('heads-up sent once for the pile-up two working days away', hs.length === 1 && hs[0].recipient === 'Deane Cheng', JSON.stringify(hs.map(n => n.snippet)));
  check('it lists the three things, steps included', hs[0] && /^3 things due Thu, Oct 29: /.test(hs[0].snippet) && /Board deck/.test(hs[0].snippet) && /Client review/.test(hs[0].snippet) && /Final export/.test(hs[0].snippet), hs[0] && hs[0].snippet);
  check('no heads-up yet for a pile-up further out', !hs.some(n => /Nov 2/.test(n.snippet)));
  await page.evaluate(() => window.__fb.remote(function (d) { d.tasks.tA.priority = 'High'; }));
  await page.waitForTimeout(500);
  check('not sent again on later changes', (await notifs()).length === 1);
  await page.click('#btn-notifications'); await page.waitForTimeout(200);
  check('the bell says what it is', /Several things are due the same day/.test(await page.textContent('#notification-list')));
  await page.click('#btn-notifications'); await page.waitForTimeout(150);

  // WIP: Clash counts steps; one task's batch of six is one thing
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(800); await skipTours(page);
  await page.click('#view-wip [data-wip-alerts-toggle]'); await page.waitForTimeout(300);
  const wip = await page.innerText('#view-wip');
  check('WIP Clash names the person and counts the steps', /Deane Cheng — 3 things due Thu, Oct 29/.test(wip), wip.slice(0, 600));
  check('six steps of one task on one day are not a clash', !/Zenon Kwok Ze Yong — \d+ things due/.test(wip));
  check('three separate tasks further out are still a clash on WIP', /Deane Cheng — 3 things due Mon, Nov 2/.test(wip));

  // Timeline: the tag on the deadline, and on the step days
  await page.click('[data-view-btn="gantt"]'); await page.waitForTimeout(900); await skipTours(page);
  const tags = await page.$$eval('#gantt-grid .gantt-stack-tag', els => els.map(e => ({ id: e.getAttribute('data-open-task'), n: e.textContent.trim(), title: e.title })));
  const tagFor = id => tags.find(t => t.id === id);
  check('the task due that day gets the tag after its bar', tagFor('tA') && tagFor('tA').n === '3', JSON.stringify(tags));
  check('a step on that day puts the tag on its own task too', !!tagFor('tB') && !!tagFor('tC'));
  check('the tag says who and what', tagFor('tB') && /Deane Cheng has 3 things due Oct 29: .*Client review/.test(tagFor('tB').title), tagFor('tB') && tagFor('tB').title);
  check('no tag for the batch of six', !tagFor('tD'));
  check('the legend counts them', /on a day with 3\+ due/.test(await page.innerText('#gantt-stack-note')));
  { const el = await page.$('#gantt-grid .gantt-stack-tag[data-open-task="tB"]'); if (el) { await el.scrollIntoViewIfNeeded(); } }
  await page.screenshot({ path: path.join(OUT, 'clash-steps-timeline.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'clash-steps-timeline-dark.png') });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
