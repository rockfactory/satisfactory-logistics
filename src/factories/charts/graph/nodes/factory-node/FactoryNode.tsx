import {
  ActionIcon,
  Badge,
  Box,
  Group,
  HoverCard,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconCalculator, IconEye, IconHelpHexagon } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { BaseFactoryUsage } from '@/factories/components/usage/FactoryUsage';
import { useOutputUsage } from '@/factories/components/usage/useOutputUsage';
import type { Factory, FactoryInput, FactoryOutput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';

export interface IFactoryNodeData {
  label: string;
  factory: Factory;
  [key: string]: unknown;
}

export type IFactoryNodeProps = NodeProps & {
  data: IFactoryNodeData;
  type: 'Factory';
};

export const FactoryNode = memo((props: IFactoryNodeProps) => {
  const { data } = props;
  const { factory } = data;

  const outputs = useMemo(() => {
    return (
      factory.outputs?.filter(o => o.resource != null) ??
      ([] as FactoryOutput[])
    );
  }, [factory.outputs]);

  return (
    <HoverCard
      width={420}
      position="top"
      shadow="md"
      withArrow
      openDelay={120}
      closeDelay={80}
    >
      <HoverCard.Target>
        <Box
          data-tutorial-id="chart-factory-node"
          p="sm"
          style={{
            borderRadius: 4,
            cursor: 'pointer',
            border: props.selected
              ? '1px solid var(--mantine-color-gray-3)'
              : '1px solid transparent',
          }}
          bg={'dark.4'}
        >
          <Group gap="sm">
            {factory.outputs?.[0]?.resource ? (
              <FactoryItemImage
                size={32}
                highRes
                id={factory.outputs?.[0].resource}
              />
            ) : (
              <IconHelpHexagon size={32} />
            )}
            <Stack gap={6} align="center">
              <Group gap={2}>
                <Text size="sm">{factory.name ?? 'Factory'}</Text>
              </Group>
              <Stack gap={4} align="center">
                {outputs.map(output => (
                  <FactoryNodeOutputLine
                    key={`${output.resource}-${output.amount}`}
                    factoryId={factory.id}
                    output={output}
                  />
                ))}
              </Stack>
            </Stack>
          </Group>

          <InvisibleHandles />
        </Box>
      </HoverCard.Target>
      <HoverCard.Dropdown
        data-tutorial-id="chart-factory-actions"
        p={0}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <Stack gap={0}>
          <Box p="sm" bg="dark.5" style={{ borderRadius: '4px 4px 0 0' }}>
            <Group
              justify="space-between"
              align="center"
              wrap="nowrap"
              gap="sm"
            >
              <TextInput
                variant="unstyled"
                size="md"
                defaultValue={factory.name ?? ''}
                placeholder="Factory name"
                onBlur={e => {
                  const value = e.currentTarget.value.trim();
                  if (value === (factory.name ?? '')) return;
                  useStore.getState().updateFactory(factory.id, f => {
                    f.name = value || null;
                  });
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                styles={{
                  input: {
                    fontWeight: 600,
                    fontSize: 'var(--mantine-font-size-lg)',
                    height: 'auto',
                    minHeight: 0,
                    padding: 0,
                  },
                }}
                style={{ flex: 1, minWidth: 0 }}
              />
              <Group gap="xs" wrap="nowrap">
                <Tooltip label="Open factory" withArrow>
                  <ActionIcon
                    component={Link}
                    to={`/factories/${factory.id}`}
                    variant="filled"
                    color="blue"
                    size="lg"
                    aria-label="Open factory"
                  >
                    <IconEye size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Open calculator" withArrow>
                  <ActionIcon
                    component={Link}
                    to={`/factories/${factory.id}/calculator`}
                    variant="filled"
                    color="cyan"
                    size="lg"
                    aria-label="Open calculator"
                  >
                    <IconCalculator size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Box>
          <FactoryFlowsTable factory={factory} />
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
});

function FactoryFlowsTable({ factory }: { factory: Factory }) {
  const outputs = (factory.outputs ?? []).filter(o => o.resource);
  const inputs = (factory.inputs ?? []).filter(i => i.resource);

  if (outputs.length === 0 && inputs.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic" ta="center">
        No inputs or outputs.
      </Text>
    );
  }

  return (
    <Table
      withColumnBorders
      verticalSpacing={4}
      horizontalSpacing="xs"
      style={{ borderRadius: '0 0 4px 4px' }}
    >
      <Table.Tbody>
        {outputs.length > 0 && (
          <>
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text size="sm" fw="bold">
                  Products
                </Text>
              </Table.Td>
            </Table.Tr>
            {outputs.map(output => (
              <FactoryOutputFlowRow
                key={`out-${output.resource}`}
                factoryId={factory.id}
                output={output}
              />
            ))}
          </>
        )}
        {inputs.length > 0 && (
          <>
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text size="sm" fw="bold">
                  Ingredients
                </Text>
              </Table.Td>
            </Table.Tr>
            {inputs.map(input => (
              <FactoryInputFlowRow
                key={`in-${input.resource}-${input.factoryId ?? ''}`}
                input={input}
              />
            ))}
          </>
        )}
      </Table.Tbody>
    </Table>
  );
}

function FactoryOutputFlowRow({
  factoryId,
  output,
}: {
  factoryId: string;
  output: FactoryOutput;
}) {
  const { percentage, producedAmount, usedAmount } = useOutputUsage({
    factoryId,
    output: output.resource,
  });
  const item = output.resource ? AllFactoryItemsMap[output.resource] : null;
  const round = (n: number) => Math.round(n * 100) / 100;

  if (!item) return null;

  const surplus = producedAmount - usedAmount;
  const hasSurplus = producedAmount > 0 && surplus > 0.001;
  const isMissing = usedAmount > producedAmount + 0.001;

  return (
    <Table.Tr>
      <Table.Td>
        <FactoryItemImage size={22} highRes id={item.id} />
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.displayName ?? item.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw="bold">
          {round(output.amount ?? 0)}/min
        </Text>
      </Table.Td>
      <Table.Td>
        {(hasSurplus || isMissing) && (
          <Tooltip label="Unused" withArrow>
            <Text size="xs" c={isMissing ? 'red.4' : undefined}>
              {isMissing
                ? `-${round(usedAmount - producedAmount)}/min`
                : `+${round(surplus)}/min`}
            </Text>
          </Tooltip>
        )}
      </Table.Td>
      <Table.Td>
        {(output.amount ?? 0) > 0 && (
          <BaseFactoryUsage
            percentage={percentage}
            size={26}
            thickness={4}
            textWidth={26}
          />
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function FactoryInputFlowRow({ input }: { input: FactoryInput }) {
  const item = input.resource ? AllFactoryItemsMap[input.resource] : null;
  const round = (n: number) => Math.round(n * 100) / 100;

  if (!item) return null;

  return (
    <Table.Tr>
      <Table.Td>
        <FactoryItemImage size={22} highRes id={item.id} />
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.displayName ?? item.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw="bold">
          {round(input.amount ?? 0)}/min
        </Text>
      </Table.Td>
      <Table.Td />
      <Table.Td />
    </Table.Tr>
  );
}

interface IFactoryNodeOutputLineProps {
  factoryId: string;
  output: FactoryOutput;
}

function FactoryNodeOutputLine({
  factoryId,
  output,
}: IFactoryNodeOutputLineProps) {
  const item = output.resource ? AllFactoryItemsMap[output.resource] : null;

  const usedAmount = useStore(state => {
    const game = state.games.games[state.games.selected ?? ''];
    if (!game) return 0;
    return game.factoriesIds
      .flatMap(id => state.factories.factories[id]?.inputs)
      .filter(
        i => i?.resource === output.resource && i?.factoryId === factoryId,
      )
      .reduce((sum, i) => sum + Math.max(i?.amount ?? 0, 0), 0);
  });

  if (!item) return null;

  const produced = output.amount ?? 0;
  const surplus = produced - usedAmount;
  const round = (n: number) => Math.round(n * 100) / 100;

  const hasSurplus = produced > 0 && surplus > 0.001;
  const isMissing = usedAmount > produced + 0.001;

  return (
    <Stack gap={6} align="center">
      <Text size="xs">{item.name}</Text>
      {(hasSurplus || isMissing) && (
        <Tooltip
          withArrow
          label={
            hasSurplus
              ? `${round(surplus)}/min of ${item.name} unused`
              : `Missing ${round(usedAmount - produced)}/min of ${item.name}`
          }
        >
          <Badge
            size="sm"
            variant="light"
            color={isMissing ? 'red' : 'gray'}
            leftSection={
              <FactoryItemImage size={14} highRes id={output.resource!} />
            }
            styles={{ label: { textTransform: 'none' } }}
          >
            {isMissing
              ? `-${round(usedAmount - produced)}/min`
              : `+${round(surplus)}/min`}
          </Badge>
        </Tooltip>
      )}
    </Stack>
  );
}
