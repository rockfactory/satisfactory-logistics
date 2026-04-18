import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = resolve(ROOT, 'dist-map-tiles');
const MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 6;
const DEFAULT_WEBP_QUALITY = 80;
const DEFAULT_RESAMPLING = 'lanczos';
const VALID_RESAMPLING = [
  'average',
  'near',
  'bilinear',
  'cubic',
  'cubicspline',
  'lanczos',
  'antialias',
  'mode',
] as const;

function expectedTiles(minZoom: number, maxZoom: number): number {
  return (Math.pow(4, maxZoom + 1) - Math.pow(4, minZoom)) / 3;
}

function parseArgs(argv: string[]): {
  source: string;
  maxZoom: number;
  webpQuality: number;
  webpLossless: boolean;
  resampling: string;
} {
  let source: string | undefined;
  let maxZoom = DEFAULT_MAX_ZOOM;
  let webpQuality = DEFAULT_WEBP_QUALITY;
  let webpLossless = false;
  let resampling: string = DEFAULT_RESAMPLING;
  for (const arg of argv.slice(2)) {
    const zoomMatch = arg.match(/^--max-zoom=(\d+)$/);
    const qualityMatch = arg.match(/^--webp-quality=(\d+)$/);
    const resamplingMatch = arg.match(/^--resampling=(\w+)$/);
    if (zoomMatch) {
      maxZoom = Number.parseInt(zoomMatch[1], 10);
    } else if (qualityMatch) {
      webpQuality = Number.parseInt(qualityMatch[1], 10);
    } else if (arg === '--webp-lossless') {
      webpLossless = true;
    } else if (resamplingMatch) {
      const value = resamplingMatch[1];
      if (!VALID_RESAMPLING.includes(value as (typeof VALID_RESAMPLING)[number])) {
        throw new Error(
          `Invalid --resampling=${value}. Valid: ${VALID_RESAMPLING.join(', ')}`,
        );
      }
      resampling = value;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else if (source === undefined) {
      source = arg;
    } else {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
  }
  if (!source) {
    throw new Error(
      'Usage: npm run generate-map-tiles -- <path-to-source.png> [--max-zoom=N] [--webp-quality=N] [--webp-lossless] [--resampling=NAME]',
    );
  }
  return { source, maxZoom, webpQuality, webpLossless, resampling };
}

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
  const {
    source: rawSource,
    maxZoom,
    webpQuality,
    webpLossless,
    resampling,
  } = parseArgs(process.argv);
  const source = expandTilde(rawSource);
  const expected = expectedTiles(MIN_ZOOM, maxZoom);

  console.log(`Source:     ${source}`);
  console.log(`Output:     ${OUT_DIR}`);
  console.log(`Zoom:       ${MIN_ZOOM}-${maxZoom} (${expected} tiles expected)`);
  console.log(
    `Quality:    ${webpLossless ? 'WebP lossless' : `WebP q${webpQuality}`}`,
  );
  console.log(`Resampling: ${resampling}`);
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
    `${MIN_ZOOM}-${maxZoom}`,
    '--tiledriver=WEBP',
    ...(webpLossless
      ? ['--webp-lossless']
      : [`--webp-quality=${webpQuality}`]),
    '--processes=8',
    `--resampling=${resampling}`,
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

  if (count !== expected) {
    console.warn(
      `Warning: expected ${expected} tiles for zoom ${MIN_ZOOM}-${maxZoom}, got ${count}`,
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
