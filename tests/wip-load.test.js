// wip-load -- WIP Meeting for resourcing, deconflicting and project status: Team load grid, Clash /
// step-on-leave / Needs help decisions, project health, Focus of the Day off on meeting pages.
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ['welcome', 'tours-intro'], updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z', createdBy: 'Deane Cheng', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'],
          weekly: [{ week: '2026-10-12', rows: [{ project: 'Alpha', status: 'help', note: 'Need an editor' }], extra: '', leave: false, at: '2026-10-12T01:00:00Z' }] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['production'] }),
        u5: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['admin'], leave: [{ id: 'l1', start: '2026-10-14', end: '2026-10-16', note: 'Hospital' }] }),
        u7: P({ name: 'Nora NoDept', email: 'nora@mediashock.com.sg', departments: [] })
      },
      tasks: {
        a1: T({ name: 'Cut A', project: 'Alpha', assignee: 'Zenon Kwok Ze Yong', deadline: '2026-10-15',
          statusUpdates: [{ id: 's1', date: '2026-10-10', text: 'Waiting for footage', author: 'Zenon Kwok Ze Yong', at: '2026-10-10T02:00:00Z' }] }),
        a2: T({ name: 'Cut B', project: 'Beta', assignee: 'Zenon Kwok Ze Yong', deadline: '2026-10-15' }),
        a3: T({ name: 'Deck', project: 'Gamma', assignee: 'Arvind Kumaraguru', deadline: '2026-10-20',
          checklist: [{ id: 'k1', text: 'Storyboard', due: '2026-10-15', done: false, assignee: 'Zenon Kwok Ze Yong', assignees: ['Zenon Kwok Ze Yong'] }] }),
        a4: T({ name: 'Photos', project: 'Alpha', assignee: 'Chloe Hu', deadline: '2026-10-15' }),
        a5: T({ name: 'Late thing', project: 'Delta', assignee: 'Deane Cheng', deadline: '2026-10-09' }),
        a6: T({ name: 'Sat post', project: 'Gamma', assignee: 'Deane Cheng', deadline: '2026-10-17' }),
        a7: T({ name: 'Review me', project: 'Gamma', assignee: 'Arvind Kumaraguru', deadline: '2026-10-25', status: 'Review', reviewAudience: 'client', updatedAt: '2026-10-05T02:00:00Z' }),
        a8: T({ name: 'Same', project: 'Beta', assignee: 'Zenon Kwok Ze Yong', deadline: '2026-10-21',
          checklist: [{ id: 'k2', text: 'Same', due: '2026-10-21', done: false }] }),
        a9: T({ name: 'Brief pack', project: 'Epsilon', assignee: 'Deane Cheng', deadline: '2026-10-23',
          checklist: [{ id: 'k3', text: 'Shoot', due: '2026-10-14', done: false, assignee: 'Chloe Hu', assignees: ['Chloe Hu'] }] })
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
  const { page, errors } = await newPage(browser, '2026-10-13T10:00:00');
  const skip = async () => { for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(200); } };
  await skip();
  const focusShown = () => page.evaluate(() => !document.getElementById('focus-section').classList.contains('hidden'));
  check('Focus of the Day shows on the Board', await focusShown());
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(600); await skip();
  check('Focus of the Day is off on WIP Meeting', !(await focusShown()));

  // ---------- Team load ----------
  const rows = await page.$$eval('#wip-load [data-wip-load-person][aria-expanded]', els => els.map(e => e.getAttribute('data-wip-load-person')));
  check('Team load lists everyone around, heaviest first, with room at the bottom',
    rows.join('|') === 'Zenon Kwok Ze Yong|Deane Cheng|Arvind Kumaraguru|Chloe Hu|Nora NoDept', rows.join('|'));
  const cell = (who, i) => page.evaluate(([w, k]) => {
    const b = [...document.querySelectorAll('#wip-load button[data-wip-load-person]')].filter(x => x.getAttribute('data-wip-load-person') === w && !x.hasAttribute('aria-expanded'))[k];
    return b ? { text: b.textContent.trim(), cls: b.className } : null;
  }, [who, i]);
  const days = await page.evaluate(() => [...document.querySelector('#wip-load .grid').children].slice(1).map(e => e.innerText.trim()));
  check('two weeks of working days, no weekends', days.length === 10 && !days.some(d => /Sa|Su/.test(d)), days.join(','));
  const z15 = await cell('Zenon Kwok Ze Yong', 2);
  check('three things due one day (two deadlines and a step) show 3, darkest', z15 && z15.text === '3' && /bg-brand-800/.test(z15.cls), JSON.stringify(z15));
  const d16 = await cell('Deane Cheng', 3);
  check('a Saturday deadline counts on the Friday before', d16 && d16.text === '1', JSON.stringify(d16));
  const c14 = await cell('Chloe Hu', 1), c16 = await cell('Chloe Hu', 3);
  check('a day with something due while away is outlined', c14 && c14.text === '1' && /wip-load-away/.test(c14.cls) && /ring-rose/.test(c14.cls), JSON.stringify(c14));
  check('an away day with nothing due reads Away', c16 && c16.text === 'Away' && /wip-load-away/.test(c16.cls));
  const zText = await page.evaluate(() => document.querySelector('#wip-load [data-wip-load-person="Zenon Kwok Ze Yong"][aria-expanded]').textContent);
  check('a step that repeats its task is counted once', /4 due/.test(zText), zText);
  const dText = await page.evaluate(() => document.querySelector('#wip-load [data-wip-load-person="Deane Cheng"][aria-expanded]').textContent);
  check('overdue is counted beside the name', /2 due/.test(dText) && /1 overdue/.test(dText), dText);
  const aText = await page.evaluate(() => document.querySelector('#wip-load [data-wip-load-person="Arvind Kumaraguru"][aria-expanded]').textContent);
  check('a Monday help request shows on the person', /Needs help/i.test(aText), aText);
  const chText = await page.evaluate(() => document.querySelector('#wip-load [data-wip-load-person="Chloe Hu"][aria-expanded]').textContent);
  check('leave is written out on the row', /Away: Oct 14 – Oct 16 · 3 days · Hospital/.test(chText), chText);
  await page.screenshot({ path: 'mob2/wip-load.png', fullPage: true });
  await page.click('#wip-load [data-wip-load-person="Zenon Kwok Ze Yong"][aria-expanded]'); await page.waitForTimeout(300);
  const list = await page.evaluate(() => [...document.querySelectorAll('#wip-load [data-open-task]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  check('clicking a person lists what is behind the numbers', list.length === 4 && list.some(t => /Storyboard · step in Deck/.test(t)), list.join(' | '));
  check('…and each line opens its task', await page.evaluate(() => !!document.querySelector('#wip-load [data-open-task="a3"]')));

  // ---------- Needs a decision ----------
  await page.click('[data-wip-alerts-toggle]'); await page.waitForTimeout(300);
  const alerts = await page.evaluate(() => [...document.querySelectorAll('#wip-alerts [data-wip-alerts-toggle] ~ div > *')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
  check('Clash: three things due one person on one day, any priority', alerts.some(a => /^Clash Zenon Kwok Ze Yong — 3 things due Thu, Oct 15/i.test(a)), alerts.join(' | '));
  check('a step due while its person is away needs a decision', alerts.some(a => /^On leave "Shoot" is due while Chloe Hu is away/i.test(a)), alerts.join(' | '));
  check('a task due while its owner is away still does', alerts.some(a => /^On leave Photos is due while Chloe Hu is away/i.test(a)));
  check('Monday help requests are listed, right after overdue', alerts.findIndex(a => /^Needs help Arvind Kumaraguru needs help on Alpha/i.test(a)) === alerts.filter(a => /^Overdue/i.test(a)).length, alerts.map(a => a.split(' ')[0]).join(','));

  // ---------- Project health ----------
  const projs = await page.evaluate(() => [...document.querySelectorAll('#wip-projects button[data-wip-fold]')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  const order = projs.map(t => t.split(' ')[0]);
  check('troubled projects first: off track, at risk, on track', order.join(',') === 'Delta,Alpha,Gamma,Beta,Epsilon', order.join(','));
  check('Off track with the reason written out', /^Delta Off track 1 overdue/i.test(projs[0]), projs[0]);
  check('At risk: due on leave and a help request', /^Alpha At risk needs help · 1 due while the owner is away/i.test(projs[1]), projs[1]);
  check('At risk: a review waiting too long', /^Gamma At risk 1 waiting on review/i.test(projs[2]), projs[2]);
  check('On track says just that', /^Beta On track 2 open/i.test(projs[3]), projs[3]);
  const latest = await page.evaluate(() => { const d = [...document.querySelectorAll('#wip-projects div[data-wip-fold]')].find(x => x.getAttribute('data-wip-fold') === 'Alpha'); return d ? d.textContent.replace(/\s+/g, ' ').trim() : ''; });
  check('the latest status line shows under a folded project', latest === 'Latest: Waiting for footage · Zenon, 3 days ago', latest);
  await page.evaluate(() => [...document.querySelectorAll('#wip-projects div[data-wip-fold]')].find(x => x.getAttribute('data-wip-fold') === 'Alpha').click()); await page.waitForTimeout(300);
  const open = await page.evaluate(() => { const b = [...document.querySelectorAll('#wip-projects button[data-wip-fold]')].find(x => x.getAttribute('data-wip-fold') === 'Alpha'); return b ? { exp: b.getAttribute('aria-expanded'), text: b.textContent } : null; });
  check('clicking the status line opens the project; open, only the chip stays', open && open.exp === 'true' && /At risk/.test(open.text) && !/needs help/.test(open.text), JSON.stringify(open));
  await page.screenshot({ path: 'mob2/wip-health.png', fullPage: true });

  // ---------- Monday Meeting has no Focus strip either ----------
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(500); await skip();
  check('Focus of the Day is off on Monday Meeting', !(await focusShown()));
  await page.click('[data-view-btn="board"]'); await page.waitForTimeout(400);
  check('…and back on the Board', await focusShown());

  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
