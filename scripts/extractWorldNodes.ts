import path from 'node:path';
import chalk from 'chalk';
import { parseWorldCollectibles } from './parsers/parseWorldCollectibles';
import { parseWorldNodes } from './parsers/parseWorldNodes';

/**
 * Entry point for `npm run extract-world-nodes`.
 *
 * Runs two parsers back-to-back over the same FModel dump:
 *
 *  1. {@link parseWorldNodes} — resource nodes, satellites, geysers.
 *     Reads only `Persistent_Level.json` (vanilla nodes happen to all
 *     live in the persistent level).
 *  2. {@link parseWorldCollectibles} — power slugs, somersloops,
 *     mercer spheres, hard-drive drop pods, audio tapes, customization
 *     unlocks. Reads `Persistent_Level.json` + the `_Generated_/`
 *     external-actor folder (most pickups live in UE5 World Partition
 *     external actor packages, not in the persistent level itself).
 *
 * See `scripts/parsers/*.ts` and the README's "Resource Node Data"
 * section for the maintainer workflow (how to obtain the FModel dumps).
 */

interface CliArgs {
  input: string;
  externalActorsDir: string;
  output: string;
  collectiblesOutput: string;
  dryRun: boolean;
  verbose: boolean;
  /** Skip the collectibles pass (only emit nodes). */
  nodesOnly: boolean;
  /** Skip the nodes pass (only emit collectibles). */
  collectiblesOnly: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: 'data/Persistent_Level.json',
    externalActorsDir: 'data/Persistent_Level/_Generated_',
    output: 'src/recipes/WorldResourceNodes.json',
    collectiblesOutput: 'src/recipes/WorldCollectibles.json',
    dryRun: false,
    verbose: false,
    nodesOnly: false,
    collectiblesOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--input':
      case '-i':
        args.input = argv[++i];
        break;
      case '--external-actors':
      case '-e':
        args.externalActorsDir = argv[++i];
        break;
      case '--output':
      case '-o':
        args.output = argv[++i];
        break;
      case '--collectibles-output':
        args.collectiblesOutput = argv[++i];
        break;
      case '--dry-run':
      case '-n':
        args.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        args.verbose = true;
        break;
      case '--nodes-only':
        args.nodesOnly = true;
        break;
      case '--collectibles-only':
        args.collectiblesOnly = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(chalk.red(`Unknown argument: ${arg}`));
        printHelp();
        process.exit(1);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(
    `Usage: npm run extract-world-nodes -- [options]

Options:
  -i, --input <path>             Persistent_Level JSON dump
                                 (default: data/Persistent_Level.json)
  -e, --external-actors <dir>    External-actors folder for collectibles
                                 (default: data/Persistent_Level/_Generated_)
  -o, --output <path>            Resource nodes output
                                 (default: src/recipes/WorldResourceNodes.json)
      --collectibles-output <p>  Collectibles output
                                 (default: src/recipes/WorldCollectibles.json)
      --nodes-only               Skip the collectibles pass
      --collectibles-only        Skip the nodes pass
  -n, --dry-run                  Parse and report, but do not write
  -v, --verbose                  Log every emitted entity (debug)
  -h, --help                     Show this help`,
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.collectiblesOnly) {
    runNodesPass(args);
  }
  if (!args.nodesOnly) {
    if (!args.collectiblesOnly) console.log('');
    runCollectiblesPass(args);
  }
}

function runNodesPass(args: CliArgs): void {
  console.log(chalk.cyan('Extracting world resource nodes…'));
  console.log(`  input:  ${path.resolve(args.input)}`);
  console.log(`  output: ${path.resolve(args.output)}`);
  if (args.dryRun) console.log(chalk.yellow('  (dry run — no files written)'));
  console.log('');

  const result = parseWorldNodes({
    inputPath: args.input,
    outputPath: args.output,
    dryRun: args.dryRun,
    verbose: args.verbose,
  });

  console.log('');
  console.log(chalk.cyan('--- Nodes summary -----------------------'));
  console.log(`Emitted: ${chalk.bold(result.emitted.toLocaleString())} nodes`);
  console.log('By type:');
  for (const [type, count] of Object.entries(result.byType)) {
    console.log(`  ${type.padEnd(20)} ${String(count).padStart(5)}`);
  }
  console.log('By resource:');
  const sortedResources = Object.entries(result.byResource).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [resource, count] of sortedResources) {
    console.log(`  ${resource.padEnd(28)} ${String(count).padStart(5)}`);
  }

  if (result.skipped.length > 0) {
    console.log('');
    console.log(
      chalk.yellow(`Skipped ${result.skipped.length} candidate node actor(s):`),
    );
    const reasonCounts = result.skipped.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.reason] = (acc[item.reason] ?? 0) + 1;
        return acc;
      },
      {},
    );
    for (const [reason, count] of Object.entries(reasonCounts)) {
      console.log(`  ${reason.padEnd(20)} ${String(count).padStart(5)}`);
    }
  }

  printDiff(result.added, result.removed, 'bundled nodes file');
}

function runCollectiblesPass(args: CliArgs): void {
  console.log(chalk.cyan('Extracting world collectibles…'));
  console.log(`  input:  ${path.resolve(args.input)}`);
  console.log(`  +ext:   ${path.resolve(args.externalActorsDir)}`);
  console.log(`  output: ${path.resolve(args.collectiblesOutput)}`);
  if (args.dryRun) console.log(chalk.yellow('  (dry run — no files written)'));
  console.log('');

  const result = parseWorldCollectibles({
    persistentLevelPath: args.input,
    externalActorsDir: args.externalActorsDir,
    outputPath: args.collectiblesOutput,
    dryRun: args.dryRun,
    verbose: args.verbose,
  });

  console.log('');
  console.log(chalk.cyan('--- Collectibles summary ----------------'));
  console.log(
    `Emitted: ${chalk.bold(result.emitted.toLocaleString())} collectibles ` +
      `(scanned ${result.externalActorFiles.toLocaleString()} external-actor files)`,
  );
  console.log('By type:');
  for (const [type, count] of Object.entries(result.byType)) {
    console.log(`  ${type.padEnd(22)} ${String(count).padStart(5)}`);
  }

  if (result.skipped.length > 0) {
    console.log('');
    console.log(
      chalk.yellow(
        `Skipped ${result.skipped.length} candidate collectible actor(s):`,
      ),
    );
    const reasonCounts = result.skipped.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.reason] = (acc[item.reason] ?? 0) + 1;
        return acc;
      },
      {},
    );
    for (const [reason, count] of Object.entries(reasonCounts)) {
      console.log(`  ${reason.padEnd(20)} ${String(count).padStart(5)}`);
    }
  }

  printDiff(result.added, result.removed, 'bundled collectibles file');
}

function printDiff(added: string[], removed: string[], label: string): void {
  if (added.length === 0 && removed.length === 0) {
    console.log('');
    console.log(chalk.green(`No id-level changes vs current ${label}.`));
    return;
  }
  console.log('');
  console.log(chalk.cyan(`Diff vs current ${label}:`));
  if (added.length > 0) {
    console.log(
      chalk.green(`  +${added.length} added`) +
        (added.length <= 10 ? `: ${added.slice(0, 10).join(', ')}` : ''),
    );
  }
  if (removed.length > 0) {
    console.log(
      chalk.red(`  -${removed.length} removed`) +
        (removed.length <= 10 ? `: ${removed.slice(0, 10).join(', ')}` : ''),
    );
  }
}

main();
