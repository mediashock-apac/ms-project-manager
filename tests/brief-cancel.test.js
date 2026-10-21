// brief-cancel -- Cancel, X and Escape on a brief being written ask "Are you sure you want to cancel?" when something would be lost, and close straight away when nothing would. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
      people: { u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['suits'] }) },
      tasks: {
        t1: { name: 'Rough cut', project: 'GWS recording', priority: 'High', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Post assets', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      projects: { p1: { name: 'GWS recording', brief: { template: 'quick', job: 'Cut a 60s recap of the GWS session', sections: [] } } },
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
  const { page, errors, ctx } = await newPage(browser, '2026-10-21T11:00:00');
  const R = await page.evaluate(async () => {
    const R = {};
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    const open = n => { const b = document.createElement('button'); b.setAttribute('data-open-brief', n); document.body.appendChild(b); b.click(); b.remove(); };
    const q = s => document.querySelector('#brief-modal-card ' + s);
    const cancelBtn = () => q('button[data-brief-act="close"]:not([aria-label])');
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    open('SMB webinars'); await wait(200);
    cancelBtn().click(); await wait(200);
    R.untouched = !vis('brief-modal') && !vis('confirm-modal');
    open('SMB webinars'); await wait(200);
    q('#brief-job').value = 'Webinar promo'; cancelBtn().click(); await wait(200);
    R.asked = vis('confirm-modal'); R.title = document.getElementById('confirm-title').textContent;
    R.onTop = !!document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('#confirm-modal');
    document.getElementById('confirm-cancel-btn').click(); await wait(200);
    R.kept = vis('brief-modal') && q('#brief-job').value === 'Webinar promo' && !vis('confirm-modal');
    q('button[data-brief-act="close"][aria-label]').click(); await wait(200);
    R.xAsks = vis('confirm-modal'); document.getElementById('confirm-ok-btn').click(); await wait(200);
    R.discarded = !vis('brief-modal') && !vis('confirm-modal') && document.getElementById('confirm-modal').style.zIndex === '';
    open('SMB webinars'); await wait(200);
    [...document.querySelectorAll('#brief-modal-card [data-brief-tpl]')].find(b => b.getAttribute('aria-pressed') === 'false').click(); await wait(200);
    cancelBtn().click(); await wait(200);
    R.templateOnly = !vis('brief-modal') && !vis('confirm-modal');
    open('SMB webinars'); await wait(200);
    q('[data-brief-add]').click(); await wait(200); cancelBtn().click(); await wait(200);
    R.sectionAsks = vis('confirm-modal'); document.getElementById('confirm-ok-btn').click(); await wait(200);
    open('SMB webinars'); await wait(200); q('#brief-job').value = 'X';
    esc(); await wait(150); R.escAsks = vis('confirm-modal');
    esc(); await wait(150); R.escKeeps = !vis('confirm-modal') && vis('brief-modal') && q('#brief-job').value === 'X';
    esc(); await wait(150); document.getElementById('confirm-ok-btn').click(); await wait(150);
    open('GWS recording'); await wait(200);
    q('[data-brief-act="edit"]').click(); await wait(200); q('[data-brief-act="cancel-edit"]').click(); await wait(200);
    R.editNoChange = !vis('confirm-modal') && !!q('[data-brief-act="edit"]');
    q('[data-brief-act="edit"]').click(); await wait(200); q('#brief-job').value = 'Changed';
    q('[data-brief-act="cancel-edit"]').click(); await wait(200); R.editAsks = vis('confirm-modal');
    document.getElementById('confirm-ok-btn').click(); await wait(200);
    R.editDiscarded = !!q('[data-brief-act="edit"]') && document.getElementById('brief-modal-card').textContent.includes('Cut a 60s recap');
    return R;
  });
  check('an untouched new brief closes without asking', R.untouched);
  check('Cancel after typing asks first', R.asked && R.title === 'Are you sure you want to cancel?', R.title);
  check('the question shows above the brief window', R.onTop);
  check('Keep editing keeps what was typed', R.kept);
  check('the X asks too, and Discard closes', R.xAsks && R.discarded);
  check('switching template alone is not a change', R.templateOnly);
  check('adding a section counts as a change', R.sectionAsks);
  check('Escape asks; a second Escape keeps editing', R.escAsks && R.escKeeps);
  check('editing a saved brief with no change goes straight back', R.editNoChange);
  check('discarding an edit returns to the saved brief', R.editAsks && R.editDiscarded);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
