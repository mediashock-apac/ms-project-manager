// live-forms -- typing boxes survive teammates changes (People leave, Projects deadline, WIP editors). Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const { page, errors } = await newPage(browser, '2026-10-06T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="people"]');
  await page.waitForTimeout(900);
  await skipTours(page);
  const remote = async (fn) => { await page.evaluate((f) => { var g = new Function('d', f); window.__fb.remote(function (d) { g(d); }); }, fn); await page.waitForTimeout(300); };

  await page.click('.leave-add-toggle[data-leave-name="Deane Cheng"]');
  await page.waitForTimeout(200);
  await page.fill('#people-grid .leave-start', '2026-10-20');
  await page.fill('#people-grid .leave-end', '2026-10-24');
  await page.click('#people-grid .leave-note');
  await page.keyboard.type('Family trip');
  // A teammate's change lands while typing (not a lastSeen-only heartbeat, which never re-renders)
  await remote(`d.people.u2.chatLastRead = [{ project: 'X', at: new Date().toISOString() }];`);
  await page.evaluate(() => { document.querySelector('#people-grid .leave-editor').setAttribute('data-held', '1'); });
  await remote(`d.tasks.t2.priority = 'High';`);
  check('redraw held while typing (form not rebuilt)', !!(await page.$('#people-grid .leave-editor[data-held]')));
  check('values survive a teammate change while typing', (await page.inputValue('#people-grid .leave-note')) === 'Family trip' && (await page.inputValue('#people-grid .leave-start')) === '2026-10-20', await page.inputValue('#people-grid .leave-note'));
  check('focus stays in the form', await page.evaluate(() => !!document.activeElement.closest('.leave-editor')));
  await page.keyboard.type(' to Penang');
  // Leave the form: the held render runs, the typed values come back with it
  await page.click('#current-view-title');
  await page.waitForTimeout(300);
  check('held render runs after leaving the form', (await page.textContent('#people-grid')).includes('Deane Cheng'));
  check('values still there after that render', (await page.inputValue('#people-grid .leave-note')) === 'Family trip to Penang' && (await page.inputValue('#people-grid .leave-end')) === '2026-10-24');
  await page.evaluate(() => { document.querySelector('#people-grid .leave-editor').setAttribute('data-marker', '1'); });
  await remote(`d.people.u3.chatLastRead = [{ project: 'Y', at: new Date().toISOString() }];`);
  check('a teammate change really redraws People (form rebuilt)', !(await page.$('#people-grid .leave-editor[data-marker]')) && !!(await page.$('#people-grid .leave-editor')));
  check('values survive a render while not focused', (await page.inputValue('#people-grid .leave-note')) === 'Family trip to Penang');
  await page.click('#people-grid .leave-save');
  await page.waitForTimeout(500);
  const leave = await page.evaluate(() => window.__fb.data.people.u1.leave || []);
  check('leave saved with typed values', leave.some(l => l.start === '2026-10-20' && l.end === '2026-10-24' && l.note === 'Family trip to Penang'), JSON.stringify(leave));
  check('form closes after saving', !(await page.$('#people-grid .leave-editor')));
  await page.click('.leave-add-toggle[data-leave-name="Deane Cheng"]');
  await page.waitForTimeout(200);
  check('a new form opens empty', (await page.inputValue('#people-grid .leave-note')) === '');
  await page.click('#people-grid .leave-cancel');
  await page.waitForTimeout(200);
  check('cancel closes the form', !(await page.$('#people-grid .leave-editor')));

  // ---- Projects: a deadline date being typed survives a teammate's change ----
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(1300); await skipTours(page);
  const addDl = await page.$('#projects-grid .project-deadline-add');
  check('Projects has a deadline control', !!addDl);
  if (addDl) {
    await addDl.click(); await page.waitForTimeout(200);
    await page.keyboard.press('Escape').catch(() => {});
    await page.focus('#projects-grid .project-deadline-input');
    await page.keyboard.type('11');   // half a date: no value yet
    await page.evaluate(() => document.querySelector('#projects-grid .project-deadline-input').setAttribute('data-held', '1'));
    await remote(`d.tasks.t2.priority = 'Low';`);
    check('Projects: deadline box not rebuilt while typing', !!(await page.$('#projects-grid .project-deadline-input[data-held]')));
    check('Projects: focus stays in the deadline box', await page.evaluate(() => document.activeElement.classList.contains('project-deadline-input')));
    await page.click('#current-view-title'); await page.waitForTimeout(300);
    check('Projects: catches up after leaving the box', !(await page.$('#projects-grid .project-deadline-input[data-held]')));
  }

  // ---- WIP: a status being written survives a teammate's change, half-typed date included ----
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(1300); await skipTours(page);
  const foldAll = await page.$('[data-wip-fold-all]');
  if (foldAll && /Expand/.test(await foldAll.textContent())) { await foldAll.click(); await page.waitForTimeout(300); }
  const addStatus = await page.$('#wip-projects [data-wip-act="add-status"]');
  check('WIP has an add-status control', !!addStatus);
  if (addStatus) {
    await addStatus.click(); await page.waitForTimeout(250);
    await page.fill('#wip-projects [data-wip-field="text"]', 'Waiting on client logo');
    await page.focus('#wip-projects [data-wip-field="date"]');
    await page.evaluate(() => document.querySelector('#wip-projects [data-wip-field="date"]').setAttribute('data-held', '1'));
    await remote(`d.people.u2.chatLastRead = [{ project: 'Z', at: new Date().toISOString() }]; d.tasks.t3.priority = 'High';`);
    check('WIP: editor not rebuilt while typing', !!(await page.$('#wip-projects [data-wip-field="date"][data-held]')));
    await page.click('#current-view-title'); await page.waitForTimeout(300);
    check('WIP: after leaving, the typed status is still there', (await page.inputValue('#wip-projects [data-wip-field="text"]').catch(() => '')) === 'Waiting on client logo');
    await page.click('#wip-projects [data-wip-field="text"]');
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    const saved = await page.evaluate(() => Object.values(window.__fb.data.tasks).some(t => (t.statusUpdates || []).some(u => u.text === 'Waiting on client logo')));
    check('WIP: Enter still saves and closes the editor at once', saved && !(await page.$('#wip-projects [data-wip-field="text"]')));
  }

  // An outside click never closes a window you're typing in
  await page.click('#btn-add-task'); await page.waitForTimeout(400);
  await page.fill('#task-name', 'Half-typed task');
  await page.mouse.click(8, 8); await page.waitForTimeout(300);
  check('task window: outside click keeps it open', await page.isVisible('#task-modal') && (await page.inputValue('#task-name')) === 'Half-typed task');
  await page.click('#task-cancel-btn'); await page.waitForTimeout(300);
  const discard = await page.$('#confirm-ok-btn');
  if (discard && await discard.isVisible()) { await discard.click(); await page.waitForTimeout(300); }
  check('task window: Cancel still closes it', !(await page.isVisible('#task-modal')));
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(1300);
  await skipTours(page);
  const write = await page.$('#view-weekly [data-weekly-write]');
  check('Monday page has a Write button', !!write);
  if (write) {
    await write.click(); await page.waitForTimeout(400);
    await page.mouse.click(8, 8); await page.waitForTimeout(300);
    check('Monday editor: outside click keeps it open', await page.isVisible('#weekly-modal'));
    await page.click('#weekly-modal-close'); await page.waitForTimeout(300);
    check('Monday editor: X still closes it', !(await page.isVisible('#weekly-modal')));
  }

  check('no page errors', errors.length === 0, errors.join(' | '));

  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
