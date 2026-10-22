// holidays -- Singapore public holidays show on the Calendar and Timeline and count as days off (Team load, due soon, deadline reminders, leave days), and the list in index.html doesn't run out unnoticed. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();   // tests/.out when run by run.mjs

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

// Thu 5 Nov 2026: Deepavali is Sun 8 Nov, so Mon 9 Nov is the day off in lieu.
// Thu 24 Dec 2026: Christmas is Fri 25 Dec, so Mon 28 Dec is the next working day.
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
        t1: T({ name: 'Recap edit', deadline: '2026-11-09' }),
        t2: T({ name: 'Thumbnails', deadline: '2026-11-12', assignee: 'Chloe Hu' }),
        t3: T({ name: 'Year-end post', deadline: '2026-12-28', startDate: '2026-12-01' }),
        t4: T({ name: 'Wrap report', deadline: '2026-12-31', startDate: '2026-12-01' })
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

  // ---------- the list itself ----------
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  const until = (html.match(/var SG_HOLIDAYS_UNTIL = '(\d{4}-\d{2}-\d{2})'/) || [])[1];
  const soon = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  check('the holiday list covers the next 90 days (add next year from MOM before it runs out)', !!until && until >= soon, until);

  // ---------- Thu 5 Nov: Calendar, Timeline, Team load ----------
  let { page, errors, ctx } = await newPage(browser, '2026-11-05T10:00:00');
  await page.click('[data-view-btn="calendar"]'); await page.waitForTimeout(600);
  const cal = await page.evaluate(() => {
    const col = ds => { const b = document.querySelector('[data-cal2-day="' + ds + '"]'); return b ? b.parentElement : null; };
    const c8 = col('2026-11-08'), c9 = col('2026-11-09'), c10 = col('2026-11-10');
    const first9 = c9 && c9.children[1] && c9.children[1].firstElementChild;
    return { t8: c8 && c8.innerText, t9: c9 && c9.innerText, tint9: !!c9 && /bg-zinc-50\/70/.test(c9.className), tint10: !!c10 && /bg-zinc-50\/70/.test(c10.className),
      first9: first9 ? first9.innerText : '', legend: document.getElementById('calendar-grid').innerText };
  });
  check('the Calendar shows Deepavali on Sunday', /Public holiday/i.test(cal.t8 || '') && /Deepavali/.test(cal.t8 || ''), cal.t8);
  check('...and the Monday off in lieu, explained', /Deepavali \(in lieu\)/.test(cal.t9 || '') && /fell on a Sunday/.test(cal.t9 || ''), cal.t9);
  check('the holiday is listed first on its day', /^PUBLIC HOLIDAY/i.test(cal.first9.trim()), cal.first9);
  check('a holiday weekday is shaded like a weekend; a working day is not', cal.tint9 && !cal.tint10);
  check('the legend explains the colour', /Public holiday/.test(cal.legend));
  await page.screenshot({ path: path.join(OUT, 'holidays-calendar.png') });
  await page.click('#calendar-scope-mine'); await page.waitForTimeout(300);
  const mine = await page.evaluate(() => { const b = document.querySelector('[data-cal2-day="2026-11-09"]'); return b ? b.parentElement.innerText : ''; });
  check('holidays show in Mine too', /Deepavali \(in lieu\)/.test(mine), mine);

  await page.click('[data-view-btn="gantt"]'); await page.waitForTimeout(600);
  const g = await page.evaluate(() => {
    const h = document.querySelector('#gantt-grid [title="Deepavali (in lieu) (public holiday)"]');
    const note = document.getElementById('gantt-holiday-note'), clash = document.getElementById('gantt-holiday-clash-note');
    return { head: !!h, tinted: !!h && /bg-teal-50/.test(h.className), note: !note.classList.contains('hidden'), noteTitle: note.title, clash: clash.classList.contains('hidden') ? '' : clash.textContent };
  });
  check('the Timeline header marks the holiday in teal and names it on hover', g.head && g.tinted);
  check('the legend shows the holiday shading while one is in view', g.note && /Deepavali/.test(g.noteTitle), g.noteTitle);
  check('a deadline on a public holiday is pointed out', g.clash === '1 deadline on a public holiday', g.clash);
  await page.screenshot({ path: path.join(OUT, 'holidays-timeline.png') });

  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(800);
  const load = await page.evaluate(() => {
    const grid = document.querySelector('#wip-load .grid');
    const days = grid ? [...grid.children].slice(1).map(e => e.innerText.replace(/\s+/g, ' ').trim()) : [];
    const cells = w => [...document.querySelectorAll('#wip-load button[data-wip-load-person]')].filter(x => x.getAttribute('data-wip-load-person') === w && !x.hasAttribute('aria-expanded')).map(b => b.textContent.trim());
    const row = document.querySelector('#wip-load [data-wip-load-person="Chloe Hu"][aria-expanded]');
    return { days, deane: cells('Deane Cheng'), chloe: row ? row.textContent : '' };
  });
  check('Team load has no column for the day off in lieu', load.days.length > 3 && !load.days.some(d => /Mo 9\b/.test(d)) && load.days.some(d => /Tu 10\b/.test(d)), load.days.join(','));
  check('a deadline on the holiday counts on the working day before', load.deane[1] === '1', load.deane.join(','));
  check('leave counts its working days (Fri, Tue; not the weekend or the holiday)', /Nov 6 – Nov 10 · 2 days · Trip/.test(load.chloe), load.chloe);
  check('no page errors (Nov)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ---------- Thu 24 Dec: due soon and reminders look past Christmas ----------
  ({ page, errors, ctx } = await newPage(browser, '2026-12-24T10:00:00'));
  await page.waitForTimeout(1500);
  const dec = await page.evaluate(() => {
    const card = id => { const e = document.querySelector('#board-columns [data-task-id="' + id + '"]'); return e ? e.innerText : ''; };
    const n = Object.values(window.__fb.data.notifications).filter(x => x.type === 'deadline_reminder');
    return { c3: card('t3'), c4: card('t4'), r3: n.some(x => x.taskId === 't3'), r4: n.some(x => x.taskId === 't4') };
  });
  check('a Monday deadline is due soon on Thursday when Friday is Christmas', /DUE MON/.test(dec.c3), dec.c3);
  check('...while next Thursday is not', !!dec.c4 && !/DUE /.test(dec.c4), dec.c4);
  check('the deadline reminder looks past the holiday and weekend', dec.r3);
  check('...but not further than two working days', !dec.r4);
  check('no page errors (Dec)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ---------- Thu 24 Dec, 4:30pm: Friday is Christmas, so the Friday reminder comes on Thursday ----------
  ({ page, errors, ctx } = await newPage(browser, '2026-12-24T16:30:00'));
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(11 * 60 * 1000); await page.waitForTimeout(800);
  const fri = await page.evaluate(() => Object.keys(window.__fb.data.notifications).filter(k => /^weekly-/.test(k)));
  check('the Friday meeting reminder comes on Thursday when Friday is a holiday, for the next meeting', fri.some(k => /-2026-12-28-fri$/.test(k)), fri.join(','));
  await ctx.close();

  // ---------- Thu 29 Apr 2027: Labour Day is a Saturday, so Monday 3 May is off ----------
  ({ page, errors, ctx } = await newPage(browser, '2027-04-29T10:00:00'));
  await page.click('[data-view-btn="calendar"]'); await page.waitForTimeout(600);
  const sat = await page.evaluate(() => { const b = document.querySelector('[data-cal2-day="2027-05-03"]'); return b ? b.parentElement.innerText : ''; });
  check('a Saturday holiday gives the Monday off, explained', /Labour Day \(in lieu\)/.test(sat) && /fell on a Saturday/.test(sat), sat);
  check('no page errors (2027)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ---------- Wed 10 Feb 2027, after Chinese New Year's Monday and Tuesday off: the Monday reminder moves ----------
  ({ page, errors, ctx } = await newPage(browser, '2027-02-10T10:00:00'));
  await page.clock.runFor(11 * 60 * 1000); await page.waitForTimeout(800);
  const wed = await page.evaluate(() => Object.keys(window.__fb.data.notifications).filter(k => /^weekly-/.test(k)));
  check('the Monday reminder comes on the week\'s first working day (Wed 10 Feb 2027)', wed.some(k => /-2027-02-08-mon$/.test(k)), wed.join(','));
  await ctx.close();

  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
