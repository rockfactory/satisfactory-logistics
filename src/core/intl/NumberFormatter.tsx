import { type CSSProperties, Fragment, memo } from 'react';

export const NumberFormatter = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const overlineStyle: CSSProperties = { textDecoration: 'overline' };

function fillRepetend(
  fraction: string,
  repetend: { pattern: number; index: number },
): string {
  const patternStr = repetend.pattern.toString();
  const repeatLen = fraction.length - repetend.index;
  return (
    fraction.substring(0, repetend.index) +
    patternStr
      .repeat(Math.ceil(repeatLen / patternStr.length))
      .substring(0, repeatLen)
  );
}

/**
 * string-only version of `RepeatingNumber`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function formatRepeatingNumber(value = 0): string {
  const formatted = NumberFormatter.formatToParts(value);
  const repetend = getRepetend(value);
  if (repetend?.pattern && repetend.index < 3) {
    return formatted
      .map(({ type, value }) =>
        type === 'fraction' ? fillRepetend(value, repetend) : value,
      )
      .join('');
  }

  return NumberFormatter.format(value);
}

export const RepeatingNumber = memo(
  ({ value = 0 }: { value: number | undefined }) => {
    const repetend = getRepetend(value);
    if (repetend?.pattern && repetend.index < 3) {
      const formatted = NumberFormatter.formatToParts(value);
      return (
        <>
          {formatted.map(({ type, value }) => {
            if (type !== 'fraction') return value;

            const repeatLen = value.length - repetend.index;
            const patternStr = repetend.pattern.toString();
            return (
              <Fragment key={type}>
                <span>{value.substring(0, repetend.index)}</span>
                <span style={overlineStyle}>
                  {patternStr
                    .repeat(Math.ceil(repeatLen / patternStr.length))
                    .substring(0, repeatLen)}
                </span>
              </Fragment>
            );
          })}
        </>
      );
    }

    return <>{NumberFormatter.format(value)}</>;
  },
);

/**
 * Detects repeating decimal patterns. Uses full float precision
 * (up to ~17 digits) to require at least 3 occurrences of the
 * pattern, reducing false positives from coincidental digit runs.
 *
 * https://stackoverflow.com/a/26363728/2470523
 */
function getRepetend(num: number) {
  const str = num.toPrecision(17);
  const m = str.match(/\.(\d*?)(\d+?)\2{2,}$/);
  return m && { pattern: +m[2], index: m[1].length };
}
