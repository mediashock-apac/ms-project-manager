// project-actions -- the ⋯ on a project card: archive a whole project (done or not, with Undo), restore a completed one, and (admins only) merge a duplicate into another project, carrying tasks, archived tasks, chat, links and notes. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(asUser) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["page:projects","page:wip","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ priority: 'Medium', startDate: '2026-10-01', deadline: '2026-10-30', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }, o);
  const users = {
    deane: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg' },
    zenon: { uid: 'u4', displayName: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg' }
  };
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: Object.assign({ photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } }, users[asUser || 'deane']) },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'], favoriteChats: ['Dup Project'] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] })
      },
      tasks: {
        t1: T({ name: 'Edit', project: 'Dup Project', status: 'In Progress' }),
        t2: T({ name: 'Brief', project: 'Dup Project', status: 'Done' }),
        t3: T({ name: 'Shoot', project: 'Real Project', status: 'In Progress' }),
        t4: T({ name: 'Storyboard', project: 'Cancelled Job', status: 'In Progress' }),
        t5: T({ name: 'Kickoff', project: 'Cancelled Job', status: 'Done', completedAt: '2026-10-20T03:00:00Z' })
      },
      archivedTasks: {
        a1: T({ name: 'Old step', project: 'Dup Project', status: 'Done', archivedAt: '2026-10-02T00:00:00Z' }),
        a2: T({ name: 'Report', project: 'Old Job', status: 'Done', archivedAt: '2026-09-01T00:00:00Z' }),
        a3: T({ name: 'Wrap', project: 'Old Job', status: 'Done', archivedAt: '2026-09-01T00:00:00Z' })
      },
      projects: {
        p1: { name: 'Dup Project', deadline: '2026-11-01', wipNote: 'Dup note', clientContact: 'Amy', chat: [{ id: 'm1', text: 'From the duplicate', author: 'Deane Cheng', date: '2026-10-10T02:00:00Z', reactions: {} }], links: [{ id: 'l1', label: 'Guide', url: 'https://example.com/guide' }] },
        p2: { name: 'Real Project', deadline: '2026-12-01', wipNote: 'Real note', chat: [{ id: 'm2', text: 'From the real one', author: 'Deane Cheng', date: '2026-10-05T02:00:00Z', reactions: {} }], links: [{ id: 'l2', label: 'Deck', url: 'https://example.com/deck' }, { id: 'l3', label: 'Same guide', url: 'https://example.com/guide' }] }
      },
      activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); localStorage.setItem('flowboard_teamspace', 'all'); } catch (e) {}
}

async function newPage(browser, when, asUser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed, asUser);
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
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 });
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

const menu = (name) => '#projects-grid .project-menu-toggle[data-project="' + name + '"]';
const db = (page, fn) => page.evaluate(fn);

(async () => {
  const browser = await chromium.launch();
  const { page, ctx, errors } = await newPage(browser, '2026-10-21T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(900); await skipTours(page);
  { const sum = await page.$('#projects-completed-details > summary'); if (sum && !(await page.$eval('#projects-completed-details', d => d.open))) { await sum.click(); await page.waitForTimeout(300); } }

  // At rest: one quiet ⋯ per card and nothing else new
  const cards = await page.$$eval('#projects-grid .project-menu-toggle', els => els.length);
  check('every project card has one ⋯ (4 projects)', cards === 4, String(cards));
  check('no action row at rest', !(await page.$('#projects-grid .project-archive-all-btn, #projects-grid .project-restore-btn, #projects-grid .project-merge-start')));

  // Archive a project that isn't finished: asks first, then moves it to Completed, with Undo
  await page.click(menu('Cancelled Job')); await page.waitForTimeout(200);
  check('⋯ opens Archive project and (admin) Merge', !!(await page.$('#projects-grid .project-archive-all-btn[data-project="Cancelled Job"]')) && !!(await page.$('#projects-grid .project-merge-start[data-project="Cancelled Job"]')));
  await page.screenshot({ path: path.join(OUT, 'project-actions-row.png') });
  await page.click('#projects-grid .project-archive-all-btn[data-project="Cancelled Job"]'); await page.waitForTimeout(200);
  check('asks first because a task is not done', /1 of its 2 tasks isn't done yet/.test(await page.textContent('#confirm-body')), await page.textContent('#confirm-body'));
  await page.click('#confirm-ok-btn'); await page.waitForTimeout(500);
  check('both tasks archived, done or not', await db(page, () => !window.__fb.data.tasks.t4 && !window.__fb.data.tasks.t5 && !!window.__fb.data.archivedTasks.t4 && !!window.__fb.data.archivedTasks.t5));
  check('toast offers Undo', /Cancelled Job" moved to Completed/.test(await page.textContent('body')) && /Undo/.test(await page.textContent('body')));
  check('the action row closed after archiving', !(await page.$('#projects-grid .project-archive-all-btn')));

  // A project archived unfinished isn't "Finished this week" on WIP
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(900); await skipTours(page);
  check('cancelled project is not listed as finished on WIP', !/Finished this week/.test(await page.textContent('#view-wip')));
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(700);
  { const sum = await page.$('#projects-completed-details > summary'); if (sum && !(await page.$eval('#projects-completed-details', d => d.open))) { await sum.click(); await page.waitForTimeout(300); } }

  // Restore a completed project
  await page.click(menu('Old Job')); await page.waitForTimeout(200);
  check('completed card offers Restore project', !!(await page.$('#projects-grid .project-restore-btn[data-project="Old Job"]')) && !(await page.$('#projects-grid .project-archive-all-btn[data-project="Old Job"]')));
  await page.click('#projects-grid .project-restore-btn[data-project="Old Job"]'); await page.waitForTimeout(500);
  check('every task is back on the board', await db(page, () => !!window.__fb.data.tasks.a2 && !!window.__fb.data.tasks.a3 && !window.__fb.data.archivedTasks.a2));

  // Merge a duplicate (admin)
  await page.click(menu('Dup Project')); await page.waitForTimeout(200);
  await page.click('#projects-grid .project-merge-start[data-project="Dup Project"]'); await page.waitForTimeout(200);
  check('search box has focus', await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('project-merge-search')));
  await page.keyboard.type('real');
  await page.waitForTimeout(150);
  const opts = await page.$$eval('#projects-grid .project-merge-pick', els => els.map(e => e.getAttribute('data-target')));
  check('typing narrows the list and never offers the project itself', JSON.stringify(opts) === JSON.stringify(['Real Project']), JSON.stringify(opts));
  // A teammate's change arriving mid-search must not wipe the box or take the cursor
  await page.evaluate(() => window.__fb.remote(function (d) { d.tasks.t3.priority = 'High'; }));
  await page.waitForTimeout(400);
  check('a live change keeps the search text and focus', await page.evaluate(() => { var s = document.querySelector('.project-merge-search'); return !!s && s.value === 'real' && document.activeElement === s; }));
  await page.fill('.project-merge-search', 'zzz'); await page.waitForTimeout(150);
  check('no match says so', /No other project matches/.test(await page.textContent('#projects-grid .project-merge-results')));
  await page.fill('.project-merge-search', 'real'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'project-merge-search.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'project-merge-search-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.click('#projects-grid .project-merge-pick[data-target="Real Project"]'); await page.waitForTimeout(200);
  check('asks before merging, naming both projects', /Merge "Dup Project" into "Real Project"\?/.test(await page.textContent('#confirm-title')) && /3 tasks/.test(await page.textContent('#confirm-body')));
  await page.click('#confirm-ok-btn'); await page.waitForTimeout(700);
  const d = await db(page, () => window.__fb.data);
  check('active tasks moved', d.tasks.t1.project === 'Real Project' && d.tasks.t2.project === 'Real Project');
  check('archived tasks moved', d.archivedTasks.a1.project === 'Real Project');
  check('duplicate project record removed', !d.projects.p1);
  check('chats combined in date order', JSON.stringify(d.projects.p2.chat.map(m => m.id)) === JSON.stringify(['m2', 'm1']), JSON.stringify(d.projects.p2.chat.map(m => m.id)));
  check('links combined, the shared one once', d.projects.p2.links.length === 2, JSON.stringify(d.projects.p2.links));
  check('notes joined', d.projects.p2.wipNote === 'Real note\n\nDup note', JSON.stringify(d.projects.p2.wipNote));
  check('a field only the duplicate had comes across', d.projects.p2.clientContact === 'Amy');
  check('the target keeps its own deadline', d.projects.p2.deadline === '2026-12-01');
  check("the duplicate's deadline is saved, not lost", d.projects.p2.mergedFrom && d.projects.p2.mergedFrom[0].name === 'Dup Project' && d.projects.p2.mergedFrom[0].fields.deadline === '2026-11-01', JSON.stringify(d.projects.p2.mergedFrom));
  const act = Object.values(d.activity).find(a => a.type === 'project_merged');
  check('Activity records it and names what was kept', !!act && /Merged project Dup Project into Real Project \(3 tasks\)/.test(act.summary) && /kept its own deadline/.test(act.summary), act && act.summary);
  check('your favourite chat follows the merge', JSON.stringify(d.people.u1.favoriteChats) === JSON.stringify(['Real Project']), JSON.stringify(d.people.u1.favoriteChats));
  check('the duplicate is gone from Projects', !(await page.$(menu('Dup Project'))));
  check('no page errors (admin)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // Not an admin: Archive/Restore yes, Merge no
  const z = await newPage(browser, '2026-10-21T11:00:00', 'zenon');
  await skipTours(z.page);
  await z.page.click('[data-view-btn="projects"]'); await z.page.waitForTimeout(900); await skipTours(z.page);
  await z.page.click(menu('Real Project')); await z.page.waitForTimeout(200);
  check('non-admin sees Archive project', !!(await z.page.$('#projects-grid .project-archive-all-btn[data-project="Real Project"]')));
  check('non-admin does not see Merge', !(await z.page.$('#projects-grid .project-merge-start')));
  check('no page errors (non-admin)', z.errors.length === 0, z.errors.join(' | '));
  await z.ctx.close();

  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
