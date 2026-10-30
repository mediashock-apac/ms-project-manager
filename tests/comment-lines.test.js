// comment-lines -- a task comment typed over several lines keeps its line breaks and indentation once posted (Kan, 2026-10-26). Browser test against index.html with Firebase stubbed (see tests/README.md).
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
      people: { u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['suits'] }) },
      tasks: {
        t1: { name: 'Rough cut', project: 'GWS recording', priority: 'High', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [{ id: 's1', text: 'Rough cut review', done: false, due: '2026-10-25' }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Post assets', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [{ id: 'c1', text: 'Line one\nLine two\n  - indented', date: '2026-10-20T03:00:00Z', author: 'Deane Cheng' }], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      projects: { p1: { name: 'GWS recording', brief: { template: 'quick', job: 'Cut a 60s recap of the GWS session', sections: [{ id: 'a', type: 'dates', rows: [{ a: 'Rough cut review', b: '2026-10-25' }] }], createdBy: 'Deane Cheng', updatedBy: 'Deane Cheng', updatedAt: '2026-10-20T00:00:00Z' } } },
      activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
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
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

(async () => {
  const browser = await chromium.launch();
  const { page, errors, ctx } = await newPage(browser, '2026-10-22T11:00:00');
  const R = await page.evaluate(async () => {
    const R = {};
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const open = id => { const b = document.createElement('button'); b.setAttribute('data-open-task', id); document.body.appendChild(b); b.click(); b.remove(); };
    const p = () => Array.from(document.querySelectorAll('#task-comments-log p.text-sm'));
    open('t2'); await wait(300);
    const old = p().find(e => /Line one/.test(e.textContent));
    R.oldWs = old ? getComputedStyle(old).whiteSpace : 'none';
    R.oldLines = old ? Math.round(old.getBoundingClientRect().height / parseFloat(getComputedStyle(old).lineHeight)) : 0;
    const input = document.getElementById('task-comment-input');
    input.value = 'First line\n\nThird line'; input.dispatchEvent(new Event('input'));
    document.getElementById('task-comment-add-btn').click(); await wait(500);
    const stored = (window.__fb.data.tasks.t2.comments || []).map(c => c.text);
    R.stored = stored.includes('First line\n\nThird line');
    const fresh = p().find(e => /First line/.test(e.textContent));
    R.newLines = fresh ? Math.round(fresh.getBoundingClientRect().height / parseFloat(getComputedStyle(fresh).lineHeight)) : 0;
    return R;
  });
  await page.screenshot({ path: path.join(OUT, 'comment-lines.png') });
  check('comments keep line breaks and indentation', R.oldWs === 'pre-wrap', R.oldWs);
  check('a saved three-line comment shows on three lines', R.oldLines === 3, String(R.oldLines));
  check('a new comment is saved with its line breaks', R.stored);
  check('a new comment with a blank line shows on three lines', R.newLines === 3, String(R.newLines));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
