import path from 'node:path';
import chalk from 'chalk';
import { parseWorldNodes } from './parsers/parseWorldNodes';

/**
 * Entry point for `npm run extract-world-nodes`.
 *
 * See `scripts/parsers/parseWorldNodes.ts` for the parsing logic and
 * the README's "Resource node data" section for the maintainer
 * workflow (how to obtain `data/Persistent_Level.json` from FModel).
 */

interface CliArgs {
  input: string;
  output: string;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: 'data/Persistent_Level.json',
    output: 'src/recipes/WorldResourceNodes.json',
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--input':
      case '-i':
        args.input = argv[++i];
        break;
      case '--output':
      case '-o':
        args.output = argv[++i];
        break;
      case '--dry-run':
      case '-n':
        args.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        args.verbose = true;
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
  -i, --input <path>    Persistent_Level JSON dump (default: data/Persistent_Level.json)
  -o, --output <path>   Output bundled JSON (default: src/recipes/WorldResourceNodes.json)
  -n, --dry-run         Parse and report, but do not write
  -v, --verbose         Log every emitted node (debug)
  -h, --help            Show this help`,
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

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
  console.log(chalk.cyan('--- Summary -----------------------------'));
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
      chalk.yellow(`Skipped ${result.skipped.length} candidate actor(s):`),
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

  if (result.added.length > 0 || result.removed.length > 0) {
    console.log('');
    console.log(chalk.cyan('Diff vs current bundled file:'));
    if (result.added.length > 0) {
      console.log(
        chalk.green(`  +${result.added.length} added`) +
          (result.added.length <= 10
            ? `: ${result.added.slice(0, 10).join(', ')}`
            : ''),
      );
    }
    if (result.removed.length > 0) {
      console.log(
        chalk.red(`  -${result.removed.length} removed`) +
          (result.removed.length <= 10
            ? `: ${result.removed.slice(0, 10).join(', ')}`
            : ''),
      );
    }
  } else {
    console.log('');
    console.log(chalk.green('No id-level changes vs current bundled file.'));
  }
}

main();
