// checklist-range -- a checklist step can carry an optional start date ("Oct 12–16"). The due date
// stays the end and the one every other view reads; the range only shows in the task window's
// checklist. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
      people: { u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }) },
      tasks: {
        t1: { name: 'Campaign', project: 'Bartley', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z',
          checklist: [
            { id: 's1', text: 'Shoot', start: '2026-10-19', due: '2026-10-21', done: false },
            { id: 's2', text: 'Brief', due: '2026-10-08', done: false }
          ] }
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
  await page.evaluate(() => document.querySelector('[data-open-task="t1"]').click()); await page.waitForTimeout(600);
  const ed = '#task-checklist-editor';

  let text = await page.innerText(ed);
  check('a saved range shows on its row', /Shoot[\s\S]{0,40}Oct 19–21/.test(text), text);
  check('a single-date step still reads "Due"', /Due Oct 8/.test(text));

  // Add row: "+ Start" only beside a picked due date.
  const visible = (sel) => page.$eval(sel, e => !e.classList.contains('hidden') && e.offsetParent !== null);
  check('"+ Start" hidden at rest', !(await visible('#task-checklist-start-btn')));
  await page.fill('#task-checklist-due-input', '2026-10-16');
  await page.dispatchEvent('#task-checklist-due-input', 'change');
  check('"+ Start" appears once a due date is picked', await visible('#task-checklist-start-btn'));
  await page.click('#task-checklist-start-btn');
  check('start box opens, button hides', await visible('#task-checklist-start-wrap') && !(await visible('#task-checklist-start-btn')));
  await page.fill('#task-checklist-start-input', '2026-10-12');
  await page.locator('#task-checklist-add-row').screenshot({ path: path.join(OUT, 'checklist-range-add.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.locator('#task-checklist-add-row').screenshot({ path: path.join(OUT, 'checklist-range-add-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.fill('#task-checklist-input', 'Edit');
  await page.click('#task-checklist-add-btn'); await page.waitForTimeout(250);
  text = await page.innerText(ed);
  check('added step shows Oct 12–16', /Edit[\s\S]{0,40}Oct 12–16/.test(text), text);
  check('add row resets (start closed)', !(await visible('#task-checklist-start-wrap')) && (await page.inputValue('#task-checklist-start-input')) === '');

  // Back to front: swapped.
  await page.fill('#task-checklist-due-input', '2026-10-05');
  await page.dispatchEvent('#task-checklist-due-input', 'change');
  await page.click('#task-checklist-start-btn');
  await page.fill('#task-checklist-start-input', '2026-10-07');
  await page.fill('#task-checklist-input', 'Prep');
  await page.click('#task-checklist-add-btn'); await page.waitForTimeout(250);
  check('a back-to-front range is swapped', /Prep[\s\S]{0,40}Oct 5–7/.test(await page.innerText(ed)));

  // Editor: the range is editable; clearing the start makes it a single date again.
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#task-checklist-editor .checklist-item-row')].find(r => r.textContent.includes('Shoot'));
    row.querySelector('.checklist-edit-toggle').click();
  });
  await page.waitForTimeout(200);
  check('editor shows the start date', (await page.inputValue('#task-checklist-editor .checklist-start-input')) === '2026-10-19');
  await page.fill('#task-checklist-editor .checklist-start-input', '');
  await page.click('#task-checklist-editor .checklist-edit-done'); await page.waitForTimeout(200);
  check('clearing the start leaves a single date', /Shoot[\s\S]{0,40}Due Oct 21/.test(await page.innerText(ed)));
  // Single-date step: "+ Start" in the editor opens the start box.
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#task-checklist-editor .checklist-item-row')].find(r => r.textContent.includes('Brief'));
    row.querySelector('.checklist-edit-toggle').click();
  });
  await page.waitForTimeout(200);
  await page.click('#task-checklist-editor .checklist-start-add');
  await page.fill('#task-checklist-editor .checklist-start-input', '2026-10-06');
  await page.click('#task-checklist-editor .checklist-edit-done'); await page.waitForTimeout(200);
  check('editor "+ Start" makes a range', /Brief[\s\S]{0,40}Oct 6–8/.test(await page.innerText(ed)));
  await page.locator('#task-checklist-editor').screenshot({ path: path.join(OUT, 'checklist-range.png') });

  await page.click('#task-save-btn'); await page.waitForTimeout(700);
  const saved = await page.evaluate(() => window.__fb.data.tasks.t1.checklist);
  const by = t => saved.find(i => i.text === t) || {};
  check('saved: start + due on ranges, none on single dates',
    by('Edit').start === '2026-10-12' && by('Edit').due === '2026-10-16' &&
    by('Prep').start === '2026-10-05' && by('Prep').due === '2026-10-07' &&
    by('Brief').start === '2026-10-06' && !('start' in by('Shoot')) && by('Shoot').due === '2026-10-21',
    saved.map(i => i.text + '@' + (i.start || '') + '>' + (i.due || '-')).join(' | '));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
