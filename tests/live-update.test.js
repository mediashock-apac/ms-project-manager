// live-update -- getting onto a new version without the "please refresh" popup: a quiet reload when
// nobody is looking, a cue on New Updates otherwise, the banner only after a working day, and never
// a reload loop. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');

const TOURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'monday-meeting.test.js'), 'utf8').match(/toursSeen: (\[[^\]]*\])/)[1]);
TOURS.push(...['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates'].map(v => 'page:' + v));

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(tours) {
  const now = new Date().toISOString();
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: { u1: { name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'], departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: tours, updatesSeen: 'zzzz' } },
      tasks: { t1: { name: 'Deck', project: 'Acme', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' } },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}

// `serverVersion`: what version.txt says on the server (a newer build than the page's own stamp).
async function newPage(browser, serverVersion) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.clock.install({ time: new Date('2026-10-06T10:00:00') });
  await page.addInitScript({ content: '(' + seed.toString() + ')(' + JSON.stringify(TOURS) + ');' });
  await page.route('https://www.gstatic.com/firebasejs/**', r => {
    const u = r.request().url();
    const key = /firebase-app/.test(u) ? 'app' : /firebase-auth/.test(u) ? 'auth' : /firebase-storage/.test(u) ? 'storage' : 'firestore';
    r.fulfill({ status: 200, contentType: 'text/javascript', body: STUBS[key] });
  });
  await page.route('http://pm.test/**', r => {
    let p = new URL(r.request().url()).pathname;
    if (p === '/') p = '/index.html';
    if (p === '/version.txt') return r.fulfill({ status: 200, contentType: 'text/plain', body: serverVersion });
    const f = path.join(REPO, decodeURIComponent(p));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.png') ? 'image/png' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await skipTours(page);
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
const marked = (page) => page.evaluate(() => window.__notReloaded === true);
const mark = (page) => page.evaluate(() => { window.__notReloaded = true; });
const wiggle = async (page) => { await page.mouse.move(700, 500); await page.mouse.move(705, 505); };
// The page checks version.txt every minute; jump past one check while "using" the page.
async function nextCheck(page) { await wiggle(page); await page.clock.runFor(61000); await page.waitForTimeout(300); }

(async () => {
  const browser = await chromium.launch();
  const NEW = '2099-01-01T00:00:00Z';

  // ---------- Active: no popup, no reload, a quiet cue on New Updates ----------
  const a = await newPage(browser, NEW);
  await mark(a.page);
  await nextCheck(a.page);
  check('no reload while you are using the page', await marked(a.page));
  check('no popup banner', await a.page.$eval('#update-banner', e => e.classList.contains('hidden')));
  check('New Updates shows the new version cue', /New version · refresh/.test(await a.page.textContent('#updates-nav-btn')) && !!(await a.page.$('#updates-nav-btn [data-ic="refresh"]')));
  await a.page.click('[data-view-btn="board"]').catch(() => {});
  await a.page.click('#updates-nav-btn');
  await a.page.waitForSelector('#app:not(.hidden)'); await a.page.waitForTimeout(1500); await skipTours(a.page);
  check('clicking the cue reloads', !(await marked(a.page)));
  check('...and opens New Updates', (await a.page.textContent('#current-view-title')).trim() === 'New Updates');
  // The page's own stamp is still older than version.txt here (a mismatch): it must not loop.
  await mark(a.page);
  await a.page.clock.runFor(7 * 60 * 1000); await a.page.waitForTimeout(300);
  check('no reload loop when the stamps disagree after a reload', await marked(a.page));
  check('no page errors (active)', a.errors.length === 0, a.errors.slice(0, 2).join(' | '));
  await a.ctx.close();

  // ---------- Idle for 5 minutes: moves to the new version by itself, same page ----------
  const b = await newPage(browser, NEW);
  await b.page.click('[data-view-btn="calendar"]'); await b.page.waitForTimeout(1300); await skipTours(b.page);
  await mark(b.page);
  await nextCheck(b.page);
  check('still the old copy straight after the check', await marked(b.page));
  await b.page.clock.runFor(5 * 60 * 1000 + 10000);
  await b.page.waitForSelector('#app:not(.hidden)'); await b.page.waitForTimeout(1500); await skipTours(b.page);
  check('reloads by itself after 5 idle minutes', !(await marked(b.page)));
  check('comes back on the same page', (await b.page.textContent('#current-view-title')).trim() === 'Calendar');
  await b.ctx.close();

  // ---------- Switching to another tab: moves to the new version straight away ----------
  const h = await newPage(browser, NEW);
  await mark(h.page);
  await nextCheck(h.page);
  await h.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await h.page.waitForSelector('#app:not(.hidden)'); await h.page.waitForTimeout(1500);
  check('reloads when you switch away from the tab', !(await marked(h.page)));
  await h.ctx.close();

  // ---------- Never while a window is open, even when idle ----------
  const c = await newPage(browser, NEW);
  await c.page.click('#btn-add-task').catch(() => {});
  await c.page.waitForTimeout(300);
  await mark(c.page);
  await nextCheck(c.page);
  await c.page.clock.runFor(10 * 60 * 1000); await c.page.waitForTimeout(300);
  check('never reloads with a window open', await marked(c.page) && await c.page.isVisible('#task-modal'));
  // ---------- Safety net: still old after a working day of use -> the banner, once ----------
  await c.page.clock.runFor(8 * 60 * 60 * 1000); await c.page.waitForTimeout(200);
  await c.page.keyboard.press('Escape'); await c.page.waitForTimeout(200);
  const discard = await c.page.$('#confirm-ok-btn');
  if (discard && await discard.isVisible()) { await discard.click(); await c.page.waitForTimeout(200); }
  await wiggle(c.page); await c.page.clock.runFor(6000); await c.page.waitForTimeout(200);
  check('after a working day the banner shows as a safety net', await c.page.$eval('#update-banner', e => !e.classList.contains('hidden')) && await marked(c.page));
  await c.ctx.close();

  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
