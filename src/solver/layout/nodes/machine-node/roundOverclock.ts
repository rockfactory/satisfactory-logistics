/**
 * Round an overclock multiplier to a sensible precision for display & storage.
 *
 * Strategy: work on the percent scale (multiplier * 100), prefer 2-decimal
 * percent precision (e.g. 75.00%), and fall back to 4-decimal percent
 * precision when 2dp would lose detail (e.g. 2/3 -> 66.6667% rather than
 * 66.67%). Operating on the percent scale avoids the floating-point pollution
 * that "/ 10000" would introduce on the multiplier scale (e.g. dividing by
 * 100 vs 10000 for terminating decimals).
 */
export function roundOverclock(multiplier: number): number {
  if (!Number.isFinite(multiplier)) return multiplier;

  const percent = multiplier * 100;
  const percent2dp = Math.round(percent * 100) / 100;
  const percent4dp = Math.round(percent * 10000) / 10000;

  // Tolerance is on the percent scale: if 2dp and 4dp agree to within
  // ~1e-6 % they're effectively the same value (this also absorbs
  // float-arithmetic noise from the multiplier->percent conversion).
  const chosenPercent =
    Math.abs(percent2dp - percent4dp) < 1e-6 ? percent2dp : percent4dp;

  return chosenPercent / 100;
}
