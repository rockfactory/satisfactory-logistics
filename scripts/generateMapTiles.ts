import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = resolve(ROOT, 'dist-map-tiles');
const MIN_ZOOM = 0;
const MAX_ZOOM = 6;
const EXPECTED_TILES =
  (Math.pow(4, MAX_ZOOM + 1) - Math.pow(4, MIN_ZOOM)) / 3;

function expandTilde(p: string): string {
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return resolve(homedir(), p.slice(2));
  return p;
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', fail);
    child.on('exit', code => {
      if (code === 0) done();
      else fail(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function countWebpFiles(
  dir: string,
): Promise<{ count: number; bytes: number }> {
  let count = 0;
  let bytes = 0;
  const walk = async (d: string) => {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(p);
      } else if (entry.isFile() && entry.name.endsWith('.webp')) {
        count++;
        const s = await stat(p);
        bytes += s.size;
      }
    }
  };
  await walk(dir);
  return { count, bytes };
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} B`;
}

async function main() {
  const rawSource = process.argv[2];
  if (!rawSource) {
    throw new Error(
      'Usage: npm run generate-map-tiles -- <path-to-source.png>',
    );
  }
  const source = expandTilde(rawSource);

  console.log(`Source: ${source}`);
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Zoom:   ${MIN_ZOOM}-${MAX_ZOOM}`);
  console.log('');

  const sourceStat = await stat(source).catch(() => null);
  if (!sourceStat?.isFile()) {
    throw new Error(`Source file not found or not a file: ${source}`);
  }

  // Sanity: ensure GDAL tooling is on PATH.
  await run('gdalinfo', ['--version']);

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  await run('gdal2tiles.py', [
    '--profile=raster',
    '--xyz',
    '-z',
    `${MIN_ZOOM}-${MAX_ZOOM}`,
    '--tiledriver=WEBP',
    '--webp-quality=80',
    '--processes=8',
    '--resampling=lanczos',
    '-w',
    'none',
    source,
    OUT_DIR,
  ]);

  const { count, bytes } = await countWebpFiles(OUT_DIR);

  console.log('');
  console.log(
    `Done: ${count} WebP tiles, ${formatBytes(bytes)} total, in ${OUT_DIR}`,
  );

  if (count !== EXPECTED_TILES) {
    console.warn(
      `Warning: expected ${EXPECTED_TILES} tiles for zoom ${MIN_ZOOM}-${MAX_ZOOM}, got ${count}`,
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
