#!/usr/bin/env node
// One-way, auditable sync of the web UI shell into the desktop renderer (CV3a).
// Usage: node scripts/sync-desktop.mjs [--target <dir>] [--dry-run] [--check] [--allow-dirty]
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {builtinModules} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = '.sync-manifest.json';
const EXTENSIONS = ['', '.tsx', '.ts', '.mjs', '.js', '.jsx', '.json', '.css'];
const posix = p => p.split(path.sep).join('/');
const sha256 = data => createHash('sha256').update(data).digest('hex');

// Static `from`, side-effect `import`, dynamic `import()` and `require()`; CSS `@import` is handled apart.
const JS_IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"])([^'"\n]+)\2/g;
const CSS_IMPORT = /(@import\s+(?:url\(\s*)?)(['"])([^'"\n]+)\2/g;
const importPattern = file => (file.endsWith('.css') ? CSS_IMPORT : JS_IMPORT);

// A match on a comment line (JSDoc `import('hast')`, prose) is not an import.
const inComment = (text, at) => /^\s*(\*|\/\/|\/\*)/.test(text.slice(text.lastIndexOf('\n', at) + 1, at + 1));

export function findImports(file, text) {
  return [...text.matchAll(importPattern(file))].filter(m => !inComment(text, m.index)).map(m => m[3]);
}

export function loadConfig(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'desktop-sync.json'), 'utf8'));
}

function fileOnDisk(root, rel) {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) && fs.statSync(abs).isFile();
}

// Returns a repo-relative file for a local specifier, or null when nothing on disk matches.
function resolveLocal(root, spec, fromFile) {
  const base = spec.startsWith('@/') ? 'src/' + spec.slice(2) : posix(path.posix.join(path.posix.dirname(fromFile), spec));
  for (const ext of EXTENSIONS) if (fileOnDisk(root, base + ext)) return base + ext;
  for (const ext of EXTENSIONS.slice(1)) if (fileOnDisk(root, `${base}/index${ext}`)) return `${base}/index${ext}`;
  return null;
}

const isLocal = spec => spec.startsWith('.') || spec.startsWith('@/');
const packageName = spec => spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/');
const BUILTINS = new Set(builtinModules);

function serverOnlyReason(spec, config) {
  if (spec.startsWith('node:') || BUILTINS.has(spec)) return `imports Node built-in "${spec}"`;
  const hit = config.serverOnlySpecifiers.find(s => spec === s || spec.startsWith(s + '/'));
  return hit ? `imports server-only "${spec}"` : null;
}

function deniedReason(file, config) {
  if (config.allowedExceptions[file]) return null;
  const hit = config.deniedPaths.find(p => file.startsWith(p) || path.posix.basename(file).startsWith(p));
  return hit ? `denied path "${hit}"` : config.excludedFiles[file] ?? null;
}

// Follows imports from the entries. `.mjs` modules bring their `.d.mts` types along.
export function resolveClosure(root, config) {
  const files = new Set();
  const excluded = new Map(); // file -> {reason, requiredBy: Set}
  const packages = new Map(); // package -> Set of files
  const exceptions = new Map(); // denied-folder files the shell imports anyway -> why
  const errors = [];
  const queue = [...config.entries, ...config.extras];
  const seen = new Set();
  const exclude = (file, reason, from) => {
    const entry = excluded.get(file) ?? {reason, requiredBy: new Set()};
    if (from) entry.requiredBy.add(from);
    excluded.set(file, entry);
  };
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!fileOnDisk(root, file)) { errors.push(`missing source file ${file}`); continue; }
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const specs = findImports(file, text);
    const reason = deniedReason(file, config) ?? specs.map(s => serverOnlyReason(s, config)).find(Boolean);
    if (reason) { exclude(file, reason); continue; }
    files.add(file);
    if (config.allowedExceptions[file]) exceptions.set(file, config.allowedExceptions[file]);
    if (file.endsWith('.mjs') && fileOnDisk(root, file.replace(/\.mjs$/, '.d.mts'))) queue.push(file.replace(/\.mjs$/, '.d.mts'));
    for (const spec of specs) {
      if (!isLocal(spec)) {
        if (!(spec.startsWith('tailwindcss') && file.endsWith('.css'))) {
          if (!packages.has(packageName(spec))) packages.set(packageName(spec), new Set());
          packages.get(packageName(spec)).add(file);
        }
        continue;
      }
      const target = resolveLocal(root, spec, file);
      if (!target) { errors.push(`${file} imports "${spec}" which does not resolve`); continue; }
      queue.push(target);
    }
  }
  // An included file that needs an excluded one would not compile in the desktop.
  for (const [file, entry] of excluded) {
    for (const from of entry.requiredBy) errors.push(`${from} needs excluded ${file} (${entry.reason})`);
  }
  for (const file of files) {
    for (const spec of findImports(file, fs.readFileSync(path.join(root, file), 'utf8'))) {
      const target = isLocal(spec) ? resolveLocal(root, spec, file) : null;
      if (target && excluded.has(target)) errors.push(`${file} needs excluded ${target} (${excluded.get(target).reason})`);
    }
  }
  return {files: [...files].sort(), excluded, packages, exceptions, errors: [...new Set(errors)]};
}

// Files outside src/ (such as public/*.json) land under src/shared/_root/ and keep working relative imports.
export const destPath = (file, dest) => (file.startsWith('src/') ? `${dest}/${file.slice(4)}` : `${dest}/_root/${file}`);

// Rewrites `@/x` to `@shared/x` and relative imports that leave src/ to `@shared/_root/...`.
export function rewriteImports(file, text) {
  return text.replace(importPattern(file), (whole, lead, quote, spec, at) => {
    if (inComment(text, at)) return whole;
    if (spec.startsWith('@/')) return `${lead}${quote}@shared/${spec.slice(2)}${quote}`;
    if (!spec.startsWith('.')) return whole;
    const abs = path.posix.join(path.posix.dirname(file), spec);
    if (abs.startsWith('src/')) return whole;
    return `${lead}${quote}@shared/_root/${abs}${quote}`;
  });
}

export function transform(file, source) {
  const text = rewriteImports(file, source.replace(/\r\n/g, '\n'));
  const left = findImports(file, text).filter(s => s.startsWith('@/'));
  if (left.length) throw new Error(`${file} still has unrewritten ${left.join(', ')}`);
  return text;
}

export function buildPlan(root, config) {
  const closure = resolveClosure(root, config);
  const out = new Map();
  for (const file of closure.files) {
    const bytes = Buffer.from(transform(file, fs.readFileSync(path.join(root, file), 'utf8')));
    out.set(destPath(file, config.dest), {source: file, bytes, hash: sha256(bytes)});
  }
  return {...closure, out};
}

function git(root, args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trimEnd();
}

// Modified or untracked source files in the synced set (the closure plus the config and the script).
export function dirtySources(root, files) {
  const paths = [...files, 'scripts/desktop-sync.json', 'scripts/sync-desktop.mjs'];
  const status = git(root, ['status', '--porcelain', '--', ...paths]);
  return status ? status.split('\n').map(line => line.slice(3)) : [];
}

export function sourceId(root, dirty) {
  return `datumm-web@${git(root, ['rev-parse', '--short', 'HEAD']).trim()}${dirty ? '-dirty' : ''}`;
}

const readManifest = dir => {
  const file = path.join(dir, MANIFEST);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
};

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e =>
    e.isDirectory() ? listFiles(path.join(dir, e.name), base) : [posix(path.relative(base, path.join(dir, e.name)))]);
}

export function applySync({target, plan, source, config}) {
  const shared = path.join(target, config.dest);
  const previous = readManifest(shared);
  const files = {};
  for (const [dest, {bytes, hash}] of [...plan.out].sort(([a], [b]) => a.localeCompare(b))) {
    const abs = path.join(target, dest);
    fs.mkdirSync(path.dirname(abs), {recursive: true});
    fs.writeFileSync(abs, bytes);
    files[path.posix.relative(config.dest, dest)] = hash;
  }
  const removed = Object.keys(previous?.files ?? {}).filter(f => !(f in files));
  for (const f of removed) fs.rmSync(path.join(shared, f), {force: true});
  fs.writeFileSync(path.join(shared, MANIFEST), JSON.stringify({source, files}, null, 2) + '\n');
  return {written: Object.keys(files).length, removed};
}

// Drift means the target no longer matches the manifest, or the manifest no longer matches the source.
export function checkSync({target, plan, config}) {
  const shared = path.join(target, config.dest);
  const manifest = readManifest(shared);
  if (!manifest) return [`no ${config.dest}/${MANIFEST}: run the sync`];
  const drift = [];
  const expected = new Map([...plan.out].map(([dest, v]) => [path.posix.relative(config.dest, dest), v]));
  for (const [file, hash] of Object.entries(manifest.files)) {
    const abs = path.join(shared, file);
    if (!fs.existsSync(abs)) drift.push(`missing in target: ${file}`);
    else if (sha256(fs.readFileSync(abs)) !== hash) drift.push(`edited in target: ${file}`);
    if (!expected.has(file)) drift.push(`no longer in the allowlist: ${file}`);
    else if (expected.get(file).hash !== hash) drift.push(`source changed since sync: ${file}`);
  }
  for (const file of expected.keys()) if (!(file in manifest.files)) drift.push(`new in the allowlist: ${file}`);
  for (const file of listFiles(shared)) if (file !== MANIFEST && !(file in manifest.files)) drift.push(`unmanaged file in target: ${file}`);
  return drift;
}

export function summarize(plan, config, log = console.log) {
  const folders = new Map();
  for (const f of plan.files) {
    const key = path.posix.dirname(f).split('/').slice(0, 3).join('/');
    folders.set(key, (folders.get(key) ?? 0) + 1);
  }
  log(`Allowlist: ${plan.files.length} files`);
  for (const [k, n] of [...folders].sort()) log(`  ${String(n).padStart(4)}  ${k}`);
  log(`Never synced: ${[...config.deniedPaths, ...Object.keys(config.excludedFiles)].join(', ')}`);
  log(`Excluded after being imported: ${plan.excluded.size}`);
  for (const [f, e] of [...plan.excluded].sort()) log(`  ${f}: ${e.reason}${e.requiredBy.size ? ` (needed by ${[...e.requiredBy].join(', ')})` : ''}`);
  log(`Included by exception: ${plan.exceptions.size}`);
  for (const [f, why] of [...plan.exceptions].sort()) log(`  ${f}: ${why}`);
  log(`External packages the shell imports (the desktop must provide them): ${plan.packages.size}`);
  log('  ' + [...plan.packages.keys()].sort().join(', '));
  for (const e of plan.errors) log(`ERROR: ${e}`);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target') opts.target = argv[++i];
    else if (['--dry-run', '--check', '--allow-dirty'].includes(argv[i])) opts[argv[i].slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = true;
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return opts;
}

export function main(argv, root = path.dirname(SCRIPT_DIR)) {
  const opts = parseArgs(argv);
  const config = loadConfig(root);
  const target = path.resolve(root, opts.target ?? config.target);
  const plan = buildPlan(root, config);
  summarize(plan, config);
  if (plan.errors.length) { console.error('The allowlist cannot compile in the desktop; fix the exclusions first.'); return 1; }
  if (opts.check) {
    const drift = checkSync({target, plan, config});
    drift.forEach(d => console.log(`DRIFT: ${d}`));
    console.log(drift.length ? `${drift.length} drift item(s)` : 'No drift.');
    return drift.length ? 1 : 0;
  }
  const dirty = dirtySources(root, plan.files);
  if (dirty.length && !opts.allowDirty) {
    console.error(`Refusing to sync: uncommitted changes in synced paths (use --allow-dirty):\n  ${dirty.join('\n  ')}`);
    return 1;
  }
  const source = sourceId(root, dirty.length > 0);
  if (opts.dryRun) {
    console.log(`Dry run: would write ${plan.out.size} files to ${path.join(target, config.dest)} as ${source}.`);
    return 0;
  }
  if (!fs.existsSync(target)) { console.error(`Target ${target} does not exist.`); return 1; }
  const {written, removed} = applySync({target, plan, source, config});
  console.log(`Synced ${written} files as ${source}; removed ${removed.length} stale.`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
