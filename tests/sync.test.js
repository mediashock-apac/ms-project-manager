// sync -- browser test against index.html with Firebase stubbed (see tests/README.md).
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
  var d = window.__fb.data, T = d.tasks;
  T.t1.checklist = [{ text: 'Old step', done: false }, { id: 'c2', text: 'Second', done: false }];
  T.t1.timeEntries = [];
  T.t2.project = 'SMB webinars';
  d.projects = { pw: { name: 'SMB webinars', deadline: '2026-10-30', wipCategory: 'active', chat: [{ id: 'm1', text: 'hello', author: 'Chloe Hu', date: '2026-10-05T01:00:00Z' }], links: [] } };
}
(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-10-06T10:00:00');
  await skipTours(page);
  const server = (id) => page.evaluate((i) => JSON.parse(JSON.stringify(window.__fb.data.tasks[i])), id);
  const remote = async (fn, arg) => { await page.evaluate(([f, a]) => (function () { var g = new Function('d', 'a', f); window.__fb.remote(function (d) { g(d, a); }); })(), [fn, arg]); await page.waitForTimeout(250); };
  const open = async (id) => { await page.evaluate((i) => document.querySelector('[data-open-task="' + i + '"]').click(), id); await page.waitForTimeout(500); await skipTours(page); };

  // 1. old steps get ids written on open
  await open('t1');
  let t1 = await server('t1');
  check('opening backfills step ids on the server', t1.checklist.every(it => it.id));
  const oldId = t1.checklist[0].id;

  // 2. changes made elsewhere show in the open window
  await remote(`d.tasks.t1.checklist[1].done = true; d.tasks.t1.status = 'Review'; d.tasks.t1.timeEntries = [{ minutes: 60, note: 'Edit', author: 'Mychelle Chen', date: '2026-10-06T01:00:00.000Z', billable: true, overtime: false, checklistItemId: null }];`);
  check('a tick made elsewhere shows in the open window', await page.evaluate(() => document.querySelector('#task-checklist-editor .checklist-toggle[data-checklist-i="1"]') ? document.querySelector('#task-checklist-editor .checklist-toggle[data-checklist-i="1"]').checked : 'none'));
  check('a status change made elsewhere shows', (await page.inputValue('#task-status')) === 'Review');
  check('time logged elsewhere shows', /1h/.test(await page.textContent('#task-time-log')));
  await page.click('#task-cancel-btn').catch(async () => { await page.keyboard.press('Escape'); });
  await page.waitForTimeout(300);
  check('no "discard changes?" for changes that came from elsewhere', await page.evaluate(() => document.getElementById('confirm-modal').classList.contains('hidden') && document.getElementById('task-modal').classList.contains('hidden')));

  // 3. save writes only what changed here, without undoing others' changes
  await open('t1');
  await page.fill('#task-name', 'Rough cut v2');
  await remote(`var it = d.tasks.t1.checklist.find(function (x) { return x.id === a; }); it.done = true; d.tasks.t1.priority = 'Low';`, oldId);
  // and a local tick: untick "Second" here
  await page.evaluate(() => { var t = document.querySelector('#task-checklist-editor .checklist-done-toggle'); if (t) t.click(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#task-checklist-editor .checklist-toggle[data-checklist-i="1"]').click());
  await page.waitForTimeout(150);
  await page.click('#task-save-btn'); await page.waitForTimeout(700);
  t1 = await server('t1');
  check('save kept my rename', t1.name === 'Rough cut v2', t1.name);
  check('save did not undo a priority changed elsewhere', t1.priority === 'Low', t1.priority);
  check('save did not undo a status changed elsewhere', t1.status === 'Review', t1.status);
  check('save kept the tick made elsewhere and my untick', t1.checklist.find(i => i.id === oldId).done === true && t1.checklist.find(i => i.id === 'c2').done === false, JSON.stringify(t1.checklist));
  check('save kept the time logged elsewhere', (t1.timeEntries || []).length === 1);

  // 4. renaming a project carries its chat, WIP entry and deadline
  await open('t2');
  await page.fill('#task-project', 'SMB webinars 2026');
  await page.click('#task-save-btn'); await page.waitForTimeout(900);
  const pw = await page.evaluate(() => window.__fb.data.projects.pw);
  check('renamed project keeps its doc (chat, WIP, deadline)', pw.name === 'SMB webinars 2026' && pw.chat.length === 1 && pw.wipCategory === 'active', pw.name);

  // 5. a differently-capitalised name joins the existing project
  await open('t3');
  await page.fill('#task-project', 'gws   RECORDING');
  await page.click('#task-save-btn'); await page.waitForTimeout(700);
  check('"gws   RECORDING" saved as "GWS recording"', (await server('t3')).project === 'GWS recording', (await server('t3')).project);

  // 6. Monday: one day off isn't "away"; ticking "on leave" books the leave
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(500); await skipTours(page);
  const chloeCard = await page.evaluate(() => { var el = [...document.querySelectorAll('#weekly-view > *, #weekly-view *')].find(e => /Chloe Hu/.test(e.textContent) && e.children.length > 1 && e.textContent.length < 600); return el ? el.textContent : ''; });
  check('Chloe (4 days off, not the whole week) is not shown as away all week', !/Away this week/.test(chloeCard), chloeCard.slice(0, 120));
  await page.click('[data-weekly-write]'); await page.waitForTimeout(300);
  await page.click('[data-weekly-leave]'); await page.waitForTimeout(150);
  await page.click('#weekly-modal-foot [data-weekly-send]'); await page.waitForTimeout(600);
  const myLeave = await page.evaluate(() => Object.values(window.__fb.data.people).find(p => p.name === 'Deane Cheng').leave || []);
  check('"I\'m on leave this week" books Mon-Fri leave', myLeave.some(l => l.start === '2026-10-05' && l.end === '2026-10-09'), JSON.stringify(myLeave));
  await page.click('[data-weekly-write]'); await page.waitForTimeout(300);
  check('editor shows it ticked from the booked leave', /On leave this week/.test(await page.textContent('#weekly-modal')));
  await page.click('[data-weekly-leave]'); await page.waitForTimeout(150);
  await page.fill('#weekly-extra', 'Back after all');
  await page.click('#weekly-modal-foot [data-weekly-send]').catch(() => {}); await page.waitForTimeout(600);
  const after = await page.evaluate(() => Object.values(window.__fb.data.people).find(p => p.name === 'Deane Cheng').leave || []);
  check('unticking removes only the leave the update booked', !after.some(l => l.note === 'From Monday update'), JSON.stringify(after));

  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
