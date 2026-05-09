import fs from 'node:fs';
import path from 'node:path';
import {
  Parser,
  type SatisfactorySave,
} from '@etothepii/satisfactory-file-parser';
import escapeRegExp from 'lodash/escapeRegExp';

type IncludeSection =
  | 'header'
  | 'levels'
  | 'objects'
  | 'properties'
  | 'specialProperties';

const ALL_SECTIONS: IncludeSection[] = [
  'header',
  'levels',
  'objects',
  'properties',
  'specialProperties',
];

interface CliArgs {
  input: string;
  out: string | null;
  typeRegex: RegExp | null;
  include: Set<IncludeSection>;
  limit: number | null;
  pretty: boolean;
}

function printUsageAndExit(code: number): never {
  const lines = [
    'Usage: tsx scripts/dumpSavegame.ts <input.sav> [options]',
    '',
    'Options:',
    '  --out=<path>          Output file (default <input>.dump.json, "-" for stdout)',
    '  --type=<regex>        Filter entities by typePath regex',
    '  --include=<sections>  Comma list. Choices:',
    '                          header,levels,objects,properties,specialProperties',
    '                          Default: all',
    '  --limit=<n>           Max entities per typePath bucket',
    '  --pretty              Indent output (default)',
    '  --no-pretty           Compact output',
    '  -h, --help            Show this help',
    '',
    'Example: dump up to 3 pipeline entities for inspection:',
    '  tsx scripts/dumpSavegame.ts ~/save.sav \\',
    "    --type='Build_(Pipeline|PipelineHyper)' --limit=3",
  ];
  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(code);
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') {
      printUsageAndExit(0);
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq === -1) {
        flags[arg.slice(2)] = true;
      } else {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      }
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 1) {
    process.stderr.write('Error: expected exactly one input file path.\n\n');
    printUsageAndExit(1);
  }

  const include = new Set<IncludeSection>(ALL_SECTIONS);
  if (typeof flags.include === 'string') {
    include.clear();
    for (const raw of flags.include.split(',')) {
      const s = raw.trim() as IncludeSection;
      if (!ALL_SECTIONS.includes(s)) {
        process.stderr.write(`Error: unknown --include section "${s}".\n\n`);
        printUsageAndExit(1);
      }
      include.add(s);
    }
  }

  let typeRegex: RegExp | null = null;
  if (typeof flags.type === 'string') {
    try {
      typeRegex = new RegExp(escapeRegExp(flags.type));
    } catch (e) {
      process.stderr.write(
        `Error: invalid --type regex: ${(e as Error).message}\n\n`,
      );
      printUsageAndExit(1);
    }
  }

  let limit: number | null = null;
  if (typeof flags.limit === 'string') {
    const n = Number.parseInt(flags.limit, 10);
    if (!Number.isFinite(n) || n <= 0) {
      process.stderr.write('Error: --limit must be a positive integer.\n\n');
      printUsageAndExit(1);
    }
    limit = n;
  }

  const pretty = flags['no-pretty'] !== true;
  const out =
    typeof flags.out === 'string' && flags.out.length > 0 ? flags.out : null;

  return {
    input: positional[0],
    out,
    typeRegex,
    include,
    limit,
    pretty,
  };
}

interface DumpStats {
  totalEntities: number;
  keptEntities: number;
  perType: Map<string, number>;
}

function buildOutput(save: SatisfactorySave, args: CliArgs) {
  const stats: DumpStats = {
    totalEntities: 0,
    keptEntities: 0,
    perType: new Map(),
  };

  const out: Record<string, unknown> = { name: save.name };
  if (args.include.has('header')) {
    out.header = save.header;
  }

  if (args.include.has('levels')) {
    const levels: Record<string, unknown> = {};
    for (const [levelName, level] of Object.entries(save.levels)) {
      const entry: Record<string, unknown> = { name: level.name };

      if (args.include.has('objects')) {
        const filtered: unknown[] = [];
        for (const obj of level.objects) {
          stats.totalEntities++;
          const tp = (obj as { typePath?: unknown }).typePath;
          if (typeof tp !== 'string') continue;
          if (args.typeRegex && !args.typeRegex.test(tp)) continue;
          if (args.limit != null) {
            const n = stats.perType.get(tp) ?? 0;
            if (n >= args.limit) continue;
          }

          const cloned = { ...(obj as unknown as Record<string, unknown>) };
          if (!args.include.has('properties')) {
            delete cloned.properties;
          }
          if (!args.include.has('specialProperties')) {
            delete cloned.specialProperties;
          }
          filtered.push(cloned);
          stats.keptEntities++;
          stats.perType.set(tp, (stats.perType.get(tp) ?? 0) + 1);
        }
        entry.objects = filtered;
      }

      levels[levelName] = entry;
    }
    out.levels = levels;
  }

  return { payload: out, stats };
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' && value === 0 && 1 / value < 0) return '-0';
  if (value instanceof Uint8Array) {
    return { _binary: true, length: value.byteLength };
  }
  if (value instanceof ArrayBuffer) {
    return { _binary: true, length: value.byteLength };
  }
  return value;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.input)) {
    process.stderr.write(`Error: file not found: ${args.input}\n`);
    process.exit(1);
  }

  const buf = fs.readFileSync(args.input);
  const ab = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
  const name = path.basename(args.input, path.extname(args.input));

  let lastLog = 0;
  const save = Parser.ParseSave(name, ab, {
    onProgressCallback: (progress: number, msg?: string) => {
      const now = Date.now();
      if (now - lastLog < 100 && progress < 1) return;
      lastLog = now;
      const pct = Math.round(progress * 100);
      const line = `Parsing... ${String(pct).padStart(3)}% ${msg ?? ''}`;
      process.stderr.write(`\r${line.padEnd(80)}`);
    },
  });
  process.stderr.write('\n');

  const { payload, stats } = buildOutput(save, args);
  const json = JSON.stringify(payload, jsonReplacer, args.pretty ? 2 : 0);

  const outPath = args.out ?? `${args.input}.dump.json`;
  if (outPath === '-') {
    process.stdout.write(json);
  } else {
    fs.writeFileSync(outPath, json);
    process.stderr.write(`Wrote ${formatBytes(json.length)} to ${outPath}\n`);
  }

  process.stderr.write(
    `Entities: ${stats.keptEntities}/${stats.totalEntities} kept`,
  );
  if (stats.perType.size > 0 && stats.perType.size <= 20) {
    process.stderr.write(' (per typePath:');
    for (const [tp, n] of stats.perType) {
      process.stderr.write(`\n  ${n.toString().padStart(6)}  ${tp}`);
    }
    process.stderr.write('\n)\n');
  } else {
    process.stderr.write(`, ${stats.perType.size} distinct typePaths\n`);
  }
}

main().catch(err => {
  process.stderr.write(`\n${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
