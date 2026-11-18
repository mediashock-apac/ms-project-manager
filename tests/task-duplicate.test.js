// task-duplicate -- the copy button on a Board row saves a copy of the task at once (name's last
// number +1, past names already in the project; same people, dates, link, steps unticked; no
// history), opens it with the new number selected, and Undo removes it. Browser test against
// index.html with Firebase stubbed (see tests/README.md).
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
        t0: { name: 'Subtitles - Video #2', project: 'Bartley', priority: 'Medium', status: 'Pipeline', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Key visual', project: 'Bartley', priority: 'High', status: 'Done', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z', completedAt: '2026-10-01T00:00:00Z' },
        t1: { name: 'Subtitles - Video #1', involved: ['Aqila Ramadhani'], reviewRounds: [{ at: 'x', audience: 'client' }], statusUpdates: [{ id: 'u', text: 'hi' }], project: 'Bartley', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [{ id: 'c', text: 'note', author: 'Deane Cheng' }], timeEntries: [{ minutes: 60, author: 'Deane Cheng' }], createdAt: '2026-09-01T00:00:00Z', driveLink: 'https://drive.google.com/f',
          checklist: [
            { id: 's1', text: 'Ad 1080x1080', due: '2026-10-09', link: 'https://drive.google.com/x', assignees: ['Aqila Ramadhani'], assignee: 'Aqila Ramadhani', done: true },
            { id: 's2', text: 'Client review', due: '2026-10-12', done: false }
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
  const row = page.locator('.task-card[data-task-id="t1"]');
  check('no Duplicate button at rest', !(await row.locator('[data-duplicate-task]').isVisible()));
  await row.hover();
  check('Duplicate shows on row hover', await row.locator('[data-duplicate-task]').isVisible());
  await row.screenshot({ path: path.join(OUT, 'task-duplicate-row.png') });
  await row.locator('[data-duplicate-task]').click(); await page.waitForTimeout(700);

  const ids = await page.evaluate(() => Object.keys(window.__fb.data.tasks).filter(k => !['t0', 't1', 't2'].includes(k)));
  check('one copy saved', ids.length === 1, ids.join(','));
  const c = await page.evaluate(id => window.__fb.data.tasks[id], ids[0]);
  check('name skips the #2 already in the project', c.name === 'Subtitles - Video #3', c.name);
  check('keeps project, owner, involved, dates, link, priority, status',
    c.project === 'Bartley' && c.assignee === 'Deane Cheng' && JSON.stringify(c.involved) === '["Aqila Ramadhani"]' &&
    c.startDate === '2026-10-01' && c.deadline === '2026-10-30' && c.driveLink === 'https://drive.google.com/f' && c.status === 'In Progress');
  check('steps copied with new ids, unticked', c.checklist.length === 2 && c.checklist.every(i => i.done === false && i.id !== 's1' && i.id !== 's2') && c.checklist[0].due === '2026-10-09');
  check('no history copied', c.comments.length === 0 && c.timeEntries.length === 0 && c.statusUpdates.length === 0 && c.reviewRounds.length === 0);
  const sel = await page.evaluate(() => { const el = document.activeElement; return el && el.id === 'task-name' ? [el.value, el.value.slice(el.selectionStart, el.selectionEnd)] : null; });
  check('copy opens with the new number selected', sel && sel[0] === 'Subtitles - Video #3' && sel[1] === '3', JSON.stringify(sel));
  const notes = await page.evaluate(() => Object.values(window.__fb.data.notifications).filter(n => n.recipient === 'Aqila Ramadhani'));
  check('involved and step people are told', notes.some(n => n.type === 'involved') && notes.some(n => n.type === 'checklist_assigned'), notes.map(n => n.type).join(','));

  // Rename and save works on the copy.
  await page.keyboard.type('4');
  await page.click('#task-save-btn'); await page.waitForTimeout(700);
  check('renamed copy saves', await page.evaluate(id => window.__fb.data.tasks[id].name, ids[0]) === 'Subtitles - Video #4');

  // A Done task's copy starts at Pipeline; a name with no number gets "(copy)". Undo removes it.
  const row2 = page.locator('.task-card[data-task-id="t2"]');
  await row2.hover(); await row2.locator('[data-duplicate-task]').click(); await page.waitForTimeout(700);
  const c2 = await page.evaluate(() => Object.values(window.__fb.data.tasks).find(t => t.name.startsWith('Key visual (')));
  check('no number: "(copy)", Done copy starts in Pipeline', c2 && c2.name === 'Key visual (copy)' && c2.status === 'Pipeline' && !c2.completedAt, c2 && c2.name + ' ' + c2.status);
  await page.locator('button:has-text("Undo")').last().click(); await page.waitForTimeout(700);
  const left = await page.evaluate(() => Object.values(window.__fb.data.tasks).map(t => t.name));
  check('Undo removes only that copy and closes its window', left.includes('Subtitles - Video #4') && !(await page.evaluate(() => Object.values(window.__fb.data.tasks).some(t => t.name === 'Key visual (copy)'))) &&
    await page.evaluate(() => document.getElementById('task-modal').classList.contains('hidden')));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
