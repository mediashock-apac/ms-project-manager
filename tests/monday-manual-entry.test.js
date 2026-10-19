// monday-manual-entry -- "+ Add a project" in the Monday editor, and admins filling in for someone with no update. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const as = opts && opts.__as;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed);
  // Sign in as someone else from the seed (default Deane, an admin).
  if (as) await page.addInitScript((id) => { var p = window.__fb.data.people[id]; window.__fb.auth.currentUser = { uid: id, displayName: p.name, email: p.email, photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } }; }, as);
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
  const people = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__fb.data.people)));
  const card = (page, who) => page.$$eval('#weekly-view section', (ss, who) => { var s = ss.find(x => x.getAttribute('data-weekly-card') === who); return s ? s.innerText.replace(/​/g, '') : ''; }, who);
  // Project names carry zero-width break points (projectNameHtml); compare without them.
  const bodyText = async (pg) => (await pg.textContent('#weekly-modal-body')).replace(/​/g, '');
  const lastSelect = (pg) => pg.$$eval('#weekly-modal-body [data-weekly-select]', ss => ss[ss.length - 1].getAttribute('data-weekly-select'));

  // ---------- Tuesday 6 Oct, admin (Deane) ----------
  const { page, errors } = await newPage(browser, '2026-10-06T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="weekly"]');
  await page.waitForTimeout(1100);
  await skipTours(page);

  check('admin: Fill in for Zenon on a Not in yet card', (await card(page, 'Zenon Kwok Ze Yong')).includes('Fill in for Zenon'));
  check('admin: no Fill in on own card', !(await page.$('#weekly-view [data-weekly-card="Deane Cheng"] [data-weekly-edit]')));

  await page.click('#weekly-view [data-weekly-card="Zenon Kwok Ze Yong"] [data-weekly-edit]');
  await page.waitForSelector('#weekly-modal:not(.hidden)');
  const title = await page.textContent('#weekly-modal-title');
  check('editor titled with their name', title.startsWith('Zenon') && title.includes('Oct 5'), title);
  const body0 = await bodyText(page);
  check('their board projects listed, not mine', body0.includes('Mediashock LinkedIn') && body0.includes('Lark AI') && !body0.includes('SMB webinars'), body0.slice(0, 200));

  await page.click('#weekly-modal [data-weekly-add]');
  check('search box focused', await page.evaluate(() => document.activeElement && document.activeElement.id === 'weekly-add-input'));
  await page.keyboard.type('zzz');
  check('no match message', (await page.textContent('#weekly-add-list')).includes('No open project matches'));
  await page.fill('#weekly-add-input', 'p1');
  check('projects already listed are not offered', !(await page.textContent('#weekly-add-list')).includes('P1'));
  await page.fill('#weekly-add-input', 'gws rec');
  const offered = await page.$$eval('#weekly-add-list [data-weekly-pick]', bs => bs.map(b => b.textContent.replace(/​/g, '')));
  check('search matches every word', JSON.stringify(offered) === JSON.stringify(['GWS recording']), JSON.stringify(offered));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('Enter adds the top match and keeps the editor open', await page.$eval('#weekly-modal', e => !e.classList.contains('hidden')) && (await bodyText(page)).includes('GWS recording'));
  check('added row has Remove and its own status dropdown', (await page.$$('#weekly-modal-body [data-weekly-remove]')).length === 1);
  const gi = await lastSelect(page);
  await page.selectOption('#weekly-modal [data-weekly-select="' + gi + '"]', 'help');
  await page.waitForTimeout(100);
  await page.fill('#weekly-modal [data-weekly-note="' + gi + '"]', 'Needs the speaker list');
  check('picking a status shows the project\'s latest board status', (await bodyText(page)).includes('Waiting on speaker list from client'));
  // Add another and remove it
  await page.click('#weekly-modal [data-weekly-add]');
  await page.fill('#weekly-add-input', 'smb');
  await page.click('#weekly-add-list [data-weekly-pick="0"]');
  await page.waitForTimeout(100);
  check('second project added', (await page.$$('#weekly-modal-body [data-weekly-remove]')).length === 2);
  const rIdx = await page.$$eval('#weekly-modal-body [data-weekly-remove]', bs => bs[bs.length - 1].getAttribute('data-weekly-remove'));
  await page.click('#weekly-modal [data-weekly-remove="' + rIdx + '"]');
  check('Remove drops it, note on the other kept', !(await bodyText(page)).includes('SMB webinars') && await page.$eval('#weekly-modal [data-weekly-note="' + gi + '"]', e => e.value === 'Needs the speaker list'));
  await page.selectOption('#weekly-modal [data-weekly-select="0"]', 'ontrack');
  await page.click('#weekly-modal [data-weekly-send]');
  await page.waitForTimeout(300);
  check('modal closed after save', await page.$eval('#weekly-modal', e => e.classList.contains('hidden')));
  let ppl = await people(page);
  const zEntry = (ppl.u4.weekly || []).find(e => e.week === '2026-10-05');
  check('saved to Zenon\'s own doc', !!zEntry && zEntry.rows.length === 2, JSON.stringify(zEntry));
  check('marked as entered by Deane', zEntry && zEntry.editedBy === 'Deane Cheng');
  check('tagged project saved by name', zEntry && zEntry.rows.some(r => r.project === 'GWS recording' && r.status === 'help' && r.note === 'Needs the speaker list'));
  check('tagged project not saved as followed', zEntry && (zEntry.follows || []).indexOf('GWS recording') === -1, JSON.stringify(zEntry && zEntry.follows));
  check('my own doc untouched', !(ppl.u1.weekly || []).some(e => e.week === '2026-10-05'));
  await page.waitForTimeout(300);
  const zc = await card(page, 'Zenon Kwok Ze Yong');
  check('card shows the update and who entered it', /by Deane/.test(zc) && zc.includes('Needs the speaker list') && !zc.includes('Not in yet'), zc);
  check('Needs help box picks it up', (await page.textContent('#weekly-view')).includes('Needs the speaker list'));
  check('empty-card button gone once filled in', !(await card(page, 'Zenon Kwok Ze Yong')).includes('Fill in for'));

  // My own update, with a project the board doesn't list for me
  await page.click('#weekly-view [data-weekly-write]');
  await page.waitForSelector('#weekly-modal:not(.hidden)');
  await page.click('#weekly-modal [data-weekly-add]');
  await page.fill('#weekly-add-input', 'linkedin');
  await page.click('#weekly-add-list [data-weekly-pick="0"]');
  await page.waitForTimeout(100);
  const mi = await lastSelect(page);
  await page.selectOption('#weekly-modal [data-weekly-select="' + mi + '"]', 'ontrack');
  await page.click('#weekly-modal [data-weekly-send]');
  await page.waitForTimeout(300);
  ppl = await people(page);
  const mine = (ppl.u1.weekly || []).find(e => e.week === '2026-10-05');
  check('own update saves the added project, no editedBy', !!mine && mine.rows.some(r => r.project === 'Mediashock LinkedIn') && !mine.editedBy, JSON.stringify(mine));
  await page.click('#weekly-view [data-weekly-card="Deane Cheng"] [data-weekly-edit]');
  await page.waitForSelector('#weekly-modal:not(.hidden)');
  check('reopened: added project still there with Remove', (await page.$$('#weekly-modal-body [data-weekly-remove]')).length === 1 && (await bodyText(page)).includes('Mediashock LinkedIn'));
  await page.screenshot({ path: path.join(OUT, 'wk-manual-editor.png') });
  await page.keyboard.press('Escape');
  check('no page errors (admin)', errors.length === 0, errors.slice(0, 3).join(' | '));

  // ---------- Not an admin (Zenon signed in) ----------
  const z = await newPage(browser, '2026-10-06T11:00:00', { __as: 'u4' });
  await skipTours(z.page);
  // Zenon has a task due today, so a heads-up may open first.
  if (await z.page.$('#confirm-modal:not(.hidden)')) { await z.page.keyboard.press('Escape'); await z.page.waitForTimeout(200); }
  await z.page.click('[data-view-btn="weekly"]');
  await z.page.waitForTimeout(1100);
  await skipTours(z.page);
  check('non-admin: no Fill in buttons', !/Fill in for/.test(await z.page.textContent('#weekly-view')));
  await z.page.click('#weekly-view [data-weekly-write]');
  await z.page.waitForSelector('#weekly-modal:not(.hidden)');
  check('non-admin: can still add a project to their own update', !!(await z.page.$('#weekly-modal [data-weekly-add]')));
  check('no page errors (non-admin)', z.errors.length === 0, z.errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
