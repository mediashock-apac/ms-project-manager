// project-files -- a project card gathers every link used in the project (pinned, brief, task folder, steps, comments, status lines, chat). Browser test against index.html with Firebase stubbed (see tests/README.md).
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
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] }),
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
  try { localStorage.setItem('flowboard_dept_prompted', '1'); if (window.innerWidth < 768) localStorage.setItem('flowboard_mobile_desktop', '1'); } catch (e) {}
}

async function newPage(browser, when, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 1000 } }, opts || {}));
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
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.png') ? 'image/png' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors, await page.evaluate(() => document.getElementById('app') ? document.getElementById('app').className : 'no #app')); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
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
  for (const dark of [false, true]) {
    const { page, errors, ctx } = await newPage(browser, '2026-10-06T11:00:00', { colorScheme: dark ? 'dark' : 'light' });
    await skipTours(page);
    await page.evaluate(() => window.__fb.remote(function (d) {
      const t1 = d.tasks.t1;
      t1.driveLink = 'https://drive.google.com/drive/folders/gws';
      t1.checklist = [
        { id: 'c1', text: 'Final deck', due: '2026-10-08', done: false, link: 'https://docs.google.com/presentation/d/deck1/edit' },
        { id: 'c2', text: 'Cut v2', due: '2026-10-09', done: false, link: 'https://next.frame.io/project/cut2' },
        { id: 'c3', text: 'Client brief from Google', due: '', done: true, link: 'https://docs.google.com/document/d/clientbrief' }];
      t1.comments = [{ id: 'k1', text: '@Deane Cheng Added B-roll here https://next.frame.io/project/abc/view please check.', author: 'Mychelle Chen', date: '2026-10-05T03:00:00Z' },
                     { id: 'k2', text: 'Same deck again https://docs.google.com/presentation/d/deck1/edit', author: 'Arvind Kumaraguru', date: '2026-10-05T04:00:00Z' }];
      d.tasks.t2.driveLink = 'https://drive.google.com/drive/folders/other-project';
      d.projects.p1 = { name: 'GWS recording', deadline: null,
        links: [{ id: 'l1', label: 'Brand guidelines', url: 'https://drive.google.com/file/d/brand' }],
        chat: [{ id: 'm1', text: 'Budget sheet: https://docs.google.com/spreadsheets/d/sheet1', author: 'Arvind Kumaraguru', date: '2026-10-04T03:00:00Z' }],
        brief: { job: 'Recording', sections: [{ type: 'links', rows: [{ a: 'Logo pack', b: 'figma.com/file/logos' }] }, { type: 'budget', url: 'https://docs.google.com/spreadsheets/d/SECRET' }] } };
    }));
    await page.waitForTimeout(300);
    await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(1300); await skipTours(page);
    const card = '#projects-grid .project-files-toggle[data-project="GWS recording"]';
    const cardText = () => page.$eval(card, b => b.closest('.rounded-xl').innerText);
    if (!dark) check('toggle counts the useful links, not the chatter (folder, brief, 2 assets, 2 work = 6)', (await page.textContent(card)).trim() === 'Files & links · 6', (await page.textContent(card)).trim());
    await page.click(card); await page.waitForTimeout(400);
    const panel = await cardText();
    if (!dark) {
      const up = panel.toUpperCase(); let at = up.indexOf('PROJECT FOLDER');
      const order = ['PROJECT FOLDER', 'BRIEF', 'CLIENT ASSETS & GUIDELINES', 'WORK FILES', 'LINKS FROM COMMENTS & CHAT'].map(h => (at = up.indexOf(h, Math.max(at, 0))));
      check('sections by purpose, in order', order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), JSON.stringify(order));
      check('brief: the app brief and the brief link', /Open the creative brief/.test(panel) && /Client brief from Google/.test(panel));
      check('client assets: pinned link and the brief\'s links', /Brand guidelines/.test(panel) && /Logo pack/.test(panel) && /From the brief/.test(panel));
      check('work files: steps under their task', /WORK FILES[\s\S]*Rough cut[\s\S]*Final deck[\s\S]*Cut v2/i.test(panel));
      check('a link used in a step and a comment shows once, as a work file', (await page.$$eval('#projects-grid a[href="https://docs.google.com/presentation/d/deck1/edit"]', a => a.length)) === 1);
      check('comment and chat links folded away', !(await page.$('#projects-grid a[href*="frame.io/project/abc"]')));
      await page.click('#projects-grid .project-files-conv-toggle'); await page.waitForTimeout(300);
      const conv = await cardText();
      check('unfolding shows them, mentions stripped', !!(await page.$('#projects-grid a[href*="frame.io/project/abc"]')) && /Added B-roll here please check/.test(conv) && !/@Deane/.test(conv), conv.slice(-300));
      check('another project\'s folder not included', !(await page.$('#projects-grid a[href*="other-project"]')));
      check('brief budget link never included', !(await page.$('#projects-grid a[href*="SECRET"]')));
      // + Add a client asset
      await page.click('#projects-grid .project-link-add[data-project="GWS recording"]'); await page.waitForTimeout(200);
      await page.fill('#projects-grid .project-link-label', 'Font files');
      await page.fill('#projects-grid .project-link-url', 'drive.google.com/drive/folders/fonts');
      await page.keyboard.press('Enter'); await page.waitForTimeout(500);
      const links = await page.evaluate(() => (window.__fb.data.projects.p1.links || []).map(l => l.label + '|' + l.url));
      check('+ Add saves a pinned link (shared with chat)', links.includes('Font files|https://drive.google.com/drive/folders/fonts'), JSON.stringify(links));
      check('it shows under client assets', /Font files/.test(await cardText()));
      await page.click('#projects-grid .project-link-remove[data-link-id="l1"]'); await page.waitForTimeout(500);
      check('a pinned link can be removed', !(await page.evaluate(() => (window.__fb.data.projects.p1.links || []).some(l => l.id === 'l1'))));
    }
    const box = await page.$eval(card, b => { const r = b.closest('.rounded-xl').getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: Math.min(r.height + 16, 900) }; });
    await page.screenshot({ path: path.join(OUT, 'project-files' + (dark ? '-dark' : '') + '.png'), clip: box });
    check('no page errors' + (dark ? ' (dark)' : ''), errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
