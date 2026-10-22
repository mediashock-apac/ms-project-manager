// timeline-marks -- deadline warnings on both timelines are tags after the bar's end (rose 'Nd late', amber same-day count), public holidays look different from weekends, and the Timeline's legend and month/day rows stay on screen while the page scrolls. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
      tasks: Object.assign({
        late: T({ name: 'Late one', startDate: '2026-10-05', deadline: '2026-10-19' }),
        s1: T({ name: 'Stack A', startDate: '2026-10-20', deadline: '2026-11-03' }),
        s2: T({ name: 'Stack B', startDate: '2026-10-26', deadline: '2026-11-03' }),
        s3: T({ name: 'Stack C', startDate: '2026-10-27', deadline: '2026-11-03' }),
        p1: T({ name: 'Pair A', startDate: '2026-10-21', deadline: '2026-11-04' }),
        p2: T({ name: 'Pair B', startDate: '2026-10-23', deadline: '2026-11-04' })
      }, (function () { const o = {}; for (let i = 0; i < 24; i++) o['f' + i] = T({ name: 'Filler ' + i, startDate: '2026-10-20', deadline: '2026-11-1' + (i % 10) }); return o; })()),
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
  const { page, errors, ctx } = await newPage(browser, '2026-10-22T10:00:00', { viewport: { width: 1440, height: 800 } });
  await page.click('[data-view-btn="gantt"]'); await page.waitForTimeout(800);
  const g = await page.evaluate(() => {
    const tag = sel => [...document.querySelectorAll('#gantt-grid ' + sel)];
    const late = tag('.gantt-late-tag').filter(e => e.getAttribute('data-open-task') === 'late')[0];
    const stack = tag('.gantt-stack-tag').filter(e => e.getAttribute('data-open-task') === 's1')[0];
    const pair = tag('.gantt-stack-tag').filter(e => /^p/.test(e.getAttribute('data-open-task'))).length;
    const bar = document.querySelector('#gantt-grid .gantt-bar[data-open-task="late"]');
    const hol = document.querySelector('#gantt-grid [title="Deepavali (in lieu) (public holiday)"]');
    const sat = [...document.querySelectorAll('#gantt-grid .gantt-head-cell')].find(e => /grid-row: ?2;/.test(e.getAttribute('style')) && /^S/.test(e.innerText.trim()) && !e.title);
    return { late: late && late.textContent, lateTitle: late && late.title, lateAfterBar: !!late && !!bar && late.getBoundingClientRect().left >= bar.getBoundingClientRect().right,
      stack: stack && stack.textContent, pair, oldDot: !!document.querySelector('#gantt-grid .gantt-bar .rounded-full'), overdueLegend: !document.getElementById('gantt-overdue-note').classList.contains('hidden'),
      holCls: hol ? hol.className : '', satCls: sat ? sat.className : '', holLegend: document.getElementById('gantt-holiday-note').innerText };
  });
  check('an overdue task gets a "3d late" tag after its bar', g.late === '3d late' && g.lateAfterBar && /was due Oct 19/.test(g.lateTitle || ''), g.late + ' / ' + g.lateTitle);
  check('three things due one day get the amber count tag', g.stack === '3', g.stack);
  check('two due one day is normal: no tag', g.pair === 0, String(g.pair));
  check('no corner dot or badge inside the bar any more', !g.oldDot);
  check('the legend explains Overdue while one is on screen', g.overdueLegend);
  check('a public holiday is teal, unlike a weekend', /bg-teal-50/.test(g.holCls) && /bg-zinc-100/.test(g.satCls) && !/teal/.test(g.satCls), g.holCls.slice(0, 60) + ' | ' + g.satCls.slice(0, 60));
  check('the legend names the holiday colour', /Public holiday/.test(g.holLegend), g.holLegend);
  await page.screenshot({ path: path.join(OUT, 'timeline-marks.png') });

  const scrollTo = y => page.evaluate(y => { const m = document.querySelector('main'); m.scrollTop = y; m.dispatchEvent(new Event('scroll')); }, y);
  const pos = () => page.evaluate(() => {
    const main = document.querySelector('main').getBoundingClientRect(), head = document.getElementById('gantt-head').getBoundingClientRect();
    const day = [...document.querySelectorAll('#gantt-grid .gantt-head-cell')].find(e => /grid-row: ?2;/.test(e.getAttribute('style'))).getBoundingClientRect();
    return { mainTop: Math.round(main.top), headTop: Math.round(head.top), headBottom: Math.round(head.bottom), dayTop: Math.round(day.top) };
  });
  await scrollTo(900); await page.waitForTimeout(300);
  const p = await pos();
  check('scrolled down, the legend stays pinned at the top', Math.abs(p.headTop - p.mainTop) <= 1, JSON.stringify(p));
  check('...and the month and day rows sit right under it', p.dayTop >= p.headBottom + 30 && p.dayTop <= p.headBottom + 34, JSON.stringify(p));
  await page.screenshot({ path: path.join(OUT, 'timeline-sticky.png') });
  await scrollTo(0); await page.waitForTimeout(300);
  const p0 = await pos();
  check('scrolled back up, everything is back in place', p0.dayTop === p0.headBottom + 32 || p0.dayTop - p0.headBottom < 40, JSON.stringify(p0));

  // ---------- easier sideways scrolling ----------
  const sl = () => page.evaluate(() => document.getElementById('gantt-grid').parentElement.scrollLeft);
  const modalOpen = () => page.evaluate(() => !document.getElementById('task-modal').classList.contains('hidden'));
  const spot = await page.evaluate(() => {
    const corner = document.querySelector('#gantt-grid .gantt-head-cell.left-0').getBoundingClientRect();
    const row = document.querySelector('#gantt-grid .gantt-bar[data-open-task="f0"]').parentElement.getBoundingClientRect();   // empty until Oct 20
    return { x: Math.round(corner.right + 40), y: Math.round(row.top + row.height / 2) };
  });
  const s0 = await sl();
  await page.mouse.move(spot.x + 250, spot.y); await page.mouse.down(); await page.mouse.move(spot.x + 150, spot.y, { steps: 5 }); await page.mouse.move(spot.x + 50, spot.y, { steps: 5 }); await page.mouse.up();
  await page.waitForTimeout(200);
  const s1 = await sl();
  check('dragging empty chart space slides it sideways', Math.abs((s1 - s0) - 200) <= 6, s0 + ' -> ' + s1);
  check('...and letting go opens nothing', !(await modalOpen()));
  await page.click('#gantt-grid .gantt-bar[data-open-task="late"]').catch(() => {}); await page.waitForTimeout(400);
  check('clicking a bar still opens its task', await modalOpen());
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const dw = await page.evaluate(() => +document.getElementById('gantt-grid').getAttribute('data-day-width'));
  const b0 = await sl();
  await page.click('[data-gantt-nav="1"]'); await page.waitForTimeout(900);
  const b1 = await sl();
  check('the forward arrow moves a week', Math.abs((b1 - b0) - 7 * dw) <= 2, b0 + ' -> ' + b1 + ' (day ' + dw + ')');
  await page.click('[data-gantt-nav="0"]'); await page.waitForTimeout(900);
  const today = await page.evaluate(() => { const g = document.getElementById('gantt-grid'), p = g.parentElement, line = g.querySelector('[data-today-index]:not(#gantt-grid)'); const c = g.querySelector('.gantt-head-cell.left-0').getBoundingClientRect(); const t = [...g.querySelectorAll('.gantt-head-cell')].find(e => /font-bold/.test(e.className) && /rose/.test(e.className)); const r = t.getBoundingClientRect(); return { inView: r.left >= c.right && r.right <= p.getBoundingClientRect().right }; });
  check('Today brings today back into view', today.inView);
  const w0 = await sl();
  const dayCell = await page.evaluate(() => { const r = [...document.querySelectorAll('#gantt-grid .gantt-head-cell')].filter(e => /grid-row: ?2;/.test(e.getAttribute('style')))[30].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(dayCell.x, dayCell.y); await page.mouse.wheel(0, 240); await page.waitForTimeout(300);
  const w1 = await sl();
  check('scrolling up/down over the dates moves the chart sideways', w1 - w0 >= 200, w0 + ' -> ' + w1);

  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(700);
  await page.click('[data-wip-mode="agenda"]'); await page.waitForTimeout(700);
  const w = await page.evaluate(() => { const e = document.querySelector('#wip-timeline .gantt-late-tag[data-open-task="late"]'); return { tag: e ? e.textContent : '', dot: !!document.querySelector('#wip-timeline .gantt-bar .rounded-full') }; });
  // The WIP timeline only lists work running into the window, so a past-deadline task isn't on it.
  check('the WIP timeline has no corner dot on its bars either', !w.dot, JSON.stringify(w));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
