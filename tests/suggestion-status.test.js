// suggestion-status -- Suggestions are grouped by status like the Projects page: Open and WIP as headed sections with counts, Fixed and Unable to Fix folded; a fold you open stays open through live updates, and changing a status moves the card and says where. Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const pages = ['board', 'gantt', 'calendar', 'people', 'projects', 'chat', 'wip', 'weekly', 'activity', 'archived', 'suggestions', 'updates'].map(v => 'page:' + v);
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["cl-2026-10-07l","cl-2026-10-06x","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"].concat(pages), updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ project: 'GWS recording', priority: 'Medium', status: 'In Progress', startDate: '2026-11-02', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }, o);
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg', photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } } },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['suits'] }),
        u2: P({ name: 'Chloe Hu', email: 'chloe@mediashock.com.sg', departments: ['production'], leave: [{ id: 'l1', start: '2026-11-06', end: '2026-11-10', note: 'Trip' }] })
      },
      tasks: {
        t1: T({ name: 'Owned by Deane' }),
        t2: T({ name: 'Deane also involved', assignee: 'Chloe Hu', involved: ['Deane Cheng'] }),
        t3: T({ name: 'Chloe only', assignee: 'Chloe Hu' })
      },
      projects: {}, activity: {}, notifications: {}, suggestions: {
        a1: { text: 'Open newest', author: 'Chloe Hu', date: '2026-10-21T02:00:00Z', replies: [], status: 'open' },
        a2: { text: 'Open older', author: 'Chloe Hu', date: '2026-10-10T02:00:00Z', replies: [], status: 'open' },
        a3: { text: 'No status yet', author: 'Chloe Hu', date: '2026-09-01T02:00:00Z', replies: [] },
        w1: { text: 'Being built', author: 'Chloe Hu', date: '2026-10-15T02:00:00Z', replies: [], status: 'wip' },
        f1: { text: 'Fixed one', author: 'Chloe Hu', date: '2026-10-01T02:00:00Z', replies: [], status: 'fixed' },
        f2: { text: 'Fixed two', author: 'Chloe Hu', date: '2026-09-20T02:00:00Z', replies: [], status: 'fixed' },
        u1: { text: 'Cannot do', author: 'Chloe Hu', date: '2026-09-10T02:00:00Z', replies: [], status: 'unabletofix' }
      }, notificationDedup: {}
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
  try { await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 }); } catch (e) { console.log('ERRORS', errors); throw e; }
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

(async () => {
  const browser = await chromium.launch();
  const { page, errors, ctx } = await newPage(browser, '2026-10-22T10:00:00');
  await page.click('[data-view-btn="suggestions"]'); await page.waitForTimeout(700);
  const read = () => page.evaluate(() => [...document.querySelectorAll('#suggestions-list [data-suggestion-section]')].map(s => {
    const head = s.querySelector('h3, summary').innerText.replace(/\s+/g, ' ').trim();
    const open = s.tagName === 'SECTION' || s.open;
    const cards = [...s.querySelectorAll('.suggestion-card')].filter(c => c.checkVisibility()).length;   // a closed <details> hides without clearing offsetParent
    return head + (s.tagName === 'DETAILS' ? (open ? ' (open)' : ' (folded)') : '') + ':' + cards;
  }));
  let r = await read();
  check('grouped by status in order, with counts; finished ones folded', r.join(' | ') === 'Open 3:3 | WIP 1:1 | Fixed 2 (folded):0 | Unable to Fix 1 (folded):0', r.join(' | '));
  const order = await page.evaluate(() => [...document.querySelectorAll('[data-suggestion-section="open"] .suggestion-card')].sort((x, y) => (+x.parentElement.style.order) - (+y.parentElement.style.order)).map(c => c.innerText.includes('Open newest') ? 'newest' : c.innerText.includes('Open older') ? 'older' : 'nostatus'));
  check('newest first within a section, and no status counts as Open', order.join(',') === 'newest,older,nostatus', order.join(','));
  await page.screenshot({ path: path.join(OUT, 'suggestion-status.png'), fullPage: true });
  // The AI import panel is behind a quiet admin icon button ("No need to make it so prominent").
  const bar = () => page.evaluate(() => { const b = document.getElementById('ai-suggestions-import-bar'), t = document.getElementById('ai-suggestions-toggle'); return { icon: !!t && t.checkVisibility(), expanded: t && t.getAttribute('aria-expanded'), open: b.checkVisibility(), github: document.getElementById('ai-suggestions-import-btn').checkVisibility() }; });
  let ai = await bar();
  check('the AI import panel starts closed, behind an icon button', ai.icon && !ai.open && ai.expanded === 'false', JSON.stringify(ai));
  await page.screenshot({ path: path.join(OUT, 'suggestion-ai-icon.png'), clip: { x: 240, y: 260, width: 1200, height: 160 } });
  await page.click('#ai-suggestions-toggle'); await page.waitForTimeout(200);
  ai = await bar();
  check('...the icon opens it with both import actions', ai.open && ai.github && ai.expanded === 'true', JSON.stringify(ai));
  await page.screenshot({ path: path.join(OUT, 'suggestion-ai-open.png'), clip: { x: 240, y: 260, width: 1200, height: 240 } });
  await page.click('#ai-suggestions-toggle'); await page.waitForTimeout(200);
  ai = await bar();
  check('...and closes it again', !ai.open && ai.expanded === 'false', JSON.stringify(ai));
  await page.click('[data-suggestion-section="fixed"] > summary'); await page.waitForTimeout(300);
  r = await read();
  check('a folded section opens on click', r[2] === 'Fixed 2 (open):2', r[2]);
  await page.evaluate(() => window.__fb.remote(d => { d.suggestions.a2.replies = [{ author: 'Chloe Hu', text: 'Any update?', date: '2026-10-22T01:00:00Z' }]; }));
  await page.waitForTimeout(600);
  r = await read();
  check('...and stays open through a live update', r[2] === 'Fixed 2 (open):2', r[2]);
  await page.selectOption('[data-suggestion-section="open"] .suggestion-status-select[data-suggestion-id="a1"]', 'fixed'); await page.waitForTimeout(700);
  r = await read();
  const toast = await page.evaluate(() => document.body.innerText.includes('Moved to Fixed'));
  check('changing a status moves the card to its section', r[0] === 'Open 2:2' && r[2] === 'Fixed 3 (open):3', r.join(' | '));
  check('...and says where it went', toast);
  // Under Review (asked 2026-10-22): second in the list, its own section between Open and WIP
  const opts = await page.$$eval('[data-suggestion-section="open"] .suggestion-status-select[data-suggestion-id="a2"] option', os => os.map(o => o.textContent));
  check('Under Review is an option, after Open', opts.join(',') === 'Open,Under Review,WIP,Fixed,Unable to Fix', opts.join(','));
  await page.selectOption('[data-suggestion-section="open"] .suggestion-status-select[data-suggestion-id="a2"]', 'review'); await page.waitForTimeout(700);
  r = await read();
  check('Under Review gets its own section between Open and WIP', r[0] === 'Open 1:1' && r[1] === 'Under Review 1:1' && r[2] === 'WIP 1:1', r.join(' | '));
  const rn = await page.evaluate(() => Object.values(window.__fb.data.notifications).filter(n => n.suggestionId === 'a2'));
  check('the author is told', rn.length === 1 && rn[0].status === 'review' && rn[0].recipient === 'Chloe Hu', JSON.stringify(rn));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})();
