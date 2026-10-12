// leave-step-shift -- leave shown in the owner picker, and step dates following a moved deadline.
// Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed() {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  const base = { comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z', createdBy: 'Deane Cheng', priority: 'Medium', project: 'Google GWS', status: 'In Progress' };
  const T = (o) => Object.assign({}, base, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['production'], leave: [{ id: 'l1', start: '2026-10-14', end: '2026-10-16', note: 'Bali' }] }),
        u3: P({ name: 'Kan Lee', email: 'kan@mediashock.com.sg', departments: ['copy'], leave: [{ id: 'l2', start: '2026-12-01', end: '2026-12-05', note: '' }] }),
        u4: P({ name: 'Aqila Ramadhani', email: 'aqila@mediashock.com.sg', departments: ['production'], leave: [{ id: 'l3', start: '2026-10-01', end: '2026-10-05', note: '' }] })
      },
      tasks: {
        t1: T({ name: 'GWS video', assignee: 'Zenon Kwok Ze Yong', startDate: '2026-10-12', deadline: '2026-10-20',
          checklist: [
            { id: 's1', text: 'Brief', due: '2026-10-13', done: true },
            { id: 's2', text: 'Draft', due: '2026-10-15', done: false },
            { id: 's3', text: 'Client review', due: '2026-10-16', done: false },
            { id: 's4', text: 'Music', dueTbd: true, done: false },
            { id: 's5', text: 'Export', done: false }
          ] }),
        t2: T({ name: 'No steps', assignee: 'Deane Cheng', startDate: '2026-10-12', deadline: '2026-10-22', checklist: [] })
      },
      archivedTasks: {}, projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
  var seen = ['board','gantt','calendar','people','projects','chat','wip','weekly','activity','archived','suggestions','updates'].map(function (v) { return 'page:' + v; });
  'abcdefghijklm'.split('').forEach(function (c) { seen.push('cl-2026-10-07' + c); });
  try { localStorage.setItem('flowboard_tours_seen', JSON.stringify(seen)); } catch (e) {}
}

async function newPage(browser, when, viewport) {
  const ctx = await browser.newContext(Object.assign({ viewport: viewport || { width: 1440, height: 1000 } }, viewport && viewport.width < 768 ? { hasTouch: true, isMobile: true } : {}));
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
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000, state: 'attached' });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
  return { page, ctx, errors };
}

(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-10-12T10:00:00');
  const data = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__fb.data)));
  const openTask = async (id) => { await page.evaluate((i) => document.querySelector('[data-open-task="' + i + '"]').click(), id); await page.waitForTimeout(400); };
  const save = async () => { await page.click('#task-save-btn'); await page.waitForTimeout(500); };
  const setDeadline = (v) => page.evaluate((val) => { var el = document.getElementById('task-deadline'); el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
  const blurDeadline = () => page.evaluate(() => document.getElementById('task-deadline').dispatchEvent(new Event('blur')));
  const trigger = () => page.evaluate(() => document.getElementById('task-assignee').parentElement.querySelector('button[aria-haspopup]').textContent);
  const menuRows = () => page.evaluate(() => {
    var m = document.getElementById('task-assignee').parentElement.querySelector('[role=listbox]');
    return [...m.querySelectorAll('[role=option]')].map(o => ({ text: o.textContent, tag: (o.querySelector('[data-away-tag]') || {}).textContent || '' }));
  });
  const toasts = () => page.textContent('#toast-container');
  const clickToast = (re) => page.evaluate((src) => {
    var r = new RegExp(src);
    var t = [...document.querySelectorAll('#toast-container > div')].filter(function (d) { return r.test(d.textContent); }).pop();
    if (t && t.querySelector('.toast-action')) { t.querySelector('.toast-action').click(); return true; }
    return false;
  }, re);
  const clearToasts = () => page.evaluate(() => { document.getElementById('toast-container').innerHTML = ''; });

  // ---------- A. Leave in the owner picker ----------
  await openTask('t1');
  check('the chosen owner shows their leave on the field', /Away Oct 14–16/.test(await trigger()), await trigger());
  let rows = await menuRows();
  const row = (n) => rows.find(r => r.text.indexOf(n) === 0) || { tag: '' };
  check('the list tags someone away during the task', row('Zenon').tag === 'Away Oct 14–16', JSON.stringify(row('Zenon')));
  check('leave outside the task dates is not shown', row('Kan Lee').tag === '', row('Kan Lee').tag);
  check('leave that has ended is not shown', row('Aqila').tag === '', row('Aqila').tag);
  check('someone with no leave has no tag', row('Deane').tag === '');
  check('the tag says why on hover, incl. the note',
    await page.evaluate(() => { var s = document.querySelector('[data-away-tag]'); return s && /Time off: Oct 14–16 \(Bali\)/.test(s.parentElement.title); }));
  await setDeadline('2026-10-13'); await page.waitForTimeout(100);
  rows = await menuRows();
  check('moving the deadline before the leave drops the tag', row('Zenon').tag === '' && !/Away/.test(await trigger()), await trigger());
  await setDeadline('2026-12-03'); await page.waitForTimeout(100);
  rows = await menuRows();
  check('moving it into later leave tags that person', row('Kan Lee').tag === 'Away Dec 1–5' && row('Zenon').tag === 'Away Oct 14–16', JSON.stringify(rows.map(r => r.tag)));
  await page.evaluate(() => { var t = document.getElementById('task-deadline-tbd'); t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); });
  rows = await menuRows();
  check('with no deadline, leave in the next two weeks shows', row('Zenon').tag === 'Away Oct 14–16' && row('Kan Lee').tag === '');
  await page.screenshot({ path: 'mob2/owner-away.png', clip: { x: 200, y: 0, width: 1040, height: 420 } });
  await page.click('#task-cancel-btn'); await page.waitForTimeout(200);
  { const c = await page.$('#confirm-ok-btn, [data-confirm-ok]'); if (c) await c.click(); await page.waitForTimeout(300); }

  // ---------- B. Step dates follow the deadline ----------
  await clearToasts();
  await openTask('t1');
  await setDeadline('2026-10-23');
  await page.waitForTimeout(1500);
  check('moving the deadline offers to move the open dated steps', /Deadline moved 3 days later\. Move the 2 open steps too\?/.test(await toasts()), (await toasts()).slice(0, 120));
  check('nothing moves until asked', /Due Oct 15|Oct 15/.test(await page.textContent('#task-checklist-editor')));
  check('Move steps is offered', await clickToast('Move the 2 open steps'));
  await page.waitForTimeout(200);
  check('then confirms with Undo', /Moved 2 steps 3 days later/.test(await toasts()));
  await save();
  let cl = (await data()).tasks.t1.checklist;
  const due = (id) => (cl.find(i => i.id === id) || {}).due;
  check('saved: the deadline moved', (await data()).tasks.t1.deadline === '2026-10-23');
  check('a step landing on a Sunday moves back to Friday', due('s2') === '2026-10-16', due('s2'));
  check('a Friday step moves 3 days to Monday', due('s3') === '2026-10-19', due('s3'));
  check('a done step keeps its date', due('s1') === '2026-10-13', due('s1'));
  check('TBD and undated steps stay as they were', !due('s4') && cl.find(i => i.id === 's4').dueTbd === true && !due('s5'));

  // Undo puts the dates back
  await clearToasts();
  await openTask('t1');
  await setDeadline('2026-10-30');
  await blurDeadline(); await page.waitForTimeout(100);
  check('leaving the field offers at once (no wait)', /Deadline moved 7 days later/.test(await toasts()), (await toasts()).slice(0, 80));
  await clickToast('Move the 2'); await page.waitForTimeout(100);
  check('Undo is on the confirmation', await clickToast('Moved 2 steps'));
  await page.waitForTimeout(100);
  await save();
  cl = (await data()).tasks.t1.checklist;
  check('Undo restores the step dates', due('s2') === '2026-10-16' && due('s3') === '2026-10-19', due('s2') + ' ' + due('s3'));

  // A year still being typed is ignored; the real date is compared with the original
  await clearToasts();
  await openTask('t1');
  await setDeadline('0002-10-31'); await blurDeadline(); await page.waitForTimeout(100);
  check('a half-typed year offers nothing', !/Deadline moved/.test(await toasts()));
  await setDeadline('2026-10-28'); await blurDeadline(); await page.waitForTimeout(100);
  check('the finished date is measured from the original deadline', /Deadline moved 2 days earlier/.test(await toasts()), (await toasts()).slice(0, 80));
  await page.click('#task-cancel-btn'); await page.waitForTimeout(200);
  { const c = await page.$('#confirm-ok-btn, [data-confirm-ok]'); if (c) await c.click(); await page.waitForTimeout(300); }

  // No offer when there's nothing to move
  await clearToasts();
  await openTask('t2');
  await setDeadline('2026-10-29'); await blurDeadline(); await page.waitForTimeout(100);
  check('no offer for a task with no dated steps', !/Deadline moved/.test(await toasts()));
  await page.click('#task-cancel-btn'); await page.waitForTimeout(200);
  { const c = await page.$('#confirm-ok-btn, [data-confirm-ok]'); if (c) await c.click(); await page.waitForTimeout(300); }

  // A teammate moving the deadline live is not this person's move to follow up
  await clearToasts();
  await openTask('t1');
  await page.evaluate(() => window.__fb.remote(function (d) { d.tasks.t1.deadline = '2026-11-02'; }));
  await page.waitForTimeout(1600);
  check("someone else's live change shows but offers nothing", (await page.inputValue('#task-deadline')) === '2026-11-02' && !/Deadline moved/.test(await toasts()), await page.inputValue('#task-deadline'));
  await page.click('#task-cancel-btn'); await page.waitForTimeout(300);

  // ---------- Phone quick add ----------
  const ph = await newPage(browser, '2026-10-12T10:00:00', { width: 390, height: 844 });
  const opened = await ph.page.evaluate(() => { var b = document.querySelector('[data-m-act="quick-add"], [data-m-quick-add], .m-fab'); if (b) { b.click(); return true; } return false; });
  await ph.page.waitForTimeout(600);
  if (opened && await ph.page.$('[name="owner"]')) {
    const opt = () => ph.page.evaluate(() => [...document.querySelectorAll('[name="owner"] option')].map(o => o.value + '=' + o.textContent));
    let o = await opt();
    check('phone owner list tags leave in the next two weeks', o.includes('Zenon Kwok Ze Yong=Zenon Kwok Ze Yong · Away Oct 14–16'), o.join(' | '));
    await ph.page.evaluate(() => { var d = document.querySelector('[name="deadline"]'); d.value = '2026-12-03'; d.dispatchEvent(new Event('change', { bubbles: true })); });
    o = await opt();
    check('and follows the deadline picked', o.includes('Kan Lee=Kan Lee · Away Dec 1–5'), o.join(' | '));
    check('the value stays the plain name', (await ph.page.evaluate(() => { var s = document.querySelector('[name="owner"]'); s.value = 'Kan Lee'; return s.value; })) === 'Kan Lee');
  } else check('phone quick add opens', false, 'no quick-add button found');

  results.forEach(r => console.log(r));
  console.log('errors', JSON.stringify(errors.concat(ph.errors)));
  await browser.close();
})();
