// team-tiles -- each teamspace has its colour + icon in the switcher, menu, chips, Monday headings; one-off animation on switch. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
(async () => {
  const browser = await chromium.launch();
  for (const dark of [false, true]) {
    const { page, errors, ctx } = await newPage(browser, '2026-10-06T11:00:00', { colorScheme: dark ? 'dark' : 'light' });
    await skipTours(page);
    const tag = dark ? ' (dark)' : '';
    if (!dark) {
      check('This Week count shown on load', await page.isVisible('#digest-badge'));
      check('no red count pops just from loading', (await page.evaluate(() => window.__pops)) === 0, await page.evaluate(() => window.__pops));
      check('switcher shows a tile', !!(await page.$('#teamspace-trigger .ts-tile')));
      await page.click('#teamspace-trigger'); await page.waitForTimeout(200);
      check('menu: a tile on every option (6)', (await page.$$('#teamspace-menu [data-teamspace] .ts-tile')).length === 6);
      check('menu: each team has its own icon', (await page.$$eval('#teamspace-menu .ts-tile svg', s => new Set(s.map(x => x.innerHTML)).size)) === 6);
    } else {
      await page.click('#teamspace-trigger'); await page.waitForTimeout(200);
    }
    await page.screenshot({ path: path.join(OUT, 'team-menu' + (dark ? '-dark' : '') + '.png'), clip: { x: 0, y: 0, width: 300, height: 360 } });
    await page.click('#teamspace-menu [data-teamspace="suits"]'); await page.waitForTimeout(80);
    if (!dark) {
      check('switching plays the one-off animation', await page.$eval('#teamspace-tile-wrap', e => e.classList.contains('ts-anim')));
      check('button takes the team tint', await page.$eval('#teamspace-trigger', e => e.classList.contains('bg-blue-50')));
      check('button tile is the Suits one', !!(await page.$('#teamspace-trigger .ts-suits')));
      await page.waitForTimeout(1100);
      check('animation class removed afterwards', !(await page.$eval('#teamspace-tile-wrap', e => e.classList.contains('ts-anim'))));
      await page.click('#teamspace-trigger'); await page.click('#teamspace-menu [data-teamspace="all"]'); await page.waitForTimeout(200);
      check('All is neutral again', await page.$eval('#teamspace-trigger', e => !e.className.includes('blue-50') && e.classList.contains('bg-zinc-50')));
      await page.click('#teamspace-trigger'); await page.click('#teamspace-menu [data-teamspace="production"]'); await page.waitForTimeout(300);
    } else { await page.waitForTimeout(1100); }
    for (const t of ['suits','production','copy','admin']) {
      await page.click('#teamspace-trigger'); await page.click('#teamspace-menu [data-teamspace="' + t + '"]'); await page.waitForTimeout(1100);
      await page.screenshot({ path: path.join(OUT, 'team-btn-' + t + (dark ? '-dark' : '') + '.png'), clip: { x: 0, y: 64, width: 260, height: 56 } });
      if (!dark && t === 'production') check('one team chosen: button patterned', await page.$eval('#teamspace-trigger', e => e.classList.contains('ts-patterned')) && !!(await page.$('#teamspace-watermark svg')));
    }
    await page.click('#teamspace-trigger'); await page.click('#teamspace-menu [data-teamspace="suits"]'); await page.waitForTimeout(1100);
    await page.screenshot({ path: path.join(OUT, 'team-button' + (dark ? '-dark' : '') + '.png'), clip: { x: 0, y: 0, width: 300, height: 120 } });
    // collapsed rail
    if (!dark) {
      await page.click('#sb-collapse-btn'); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, 'team-collapsed.png'), clip: { x: 0, y: 0, width: 120, height: 120 } });
      await page.click('#sb-collapse-btn'); await page.waitForTimeout(400);
      await page.click('#teamspace-trigger'); await page.click('#teamspace-menu [data-teamspace="all"]'); await page.waitForTimeout(200);
      await page.click('[data-view-btn="people"]'); await page.waitForTimeout(900); await skipTours(page);
      check('People chips carry the team icon', (await page.$$('#people-grid span.rounded svg')).length > 0 && /Creative\/Post/.test(await page.textContent('#people-grid')));
      // one dropdown at a time (reported: team menu and profile menu open together)
      await page.click('#teamspace-trigger'); await page.waitForTimeout(150);
      await page.click('#user-chip'); await page.waitForTimeout(150);
      check('opening the profile menu closes the team menu', await page.isVisible('#user-menu-panel') && !(await page.isVisible('#teamspace-menu')));
      await page.click('#teamspace-trigger'); await page.waitForTimeout(150);
      check('opening the team menu closes the profile menu', await page.isVisible('#teamspace-menu') && !(await page.isVisible('#user-menu-panel')));
      await page.click('#btn-notifications'); await page.waitForTimeout(150);
      check('opening the bell closes the team menu', !(await page.isVisible('#teamspace-menu')));
      await page.keyboard.press('Escape'); await page.mouse.click(700, 500); await page.waitForTimeout(150);
      await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(1300); await skipTours(page);
      check('Monday group headings have a tile', (await page.$$('#view-weekly h3 .ts-tile')).length >= 3);
    }
    await page.mouse.click(700, 600); await page.waitForTimeout(150);
    await page.click('#btn-digest'); await page.waitForTimeout(300);
    const pb = await page.$eval('#digest-panel', e => { const r = e.getBoundingClientRect(); return { x: r.x - 60, y: r.y - 50, width: r.width + 120, height: Math.min(r.height, 420) + 80 }; });
    await page.screenshot({ path: path.join(OUT, 'digest-panel' + (dark ? '-dark' : '') + '.png'), clip: pb });
    if (dark) check('dark: floating panel lighter than the cards under it', await page.$eval('#digest-panel', e => getComputedStyle(e).backgroundColor) === 'rgb(45, 45, 50)', await page.$eval('#digest-panel', e => getComputedStyle(e).backgroundColor));
    await page.keyboard.press('Escape'); await page.mouse.click(700, 600);
    await page.click('#user-menu-trigger'); await page.waitForTimeout(300);
    const um = await page.evaluate(() => { const p = document.getElementById('user-menu-panel').getBoundingClientRect(), sb = document.getElementById('sidebar').getBoundingClientRect(), t = document.getElementById('user-menu-trigger').getBoundingClientRect(); return { beside: p.left >= sb.right, bottomAligned: Math.abs(p.bottom - t.bottom) < 12, onScreen: p.top >= 0, x: p.left, y: p.top, w: p.width, h: p.height }; });
    if (!dark) check('profile menu opens beside the profile, not over the sidebar', um.beside && um.bottomAligned && um.onScreen, JSON.stringify(um));
    await page.screenshot({ path: path.join(OUT, 'user-menu' + (dark ? '-dark' : '') + '.png'), clip: { x: 0, y: Math.max(0, um.y - 20), width: um.x + um.w + 20, height: Math.min(1000 - Math.max(0, um.y - 20), um.h + 120) } });
    await page.keyboard.press('Escape'); await page.mouse.click(700, 600);
    check('no page errors' + tag, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
