import { Group, Stack, Text } from '@mantine/core';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type {
  InfrastructureCategory,
  SplineKind,
} from '@/recipes/savegame/ParseSavegameMessages';
import { INFRASTRUCTURE_CATEGORIES } from '@/recipes/savegame/ParseSavegameMessages';
import type { Hit } from './hitTest';
import classes from './InfrastructureHoverPopover.module.css';
import {
  buildingIdFromTypePath,
  CategoryColor,
  CategoryLabel,
  SplineLabel,
  splineColor,
} from './infrastructureCategories';

export interface InfrastructureHoverPopoverProps {
  hit: Hit | null;
  /** Container coords (px relative to the map container's top-left). */
  mousePx: { x: number; y: number } | null;
  /** Optional length pre-computed by the layer for spline hits. */
  splineLengthCm?: number;
}

/**
 * Floating tooltip that shadows the cursor while it sits over an
 * imported building or spline. Positioned absolutely over the map
 * container so the rest of the page (including Leaflet's controls)
 * stays untouched. Pointer events disabled — hovering the popover
 * itself never re-triggers a hit-test loop.
 */
export function InfrastructureHoverPopover({
  hit,
  mousePx,
  splineLengthCm,
}: InfrastructureHoverPopoverProps) {
  if (!hit || !mousePx) return null;

  if (hit.kind === 'building') {
    const id = buildingIdFromTypePath(hit.typePath);
    const known = id ? AllFactoryBuildingsMap[id] : null;
    const displayName = known?.name ?? id ?? 'Unknown building';
    const category = INFRASTRUCTURE_CATEGORIES[
      hit.categoryIndex
    ] as InfrastructureCategory;
    const color = CategoryColor[category];
    const widthM = hit.size.width / 100;
    const lengthM = hit.size.length / 100;
    return (
      <PopoverShell mousePx={mousePx}>
        <Stack gap={2}>
          <Group gap={6} align="center" wrap="nowrap">
            <span
              className={classes.swatch}
              aria-hidden="true"
              style={{ background: color }}
            />
            <Text size="sm" fw={600} className={classes.title}>
              {displayName}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {CategoryLabel[category]} · {widthM.toFixed(1)}m ×{' '}
            {lengthM.toFixed(1)}m × {(hit.height / 100).toFixed(1)}m
          </Text>
          <Text size="xs" c="dimmed" className={classes.coords}>
            ({Math.round(hit.positionGame.x / 100)}m,{' '}
            {Math.round(hit.positionGame.y / 100)}m, z={' '}
            {Math.round(hit.z / 100)}m)
          </Text>
        </Stack>
      </PopoverShell>
    );
  }

  // Spline hit
  const kind = hit.splineKind as SplineKind;
  const tier = hit.splineTier;
  const color = splineColor(kind, tier);
  const tierSuffix = tier > 0 ? ` Mk${tier}` : '';
  const lengthM =
    splineLengthCm != null ? `${Math.round(splineLengthCm / 100)}m` : null;
  return (
    <PopoverShell mousePx={mousePx}>
      <Stack gap={2}>
        <Group gap={6} align="center" wrap="nowrap">
          <span
            className={classes.swatch}
            aria-hidden="true"
            style={{ background: color }}
          />
          <Text size="sm" fw={600} className={classes.title}>
            {SplineLabel[kind]}
            {tierSuffix}
          </Text>
        </Group>
        {lengthM ? (
          <Text size="xs" c="dimmed">
            Length: {lengthM}
          </Text>
        ) : null}
      </Stack>
    </PopoverShell>
  );
}

function PopoverShell({
  mousePx,
  children,
}: {
  mousePx: { x: number; y: number };
  children: React.ReactNode;
}) {
  // Offset the box from the cursor so it never sits *under* the
  // pointer (which would obscure the entity it describes). Flips to
  // the left/top side near the right/bottom edges via CSS clamping.
  return (
    <div
      className={classes.popover}
      style={{
        left: mousePx.x + 14,
        top: mousePx.y + 14,
      }}
    >
      {children}
    </div>
  );
}
