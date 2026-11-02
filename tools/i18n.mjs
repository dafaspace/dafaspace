#!/usr/bin/env node
// dafaspace.com in every language of the apps (CLAUDE.md, Languages).
//
// index.html is the one page edited by hand, in English. Every translatable text in it carries
// a key: data-t="key" translates the element's inner HTML, data-t-attr="attr:key,attr:key" its
// attributes. Translations live in i18n/<code>.json as { key: { text, from } }, where "from" is
// the hash of the English the text was made from, so a changed English line shows as stale.
//
//   node tools/i18n.mjs build   writes i18n/en.json, the I18N block in index.html, and <code>/index.html
//                               for every language that has a translation file
//   node tools/i18n.mjs gate    the pre-commit hook's test: exits 1 only when a translation or a page is behind
//   node tools/i18n.mjs check   reports stale and missing texts, out-of-date pages, and languages an
//                               app has but the site lacks; exits 1 when anything needs doing
//
// checkSiteLanguages() is the same check as a function, for the nightly _portfolio/check-sites.mjs.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPS = path.resolve(ROOT, '..');
const SITE = 'https://dafaspace.com';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const LANGS = JSON.parse(read('i18n/languages.json'));

// Where each app keeps its language list. A list that cannot be read is reported, not skipped:
// a refactor in an app must show up here rather than let the comparison pass on nothing.
const keysOf = s => [...s.matchAll(/(?:^|[{,])\s*'?([a-z]{2}(?:-[A-Z]{2})?)'?\s*:/g)].map(m => m[1]);
const between = (s, a, b) => { const i = s.indexOf(a); if (i < 0) return ''; const j = s.indexOf(b, i + a.length); return j < 0 ? '' : s.slice(i + a.length, j); };
const APP_SOURCES = [
  { app: 'Cinemail', file: 'Cinemail/app/index.html', codes: s => [...s.matchAll(/class="lang-btn[^"]*" data-lang="([a-zA-Z-]+)"/g)].map(m => m[1]) },
  { app: 'Astrovarium', file: 'AstroVarium/index.html', codes: s => [...between(s, 'const LANGS=', ';').matchAll(/\['([a-zA-Z-]+)'/g)].map(m => m[1]) },
  { app: 'Note Catcher', file: 'Note Catcher/note-catcher/web/i18n.js', codes: s => keysOf(between(s, 'const LANGS=', '}')) },
  { app: 'Underpicture', file: 'Underpicture/app/index.html', codes: s => keysOf(between(s, 'const LANGS = {', '};')) },
];

// Every keyed text in the page, in document order: { key, start, end } spans into the html.
function spans(html) {
  const out = [];
  for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\sdata-t(?:-attr)?="[^>]*>/g)) {
    const [tag, name] = m, open = m.index;
    const attrs = /\sdata-t-attr="([^"]*)"/.exec(tag), own = /\sdata-t="([^"]*)"/.exec(tag);
    for (const pair of attrs ? attrs[1].split(',') : []) {
      const [attr, key] = pair.split(':');
      const a = new RegExp(`\\s${attr}="([^"]*)"`).exec(tag);
      if (!a) throw new Error(`${key}: no ${attr}="" on ${tag}`);
      const start = open + a.index + a[0].length - a[1].length - 1;
      out.push({ key, start, end: start + a[1].length });
    }
    if (!own) continue;
    // the element's inner HTML runs to its own closing tag, counting nested ones of the same name
    let depth = 1, close;
    const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g');
    re.lastIndex = open + tag.length;
    while ((close = re.exec(html))) { depth += close[1] ? -1 : 1; if (!depth) break; }
    if (!close) throw new Error(`${own[1]}: no closing </${name}>`);
    out.push({ key: own[1], start: open + tag.length, end: close.index });
  }
  return out.sort((a, b) => a.start - b.start);
}

function english(html) {
  const en = {};
  for (const s of spans(html)) {
    const text = html.slice(s.start, s.end);
    if (s.key in en && en[s.key] !== text) throw new Error(`key ${s.key} has two different English texts`);
    en[s.key] = text;
  }
  return en;
}

const translations = () => LANGS.filter(l => l.code !== 'en' && fs.existsSync(path.join(ROOT, 'i18n', `${l.code}.json`)))
  .map(l => ({ ...l, dict: JSON.parse(read(`i18n/${l.code}.json`)) }));

const pathOf = code => code === 'en' ? '/' : `/${code}/`;

function block(code, live, en) {
  const site = live.map(l => ({ code: l.code, name: l.name, dir: l.dir, path: pathOf(l.code),
    ...(l.dict ? { offer: { text: l.dict['offer.text']?.text, yes: l.dict['offer.yes']?.text, close: l.dict['offer.close']?.text } } : {}) }));
  const lines = [`<link rel="canonical" href="${SITE}${pathOf(code)}">`];
  if (live.length > 1) {
    for (const l of live) lines.push(`<link rel="alternate" hreflang="${l.code}" href="${SITE}${pathOf(l.code)}">`);
    lines.push(`<link rel="alternate" hreflang="x-default" href="${SITE}/">`);
  }
  lines.push(`<script>window.SITE_LANGS = ${JSON.stringify(site)}</script>`);
  return lines.map(l => '  ' + l).join('\n');
}

const setBlock = (html, inner) => html.replace(/(<!-- I18N:START[^\n]*-->\n)[\s\S]*?[ \t]*(<!-- I18N:END -->)/, (m, a, b) => a + inner + '\n  ' + b);

function render(source, lang, live, en) {
  let html = source;
  if (lang.dict) {
    for (const s of spans(source).reverse()) {
      const t = lang.dict[s.key];
      if (t?.text != null) html = html.slice(0, s.start) + t.text + html.slice(s.end);
    }
    html = html.replace('<html lang="en">', `<html lang="${lang.code}"${lang.dir === 'rtl' ? ' dir="rtl"' : ''}>`)
               .replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n  <base href="../">')
               .replace(`<meta property="og:url" content="${SITE}">`, `<meta property="og:url" content="${SITE}${pathOf(lang.code)}">`)
               .replace('<!-- I18N:START', `<!-- Generated from index.html by tools/i18n.mjs. Edit index.html and i18n/${lang.code}.json, not this file. -->\n  <!-- I18N:START`);
  }
  return setBlock(html, block(lang.code, live, en));
}

const enJson = en => JSON.stringify(Object.fromEntries(Object.entries(en).map(([k, v]) => [k, { text: v, hash: hash(v) }])), null, 2) + '\n';

export function build() {
  const source = read('index.html'), en = english(source), live = [LANGS[0], ...translations()];
  fs.writeFileSync(path.join(ROOT, 'i18n/en.json'), enJson(en));
  fs.writeFileSync(path.join(ROOT, 'index.html'), render(source, { ...LANGS[0] }, live, en));
  for (const l of live.slice(1)) {
    fs.mkdirSync(path.join(ROOT, l.code), { recursive: true });
    fs.writeFileSync(path.join(ROOT, l.code, 'index.html'), render(source, l, live, en));
  }
  return live.map(l => l.code);
}

export function checkSiteLanguages() {
  const source = read('index.html'), en = english(source), have = translations(), live = [LANGS[0], ...have];
  const r = { stale: {}, missing: {}, untranslated: [], outdated: [], appsAhead: [], unreadable: [] };
  for (const l of have) {
    const stale = [], missing = [];
    for (const [k, v] of Object.entries(en)) {
      if (!l.dict[k]) missing.push(k); else if (l.dict[k].from !== hash(v)) stale.push(k);
    }
    if (stale.length) r.stale[l.code] = stale;
    if (missing.length) r.missing[l.code] = missing;
    const file = path.join(ROOT, l.code, 'index.html');
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== render(source, l, live, en)) r.outdated.push(l.code);
  }
  if (render(source, { ...LANGS[0] }, live, en) !== source || !fs.existsSync(path.join(ROOT, 'i18n/en.json')) || read('i18n/en.json') !== enJson(en)) r.outdated.unshift('en');
  r.untranslated = LANGS.slice(1).filter(l => !have.some(h => h.code === l.code)).map(l => l.code);
  const site = new Set(LANGS.map(l => l.code));
  for (const s of APP_SOURCES) {
    let codes = [];
    try { codes = s.codes(fs.readFileSync(path.join(APPS, s.file), 'utf8')); } catch {}
    if (!codes.length) { r.unreadable.push(s.app); continue; }
    for (const c of codes) if (!site.has(c) && !r.appsAhead.some(a => a.code === c)) r.appsAhead.push({ code: c, app: s.app });
  }
  const parts = [];
  if (r.appsAhead.length) parts.push(`apps have ${r.appsAhead.map(a => `${a.code} (${a.app})`).join(', ')} and the site does not`);
  for (const [c, k] of Object.entries(r.stale)) parts.push(`${c}: ${k.length} stale`);
  for (const [c, k] of Object.entries(r.missing)) parts.push(`${c}: ${k.length} missing`);
  if (r.outdated.length) parts.push(`pages to rebuild: ${r.outdated.join(', ')} (node tools/i18n.mjs build)`);
  if (r.unreadable.length) parts.push(`cannot read the language list of ${r.unreadable.join(', ')}`);
  if (r.untranslated.length) parts.push(`${r.untranslated.length} of ${LANGS.length} languages not translated yet`);
  r.ok = !parts.length;
  // What stops a commit (tools/hooks/pre-commit): a translation behind its English, or a page behind
  // index.html. Languages not translated yet, and the apps' lists, are reported but never block.
  r.blocking = Object.keys(r.stale).length + Object.keys(r.missing).length + r.outdated.length > 0;
  r.line = 'dafaspace languages: ' + (r.ok ? `OK, ${LANGS.length} of ${LANGS.length}` : parts.join('; '));
  return r;
}

// Real paths on both sides: macOS temp folders sit behind a symlink (/var -> /private/var), and a
// mismatch here would make the pre-commit hook pass silently.
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const cmd = process.argv[2];
  if (cmd === 'build') console.log('built:', build().join(' '));
  else if (cmd === 'check') { const r = checkSiteLanguages(); console.log(r.line); for (const k of ['stale', 'missing']) for (const [c, keys] of Object.entries(r[k])) console.log(`  ${c} ${k}: ${keys.join(', ')}`); process.exit(r.ok ? 0 : 1); }
  else if (cmd === 'gate') {
    const r = checkSiteLanguages();
    if (!r.blocking) process.exit(0);
    console.error('dafaspace: commit stopped, the translations are behind the English.');
    for (const k of ['stale', 'missing']) for (const [c, keys] of Object.entries(r[k])) console.error(`  ${c} ${k}: ${keys.join(', ')}`);
    if (r.outdated.length) console.error(`  pages to rebuild: ${r.outdated.join(', ')}`);
    console.error('Translate the changed keys into every language (i18n/<code>.json, "from" = the hash in i18n/en.json),\nrun node tools/i18n.mjs build, stage the results, and commit again. See CLAUDE.md, Languages.');
    process.exit(1);
  }
  else { console.log('usage: node tools/i18n.mjs build | check | gate'); process.exit(2); }
}
