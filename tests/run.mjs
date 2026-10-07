// Runs every tests/*.test.js against index.html (Firebase replaced by tests/fbstub.js) and exits
// non-zero if any check fails, a suite crashes, or the page logs an error.
//
//   node tests/run.mjs            all suites
//   node tests/run.mjs phone sync only suites whose name contains one of the words
//
// Needs Playwright (Chromium). CI installs it with `npm ci` in tests/. Locally, point NODE_PATH at
// any node_modules that has it rather than installing into the Shared Drive folder.
import { readdirSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.out');
mkdirSync(join(out, 'mob2'), { recursive: true });
const want = process.argv.slice(2);
const files = readdirSync(here).filter(f => f.endsWith('.test.js'))
  .filter(f => !want.length || want.some(w => f.includes(w))).sort();

function run(file) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [join(here, file)], {
      cwd: out,
      // The team is in Singapore; dates and "Friday 3pm" checks are written in its local time.
      env: Object.assign({}, process.env, { TZ: 'Asia/Singapore' })
    });
    let text = '';
    child.stdout.on('data', d => { text += d; });
    child.stderr.on('data', d => { text += d; });
    const timer = setTimeout(() => child.kill(), 8 * 60 * 1000);
    child.on('close', code => { clearTimeout(timer); resolve({ code, text }); });
  });
}

let bad = 0, passed = 0;
for (const f of files) {
  const { code, text } = await run(f);
  const pass = (text.match(/^PASS /gm) || []).length;
  const fails = text.split('\n').filter(l => l.startsWith('FAIL '));
  const pageErrors = text.split('\n').filter(l => /^errors \[.+\]/.test(l.trim()) && !/^errors \[\]/.test(l.trim()));
  const crashed = code !== 0 || !pass;
  passed += pass;
  const ok = !fails.length && !pageErrors.length && !crashed;
  if (!ok) bad++;
  console.log((ok ? 'ok   ' : 'FAIL ') + f + '  (' + pass + ' passed' + (fails.length ? ', ' + fails.length + ' failed' : '') + ')');
  fails.forEach(l => console.log('       ' + l.slice(0, 200)));
  pageErrors.forEach(l => console.log('       page error: ' + l.slice(0, 200)));
  if (crashed && !fails.length) console.log('       crashed (exit ' + code + '):\n' + text.split('\n').slice(-12).map(l => '         ' + l).join('\n'));
}
console.log('\n' + (bad ? bad + ' of ' + files.length + ' suites failed' : 'All ' + files.length + ' suites passed') + ' (' + passed + ' checks)');
process.exit(bad ? 1 : 0);
