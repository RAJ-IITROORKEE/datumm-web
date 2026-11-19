// @lat: [[contracts#Desktop shared-shell sync]]
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {
  applySync, buildPlan, checkSync, dirtySources, findImports, loadConfig, rewriteImports, main,
} from '../scripts/sync-desktop.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

const config = {
  entries: ['src/components/entry.tsx'],
  extras: [],
  deniedPaths: ['src/components/admin/', 'src/app/api/'],
  allowedExceptions: {},
  excludedFiles: {'src/lib/backend.ts': 'server only'},
  serverOnlySpecifiers: ['server-only', 'next/headers'],
  dest: 'src/shared',
};

const FILES = {
  'src/components/entry.tsx': [
    "import {a} from '@/lib/a.mjs';",
    "import styles from './entry.module.css';",
    "import data from '../../public/data.json';",
    "const lazy = () => import('@/lib/lazy.mjs');",
    "// import x from '@/lib/never.mjs'",
  ].join('\r\n'),
  'src/components/entry.module.css': '.a{}',
  'src/lib/a.mjs': "import {b} from './b.mjs';\nexport const a = 1;\n",
  'src/lib/a.d.mts': "import type {B} from '@/lib/b.mjs';\nexport const a: number;\n",
  'src/lib/b.mjs': 'export const b = 2;\n',
  'src/lib/b.d.mts': 'export const b: number;\n',
  'src/lib/lazy.mjs': 'export const lazy = 3;\n',
  'src/lib/never.mjs': 'export const never = 0;\n',
  'public/data.json': '{"v":1}\n',
};

function fixture(extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-src-'));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-dst-'));
  for (const [file, text] of Object.entries({...FILES, ...extra})) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  }
  return {root, target};
}

test('static, dynamic and side-effect imports are found, and comments are not imports', () => {
  assert.deepEqual(
    findImports('x.tsx', "import 'a';\nimport {b} from \"b\";\nconst c = import('c');\n * import('hast')\nexport * from './d';"),
    ['a', 'b', 'c', './d'],
  );
});

test('@/ becomes @shared/ in static, dynamic and type-only imports, and files outside src/ get a _root alias', () => {
  const out = rewriteImports('src/components/x.tsx',
    "import a from '@/lib/a.mjs';\nimport type {T} from '@/lib/t';\nconst l = import('@/lib/l.mjs');\nimport j from '../../public/j.json';\nimport s from './s.module.css';\n");
  assert.equal(out,
    "import a from '@shared/lib/a.mjs';\nimport type {T} from '@shared/lib/t';\nconst l = import('@shared/lib/l.mjs');\nimport j from '@shared/_root/public/j.json';\nimport s from './s.module.css';\n");
});

test('the closure follows css, json, dynamic imports and .d.mts siblings, and ignores comments', () => {
  const {root} = fixture();
  const plan = buildPlan(root, config);
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.files, [
    'public/data.json', 'src/components/entry.module.css', 'src/components/entry.tsx', 'src/lib/a.d.mts',
    'src/lib/a.mjs', 'src/lib/b.d.mts', 'src/lib/b.mjs', 'src/lib/lazy.mjs',
  ]);
  const entry = plan.out.get('src/shared/components/entry.tsx').bytes.toString();
  assert.ok(!entry.includes('\r'), 'LF only');
  assert.match(entry, /@shared\/lib\/a\.mjs/);
  assert.match(entry, /@shared\/_root\/public\/data\.json/);
  assert.ok(plan.out.has('src/shared/_root/public/data.json'));
});

test('server-only files and denied folders are excluded with a reason, and a needed one is an error', () => {
  const {root} = fixture({
    'src/lib/a.mjs': "import 'server-only';\nexport const a = 1;\n",
    'src/lib/lazy.mjs': "import {admin} from '@/components/admin/x.tsx';\nexport const lazy = admin;\n",
    'src/components/admin/x.tsx': 'export const admin = 1;\n',
  });
  const plan = buildPlan(root, config);
  assert.match(plan.excluded.get('src/lib/a.mjs').reason, /server-only/);
  assert.match(plan.excluded.get('src/components/admin/x.tsx').reason, /denied/);
  assert.ok(!plan.files.includes('src/lib/a.mjs'));
  assert.equal(plan.errors.length, 2);
  assert.ok(plan.errors.every(e => /needs excluded/.test(e)));
});

test('Node built-ins mark a module server-only', () => {
  const {root} = fixture({'src/lib/b.mjs': "import fs from 'node:fs';\nexport const b = fs;\n"});
  assert.match(buildPlan(root, config).excluded.get('src/lib/b.mjs').reason, /node:fs/);
});

test('allowedExceptions admit a single file from a denied folder', () => {
  const {root} = fixture({
    'src/lib/a.mjs': "import {x} from '@/components/admin/x.tsx';\nexport const a = x;\n",
    'src/components/admin/x.tsx': 'export const x = 1;\n',
  });
  const plan = buildPlan(root, {...config, allowedExceptions: {'src/components/admin/x.tsx': 'why'}});
  assert.deepEqual(plan.errors, []);
  assert.ok(plan.files.includes('src/components/admin/x.tsx'));
  assert.equal(plan.exceptions.get('src/components/admin/x.tsx'), 'why');
});

test('sync writes a manifest of sha256 hashes, then --check detects every kind of drift', () => {
  const {root, target} = fixture();
  const plan = buildPlan(root, config);
  const result = applySync({target, plan, source: 'datumm-web@test', config});
  assert.equal(result.written, plan.out.size);
  const manifest = JSON.parse(fs.readFileSync(path.join(target, 'src/shared/.sync-manifest.json'), 'utf8'));
  assert.equal(manifest.source, 'datumm-web@test');
  assert.match(manifest.files['lib/a.mjs'], /^[0-9a-f]{64}$/);
  assert.deepEqual(checkSync({target, plan, config}), []);

  fs.appendFileSync(path.join(target, 'src/shared/lib/b.mjs'), '// edit\n');
  fs.rmSync(path.join(target, 'src/shared/lib/lazy.mjs'));
  fs.writeFileSync(path.join(target, 'src/shared/own.ts'), '');
  fs.appendFileSync(path.join(root, 'src/lib/a.mjs'), 'export const more = 1;\n');
  const drift = checkSync({target, plan: buildPlan(root, config), config}).join('\n');
  assert.match(drift, /edited in target: lib\/b\.mjs/);
  assert.match(drift, /missing in target: lib\/lazy\.mjs/);
  assert.match(drift, /unmanaged file in target: own\.ts/);
  assert.match(drift, /source changed since sync: lib\/a\.mjs/);
});

test('a re-sync removes files that left the allowlist and nothing else', () => {
  const {root, target} = fixture();
  applySync({target, plan: buildPlan(root, config), source: 's', config});
  fs.writeFileSync(path.join(root, 'src/components/entry.tsx'), "import {a} from '@/lib/a.mjs';\n");
  const second = applySync({target, plan: buildPlan(root, config), source: 's', config});
  assert.ok(second.removed.includes('lib/lazy.mjs'));
  assert.ok(!fs.existsSync(path.join(target, 'src/shared/lib/lazy.mjs')));
  assert.deepEqual(checkSync({target, plan: buildPlan(root, config), config}), []);
});

test('a dirty synced path blocks the sync unless --allow-dirty', () => {
  const {root, target} = fixture();
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {cwd: root, stdio: 'ignore'});
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.writeFileSync(path.join(root, 'scripts/desktop-sync.json'), JSON.stringify(config));
  git('init'); git('add', '.'); git('commit', '-m', 'init');
  const files = buildPlan(root, config).files;
  assert.deepEqual(dirtySources(root, files), []);
  fs.appendFileSync(path.join(root, 'src/lib/b.mjs'), '// dirty\n');
  assert.deepEqual(dirtySources(root, files), ['src/lib/b.mjs']);
  const quiet = console.log;
  console.log = console.error = () => {};
  try {
    assert.equal(main(['--target', target], root), 1);
    assert.equal(fs.existsSync(path.join(target, 'src/shared')), false);
    assert.equal(main(['--target', target, '--allow-dirty'], root), 0);
    assert.match(JSON.parse(fs.readFileSync(path.join(target, 'src/shared/.sync-manifest.json'), 'utf8')).source, /-dirty$/);
  } finally { console.log = quiet; }
});

test('--dry-run writes nothing', () => {
  const {root, target} = fixture();
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.writeFileSync(path.join(root, 'scripts/desktop-sync.json'), JSON.stringify(config));
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'init'], {cwd: root, stdio: 'ignore'});
  execFileSync('git', ['add', '.'], {cwd: root});
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-m', 'i'], {cwd: root, stdio: 'ignore'});
  const quiet = console.log;
  console.log = () => {};
  try { assert.equal(main(['--target', target, '--dry-run'], root), 0); } finally { console.log = quiet; }
  assert.deepEqual(fs.readdirSync(target), []);
});

test('the real shell resolves with no errors and none of the denied surfaces', () => {
  const real = loadConfig(ROOT);
  const plan = buildPlan(ROOT, real);
  assert.deepEqual(plan.errors, []);
  for (const must of ['src/components/workspace.tsx', 'src/components/host-provider.tsx', 'src/lib/host/contract.mjs']) {
    assert.ok(plan.files.includes(must), must);
  }
  const allowed = new Set(Object.keys(real.allowedExceptions));
  const bad = plan.files.filter(f => !allowed.has(f) &&
    (/^src\/(app\/api|components\/(admin|billing|dev))\//.test(f) || /proxy\.|middleware|next\.config/.test(f)));
  assert.deepEqual(bad, []);
  assert.ok(!plan.files.includes('src/lib/backend.ts'));
});
