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

  it('classifies the hyper tube spline segment', () => {
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Factory/PipeHyper/Build_PipeHyper.Build_PipeHyper_C',
      ),
    ).toEqual({ mode: 'spline', kind: 'hyper', tier: 0 });
  });

  it('leaves hyper tube fittings (start, support, t-junction) classified as buildings', () => {
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Factory/PipeHyperStart/Build_PipeHyperStart.Build_PipeHyperStart_C',
      ),
    ).toEqual({ mode: 'building' });
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Factory/PipeHyperSupport/Build_PipeHyperSupport.Build_PipeHyperSupport_C',
      ),
    ).toEqual({ mode: 'building' });
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Factory/PipeHyperTJunction/Build_HypertubeTJunction.Build_HypertubeTJunction_C',
      ),
    ).toEqual({ mode: 'building' });
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

  it('classifies vehicle path segments and reads the mSplinePoints property', () => {
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Vehicle/VehiclePath/Build_VehiclePath_Universal.Build_VehiclePath_Universal_C',
      ),
    ).toEqual({
      mode: 'spline',
      kind: 'vehicle',
      tier: 0,
      splineProperty: 'mSplinePoints',
    });
  });

  it('leaves vehicle path nodes classified as buildings', () => {
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Vehicle/VehiclePath/Build_VehiclePathNode_Default.Build_VehiclePathNode_Default_C',
      ),
    ).toEqual({ mode: 'building' });
    expect(
      classifyTypePath(
        '/Game/FactoryGame/Buildable/Vehicle/VehiclePath/Build_VehiclePathNode_DockingStation.Build_VehiclePathNode_DockingStation_C',
      ),
    ).toEqual({ mode: 'building' });
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
