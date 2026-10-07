# Tests

Browser tests that load the real `index.html` in Chromium with Firebase replaced by an in-memory
stand-in (`fbstub.js`), seed some tasks and people, click through a feature and check the result.
They run on every push to `main` (`.github/workflows/tests.yml`); a failure shows as a red X on the
commit and in GitHub's email.

```
node tests/run.mjs              # all suites
node tests/run.mjs phone sync   # only suites whose file name contains these words
```

Locally, don't `npm install` here (this folder is on the Shared Drive and would sync thousands of
files). Point `NODE_PATH` at any `node_modules` that has `playwright` 1.63 and its Chromium, e.g.
`NODE_PATH=/path/to/node_modules node tests/run.mjs`.

Each `*.test.js` is self-contained: a seed, a `newPage` helper and a list of `check(name, ok)` lines
printed as `PASS`/`FAIL`. `run.mjs` fails a suite on any FAIL, a crash, or an error logged by the
page. Screenshots go to `tests/.out/` (ignored by git). Times are Singapore time (`TZ`).

`fbstub.js` has `window.__fb.remote(fn)` to change data "from another client" and fire snapshots,
which is how the sync tests simulate a teammate's edit.

**When a New Updates item gets a `tourTarget`**, add its tour id (`cl-<release id>`) to the
`toursSeen` list in every suite's seed, or that one-step tour covers the page and blocks the clicks.

When you change a feature, update its suite in the same commit; a check that encoded the old
behaviour should be changed, not deleted.
