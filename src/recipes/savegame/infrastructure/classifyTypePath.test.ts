import { describe, expect, it } from 'vitest';
import { classifyTypePath } from './classifyTypePath';

describe('classifyTypePath', () => {
  it('classifies belts and parses Mk tier', () => {
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Factory/ConveyorBeltMk5/Build_ConveyorBeltMk5.Build_ConveyorBeltMk5_C',
      ),
    ).toEqual({ mode: 'spline', kind: 'belt', tier: 5 });
  });

  it('defaults belt tier to 1 when the suffix is absent', () => {
    expect(
      classifyTypePath('/Game/.../Build_ConveyorBelt.Build_ConveyorBelt_C'),
    ).toEqual({ mode: 'spline', kind: 'belt', tier: 1 });
  });

  it('classifies pipes (Mk1 default and Mk2)', () => {
    expect(
      classifyTypePath('/Game/.../Pipeline/Build_Pipeline.Build_Pipeline_C'),
    ).toEqual({ mode: 'spline', kind: 'pipe', tier: 1 });
    expect(
      classifyTypePath(
        '/Game/.../PipelineMk2/Build_PipelineMK2.Build_PipelineMK2_C',
      ),
    ).toEqual({ mode: 'spline', kind: 'pipe', tier: 2 });
    expect(
      classifyTypePath(
        '/Game/.../Pipeline/Build_Pipeline_NoIndicator.Build_Pipeline_NoIndicator_C',
      ),
    ).toEqual({ mode: 'spline', kind: 'pipe', tier: 1 });
  });

  it('classifies hyper tubes before falling through to the generic pipe regex', () => {
    expect(
      classifyTypePath('/Game/.../Build_PipelineHyper.Build_PipelineHyper_C'),
    ).toEqual({ mode: 'spline', kind: 'hyper', tier: 0 });
  });

  it('classifies railroad tracks (regular and integrated)', () => {
    expect(
      classifyTypePath('/Game/.../Build_RailroadTrack.Build_RailroadTrack_C'),
    ).toEqual({ mode: 'spline', kind: 'rail', tier: 0 });
    expect(
      classifyTypePath(
        '/Game/.../Build_RailroadTrackIntegrated.Build_RailroadTrackIntegrated_C',
      ),
    ).toEqual({ mode: 'spline', kind: 'rail', tier: 0 });
  });

  it('classifies power lines', () => {
    expect(
      classifyTypePath('/Game/.../Build_PowerLine.Build_PowerLine_C'),
    ).toEqual({ mode: 'powerline' });
  });

  it('falls back to building for everything else', () => {
    expect(
      classifyTypePath(
        '/Game/.../AssemblerMk1/Build_AssemblerMk1.Build_AssemblerMk1_C',
      ),
    ).toEqual({ mode: 'building' });
    expect(
      classifyTypePath(
        '/Game/.../Foundation/Build_Foundation_8x1_01.Build_Foundation_8x1_01_C',
      ),
    ).toEqual({ mode: 'building' });
  });
});
