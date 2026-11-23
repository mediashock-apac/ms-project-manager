// project-lost -- "Lost or cancelled…" (Projects ⋯ row and WIP ⋯ row) archives a project's tasks without marking them Done, takes it off WIP and lists it under Lost & cancelled on Projects; Undo and Reopen put it all back. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
        t4: T({ name: 'Storyboard', project: 'Cancel Job', status: 'In Progress' }),
        t5: T({ name: 'Shoot', project: 'Live Job', status: 'In Progress' }),
        t6: T({ name: 'Deck', project: 'Pitch Job', status: 'Pipeline' })
      },
      archivedTasks: {
        a1: T({ name: 'Wrap', project: 'Done Job', status: 'Done', completedAt: '2026-11-10T03:00:00Z', archivedAt: '2026-11-11T03:00:00Z' })
      },
      projects: {
        p1: { name: 'Pitch Job', wipCategory: 'pitch' },
        p2: { name: 'Cold Lead X', wipCategory: 'cold', wipNote: 'Met at the expo' }
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

const projDoc = (page, n) => page.evaluate(n => Object.values(window.__fb.data.projects).find(x => x.name === n) || null, n);
const modalOpen = (page) => page.$eval('#close-project-modal', el => !el.classList.contains('hidden')).catch(() => false);

(async () => {
  const browser = await chromium.launch();
  const { page, ctx, errors } = await newPage(browser, '2026-11-19T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(900); await skipTours(page);

  // Projects: the ⋯ row of an ongoing project offers it
  await page.click(menu('Cancel Job')); await page.waitForTimeout(200);
  check('ongoing ⋯ row offers Lost or cancelled', !!(await page.$('#projects-grid .project-close-btn[data-project="Cancel Job"]')));
  await page.click('#projects-grid .project-close-btn[data-project="Cancel Job"]'); await page.waitForTimeout(300);
  check('window opens', await modalOpen(page));
  check('Close is disabled until a choice is picked', await page.$eval('#close-project-ok', b => b.disabled));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  check('Escape closes it, nothing changed', !(await modalOpen(page)) && await db(page, () => !!window.__fb.data.tasks.t4));

  await page.click(menu('Cancel Job')); await page.waitForTimeout(200);
  await page.click('#projects-grid .project-close-btn[data-project="Cancel Job"]'); await page.waitForTimeout(300);
  await page.click('#close-project-modal [data-close-kind="cancelled"]'); await page.waitForTimeout(100);
  await page.fill('#close-project-reason', 'Client paused the campaign');
  await page.screenshot({ path: path.join(OUT, 'project-lost-window.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'project-lost-window-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.click('#close-project-ok'); await page.waitForTimeout(700);
  const t4 = await db(page, () => window.__fb.data.archivedTasks.t4 || null);
  check('task archived, not marked Done', !!t4 && t4.status === 'In Progress' && await db(page, () => !window.__fb.data.tasks.t4), JSON.stringify(t4 && t4.status));
  const d1 = await projDoc(page, 'Cancel Job');
  check('outcome saved with reason', !!(d1 && d1.outcome && d1.outcome.kind === 'cancelled' && d1.outcome.reason === 'Client paused the campaign'), JSON.stringify(d1));
  check('logged to Activity', await db(page, () => Object.values(window.__fb.data.activity).some(a => a.type === 'project_closed' && /Cancel Job as cancelled/.test(a.summary))));
  check('toast offers Undo', /closed as cancelled/.test(await toastText(page)) && !!(await page.$('#toast-container .toast-action:has-text("Undo")')));

  // Listed under Lost & cancelled, not Completed, not green
  const closedSec = await page.$('#projects-closed-details');
  check('Lost & cancelled section appears', !!closedSec);
  if (closedSec && !(await page.$eval('#projects-closed-details', d => d.open))) { await page.click('#projects-closed-details > summary'); await page.waitForTimeout(300); }
  const closedText = closedSec ? await page.textContent('#projects-closed-details') : '';
  check('card shows Cancelled and the reason', /Cancelled/.test(closedText) && /Client paused the campaign/.test(closedText), closedText.slice(0, 200));
  await openCompleted(page);
  const compText = await page.textContent('#projects-completed-details');
  check('not listed under Completed', compText.indexOf('Cancel Job') === -1 && compText.indexOf('Done Job') !== -1, compText.slice(0, 200));
  const green = await page.$eval('#projects-closed-details .rounded-xl', el => /emerald/.test(el.className));
  check('closed card is not the finished green', !green);
  await page.screenshot({ path: path.join(OUT, 'project-lost-section.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'project-lost-section-dark.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  // Undo puts it back
  await page.click('#toast-container .toast-action:has-text("Undo")'); await page.waitForTimeout(700);
  const d2 = await projDoc(page, 'Cancel Job');
  check('Undo restores the task and clears the outcome', await db(page, () => !!window.__fb.data.tasks.t4) && !(d2 && d2.outcome), JSON.stringify(d2));

  // WIP: a pitch defaults to Lost and leaves WIP
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(900); await skipTours(page);
  check('pitch is on WIP first', (await page.textContent('#wip-projects')).indexOf('Pitch Job') !== -1);
  await page.click('[data-wip-act="pick-category"][data-project="Pitch Job"]'); await page.waitForTimeout(200);
  await page.click('[data-wip-act="close-project"][data-project="Pitch Job"]'); await page.waitForTimeout(300);
  check('a pitch defaults to Lost', await page.$eval('#close-project-modal [data-close-kind="lost"]', b => b.getAttribute('aria-pressed') === 'true') && !(await page.$eval('#close-project-ok', b => b.disabled)));
  await page.click('#close-project-ok'); await page.waitForTimeout(800);
  const d3 = await projDoc(page, 'Pitch Job');
  check('category cleared and remembered', d3.wipCategory === null && !!d3.outcome && d3.outcome.kind === 'lost' && d3.outcome.wipCategory === 'pitch', JSON.stringify(d3));
  check('leaves WIP', (await page.textContent('#wip-projects')).indexOf('Pitch Job') === -1);

  // A lead with no tasks, closed from WIP with Enter
  await page.click('[data-wip-act="pick-category"][data-project="Cold Lead X"]'); await page.waitForTimeout(200);
  await page.click('[data-wip-act="close-project"][data-project="Cold Lead X"]'); await page.waitForTimeout(300);
  await page.fill('#close-project-reason', 'No budget');
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  check('lead with no tasks leaves WIP', (await page.textContent('#wip-projects')).indexOf('Cold Lead X') === -1);
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(900);
  if (!(await page.$eval('#projects-closed-details', d => d.open))) { await page.click('#projects-closed-details > summary'); await page.waitForTimeout(300); }
  const closedText2 = await page.textContent('#projects-closed-details');
  check('lead listed under Lost & cancelled', /Cold Lead X/.test(closedText2) && /No budget/.test(closedText2) && /Pitch Job/.test(closedText2), closedText2.slice(0, 300));

  // Reopen
  await page.click(menu('Cold Lead X')); await page.waitForTimeout(200);
  const reopen = await page.$('#projects-grid .project-restore-btn[data-project="Cold Lead X"]');
  check('⋯ offers Reopen project', !!reopen && /Reopen project/.test(await reopen.textContent()));
  if (reopen) { await reopen.click(); await page.waitForTimeout(800); }
  const d4 = await projDoc(page, 'Cold Lead X');
  check('Reopen puts the category back', d4.wipCategory === 'cold' && !d4.outcome, JSON.stringify(d4));
  await page.click(menu('Pitch Job')); await page.waitForTimeout(200);
  await page.click('#projects-grid .project-restore-btn[data-project="Pitch Job"]'); await page.waitForTimeout(900);
  const d5 = await projDoc(page, 'Pitch Job');
  check('Reopen restores tasks too', await db(page, () => !!window.__fb.data.tasks.t6) && d5.wipCategory === 'pitch' && !d5.outcome, JSON.stringify(d5));
  check('section disappears when empty', !(await page.$('#projects-closed-details')));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
