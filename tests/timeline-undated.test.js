// timeline-undated -- browser test against index.html with Firebase stubbed (see tests/README.md).
// Tasks without both dates are drawn on both timelines, never hidden (asked: "TBD how will it
// show on timeline (It should not be hidden)").
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : '')); }

function seed() {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l", "welcome", "tours-intro"], updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ priority: 'Medium', status: 'In Progress', assignee: 'Zenon Kwok Ze Yong', createdBy: 'Zenon Kwok Ze Yong', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['production'] })
      },
      tasks: {
        a1: T({ name: 'Dated', project: '261001[Google]Dated job', startDate: '2026-10-08', deadline: '2026-10-16' }),
        a2: T({ name: 'Edit TBD', project: '261001[LittlePaddington]Partner 2026', startDate: '2026-10-09', deadline: '' }),
        a3: T({ name: 'Another TBD', project: '261001[LittlePaddington]Partner 2026', startDate: '2026-10-10', deadline: '' }),
        a4: T({ name: 'Due only', project: '260820[Lark]AI', startDate: '', deadline: '2026-10-15' }),
        a5: T({ name: 'Nothing set', project: '260820[Lark]AI', startDate: '', deadline: '' })
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
  var seen = ['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates'].map(function (v) { return 'page:' + v; });
  'abcdefghijkl'.split('').forEach(function (c) { seen.push('cl-2026-10-07' + c); });
  try { localStorage.setItem('flowboard_tours_seen', JSON.stringify(seen)); } catch (e) {}
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
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000, state: 'attached' });
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

async function skipTours(page) {
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
}

(async () => {
  const browser = await chromium.launch();
  const dark = process.argv[2] === 'dark';
  const { page, errors } = await newPage(browser, '2026-10-12T10:00:00', { colorScheme: dark ? 'dark' : 'light' });
  await skipTours(page);

  // ---------- Timeline tab ----------
  await page.click('[data-view-btn="gantt"]'); await page.waitForTimeout(600); await skipTours(page);
  const tl = await page.evaluate(() => {
    var grid = document.getElementById('gantt-grid');
    var labels = [...grid.querySelectorAll('[data-gantt-row]')].filter(e => /^1(\s|$)/.test(e.style.gridColumn));
    var bar = id => grid.querySelector('.gantt-bar[data-open-task="' + id + '"]');
    return {
      rows: labels.length, text: grid.textContent,
      a2mask: bar('a2') ? bar('a2').getAttribute('style') : '', a1mask: bar('a1') ? bar('a1').getAttribute('style') : '',
      a2title: bar('a2') ? bar('a2').title : '', a4: !!bar('a4'), a4w: bar('a4') ? bar('a4').offsetWidth : 0,
      a5bar: !!bar('a5'),
      tags: [...grid.querySelectorAll('[data-open-task]')].filter(e => e.textContent === 'Deadline TBD').map(e => e.getAttribute('data-open-task')),
      add: [...grid.querySelectorAll('button[data-open-task]')].filter(e => e.textContent === 'Add dates').map(e => e.getAttribute('data-open-task')),
      stack: !document.getElementById('gantt-stack-note').classList.contains('hidden'),
      hiddenNote: !!document.getElementById('gantt-hidden-note')
    };
  });
  check('every task gets a row, none hidden', tl.rows === 5, tl.rows);
  check('a deadline TBD draws a fading bar', /mask-image/.test(tl.a2mask) && !/mask-image/.test(tl.a1mask));
  check('with a "Deadline TBD" tag on each', tl.tags.sort().join() === 'a2,a3', tl.tags.join());
  check('its tooltip says the deadline is TBD', /deadline TBD/.test(tl.a2title), tl.a2title);
  check('a deadline without a start draws one day', tl.a4 && tl.a4w < 130, tl.a4w);
  check('no dates at all: listed under "No dates yet", no bar', /No dates yet\s*1/.test(tl.text) && !tl.a5bar && tl.add.join() === 'a5', tl.add.join());
  check('two TBD tasks for one person are not a deadline stack', !tl.stack);
  check('the old "N tasks hidden" note is gone', !tl.hiddenNote);
  await page.screenshot({ path: 'timeline-undated' + (dark ? '-dark' : '') + '.png' });
  await page.click('#gantt-grid button[data-open-task="a5"]'); await page.waitForTimeout(400);
  check('"Add dates" opens the task', await page.evaluate(() => !document.getElementById('task-modal').classList.contains('hidden')));
  await page.click('#task-cancel-btn'); await page.waitForTimeout(300);
  { const c = await page.$('#confirm-ok-btn'); if (c && await c.isVisible()) await c.click(); await page.waitForTimeout(200); }

  // ---------- WIP Meeting timeline ----------
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(500); await skipTours(page);
  await page.click('[data-wip-mode="agenda"]'); await page.waitForTimeout(500);
  const wip = await page.evaluate(() => {
    var g = document.getElementById('wip-timeline-grid');
    if (!g) return null;
    var bar = id => g.querySelector('.gantt-bar[data-open-task="' + id + '"]');
    return {
      text: g.parentElement.parentElement.textContent,
      a2mask: bar('a2') ? bar('a2').getAttribute('style') : '',
      tags: [...g.querySelectorAll('[data-open-task]')].filter(e => e.textContent === 'Deadline TBD').length,
      a4: !!bar('a4'), a5: !!bar('a5'),
      add: [...g.querySelectorAll('button[data-open-task]')].filter(e => e.textContent === 'Add dates').map(e => e.getAttribute('data-open-task')).join()
    };
  });
  check('WIP timeline renders', !!wip);
  if (wip) {
    check('WIP: deadline TBD fades with its tag', /mask-image/.test(wip.a2mask) && wip.tags === 2, wip.tags);
    check('WIP: deadline-only task drawn', wip.a4);
    check('WIP: no-dates task listed with "Add dates"', !wip.a5 && wip.add === 'a5' && /No dates yet/.test(wip.text), wip.add);
    check('WIP: no "not shown" footnote', !/not shown/.test(wip.text));
    await page.evaluate(() => document.getElementById('wip-timeline-grid').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'wip-undated' + (dark ? '-dark' : '') + '.png' });
  }

  results.forEach(r => console.log(r));
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})();
