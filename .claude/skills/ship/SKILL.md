---
name: ship
description: Ship the current Project Manager changes to the live site. Use when the user says "ship", "push", "deploy" or "release" for this repo. Bumps the build stamp, writes the New Updates entry, runs the syntax check, optionally screenshots the change, then commits and pushes to main.
---

# Ship a Project Manager release

Pushing to `main` publishes to GitHub Pages within a minute or two. Every step below exists because
skipping it has broken the live board before. Do them in order and don't skip any.

## 1. See what is going out

Run `git status` and `git diff --stat`. If nothing has changed, say so and stop. Then read the full
`git diff` for anything this session didn't write: more than one session edits this Shared Drive folder,
and on 2026-10-22 another session's unfinished work was nearly shipped inside someone else's commit. If
you find foreign changes, ask the user whether to ship them too; otherwise stage only your own hunks and
leave the rest on disk (see "More than one session edits this folder" in `CLAUDE.md`). If the change
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

## 2b. Keep the help in step (only what this change affects)

The floating "?" help (`HELP_ARTICLES` in `index.html`) must describe the app as it is now. For the
change being shipped, ask: does any article name a page, button, label, menu, step or behaviour
this change added, renamed, moved or removed? Search the articles for the words involved.

- **Affected article:** rewrite just that article's `text` (and `keys` if people would now search
  with different words). Keep it a few plain sentences.
- **New feature someone could need help with:** add one article (`id`, `title` as the question's
  answer, `page`, `keys` with the words people would type, `text`, optional `act`).
- **Removed feature:** delete its article.
- **Nothing affected:** change nothing. Don't touch unrelated articles.
- Then set `HELP_CHECKED_THROUGH` to the newest New Updates release id. `check-syntax.mjs` (and so
  the pre-push hook) fails while any release is newer than it.

This applies even with no New Updates entry: if a renamed button or label appears in an article,
fix the article. `tests/help.test.js` also fails when an article's page or button no longer exists.

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

## 5. Design check (for anything people will see)

If the change alters what people see or click, run the `design-check` skill on it first and fix
what fails. It includes looking at the change in Chromium, in light and dark mode. If you can't
check it in a browser, say so plainly in the final message.

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
