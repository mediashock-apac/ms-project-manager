// leave-repeat -- regular days off stored once ("every Monday") and worked out into real days
// everywhere. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();

const TOURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'monday-meeting.test.js'), 'utf8').match(/toursSeen: (\[[^\]]*\])/)[1]);
TOURS.push(...['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates'].map(v => 'page:' + v));

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(tours) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: tours, updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['production'],
          leave: [{ id: 'r1', start: '2026-10-05', end: '2026-10-05', note: 'Part-time', repeat: 'weekly', until: '2026-11-30' }] })
      },
      tasks: {
        t1: { name: 'Deck', project: 'Acme', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Chloe Hu', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}

async function skipTours(page) {
  for (let i = 0; i < 6; i++) {
    const b = await page.$('[data-tour-skip]');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(250);
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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
    const f = path.join(REPO, decodeURIComponent(p));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 });
  await page.waitForTimeout(1500); await skipTours(page);
  const go = async (v) => { await page.click('[data-view-btn="' + v + '"]'); await page.waitForTimeout(900); await skipTours(page); };

  // People card: one entry, not one per week
  await go('people');
  const chloe = await page.evaluate(() => { const c = [...document.querySelectorAll('#people-grid > *')].find(x => /Chloe Hu/.test(x.textContent)); return c ? c.innerText : ''; });
  check('People card shows the repeat as one entry', /Every Mon until Nov 30/.test(chloe) && (chloe.match(/Every Mon/g) || []).length === 1, chloe.slice(-200));

  // WIP Away: one row, dated by the next one
  await go('wip');
  const away = await page.textContent('#wip-away-side');
  check('WIP Away: one row with the next date', /Every Mon until Nov 30 · next Oct 12/.test(away) && (away.match(/Every Mon/g) || []).length === 1, away);

  // Monday Meeting card
  await go('weekly');
  const mcard = await page.innerText('[data-weekly-card="Chloe Hu"]');
  check('Monday card: one Away line for the repeat, marked this week', /Away\s*Every Mon until Nov 30 · Part-time This week/.test(mcard) && (mcard.match(/Every Mon/g) || []).length === 1 && !/next Oct 5/.test(mcard), mcard);

  // Calendar works out the real days
  await go('calendar');
  const cal = await page.textContent('#view-calendar');
  check('Calendar shows the actual Monday off', /Chloe Hu away/.test(cal), cal.slice(0, 200));

  // Adding a repeating day off from the form
  await go('people');
  await page.click('.leave-add-toggle[data-leave-name="Deane Cheng"]'); await page.waitForTimeout(300);
  check('"until" is hidden until a repeat is picked', !(await page.$('#people-grid .leave-until')));
  await page.fill('#people-grid .leave-start', '2026-10-09');
  await page.fill('#people-grid .leave-end', '2026-10-09');
  await page.selectOption('#people-grid .leave-repeat', 'weekly'); await page.waitForTimeout(300);
  check('picking a repeat shows "until" and keeps the dates', !!(await page.$('#people-grid .leave-until')) && (await page.inputValue('#people-grid .leave-start')) === '2026-10-09');
  await page.fill('#people-grid .leave-until', '2026-10-30');
  await page.click('#people-grid .leave-save'); await page.waitForTimeout(600);
  const saved = await page.evaluate(() => window.__fb.data.people.u1.leave);
  check('saved once, as a repeat', Array.isArray(saved) && saved.length === 1 && saved[0].repeat === 'weekly' && saved[0].until === '2026-10-30' && saved[0].start === '2026-10-09', JSON.stringify(saved));
  const deane = await page.evaluate(() => { const c = [...document.querySelectorAll('#people-grid > *')].find(x => /Deane Cheng/.test(x.textContent)); return c ? c.innerText : ''; });
  check('shows as "Every Fri until Oct 30"', /Every Fri until Oct 30/.test(deane), deane.slice(-200));

  // A repeat can't be longer than the gap between repeats
  await page.click('.leave-add-toggle[data-leave-name="Deane Cheng"]'); await page.waitForTimeout(300);
  await page.fill('#people-grid .leave-start', '2026-10-12');
  await page.fill('#people-grid .leave-end', '2026-10-20');
  await page.selectOption('#people-grid .leave-repeat', 'weekly'); await page.waitForTimeout(300);
  await page.click('#people-grid .leave-save'); await page.waitForTimeout(400);
  check('a repeat longer than its gap is refused', (await page.evaluate(() => window.__fb.data.people.u1.leave.length)) === 1);
  await page.screenshot({ path: path.join(OUT, 'leave-repeat.png') });

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
