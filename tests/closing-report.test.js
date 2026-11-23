// closing-report -- archiving a finished project offers "Needs closing report" on the toast, which lists it under Closing reports in WIP Meeting; a Completed card's ⋯ row offers the same, and "Closing report done" to clear it. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(asUser) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["page:projects","page:wip","cl-2026-11-23d","cl-2026-11-04a","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ priority: 'Medium', startDate: '2026-11-01', deadline: '2026-12-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }, o);
  const users = {
    deane: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg' },
    zenon: { uid: 'u4', displayName: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg' }
  };
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: Object.assign({ photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } }, users[asUser || 'deane']) },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'], favoriteChats: ['Dup Project'] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] })
      },
      tasks: {
        t1: T({ name: 'Edit', project: 'Done Job', status: 'Done', completedAt: '2026-11-17T03:00:00Z' }),
        t2: T({ name: 'Deliver', project: 'Done Job', status: 'Done', completedAt: '2026-11-17T04:00:00Z' }),
        t3: T({ name: 'Wrap', project: 'Already Listed', status: 'Done', completedAt: '2026-11-17T03:00:00Z' }),
        t4: T({ name: 'Storyboard', project: 'Cancel Job', status: 'In Progress' }),
        t5: T({ name: 'Shoot', project: 'Live Job', status: 'In Progress' })
      },
      archivedTasks: {},
      projects: {
        p1: { name: 'Already Listed', wipCategory: 'closing' }
      },
      activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); localStorage.setItem('flowboard_teamspace', 'all'); } catch (e) {}
}

async function newPage(browser, when, asUser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed, asUser);
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

const menu = (name) => '#projects-grid .project-menu-toggle[data-project="' + name + '"]';
const db = (page, fn) => page.evaluate(fn);
const toastText = (page) => page.$$eval('#toast-container > div', els => els.map(e => e.textContent).join(' | '));
async function openCompleted(page) {
  const sum = await page.$('#projects-completed-details > summary');
  if (sum && !(await page.$eval('#projects-completed-details', d => d.open))) { await sum.click(); await page.waitForTimeout(300); }
}
const catOf = (page, name) => page.evaluate(n => { const p = Object.values(window.__fb.data.projects).find(x => x.name === n); return p ? (p.wipCategory || null) : undefined; }, name);

(async () => {
  const browser = await chromium.launch();
  const { page, ctx, errors } = await newPage(browser, '2026-11-18T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(900); await skipTours(page);

  // Ready to archive on a finished project: the toast offers both
  await page.click('#projects-grid .project-archive-btn[data-project="Done Job"]'); await page.waitForTimeout(500);
  const btns = await page.$$eval('#toast-container .toast-action', els => els.map(e => e.textContent));
  check('toast offers Needs closing report and Undo', JSON.stringify(btns) === JSON.stringify(['Needs closing report', 'Undo']), JSON.stringify(btns));
  await page.screenshot({ path: path.join(OUT, 'closing-report-toast.png') });
  await page.click('#toast-container .toast-action:has-text("Needs closing report")'); await page.waitForTimeout(500);
  check('project filed under Closing reports', (await catOf(page, 'Done Job')) === 'closing', String(await catOf(page, 'Done Job')));
  check('says where it went', /Listed under Closing reports in WIP Meeting/.test(await toastText(page)));
  check('tasks are archived (Completed)', await db(page, () => !window.__fb.data.tasks.t1 && !!window.__fb.data.archivedTasks.t1));

  // Already in Closing reports: no offer
  await page.click('#projects-grid .project-archive-btn[data-project="Already Listed"]'); await page.waitForTimeout(500);
  const btns2 = await page.$$eval('#toast-container > div:last-child .toast-action', els => els.map(e => e.textContent));
  check('no offer when already in Closing reports', JSON.stringify(btns2) === JSON.stringify(['Undo']), JSON.stringify(btns2));

  // Archived unfinished (cancelled): Undo only
  await page.click(menu('Cancel Job')); await page.waitForTimeout(200);
  await page.click('#projects-grid .project-archive-all-btn[data-project="Cancel Job"]'); await page.waitForTimeout(200);
  await page.click('#confirm-ok-btn'); await page.waitForTimeout(500);
  const btns3 = await page.$$eval('#toast-container > div:last-child .toast-action', els => els.map(e => e.textContent));
  check('no offer when archived unfinished', JSON.stringify(btns3) === JSON.stringify(['Undo']), JSON.stringify(btns3));

  // WIP lists it under Closing reports, with no open tasks
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(900); await skipTours(page);
  const wip = await page.textContent('#wip-projects');
  check('WIP lists it under Closing reports', /Closing reports/.test(wip) && wip.indexOf('Done Job') > wip.indexOf('Closing reports'), wip.slice(0, 300));

  // ⋯ on the Completed card: Closing report done, then Needs closing report again
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(700); await openCompleted(page);
  await page.click(menu('Done Job')); await page.waitForTimeout(200);
  check('Completed card offers Closing report done', !!(await page.$('#projects-grid .project-closing-btn[data-project="Done Job"][data-closing="off"]')));
  await page.screenshot({ path: path.join(OUT, 'closing-report-menu.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'closing-report-menu-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.click('#projects-grid .project-closing-btn[data-project="Done Job"]'); await page.waitForTimeout(500);
  check('done clears the category', (await catOf(page, 'Done Job')) === null);
  await page.click(menu('Done Job')); await page.waitForTimeout(200);
  check('then offers Needs closing report', !!(await page.$('#projects-grid .project-closing-btn[data-project="Done Job"][data-closing="on"]')));
  await page.click('#projects-grid .project-closing-btn[data-project="Done Job"]'); await page.waitForTimeout(500);
  check('the menu sets it again', (await catOf(page, 'Done Job')) === 'closing');

  // Ongoing cards don't get the option
  await page.click(menu('Live Job')); await page.waitForTimeout(200);
  check('ongoing card has no closing option', !(await page.$('#projects-grid .project-closing-btn[data-project="Live Job"]')));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
