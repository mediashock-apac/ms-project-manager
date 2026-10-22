// app-links -- Copy link on the task, brief, project, chat and archived-task windows, and #task= / #brief= / #project= / #chat= links opening the right thing on load or when pasted into an open tab. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","cl-2026-10-06x","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: { u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['suits'] }), u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] }) },
      tasks: {
        t2: { name: 'Post assets', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t3: { name: 'Promo cut', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-27', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t4: { name: 'Old recap', project: 'SMB webinars', priority: 'Medium', status: 'Done', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
      },
      projects: { p1: { name: 'GWS recording', brief: { template: 'quick', job: 'Cut a 60s recap of the GWS session', sections: [] } }, p2: { name: 'SMB webinars', chat: [{ id: 'm1', text: 'Kickoff notes', author: 'Deane Cheng', date: '2026-10-20T02:00:00Z' }] } },
      archivedTasks: { a1: { name: 'Old recap', project: 'SMB webinars', priority: 'Medium', status: 'Done', startDate: '2026-09-01', deadline: '2026-09-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-08-01T00:00:00Z', archivedAt: '2026-09-25T00:00:00Z' } },
      activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  if (window.__asZenon) window.__fb.auth.currentUser = { uid: 'u4', displayName: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}

async function newPage(browser, when, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 1000 } }, opts || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  if (opts && opts.asZenon) await page.addInitScript(() => { window.__asZenon = true; });
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
  await page.addInitScript(() => { window.__copied = []; try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: function (t) { window.__copied.push(t); return Promise.resolve(); } }, configurable: true }); } catch (e) {} });
  await page.goto('http://pm.test/' + ((opts && opts.hash) || ''));
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

(async () => {
  const browser = await chromium.launch();
  const vis = (page, id) => page.evaluate(id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); }, id);
  const skipTours = async (page) => { for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(200); } };
  const copied = (page) => page.evaluate(() => window.__copied[window.__copied.length - 1] || '');
  // Opening from a link, on load
  {
    const { page, errors, ctx } = await newPage(browser, '2026-10-22T11:00:00', { hash: '#brief=GWS%20recording' });
    await page.waitForTimeout(400);
    check('#brief= opens that brief', await vis(page, 'brief-modal') && /Cut a 60s recap/.test(await page.textContent('#brief-modal')));
    check('the brief has Copy link, not Copy for partners', !!(await page.$('#brief-modal [data-brief-act="copy-link"]')) && !/Copy for partners/.test(await page.textContent('#brief-modal')));
    await skipTours(page); await page.click('#brief-modal [data-brief-act="copy-link"]'); await page.waitForTimeout(150);
    check('...which copies the brief link', (await copied(page)) === 'http://pm.test/#brief=GWS%20recording', await copied(page));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // Pasted into the open tab
    await page.evaluate(() => { location.hash = '#chat=SMB%20webinars'; }); await page.waitForTimeout(500);
    check('a #chat= link pasted into an open tab opens the chat', await vis(page, 'view-chat') && /Kickoff notes/.test(await page.textContent('#chat-detail')));
    await skipTours(page); await page.click('#chat-copy-link'); await page.waitForTimeout(150);
    check('the chat header copies its link', (await copied(page)) === 'http://pm.test/#chat=SMB%20webinars', await copied(page));
    await page.evaluate(() => { location.hash = '#project=SMB%20webinars'; }); await page.waitForTimeout(700);
    check('#project= opens Projects at that card', await vis(page, 'view-projects') && (await page.textContent('#projects-grid')).includes('SMB webinars'));
    await skipTours(page); await page.click('#projects-grid .project-menu-toggle[data-project="SMB webinars"]'); await page.waitForTimeout(200);
    await page.click('#projects-grid .project-copy-link[data-project="SMB webinars"]'); await page.waitForTimeout(150);
    check('the project ⋯ row copies its link', (await copied(page)) === 'http://pm.test/#project=SMB%20webinars', await copied(page));
    await page.evaluate(() => { location.hash = '#task=a1'; }); await page.waitForTimeout(700);
    check('a #task= link to an archived task opens it read-only', await vis(page, 'archived-task-modal'));
    await skipTours(page); await page.click('#archived-task-copy-link'); await page.waitForTimeout(150);
    check('the archived task copies its link', (await copied(page)) === 'http://pm.test/#task=a1', await copied(page));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await page.evaluate(() => { location.hash = '#brief=Nope'; }); await page.waitForTimeout(400);
    check('a link to something gone says so', /no longer on the board/.test(await page.textContent('#toast-container')));
    check('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, errors, ctx } = await newPage(browser, '2026-10-22T11:00:00', { hash: '#task=t3' });
    await page.waitForTimeout(400);
    check('#task= still opens the task window on load', await vis(page, 'task-modal') && (await page.inputValue('#task-name')) === 'Promo cut');
    await skipTours(page); await page.click('#task-copy-link-btn'); await page.waitForTimeout(150);
    check('the task window copies its link', (await copied(page)) === 'http://pm.test/#task=t3', await copied(page));
    check('no page errors (task link)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
