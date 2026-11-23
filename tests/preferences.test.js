// preferences -- start page, hidden sidebar pages, notification switches and quiet hours
// (YOUR PREFERENCES in index.html). Browser test with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();   // tests/.out when run by run.mjs

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(prefs) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["page:mytasks","page:board","page:gantt","page:calendar","page:projects","page:people","page:chat","page:weekly","page:wip","page:activity","page:archived","page:updates","page:suggestions","cl-2026-11-04a","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P(Object.assign({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }, prefs || {})),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'] })
      },
      tasks: {
        t1: { name: 'Rough cut', project: 'GWS recording', priority: 'High', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}

function extra() {
  try { localStorage.setItem('flowboard_desktop_notif', 'on'); } catch (e) {}
  window.__shown = [];
  window.Notification = function (title, opts) { window.__shown.push({ title: title, body: opts.body }); this.close = function () {}; };
  window.Notification.permission = 'granted';
  window.Notification.requestPermission = function () { return Promise.resolve('granted'); };
}

async function newPage(browser, when, prefs, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 1000 } }, opts || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed, prefs || {}); await page.addInitScript(extra);
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
async function skipTours(page) {
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
}
const shownBtn = (page, v) => page.$eval('#sidebar-nav [data-view-btn="' + v + '"]', e => getComputedStyle(e).display !== 'none');
const historyHeading = (page) => page.evaluate(() => {
  const p = Array.prototype.find.call(document.querySelectorAll('#sidebar-nav p.sidebar-label'), x => x.textContent.trim() === 'History');
  return p && getComputedStyle(p).display !== 'none';
});
const badge = (page) => page.$eval('#notification-badge', e => e.classList.contains('hidden') ? '0' : e.textContent.trim());
async function openPrefs(page) {
  await skipTours(page);
  await page.click('#user-menu-trigger'); await page.waitForTimeout(200);
  await page.click('#btn-preferences'); await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch();

  // 1. Setting things in the window
  let { page, ctx, errors } = await newPage(browser, '2026-10-07T15:00:00');
  await skipTours(page);
  check('lands on Board by default', await page.$eval('#view-board', e => e.classList.contains('active-view')));
  check('no More row while nothing is hidden', !(await page.$eval('#sidebar-more-btn', e => getComputedStyle(e).display !== 'none')));
  await openPrefs(page);
  check('Preferences window opens', await page.$eval('#prefs-modal', e => !e.classList.contains('hidden')));
  await page.screenshot({ path: path.join(OUT, 'preferences.png') });
  await page.selectOption('#prefs-start', 'mytasks'); await page.waitForTimeout(200);
  for (const v of ['gantt', 'activity']) { await page.click('[data-prefs-page="' + v + '"]'); await page.waitForTimeout(150); }
  await page.click('[data-prefs-notif="chat"]'); await page.waitForTimeout(150);
  const saved = await page.evaluate(() => window.__fb.data.people.u1);
  check('saved on your own roster row', saved.startView === 'mytasks' && JSON.stringify(saved.hiddenPages) === '["gantt","activity"]' && JSON.stringify(saved.notifOff) === '["chat"]', JSON.stringify([saved.startView, saved.hiddenPages, saved.notifOff]));
  check('mirrored on this computer', /mytasks/.test(await page.evaluate(() => localStorage.getItem('flowboard_prefs'))));
  check('other people untouched', !('startView' in (await page.evaluate(() => window.__fb.data.people.u2))));
  check('choosing a start page does not move you now', await page.$eval('#view-board', e => e.classList.contains('active-view')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  check('Escape closes it', await page.$eval('#prefs-modal', e => e.classList.contains('hidden')));
  check('hidden pages leave the sidebar', !(await shownBtn(page, 'gantt')) && !(await shownBtn(page, 'activity')) && await shownBtn(page, 'calendar'));
  check('History heading stays while Archived shows', await historyHeading(page));
  check('More row counts them', /More \(2\)/.test(await page.textContent('#sidebar-more-btn')));
  await page.click('#sidebar-more-btn'); await page.waitForTimeout(150);
  check('More shows them again', await shownBtn(page, 'gantt') && /Fewer pages/.test(await page.textContent('#sidebar-more-btn')));
  await page.click('#sidebar-nav [data-view-btn="gantt"]'); await page.waitForTimeout(300); await skipTours(page);
  check('a hidden page shows while you are on it; the rest fold', await shownBtn(page, 'gantt') && !(await shownBtn(page, 'activity')) && /More \(1\)/.test(await page.textContent('#sidebar-more-btn')));

  // Notifications turned off: not on the bell, no pop-up; mentions still come through
  await page.evaluate(() => window.__fb.remote(function (d) {
    d.notifications.n1 = { recipient: 'Deane Cheng', type: 'chat_post', taskId: null, taskName: '', chatProject: 'GWS recording', author: 'Arvind Kumaraguru', snippet: 'Posted something', at: '2026-10-07T07:01:00.000Z', read: false };
    d.notifications.n2 = { recipient: 'Deane Cheng', type: 'chat_mention', taskId: null, taskName: '', chatProject: 'GWS recording', author: 'Arvind Kumaraguru', snippet: '@Deane Cheng look', at: '2026-10-07T07:02:00.000Z', read: false };
  }));
  await page.waitForTimeout(300);
  const shown = await page.evaluate(() => window.__shown.map(s => s.title));
  check('chat post turned off: no pop-up', !shown.some(t => /posted in a chat/.test(t)), JSON.stringify(shown));
  check('a mention still pops up', shown.some(t => /mentioned you in a chat/.test(t)), JSON.stringify(shown));
  check('the bell counts only what you get', (await badge(page)) === '1', await badge(page));
  await openPrefs(page);
  await page.click('[data-prefs-notif="chat"]'); await page.waitForTimeout(250);
  check('turned back on: the bell shows it', (await badge(page)) === '2', await badge(page));
  await page.click('[data-prefs-notif="chat"]'); await page.waitForTimeout(150);
  // Quiet hours around now (15:00)
  await page.click('#prefs-quiet-on'); await page.waitForTimeout(150);
  check('quiet hours times appear when ticked', await page.$eval('#prefs-quiet-times', e => getComputedStyle(e).display !== 'none'));
  await page.fill('#prefs-quiet-from', '14:00'); await page.dispatchEvent('#prefs-quiet-from', 'change');
  await page.fill('#prefs-quiet-to', '16:00'); await page.dispatchEvent('#prefs-quiet-to', 'change');
  await page.waitForTimeout(200);
  const qh = await page.evaluate(() => window.__fb.data.people.u1.quietHours);
  check('quiet hours saved', JSON.stringify(qh) === JSON.stringify({ on: true, from: '14:00', to: '16:00', weekends: false }), JSON.stringify(qh));
  await page.click('#prefs-modal [data-prefs-close].bg-brand-600'); await page.waitForTimeout(200);
  check('Done closes it', await page.$eval('#prefs-modal', e => e.classList.contains('hidden')));
  await page.evaluate(() => { window.__shown = []; window.__fb.remote(function (d) {
    d.notifications.n3 = { recipient: 'Deane Cheng', type: 'mention', taskId: 't1', taskName: 'Rough cut', chatProject: null, author: 'Arvind Kumaraguru', snippet: '@Deane Cheng quiet', at: '2026-10-07T07:03:00.000Z', read: false };
  }); });
  await page.waitForTimeout(300);
  check('quiet hours: no pop-up', (await page.evaluate(() => window.__shown.length)) === 0);
  check('quiet hours: the bell still has it', (await badge(page)) === '2', await badge(page));
  check('no page errors (1)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // 2. Another computer: the roster row carries everything
  ({ page, ctx, errors } = await newPage(browser, '2026-10-07T17:00:00', { startView: 'mytasks', hiddenPages: ['gantt', 'activity', 'archived'], notifOff: ['alerts'] }));
  await skipTours(page);
  check('lands on your start page on another computer', await page.$eval('#view-mytasks', e => e.classList.contains('active-view')));
  check('hidden pages hidden there too', !(await shownBtn(page, 'gantt')) && /More \(3\)/.test(await page.textContent('#sidebar-more-btn')));
  check('a heading with nothing under it hides', !(await historyHeading(page)));
  await page.evaluate(() => window.__fb.remote(function (d) {
    d.notifications.n4 = { recipient: 'Deane Cheng', type: 'deadline_reminder', taskId: 't1', taskName: 'Rough cut', chatProject: null, author: 'Deadline alert', snippet: 'due tomorrow', at: '2026-10-07T09:00:00.000Z', read: false };
  }));
  await page.waitForTimeout(300);
  check('alerts turned off: nothing shown', (await page.evaluate(() => window.__shown.length)) === 0 && (await badge(page)) === '0', await badge(page));
  await page.screenshot({ path: path.join(OUT, 'preferences-sidebar.png') });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await openPrefs(page);
  await page.screenshot({ path: path.join(OUT, 'preferences-dark.png') });
  check('no page errors (2)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // 3. Phone width: nothing breaks
  ({ page, ctx, errors } = await newPage(browser, '2026-10-07T17:00:00', { hiddenPages: ['gantt'], startView: 'gantt' }, { viewport: { width: 390, height: 844 }, hasTouch: true }));
  check('no page errors on a phone', errors.length === 0, errors.join(' | '));
  await ctx.close();

  console.log(results.join('\n'));
  await browser.close();
})();
