// checklist-done -- done steps are condensed: one line each, grouped by date with a shared person
// or link named once. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();

const TOURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'monday-meeting.test.js'), 'utf8').match(/toursSeen: (\[[^\]]*\])/)[1]);
TOURS.push(...['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates'].map(v => 'page:' + v));

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(tours) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: tours, updatesSeen: 'zzzz' }, o);
  const ad = (n, size) => ({ id: 'a' + n, text: 'Ad creative #' + n + ' ' + size, due: '2026-10-09', done: true, link: 'https://drive.google.com/drive/folders/ads' + n, assignees: ['Aqila Ramadhani'], assignee: 'Aqila Ramadhani' });
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Aqila Ramadhani', email: 'aqila@mediashock.com.sg', departments: ['production'] })
      },
      tasks: {
        t1: { name: 'Campaign', project: 'Bartley', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z',
          checklist: [
            { id: 'o1', text: 'Final edit', due: '2026-10-13', done: false, assignees: ['Aqila Ramadhani'], assignee: 'Aqila Ramadhani' },
            { id: 'b1', text: 'Brief', due: '2026-10-07', done: true, link: 'https://docs.google.com/document/d/brief' },
            { id: 'b2', text: 'Brand Guideline', done: true, link: 'https://drive.google.com/drive/folders/brand' },
            ad(1, '1080x1080px (Meta)'), ad(2, '1080x1920px (Meta)'), ad(3, '300x250px (Programmatic)'),
            ad(4, '728x90px (Programmatic)'), ad(5, '300x600px (Programmatic)'), ad(6, '320x50px (Programmatic)'),
            { id: 'm1', text: 'Int Meeting', due: '2026-10-08', done: true, assignees: ['Deane Cheng', 'Aqila Ramadhani'], assignee: 'Deane Cheng' }
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
  const doneRows = await page.$$eval(ed + ' .checklist-item-row', rows => rows.filter(r => r.querySelector('.checklist-toggle').checked).map(r => r.getBoundingClientRect().height));
  check('9 done steps listed', doneRows.length === 9, String(doneRows.length));
  check('each done step is one short line', doneRows.every(h => h <= 34), JSON.stringify(doneRows.map(Math.round)));
  const text = await page.innerText(ed);
  check('the six ad sizes sit under one date heading naming Aqila once', /Due Fri, Oct 9 · 6[\s\S]{0,8}Aqila Ramadhani/.test(text) && !/Due Wed, Oct 7/.test(text) && /Brief[\s\S]{0,4}Due Oct 7/.test(text) && (text.match(/Aqila Ramadhani/g) || []).length <= 3, text);
  check('rows in a dated group drop their own date (single ones keep theirs)', (text.match(/Due Oct 9/g) || []).length === 0);
  check('links stay one click away as a small icon', (await page.$$(ed + ' .checklist-item-row a[href*="drive.google.com/drive/folders/ads"]')).length === 6);
  check('open steps keep their full layout above', text.indexOf('Final edit') < text.indexOf('Done · 9'));
  check('no done-group warns "after the task deadline"', !/after the task deadline/.test(text));
  check('single done steps come before the date groups', text.indexOf('Brand Guideline') < text.indexOf('Due Fri, Oct 9'));
  await page.locator('#task-checklist-editor').screenshot({ path: path.join(OUT, 'checklist-done-condensed.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.locator('#task-checklist-editor').screenshot({ path: path.join(OUT, 'checklist-done-condensed-dark.png') });

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
