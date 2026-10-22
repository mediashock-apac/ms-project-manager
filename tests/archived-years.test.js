// archived-years -- Archived is grouped by year, then month, newest first; the newest year is open, older years fold to one line and open on click, and a search opens every year with a match. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const pages = ['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates'].map(v => 'page:' + v);
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","cl-2026-10-06x","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"].concat(pages), updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ project: 'GWS recording', priority: 'Medium', status: 'In Progress', startDate: '2026-11-02', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['suits'] }),
        u2: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['production'], leave: [{ id: 'l1', start: '2026-11-06', end: '2026-11-10', note: 'Trip' }] })
      },
      tasks: {
        t1: T({ name: 'Owned by Deane' }),
        t2: T({ name: 'Deane also involved', assignee: 'Chloe Hu', involved: ['Deane Cheng'] }),
        t3: T({ name: 'Chloe only', assignee: 'Chloe Hu' })
      },
      archivedTasks: {
        a1: T({ name: 'Oct one', archivedAt: '2026-10-15T04:00:00Z' }),
        a2: T({ name: 'Oct two', archivedAt: '2026-10-02T04:00:00Z' }),
        a3: T({ name: 'Sep one', archivedAt: '2026-09-20T04:00:00Z' }),
        a4: T({ name: 'Old December', archivedAt: '2025-12-10T04:00:00Z' }),
        a5: T({ name: 'Old March', archivedAt: '2025-03-03T04:00:00Z' })
      },
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
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

(async () => {
  const browser = await chromium.launch();
  const { page, errors, ctx } = await newPage(browser, '2026-10-22T10:00:00');
  await page.click('[data-view-btn="archived"]'); await page.waitForTimeout(800);
  const read = () => page.evaluate(() => [...document.getElementById('archived-list').children].map(e => e.hasAttribute('data-archived-year') ? 'Y:' + e.innerText.replace(/\s+/g, ' ').trim() + (e.getAttribute('aria-expanded') === 'true' ? ' open' : ' folded') : e.tagName === 'P' ? 'M:' + e.innerText.replace(/\s+/g, ' ').trim() : 'T:' + (e.querySelector('[data-open-task]') || {}).textContent));
  let list = await read();
  check('years, then months, newest first, with counts', list.join(' | ') === 'Y:2026 3 tasks open | M:OCTOBER · 2 | T:Oct one | T:Oct two | M:SEPTEMBER · 1 | T:Sep one | Y:2025 2 tasks folded', list.join(' | '));
  await page.screenshot({ path: path.join(OUT, 'archived-years.png') });
  await page.click('[data-archived-year="2025"]'); await page.waitForTimeout(300);
  list = await read();
  check('a folded year opens on click', list.slice(-5).join(' | ') === 'Y:2025 2 tasks open | M:DECEMBER · 1 | T:Old December | M:MARCH · 1 | T:Old March', list.slice(-5).join(' | '));
  await page.click('[data-archived-year="2026"]'); await page.waitForTimeout(300);
  list = await read();
  check('...and the newest year can be folded too', list[0] === 'Y:2026 3 tasks folded' && list[1] === 'Y:2025 2 tasks open', list.slice(0, 2).join(' | '));
  await page.click('[data-archived-year="2025"]'); await page.waitForTimeout(300);
  await page.fill('#filter-search', 'old'); await page.waitForTimeout(600);
  list = await read();
  check('a search opens every year with a match', list.join(' | ') === 'Y:2025 2 tasks open | M:DECEMBER · 1 | T:Old December | M:MARCH · 1 | T:Old March', list.join(' | '));
  await page.click('[data-unarchive-task="a1"]').catch(() => {});
  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
