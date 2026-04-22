import {
  ActionIcon,
  alpha,
  Badge,
  Box,
  CloseButton,
  Flex,
  Group,
  getGradient,
  Image,
  Popover,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowDown,
  IconArrowUp,
  IconBolt,
  IconBuildingFactory2,
  IconCircleCheckFilled,
  IconClockBolt,
} from '@tabler/icons-react';
import { type NodeProps, useReactFlow } from '@xyflow/react';
import { memo, useState } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { PercentageFormatter } from '@/core/intl/PercentageFormatter';
import { useStore } from '@/core/zustand';
import { useFactoryContext } from '@/FactoryContext';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap, type FactoryItem } from '@/recipes/FactoryItem';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import {
  type FactoryRecipe,
  getRecipeDisplayName,
} from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import {
  useIsNodeHighlighted,
  useSolverHighlightOptional,
} from '@/solver/layout/highlight/SolverHighlightContext';
import { NodeActionsBox } from '@/solver/layout/nodes/utils/NodeActionsBox';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';
import { MachineNodeActions } from './MachineNodeActions';
import { calculateMachineNodeBuildings } from './postprocess/calculateMachineNodeBuildings';
import { RecipeIngredientRow } from './RecipeIngredientRow';
import { roundOverclock } from './roundOverclock';

export interface IMachineNodeData {
  label: string;
  value: number;
  originalValue: number;
  amplifiedValue: number;
  recipe: FactoryRecipe;
  resource: FactoryItem;
  [key: string]: unknown;
}

export type IMachineNodeProps = NodeProps & {
  data: IMachineNodeData;
  type: 'Machine';
};

export const MachineNode = memo((props: IMachineNodeProps) => {
  const { recipe, value, originalValue, amplifiedValue } = props.data;

  const theme = useMantineTheme();

  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const isAlt = recipe.name.includes('Alternate');
  const { updateNode } = useReactFlow();

  const [isHovering, { close, open }] = useDisclosure(false);

  const highlight = useSolverHighlightOptional();
  const isPrimaryHighlighted = highlight?.highlightedNodeId === props.id;
  const isDimmed = useIsNodeHighlighted(props.id) === false;

  const solverId = useFactoryContext();

  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );
  const machineCalc = calculateMachineNodeBuildings(props.data, nodeState);
  const overclock = machineCalc.overclock;
  const buildingsAmount = machineCalc.buildingsAmount;
  const amplifiedRate = machineCalc.amplifiedRate;

  const [overclockValue, setOverclockValue] = useState<number | string>(
    nodeState?.overclock as number | string,
  );

  const editedOverclock =
    overclockValue != null && overclockValue !== ''
      ? Number(overclockValue)
      : overclock;

  // Back-solve overclock from a target whole-number building count, holding the
  // node's required output rate (value) and amplified rate constant.
  // buildingsAmount = value / perBuilding / overclock / amplifiedRate
  const overclockForBuildings = (target: number) =>
    roundOverclock(
      value / (machineCalc.perBuilding * machineCalc.amplifiedRate * target),
    );

  const flooredBuildings = Math.floor(buildingsAmount);
  const ceiledBuildings = Math.ceil(buildingsAmount);
  const buildingsAreFractional = ceiledBuildings !== flooredBuildings;
  const overclockIfRoundedDown =
    flooredBuildings > 0 ? overclockForBuildings(flooredBuildings) : null;
  const overclockIfRoundedUp =
    ceiledBuildings > 0 ? overclockForBuildings(ceiledBuildings) : null;
  // 2.5 == 250% is the same upper bound enforced by MachineNodeProductionConfig.
  const canRoundDown =
    buildingsAreFractional &&
    overclockIfRoundedDown != null &&
    overclockIfRoundedDown <= 2.5;
  const canRoundUp =
    buildingsAreFractional &&
    overclockIfRoundedUp != null &&
    overclockIfRoundedUp > 0;

  return (
    <Popover
      opened={(isHovering || props.selected) && !props.dragging}
      transitionProps={{}}
      offset={4}
      hideDetached={false}
    >
      <Popover.Target>
        <Box
          p="sm"
          style={{
            borderRadius: 4,
            border: props.selected
              ? '1px solid var(--mantine-color-gray-3)'
              : isPrimaryHighlighted
                ? '1px solid var(--mantine-color-blue-4)'
                : '1px solid transparent',
            opacity: isDimmed ? 0.25 : 1,
            transition: 'border-color 0.2s, opacity 0.2s',
          }}
          bg={nodeState?.done ? '#304d3e' : 'dark.4'}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Box
            pos="absolute"
            left={-8}
            top={-8}
            style={{ borderRadius: '3px' }}
            bg={alpha(
              nodeState?.done ? '#304d3e' : 'var(--mantine-color-dark-4)',
              0.7,
            )}
          >
            <Group gap={2}>
              {nodeState?.done && (
                <IconCircleCheckFilled
                  size={16}
                  color="var(--mantine-color-green-5)"
                />
              )}
              {overclock > 1.0 && (
                <Box p={2} style={{ borderRadius: 16 }}>
                  <FactoryItemImage
                    size={14}
                    id={'Desc_CrystalShard_C' as FactoryItemId}
                  />
                </Box>
              )}
              {amplifiedRate > 1 && (
                <Box p={2} style={{ borderRadius: 16 }}>
                  <FactoryItemImage
                    size={14}
                    id={'Desc_WAT1_C' as FactoryItemId}
                  />
                </Box>
              )}
            </Group>
          </Box>

          {/* <NodeToolbar>
            <ActionIcon
              variant="outline"
              color="red"
              size="sm"
              mt={3}
              onClick={() =>
                dispatch(
                  solverActions.toggleRecipe({
                    id: solverId,
                    use: false,
                    recipe: recipe.id,
                  }),
                )
              }
            >
              <IconTrash size={16} stroke={1.5} />
            </ActionIcon>
            <ActionIcon
              variant="outline"
              color="green"
              size="sm"
              mt={3}
              onClick={() =>
                dispatch(
                  solverActions.updateAtPath({
                    id: solverId,
                    path: `nodes.${props.id}.done`,
                    value: true,
                  }),
                )
              }
            >
              <IconCheck size={16} stroke={1.5} />
            </ActionIcon>
          </NodeToolbar> */}

          <Group gap="sm">
            <Box pos="relative" p="0">
              <Image w="32" h="32" src={building.imagePath} />
            </Box>
            <Stack gap={2} align="center">
              <Group gap={2}>
                {isAlt && (
                  <Badge size="xs" color="yellow">
                    ALT
                  </Badge>
                )}
                <Text size="sm">{getRecipeDisplayName(recipe)}</Text>
              </Group>
              <Text size="xs">
                x<RepeatingNumber value={buildingsAmount} /> {building.name}
              </Text>
            </Stack>
            <Box
              pos="relative"
              p={6}
              m={-6}
              style={{
                borderRadius: '3px',
              }}
              bg={
                nodeState?.somersloops
                  ? getGradient(
                      { deg: 180, from: 'grape.5', to: 'pink.6' },
                      theme,
                    )
                  : 'transparent'
              }
            >
              <FactoryItemImage id={product.id} size={32} highRes />
            </Box>
          </Group>

          <InvisibleHandles />
        </Box>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Flex
          align="stretch"
          gap={0}
          direction={{
            base: 'column',
            sm: 'row',
          }}
        >
          <Stack gap={0}>
            <Box
              p="sm"
              bg="dark.5"
              style={{
                borderRadius: '4px 0 0 0',
              }}
            >
              <Group gap="sm" justify="space-between" align="flex-start">
                <Title order={5} mb="xs">
                  {getRecipeDisplayName(recipe)}
                </Title>
                {props.selected && (
                  <CloseButton
                    size="sm"
                    onClick={() => {
                      updateNode(props.id, { selected: false });
                    }}
                  />
                )}
              </Group>
              <Text component="div" size="sm">
                <Group gap="xl">
                  <Group gap={4} align="center">
                    <IconClockBolt size={16} /> {recipe.time}s
                  </Group>
                  <Stack gap={0} align="flex-start">
                    <Group gap={4} align="center">
                      <IconBuildingFactory2 size={16} /> x
                      <RepeatingNumber value={buildingsAmount} />{' '}
                      {building.name}
                      {props.selected && buildingsAreFractional && (
                        <Group gap={2} ml={4}>
                          <Tooltip
                            label={
                              canRoundDown && overclockIfRoundedDown != null
                                ? `Round down to ${flooredBuildings} at ${PercentageFormatter.format(overclockIfRoundedDown)} overclock`
                                : 'Cannot round down'
                            }
                          >
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              disabled={!canRoundDown}
                              onClick={() => {
                                if (overclockIfRoundedDown != null) {
                                  setOverclockValue(overclockIfRoundedDown);
                                }
                              }}
                            >
                              <IconArrowDown size={12} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip
                            label={
                              canRoundUp && overclockIfRoundedUp != null
                                ? `Round up to ${ceiledBuildings} at ${PercentageFormatter.format(overclockIfRoundedUp)} overclock`
                                : 'Cannot round up (would exceed 250% overclock)'
                            }
                          >
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              disabled={!canRoundUp}
                              onClick={() => {
                                if (overclockIfRoundedUp != null) {
                                  setOverclockValue(overclockIfRoundedUp);
                                }
                              }}
                            >
                              <IconArrowUp size={12} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      )}
                    </Group>
                    {machineCalc.partialBuildingAmount > 0 &&
                      // Hide the "X at A% + 1 at B%" split when A and B render
                      // to the same string (e.g. after the round-up button
                      // picks an overclock where every building runs at the
                      // same rate). Comparing formatted output avoids picking
                      // a fragile numeric tolerance when the values may have
                      // drifted by float noise but display identically.
                      PercentageFormatter.format(
                        machineCalc.partialBuildingOverclock,
                      ) !== PercentageFormatter.format(overclock) && (
                        <Text size="xs" c="dimmed">
                          {machineCalc.fullBuildingsAmount} at{' '}
                          {PercentageFormatter.format(overclock)}
                          {' + 1 at '}
                          {PercentageFormatter.format(
                            machineCalc.partialBuildingOverclock,
                          )}
                        </Text>
                      )}
                  </Stack>
                  <Group gap={4} align="center">
                    <IconBolt size={16} />{' '}
                    <RepeatingNumber value={machineCalc.totalPower} /> MW
                  </Group>
                </Group>
              </Text>
            </Box>
            <Table
              withColumnBorders
              style={{
                borderRight: '1px solid var(--mantine-color-dark-4)',
              }}
            >
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text size="sm" fw="bold">
                      Ingredients
                    </Text>
                  </Table.Td>
                  <Table.Td colSpan={2}>
                    <Group align="center" gap={2}>
                      <FactoryItemImage
                        id={'Desc_CrystalShard_C' as FactoryItemId}
                        size={16}
                      />{' '}
                      <Text size="sm" fw={overclock != 1 ? 'bold' : 'normal'}>
                        {PercentageFormatter.format(overclock)}
                      </Text>
                    </Group>
                  </Table.Td>
                  {amplifiedRate > 1 && (
                    <Table.Td colSpan={2}>
                      <Group gap={2} align="center">
                        <FactoryItemImage
                          id={'Desc_WAT1_C' as FactoryItemId}
                          size={16}
                        />{' '}
                        <Text size="sm" fw="bold" c="grape.4">
                          {PercentageFormatter.format(amplifiedRate)}
                        </Text>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
                {recipe.ingredients.map((ingredient, i) => (
                  <RecipeIngredientRow
                    index={i}
                    type="Ingredients"
                    recipe={recipe}
                    ingredient={ingredient}
                    key={ingredient.resource}
                    buildingsAmount={buildingsAmount}
                    overclock={editedOverclock}
                    amplifiedRate={amplifiedRate}
                    editable={props.selected}
                    onOverclockChange={setOverclockValue}
                  />
                ))}
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" fw="bold">
                      Products
                    </Text>
                  </Table.Td>
                </Table.Tr>
                {recipe.products.map((product, i) => (
                  <RecipeIngredientRow
                    index={i}
                    type="Products"
                    recipe={recipe}
                    ingredient={product}
                    key={product.resource}
                    buildingsAmount={buildingsAmount}
                    overclock={editedOverclock}
                    amplifiedRate={amplifiedRate}
                    editable={props.selected}
                    onOverclockChange={setOverclockValue}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
          <NodeActionsBox>
            {props.selected ? (
              <MachineNodeActions
                data={props.data}
                id={props.id}
                buildingsAmount={buildingsAmount}
                overclockValue={overclockValue}
                setOverclockValue={setOverclockValue}
              />
            ) : (
              <Stack>
                <Text fs="italic" size="sm">
                  Click on the node to see available actions, like ignoring this
                  recipe or switching to an alternate recipe.
                </Text>
              </Stack>
            )}
          </NodeActionsBox>
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
});
