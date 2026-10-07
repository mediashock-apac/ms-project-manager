// time-groups -- browser test against index.html with Firebase stubbed (see tests/README.md).
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
  d.tasks.t1.checklist = [{ id: 'c1', text: 'Briefing', due: '2026-10-08', done: false, assignee: 'Deane Cheng', assignees: ['Deane Cheng', 'Mychelle Chen', 'Arvind Kumaraguru'] }];
  d.tasks.t1.timeEntries = [
    { minutes: 30, note: 'Briefing', checklistItemId: 'c1', date: '2026-10-01T02:00:00.000Z', author: 'Deane Cheng', billable: true, overtime: false },
    { minutes: 15, note: 'Old import', checklistItemId: null, author: 'Deane Cheng', billable: true, overtime: false },
    { minutes: 15, note: 'Old import', checklistItemId: null, author: 'Mychelle Chen', billable: true, overtime: false }
  ];
}
(async () => {
  const browser = await chromium.launch();
  const dark = process.argv[2] === 'dark';
  const { page, errors } = await newPage(browser, '2026-10-06T10:00:00', { colorScheme: dark ? 'dark' : 'light' });
  await skipTours(page);
  await page.evaluate(() => { document.querySelector('[data-open-task="t1"]').click(); });
  await page.waitForTimeout(500); await skipTours(page);
  const rows = () => page.$$eval('#task-time-log > div', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  const total = () => page.textContent('#task-time-total');
  const entries = () => page.evaluate(() => currentTimeEntriesForTest());
  let r = await rows();
  check('undated entries never group', r.length === 3, JSON.stringify(r));

  // log 1h against Briefing for all three
  await page.fill('#task-time-note', 'Briefing');
  await page.fill('#task-time-hours', '1');
  await page.waitForTimeout(150);
  check('For row: 3 ticked', (await page.$$('#task-time-people .time-person-toggle[aria-pressed="true"]')).length === 3);
  await page.click('#task-time-add-btn'); await page.waitForTimeout(200);
  r = await rows();
  check('logged for 3 = one new row', r.length === 4, JSON.stringify(r));
  const grp = r.find(x => /3 people/.test(x));
  check('group row reads "1h ... 3 people · 3h"', !!grp && /\b1h\s+Briefing/.test(grp) && /3 people · 3h/.test(grp), grp);
  check('total counts everyone (4h)', /^4h logged/.test((await total()).trim()), await total());
  await page.screenshot({ path: 'mob2/time-group' + (dark ? '-dark' : '') + '.png', clip: await page.$eval('#task-time-section', e => { const b = e.getBoundingClientRect(); return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 }; }) });

  // durations line up: x of the duration column on each row
  const xs = await page.$$eval('#task-time-log > div > span:nth-child(2)', els => els.map(e => Math.round(e.getBoundingClientRect().left)));
  check('duration column aligned', new Set(xs).size === 1, JSON.stringify(xs));

  // edit the group: untick Arvind, add Zenon

  const groupIdx = await page.evaluate(() => [...document.querySelectorAll('#task-time-log > div')].findIndex(d => /3 people/.test(d.innerText)));
  await page.click(`#task-time-log > div:nth-child(${groupIdx + 1}) .time-entry-edit`); await page.waitForTimeout(150);
  check('edit: For row shows the 3 people ticked', (await page.$$('#task-time-people .time-person-toggle[aria-pressed="true"]')).length === 3);
  await page.click('#task-time-people .time-person-toggle[data-name="Arvind Kumaraguru"]');
  await page.selectOption('#task-time-people .time-person-add', 'Zenon Kwok Ze Yong');
  await page.waitForTimeout(100);
  await page.click('#task-time-add-btn'); await page.waitForTimeout(200);
  r = await rows();
  check('still one group row after edit', r.length === 4 && r.filter(x => /3 people/.test(x)).length === 1, JSON.stringify(r));

  // edit the old single 30m entry: add Mychelle
  const oldIdx = await page.evaluate(() => [...document.querySelectorAll('#task-time-log > div')].findIndex(d => /30m\s+Briefing/.test(d.innerText)));
  await page.click(`#task-time-log > div:nth-child(${oldIdx + 1}) .time-entry-edit`); await page.waitForTimeout(150);
  const shown = await page.$$eval('#task-time-people .time-person-toggle', els => els.map(e => e.dataset.name + ':' + e.getAttribute('aria-pressed')));
  check('old entry: author ticked, step people offered', shown.join() === 'Deane Cheng:true,Mychelle Chen:false,Arvind Kumaraguru:false', shown.join());
  await page.click('#task-time-people .time-person-toggle[data-name="Mychelle Chen"]');
  await page.click('#task-time-add-btn'); await page.waitForTimeout(200);
  r = await rows();
  check('old entry now a group of 2', r.some(x => /30m\s+Briefing/.test(x) && /2 people · 1h/.test(x)), JSON.stringify(r));

  // remove the 3-person group, with confirm
  const gi = await page.evaluate(() => [...document.querySelectorAll('#task-time-log > div')].findIndex(d => /3 people/.test(d.innerText)));
  await page.click(`#task-time-log > div:nth-child(${gi + 1}) .time-entry-remove`); await page.waitForTimeout(200);
  check('toast names everyone (Undo instead of a confirm)', /Removed 3h for 3 people/.test(await page.textContent('#toast-container')), await page.textContent('#toast-container'));
  await page.screenshot({ path: 'mob2/time-group-undo' + (dark ? '-dark' : '') + '.png', clip: await page.$eval('#toast-container', e => { const b = e.getBoundingClientRect(); return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 }; }) });
  await page.waitForTimeout(100);
  r = await rows();
  check('group removed', r.length === 3 && !r.some(x => /3 people/.test(x)), JSON.stringify(r));

  await page.click('#task-save-btn'); await page.waitForTimeout(800);
  const saved = await page.evaluate(() => window.__fb.data.tasks.t1.timeEntries);
  const brief = saved.filter(e => e.minutes === 30);
  check('saved: 30m for Deane + Mychelle, same timestamp', brief.length === 2 && brief.every(e => e.date === '2026-10-01T02:00:00.000Z') && brief.map(e => e.author).sort().join() === 'Deane Cheng,Mychelle Chen', JSON.stringify(brief));
  check('saved: added person has loggedBy', brief.find(e => e.author === 'Mychelle Chen').loggedBy === 'Deane Cheng', JSON.stringify(brief));
  check('saved: 4 entries total', saved.length === 4, saved.length);
  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
