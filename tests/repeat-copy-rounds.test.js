// repeat-copy-rounds -- repeating tasks, "copy steps from a similar task" and review rounds.
// Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  const base = { comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z', createdBy: 'Deane Cheng', assignee: 'Deane Cheng', priority: 'Medium' };
  const T = (o) => Object.assign({}, base, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['production'] })
      },
      tasks: {
        r1: T({ name: 'Monthly report', project: 'Acme retainer', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-31', repeat: 'monthly',
          checklist: [{ id: 'a1', text: 'Draft', due: '2026-10-28', done: true, assignee: 'Zenon Kwok Ze Yong', assignees: ['Zenon Kwok Ze Yong'] }, { id: 'a2', text: 'Send', due: '2026-10-31', done: false }],
          comments: [{ id: 'c1', text: 'Sent last month', author: 'Deane Cheng', date: '2026-09-30T02:00:00Z' }],
          timeEntries: [{ minutes: 60, note: '', author: 'Deane Cheng', date: '2026-10-02T01:00:00.000Z', billable: true, overtime: false, checklistItemId: null }] }),
        w1: T({ name: 'Weekly post', project: 'Mediashock LinkedIn', status: 'In Progress', startDate: '2026-09-28', deadline: '2026-09-30', repeat: 'weekly', checklist: [] }),
        src: T({ name: 'GWS video', project: 'Google GWS', status: 'In Progress', driveLink: 'https://drive.google.com/drive/folders/gws', startDate: '2026-10-01', deadline: '2026-10-20',
          checklist: [
            { id: 's1', text: 'Brief', due: '2026-10-10', done: true, link: 'https://docs.google.com/document/d/x' },
            { id: 's2', text: 'Draft', due: '2026-10-15', done: false, assignee: 'Zenon Kwok Ze Yong', assignees: ['Zenon Kwok Ze Yong'] },
            { id: 's3', text: 'Client review', due: '2026-10-17', done: false }
          ] }),
        rv1: T({ name: 'Deck', project: 'Pitch', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', checklist: [],
          reviewRounds: [{ at: '2026-10-02T02:00:00Z', audience: 'client' }] })
      },
      archivedTasks: {
        arc1: T({ name: 'Old event recap', project: 'Events', status: 'Done', startDate: '2026-08-01', deadline: '2026-08-20', archivedAt: '2026-08-25T00:00:00Z',
          checklist: [{ id: 'o1', text: 'Photos', due: '2026-08-18', done: true }] })
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}
function extra() {
  var seen = ['board','gantt','calendar','people','projects','chat','wip','weekly','activity','archived','suggestions','updates'].map(function (v) { return 'page:' + v; });
  'abcdefghijklm'.split('').forEach(function (c) { seen.push('cl-2026-10-07' + c); });
  try { localStorage.setItem('flowboard_tours_seen', JSON.stringify(seen)); } catch (e) {}
}

async function newPage(browser, when) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000, state: 'attached' });
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-10-07T10:00:00');
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
  const data = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__fb.data)));
  const openTask = async (id) => { await page.evaluate((i) => document.querySelector('[data-open-task="' + i + '"]').click(), id); await page.waitForTimeout(400); };
  const setStatus = (v) => page.evaluate((s) => { var el = document.getElementById('task-status'); el.value = s; el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
  const save = async () => { await page.click('#task-save-btn'); await page.waitForTimeout(500); };
  const lastToastAction = (re) => page.evaluate((src) => {
    var r = new RegExp(src);
    var t = [...document.querySelectorAll('#toast-container > div')].filter(function (d) { return r.test(d.textContent); }).pop();
    if (t && t.querySelector('.toast-action')) { t.querySelector('.toast-action').click(); return true; }
    return false;
  }, re);

  // ---------- Repeat ----------
  check('Board marks a repeating task with the loop icon', !!(await page.$('[data-task-id="r1"] [aria-label="Repeats every month"]')));
  await openTask('r1');
  check('task window shows the repeat', (await page.inputValue('#task-repeat')) === 'monthly');
  await page.screenshot({ path: 'mob2/repeat-window.png', clip: { x: 200, y: 0, width: 1040, height: 520 } });
  // Every dropdown uses the app's list, not the browser's
  await page.click('#task-repeat'); await page.waitForTimeout(200);
  const menu = await page.evaluate(() => { var m = document.getElementById('select-menu'); return m && !m.hidden ? [...m.querySelectorAll('[role=option]')].map(o => o.textContent) : null; });
  check("Repeat opens the app's own list", !!menu && menu.join('|') === "Doesn't repeat|Every week|Every 2 weeks|Every month", menu && menu.join('|'));
  await page.screenshot({ path: 'mob2/repeat-menu.png', clip: { x: 600, y: 300, width: 640, height: 300 } });
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  check('Escape closes only the list', await page.evaluate(() => document.getElementById('select-menu').hidden && !document.getElementById('task-modal').classList.contains('hidden')));
  await page.click('#task-involved-add-btn'); await page.waitForTimeout(200);
  const inv = await page.evaluate(() => { var m = document.getElementById('select-menu'); return m && !m.hidden ? m.textContent : ''; });
  check('"+ Add people involved" opens the same list', /Zenon Kwok Ze Yong/.test(inv), inv.slice(0, 60));
  await page.click('#select-menu [role=option]:has-text("Zenon")'); await page.waitForTimeout(200);
  check('picking from it adds the person', /Zenon/.test(await page.textContent('#task-involved-chips')));
  await setStatus('Done'); await save();
  let d = await data();
  const n1 = d.tasks['r1-r1'];
  check('completing it makes the next one', !!n1);
  check('next monthly deadline keeps the day (31 Oct -> 30 Nov)', n1 && n1.deadline === '2026-11-30', n1 && n1.deadline);
  check('next one starts in Pipeline with unticked steps', n1 && n1.status === 'Pipeline' && n1.checklist.every(c => !c.done) && n1.checklist.length === 2);
  check('step dates move with it, people kept', n1 && n1.checklist[0].due === '2026-11-27' && (n1.checklist[0].assignees || []).join() === 'Zenon Kwok Ze Yong', n1 && n1.checklist[0].due);
  check('no history carried (comments, time)', n1 && n1.comments.length === 0 && n1.timeEntries.length === 0);
  check('series fields set', n1 && n1.repeat === 'monthly' && n1.repeatRoot === 'r1' && n1.repeatIndex === 1 && n1.repeatDay === 31);
  check('the completed one stops repeating', d.tasks.r1.repeat === null && d.tasks.r1.status === 'Done');
  check('activity logged', Object.values(d.activity).some(a => /Next "Monthly report" made, due Nov 30 .repeats every month./.test(a.summary || '')));
  check('Undo removes the next one and restores the repeat', await lastToastAction('Next "Monthly report"'));
  await page.waitForTimeout(400);
  d = await data();
  check('…and it is gone, repeat back', !d.tasks['r1-r1'] && d.tasks.r1.repeat === 'monthly');

  // Out of Done and back in twice: only one next task
  await openTask('r1'); await setStatus('In Progress'); await save();
  await openTask('r1'); await setStatus('Done'); await save();
  await openTask('r1'); await setStatus('In Progress'); await save();
  await openTask('r1'); await setStatus('Done'); await save();
  d = await data();
  check('reopening and completing again makes no second copy', Object.keys(d.tasks).filter(k => /^r1-r/.test(k)).join() === 'r1-r1', Object.keys(d.tasks).join());

  // Late weekly task: the next one isn't already overdue
  await openTask('w1'); await setStatus('Done'); await save();
  d = await data();
  check('late weekly: next deadline is today or later', d.tasks['w1-r1'] && d.tasks['w1-r1'].deadline === '2026-10-07', d.tasks['w1-r1'] && d.tasks['w1-r1'].deadline);

  // (the new weekly task is due today, so the usual "due today" reminder pops up; dismiss it)
  if (!(await page.evaluate(() => document.getElementById("confirm-modal").classList.contains("hidden")))) { await page.click("#confirm-ok-btn"); await page.waitForTimeout(300); }

  // Repeat needs a deadline; TBD switches it off
  await page.click('#btn-add-task'); await page.waitForTimeout(300);
  await page.fill('#task-name', 'Standup notes');
  await page.fill('#task-project', 'Internal');
  await page.screenshot({ path: 'mob2/folder-ask.png', clip: { x: 200, y: 220, width: 560, height: 110 } });
  check('a project with no folder asks for one', await page.isVisible('#task-project-add-folder') && !(await page.isVisible('#task-project-link-row')));
  await page.click('#task-repeat'); await page.waitForTimeout(150);
  await page.click('#select-menu [role=option]:has-text("Every week")'); await page.waitForTimeout(150);
  check('picking from the list sets the repeat', (await page.inputValue('#task-repeat')) === 'weekly');
  await save();
  check('repeat without a deadline is stopped with a reason', /repeating task needs a deadline/.test(await page.evaluate(() => document.getElementById('task-deadline').parentElement.textContent)));
  await page.check('#task-deadline-tbd');
  check('TBD clears and disables repeat', (await page.inputValue('#task-repeat')) === '' && await page.isDisabled('#task-repeat'));
  await page.click('#task-cancel-btn'); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => document.getElementById('confirm-modal').classList.contains('hidden')))) { await page.click('#confirm-ok-btn'); await page.waitForTimeout(300); }

  // ---------- Copy steps ----------
  await page.click('#btn-add-task'); await page.waitForTimeout(300);
  await page.fill('#task-name', 'GWS teaser');
  await page.fill('#task-project', 'Google GWS');
  await page.evaluate(() => { var el = document.getElementById('task-assignee'); el.value = 'Deane Cheng'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.fill('#task-deadline', '2026-11-20');
  check('a task with no steps offers to copy them', !!(await page.$('#checklist-copy-btn')));
  check("the project's Drive folder is filled in from its other tasks", (await page.inputValue('#task-drive')) === 'https://drive.google.com/drive/folders/gws' && await page.isVisible('#task-drive-derived') && !(await page.isVisible('#task-project-add-folder')));
  await page.screenshot({ path: 'mob2/folder-derived.png', clip: { x: 200, y: 220, width: 560, height: 110 } });
  await page.fill('#task-project', 'Google GWSX');
  check('a folder filled in that way follows the name', (await page.inputValue('#task-drive')) === '' && await page.isVisible('#task-project-add-folder'));
  await page.fill('#task-project', 'google  gws');
  check('names match the way projects do (case, spaces)', (await page.inputValue('#task-drive')) === 'https://drive.google.com/drive/folders/gws');
  await page.fill('#task-project', 'Google GWS');
  await page.click('#checklist-copy-btn'); await page.waitForTimeout(500);
  const rows = await page.$$eval('#checklist-copy-pop [data-copy-steps-from]', els => els.map(e => e.getAttribute('data-copy-steps-from')));
  check('same project listed first', rows[0] === 'src', rows.join());
  check('archived jobs are offered too', rows.indexOf('arc1') !== -1, rows.join());
  check('a repeating series is listed once', rows.filter(r => /^r1/.test(r)).length === 1, rows.join());
  await page.screenshot({ path: 'mob2/copy-steps-pop.png' });
  await page.fill('#checklist-copy-pop input[type="search"]', 'client review');
  const filtered = await page.$$eval('#checklist-copy-pop [data-copy-steps-from]', els => els.map(e => e.getAttribute('data-copy-steps-from')));
  check('search matches step text', filtered.join() === 'src', filtered.join());
  await page.click('#checklist-copy-pop [data-copy-steps-from="src"]'); await page.waitForTimeout(300);
  const copied = await page.evaluate(() => [...document.querySelectorAll('#task-checklist-editor .checklist-item-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  check('three steps copied', copied.length === 3, copied.join(' | '));
  check('toast says how they were dated', /Copied 3 steps, dated from this deadline/.test(await page.textContent('#toast-container')));
  await page.screenshot({ path: 'mob2/copy-steps-done.png', clip: { x: 200, y: 0, width: 1040, height: 900 } });
  await save();
  d = await data();
  const madeId = Object.keys(d.tasks).find(k => d.tasks[k].name === 'GWS teaser');
  const made = madeId && d.tasks[madeId];
  const dues = made ? made.checklist.map(c => c.due).join() : '';
  check('dates keep their distance from the deadline, weekends moved to Friday', dues === '2026-11-10,2026-11-13,2026-11-17', dues);
  check('the folder is saved on the new task', made && made.driveLink === 'https://drive.google.com/drive/folders/gws');
  check('people come across, links do not', made && (made.checklist[1].assignees || []).join() === 'Zenon Kwok Ze Yong' && !made.checklist[0].link && made.checklist.every(c => !c.done));
  check('the step people are told on save', Object.values(d.notifications).some(n => n.recipient === 'Zenon Kwok Ze Yong' && n.taskId === madeId && n.type === 'checklist_assigned'));

  // Undo of a copy
  await page.click('#btn-add-task'); await page.waitForTimeout(300);
  await page.click('#checklist-copy-btn'); await page.waitForTimeout(300);
  await page.click('#checklist-copy-pop [data-copy-steps-from="arc1"]'); await page.waitForTimeout(200);
  check('copying without a deadline dates from the start date', /dated from the start date/.test(await page.textContent('#toast-container')));
  await lastToastAction('Copied 1 step'); await page.waitForTimeout(200);
  check('Undo takes the copied steps out again', !!(await page.$('#checklist-copy-btn')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => document.getElementById('confirm-modal').classList.contains('hidden')))) { await page.click('#confirm-ok-btn'); await page.waitForTimeout(300); }

  // ---------- Review rounds ----------
  await openTask('rv1'); await setStatus('Review'); await page.waitForTimeout(300);
  await page.click('#confirm-ok-btn'); await page.waitForTimeout(200);   // "Client review"
  await save();
  d = await data();
  const rr = d.tasks.rv1.reviewRounds || [];
  check('a second move into Review counts a second round', rr.length === 2 && rr.every(r => r.audience === 'client'), JSON.stringify(rr));
  const badge = await page.textContent('[data-set-review-audience="rv1"]');
  check('Board label reads "Client round 2"', /client round 2/i.test(badge), badge);
  await openTask('rv1');
  check('task window shows the totals', /Review rounds so far: 2 client/.test(await page.textContent('#task-review-rounds')));
  await page.click('#task-cancel-btn'); await page.waitForTimeout(300);
  await page.click('[data-set-review-audience="rv1"]'); await page.waitForTimeout(250);
  await page.click('#confirm-cancel-btn'); await page.waitForTimeout(400);   // "Internal review"
  d = await data();
  const rr2 = d.tasks.rv1.reviewRounds || [];
  check('changing the label corrects the round, not adds one', rr2.length === 2 && rr2[1].audience === 'internal', JSON.stringify(rr2));
  check('client and internal are counted apart', /^internal review$/i.test((await page.textContent('[data-set-review-audience="rv1"]')).trim()));

  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
