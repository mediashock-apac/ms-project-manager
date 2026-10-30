// wip-finished -- finished Client jobs / Content marketing projects leave WIP on their own; leads, closing reports and typed-in entries stay. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
        t1: { completedAt: '2026-10-17T03:00:00Z', name: 'Site visit', project: 'Mediashock Office Reno', priority: 'Medium', status: 'Done', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Live edit', project: 'Live Job', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t3: { name: 'Report', project: 'Closing Co', priority: 'Medium', status: 'Done', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
      },
      archivedTasks: {
        a1: { name: 'Workshop', project: 'Claude INT Onboarding', priority: 'Medium', status: 'Done', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 'k1', text: 'Final deck', done: true, link: 'https://docs.google.com/presentation/d/abc', due: '2026-10-08' }, { id: 'k2', text: 'Feedback form', done: false }], comments: [{ id: 'c1', text: 'Deck sent to all staff', author: 'Mychelle Chen', date: '2026-10-09T02:00:00Z' }], timeEntries: [{ minutes: 90, author: 'Deane Cheng', date: '2026-10-08T02:00:00Z', note: '' }], archivedAt: '2026-10-10T00:00:00Z', createdAt: '2026-09-01T00:00:00Z' },
      },
      __x: 0,
      projects: {
        p1: { name: 'Mediashock Office Reno', wipCategory: 'active', deadline: null },
        p2: { name: 'Claude INT Onboarding', wipCategory: 'content', wipNote: 'Old note from when it ran', deadline: null },
        p3: { name: 'Live Job', wipCategory: 'active', deadline: null },
        p4: { name: 'Closing Co', wipCategory: 'closing', deadline: null },
        p5: { name: 'Cold Lead Ltd', wipCategory: 'cold', deadline: null },
        p6: { name: 'Typed Entry', wipCategory: 'active', wipNote: 'Waiting on the PO', deadline: null },
        p7: { name: 'Deliverable Entry', wipCategory: 'active', wipDeliverables: [{ id: 'd1', text: 'Corporate video', status: [], next: '' }], deadline: null },
        p8: { name: 'Bare Active', wipCategory: 'active', deadline: null }
      }, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
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
  const { page, errors } = await newPage(browser, '2026-10-19T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(900); await skipTours(page);
  const wip = await page.textContent('#view-wip');
  check('finished Client job (all tasks Done) is gone', !wip.includes('Mediashock Office Reno'));
  check('finished Content project (tasks archived, old note) is gone', !wip.includes('Claude INT Onboarding'));
  check('a Client job entry with nothing in it is gone', !wip.includes('Bare Active'));
  check('a project with open work stays', wip.includes('Live Job'));
  check('Closing reports stay with nothing open', wip.includes('Closing Co'));
  check('leads stay with nothing open', wip.includes('Cold Lead Ltd'));
  check('a typed-in entry with a note stays', wip.includes('Typed Entry'));
  check('an entry with a typed deliverable stays', wip.includes('Deliverable Entry'));
  // Finished this week: folded to one line, opens to a list with "Move to Closing reports"
  check('Finished this week shows, folded, with a count', /Finished this week\s*1/.test(wip) && !(await page.$('#view-wip [data-wip-act="set-category"][data-id="closing"]')));
  check('a project archived 9 days ago is not in it', !wip.includes('Claude INT Onboarding'));
  await page.click('#view-wip [data-wip-act="toggle-finished"]'); await page.waitForTimeout(200);
  const fin = await page.textContent('#view-wip');
  check('opened: lists the project and when it finished', /Mediashock Office Reno\s*Finished Oct 17/.test(fin), fin.slice(fin.indexOf('Finished this week'), fin.indexOf('Finished this week') + 120));
  await page.screenshot({ path: path.join(OUT, 'wip-finished.png'), fullPage: true });
  await page.click('#view-wip [data-wip-act="set-category"][data-id="closing"][data-project="Mediashock Office Reno"]'); await page.waitForTimeout(500);
  const afterMove = await page.textContent('#view-wip');
  check('Move to Closing reports saves the category', await page.evaluate(() => window.__fb.data.projects.p1.wipCategory === 'closing'));
  check('and it is listed under Closing reports, not Finished', afterMove.includes('Mediashock Office Reno') && !/Finished this week/.test(afterMove));
  await page.evaluate(() => window.__fb.remote(function (d) { d.projects.p1.wipCategory = 'active'; }));
  await page.waitForTimeout(300);

  // A new task on a finished project brings it back
  await page.evaluate(() => window.__fb.remote(function (d) { d.tasks.t9 = { name: 'Snag list', project: 'Mediashock Office Reno', priority: 'Medium', status: 'In Progress', startDate: '2026-10-19', deadline: '2026-10-24', assignee: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-10-19T00:00:00Z' }; }));
  await page.waitForTimeout(400);
  check('new open work puts it back on WIP', (await page.textContent('#view-wip')).includes('Mediashock Office Reno'));
  // + Add entry: a bare Client job is refused with a reason, not added and then hidden
  await page.click('#view-wip [data-wip-act="add-entry"]'); await page.waitForTimeout(200);
  await page.fill('#view-wip [data-wip-field="entryName"]', 'Brand New Job');
  await page.click('#view-wip [data-wip-act="entry-cat"][data-id="active"]'); await page.waitForTimeout(100);
  await page.click('#view-wip [data-wip-act="save"]'); await page.waitForTimeout(400);
  check('bare Client job entry asks for a first deliverable', /first deliverable/.test(await page.textContent('#toast-container')));
  check('and is not saved', !(await page.evaluate(() => Object.values(window.__fb.data.projects).some(p => p.name === 'Brand New Job'))));
  await page.fill('#view-wip [data-wip-field="entryNote"]', 'Launch film');
  await page.click('#view-wip [data-wip-act="save"]'); await page.waitForTimeout(500);
  check('with a deliverable it is added and shown', (await page.textContent('#view-wip')).includes('Brand New Job'));
  // Archived tasks open read-only, from the Archived page and from a Completed project's card
  await page.click('[data-view-btn="archived"]'); await page.waitForTimeout(800); await skipTours(page);
  await page.click('#archived-list [data-open-task="a1"]'); await page.waitForTimeout(300);
  const view = await page.textContent('#archived-task-modal');
  check('archived task opens read-only', await page.$eval('#archived-task-modal', e => !e.classList.contains('hidden')) && await page.$eval('#task-modal', e => e.classList.contains('hidden')));
  check('shows steps, the link, time and comments', /Checklist · 1 of 2 done/.test(view) && /Final deck/.test(view) && /Google Slides/.test(view) && /Time logged · 1h 30m/.test(view) && /Deck sent to all staff/.test(view), view.slice(0, 400));
  check('nothing to type into', (await page.$$('#archived-task-modal input, #archived-task-modal textarea, #archived-task-modal select')).length === 0);
  await page.screenshot({ path: path.join(OUT, 'archived-task-view.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'archived-task-view-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  check('Escape closes it', await page.$eval('#archived-task-modal', e => e.classList.contains('hidden')));
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(800); await skipTours(page);
  { const sum = await page.$('#projects-grid details > summary'); if (sum && !(await page.$eval('#projects-grid details', d => d.open))) { await sum.click(); await page.waitForTimeout(300); } }
  await page.click('#projects-grid .project-expand-toggle[data-project="Claude INT Onboarding"] >> nth=0'); await page.waitForTimeout(300);
  const row = await page.$('#projects-grid [data-open-task="a1"]');
  check('Completed project card lists the archived task', !!row);
  if (row) { await row.click(); await page.waitForTimeout(300); }
  check('clicking it on the card opens the read-only view', await page.$eval('#archived-task-modal', e => !e.classList.contains('hidden')));
  if (await page.$eval('#archived-task-modal', e => !e.classList.contains('hidden'))) { await page.click('#archived-task-restore'); await page.waitForTimeout(900); }
  check('Restore to edit puts it back on the board', await page.evaluate(() => !!window.__fb.data.tasks.a1 && !(window.__fb.data.archivedTasks || {}).a1));
  check('and opens the normal task window', await page.$eval('#task-modal', e => !e.classList.contains('hidden')) && await page.$eval('#archived-task-modal', e => e.classList.contains('hidden')));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
