# dafaspace.com

Project specifics that win over the portfolio rules in `My Apps/CLAUDE.md` where they differ.

Personal site of Daniel Fainberg: who he is, and a card for each dafaspace project. One
`index.html`, no build step, on GitHub Pages behind Cloudflare (SSL mode "Full", see
`_HQ/DOMAINS.md`). A push to `main` is a release; Pages deploys in about a minute.

## Where the facts come from

`_HQ/PROJECTS-2026-11.md` holds every project's stage, name, links and languages. Ask the _HQ
session about any project before changing its card. A card says only what is true today: no
"coming soon", no feature the build does not have.

## Files you do not edit here

- `logo-anim.js`, `logo-word.svg`, `logo-static.svg`, `logo-mark.svg`: built in _Tastebook by
  `tools/build_logo.py` (from `rounds/site/dist/`). Copy them over unchanged; ask _Tastebook for
  any change to the logo or its motion.
- The `FRESH:START` / `FRESH:END` block in `index.html`: written weekly by
  `_portfolio/site-weekly.mjs`. Edit the badge style or the script, not the block.
- `business-plan-SLAP.md`, `cinemail-translations.md`: private, git-ignored, never published.

Other sessions sometimes leave uncommitted work in this folder. Commit only your own change, and
leave the rest unstaged and untouched.

## Languages (Dafa, 2 Nov 2026)

- The site carries **every language used by any dafaspace app**, the union, not a house subset.
  On 2 Nov that is 12: en ru uk ka es fr de it pt-BR tr ja he. Hebrew is right-to-left, so the
  layout handles `dir="rtl"`.
- **When any app adds a language, the site adds it too.**
- Translation starts once the English text has settled. Before the first translation ships:
  all texts in one keyed file, each translation storing a hash of the English it came from; a
  nightly check that flags stale translations on the Sites line, and that also compares the
  union of the apps' language lists (the places in the language table of
  `_HQ/PROJECTS-2026-11.md`) with the site's languages; status badges as a small fixed set of
  phrases.
- Every English edit updates all languages in the same commit. The nightly check is a safety net,
  not the plan.
- Review: Dafa reads ru and uk; a native reader checks ka; the rest get a back-translation check.
  App names are never translated.
- The URL scheme is still open as of 2 Nov: separate `/xx/` pages with the app-style switcher, or
  not. Write the decision here when Dafa makes it.

## Look

- The accent is `#D96512`. App names on cards all use `var(--text)`.
- Status and "Updated this week" badges use the muted style.
- `h1` is 24px everywhere.
- The bio folds under "More about me" so the first project card fits on a phone screen. Keep it
  that way.
