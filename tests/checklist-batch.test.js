// checklist-batch -- browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = __dirname;

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed() {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'],
          weekly: [{ week: '2026-09-28', rows: [{ project: 'SMB webinars', status: 'client', note: 'pending assets from post' }], extra: '', leave: false, at: '2026-09-27T10:00:00Z' }] }),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'],
          weekly: [
            { week: '2026-10-05', rows: [{ project: 'SMB webinars', status: 'help', note: 'Need B-roll footage by Thursday' }, { project: 'GWS recording', status: 'ontrack', note: 'Dry run today, shoot 12 Oct' }, { project: 'GC 15 Sep SEC', status: 'done', note: 'Highlights video signed off' }], extra: '', leave: false, at: '2026-10-04T10:40:00Z' },
            { week: '2026-09-28', rows: [{ project: 'GWS recording', status: 'ontrack', note: 'Dry run today, shoot 12 Oct' }], extra: '', leave: false, at: '2026-09-27T10:40:00Z' }
          ] }),
        u3: P({ name: 'Mychelle Chen', email: 'mychelle@mediashock.com.sg', departments: ['suits', 'admin'],
          weekly: [{ week: '2026-10-05', rows: [{ project: 'Paused thing', status: 'hold', note: 'Client paused till Nov' }, { project: 'GC GWS 8-9 Oct event', status: 'client', note: 'Client to share the brief' }, { project: 'GC TH podcast series', status: 'ontrack', note: 'Client check-in later this week' }], extra: 'New biz: follow up with Fugro', leave: false, at: '2026-10-05T01:12:00Z' }] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['production'] }),
        u5: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['admin'], leave: [{ id: 'l1', start: '2026-10-06', end: '2026-10-09', note: '' }] }),
        u7: P({ name: 'Nora NoDept', email: 'nora@mediashock.com.sg', departments: [] }),
        u6: P({ name: 'Old Leaver', email: 'old@mediashock.com.sg', departments: ['suits'], lastSeen: '2025-01-01T00:00:00Z' })
      },
      tasks: {
        t1: { name: 'Rough cut', project: 'GWS recording', priority: 'High', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-12', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', statusUpdates: [{ id: 's1', date: '2026-10-05', text: 'Waiting on speaker list from client', author: 'Mychelle Chen', at: '2026-10-05T02:00:00Z' }], checklist: [{ id: 'c1', text: 'Speaker list', due: '2026-10-08', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t2: { name: 'Post assets', project: 'SMB webinars', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t3: { name: 'Talk deck', project: 'Autodesk LEEP talk', priority: 'Medium', status: 'Pipeline', startDate: '2026-10-01', deadline: '2026-10-20', assignee: 'Arvind Kumaraguru', involved: ['Deane Cheng'], createdBy: 'Arvind Kumaraguru', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },
        t4: { name: 'Carousel', project: 'Mediashock LinkedIn', priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', deadline: '2026-10-07', assignee: 'Zenon Kwok Ze Yong', createdBy: 'Zenon Kwok Ze Yong', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' },

        t5: { name: "Kickoff discussion", project: "Lark AI", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-06", assignee: "Zenon Kwok Ze Yong", checklist: [{ id: "k1", text: "Kickoff discussion", due: "2026-10-06", done: false }], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t6: { name: "A", project: "P1", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-08", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t7: { name: "B", project: "P2", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-08", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t8: { name: "C", project: "P3", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-09", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t9: { name: "D", project: "P4", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-10", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
        t10: { name: "E", project: "P5", priority: "Medium", status: "In Progress", startDate: "2026-10-01", deadline: "2026-10-11", assignee: "Zenon Kwok Ze Yong", checklist: [], comments: [], timeEntries: [], createdAt: "2026-09-01T00:00:00Z" },
      },
      __x: 0,
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
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
  await page.addInitScript(seed); await page.addInitScript(extra);
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
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000, state: 'attached' }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

async function skipTours(page) {
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
}
function extra() {
  var d = window.__fb.data;
  d.tasks.t1.checklist = [{ id: 'c1', text: 'Brief', due: '2026-10-07', done: false, link: 'https://docs.google.com/document/d/x' }];
  d.tasks.t1.timeEntries = [];
  d.tasks.t2.checklist = [{id:'m1',text:'Brief',due:'2026-10-07',done:false},{id:'m2',text:'Draft',due:'2026-10-09',done:false},{id:'m3',text:'Final',due:'2026-10-12',done:false}];
}
(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-10-06T10:00:00', { colorScheme: process.argv[2] === 'dark' ? 'dark' : 'light' });
  await skipTours(page);
  await page.evaluate(() => { document.querySelector('[data-open-task="t1"]').click(); });
  await page.waitForTimeout(500); await skipTours(page);
  check('one dated item: no headings', (await page.$$('#task-checklist-editor .checklist-group-head')).length === 0 && (await page.textContent('#task-checklist-editor')).includes('Due Oct 7'));
  // bulk add with Shift+Enter typing
  await page.click('#task-checklist-input');
  await page.keyboard.type('Ad creative #1 1080x1080px');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('Ad creative #2 1080x1920px');
  check('Add button says Add 2', (await page.textContent('#task-checklist-add-btn')).trim() === 'Add 2');
  check('Shift+Enter keeps typing (no add yet)', (await page.$$('#task-checklist-editor .checklist-item-row')).length === 1);
  await page.fill('#task-checklist-due-input', '2026-10-09');
  await page.click('#task-checklist-add-btn');
  await page.waitForTimeout(200);
  // paste a bulleted list with no date
  await page.evaluate(() => {
    var ta = document.getElementById('task-checklist-input');
    ta.focus();
    var dt = new DataTransfer(); dt.setData('text/plain', '- Ad creative #3 300x250px\n• Ad creative #4 728x90px\n\n3. Ad creative #5 300x600px\nAd creative #6 320x50px');
    ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  // Chromium's synthetic paste doesn't insert; set the value the way a real paste would
  await page.evaluate(() => { var ta = document.getElementById('task-checklist-input'); ta.value = '- Ad creative #3 300x250px\n• Ad creative #4 728x90px\n\n3. Ad creative #5 300x600px\nAd creative #6 320x50px'; ta.dispatchEvent(new Event('input', { bubbles: true })); });
  check('box grows for several lines', await page.$eval('#task-checklist-input', t => t.offsetHeight > 60), await page.$eval('#task-checklist-input', t => t.offsetHeight));
  await page.focus('#task-checklist-input');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const texts = await page.$$eval('#task-checklist-editor .checklist-item-row', rs => rs.map(r => r.querySelector('.text-sm').textContent));
  check('7 items, bullets stripped', texts.length === 7 && texts.includes('Ad creative #3 300x250px') && texts.includes('Ad creative #5 300x600px'), JSON.stringify(texts));
  check('box shrinks back', await page.$eval('#task-checklist-input', t => t.value === '' && t.offsetHeight < 50));
  const heads = await page.$$eval('#task-checklist-editor .checklist-group-head', hs => hs.map(h => h.textContent));
  check('date headings', JSON.stringify(heads) === JSON.stringify(['Due Wed, Oct 7', 'Due Fri, Oct 9 · 2', 'No date · 4']) || (heads.length === 3 && heads[1].includes('· 2') && heads[2].includes('No date · 4')), JSON.stringify(heads));
  check('rows in a dated group drop their own Due line', !(await page.textContent('#task-checklist-editor')).includes('Due Oct 9'));
  await page.screenshot({ path: 'mob2/checklist-grouped' + (process.argv[2] === 'dark' ? '-dark' : '') + '.png', clip: await page.$eval('#task-checklist-editor', e => { const r = e.getBoundingClientRect(); return { x: r.x - 10, y: r.y - 30, width: r.width + 20, height: r.height + 90 }; }) });
  // drag #3 (no date) into the Oct 9 group
  const idx = await page.$$eval('#task-checklist-editor .checklist-item-row', rs => {
    const find = t => rs.find(r => r.textContent.includes(t)).getAttribute('data-checklist-i');
    return { from: find('#3'), to: find('#1 ') };
  });
  await page.dragAndDrop('[data-checklist-drag-handle][data-checklist-i="' + idx.from + '"]', '.checklist-item-row[data-checklist-i="' + idx.to + '"]');
  await page.waitForTimeout(200);
  const heads2 = await page.$$eval('#task-checklist-editor .checklist-group-head', hs => hs.map(h => h.textContent));
  check('drag date change is announced', (await page.textContent('#toast-container')).includes('is now due Oct 9'), await page.textContent('#toast-container'));
  check('dragging into a group takes its date', heads2.some(h => h.includes('Oct 9') && h.includes('· 3')) && heads2.some(h => h.includes('No date · 3')), JSON.stringify(heads2));
  await page.click('#task-save-btn'); await page.waitForTimeout(700);
  const saved = await page.evaluate(() => window.__fb.data.tasks.t1.checklist);
  check('saved 7 items, 3 on Oct 9', saved.length === 7 && saved.filter(i => i.due === '2026-10-09').length === 3, saved.map(i => i.text + '@' + (i.due || '-')).join(' | '));
  // milestones each on their own date: stays a flat list
  await page.evaluate(() => { var b = document.querySelector('[data-open-task="t2"]'); b && b.click(); });
  await page.waitForTimeout(500);
  check('distinct dates: no headings', (await page.$$('#task-checklist-editor .checklist-group-head')).length === 0 && (await page.textContent('#task-checklist-editor')).includes('Due Oct 12'));
  console.log('errors', errors);
  console.log(results.join('\n'));
  await browser.close();
})();
