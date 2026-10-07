// step-people -- browser test against index.html with Firebase stubbed (see tests/README.md).
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
  var d = window.__fb.data;
  d.tasks.t1.checklist = [{ id: 'c1', text: 'Briefing', due: '2026-10-08', done: false }, { id: 'c2', text: 'Select b-roll', done: false, assignee: 'Zenon Kwok Ze Yong' }];
  d.tasks.t1.timeEntries = [];
}
(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-10-06T10:00:00');
  await skipTours(page);
  await page.evaluate(() => { var b = document.querySelector('[data-open-task="t1"]'); b.click(); });
  await page.waitForTimeout(500);
  await skipTours(page);
  // old single-person step still shows its person
  check('old single assignee still shown', (await page.textContent('#task-checklist-editor')).includes('Zenon Kwok Ze Yong'));
  // edit Briefing: add two people
  await page.click('#task-checklist-editor .checklist-edit-toggle[data-checklist-i="0"]');
  await page.waitForTimeout(200);
  await page.selectOption('#task-checklist-editor .checklist-person-add', 'Mychelle Chen');
  await page.waitForTimeout(150);
  check('editor still open after adding', !!(await page.$('#task-checklist-editor [data-checklist-editor-i]')));
  await page.selectOption('#task-checklist-editor .checklist-person-add', 'Arvind Kumaraguru');
  await page.selectOption('#task-checklist-editor .checklist-person-add', 'Deane Cheng');
  await page.waitForTimeout(150);
  check('three chips', (await page.$$('#task-checklist-editor .checklist-person-chip')).length === 3);
  await page.click('#task-checklist-editor .checklist-person-chip[data-name="Deane Cheng"] .checklist-person-remove');
  await page.waitForTimeout(150);
  check('remove keeps editor open', !!(await page.$('#task-checklist-editor [data-checklist-editor-i]')));
  check('two chips after remove', (await page.$$('#task-checklist-editor .checklist-person-chip')).length === 2);
  await page.screenshot({ path: 'mob2/step-editor.png', clip: await page.$eval('#task-checklist-editor', e => { const r = e.getBoundingClientRect(); return { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: r.height + 20 }; }) });
  await page.click('#task-checklist-editor .checklist-edit-done');
  await page.waitForTimeout(200);
  const row = await page.textContent('#task-checklist-editor');
  check('row shows both first names', row.includes('Mychelle, Arvind'), row.slice(0, 120));
  // log time against Briefing
  await page.fill('#task-time-note', 'Briefing');
  await page.fill('#task-time-hours', '1');
  await page.waitForTimeout(150);
  const forRow = await page.$eval('#task-time-people', e => ({ shown: !e.classList.contains('hidden'), text: e.textContent }));
  check('For row shows', forRow.shown && forRow.text.includes('Mychelle Chen') && forRow.text.includes('Arvind Kumaraguru'), forRow.text);
  check('hint shows each and total', forRow.text.includes('1h each') && forRow.text.includes('2h total'), forRow.text);
  await page.selectOption('#task-time-people .time-person-add', 'Deane Cheng');
  await page.waitForTimeout(100);
  check('hint updates to 3h', (await page.textContent('#task-time-people')).includes('3h total'));
  await page.screenshot({ path: 'mob2/time-for.png', clip: await page.$eval('#task-time-section', e => { const r = e.getBoundingClientRect(); return { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: r.height + 20 }; }) });
  await page.click('#task-time-add-btn');
  await page.waitForTimeout(200);
  check('For row hides after logging', await page.$eval('#task-time-people', e => e.classList.contains('hidden')));
  check('total shows 3h', (await page.textContent('#task-time-total')).includes('3h'), await page.textContent('#task-time-total'));
  // plain note: no For row, one entry for me
  await page.fill('#task-time-note', 'Admin stuff');
  await page.fill('#task-time-hours', '0.5');
  await page.waitForTimeout(100);
  check('no For row for a plain note', await page.$eval('#task-time-people', e => e.classList.contains('hidden')));
  await page.click('#task-time-add-btn');
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'mob2/time-log.png', clip: await page.$eval('#task-time-section', e => { const r = e.getBoundingClientRect(); return { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: r.height + 20 }; }) });
  await page.click('#task-save-btn');
  await page.waitForTimeout(800);
  const saved = await page.evaluate(() => window.__fb.data.tasks.t1);
  const c1 = saved.checklist.find(i => i.id === 'c1');
  check('step saved with people', JSON.stringify(c1.assignees) === '["Mychelle Chen","Arvind Kumaraguru"]' && c1.assignee === 'Mychelle Chen', JSON.stringify(c1));
  const te = saved.timeEntries;
  check('four entries', te.length === 4, te.length);
  const brief = te.filter(e => e.checklistItemId === 'c1');
  check('one per person on Briefing', brief.map(e => e.author).sort().join('|') === 'Arvind Kumaraguru|Deane Cheng|Mychelle Chen', brief.map(e => e.author).join('|'));
  check('loggedBy on others only', brief.filter(e => e.author !== 'Deane Cheng').every(e => e.loggedBy === 'Deane Cheng') && !brief.find(e => e.author === 'Deane Cheng').loggedBy);
  check('total minutes 210', te.reduce((s, e) => s + e.minutes, 0) === 210);
  const notifs = await page.evaluate(() => Object.values(window.__fb.data.notifications).filter(n => n.type === 'checklist_assigned').map(n => n.recipient).sort().join('|'));
  check('both new people notified', notifs === 'Arvind Kumaraguru|Mychelle Chen', notifs);
  // Projects tab total
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(600); await skipTours(page);
  const proj = await page.textContent('#projects-grid');
  check('project card total includes 3.5h', /3h 30m/.test(proj), (proj.match(/\d+h( \d+m)?/g) || []).slice(0, 6).join(','));
  // People view: Mychelle and Arvind see the step
  await page.click('[data-view-btn="people"]'); await page.waitForTimeout(600); await skipTours(page);
  const ppl = await page.textContent('#people-grid');
  check('People view lists Briefing for others', (ppl.match(/Briefing/g) || []).length >= 2, (ppl.match(/Briefing/g) || []).length);
  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
