export function fixSolverRoundingError(value: number): number {
  const significants = value.toString().replace('.', '').length;
  const precision = value.toString().split('.')[1]?.length ?? 0;
  if (significants < 6) return value;

  const rounded = value + 10 ** -precision;
  return (
    Math.round(rounded * 10 ** precision + Number.EPSILON) / 10 ** precision
  );
}
