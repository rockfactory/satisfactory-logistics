import chalk from 'chalk';
import loglevel from 'loglevel';
import prefix from 'loglevel-plugin-prefix';

export const log = loglevel;
log.setLevel('debug');
prefix.reg(log);

const colors = {
  trace: chalk.magenta,
  debug: chalk.cyan,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
} as const;

prefix.apply(log, {
  format(level, name, timestamp) {
    const [r, g, b] = hashStringToColor(name || 'root');
    return `${chalk.gray(timestamp)} [${chalk.rgb(r, g, b)(name)}] ${colors[level.toLowerCase() as keyof typeof colors](level.toLowerCase())}:`;
  },
});

function djb2(str: string) {
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i); /* hash * 33 + c */
  }
  return hash;
}

/**
 * @see https://stackoverflow.com/questions/11120840/hash-string-into-rgb-color
 */
function hashStringToColor(str: string | undefined) {
  const hash = djb2(str || '');
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;
  return [r, g, b];
}
