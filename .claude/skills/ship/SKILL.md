---
name: ship
description: Ship the current Project Manager changes to the live site. Use when the user says "ship", "push", "deploy" or "release" for this repo. Bumps the build stamp, writes the New Updates entry, runs the syntax check, optionally screenshots the change, then commits and pushes to main.
---

# Ship a Project Manager release

Pushing to `main` publishes to GitHub Pages within a minute or two. Every step below exists because
skipping it has broken the live board before. Do them in order and don't skip any.

## 1. See what is going out

Run `git status` and `git diff --stat`. If nothing has changed, say so and stop. If the change
touches `firestore.rules` or `storage.rules`, warn the user that rules do NOT deploy with the site:
they need `firebase deploy --only firestore:rules` (or `--only storage`) or pasting into the
Firebase console. Otherwise the new feature fails with "Missing or insufficient permissions".

## 2. Write the New Updates entry (if the team would notice the change)

Add a release to the top of `var CHANGELOG = [` in `index.html`:

```js
{ id: '2026-10-06x', date: '2026-10-06', items: [
  { type: 'improved', title: 'Short title', text: "Plain sentence about what changed and where to find it." }
] },
```

- `id` must be unique: today's date plus the next unused letter. Grep for today's date first.
- `type` is `new`, `improved` or `fixed`.
- **Put `text` in double quotes.** An apostrophe ("you're", "deliverable's") inside single quotes
  breaks the whole page. This has happened several times.
- Write for the team, not developers: what changed and where to find it, never function names.
  Friendly and short. No emoji.
- If a later change makes an earlier entry from the same week untrue, rewrite that entry rather
  than contradict it.
- Pure internal fixes nobody would notice can skip this step.

## 3. Bump the build stamp (both places, same value)

Set the same UTC timestamp (`date -u +%Y-%m-%dT%H:%M:%SZ`) in BOTH:
- `var CURRENT_BUILD_VERSION = "...";` near the bottom of `index.html`
- `version.txt` (no trailing newline)

If they differ, every open copy of the app reloads forever.

## 4. Syntax check

```
node scripts/check-syntax.mjs
```

It must say "Syntax check passed" and "Build stamp matches". If it fails, fix it and run it
again. Never push a failure: one syntax error takes down the entire app.

## 5. Look at it (for visual changes)

If the change is visual and Playwright is available (it's installed in the session scratchpad,
not the repo), render the affected markup in Chromium and look at the screenshot in light and
dark mode. Use a viewport wider than 767px, or the sidebar turns into the hidden mobile drawer.
If you can't check it in a browser, say so plainly in the final message.

## 6. Keep CLAUDE.md current

If the change sets a new rule, reverses an earlier decision or adds a pattern worth reusing,
note it in `CLAUDE.md` in the same commit, with the reason.

## 7. Commit and push

```
git add <the changed files>
git commit -m "<Area>: <what changed>"   # end with the Co-Authored-By line from the session's attribution reminder
git push
```

Commit to `main` (this repo deploys from it). The pre-push hook runs the syntax check again.
Don't bypass it with `--no-verify`.

## 8. Report

One or two lines: the commit hash, that the site updates within a minute or two (open tabs get
the "new version is ready" banner), any manual step still needed (rules deploy), and anything
that wasn't checked in a browser.
