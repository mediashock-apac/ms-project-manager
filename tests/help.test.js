// help -- the floating "?" help panel (HELP in index.html): search finds the right article, Show me plays the page tour, "?" opens it, Escape backs out, Ask in Suggestions, desktop only. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-11-23d","cl-2026-11-04a","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
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
  await page.addInitScript(() => { window.__pops = 0; new MutationObserver(ms => ms.forEach(m => { if (m.target.classList && m.target.classList.contains('badge-pop')) window.__pops++; })).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] }); });
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


// The articles, read straight from index.html, so every one is checked (findable by its own words,
// its page and its button exist).
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const ARTS = new Function('return ' + html.slice(html.indexOf('var HELP_ARTICLES = [') + 'var HELP_ARTICLES = '.length, html.search(/\];\r?\n  var HELP_POPULAR/) + 1))();   // \r?: a Windows checkout has CRLF
const NAMES = new Function('return ' + html.match(/var HELP_PAGE_NAMES = (\{[^\n]*\});/)[1])();

async function ask(page, q) {
  await page.fill('#help-search', q);
  await page.waitForTimeout(80);
  return page.$$eval('#help-body [data-help-article]', bs => bs.map(b => b.getAttribute('data-help-article')));
}
// Open = actually on screen, not just the hidden flag (the panel's `flex` once beat [hidden], so it
// never closed while the flag said it had).
const panelOpen = (page) => page.$eval('#help-panel', p => p.getBoundingClientRect().width > 0);

(async () => {
  const browser = await chromium.launch();
  {
    const { page, ctx, errors } = await newPage(browser, '2026-10-07T10:00:00+08:00');
    await skipTours(page);
    const fab = await page.$('#help-fab');
    const fr = fab && await fab.boundingBox();
    check('help button sits in the bottom-right corner', !!fr && fr.x + fr.width > 1400 && fr.y + fr.height > 960, JSON.stringify(fr));
    check('panel starts closed', !(await panelOpen(page)));

    await page.click('#help-fab'); await page.waitForTimeout(150);
    check('clicking it opens the panel with the search focused', await panelOpen(page) && await page.evaluate(() => document.activeElement.id === 'help-search'));
    const groups = await page.$$eval('#help-body p', ps => ps.map(p => p.textContent));
    check('with nothing typed: On this page, then Popular', groups[0] === 'On this page' && groups.includes('Popular'), groups.join(','));
    const pb = await page.$eval('#help-panel', p => p.getBoundingClientRect().toJSON());
    check('panel opens above the button, on screen', pb.bottom <= fr.y && pb.top > 0 && pb.right <= 1440, JSON.stringify(pb));
    await page.screenshot({ path: 'help-open.png' });

    check('"book leave" finds Book time off', (await ask(page, 'book leave'))[0] === 'leave');
    check('a synonym works: "holiday" finds Book time off', (await ask(page, 'holiday')).includes('leave'));
    check('"how do I duplicate a task" finds Duplicate a task', (await ask(page, 'how do I duplicate a task'))[0] === 'duplicate-task');
    check('"logging hours" finds Log time', (await ask(page, 'logging hours'))[0] === 'log-time');
    check('a partial word: "remin" finds reminders', (await ask(page, 'remin'))[0] === 'reminders');

    const lost = [];
    for (const a of ARTS) { const r = await ask(page, a.title); if (r.indexOf(a.id) === -1 || r.indexOf(a.id) > 2) lost.push(a.id + '@' + r.indexOf(a.id)); }
    check('every article is found by its own title (top 3)', lost.length === 0, lost.join(', '));
    const badPage = ARTS.filter(a => a.page && !NAMES[a.page]).map(a => a.id);
    check('every article page is a real page', badPage.length === 0, badPage.join(', '));
    const badAct = [];
    for (const a of ARTS.filter(a => a.act)) if (!(await page.$(a.act.click))) badAct.push(a.id);
    check('every article button points at something that exists', badAct.length === 0, badAct.join(', '));
    check('ids are unique', new Set(ARTS.map(a => a.id)).size === ARTS.length);

    await ask(page, 'book leave');
    await page.press('#help-search', 'Enter'); await page.waitForTimeout(100);
    const art = await page.$eval('#help-body', b => b.textContent);
    check('Enter opens the top article', /Book time off/.test(art) && /Show me/.test(art) && /Go to People/.test(art), art.slice(0, 120));
    check('search box hidden while reading', await page.$eval('#help-search-wrap', w => w.getBoundingClientRect().height === 0));
    await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    check('Escape goes back to the results, query kept', await panelOpen(page) && await page.evaluate(() => document.getElementById('help-search-wrap').getBoundingClientRect().height > 0 && document.getElementById('help-search').value === 'book leave'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    check('second Escape closes it', !(await panelOpen(page)));

    await page.click('#help-fab'); await page.waitForTimeout(100);
    await page.click('[data-help-close]'); await page.waitForTimeout(100);
    check('the X closes it', !(await panelOpen(page)));

    await page.keyboard.press('Shift+Slash'); await page.waitForTimeout(100);
    check('"?" opens help', await panelOpen(page));
    await page.type('#help-search', '?'); await page.waitForTimeout(60);
    check('typing "?" in the help search just types it', await panelOpen(page) && (await page.inputValue('#help-search')).endsWith('?'));
    await page.click('#header-row-inner', { position: { x: 3, y: 3 } }); await page.waitForTimeout(80);
    check('an outside click closes it', !(await panelOpen(page)));
    await page.click('#filter-search'); await page.keyboard.type('?'); await page.waitForTimeout(80);
    check('"?" in the board search does not open help', !(await panelOpen(page)));
    await page.fill('#filter-search', ''); await page.evaluate(() => document.activeElement.blur());

    await page.click('#help-fab'); await ask(page, 'book leave');
    await page.click('#help-body [data-help-article="leave"]'); await page.waitForTimeout(80);
    await page.click('[data-help-show]'); await page.waitForTimeout(1200);
    check('Show me opens People and plays its tour', await page.evaluate(() => !document.getElementById('view-people').classList.contains('hidden') && !!document.getElementById('tour-card')));
    await skipTours(page);

    await page.click('#help-fab'); await page.click('[data-help-back]').catch(() => {});
    await ask(page, 'add a task'); await page.click('#help-body [data-help-article="add-task"]'); await page.waitForTimeout(80);
    await page.click('[data-help-act]'); await page.waitForTimeout(400);
    check('"Add a task now" opens the task window', await page.$eval('#task-modal', m => !m.classList.contains('hidden')));
    await page.click('#task-cancel-btn'); await page.waitForTimeout(300);
    if (await page.$eval('#task-modal', m => !m.classList.contains('hidden'))) { await page.click('#confirm-ok-btn').catch(() => {}); await page.waitForTimeout(300); }
    check('task window closed again', await page.$eval('#task-modal', m => m.classList.contains('hidden')));

    await page.click('#help-fab'); await page.click('[data-help-back]').catch(() => {});
    const none = await ask(page, 'how do I teleport the printer');
    check('no match says so', none.length === 0 && /Nothing on that yet/.test(await page.$eval('#help-body', b => b.textContent)));
    await page.click('[data-help-ask]'); await page.waitForTimeout(400);
    const sv = await page.inputValue('#suggestion-input');
    check('Ask in Suggestions opens Suggestions with the question filled in', /teleport the printer/.test(sv) && !/how do i how/i.test(sv), sv);

    const tc = await page.$eval('#toast-container', t => t.getBoundingClientRect().bottom);
    check('toasts sit above the help button', tc <= fr.y + 1, tc + ' vs ' + fr.y);

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.click('#help-fab'); await page.click('[data-help-back]').catch(() => {}); await ask(page, ''); await page.waitForTimeout(150);
    await page.screenshot({ path: 'help-dark.png' });
    await ask(page, 'book leave'); await page.press('#help-search', 'Enter'); await page.waitForTimeout(150);
    await page.screenshot({ path: 'help-dark-article.png' });
    await page.evaluate(() => document.documentElement.classList.add('m-mode'));
    check('not on the phone layout (hidden with the desktop app)', await page.$eval('#help-fab', f => f.getBoundingClientRect().width === 0));
    await page.evaluate(() => document.documentElement.classList.remove('m-mode'));
    check('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
