// tour-welcome -- the welcome tour moves across the screen in one sweep, 7 steps, no what's-new detours.
// Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  const base = { comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z', createdBy: 'Deane Cheng', assignee: 'Deane Cheng', priority: 'Medium' };
  const T = (o) => Object.assign({}, base, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['production'] })
      },
      tasks: {
        r1: T({ name: 'Monthly report', project: 'Acme retainer', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-31', repeat: 'monthly',
          checklist: [{ id: 'a1', text: 'Draft', due: '2026-10-28', done: true, assignee: 'Zenon Kwok Ze Yong', assignees: ['Zenon Kwok Ze Yong'] }, { id: 'a2', text: 'Send', due: '2026-10-31', done: false }],
          comments: [{ id: 'c1', text: 'Sent last month', author: 'Deane Cheng', date: '2026-09-30T02:00:00Z' }],
          timeEntries: [{ minutes: 60, note: '', author: 'Deane Cheng', date: '2026-10-02T01:00:00.000Z', billable: true, overtime: false, checklistItemId: null }] }),
        w1: T({ name: 'Weekly post', project: 'Mediashock LinkedIn', status: 'In Progress', startDate: '2026-09-28', deadline: '2026-09-30', repeat: 'weekly', checklist: [] }),
        src: T({ name: 'GWS video', project: 'Google GWS', status: 'In Progress', driveLink: 'https://drive.google.com/drive/folders/gws', startDate: '2026-10-01', deadline: '2026-10-20',
          checklist: [
            { id: 's1', text: 'Brief', due: '2026-10-10', done: true, link: 'https://docs.google.com/document/d/x' },
            { id: 's2', text: 'Draft', due: '2026-10-15', done: false, assignee: 'Zenon Kwok Ze Yong', assignees: ['Zenon Kwok Ze Yong'] },
            { id: 's3', text: 'Client review', due: '2026-10-17', done: false }
          ] }),
        rv1: T({ name: 'Deck', project: 'Pitch', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', checklist: [],
          reviewRounds: [{ at: '2026-10-02T02:00:00Z', audience: 'client' }] })
      },
      archivedTasks: {
        arc1: T({ name: 'Old event recap', project: 'Events', status: 'Done', startDate: '2026-08-01', deadline: '2026-08-20', archivedAt: '2026-08-25T00:00:00Z',
          checklist: [{ id: 'o1', text: 'Photos', due: '2026-08-18', done: true }] })
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}
function extra() {
  var seen = ['board','gantt','calendar','people','projects','chat','wip','weekly','activity','archived','suggestions','updates'].map(function (v) { return 'page:' + v; });
  'abcdefghijklm'.split('').forEach(function (c) { seen.push('cl-2026-10-07' + c); });
  try { localStorage.setItem('flowboard_tours_seen', JSON.stringify(seen)); } catch (e) {}
}

async function newPage(browser, when) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed); await page.addInitScript(extra);
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

(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-10-08T10:00:00');
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
  await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="go-tour" data-start-tour="welcome">t</button>'); document.getElementById('go-tour').click(); });
  const steps = [];
  for (let k = 0; k < 15; k++) {
    await page.waitForTimeout(450);
    const info = await page.evaluate(() => {
      const c = document.getElementById('tour-card'); if (!c) return null;
      const spot = document.getElementById('tour-spot');
      const r = spot.getBoundingClientRect();
      return { title: c.querySelector('#tour-title').textContent, none: spot.classList.contains('tour-spot-none'), left: r.left, top: r.top, right: r.right, cx: r.left + r.width / 2 };
    });
    if (!info) break;
    steps.push(info);
    const next = await page.$('[data-tour-next]'); if (!next) break; await next.click();
  }
  const titles = steps.map(s => s.title);
  check('welcome tour is 7 steps', steps.length === 7, titles.join(' | '));
  check('no what\'s-new detours folded in', !titles.some(t => /more useful|Weekly updates|Ctrl K to jump/.test(t)), titles.join(' | '));
  check('starts centred, ends on the profile menu', steps[0] && steps[0].none && /all set/.test(titles[6] || ''));
  const top = steps.slice(1, 4);
  check('the top bar first: Add Task, bell, search', top.length === 3 && top.every(s => s.top < 130), top.map(s => Math.round(s.top)).join(','));
  check('…moving right to left, never back', top.every((s, i) => i === 0 || s.cx < top[i - 1].cx), top.map(s => Math.round(s.cx)).join(','));
  check('then Focus of the Day below it', steps[4] && steps[4].top > top[2].top && /begin/.test(steps[4].title));
  check('then down the sidebar', steps.slice(5).every(s => s.right < 260) && steps[6].top > steps[5].top, steps.slice(5).map(s => Math.round(s.right) + '/' + Math.round(s.top)).join(' '));
  check('one step covers teamspace and the pages together', /Your team, your view/.test(titles[5] || '') && steps[5].top < 80);
  check('the spotlight stays on screen', steps.every(s => s.none || s.left >= 0));
  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
