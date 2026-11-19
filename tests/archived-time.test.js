// archived-time -- "+ Log time" in an archived task's window adds hours someone forgot to a finished
// task: the task stays archived (project stays Completed), the hours count in its totals, Undo takes
// them off, and it still works where the rules refuse a direct update of an archived task (moved out
// and back). Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(opts) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["page:projects","page:archived","page:wip","cl-2026-11-04a","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  const A = (o) => Object.assign({ priority: 'Medium', startDate: '2026-11-01', deadline: '2026-11-10', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', status: 'Done', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z', archivedAt: '2026-11-12T03:00:00Z' }, o);
  window.__fb = {
    seq: 1, writes: [],
    denyUpdate: opts.deny ? { archivedTasks: true } : null,
    auth: { currentUser: { uid: 'u4', displayName: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] })
      },
      tasks: {
        t9: { name: 'Other work', project: 'Live Job', priority: 'Medium', status: 'In Progress', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      archivedTasks: {
        a1: A({ name: 'Edit video', project: 'Done Job', checklist: [{ id: 'c1', text: 'Colour grade', done: true }], timeEntries: [{ minutes: 120, note: 'Cut', billable: true, overtime: false, checklistItemId: null, date: '2026-11-05T03:00:00Z', author: 'Deane Cheng' }] })
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); localStorage.setItem('flowboard_teamspace', 'all'); } catch (e) {}
}

async function newPage(browser, opts) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date('2026-11-19T10:00:00') });
  await page.addInitScript(seed, opts);
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
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) {
    const b = await page.$('[data-tour-skip]');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  return { page, ctx, errors };
}

const archived = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__fb.data.archivedTasks.a1 || null)));

async function openTask(page) {
  await page.click('[data-view-btn="archived"]'); await page.waitForTimeout(700);
  await page.click('#archived-list [data-open-task="a1"]'); await page.waitForTimeout(400);
}

async function logTime(page, hours, who, note) {
  await page.click('#archived-time-open'); await page.waitForTimeout(200);
  await page.fill('#archived-time-hours', String(hours));
  if (who) await page.selectOption('#archived-time-for', who);
  if (note) await page.fill('#archived-time-note', note);
  await page.click('#archived-time-log'); await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch();

  // 1. Rules allow the update: saved straight onto the archived task.
  {
    const { page, ctx, errors } = await newPage(browser, {});
    await openTask(page);
    check('archived window offers + Log time', !!(await page.$('#archived-time-open')));
    check('no form until asked', !(await page.$('#archived-time-form')));
    await page.click('#archived-time-open'); await page.waitForTimeout(200);
    check('form opens with hours focused', await page.evaluate(() => document.activeElement && document.activeElement.id === 'archived-time-hours'));
    check('For defaults to me', (await page.inputValue('#archived-time-for')) === 'Zenon Kwok Ze Yong');
    await page.screenshot({ path: path.join(OUT, 'archived-time-form.png') });
    await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, 'archived-time-form-dark.png') });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    // Empty hours: nothing saved, form stays
    await page.click('#archived-time-log'); await page.waitForTimeout(200);
    check('no hours, nothing saved', (await archived(page)).timeEntries.length === 1);
    // Outside click keeps a half-typed entry
    await page.fill('#archived-time-hours', '1');
    await page.mouse.click(5, 5); await page.waitForTimeout(200);
    check('outside click keeps the window while logging', await page.$eval('#archived-task-modal', el => !el.classList.contains('hidden')));
    // Escape closes only the form
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    check('Escape closes only the form', !(await page.$('#archived-time-form')) && await page.$eval('#archived-task-modal', el => !el.classList.contains('hidden')));

    await logTime(page, 1.5, null, 'colour grade');
    const a = await archived(page);
    const e = a.timeEntries[1] || {};
    check('entry saved on the archived task', a.timeEntries.length === 2 && e.minutes === 90 && e.author === 'Zenon Kwok Ze Yong' && e.billable === true, JSON.stringify(e));
    check('linked to the matching step', e.checklistItemId === 'c1');
    check('task stays archived, archivedAt kept', a.archivedAt === '2026-11-12T03:00:00Z' && !(await page.evaluate(() => !!window.__fb.data.tasks.a1)));
    check('window shows the new total', /Time logged · 3h 30m/.test(await page.textContent('#archived-time')), await page.textContent('#archived-time'));
    check('form closed after logging', !(await page.$('#archived-time-form')));
    check('activity logged', await page.evaluate(() => Object.values(window.__fb.data.activity).some(x => /Logged 1h 30m on archived "Edit video"/.test(x.summary))));

    // For someone else
    await logTime(page, 2, 'Deane Cheng');
    const e2 = (await archived(page)).timeEntries[2] || {};
    check('logged for someone else records who entered it', e2.author === 'Deane Cheng' && e2.loggedBy === 'Zenon Kwok Ze Yong', JSON.stringify(e2));

    // Undo takes it off
    await page.click('#toast-container > div:last-child .toast-action'); await page.waitForTimeout(600);
    check('Undo removes just that entry', (await archived(page)).timeEntries.length === 2);
    check('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // 2. Rules refuse a direct update (not creator, rules not yet published): moved out and back.
  {
    const { page, ctx, errors } = await newPage(browser, { deny: true });
    await openTask(page);
    await logTime(page, 0.5);
    const a = await archived(page);
    check('fallback: still archived with the hours', !!a && a.timeEntries.length === 2 && a.timeEntries[1].minutes === 30, JSON.stringify(a && a.timeEntries));
    check('fallback: not left on the board', !(await page.evaluate(() => !!window.__fb.data.tasks.a1)));
    check('fallback: archivedAt kept', a && a.archivedAt === '2026-11-12T03:00:00Z');
    check('fallback: board unchanged', !(/Edit video/.test(await page.evaluate(() => { const b = document.getElementById('view-board'); return b ? b.textContent : ''; }))));
    check('fallback: success toast', /Logged 30m on "Edit video"/.test(await page.$$eval('#toast-container > div', els => els.map(e => e.textContent).join(' | '))));
    check('fallback: no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
