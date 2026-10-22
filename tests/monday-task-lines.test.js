// monday-task-lines -- in the Monday editor a project can carry status lines for single tasks in it (optional project line), shown under the project on the card, in Needs help and resolvable on their own. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'],
          weekly: [{ week: '2026-09-28', rows: [{ project: 'SMB webinars', status: 'client', note: 'pending assets from post' }], extra: '', leave: false, at: '2026-09-27T10:00:00Z' }] }),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'],
          weekly: [
            { week: '2026-10-05', rows: [{ project: 'SMB webinars', status: 'help', note: 'Need B-roll footage by Thursday' }, { project: 'GWS recording', status: 'ontrack', note: 'Dry run today, shoot 12 Oct' }, { project: 'GC 15 Sep SEC', status: 'done', note: 'Highlights video signed off' }], extra: '', leave: false, at: '2026-10-04T10:40:00Z' },
            { week: '2026-09-28', rows: [{ project: 'GWS recording', status: 'ontrack', note: 'Dry run today, shoot 12 Oct' }], extra: '', leave: false, at: '2026-09-27T10:40:00Z' }
          ] }),
        u3: P({ name: 'Mychelle Chen', email: 'mychelle@mediashock.com.sg', departments: ['suits', 'admin'],
          weekly: [{ week: '2026-10-05', rows: [{ project: 'Paused thing', status: 'hold', note: 'Client paused till Nov' }, { project: 'GC GWS 8-9 Oct event', status: 'client', note: 'Client to share the brief' }, { project: 'GC TH podcast series', status: 'ontrack', note: 'Client check-in later this week' }], extra: 'New biz: follow up with Fugro', leave: false, at: '2026-10-05T01:12:00Z' }] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] }),
        u5: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['admin'], leave: [{ id: 'l1', start: '2026-10-06', end: '2026-10-09', note: '' }] }),
        u7: P({ name: 'Nora NoDept', email: 'nora@mediashock.com.sg', departments: [] }),
        u6: P({ name: 'Old Leaver', email: 'old@mediashock.com.sg', departments: ['suits'], lastSeen: '2025-01-01T00:00:00Z' })
      },
      tasks: {
        t1: { name: 'Rough cut', project: 'GWS recording', priority: 'High', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-12', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', statusUpdates: [{ id: 's1', date: '2026-10-05', text: 'Waiting on speaker list from client', author: 'Mychelle Chen', at: '2026-10-05T02:00:00Z' }], checklist: [{ id: 'c1', text: 'Speaker list', due: '2026-10-08', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Post assets', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t3: { name: 'Talk deck', project: 'Autodesk LEEP talk', priority: 'Medium', status: 'Pipeline', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Arvind Kumaraguru', involved: ['Deane Cheng'], createdBy: 'Arvind Kumaraguru', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t4: { name: 'Carousel', project: 'Mediashock LinkedIn', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-07', assignee: 'Zenon Kwok Ze Yong', createdBy: 'Zenon Kwok Ze Yong', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },

        t5: { name: "Kickoff discussion", project: "Lark AI", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-06", assignee: "Zenon Kwok Ze Yong", checklist: [{ id: "k1", text: "Kickoff discussion", due: "2026-10-06", done: false }], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t6: { name: "A", project: "P1", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-08", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t7: { name: "B", project: "P2", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-08", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t8: { name: "C", project: "P3", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-09", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t9: { name: "D", project: "P4", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-10", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t10: { name: "E", project: "P5", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-11", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        tl1: { name: "Arvind's AI Experiment Post", project: "Mediashock LinkedIn", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-09", assignee: "Zenon Kwok Ze Yong", createdBy: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        tl2: { name: "Webinar recap post", project: "Mediashock LinkedIn", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-12", assignee: "Arvind Kumaraguru", createdBy: "Arvind Kumaraguru", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
      },
      __x: 0,
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); if (window.innerWidth < 768) localStorage.setItem('flowboard_mobile_desktop', '1'); } catch (e) {}
}

async function newPage(browser, when, opts) {
  const as = opts && opts.__as;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed);
  // Sign in as someone else from the seed (default Deane, an admin).
  if (as) await page.addInitScript((id) => { var p = window.__fb.data.people[id]; window.__fb.auth.currentUser = { uid: id, displayName: p.name, email: p.email, photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } }; }, as);
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
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
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
  const card = (page, who) => page.$$eval('#weekly-view section', (ss, who) => { var s = ss.find(x => x.getAttribute('data-weekly-card') === who); return s ? s.innerText.replace(/​/g, '') : ''; }, who);
  const bodyText = async (pg) => (await pg.textContent('#weekly-modal-body')).replace(/​/g, '');
  const { page, errors } = await newPage(browser, '2026-10-06T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(1100); await skipTours(page);
  await page.click('#weekly-view [data-weekly-card="Zenon Kwok Ze Yong"] [data-weekly-edit]');
  await page.waitForSelector('#weekly-modal:not(.hidden)');
  const idxOf = (re) => page.$$eval('#weekly-modal-body [data-weekly-select]', (ss, src) => { const s = ss.find(x => new RegExp(src).test(x.getAttribute('aria-label'))); return s ? s.getAttribute('data-weekly-select') : null; }, re);
  const li = await idxOf('Mediashock LinkedIn');
  check('LinkedIn is in the editor', li !== null);
  check('a project with several tasks offers "+ Status for a task"', !!(await page.$('#weekly-modal [data-weekly-tadd="' + li + '"]')));
  const singleIdx = await idxOf('Lark AI');
  check('a one-task project does not', singleIdx !== null && !(await page.$('#weekly-modal [data-weekly-tadd="' + singleIdx + '"]')));
  await page.click('#weekly-modal [data-weekly-tadd="' + li + '"]'); await page.waitForTimeout(150);
  const offered = await page.$$eval('#weekly-modal [data-weekly-tpick="' + li + '"] option', os => os.map(o => o.textContent));
  check('the picker lists the project\'s tasks, Zenon\'s first', offered.indexOf("Arvind's AI Experiment Post") === 1 && offered.indexOf('Webinar recap post') > 1, offered.join(' | '));
  await page.selectOption('#weekly-modal [data-weekly-tpick="' + li + '"]', 'tl1'); await page.waitForTimeout(150);
  check('a task line appears and its status box has focus', await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-weekly-tselect')) === li + ':0');
  check('the picker closes and the task is listed', !(await page.$('#weekly-modal [data-weekly-tpick]')) && (await bodyText(page)).includes("Arvind's AI Experiment Post"));
  await page.selectOption('#weekly-modal [data-weekly-tselect="' + li + ':0"]', 'help'); await page.waitForTimeout(150);
  check('Needs help focuses the task note', await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-weekly-tnote')) === li + ':0');
  await page.keyboard.type('Need copy approval');
  const foot = await page.textContent('#weekly-modal-foot');
  check('a task line alone counts the project as answered', /1 of \d+/.test(foot), foot);
  await page.click('#weekly-modal [data-weekly-send]'); await page.waitForTimeout(600);
  const saved = await page.evaluate(() => (window.__fb.data.people.u4.weekly || [])[0]);
  const rowsLI = saved ? saved.rows.filter(r => r.project === 'Mediashock LinkedIn') : [];
  check('saved: one task row, no project row', rowsLI.length === 1 && rowsLI[0].task === 'tl1' && rowsLI[0].taskName === "Arvind's AI Experiment Post" && rowsLI[0].status === 'help' && rowsLI[0].note === 'Need copy approval', JSON.stringify(rowsLI));
  const zc = await card(page, 'Zenon Kwok Ze Yong');
  check('card: the task line sits under its project', /Mediashock LinkedIn[\s\S]*Needs help\s*Arvind's AI Experiment Post – Need copy approval/.test(zc), zc.slice(0, 300));
  check('Needs help names the task', !!(await page.$('#weekly-view [data-weekly-resolve-task="tl1"]')) && (await page.innerText('#weekly-view')).replace(/​/g, '').includes("Mediashock LinkedIn · Arvind's AI Experiment Post"));
  await page.click('#weekly-view [data-weekly-resolve-task="tl1"]'); await page.waitForTimeout(500);
  const after = await page.evaluate(() => (window.__fb.data.people.u4.weekly || [])[0].rows.find(r => r.task === 'tl1'));
  check('Resolve marks that task line resolved', after && after.resolved === true);
  check('and it leaves Needs help', !(await page.$('#weekly-view [data-weekly-resolve-task="tl1"]')));
  await page.click('#weekly-view [data-weekly-card="Zenon Kwok Ze Yong"] [data-weekly-edit]');
  await page.waitForSelector('#weekly-modal:not(.hidden)');
  const li2 = await page.$$eval('#weekly-modal-body [data-weekly-tselect]', ss => ss.map(s => s.getAttribute('data-weekly-tselect') + '=' + s.value));
  check('reopening shows the task line with its status', li2.length === 1 && /=help$/.test(li2[0]), li2.join(','));
  await page.screenshot({ path: path.join(OUT, 'monday-task-lines-editor.png') });
  await page.click('#weekly-modal [data-weekly-tremove="' + (li2[0] || '').split('=')[0] + '"]'); await page.waitForTimeout(150);
  check('Remove drops the line', !(await page.$('#weekly-modal [data-weekly-tselect]')));
  await page.click('#weekly-modal-close');
  await page.screenshot({ path: path.join(OUT, 'monday-task-lines-card.png'), fullPage: true });
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
