import { repeat } from 'lodash';
import { Fragment } from 'react';

export const NumberFormatter = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/**
 * string-only version of `RepeatingNumber`.
 */
export function formatRepeatingNumber(value = 0): string {
  const formatted = NumberFormatter.formatToParts(value);
  const repetend = getRepetend(value);
  if (repetend?.pattern && repetend.index < 3) {
    return formatted
      .map(({ type, value }) => {
        if (type !== 'fraction') return value;

        return (
          value.substring(0, repetend.index) +
          repeat(repetend.pattern.toString(), value.length - repetend.index)
        );
      })
      .join('');
  }

  return formatted.map(v => v.value).join('');
}

export const RepeatingNumber = ({
  value = 0,
}: {
  value: number | undefined;
}) => {
  const formatted = NumberFormatter.formatToParts(value);
  const repetend = getRepetend(value);
  if (repetend?.pattern && repetend.index < 3) {
    return (
      <>
        {formatted.map(({ type, value }) => {
          if (type !== 'fraction') return value;

          return (
            <Fragment key={repetend.index}>
              <span>{value.substring(0, repetend.index)}</span>
              <span style={{ textDecoration: 'overline' }}>
                {repeat(
                  repetend.pattern.toString(),
                  value.length - repetend.index,
                ).substring(0, value.length - repetend.index)}
              </span>
            </Fragment>
          );
        })}
      </>
    );
  }

  return <>{formatted.map(v => v.value).join('')}</>;
};

/**
 * https://stackoverflow.com/a/26363728/2470523
 */
function getRepetend(num: number) {
  const m = (num + '').match(/\.(\d*?)(\d+?)\2+$/);
  return m && { pattern: +m[2], index: m[1].length };
}
