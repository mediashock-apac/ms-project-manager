// suggestion-reply -- a sent reply leaves the reply box empty, even though Firestore's local snapshot redraws the list before the write is acknowledged; a failed send puts the text back. Browser test against index.html with Firebase stubbed (see tests/README.md).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const STUBS = require('./fbstub.js');
const REPO = path.resolve(__dirname, '..');

const results = [];
function check(name, ok, extra) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); }

function seed() {
  const now = new Date().toISOString();
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["page:suggestions","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  window.__fb = {
    seq: 1, writes: [],
    // Real Firestore fires the local snapshot first and resolves the write on the server ack.
    ackDelay: 400,
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Ming Song Ang', email: 'mingsong@mediashock.com.sg', departments: ['admin'] })
      },
      tasks: {},
      projects: {}, activity: {}, notifications: {}, notificationDedup: {},
      suggestions: {
        sg1: { text: 'Ability to archive projects and unarchive projects.', author: 'Ming Song Ang', date: '2026-10-21T02:00:00Z', replies: [], status: 'open' },
        sg2: { text: 'Bigger avatars on People.', author: 'Ming Song Ang', date: '2026-10-20T02:00:00Z', replies: [], status: 'open' }
      }
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); } catch (e) {}
}

async function newPage(browser, when) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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

(async () => {
  const browser = await chromium.launch();
  const { page, ctx, errors } = await newPage(browser, '2026-10-21T11:00:00');
  await skipTours(page);
  await page.click('[data-view-btn="suggestions"]');
  await page.waitForTimeout(400);
  await skipTours(page);

  const box = (id) => '.suggestion-reply-input[data-suggestion-id="' + id + '"]';
  const replies = (id) => page.evaluate((id) => (window.__fb.data.suggestions[id].replies || []).map(r => r.text), id);

  // Reply button
  await page.fill(box('sg2'), 'Draft on the other card');
  await page.fill(box('sg1'), 'Can already archive and restore projects.');
  await page.click('.suggestion-reply-add-btn[data-suggestion-id="sg1"]');
  await page.waitForTimeout(150);   // local snapshot has redrawn the list; the ack hasn't arrived
  check('Reply: box is empty while the write is still pending', (await page.inputValue(box('sg1'))) === '', await page.inputValue(box('sg1')));
  await page.waitForTimeout(500);
  check('Reply: box is still empty once the write is acknowledged', (await page.inputValue(box('sg1'))) === '', await page.inputValue(box('sg1')));
  check('Reply: the reply was saved once', JSON.stringify(await replies('sg1')) === JSON.stringify(['Can already archive and restore projects.']), JSON.stringify(await replies('sg1')));
  check('Reply: the reply shows on the card', (await page.textContent('#suggestions-list')).includes('Can already archive and restore projects.'));
  check('Reply: a draft on another card is kept', (await page.inputValue(box('sg2'))) === 'Draft on the other card', await page.inputValue(box('sg2')));

  // Enter key
  await page.fill(box('sg1'), 'But only Completed projects');
  await page.press(box('sg1'), 'Enter');
  await page.waitForTimeout(650);
  check('Enter: box is empty after sending', (await page.inputValue(box('sg1'))) === '', await page.inputValue(box('sg1')));
  check('Enter: the reply was saved', (await replies('sg1')).length === 2, JSON.stringify(await replies('sg1')));

  // A failed send puts the text back so nothing typed is lost
  await page.evaluate(() => { window.__fb.failWrites = true; });
  await page.fill(box('sg1'), 'This one fails');
  await page.click('.suggestion-reply-add-btn[data-suggestion-id="sg1"]');
  await page.waitForTimeout(300);
  check('Failed send: the text is back in the box', (await page.inputValue(box('sg1'))) === 'This one fails', await page.inputValue(box('sg1')));
  check('Failed send: an error toast says so', (await page.textContent('body')).includes('Could not post reply'));
  check('Failed send: nothing was saved', (await replies('sg1')).length === 2);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  await browser.close();
  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
})();
