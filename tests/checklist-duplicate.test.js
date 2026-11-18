// checklist-duplicate -- "Duplicate" in a step's editor adds a copy right below it (new id, not
// done, same date/link/people) and opens the copy with the cursor at the end of the name, for
// repeat deliverables that differ by one detail. Browser test against index.html with Firebase
// stubbed (see tests/README.md).
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
        t1: { name: 'Social ads', project: 'Bartley', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z',
          checklist: [
            { id: 's1', text: 'Ad 1080x1080', due: '2026-10-09', link: 'https://drive.google.com/x', assignees: ['Aqila Ramadhani'], assignee: 'Aqila Ramadhani', done: false },
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
  await page.evaluate(() => document.querySelector('[data-open-task="t1"]').click()); await page.waitForTimeout(600);
  const ed = '#task-checklist-editor';

  check('no Duplicate at rest (only in the step editor)', (await page.$$(ed + ' .checklist-duplicate')).length === 0);
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#task-checklist-editor .checklist-item-row')].find(r => r.textContent.includes('1080x1080'));
    row.querySelector('.checklist-name').click();
  });
  await page.waitForTimeout(200);
  check('Duplicate shows in the open editor', (await page.$$(ed + ' .checklist-duplicate')).length === 1);
  await page.locator(ed).screenshot({ path: path.join(OUT, 'checklist-duplicate-editor.png') });

  // An unsaved edit to the original is kept, and the copy carries it.
  await page.fill(ed + ' .checklist-text-input', 'Ad 1080x1080 static');
  await page.click(ed + ' .checklist-duplicate'); await page.waitForTimeout(250);
  const caret = await page.evaluate(() => {
    const el = document.activeElement;
    return el && el.classList.contains('checklist-text-input') ? [el.value, el.selectionStart, el.selectionEnd] : null;
  });
  check('the copy opens in the editor, cursor at the end', caret && caret[0] === 'Ad 1080x1080 static' && caret[1] === caret[0].length && caret[2] === caret[0].length, JSON.stringify(caret));
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Ad 1080x1920 static');
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);

  const names = await page.$$eval(ed + ' .checklist-name', els => els.map(e => e.textContent.trim()));
  check('copy sits right below the original', names.indexOf('Ad 1080x1080 static') + 1 === names.indexOf('Ad 1080x1920 static'), names.join(' | '));

  await page.click('#task-save-btn'); await page.waitForTimeout(700);
  const saved = await page.evaluate(() => window.__fb.data.tasks.t1.checklist);
  const a = saved.find(i => i.text === 'Ad 1080x1080 static') || {};
  const b = saved.find(i => i.text === 'Ad 1080x1920 static') || {};
  check('saved: 3 steps, copy has its own id', saved.length === 3 && b.id && b.id !== a.id && a.id === 's1', saved.map(i => i.id + ':' + i.text).join(' | '));
  check('saved: copy keeps date, link and people, not done',
    b.due === '2026-10-09' && b.link === a.link && JSON.stringify(b.assignees) === '["Aqila Ramadhani"]' && b.done === false);
  const notes = await page.evaluate(() => Object.values(window.__fb.data.notifications).filter(n => n.recipient === 'Aqila Ramadhani' && n.type === 'checklist_assigned'));
  check('the copy\'s people are told on Save', notes.length === 1, JSON.stringify(notes.map(n => n.snippet)));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
