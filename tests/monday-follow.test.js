// monday-follow -- Monday updates: a project's owner answers for people only attached to it, and
// upcoming leave shows on the page. Browser test against index.html with Firebase stubbed (see
// tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');
const OUT = process.cwd();   // tests/.out when run by run.mjs

// The same "every tour already seen" list as the Monday suite, so no tour gets in the way.
const TOURS = JSON.parse(fs.readFileSync(path.join(__dirname, 'monday-meeting.test.js'), 'utf8').match(/toursSeen: (\[[^\]]*\])/)[1]);

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed(tours) {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: tours, updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ priority: 'Medium', status: 'In Progress', startDate: '2026-10-01', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'],
          weekly: [{ week: '2026-10-05', rows: [{ project: 'Lark AI', status: 'client', note: 'Client to approve the script' }], extra: '', leave: false, at: '2026-10-05T01:00:00Z' }] }),
        u3: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['admin'], leave: [
          { id: 'l1', start: '2026-10-07', end: '2026-10-09', note: 'Hospital' },
          { id: 'l2', start: '2026-10-26', end: '2026-10-30', note: '' },
          { id: 'l3', start: '2026-12-01', end: '2026-12-05', note: 'Far off' },
          { id: 'l4', start: '2026-09-21', end: '2026-09-22', note: 'Recent trip' }, { id: 'l5', start: '2026-08-03', end: '2026-08-04', note: 'Old trip' }] })
      },
      tasks: {
        // Deane is only involved in Lark AI, only on a step in GWS recording, and owns My own thing.
        t1: T({ name: 'Script', project: 'Lark AI', deadline: '2026-10-12', assignee: 'Arvind Kumaraguru', involved: ['Deane Cheng'] }),
        t2: T({ name: 'Edit', project: 'GWS recording', deadline: '2026-10-14', assignee: 'Arvind Kumaraguru', checklist: [{ id: 'c1', text: 'Rough cut', due: '2026-10-09', done: false, assignees: ['Deane Cheng'], assignee: 'Deane Cheng' }] }),
        t3: T({ name: 'Deck', project: 'My own thing', deadline: '2026-10-15', assignee: 'Deane Cheng', checklist: [
          { id: 's1', text: 'Step one', due: '2026-10-08', done: false }, { id: 's2', text: 'Step two', due: '2026-10-09', done: false },
          { id: 's3', text: 'Step three', due: '2026-10-10', done: false }, { id: 's4', text: 'Step four', due: '2026-10-13', done: false }] })
      },
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
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.png') ? 'image/png' : 'text/plain';
    r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
  await page.goto('http://pm.test/');
  await page.waitForFunction(() => { const a = document.getElementById('app'), m = document.getElementById('m-app'); return (a && !a.classList.contains('hidden')) || (m && m.offsetHeight > 0); }, null, { timeout: 15000 });
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

// The editor row index whose project block contains `project`, for a button matching `sel`.
function rowOf(page, sel, attr, project) {
  return page.evaluate(([sel, attr, project]) => {
    const b = [...document.querySelectorAll('#weekly-modal-body ' + sel)].find(x => x.closest('[data-weekly-project-row]').textContent.includes(project));
    return b ? b.getAttribute(attr) : null;
  }, [sel, attr, project]);
}

(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await newPage(browser, '2026-10-06T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(1300); await skipTours(page);

  // ---------- Upcoming leave ----------
  const away = await page.innerText('[data-weekly-card="Chloe Hu"]');
  check('no Away box collated at the top', !(await page.evaluate(() => [...document.querySelectorAll('#weekly-view h2')].some(x => /Away/.test(x.textContent)))));
  check("leave sits on the person's own card", /Away[\s\S]*Oct 7 – Oct 9 · 3 days · Hospital[\s\S]*Oct 26 – Oct 30 · 5 days/.test(away), away);
  check('leave beyond 4 weeks is left out', !/Far off/.test(away));
  check('leave this week is marked', /Hospital\s*This week/.test(away), away);
  check("no Away row on a card with no leave", !/Away/.test(await page.innerText('[data-weekly-card="Arvind Kumaraguru"]')));

  // ---------- Editor: owner-covered project isn't asked ----------
  await page.click('#weekly-view [data-weekly-write]'); await page.waitForSelector('#weekly-modal:not(.hidden)');
  const body = await page.textContent('#weekly-modal-body');
  check("covered project shows the owner's answer", /Lark AI[\s\S]*Arvind: Waiting on client[\s\S]*Client to approve the script/.test(body), body.slice(0, 300));
  const own = await rowOf(page, '[data-weekly-own]', 'data-weekly-own', 'Lark AI');
  check('covered project has no status buttons', own !== null && !(await page.$('#weekly-modal-body [data-weekly-select="' + own + '"]')));
  check('owner-answered projects grouped at the end', /Answered by their owners · 1[\s\S]*Lark AI/.test(await page.textContent('#weekly-modal-body')));
  await page.screenshot({ path: path.join(OUT, 'wk-follow-editor.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'wk-follow-editor-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  check('counted as answered', /1 of 3/.test(await page.textContent('#weekly-modal-foot')), await page.textContent('#weekly-modal-foot'));
  const mineIdx = await rowOf(page, '[data-weekly-select]', 'data-weekly-select', 'My own thing');
  await page.selectOption('#weekly-modal-body [data-weekly-select="' + mineIdx + '"]', 'ontrack');
  await page.click('#weekly-modal [data-weekly-send]'); await page.waitForTimeout(600);
  const mine = await page.evaluate(() => window.__fb.data.people.u1.weekly.find(e => e.week === '2026-10-05'));
  check('saved: my own row only, attached projects followed', mine && mine.rows.length === 1 && mine.rows[0].project === 'My own thing' && JSON.stringify(mine.follows.slice().sort()) === JSON.stringify(['GWS recording', 'Lark AI']), JSON.stringify(mine));
  const card = () => page.innerText('[data-weekly-card="Deane Cheng"]');
  const cardText = await card();
  check("my card shows the owner's row, marked", /Waiting on client[\s\S]*Lark AI – Client to approve the script · from Arvind/.test(await card()), (await card()).slice(0, 300));
  check('Next lists every step, no "+N more"', ['Step one', 'Step two', 'Step three', 'Step four', 'Deck'].every(x => (/My own thing[\s\S]*/.exec(cardText) || [''])[0].includes(x)) && !/more/.test(cardText), cardText);
  check('a followed row is not marked NEW', !/NEW/.test(await card()));

  // ---------- The owner updates: my card follows without me ----------
  await page.click('[data-weekly-edit="Arvind Kumaraguru"]'); await page.waitForSelector('#weekly-modal:not(.hidden)');
  const ai = await rowOf(page, '[data-weekly-select]', 'data-weekly-select', 'Lark AI');
  await page.selectOption('#weekly-modal-body [data-weekly-select="' + ai + '"]', 'ontrack');
  const gi = await rowOf(page, '[data-weekly-select]', 'data-weekly-select', 'GWS recording');
  await page.selectOption('#weekly-modal-body [data-weekly-select="' + gi + '"]', 'us');
  await page.click('#weekly-modal [data-weekly-send]'); await page.waitForTimeout(600);
  check("owner's change shows on my card", /On track[\s\S]*Lark AI[\s\S]*from Arvind/.test(await card()) && !/Waiting on client/.test(await card()), (await card()).slice(0, 300));
  check("owner's later answer for a followed project appears too", /Waiting on us[\s\S]*GWS recording[\s\S]*from Arvind/.test(await card()));
  check('Needs help is not duplicated by following', !/Needs help\s*\d/.test(await page.textContent('#weekly-view')));

  // ---------- Everyone in: a green "All in!" ----------
  check('not all in yet', /2 of 3/.test(await page.textContent('#weekly-bar')) && !/All in!/.test(await page.textContent('#weekly-bar')));
  await page.evaluate(() => window.__fb.remote(function (d) { d.people.u3.weekly = [{ week: '2026-10-05', rows: [], extra: 'Filing', leave: false, at: '2026-10-06T02:00:00Z' }]; }));
  await page.waitForTimeout(400);
  const allIn = await page.textContent('#weekly-bar');
  check('All in! once everyone has updated', /All in!/.test(allIn) && !/3 of 3/.test(allIn), allIn);
  check('All in! is green', await page.$eval('#weekly-bar', b => [...b.querySelectorAll('span')].some(x => x.textContent === 'All in!' && /emerald/.test(x.className))));

  // ---------- Answering yourself wins ----------
  await page.click('[data-weekly-edit="Deane Cheng"]'); await page.waitForSelector('#weekly-modal:not(.hidden)');
  const oi = await rowOf(page, '[data-weekly-own]', 'data-weekly-own', 'Lark AI');
  await page.click('#weekly-modal-body [data-weekly-own="' + oi + '"]');
  check('Answer myself shows the buttons and a way back', !!(await page.$('#weekly-modal-body [data-weekly-select="' + oi + '"]')) && !!(await page.$('#weekly-modal-body [data-weekly-follow="' + oi + '"]')));
  await page.selectOption('#weekly-modal-body [data-weekly-select="' + oi + '"]', 'done');
  await page.click('#weekly-modal [data-weekly-send]'); await page.waitForTimeout(600);
  const mine2 = await page.evaluate(() => window.__fb.data.people.u1.weekly.find(e => e.week === '2026-10-05'));
  check('my own answer saved and no longer followed', mine2.rows.some(r => r.project === 'Lark AI' && r.status === 'done') && mine2.follows.indexOf('Lark AI') === -1, JSON.stringify(mine2));
  check("card shows my answer, not the owner's", /Done[\s\S]*Lark AI/.test(await card()) && !/Lark AI[^\n]*from Arvind/.test(await card()), (await card()).slice(0, 300));

  await page.screenshot({ path: path.join(OUT, 'wk-follow.png'), fullPage: true });

  // ---------- Clicking a project opens its card, even if a leftover search would hide it ----------
  await page.click('[data-view-btn="board"]'); await page.waitForTimeout(1300); await skipTours(page);
  await page.fill('#filter-search', 'nothing matches this'); await page.waitForTimeout(300);
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(1300); await skipTours(page);
  await page.click('[data-weekly-card="Arvind Kumaraguru"] [data-weekly-project="Lark AI"]'); await page.waitForTimeout(1300); await skipTours(page);
  check('project name opens Projects', (await page.textContent('#current-view-title')).trim() === 'Projects');
  check('its card is on screen (search cleared to find it)', await page.evaluate(() => [...document.querySelectorAll('#projects-grid .project-expand-toggle')].some(b => b.getAttribute('data-project') === 'Lark AI')) && (await page.inputValue('#filter-search')) === '');
  await page.click('[data-view-btn="weekly"]'); await page.waitForTimeout(1300); await skipTours(page);
  await page.locator('[data-weekly-card="Chloe Hu"]').screenshot({ path: path.join(OUT, 'wk-away-card.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'wk-follow-dark.png'), fullPage: true });
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  // ---------- People card: leave that ended over 30 days ago is no longer listed ----------
  await page.click('[data-view-btn="people"]'); await page.waitForTimeout(1300); await skipTours(page);
  const peopleText = await page.textContent('#people-grid');
  check('leave ended within 30 days still listed', /Recent trip/.test(peopleText), peopleText.slice(0, 200));
  check('leave ended over 30 days ago is not listed', !/Old trip/.test(peopleText));
  check('...but it is kept, not deleted', await page.evaluate(() => window.__fb.data.people.u3.leave.some(l => l.id === 'l5')));

  // ---------- Phone layout (390px): the same cards, owner rows and leave ----------
  const m = await newPage(browser, '2026-10-06T11:00:00', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await m.page.click('[data-m-tab="more"]'); await m.page.waitForTimeout(300);
  await m.page.click('#m-more [data-m-go="monday"]'); await m.page.waitForTimeout(700);
  const mt = await m.page.innerText('.m-screen');
  check('phone: leave shows on the card', /Away[\s\S]*Oct 7 – Oct 9/.test(mt), mt.slice(0, 200));
  check('phone: no card Edit buttons (it keeps its own)', !(await m.page.$('.m-screen [data-weekly-edit]')));
  check('phone: no sideways scroll', (await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
  await m.page.screenshot({ path: path.join(OUT, 'wk-follow-phone.png'), fullPage: true });
  check('phone: no page errors', m.errors.length === 0, m.errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('PASS')).length + '/' + results.length + ' passed');
})().catch(e => { console.error(e); process.exit(1); });
