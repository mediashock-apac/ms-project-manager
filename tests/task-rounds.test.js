// task-rounds -- "Start round 2" in the task window (only on a task in Review or Done, and only on the
// latest round) saves a linked copy: name gets "(Round 2)" or its round number bumped, status In
// Progress from today, past deadline and step dates cleared, round 1 untouched. Both windows show
// "Round 1 · Round 2" links; an archived round 1 is included and opens read-only. Browser test
// against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, '.out');

const TOURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'monday-meeting.test.js'), 'utf8').match(/toursSeen: (\[[^\]]*\])/)[1]);
TOURS.push(...['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates', 'mytasks'].map(v => 'page:' + v));

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(tours) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: tours, updatesSeen: 'zzzz' }, o);
  const base = { project: 'Lark Demo Day', priority: 'Medium', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], checklist: [], createdAt: '2026-09-01T00:00:00Z' };
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['suits'] }),
        u2: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['suits'] })
      },
      tasks: {
        t1: Object.assign({}, base, { name: 'Cost approval', status: 'Review', reviewAudience: 'client', startDate: '2026-09-20', deadline: '2026-10-02', involved: ['Zenon Kwok Ze Yong'],
          comments: [{ id: 'c', text: 'Client approved SGD 12k', author: 'Deane Cheng' }], timeEntries: [{ minutes: 90, author: 'Deane Cheng' }],
          checklist: [
            { id: 's1', text: 'Send quote', due: '2026-09-25', done: true },
            { id: 's2', text: 'Client sign-off', due: '2026-10-20', start: '2026-10-01', done: false, assignees: ['Zenon Kwok Ze Yong'], assignee: 'Zenon Kwok Ze Yong' }
          ] }),
        t0: Object.assign({}, base, { name: 'Storyboard', status: 'Pipeline' }),
        t4: Object.assign({}, base, { name: 'Logo R2', status: 'Done', completedAt: '2026-10-01T00:00:00Z', roundOf: 't3', round: 2, deadline: '2026-10-30' })
      },
      archivedTasks: {
        t3: Object.assign({}, base, { name: 'Logo R1', status: 'Done', archivedAt: '2026-09-28T00:00:00Z' })
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

  const openTask = async (id) => {
    await page.evaluate(() => { location.hash = ''; });
    await page.evaluate(id => { location.hash = '#task=' + id; }, id);
    await page.waitForTimeout(700);
  };
  const btnShown = () => page.locator('#task-new-round-btn').isVisible();
  const btnText = () => page.locator('#task-new-round-label').textContent();
  const roundsLine = async () => (await page.locator('#task-rounds').isVisible()) ? (await page.locator('#task-rounds').textContent()).replace(/\s+/g, ' ').trim() : '';

  // Not offered before Review.
  await openTask('t0');
  check('no "Start round" on a Pipeline task', !(await btnShown()));
  check('no rounds line on a task never re-done', (await roundsLine()) === '');
  await page.click('#task-modal-close'); await page.waitForTimeout(300);

  // Offered on a task in Review.
  await openTask('t1');
  check('"Start round 2" on a task in Review', (await btnShown()) && (await btnText()) === 'Start round 2', await btnText());
  await page.locator('#task-modal > div').first().screenshot({ path: path.join(OUT, 'task-rounds-button.png') });
  await page.click('#task-new-round-btn'); await page.waitForTimeout(800);

  const newIds = await page.evaluate(() => Object.keys(window.__fb.data.tasks).filter(k => !['t0', 't1', 't4'].includes(k)));
  check('one new round saved', newIds.length === 1, newIds.join(','));
  const r2 = await page.evaluate(id => window.__fb.data.tasks[id], newIds[0]);
  check('name gets "(Round 2)"', r2.name === 'Cost approval (Round 2)', r2.name);
  check('linked to round 1', r2.roundOf === 't1' && r2.round === 2);
  check('starts In Progress today; past deadline cleared', r2.status === 'In Progress' && r2.startDate === '2026-10-06' && r2.deadline === '', r2.status + ' ' + r2.startDate + ' ' + r2.deadline);
  check('steps copied unticked; past date cleared, future kept, past range start dropped',
    r2.checklist.length === 2 && r2.checklist.every(i => !i.done) && !r2.checklist[0].due && r2.checklist[1].due === '2026-10-20' && !r2.checklist[1].start, JSON.stringify(r2.checklist));
  check('no history copied', r2.comments.length === 0 && r2.timeEntries.length === 0 && !r2.reviewAudience);
  const r1 = await page.evaluate(() => window.__fb.data.tasks.t1);
  check('round 1 left exactly as it was', r1.status === 'Review' && r1.name === 'Cost approval' && !r1.roundOf && !r1.round && r1.comments.length === 1);
  check('new round open in the task window', await page.evaluate(id => document.getElementById('task-id').value === id && !document.getElementById('task-modal').classList.contains('hidden'), newIds[0]));
  check('rounds line on round 2', (await roundsLine()) === 'Round 1 · Round 2', await roundsLine());
  check('deadline box ready to fill', await page.evaluate(() => { const d = document.getElementById('task-deadline'); return document.activeElement === d && !d.disabled; }));
  check('no "Start round" on a round still in progress', !(await btnShown()));
  const notes = await page.evaluate(() => Object.values(window.__fb.data.notifications).filter(n => n.recipient === 'Zenon Kwok Ze Yong').map(n => n.type));
  check('involved and step people are told', notes.includes('involved') && notes.includes('checklist_assigned'), notes.join(','));
  check('logged to Activity', await page.evaluate(() => Object.values(window.__fb.data.activity).some(a => /Started round 2 of "Cost approval"/.test(a.summary))));
  await page.locator('#task-modal > div').first().screenshot({ path: path.join(OUT, 'task-rounds-round2.png') });

  // Round 1 shows the line too, but no button (round 2 exists); its link opens round 2.
  await page.click('#task-modal-close'); await page.waitForTimeout(300);
  await openTask('t1');
  check('rounds line on round 1', (await roundsLine()) === 'Round 1 · Round 2', await roundsLine());
  check('no "Start round" on an earlier round', !(await btnShown()));
  await page.click('#task-rounds [data-open-round]'); await page.waitForTimeout(600);
  check('"Round 2" link opens round 2', await page.evaluate(id => document.getElementById('task-id').value === id, newIds[0]));

  // Unsaved changes: the link asks first.
  await page.fill('#task-name', 'Cost approval (Round 2) edited');
  await page.click('#task-rounds [data-open-round]'); await page.waitForTimeout(400);
  check('a round link asks before dropping unsaved changes', await page.evaluate(() => !document.getElementById('confirm-modal').classList.contains('hidden')));
  await page.locator('#confirm-modal button:has-text("Keep editing")').click(); await page.waitForTimeout(300);
  check('Keep editing stays on the task', await page.evaluate(id => document.getElementById('task-id').value === id && document.getElementById('task-name').value.endsWith('edited'), newIds[0]));
  await page.fill('#task-name', 'Cost approval (Round 2)');

  // A series whose round 1 is archived: the line includes it, the button bumps "R2" to "R3".
  await page.click('#task-modal-close'); await page.waitForTimeout(300);
  await openTask('t4');
  await page.waitForTimeout(600);
  check('archived round 1 is in the line', (await roundsLine()) === 'Round 1 · Round 2', await roundsLine());
  check('"Start round 3" on a Done round 2', (await btnShown()) && (await btnText()) === 'Start round 3', await btnText());
  await page.click('#task-new-round-btn'); await page.waitForTimeout(800);
  const r3 = await page.evaluate(() => Object.values(window.__fb.data.tasks).find(t => t.round === 3));
  check('"R2" becomes "R3", same series, future deadline kept', r3 && r3.name === 'Logo R3' && r3.roundOf === 't3' && r3.deadline === '2026-10-30', r3 && (r3.name + ' ' + r3.roundOf + ' ' + r3.deadline));
  check('rounds line on round 3', (await roundsLine()) === 'Round 1 · Round 2 · Round 3', await roundsLine());
  await page.locator('#task-rounds [data-open-round]').first().click(); await page.waitForTimeout(700);
  const arch = await page.evaluate(() => {
    const m = document.getElementById('archived-task-modal');
    return !m.classList.contains('hidden') ? m.textContent.replace(/\s+/g, ' ') : '';
  });
  check('archived round 1 opens read-only with its Rounds', /Logo R1/.test(arch) && /Rounds/.test(arch) && /Round 3/.test(arch), arch.slice(0, 160));
  const r3Id = await page.evaluate(() => Object.keys(window.__fb.data.tasks).find(k => window.__fb.data.tasks[k].round === 3));
  await page.locator('#archived-task-modal [data-open-round]').last().click(); await page.waitForTimeout(600);
  check('a round link in the archived window opens that round', await page.evaluate(id => document.getElementById('task-id').value === id && document.getElementById('archived-task-modal').classList.contains('hidden'), r3Id));

  // Undo on the toast removes the new round and closes its window; earlier rounds stay.
  await page.locator('button:has-text("Undo")').last().click(); await page.waitForTimeout(700);
  check('Undo removes only the new round', await page.evaluate(id => !window.__fb.data.tasks[id] && !!window.__fb.data.tasks.t4 && document.getElementById('task-modal').classList.contains('hidden'), r3Id));

  // Dark mode look.
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await openTask('t4');
  await page.locator('#task-modal > div').first().screenshot({ path: path.join(OUT, 'task-rounds-dark.png') });

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
