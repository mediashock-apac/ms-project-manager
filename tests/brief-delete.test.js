// brief-delete -- anyone can delete a saved brief from its Edit view, after "Delete this brief?"; the project goes back to "+ Brief" and checklist steps the brief added stay. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
        t2: { name: 'Post assets', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
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
    const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    const open = n => { const b = document.createElement('button'); b.setAttribute('data-open-brief', n); document.body.appendChild(b); b.click(); b.remove(); };
    const q = s => document.querySelector('#brief-modal-card ' + s);
    open('SMB webinars'); await wait(200);
    R.noDeleteOnNew = !q('[data-brief-act="delete"]');
    q('button[data-brief-act="close"]:not([aria-label])').click(); await wait(200);
    open('GWS recording'); await wait(200);
    R.noDeleteWhileReading = !q('[data-brief-act="delete"]');
    q('[data-brief-act="edit"]').click(); await wait(200);
    R.deleteWhileEditing = !!q('[data-brief-act="delete"]');
    return R;
  });
  await page.screenshot({ path: path.join(OUT, 'brief-delete-footer.png') });
  const R2 = await page.evaluate(async () => {
    const R = {};
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    const q = s => document.querySelector('#brief-modal-card ' + s);
    q('[data-brief-act="delete"]').click(); await wait(200);
    R.asked = vis('confirm-modal'); R.title = document.getElementById('confirm-title').textContent;
    R.okLabel = document.getElementById('confirm-ok-btn').textContent;
    R.onTop = !!document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('#confirm-modal');
    return R;
  });
  await page.screenshot({ path: path.join(OUT, 'brief-delete-confirm.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'brief-delete-confirm-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  const R3 = await page.evaluate(async () => {
    const R = {};
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    const q = s => document.querySelector('#brief-modal-card ' + s);
    document.getElementById('confirm-cancel-btn').click(); await wait(200);
    R.cancelKeeps = !vis('confirm-modal') && vis('brief-modal') && !!(window.__fb.data.projects.p1 || {}).brief;
    q('[data-brief-act="delete"]').click(); await wait(200);
    document.getElementById('confirm-ok-btn').click(); await wait(400);
    R.gone = !('brief' in window.__fb.data.projects.p1);
    R.closed = !vis('brief-modal') && !vis('confirm-modal') && document.getElementById('confirm-modal').style.zIndex === '';
    R.stepsKept = (window.__fb.data.tasks.t1.checklist || []).length === 1;
    R.logged = Object.values(window.__fb.data.activity).some(a => /Deleted the brief for GWS recording/.test(a.text || a.message || a.description || JSON.stringify(a)));
    const b = document.createElement('button'); b.setAttribute('data-open-brief', 'GWS recording'); document.body.appendChild(b); b.click(); b.remove(); await wait(200);
    R.reopensBlank = vis('brief-modal') && !!q('#brief-job') && q('#brief-job').value === '' && !!q('[data-brief-tpl]');
    return R;
  });
  check('a new brief has no Delete button', R.noDeleteOnNew);
  check('reading a brief shows no Delete button', R.noDeleteWhileReading);
  check('editing a saved brief shows Delete brief', R.deleteWhileEditing);
  check('Delete asks first', R2.asked && R2.title === 'Delete this brief?' && R2.okLabel === 'Delete brief', R2.title + ' / ' + R2.okLabel);
  check('the question shows above the brief window', R2.onTop);
  check('Cancel keeps the brief', R3.cancelKeeps);
  check('confirming removes the brief from the project', R3.gone);
  check('the window closes and the confirm resets', R3.closed);
  check('checklist steps the brief added stay', R3.stepsKept);
  check('the delete is in the activity log', R3.logged);
  check('the project offers a new brief afterwards', R3.reopensBlank);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
