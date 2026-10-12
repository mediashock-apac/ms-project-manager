// icon-motion -- every clickable icon plays its own hover motion (ICON HOVER MOTION in index.html); label icons stay still; none under reduced motion. Browser test against index.html with Firebase stubbed (see tests/README.md).
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

// Forces :hover on an element through the DevTools protocol, so every icon can be checked without
// the mouse having to reach it (many sit in menus, hidden rows or under other panels).
async function forceHover(cdp, page, el, on) {
  await page.evaluate(e => e.setAttribute('data-ic-probe', '1'), el);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-ic-probe]' });
  await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: on ? ['hover'] : [] });
  await page.evaluate(e => e.removeAttribute('data-ic-probe'), el);
}
// Names of the animations running on an icon's parts.
const partAnims = (page, svg) => page.evaluate(s => [...s.children].map(c => getComputedStyle(c).animationName).filter(n => n && n !== 'none'), svg);

(async () => {
  const browser = await chromium.launch();
  {
    const { page, ctx, errors } = await newPage(browser, '2026-10-07T10:00:00+08:00');
    await skipTours(page);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const INT = 'button,a,[role="button"],summary,label';
    const missing = new Set(), seen = new Set();
    const sweep = async () => {
      const svgs = await page.$$('svg[data-ic]');
      for (const svg of svgs) {
        const info = await svg.evaluate((s, INT) => {
          const p = s.parentElement;
          const clickable = p.matches(INT) || !!p.querySelector(':scope > input, :scope > select');
          return { ic: s.getAttribute('data-ic'), clickable, shown: s.getBoundingClientRect().width > 0 };
        }, INT);
        if (!info.clickable || seen.has(info.ic)) continue;
        const parent = await svg.evaluateHandle(s => s.parentElement);
        await forceHover(cdp, page, parent, true);
        const anims = await partAnims(page, svg);
        await forceHover(cdp, page, parent, false);
        seen.add(info.ic);
        if (!anims.length) missing.add(info.ic);
      }
    };
    await sweep();
    for (const v of ['gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'suggestions', 'archived', 'updates', 'board']) {
      await page.click('[data-view-btn="' + v + '"]'); await page.waitForTimeout(700); await skipTours(page); await sweep();
    }
    await page.click('#user-menu-trigger'); await page.waitForTimeout(300); await sweep();
    await page.keyboard.press('Escape');
    check('every clickable icon has a motion of its own', missing.size === 0, 'no motion: ' + [...missing].join(', ') + ' | checked ' + seen.size + ': ' + [...seen].join(' '));
    check('sweep reached the main icon kinds', ['trash', 'pencil', 'bell', 'plus', 'chevronDown', 'search', 'columns', 'gantt', 'calendar', 'megaphone'].every(n => seen.has(n)), [...seen].join(' '));

    // Each icon acts out its own meaning: spot-check a few distinct ones.
    const motionOf = async (sel) => {
      const svg = await page.$(sel); const parent = await svg.evaluateHandle(s => s.parentElement);
      await forceHover(cdp, page, parent, true); const a = await partAnims(page, svg); await forceHover(cdp, page, parent, false); return a;
    };
    const bell = await motionOf('#btn-notifications > svg[data-ic="bell"]');
    check('bell rings with a swinging clapper', bell.includes('ic-ring') && bell.includes('ic-clapper'), bell.join(','));
    const add = await motionOf('#btn-add-task > svg[data-ic="plus"]');
    check('Add Task plus turns like a dial', add.includes('ic-add'), add.join(','));
    const board = await motionOf('[data-view-btn="board"] > svg');
    const timeline = await motionOf('[data-view-btn="gantt"] > svg');
    check('Board and Timeline sidebar icons move differently', board.length && timeline.length && board.join() !== timeline.join(), board + ' / ' + timeline);

    // A label icon (the calendar beside a deadline on a Board row) stays still while its row is hovered.
    const label = await page.$('#view-board .task-card svg[data-ic="calendar"]');
    if (label) {
      const row = await label.evaluateHandle(s => s.closest('.task-card'));
      await forceHover(cdp, page, row, true); const a = await partAnims(page, label); await forceHover(cdp, page, row, false);
      check('a label icon stays still on hover', a.length === 0, a.join(','));
    } else check('a label icon stays still on hover (deadline calendar found)', false);

    // The real mouse: hovering the collapse button plays its motion; nothing else on screen moves.
    // (Keyboard focus also plays an icon's motion, so drop the focus Escape left on the profile button.)
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.hover('#sb-collapse-btn'); await page.waitForTimeout(120);
    const live = await page.evaluate(() => [...document.querySelectorAll('svg[data-ic] > *')].filter(c => getComputedStyle(c).animationName.startsWith('ic-')).map(c => c.parentElement.getAttribute('data-ic')));
    check('only the hovered icon moves', live.length > 0 && live.every(n => n === 'collapse'), live.join(','));
    check('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await newPage(browser, '2026-10-07T10:00:00+08:00', { reducedMotion: 'reduce' });
    await skipTours(page);
    await page.hover('#btn-notifications'); await page.waitForTimeout(120);
    const a = await page.$eval('#btn-notifications > svg', s => [...s.children].map(c => getComputedStyle(c).animationName).filter(n => n.startsWith('ic-')));
    check('reduced motion: icons stay still', a.length === 0, a.join(','));
    check('no page errors (reduced motion)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
