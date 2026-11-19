// project-similar -- "Did you mean?" under the task window's Project field: a NEW name sharing an
// existing project's date and [Client] with similar words offers that project (click to use it, or
// "It's new" to hide it). Nothing for existing names, other dates/clients, unlike words, or the task's
// own saved project. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, '.out');

const TOURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'monday-meeting.test.js'), 'utf8').match(/toursSeen: (\[[^\]]*\])/)[1]);
TOURS.push(...['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates'].map(v => 'page:' + v));

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(tours) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: tours, updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Aqila Ramadhani', email: 'aqila@mediashock.com.sg', departments: ['production'] })
      },
      tasks: {
        t1: { name: 'Task t1', project: '261112[Lark]InnovationDemoDay_Jakarta_Tokyo', priority: 'Medium', status: 'In Progress', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Task t2', project: '261112[Lark]InnovationDemoDay_Jakarta_Tokyo', priority: 'Medium', status: 'In Progress', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z' },
        t3: { name: 'Task t3', project: '261231[Google]CE GTS Webinar_Q4 2026', priority: 'Medium', status: 'In Progress', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z' },
        t4: { name: 'Task t4', project: '261112[Lark]PitchDemoDay_Jakarta_Tokyo', priority: 'Medium', status: 'In Progress', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
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
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.clock.install({ time: new Date('2026-10-06T10:00:00') });
  await page.addInitScript({ content: '(' + seed.toString() + ')(' + JSON.stringify(TOURS) + ');' });
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
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 });
  await page.waitForTimeout(1500); await skipTours(page);
  const sim = () => page.evaluate(() => { const el = document.getElementById('task-project-similar'); return el.classList.contains('hidden') ? null : el.textContent; });
  const type = async (v) => { await page.fill('#task-project', v); await page.waitForTimeout(150); };
  await page.click('#btn-add-task'); await page.waitForTimeout(500);
  check('nothing at rest on a new task', (await sim()) === null);
  await type('261112[Lark]PitchDemoDay_Jakarta_Tokyo');
  check('no hint for a name already in use', (await sim()) === null);
  await type('261112[Lark]Innovation Demo Day Tokyo');
  const s1 = await sim();
  check('new similar name offers the existing project', s1 && s1.includes('261112[Lark]InnovationDemoDay_Jakarta_Tokyo') && !s1.includes('PitchDemoDay'), s1);
  await page.locator('#task-project-similar').screenshot({ path: path.join(OUT, 'project-similar.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.locator('#task-project').locator('xpath=../..').screenshot({ path: path.join(OUT, 'project-similar-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.locator('#task-project').locator('xpath=../..').screenshot({ path: path.join(OUT, 'project-similar-field.png') });
  await page.click('[data-similar-use]'); await page.waitForTimeout(150);
  check('clicking the name uses it and hides the line', (await page.inputValue('#task-project')) === '261112[Lark]InnovationDemoDay_Jakarta_Tokyo' && (await sim()) === null);
  await type('261112[Lark]Closing Party Singapore');
  check('unlike words: no hint', (await sim()) === null);
  await type('261113[Lark]InnovationDemoDay_Jakarta');
  check('different date: no hint', (await sim()) === null);
  await type('261112[Hensoldt]InnovationDemoDay_Jakarta');
  check('different client: no hint', (await sim()) === null);
  await type('261231[google] CE GTS Webinar');
  check('client case/spacing ignored, contained name matches', ((await sim()) || '').includes('261231[Google]CE GTS Webinar_Q4 2026'), await sim());
  await page.click('[data-similar-dismiss]'); await page.waitForTimeout(150);
  check("It's new hides it for that name", (await sim()) === null);
  await type('Acme Rebrand');
  check('names without date and client: no hint', (await sim()) === null);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const discard = page.locator('#confirm-modal button:has-text("Discard")');
  if (await discard.count() && await discard.first().isVisible()) { await discard.first().click(); await page.waitForTimeout(300); }

  // Opening the stray task itself (its own saved project) says nothing; renaming it toward a new similar name does.
  await page.evaluate(() => document.querySelector('[data-open-task="t4"]') && document.querySelector('[data-open-task="t4"]').click());
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => !document.getElementById('task-modal').classList.contains('hidden') && document.getElementById('task-project').value);
  check('opened the stray task', opened === '261112[Lark]PitchDemoDay_Jakarta_Tokyo', String(opened));
  check("no hint for the task's own saved project", (await sim()) === null);

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
