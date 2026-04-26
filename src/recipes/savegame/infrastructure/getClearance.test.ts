import { describe, expect, it } from 'vitest';
import { getClearance } from './getClearance';

describe('getClearance', () => {
  it('returns hand-tuned values for hard-coded connector ids', () => {
    expect(
      getClearance(
        '/Game/.../ConveyorPole/Build_ConveyorPole.Build_ConveyorPole_C',
      ),
    ).toEqual({ width: 100, length: 100, height: 200 });
  });

  it('converts catalog values from metres to centimetres', () => {
    // AssemblerMk1 catalog entry is 9 x 16 x 3 (metres).
    expect(
      getClearance(
        '/Game/.../AssemblerMk1/Build_AssemblerMk1.Build_AssemblerMk1_C',
      ),
    ).toEqual({ width: 900, length: 1600, height: 300 });
  });

  it('falls back to a 1x1m footprint for poles/supports without a catalog entry', () => {
    // PipelineSupport_C exists in the catalog with `null` clearance —
    // the small-connector regex picks it up.
    expect(
      getClearance(
        '/Game/.../PipelineSupport/Build_PipelineSupport.Build_PipelineSupport_C',
      ),
    ).toEqual({ width: 100, length: 100, height: 200 });
  });

  it('falls back to 8x8m for completely unknown buildables', () => {
    expect(
      getClearance('/Game/.../Build_TotallyMadeUp.Build_TotallyMadeUp_C'),
    ).toEqual({ width: 800, length: 800, height: 200 });
  });
});
