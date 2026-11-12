// reminders -- browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-11-04a","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Arvind Kumaraguru', email: 'arvind@mediashock.com.sg', departments: ['suits'] })
      },
      tasks: {
        t1: { name: 'Rough cut', project: 'GWS recording', priority: 'High', status: 'In Progress', startDate: '2026-11-02', deadline: '2026-11-20', assignee: 'Deane Cheng', createdBy: 'Deane Cheng',
          checklist: [{ id: 'c1', text: 'Client review', due: '2026-11-17', done: false }, { id: 'c2', text: 'Final export', due: '2026-11-19', done: false }], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}

async function newPage(browser, when, opts) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed); if (opts && opts.init) await page.addInitScript(opts.init);
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

async function skipTours(page) {
  for (let i = 0; i < 6; i++) { const b = await page.$('[data-tour-skip]'); if (!b) break; await b.click().catch(() => {}); await page.waitForTimeout(250); }
}
const mine = (page) => page.evaluate(() => (window.__fb.data.people.u1.reminders || []));
const notifs = (page) => page.evaluate(() => Object.entries(window.__fb.data.notifications).filter(([k, n]) => n.type === 'reminder').map(([k, n]) => Object.assign({ id: k }, n)));

(async () => {
  const browser = await chromium.launch();
  // Thursday 12 Nov 2026, 10:00 Singapore
  let r = await newPage(browser, '2026-11-12T10:00:00');
  let page = r.page;
  await skipTours(page);
  await page.evaluate(() => { document.querySelector('[data-open-task="t1"]').click(); });
  await page.waitForTimeout(500); await skipTours(page);
  check('task window shows Remind me', await page.isVisible('#task-remind-btn'));
  await page.click('#task-remind-btn');
  await page.waitForTimeout(200);
  check('reminder window opens', await page.isVisible('#reminder-modal'));
  const picks = await page.$$eval('[data-reminder-pick]', els => els.map(e => e.getAttribute('data-reminder-pick')));
  check('quick picks offered', ['hour', 'today', 'next', 'monday', 'before', 'custom'].every(k => picks.includes(k)), picks.join(','));
  check('pop-up is the default', (await page.getAttribute('[data-reminder-how="popup"]', 'aria-pressed')) === 'true');
  await page.screenshot({ path: 'reminder-window.png' });
  await page.click('[data-reminder-pick="hour"]');
  await page.fill('#reminder-note', 'Chase the speaker list');
  await page.click('#reminder-save-btn');
  await page.waitForTimeout(400);
  let list = await mine(page);
  check('saved on my own roster doc', list.length === 1 && list[0].taskId === 't1' && !list[0].itemId && list[0].how === 'popup' && list[0].note === 'Chase the speaker list', JSON.stringify(list));
  check('saved for 11:00', list[0] && new Date(list[0].at).getHours() === 11 && new Date(list[0].at).getMinutes() === 0, list[0] && list[0].at);
  check('only my doc was written', (await page.evaluate(() => window.__fb.writes.filter(w => w.col === 'people' && w.id !== 'u1' && w.data.reminders).length)) === 0);
  check('task window alarm turns brand', await page.evaluate(() => document.getElementById('task-remind-btn').classList.contains('text-brand-600')));

  // A step: from the step editor
  await page.evaluate(() => { document.querySelector('#task-checklist-editor .checklist-edit-toggle[data-checklist-i="0"]').click(); });
  await page.waitForTimeout(200);
  check('step editor has Remind me', await page.isVisible('#task-checklist-editor .checklist-remind'));
  await page.click('#task-checklist-editor .checklist-remind');
  await page.waitForTimeout(200);
  check('step is preselected', (await page.inputValue('#reminder-about')) === 'c1');
  const beforeLabel = await page.textContent('[data-reminder-pick="before"]');
  check('"a day before it\'s due" = Mon 9:00am', /Mon 9:00am/.test(beforeLabel), beforeLabel);
  await page.click('[data-reminder-pick="before"]');
  await page.click('[data-reminder-how="bell"]');
  await page.click('#reminder-save-btn');
  await page.waitForTimeout(400);
  list = await mine(page);
  const stepR = list.find(x => x.itemId === 'c1');
  check('step reminder saved, follows the due date', !!stepR && stepR.before === 1 && stepR.how === 'bell', JSON.stringify(stepR));
  check('the step shows an alarm mark', await page.isVisible('#task-checklist-editor .checklist-reminder-mark'));
  check('the other step has none', (await page.$$('#task-checklist-editor .checklist-reminder-mark')).length === 1);

  // Escape closes only the reminder window
  await page.click('#task-checklist-editor .checklist-reminder-mark');
  await page.waitForTimeout(200);
  check('the mark opens Edit reminder', (await page.textContent('#reminder-modal-title')) === 'Edit reminder');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Escape closes the reminder window only', !(await page.isVisible('#reminder-modal')) && await page.isVisible('#task-modal'));
  await page.click('#task-modal-close');
  await page.waitForTimeout(300);
  // Opening a step's editor and pressing Done already counts as a change (not part of this
  // feature); the reminders are saved on their own, so discarding is fine.
  if (await page.isVisible('#confirm-modal')) { await page.click('#confirm-ok-btn'); await page.waitForTimeout(300); }

  // Bell panel lists them
  await page.click('#btn-notifications');
  await page.waitForTimeout(200);
  const bellText = await page.textContent('#reminder-list');
  check('bell lists my reminders', /Your reminders · 2/.test(bellText) && /Today 11:00am/.test(bellText), bellText);
  await page.screenshot({ path: 'reminder-bell.png' });
  await page.click('#btn-notifications');

  // Goes off: pop-up card
  await page.clock.fastForward('01:01:00');
  await page.waitForTimeout(800);
  let ns = await notifs(page);
  check('it goes off once, as a notification', ns.length === 1 && ns[0].how === 'popup' && !ns[0].missed && /Chase the speaker list/.test(ns[0].snippet), JSON.stringify(ns));
  list = await mine(page);
  check('and leaves my list', list.length === 1 && list[0].itemId === 'c1');
  check('pop-up card shows', await page.isVisible('[data-reminder-alert]'));
  await page.screenshot({ path: 'reminder-card.png' });
  await page.click('[data-reminder-act="snooze"]');
  await page.click('[data-reminder-snooze="10m"]');
  await page.waitForTimeout(400);
  list = await mine(page);
  ns = await notifs(page);
  check('snooze: card gone, read, back in the list for 10 min', !(await page.isVisible('[data-reminder-alert]')) && ns[0].read === true && list.length === 2, JSON.stringify(list));
  await page.clock.fastForward('00:11:00');
  await page.waitForTimeout(800);
  check('snoozed one comes back', await page.isVisible('[data-reminder-alert]'));
  await page.click('[data-reminder-act="open"]');
  await page.waitForTimeout(500);
  check('Open opens the task and clears the card', await page.isVisible('#task-modal') && !(await page.isVisible('[data-reminder-alert]')));
  check('both notifications read', (await notifs(page)).every(n => n.read));

  // Ticking the step drops its reminder quietly
  await page.evaluate(() => { document.querySelector('#task-checklist-editor .checklist-toggle[data-checklist-i="0"]').click(); });
  await page.click('#task-save-btn'); await page.waitForTimeout(600);
  await page.clock.fastForward('00:00:31');
  await page.waitForTimeout(600);
  check('a ticked step\'s reminder is dropped, nothing sent', (await mine(page)).length === 0 && (await notifs(page)).length === 2);
  check('no page errors', r.errors.length === 0, r.errors.join(' | '));
  await r.ctx.close();

  // Missed while closed: goes off on the next visit, worded "Missed"; bell-only shows no card
  r = await newPage(browser, '2026-11-12T15:00:00', { init: () => {
    window.__fb.data.people.u1.reminders = [
      { id: 'm1', at: '2026-11-12T13:00:00+08:00', taskId: 't1', itemId: 'c2', label: 'Final export', note: '', how: 'popup', createdAt: '2026-11-11T00:00:00Z' },
      { id: 'm2', at: '2026-11-12T14:00:00+08:00', taskId: null, itemId: null, label: '', note: 'Call the printer', how: 'bell', createdAt: '2026-11-11T00:00:00Z' },
      { id: 'm3', at: '2026-11-13T09:00:00+08:00', taskId: 't1', itemId: null, label: '', note: '', how: 'popup', createdAt: '2026-11-11T00:00:00Z' }
    ];
  } });
  page = r.page;
  await page.waitForTimeout(1000);
  ns = await notifs(page);
  const missed = ns.find(n => n.id === 'reminder-u1-m1');
  check('missed reminder goes off on load', !!missed && missed.missed === true && /^Missed at Today 1:00pm: Final export/.test(missed.snippet), JSON.stringify(missed));
  check('a note-only reminder works', ns.some(n => n.id === 'reminder-u1-m2' && /Call the printer/.test(n.snippet)));
  check('future one waits', !ns.some(n => n.id === 'reminder-u1-m3') && (await mine(page)).map(x => x.id).join() === 'm3');
  check('one card: the pop-up one, not the bell-only one', (await page.$$('[data-reminder-alert]')).length === 1 && await page.isVisible('[data-reminder-alert="reminder-u1-m1"]'));
  await page.click('[data-reminder-act="done"]');
  await page.waitForTimeout(300);
  check('Done clears the card and marks it read', !(await page.isVisible('[data-reminder-alert]')) && (await notifs(page)).find(n => n.id === 'reminder-u1-m1').read === true);
  // Delete from the bell, with Undo
  await skipTours(page);
  await page.click('#btn-notifications');
  await page.click('[data-reminder-delete="m3"]');
  await page.waitForTimeout(300);
  check('delete from the bell', (await mine(page)).length === 0);
  await page.click('.toast-action');
  await page.waitForTimeout(300);
  check('Undo puts it back', (await mine(page)).length === 1);

  // Google Calendar: a link, nothing stored
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await page.keyboard.press('Escape');
  await page.evaluate(() => { document.getElementById('notification-panel').classList.add('hidden'); document.querySelector('[data-open-task="t1"]').click(); });
  await page.waitForTimeout(400);
  await page.click('#task-remind-btn');
  await page.click('[data-reminder-how="calendar"]');
  check('Calendar changes the button', (await page.textContent('#reminder-save-btn')) === 'Open Google Calendar');
  await page.click('[data-reminder-pick="custom"]');
  await page.fill('#reminder-custom', '2026-11-16T14:30');
  await page.click('#reminder-save-btn');
  await page.waitForTimeout(300);
  const url = (await page.evaluate(() => window.__opened))[0] || '';
  check('opens a pre-filled Google Calendar event, one moment, not a block', /calendar\.google\.com\/calendar\/render\?action=TEMPLATE/.test(url) && /dates=20261116T143000(%2F|\/)20261116T143000/.test(url) && /Reminder%3A%20Rough%20cut/.test(url), url);
  check('calendar stores nothing here', (await mine(page)).length === 1);
  // A time in the past is refused
  await page.click('#task-remind-btn');
  await page.click('[data-reminder-how="popup"]');
  await page.click('[data-reminder-pick="custom"]');
  await page.fill('#reminder-custom', '2026-11-12T09:00');
  await page.click('#reminder-save-btn');
  check('a past time is refused with a message', await page.isVisible('#reminder-error') && /already passed/.test(await page.textContent('#reminder-error')));
  await page.click('#reminder-modal [data-reminder-close]');
  check('no page errors (2)', r.errors.length === 0, r.errors.join(' | '));
  await r.ctx.close();

  // Dark mode look
  r = await newPage(browser, '2026-11-12T10:00:00', { init: () => { try { localStorage.setItem('flowboard_theme', 'dark'); } catch (e) {} } });
  page = r.page;
  await skipTours(page);
  await page.evaluate(() => { document.querySelector('[data-open-task="t1"]').click(); });
  await page.waitForTimeout(400);
  await page.click('#task-remind-btn');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'reminder-window-dark.png' });
  await r.ctx.close();

  await browser.close();
  console.log(results.join('\n'));
})().catch(e => { console.log(results.join('\n')); console.log('FAIL crashed: ' + e.stack); process.exit(1); });
