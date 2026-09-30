import { Divider, Group, Image, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { useStore } from '@/core/zustand';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipesMap } from '@/recipes/FactoryRecipe';
import type {
  InfrastructureCategory,
  SplineKind,
} from '@/recipes/savegame/ParseSavegameMessages';
import { INFRASTRUCTURE_CATEGORIES } from '@/recipes/savegame/ParseSavegameMessages';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import {
  type Purity,
  StaticWorldResourceNodesById,
} from '@/recipes/WorldResourceNodes';
import { getExtractionRate, getExtractionUnit } from '../extraction';
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
  // Per-game savegame node overrides for the currently-selected game.
  // The selector returns the **array reference** so zustand's default
  // `Object.is` comparison stays stable across renders (Immer preserves
  // identity on the unmutated path); a previous version returned a
  // freshly-built `Map` from the selector and triggered an infinite
  // re-render loop because the Map identity changed every read.
  const overrides = useStore(state => {
    const selectedId = state.games.selected;
    if (!selectedId) return undefined;
    return state.games.games[selectedId]?.savegameNodeOverrides;
  });
  const nodeOverrideById = useMemo(() => {
    if (!overrides || overrides.length === 0) return null;
    return new Map(overrides.map(o => [o.id, o] as const));
  }, [overrides]);

  if (!hit || !mousePx) return null;

  if (hit.kind === 'building') {
    const id = buildingIdFromTypePath(hit.typePath);
    const known = id
      ? (AllFactoryBuildingsMap[id] ??
        AllFactoryItemsMap[id.replace('BP_', 'Desc_')])
      : null;
    const displayName = known?.name ?? id ?? 'Unknown building';
    const buildingImage = known?.imagePath || null;
    const category = INFRASTRUCTURE_CATEGORIES[
      hit.categoryIndex
    ] as InfrastructureCategory;
    const color = CategoryColor[category];
    const widthM = hit.size.width / 100;
    const lengthM = hit.size.length / 100;

    // Recipe display name + icon. The save stores the recipe ref's
    // last path segment, which matches the `id` field we ship in
    // FactoryRecipes.json — so a successful lookup yields the in-game
    // "Iron Plate" / "Reinforced Iron Plate" name; an unknown id
    // (mods, deprecated recipes) falls back to the raw id and skips
    // the icon. The recipe icon is the first product's resource image,
    // which matches what the in-game machine UI shows.
    const recipe = hit.recipe ? AllFactoryRecipesMap[hit.recipe] : null;
    const recipeName = hit.recipe ? (recipe?.name ?? hit.recipe) : null;
    const recipeIconId = recipe?.products?.[0]?.resource ?? null;

    // Show overclock only when it's meaningfully off 100% and finite —
    // a foundation reports `NaN`, an untouched machine reports 1.0,
    // both should stay quiet in the popover.
    const showOverclock =
      Number.isFinite(hit.overclock) && Math.abs(hit.overclock - 1) > 0.001;
    const overclockPct = showOverclock ? Math.round(hit.overclock * 100) : null;
    const showSomersloop = hit.somersloop > 0;

    // Extracted resources should show their extraction rate regardless
    // and a default overclock of 1.0 is assumed because water extractors have
    // an overclock of NaN if left unset
    const assumedOverclock = Number.isFinite(hit.overclock) ? hit.overclock : 1;

    // Extracted resource (miners / oil pumps / fracking / water pumps).
    // Water pumps point at `FGWaterVolume_*` ids that aren't in the
    // static node dataset, so we infer the resource from the typePath
    // for those. Miners + pumps + fracking resolve via the bundled
    // node lookup, then layer in the savegame's per-node randomization
    // override (1.2+) so the player sees what they'll actually
    // extract — not the static dataset's pre-randomization resource.
    let extractedResourceId: string | null = null;
    let extractedResourceName: string | null = null;
    let extractedPurity: Purity | null = null;
    let extractedRate: number | null = null;
    let extractedUnit: string | null = null;
    if (hit.typePath.includes('Build_WaterPump')) {
      extractedResourceId = 'Desc_Water_C';
      extractedResourceName =
        AllFactoryItemsMap[extractedResourceId]?.displayName ?? 'Water';
      extractedRate = 120 * assumedOverclock; // 120 m³/min base
      extractedUnit = 'm³/min';
    } else if (hit.extractedNode) {
      const node = StaticWorldResourceNodesById[hit.extractedNode];
      if (node) {
        const override = nodeOverrideById?.get(hit.extractedNode);
        const resource = override?.resource ?? node.resource;
        extractedResourceId = resource;
        extractedResourceName =
          AllFactoryItemsMap[resource]?.displayName ??
          node.displayName ??
          resource;
        extractedPurity =
          (override?.purity as Purity | undefined) ?? node.purity;
        if (known) {
          extractedRate = getExtractionRate(
            known,
            extractedPurity,
            assumedOverclock * 100,
          );
          extractedUnit = getExtractionUnit(extractedResourceId);
        }
      }
    }

    // Sometimes the currentStop equals -1 so assume its the first index
    const nextTrainStopIndex =
      hit.additionalDetails?.type === 'Train'
        ? Math.max(0, hit.additionalDetails?.timetable?.currentStop ?? 0)
        : 0;

    return (
      <PopoverShell mousePx={mousePx}>
        <Stack gap={2}>
          <Group gap={6} align="center" wrap="nowrap">
            {buildingImage ? (
              <Image
                src={buildingImage}
                alt={displayName}
                w={24}
                h={24}
                fit="contain"
              />
            ) : (
              <span
                className={classes.swatch}
                aria-hidden="true"
                style={{ background: color }}
              />
            )}
            <Text size="sm" fw={600} className={classes.title}>
              {displayName}
            </Text>
          </Group>
          {recipeName ? (
            <Group gap={6} align="center" wrap="nowrap">
              {recipeIconId ? (
                <FactoryItemImage id={recipeIconId} size={20} />
              ) : null}
              <Text size="xs">{recipeName}</Text>
            </Group>
          ) : null}
          {extractedResourceId ? (
            <Group gap={6} align="center" wrap="nowrap">
              <FactoryItemImage id={extractedResourceId} size={20} />
              <Text size="xs">
                {extractedResourceName ?? extractedResourceId}
                {extractedPurity ? ` · ${extractedPurity}` : ''}
              </Text>
            </Group>
          ) : null}
          {showOverclock || showSomersloop || extractedRate ? (
            <Text size="xs">
              {showOverclock ? `Overclock: ${overclockPct}%` : null}
              {showOverclock && showSomersloop ? ' · ' : null}
              {showSomersloop ? `Somersloop ×${hit.somersloop}` : null}
              {extractedRate && (showOverclock || showSomersloop)
                ? ' · '
                : null}
              {extractedRate ? (
                <>
                  <RepeatingNumber value={extractedRate} />
                  <span className={'map-marker-popup__rates-unit'}>
                    {extractedUnit}
                  </span>
                </>
              ) : null}
            </Text>
          ) : null}
          {hit.additionalDetails?.type === 'Train' ? (
            <>
              <Text size="xs">Name: {hit.additionalDetails.name}</Text>
              {hit.additionalDetails.timetable ? (
                <>
                  <Text size="xs">
                    {`Next: ${hit.additionalDetails.timetable.stops[nextTrainStopIndex].stationData?.name ?? 'Unknown Stop'}`}
                  </Text>
                  <Text size="xs" fw={600}>
                    Timetable
                  </Text>
                  <Divider />
                  {hit.additionalDetails.timetable.stops.length > 0 ? (
                    hit.additionalDetails.timetable.stops.map((stop, i) => {
                      return (
                        <Text
                          size="xs"
                          c={i === nextTrainStopIndex ? 'green' : ''}
                          key={stop.stationId}
                        >
                          {i === nextTrainStopIndex && '>> '}
                          {stop.stationData?.name}
                        </Text>
                      );
                    })
                  ) : (
                    <Text size="xs" fs="italic">
                      No Stops
                    </Text>
                  )}
                </>
              ) : null}
            </>
          ) : null}
          {hit.additionalDetails?.type === 'TrainStation' ? (
            <>
              <Text size="xs">Name: {hit.additionalDetails.name}</Text>

              <Text size="xs" fw={600}>
                Visiting Trains
              </Text>
              <Divider />
              {hit.additionalDetails.trains.length > 0 ? (
                hit.additionalDetails.trains.map(train => {
                  return (
                    <Text size="xs" key={train.trainId}>
                      {train.name}
                    </Text>
                  );
                })
              ) : (
                <Text size="xs" fs="italic">
                  No Trains
                </Text>
              )}
            </>
          ) : null}
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
