// brief-steps-default -- a brief's key dates go into the checklist by default for Suits (ticked, onto the project's open task due soonest); others never see or trigger it. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
      projects: { p1: { name: 'GWS recording', brief: { template: 'quick', job: 'Cut a 60s recap of the GWS session', sections: [] } } },
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
  await page.goto('http://pm.test/');
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

(async () => {
  const browser = await chromium.launch();
  async function writeBrief(page) {
    return page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const b = document.createElement('button'); b.setAttribute('data-open-brief', 'SMB webinars'); document.body.appendChild(b); b.click(); b.remove(); await wait(250);
      const q = s => document.querySelector('#brief-modal-card ' + s);
      const tpl = q('[data-brief-tpl="quick"]'); if (tpl && tpl.getAttribute('aria-pressed') !== 'true') { tpl.click(); await wait(200); }
      const box = q('#brief-add-steps'), sel = q('#brief-steps-task');
      const R = { box: !!box, ticked: !!box && box.checked, task: sel ? sel.value : null, options: sel ? [...sel.options].map(o => o.textContent) : [] };
      q('#brief-job').value = 'Webinar promo';
      const sec = [...document.querySelectorAll('#brief-modal-card [data-brief-sec]')].find(s => s.querySelector('input[data-k="b"][type="date"]'));
      sec.querySelector('input[data-k="a"]').value = 'Client review';
      sec.querySelector('input[data-k="b"]').value = '2026-10-26';
      q('button[data-brief-act="save"]').click(); await wait(700);
      return R;
    });
  }
  // Suits: ticked by default, onto the open task due soonest
  {
    const { page, errors, ctx } = await newPage(browser, '2026-10-22T11:00:00');
    const R = await writeBrief(page);
    check('Suits see the option, ticked', R.box && R.ticked);
    check('the task picked is the open one due soonest', R.task === 't3', R.task);
    check('open tasks are listed before done ones', R.options.join('|') === 'Promo cut|Post assets|Old recap', R.options.join('|'));
    const steps = await page.evaluate(() => (window.__fb.data.tasks.t3.checklist || []).map(s => s.text + '@' + s.due));
    check('saving the brief adds the date to that task', steps.indexOf('Client review@2026-10-26') !== -1, JSON.stringify(steps));
    // Dark mode: date boxes get the dark calendar button (asked: "Contrast here is poor")
    const scheme = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const b = document.createElement('button'); b.setAttribute('data-open-brief', 'SMB webinars'); document.body.appendChild(b); b.click(); b.remove(); await wait(250);
      const ed = document.querySelector('#brief-modal-card [data-brief-act="edit"]'); if (ed) { ed.click(); await wait(250); }
      const inp = document.querySelector('#brief-modal-card input[type="date"]');
      const light = inp ? getComputedStyle(inp).colorScheme : null;
      document.documentElement.classList.add('dark'); await wait(100);
      const dark = inp ? getComputedStyle(inp).colorScheme : null;
      return { light, dark };
    });
    check('date boxes use the dark calendar button in dark mode', scheme.dark === 'dark' && scheme.light !== 'dark', JSON.stringify(scheme));
    { const sec = await page.$('#brief-modal-card [data-brief-sec]:has(input[type="date"])'); if (sec) await sec.screenshot({ path: path.join(OUT, 'brief-dates-dark.png') }); }
    check('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  // Not Suits, not admin: nothing shown, nothing added
  {
    const { page, errors, ctx } = await newPage(browser, '2026-10-22T11:00:00', { asZenon: true });
    const R = await writeBrief(page);
    check('others do not see the option', !R.box);
    const any = await page.evaluate(() => ['t2', 't3', 't4'].some(id => (window.__fb.data.tasks[id].checklist || []).length));
    check('and saving adds no steps', !any);
    check('no page errors (other person)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
