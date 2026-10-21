import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

const SKIP = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vercel',
  'scripts',
  'lib',
]);

async function rmDist() {
  await fs.rm(DIST, { recursive: true, force: true });
}

async function copyDir(srcRel, destRel) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(DIST, destRel);
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const ent of entries) {
      if (srcRel === '' && SKIP.has(ent.name)) continue;
      await copyDir(path.join(srcRel, ent.name), path.join(destRel, ent.name));
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}

async function main() {
  await rmDist();
  await copyDir('', '');

  const apply = spawnSync(process.execPath, ['scripts/apply-cms.mjs', `--dir=${DIST}`], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (apply.status !== 0) process.exit(apply.status ?? 1);

  await fs.copyFile(path.join(DIST, 'factoring.html'), path.join(DIST, 'index.html'));

  console.log('build → dist listo');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
