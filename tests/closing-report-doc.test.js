// closing-report-doc -- Rates & roles (admins/finance only) and "Make closing report…": fills the team's end of project report template with hours, amounts (hours x role rate) and facts, downloads it as .docx or uploads it to Drive as a Google Doc (falling back to My Drive when the project folder can't be written). Browser test against index.html with Firebase stubbed (see tests/README.md).
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
  const P = (o) => Object.assign({ departmentChosen: true, lastSeen: now, photoURL: null, toursSeen: ["page:projects","page:wip","cl-2026-11-23d","cl-2026-11-04a","cl-2026-10-07l","cl-2026-10-06w","cl-2026-10-06v","cl-2026-10-06u","cl-2026-10-06t","cl-2026-10-06s","cl-2026-10-06r","cl-2026-10-06q","cl-2026-10-06p","cl-2026-10-06o","cl-2026-10-06n","cl-2026-10-06m","cl-2026-10-06l","cl-2026-10-06k","cl-2026-10-06j","cl-2026-10-06i","cl-2026-10-06h","cl-2026-10-06g","cl-2026-10-06f","cl-2026-10-06e","cl-2026-10-06d","cl-2026-10-06c","cl-2026-10-06b","cl-2026-10-06a","cl-2026-10-05z","cl-2026-10-05y","cl-2026-10-05x","cl-2026-10-05w","cl-2026-10-05v","cl-2026-10-05u","cl-2026-10-05t","cl-2026-10-05s","cl-2026-10-05r","cl-2026-10-05q","cl-2026-10-05p","cl-2026-10-05o","cl-2026-10-05n","cl-2026-10-05m","cl-2026-10-05l","cl-2026-10-05k","cl-2026-10-05j","cl-2026-10-05i","cl-2026-10-05h","cl-2026-10-05g","cl-2026-10-05f","cl-2026-10-05e","cl-2026-10-05d","cl-2026-10-05c","cl-2026-10-05b","cl-2026-10-05a","cl-2026-10-02","cl-2026-10-01","cl-2026-09-30","cl-2026-09-29","welcome","tours-intro"], updatesSeen: 'zzzz' }, o);
  const T = (o) => Object.assign({ priority: 'Medium', startDate: '2026-11-01', assignee: 'Deane Cheng', createdBy: 'Deane Cheng', checklist: [], comments: [], createdAt: '2026-09-01T00:00:00Z', archivedAt: '2026-11-16T00:00:00Z', status: 'Done' }, o);
  const E = (author, minutes, billable, date, note, overtime) => ({ author, minutes, billable, date, note, overtime: !!overtime, checklistItemId: null });
  const users = {
    deane: { uid: 'u1', displayName: 'Deane Cheng', email: 'deane@mediashock.com.sg' },
    zenon: { uid: 'u4', displayName: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg' }
  };
  window.__fb = {
    seq: 1, writes: [],
    auth: { currentUser: Object.assign({ photoURL: null, metadata: { creationTime: '2025-01-01T00:00:00Z' } }, users[asUser || 'deane']) },
    data: {
      people: {
        u1: P({ name: 'Deane Cheng', email: 'deane@mediashock.com.sg', departments: ['production'] }),
        u2: P({ name: 'Mychelle Tan', email: 'mychelle@mediashock.com.sg', departments: ['suits'] }),
        u3: P({ name: 'Harin Lee', email: 'harin@mediashock.com.sg', departments: ['production'] }),
        u4: P({ name: 'Zenon Kwok Ze Yong', email: 'zenon@mediashock.com.sg', departments: ['copy'] })
      },
      tasks: {
        t9: { name: 'Other work', project: 'Live Job', priority: 'Medium', status: 'In Progress', assignee: 'Zenon Kwok Ze Yong', createdBy: 'Zenon Kwok Ze Yong', startDate: '2026-11-01', deadline: '2026-12-30', checklist: [], comments: [], timeEntries: [], createdAt: '2026-09-01T00:00:00Z' }
      },
      archivedTasks: {
        a1: T({ name: 'Edit', project: 'Done Job', deadline: '2026-11-10', completedAt: '2026-11-12T03:00:00Z', driveLink: 'https://drive.google.com/drive/folders/FOLDER123',
          reviewRounds: [{ at: '2026-11-06T00:00:00Z', audience: 'client' }, { at: '2026-11-09T00:00:00Z', audience: 'client' }],
          timeEntries: [E('Deane Cheng', 120, true, '2026-11-05T02:00:00Z', 'First cut'), E('Mychelle Tan', 60, true, '2026-11-06T02:00:00Z', 'Client call', true),
                        E('Harin Lee', 90, true, '2026-11-07T02:00:00Z', 'Grade'), E('Deane Cheng', 30, false, '2026-11-08T02:00:00Z', 'Admin')] }),
        a2: T({ name: 'Deliver', project: 'Done Job', deadline: '2026-11-15', completedAt: '2026-11-14T03:00:00Z',
          timeEntries: [E('Mychelle Tan', 30, true, '2026-11-14T02:00:00Z', 'Sign off')] })
      },
      projects: { p1: { name: 'Done Job', wipCategory: 'closing' } },
      finance: { rates: { roles: [{ key: 'ad', rate: 150 }, { key: 'creative', rate: 100 }, { key: 'post', rate: 60 }],
        people: [{ name: 'Deane Cheng', role: 'creative' }, { name: 'Mychelle Tan', role: 'ad' }] } },
      activity: {}, notifications: {}, suggestions: {}, notificationDedup: {}
    }
  };
  try { localStorage.setItem('flowboard_dept_prompted', '1'); localStorage.setItem('flowboard_teamspace', 'all'); } catch (e) {}
}

async function newPage(browser, when, asUser, withToken, denyFinance) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(when) });
  await page.addInitScript(seed, asUser);
  const auth = withToken ? STUBS.auth.replace('static credentialFromResult(){ return null; }', 'static credentialFromResult(){ return { accessToken: "tok123" }; }')
    .replace('export function signInWithPopup(){ return Promise.resolve(); }', 'export function signInWithPopup(){ return Promise.resolve({ user: {} }); }') : STUBS.auth;
  await page.route('https://www.gstatic.com/firebasejs/**', r => {
    const u = r.request().url();
    const key = /firebase-app/.test(u) ? 'app' : /firebase-auth/.test(u) ? 'auth' : /firebase-storage/.test(u) ? 'storage' : 'firestore';
    // denyFinance: the finance rules aren't published yet, so the database refuses the rates.
    const fsStub = denyFinance ? STUBS.firestore.replace('export function getDoc(ref){', 'export function getDoc(ref){ if (ref.col === "finance") return Promise.reject(Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" }));') : STUBS.firestore;
    r.fulfill({ status: 200, contentType: 'text/javascript', body: key === 'auth' ? auth : key === 'firestore' ? fsStub : STUBS[key] });
  });
  await page.route('http://pm.test/**', r => {
    let p = new URL(r.request().url()).pathname;
    if (p === '/') p = '/index.html';
    const f = path.join(REPO, decodeURIComponent(p));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream';
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
async function openCompleted(page) {
  const sum = await page.$('#projects-completed-details > summary');
  if (sum && !(await page.$eval('#projects-completed-details', d => d.open))) { await sum.click(); await page.waitForTimeout(300); }
}
const toastText = (page) => page.$$eval('#toast-container > div', els => els.map(e => e.textContent).join(' | '));
async function openReport(page) {
  await page.click('[data-view-btn="projects"]'); await page.waitForTimeout(900); await skipTours(page);
  await openCompleted(page);
  await page.click('#projects-grid .project-menu-toggle[data-project="Done Job"]'); await page.waitForTimeout(300);
}
// The .docx's text, read with the page's own JSZip: one line per paragraph, one line per table row
// with its cells joined by " | ".
async function docText(page, file) {
  const b64 = fs.readFileSync(file).toString('base64');
  return page.evaluate(async (b) => {
    const z = await window.JSZip.loadAsync(b, { base64: true });
    const xml = await z.file('word/document.xml').async('string');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const d = new DOMParser().parseFromString(xml, 'application/xml');
    const body = d.getElementsByTagNameNS(W, 'body')[0];
    const lines = [];
    Array.from(body.children).forEach(function (c) {
      if (c.localName === 'p') lines.push(c.textContent);
      if (c.localName === 'tbl') Array.from(c.children).filter(r => r.localName === 'tr').forEach(function (r) {
        lines.push(Array.from(r.children).filter(x => x.localName === 'tc').map(x => x.textContent.trim()).join(' | '));
      });
    });
    return { xml: xml, text: lines.join('\n') };
  }, b64);
}

(async () => {
  const browser = await chromium.launch();

  // ---- An admin ----
  const { page, ctx, errors } = await newPage(browser, '2026-11-19T11:00:00');
  await skipTours(page);
  check('Rates & roles is in the profile menu', !(await page.$eval('#btn-rates', b => b.classList.contains('hidden'))));

  await page.click('#user-menu-trigger'); await page.waitForTimeout(200);
  await page.click('#btn-rates'); await page.waitForTimeout(500);
  check('rates window shows the saved rates', await page.inputValue('[data-rate-key="ad"]') === '150' && await page.inputValue('[data-rate-key="ae"]') === '');
  check('people show their saved role', await page.$eval('[data-rate-person="Mychelle Tan"]', s => s.value) === 'ad' && await page.$eval('[data-rate-person="Harin Lee"]', s => s.value) === '');
  await page.screenshot({ path: path.join(OUT, 'closing-report-rates.png') });
  await page.fill('[data-rate-key="intern"]', '30');
  await page.click('#rates-save'); await page.waitForTimeout(400);
  const saved = await page.evaluate(() => window.__fb.data.finance.rates);
  check('saving writes the rates', saved.roles.find(r => r.key === 'intern').rate === 30 && saved.roles.find(r => r.key === 'ad').rate === 150, JSON.stringify(saved.roles));
  check('saving keeps the people', saved.people.some(p => p.name === 'Deane Cheng' && p.role === 'creative'));

  await openReport(page);
  check('Make closing report… on a Completed card', !!(await page.$('#projects-grid .project-report-btn[data-project="Done Job"]')));
  await page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await page.waitForTimeout(800);
  const body = await page.textContent('#closing-report-body');
  check('window sums the hours and spend', /5 time entries, 5\.50 hours, internal spend \$\s425\.00/.test(body), body);
  check('window names who has no rate', /No rate for Harin Lee/.test(body), body);
  await page.screenshot({ path: path.join(OUT, 'closing-report-window.png') });

  const dl = page.waitForEvent('download', { timeout: 15000 });
  await page.click('#closing-report-download');
  const download = await dl;
  check('download is named after the project', download.suggestedFilename() === 'Done Job_End of Project Report.docx', download.suggestedFilename());
  const { xml, text } = await docText(page, await download.path());
  fs.writeFileSync(path.join(OUT, 'closing-report.txt'), text);
  fs.copyFileSync(await download.path(), path.join(OUT, 'closing-report.docx'));
  check('no markers left', !/\{\{/.test(xml));
  check('project, author and date filled', /Done Job/.test(text) && /Report done by: Deane Cheng/.test(text) && /Report date: 19 November 2026/.test(text));
  check('internal spend filled', /\*Project internal spend \| \$ 425\.00/.test(text), (text.match(/internal spend[^\n]{0,60}/) || [''])[0]);
  check('total, billable, unbillable rows', /Total project hours \| 5\.50 \| \$ 475\.00/.test(text) && /Total billable hours \| 5\.00 \| \$ 425\.00/.test(text) && /Total unbillable hours \| 0\.50 \| \$ 50\.00/.test(text));
  check('one row per person with amounts', /Deane Cheng \| 2\.00 \| \$ 200\.00/.test(text) && /Mychelle Tan \| 1\.50 \| \$ 225\.00/.test(text) && /Harin Lee \| 1\.50 \| No rate set/.test(text));
  check('role table uses the saved rates', /Account director \(150\/hr\) \| 1\.50 \| \$ 225\.00/.test(text) && /Creative \(100\/hr\) \| 2\.00 \| \$ 200\.00/.test(text) && /Intern \(30\/hr\) \| 0\.00 \| \$ -/.test(text) && /Account executive \(no rate set\)/.test(text));
  check('hours with no rate get their own role row', /No rate set \(Harin\) \| 1\.50/.test(text));
  check('every time entry listed, oldest first', /Deane Cheng \| November 5, 2026 \| Billable \| 2\.00 \| Edit \| First cut/.test(text) && /Mychelle Tan \| November 6, 2026 \| Billable \(OT\) \| 1\.00/.test(text) && text.indexOf('First cut') < text.indexOf('Sign off'));
  check('breakdown total', /^ \|  \|  \| 5\.50 \|  \| $/m.test(text));
  check('hours report chip set to Complete', /Project hours report: Complete$/m.test(text) && /w:lastValue="Complete"/.test(xml));
  check('learnings facts', /1 of 2 deliverables finished on or before the deadline/.test(text) && /Edit finished 2 days after its deadline/.test(text) && /Edit went through 2 client review rounds/.test(text) && /1h of overtime \(Mychelle 1h\)/.test(text));
  check('finance numbers left for the Transaction Report', !/164,222|lorem/.test(text) && /Project total budget \|  \|  \| $/m.test(text));

  // No Drive permission (the stub's sign-in gives no token): says so and offers the .docx
  await page.click('#projects-grid .project-menu-toggle[data-project="Done Job"]'); await page.waitForTimeout(300);
  await page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await page.waitForTimeout(800);
  await page.click('#closing-report-ok'); await page.waitForTimeout(2500);
  check('no Drive permission: offers the .docx', /Couldn't get permission to save to Google Drive/.test(await toastText(page)) && !!(await page.$('#toast-container .toast-action:has-text("Download .docx")')));

  // WIP: the same action on a Closing reports project
  await page.click('[data-view-btn="wip"]'); await page.waitForTimeout(900); await skipTours(page);
  const wipMenu = await page.$('[data-wip-act="pick-category"][data-project="Done Job"]');
  if (wipMenu) { await wipMenu.click(); await page.waitForTimeout(300); }
  check('WIP Closing reports row offers it', !!(await page.$('[data-wip-act="closing-report"][data-project="Done Job"]')));
  check('no page errors (admin)', errors.length === 0, errors.join(' || '));
  await ctx.close();

  // ---- Upload to Drive: the folder is refused, so it goes to My Drive ----
  const up = await newPage(browser, '2026-11-19T11:00:00', 'deane', true);
  await skipTours(up.page);
  const uploads = [];
  await up.page.route('https://www.googleapis.com/upload/drive/v3/files**', r => {
    const req = r.request();
    const b = req.postDataBuffer() ? req.postDataBuffer().toString('latin1') : '';
    uploads.push({ auth: req.headers()['authorization'], parents: /FOLDER123/.test(b), gdoc: /application\/vnd\.google-apps\.document/.test(b), name: /Done Job_End of Project Report/.test(b) });
    if (/FOLDER123/.test(b)) return r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { message: 'File not found' } }) });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'doc1', webViewLink: 'https://docs.google.com/document/d/doc1/edit' }) });
  });
  await openReport(up.page);
  await up.page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await up.page.waitForTimeout(800);
  await up.page.click('#closing-report-ok'); await up.page.waitForTimeout(3000);
  check('tries the project folder first, as a Google Doc', uploads.length === 2 && uploads[0].parents && uploads[0].gdoc && uploads[0].name && uploads[0].auth === 'Bearer tok123', JSON.stringify(uploads));
  check('then My Drive', uploads[1] && !uploads[1].parents);
  check('says where it went, with Open', /Closing report saved to your Google Drive/.test(await toastText(up.page)) && !!(await up.page.$('#toast-container .toast-action:has-text("Open")')));
  check('logged to Activity', await up.page.evaluate(() => Object.values(window.__fb.data.activity).some(a => a.type === 'project_report')));
  check('no page errors (upload)', up.errors.length === 0, up.errors.join(' || '));
  await up.ctx.close();

  // ---- Budget and external spend from a QuickBooks export (CSV, dropped) ----
  const q = await newPage(browser, '2026-11-19T11:00:00');
  await skipTours(q.page);
  const qbCsv = [
    'Transaction Report,,,,,,', 'MEDIASHOCK PRODUCTIONS PTE. LTD.,,,,,,', 'All Dates,,,,,,', ',,,,,,',
    ',Transaction date,Number,Name,Memo/Description,Amount,Customer',
    'Post production,,,,,,', 'Contracted Post Production,,,,,,',
    ',31/03/2026,DAK/INV/0326-01,DAK IT HUB GROUP,,"1,000.00",Client Co:Done Job',
    ',01/04/2026,X-77,Someone Else,,500.00,Client Co:Other Job',
    'Total for Contracted Post Production,,,,,"S$1,500.00",', 'Total for Post production,,,,,"S$1,500.00",',
    'Computer Software Fees,,,,,,', 'Monthly subscriptions,,,,,,',
    ',21/03/2026,INV346667750,Zoom Communications,"Plan, monthly",117.42,Client Co:Done Job',
    ',26/03/2026,INV347346059,Zoom Communications,,71.73,Client Co:Done Job',
    'Total for Monthly subscriptions,,,,,S$189.15,', 'Total for Computer Software Fees,,,,,S$189.15,',
    'TOTAL,,,,,1689.15,', ',,,,,,', '"Tuesday, Apr 14, 2026 02:54:00 PM GMT+8 - Accrual Basis",,,,,,'
  ].join('\r\n');
  await openReport(q.page);
  await q.page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await q.page.waitForTimeout(800);
  check('report window has a drop zone', /Drop the QuickBooks Transaction Report here/.test(await q.page.textContent('#closing-report-drop')));
  await q.page.evaluate((csv) => {
    const dt = new DataTransfer();
    dt.items.add(new File([csv], 'Done Job transactions.csv', { type: 'text/csv' }));
    const dz = document.getElementById('closing-report-drop');
    dz.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dz.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, qbCsv);
  await q.page.waitForTimeout(600);
  const finBox = await q.page.textContent('#closing-report-fin');
  check('dropped file: only this project\'s transactions', /Done Job transactions\.csv/.test(finBox) && /3 transactions, \$ 1,189\.15/.test(finBox) && /1 transaction for other projects left out/.test(finBox), finBox);
  await q.page.fill('#closing-report-budget', '4,000');
  await q.page.waitForTimeout(150);
  const qs1 = await q.page.textContent('#closing-report-summary');
  check('summary shows external spend and margins', /External spend \$\s1,189\.15\. Margin 70\.27%, 59\.65% including internal spend/.test(qs1), qs1);
  await q.page.click('[data-fin-acc-add]'); await q.page.waitForTimeout(150);
  await q.page.fill('[data-fin-acc="label"]', 'Courier');
  await q.page.fill('[data-fin-acc="amount"]', '50');
  await q.page.waitForTimeout(150);
  check('an accrual adds to external spend', /External spend \$\s1,239\.15\. Margin 69\.02%, 58\.40%/.test(await q.page.textContent('#closing-report-summary')));
  await q.page.screenshot({ path: path.join(OUT, 'closing-report-finance.png') });
  const dl3 = q.page.waitForEvent('download', { timeout: 15000 });
  await q.page.click('#closing-report-download');
  const f3 = await docText(q.page, await (await dl3).path());
  fs.writeFileSync(path.join(OUT, 'closing-report-finance.txt'), f3.text);
  check('finance: no markers left', !/\{\{/.test(f3.xml));
  check('finance summary filled', /Project total budget \| \$ 4,000\.00 \|  \| $/m.test(f3.text) && /Project external spend \| \$ 1,239\.15 \| N\.A\./.test(f3.text) &&
    /tGross profit margin vs spending \| 69\.02% \| 30\.98%/.test(f3.text) && /Profit margin including internal spend \| 58\.40% \| N\.A\./.test(f3.text), (f3.text.match(/Project total budget[\s\S]{0,300}/) || [''])[0]);
  check('finance note names the sources', /<Budget typed in Project Manager\. External spend from the QuickBooks Transaction Report \(Done Job transactions\.csv\)\. Internal spend is from Project Manager\.>/.test(f3.text));
  check('expense table keeps QuickBooks\' layout', /^Post production \|/m.test(f3.text) && /^Contracted Post Production \|/m.test(f3.text) &&
    / \| 31\/03\/2026 \| DAK\/INV\/0326-01 \| DAK IT HUB GROUP \|  \| 1,000\.00 \| Client Co:Done Job/.test(f3.text) &&
    /Total for Contracted Post Production \|  \|  \|  \|  \| \$ 1,000\.00/.test(f3.text) && /Total for Post production \|  \|  \|  \|  \| \$ 1,000\.00/.test(f3.text) &&
    /Zoom Communications \| Plan, monthly \| 117\.42/.test(f3.text) && /Total for Computer Software Fees \|  \|  \|  \|  \| \$ 189\.15/.test(f3.text), f3.text.slice(f3.text.indexOf('External spend report')).slice(0, 900));
  check('other projects\' rows left out of the table', !/Someone Else/.test(f3.text) && /for other projects left out/.test(f3.text));
  check('TOTAL, accrual and grand total', /TOTAL \|  \|  \|  \| \$ 1,189\.15/.test(f3.text) && /Courier \| 50\.00/.test(f3.text) && /^ \|  \|  \|  \|  \| \$ 1,239\.15 \| $/m.test(f3.text));
  check('QuickBooks footer kept', /Tuesday, Apr 14, 2026 02:54:00 PM GMT\+8 - Accrual Basis/.test(f3.text));
  check('finance never saved', await q.page.evaluate(() => !window.__fb.writes.some(w => /finance|projects/.test(w.col) && JSON.stringify(w).indexOf('1,189') !== -1) && !JSON.stringify(window.__fb.data).includes('DAK IT HUB')));

  // The team's Transaction Report sheet, downloaded as Excel: Summary gives the budget, Expenses the rows
  await q.page.click('#projects-grid .project-menu-toggle[data-project="Done Job"]'); await q.page.waitForTimeout(300);
  await q.page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await q.page.waitForTimeout(800);
  check('reopened window keeps the file for this visit', /Done Job transactions\.csv/.test(await q.page.textContent('#closing-report-fin')));
  await q.page.click('[data-fin-remove]'); await q.page.waitForTimeout(200);
  check('removing the file brings the drop zone back', !!(await q.page.$('#closing-report-drop')));
  const xlsxB64 = await q.page.evaluate(async (sheets) => {
    const z = new window.JSZip();
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const colName = i => String.fromCharCode(65 + i);
    z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
    z.file('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map((s, i) => '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '</Relationships>');
    z.file('xl/sharedStrings.xml', '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Project total budget</t></si></sst>');
    sheets.forEach((s, i) => z.file('xl/worksheets/sheet' + (i + 1) + '.xml', '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      s.rows.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, ci) => v === '' || v == null ? ''
        : v === '#S0' ? '<c r="' + colName(ci) + (ri + 1) + '" t="s"><v>0</v></c>'
        : typeof v === 'number' ? '<c r="' + colName(ci) + (ri + 1) + '"><v>' + v + '</v></c>'
        : '<c r="' + colName(ci) + (ri + 1) + '" t="inlineStr"><is><t>' + esc(v) + '</t></is></c>').join('') + '</row>').join('') + '</sheetData></worksheet>'));
    return z.generateAsync({ type: 'base64' });
  }, [
    { name: 'Summary', rows: [[], ['', 'Finance summary'], ['', '', 'SGD', 'Other Currency (USD)', 'Exchange Rate'], ['', '#S0', 35560, 28000, 1.27]] },
    { name: 'Expenses', rows: [['Done Job_Transaction Report'], [], ['', 'Transaction date', 'Number', 'Name', 'Memo/Description', 'Amount', 'Customer'],
      ['Post production'], ['Contracted Post Production'], ['', 46112, 'DAK/INV/0326-01', 'DAK IT HUB GROUP', '', 15496.97, 'Google Asia Pacific Pte Ltd:Done Job'],
      ['Total for Contracted Post Production', '', '', '', '', 'S$15,496.97'], ['Total for Post production', '', '', '', '', 'S$15,496.97'],
      ['TOTAL', '', '', '', '', 15496.97], ['', '', '', '', 'Accrual item', 200], ['', '', '', '', '', 15696.97]] },
    { name: 'Manhours', rows: [['', 'Personnel', 'Date', 'Type', 'Hours']] }
  ]);
  await q.page.setInputFiles('#closing-report-file', { name: 'Done Job_Transaction Report.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(xlsxB64, 'base64') });
  await q.page.waitForTimeout(800);
  const finBox2 = await q.page.textContent('#closing-report-fin');
  check('Excel sheet: Expenses tab read', /1 transaction, \$ 15,496\.97/.test(finBox2), finBox2);
  check('Excel sheet: budget, other currency and rate from the Summary tab', await q.page.inputValue('#closing-report-budget') === '35560' && await q.page.inputValue('#closing-report-other') === '28000' &&
    await q.page.inputValue('#closing-report-rate') === '1.27' && await q.page.inputValue('#closing-report-cur') === 'USD');
  check('Excel sheet: its accrual line comes in', await q.page.inputValue('[data-fin-acc="amount"]') === '200');
  const dl4 = q.page.waitForEvent('download', { timeout: 15000 });
  await q.page.click('#closing-report-download');
  const f4 = (await docText(q.page, await (await dl4).path())).text;
  check('Excel sheet: summary with other currency', /\| SGD \| Other Currency \(USD\) \| Exchange Rate/.test(f4) && /Project total budget \| \$ 35,560\.00 \| USD 28,000\.00 \| 1\.27/.test(f4) &&
    /Project external spend \| \$ 15,696\.97/.test(f4) && /tGross profit margin vs spending \| 55\.86% \| 44\.14%/.test(f4), (f4.match(/Other Currency[\s\S]{0,300}/) || [''])[0]);
  check('Excel sheet: date serial shown as a date', / \| 31\/03\/2026 \| DAK\/INV\/0326-01/.test(f4), (f4.match(/[^\n]*DAK\/INV[^\n]*/) || [''])[0]);
  check('Excel sheet: note says the budget came from it', /Budget from the Summary tab of Done Job_Transaction Report\.xlsx/.test(f4));

  // Something that isn't a transaction report
  await q.page.click('#projects-grid .project-menu-toggle[data-project="Done Job"]'); await q.page.waitForTimeout(300);
  await q.page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await q.page.waitForTimeout(800);
  await q.page.click('[data-fin-remove]'); await q.page.waitForTimeout(200);
  await q.page.setInputFiles('#closing-report-file', { name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2\n') });
  await q.page.waitForTimeout(500);
  check('a file that isn\'t a transaction report says so', /doesn't look like a QuickBooks Transaction Report/.test(await q.page.textContent('#closing-report-fin')));
  check('no page errors (finance file)', q.errors.length === 0, q.errors.join(' || '));
  await q.ctx.close();

  // ---- Not finance: nothing shows ----
  const z = await newPage(browser, '2026-11-19T11:00:00', 'zenon');
  await skipTours(z.page);
  check('no Rates & roles for others', await z.page.$eval('#btn-rates', b => b.classList.contains('hidden')));
  await openReport(z.page);
  check('no Make closing report for others', !(await z.page.$('.project-report-btn')));
  check('no page errors (others)', z.errors.length === 0, z.errors.join(' || '));
  await z.ctx.close();

  // ---- Rules not published yet: rates typed in the report window, for that report only ----
  const d = await newPage(browser, '2026-11-19T11:00:00', 'deane', false, true);
  await skipTours(d.page);
  await d.page.click('#user-menu-trigger'); await d.page.waitForTimeout(200);
  await d.page.click('#btn-rates'); await d.page.waitForTimeout(500);
  check('Rates & roles explains the rules are not published', /haven't been published/.test(await d.page.textContent('#rates-body')));
  await d.page.keyboard.press('Escape'); await d.page.waitForTimeout(200);
  await openReport(d.page);
  await d.page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await d.page.waitForTimeout(800);
  check('report window shows rate boxes', !!(await d.page.$('#closing-report-rates [data-rr-rate="ad"]')));
  check('people on the project get a suggested role', await d.page.$eval('[data-rr-person="Mychelle Tan"]', s => s.value) === 'ad' && await d.page.$eval('[data-rr-person="Harin Lee"]', s => s.value) === 'post');
  check('no amounts before rates are typed', /5 time entries, 5\.50 hours\.$/.test(await d.page.textContent('#closing-report-summary')));
  await d.page.fill('[data-rr-rate="ad"]', '150');
  await d.page.fill('[data-rr-rate="creative"]', '100');
  await d.page.fill('[data-rr-rate="post"]', '60');
  await d.page.waitForTimeout(200);
  check('summary adds up as rates are typed', /internal spend \$\s515\.00/.test(await d.page.textContent('#closing-report-summary')), await d.page.textContent('#closing-report-summary'));
  await d.page.screenshot({ path: path.join(OUT, 'closing-report-typed-rates.png') });
  const dl2 = d.page.waitForEvent('download', { timeout: 15000 });
  await d.page.click('#closing-report-download');
  const t2 = (await docText(d.page, await (await dl2).path())).text;
  check('typed rates used in the document', /\*Project internal spend \| \$ 515\.00/.test(t2) && /Harin Lee \| 1\.50 \| \$ 90\.00/.test(t2) && /Post production \(60\/hr\) \| 1\.50 \| \$ 90\.00/.test(t2));
  check('typed rates are not saved', await d.page.evaluate(() => !window.__fb.writes.some(w => w.col === 'finance')));
  await d.page.click('#projects-grid .project-menu-toggle[data-project="Done Job"]'); await d.page.waitForTimeout(300);
  await d.page.click('#projects-grid .project-report-btn[data-project="Done Job"]'); await d.page.waitForTimeout(800);
  check('typed rates kept for the next report this visit', await d.page.inputValue('[data-rr-rate="post"]') === '60');
  check('no page errors (rules not published)', d.errors.length === 0, d.errors.join(' || '));
  await d.ctx.close();

  await browser.close();
  console.log(results.join('\n'));
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
