// phone -- browser test against index.html with Firebase stubbed (see tests/README.md).
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
  d.projects = {
    p1: { name: 'GWS recording', deadline: '2026-10-15', wipCategory: 'active', chat: [
      { id: 'm1', text: 'Speaker list is in the folder now', author: 'Mychelle Chen', date: '2026-10-05T03:00:00Z' },
      { id: 'm2', text: 'Thanks! Starting the rough cut today', author: 'Deane Cheng', date: '2026-10-05T03:05:00Z', reactions: { '\u{1F44D}': ['Mychelle Chen'] } },
      { id: 'm3', text: 'Can we push the dry run to 2pm? @Deane Cheng', author: 'Arvind Kumaraguru', date: '2026-10-06T01:00:00Z', replyTo: 'm2' }
    ], links: [] },
    p2: { name: '271231[LittlePaddington]MarketingAgencyPartner2027', deadline: null, wipCategory: 'pitch', wipNote: 'Pitch deck due to client end of month' }
  };
  d.notifications = {
    n1: { recipient: 'Deane Cheng', type: 'chat_mention', chatProject: 'GWS recording', author: 'Arvind Kumaraguru', snippet: 'Can we push the dry run to 2pm?', at: '2026-10-06T01:00:00Z', read: false },
    n2: { recipient: 'Deane Cheng', type: 'mention', taskId: 't1', taskName: 'Rough cut', author: 'Mychelle Chen', snippet: 'Please check the speaker list', at: '2026-10-05T01:00:00Z', read: true }
  };
  d.tasks.t1.checklist = [{ id: 'c1', text: 'Speaker list', due: '2026-10-08', done: false }, { id: 'c2', text: 'Select b-roll', due: '2026-10-05', done: false, assignee: 'Deane Cheng', link: 'https://docs.google.com/document/d/x' }, { id: 'c3', text: 'Ingest footage', done: true }];
  d.tasks.t1.comments = [{ id: 'k1', text: 'Speaker list is in the folder @Deane Cheng', author: 'Mychelle Chen', date: '2026-10-05T02:00:00Z' }];
  d.tasks.t1.driveLink = 'https://drive.google.com/drive/folders/abc';
  d.tasks.t11 = { name: 'Pitch deck', project: '271231[LittlePaddington]MarketingAgencyPartner2027', priority: 'High', status: 'In Progress', startDate: '2026-09-20', deadline: '2026-09-30', assignee: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' };
}
(async () => {
  const browser = await chromium.launch();
  const dark = process.argv[2] === 'dark';
  const { page, errors } = await newPage(browser, '2026-10-06T10:00:00', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  const P = (n) => 'mob2/' + (dark ? 'd-' : '') + n + '.png';
  const step = async (name, fn) => { try { await fn(); } catch (e) { check(name + ' (threw)', false, String(e).slice(0, 160)); } };
  check('m-mode on', await page.evaluate(() => document.documentElement.classList.contains('m-mode')));
  check('desktop hidden', await page.$eval('#app', e => getComputedStyle(e).display === 'none'));
  check('no tour', !(await page.$('[data-tour-skip]')));
  await page.screenshot({ path: P('home') });
  const homeText = await page.textContent('#m-home');
  check('greeting', homeText.includes('Good morning, Deane'));
  check('needs attention lists overdue pitch', homeText.includes('Pitch deck'));
  check('steps lists late step', homeText.includes('Select b-roll'));
  check('bell badge 1', (await page.$eval('[data-m-bell]', e => e.textContent + '|' + e.style.display)) === '1|');
  await page.$eval('[data-m-pane="home"]', e => e.scrollTo(0, 2000)); await page.waitForTimeout(300);
  await page.screenshot({ path: P('home-bottom') });
  await step('tick', async () => {
    await page.click('#m-home [data-m-act="step"][data-item="c2"]'); await page.waitForTimeout(400);
    check('step ticked in data', await page.evaluate(() => window.__fb.data.tasks.t1.checklist.find(i => i.id === 'c2').done === true));
  });
  await step('tasks', async () => {
    await page.click('[data-m-tab="tasks"]'); await page.waitForTimeout(300);
    await page.screenshot({ path: P('tasks') });
    check('tasks mine has Rough cut', (await page.textContent('#m-tasks')).includes('Rough cut'));
    await page.click('[data-m-seg="task-scope"] [data-v="all"]'); await page.waitForTimeout(200);
    await page.screenshot({ path: P('tasks-all') });
    await page.fill('#m-task-search', 'carousel'); await page.waitForTimeout(200);
    const tq = await page.textContent('#m-tasks');
    check('search narrows', tq.includes('Carousel') && !tq.includes('Rough cut'));
    await page.fill('#m-task-search', '');
    await page.click('[data-m-seg="task-scope"] [data-v="mine"]');
  });
  await step('task', async () => {
    await page.click('#m-tasks [data-m-task="t1"]'); await page.waitForTimeout(600);
    await page.screenshot({ path: P('task') });
    const sb = await page.$('.m-screen .m-screen-body');
    await sb.evaluate(e => e.scrollTo(0, 3000)); await page.waitForTimeout(200);
    await page.screenshot({ path: P('task-bottom') });
    await page.click('.m-screen [data-m-act="status"][data-status="Review"]'); await page.waitForTimeout(400);
    check('status saved', await page.evaluate(() => window.__fb.data.tasks.t1.status === 'Review'));
    check('phone asks who the review is for', await page.evaluate(() => !document.getElementById('confirm-modal').classList.contains('hidden')));
    await page.screenshot({ path: P('review-prompt') });
    await page.click('#confirm-ok-btn'); await page.waitForTimeout(400);
    check('review audience saved from the phone', await page.evaluate(() => !!window.__fb.data.tasks.t1.reviewAudience));
    await page.fill('.m-screen [data-m-form="comment"] textarea', 'Rough cut uploaded');
    await page.click('.m-screen [data-m-form="comment"] .m-send'); await page.waitForTimeout(400);
    check('comment saved', await page.evaluate(() => (window.__fb.data.tasks.t1.comments || []).some(c => c.text === 'Rough cut uploaded')));
    await sb.evaluate(e => e.scrollTo(0, 0));
    await page.click('.m-screen .m-section-head [data-m-act="add-update"]'); await page.waitForTimeout(500);
    await page.screenshot({ path: P('sheet-update') });
    await page.fill('.m-sheet textarea', 'Waiting on client feedback');
    await page.click('.m-sheet .m-btn'); await page.waitForTimeout(700);
    check('status update saved', await page.evaluate(() => (window.__fb.data.tasks.t1.statusUpdates || []).some(u => u.text === 'Waiting on client feedback')));
    check('sheet closed', !(await page.$('.m-sheet.m-in')));
    await page.screenshot({ path: P('task-after') });
    await page.click('.m-screen .m-back'); await page.waitForTimeout(500);
    check('screen popped', (await page.$$('.m-screen')).length === 0);
  });
  await step('calendar', async () => {
    await page.click('[data-m-tab="calendar"]'); await page.waitForTimeout(300);
    await page.screenshot({ path: P('calendar') });
    await page.click('[data-m-seg="cal-scope"] [data-v="all"]'); await page.waitForTimeout(200);
    await page.screenshot({ path: P('calendar-all') });
  });
  await step('chat', async () => {
    await page.click('[data-m-tab="chat"]'); await page.waitForTimeout(300);
    await page.screenshot({ path: P('chats') });
    await page.click('#m-chat [data-m-chat="GWS recording"]'); await page.waitForTimeout(600);
    await page.screenshot({ path: P('chat-thread') });
    await page.fill('.m-screen [data-m-form="chat"] textarea', 'Sure, 2pm works');
    await page.click('.m-screen [data-m-form="chat"] .m-send'); await page.waitForTimeout(400);
    check('chat sent', await page.evaluate(() => window.__fb.data.projects.p1.chat.some(m => m.text === 'Sure, 2pm works')));
    await page.screenshot({ path: P('chat-sent') });
    await page.goBack(); await page.waitForTimeout(500);
    check('browser back pops', (await page.$$('.m-screen')).length === 0);
  });
  await step('more', async () => {
    await page.click('[data-m-tab="more"]'); await page.waitForTimeout(300);
    await page.screenshot({ path: P('more') });
    for (const g of ['monday', 'wip', 'people', 'projects', 'notifications', 'updates']) {
      await page.click('#m-more [data-m-go="' + g + '"]'); await page.waitForTimeout(600);
      await page.screenshot({ path: P('scr-' + g) });
      await page.goBack(); await page.waitForTimeout(450);
    }
    await page.click('#m-more [data-m-go="projects"]'); await page.waitForTimeout(500);
    await page.click('.m-screen [data-m-project="271231[LittlePaddington]MarketingAgencyPartner2027"]'); await page.waitForTimeout(500);
    await page.screenshot({ path: P('scr-project') });
    await page.goBack(); await page.waitForTimeout(450); await page.goBack(); await page.waitForTimeout(450);
    await page.click('#m-more [data-m-person]'); await page.waitForTimeout(500);
    await page.screenshot({ path: P('scr-person') });
    await page.goBack(); await page.waitForTimeout(450);
  });
  await step('quick add', async () => {
    await page.click('[data-m-tab="tasks"]'); await page.waitForTimeout(200);
    await page.click('[data-m-pane="tasks"] [data-m-act="quick-add"]'); await page.waitForTimeout(500);
    await page.screenshot({ path: P('quick-add') });
    await page.fill('.m-sheet [name="name"]', 'call the venue');
    await page.fill('.m-sheet [name="project"]', 'GWS recording');
    await page.click('.m-sheet [data-m-seg="qa-prio"] [data-v="High"]');
    await page.click('.m-sheet [type="submit"]'); await page.waitForTimeout(600);
    check('quick add saved', await page.evaluate(() => Object.values(window.__fb.data.tasks).some(t => t.name === 'Call the venue' && t.priority === 'High' && t.createdBy === 'Deane Cheng')));
  });
  await step('weekly', async () => {
    await page.click('[data-m-tab="home"]'); await page.waitForTimeout(200);
    await page.$eval('[data-m-pane="home"]', e => e.scrollTo(0, 0));
    await page.click('#m-home [data-weekly-write]'); await page.waitForTimeout(500);
    await page.screenshot({ path: P('weekly-editor') });
    check('weekly editor open', await page.$eval('#weekly-modal', e => !e.classList.contains('hidden')));
    await page.click('#weekly-modal-close'); await page.waitForTimeout(300);
  });
  await step('notif', async () => {
    await page.click('[data-m-pane="home"] [data-m-go="notifications"]'); await page.waitForTimeout(500);
    await page.click('[data-m-notif="n1"]'); await page.waitForTimeout(600);
    check('notif opens chat', (await page.$$eval('.m-screen', ss => ss.length)) === 2);
    check('notif marked read', await page.evaluate(() => window.__fb.data.notifications.n1.read === true));
  });
  const ow = await page.evaluate(() => document.documentElement.scrollWidth);
  check('no sideways scroll', ow <= 390, ow);
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(500);
  check('desktop at wide width', (await page.evaluate(() => !document.documentElement.classList.contains('m-mode'))) && (await page.$eval('#app', e => getComputedStyle(e).display !== 'none')));
  console.log(results.join('\n'));
  console.log('errors', errors);
  await browser.close();
})();
