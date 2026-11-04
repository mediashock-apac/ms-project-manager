// my-tasks -- My Tasks lists everything of yours (owned, involved, steps on others' tasks) grouped by when it's due. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();   // tests/.out when run by run.mjs
// Same seen-tours list as focus-steps, so no what's-new tour covers the page.
const tours = JSON.parse(fs.readFileSync(path.join(__dirname, 'focus-steps.test.js'), 'utf8').match(/toursSeen: (\[[^\]]*\])/)[1]);

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(tours) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: tours, updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ priority: 'Medium', status: 'In Progress', startDate: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-10-01T00:00:00Z' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'] }),
        u3: P({ name: 'Kan Lim', email: 'kan@mediashock.com.sg', departments: ['copy'] })
      },
      tasks: {
        t1: T({ name: 'Late edit', project: '[Lark] Launch film', priority: 'High', deadline: '2026-11-02', checklist: [{ id: 'a1', text: 'Storyboard', due: '2026-11-01', done: false, assignees: ['Kan Lim'], assignee: 'Kan Lim' }, { id: 'a2', text: 'Rough cut', due: '2026-11-08', done: false }] }),
        t2: T({ name: 'Deck for today', project: 'Pitch', assignee: 'Arvind Kumaraguru', createdBy: 'Arvind Kumaraguru', involved: ['Deane Cheng'], deadline: '2026-11-04' }),
        t3: T({ name: 'Tomorrow thing', project: 'Pitch', deadline: '2026-11-05' }),
        t4: T({ name: 'This week thing', project: 'Pitch', deadline: '2026-11-09' }),
        t5: T({ name: 'Far thing', project: 'Pitch', deadline: '2026-11-30' }),
        t6: T({ name: 'Waiting on client', project: 'Pitch', status: 'Review', reviewAudience: 'client', reviewRounds: [{ at: '2026-10-31T00:00:00Z', audience: 'client' }], deadline: '2026-11-01' }),
        t7: T({ name: 'Someday task', project: 'Pitch' }),
        t8: T({ name: 'Arvinds video', project: 'Other', assignee: 'Arvind Kumaraguru', createdBy: 'Arvind Kumaraguru', deadline: '2026-11-20', checklist: [{ id: 'b1', text: 'Colour grade', due: '2026-11-06', done: false, assignees: ['Deane Cheng'], assignee: 'Deane Cheng' }, { id: 'b2', text: 'Old step', due: '2026-10-30', done: true, assignees: ['Deane Cheng'], assignee: 'Deane Cheng' }] }),
        t9: T({ name: 'Finished task', project: 'Pitch', status: 'Done', deadline: '2026-11-03' }),
        t10: T({ name: 'Not mine at all', project: 'Other', assignee: 'Kan Lim', createdBy: 'Kan Lim', deadline: '2026-11-04' })
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  // Standing in Copy/Production: My Tasks must still list all of Deane's work.
  try { localStorage.setItem('flowboard_dept_prompted', '1'); localStorage.setItem('flowboard_teamspace', 'copy'); } catch (e) {}
}

async function newPage(browser, when, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 1000 } }, opts || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed, tours);
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

(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-11-04T10:00:00');
  await skipTours(page);

  const firstNav = await page.$eval('#sidebar-nav .view-toggle-btn', b => b.getAttribute('data-view-btn'));
  check('My Tasks is the first item in the sidebar', firstNav === 'mytasks', firstNav);

  await page.click('[data-view-btn="mytasks"]');
  await page.waitForTimeout(600);
  check('existing teammates get the page tour on first visit', (await page.$eval('body', b => b.innerText)).indexOf('Everything of yours, by date') !== -1);
  await skipTours(page);

  check('page title reads My Tasks', (await page.textContent('#current-view-title')) === 'My Tasks');
  check('Focus of the Day is hidden here', await page.$eval('#focus-section', el => el.classList.contains('hidden')));
  check('priority/project/people/sort filters are hidden', await page.$$eval('#filter-priority-wrap, #filter-project-wrap, #filter-people-wrap, #sort-by-wrap', els => els.length === 4 && els.every(e => e.classList.contains('hidden'))));
  check('search box works here', !(await page.$eval('#filter-search', el => el.disabled)));

  const groups = await page.$$eval('[data-mytasks-group]', ss => ss.map(s => ({ g: s.getAttribute('data-mytasks-group'), ids: Array.from(s.querySelectorAll('[data-open-task]')).map(b => b.getAttribute('data-open-task')), text: s.innerText })));
  const G = k => groups.find(x => x.g === k) || { ids: [], text: '' };
  check('groups in order', groups.map(x => x.g).join(',') === 'late,today,tomorrow,week,later,review,none', groups.map(x => x.g).join(','));
  check('overdue holds the late task', G('late').ids.join() === 't1', G('late').ids.join());
  check('today holds the task you are involved in', G('today').ids.join() === 't2', G('today').ids.join());
  check('next 7 days: the step on someone else\'s task, then the task due Monday', G('week').ids.join() === 't8,t4', G('week').ids.join());
  check('tomorrow, later, review and no-date groups', G('tomorrow').ids.join() === 't3' && G('later').ids.join() === 't5' && G('review').ids.join() === 't6' && G('none').ids.join() === 't7');
  const all = groups.flatMap(x => x.ids);
  check('done tasks, other people\'s tasks and done steps are left out', all.indexOf('t9') === -1 && all.indexOf('t10') === -1 && all.filter(i => i === 't8').length === 1, all.join(','));
  check('teamspace is ignored (Copy/Production picked, all 8 still listed)', all.length === 8, String(all.length));
  check('overdue row says how late', /2d late/.test(G('late').text), G('late').text);
  check('next step shown, flagged late, with who is on it', /Next: Storyboard/.test(G('late').text) && /Nov 1 · late/.test(G('late').text) && /Kan Lim/.test(G('late').text), G('late').text);
  check('involved row names the owner', /Owner: Arvind Kumaraguru/.test(G('today').text), G('today').text);
  check('step row says whose task it sits in', /Colour grade/.test(G('week').text) && /Step in Arvinds video/.test(G('week').text), G('week').text);
  check('review row shows the review label', /Client review/.test(G('review').text), G('review').text);

  await page.screenshot({ path: path.join(OUT, 'my-tasks.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'my-tasks-dark.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  await page.fill('#filter-search', 'colour');
  await page.waitForTimeout(500);
  const afterSearch = await page.$$eval('#mytasks-list [data-open-task]', bs => bs.map(b => b.getAttribute('data-open-task')));
  check('search matches step text', afterSearch.join() === 't8', afterSearch.join());
  await page.fill('#filter-search', 'zzznothing');
  await page.waitForTimeout(500);
  check('no match says so', /Nothing of yours matches/.test(await page.textContent('#mytasks-list')));
  await page.fill('#filter-search', '');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__fb.remote(d => { d.tasks.t11 = { name: 'Fresh from a teammate', project: 'Pitch', priority: 'Low', status: 'Pipeline', assignee: 'Deane Cheng', createdBy: 'Kan Lim', deadline: '2026-11-04', checklist: [], comments: [], timeEntries: [], createdAt: '2026-11-04T01:00:00Z' }; }));
  await page.waitForTimeout(600);
  const today2 = await page.$$eval('[data-mytasks-group="today"] [data-open-task]', bs => bs.map(b => b.getAttribute('data-open-task')));
  check('a task assigned live appears without a reload', today2.indexOf('t11') !== -1, today2.join());

  await page.click('[data-mytasks-group="tomorrow"] [data-open-task="t3"]');
  await page.waitForTimeout(500);
  check('clicking a row opens the task', await page.$eval('#task-modal', el => !el.classList.contains('hidden')));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
