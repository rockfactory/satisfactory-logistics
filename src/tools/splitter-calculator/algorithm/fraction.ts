/**
 * Integer GCD/LCM and ratio normalization for splitter calculations.
 * Avoids floating-point error by working in integer space.
 */

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

export function gcdArray(values: number[]): number {
  return values.reduce((acc, v) => gcd(acc, v));
}

export function lcmArray(values: number[]): number {
  return values.reduce((acc, v) => lcm(acc, v));
}

/**
 * Convert floating-point rates to integer ratios.
 * Multiplies all values by enough to clear decimals, then divides by GCD.
 */
export function toIntegerRatios(values: number[]): number[] {
  if (values.length === 0) return [];

  // Find the precision needed — multiply to clear decimals
  let multiplier = 1;
  for (const v of values) {
    const str = v.toString();
    const decimalIdx = str.indexOf('.');
    if (decimalIdx >= 0) {
      const decimals = str.length - decimalIdx - 1;
      multiplier = Math.max(multiplier, 10 ** decimals);
    }
  }

  const ints = values.map(v => Math.round(v * multiplier));
  const d = gcdArray(ints);
  return ints.map(v => v / d);
}

/**
 * Expand source/target counts into flat arrays of individual rates,
 * then normalize to integer ratios.
 */
export function normalizeRatios(
  sourceRates: number[],
  targetRates: number[],
): { sources: number[]; targets: number[] } {
  const allRates = [...sourceRates, ...targetRates];
  const ratios = toIntegerRatios(allRates);

  return {
    sources: ratios.slice(0, sourceRates.length),
    targets: ratios.slice(sourceRates.length),
  };
}

/**
 * Check if a number's only prime factors are 2 and 3 (i.e., 3-smooth).
 */
export function isSmooth(n: number): boolean {
  while (n % 2 === 0) n /= 2;
  while (n % 3 === 0) n /= 3;
  return n === 1;
}

/**
 * Find the next integer >= n whose prime factors are only 2 and 3.
 */
export function nextSmooth(n: number): number {
  let candidate = n;
  while (!isSmooth(candidate)) {
    candidate++;
  }
  return candidate;
}

/**
 * Get prime factorization of n using only factors 2 and 3.
 * Assumes n is 3-smooth.
 */
export function primeFactors(n: number): number[] {
  const factors: number[] = [];
  while (n % 3 === 0) {
    factors.push(3);
    n /= 3;
  }
  while (n % 2 === 0) {
    factors.push(2);
    n /= 2;
  }
  return factors.sort((a, b) => a - b);
}
