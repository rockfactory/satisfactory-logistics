import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { PercentageFormatter } from '@/core/intl/PercentageFormatter';
import { useStore } from '@/core/zustand';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type { FactoryRecipe } from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  computeBeltFriendlyBanks,
  type BankOption,
  type PlannerPriority,
} from './computeBeltFriendlyBanks';

export interface IBeltPlannerModalProps {
  nodeId: string;
  recipe: FactoryRecipe;
  overclock: number;
  buildingsAmount: number;
  amplifiedRate: number;
}

function PowerDeltaIndicator({
  powerDelta,
  basePower,
}: {
  powerDelta: number;
  basePower: number;
}) {
  const isIncrease = powerDelta > 0;
  const color = isIncrease ? 'red.5' : 'green.5';
  const iconColor = isIncrease
    ? 'var(--mantine-color-red-5)'
    : 'var(--mantine-color-green-5)';
  const sign = isIncrease ? '+' : '';
  const pct = basePower > 0 ? Math.round((powerDelta / basePower) * 100) : 0;

  return (
    <Group gap={4} mb="xs">
      <IconBolt size={14} color={iconColor} />
      <Text size="xs" c={color}>
        {sign}{Math.round(powerDelta)} MW ({sign}{pct}%)
      </Text>
    </Group>
  );
}

function BankOptionCard({
  option,
  recipe,
  currentOverclock,
  onApplyOverclock,
  rank,
}: {
  option: BankOption;
  recipe: FactoryRecipe;
  currentOverclock: number;
  onApplyOverclock: (overclock: number) => void;
  rank: number;
}) {
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const ingredients = option.lines.filter(l => l.type === 'ingredient');
  const products = option.lines.filter(l => l.type === 'product');
  const isOverclockChanged = option.overclock !== currentOverclock;

  return (
    <Card withBorder p="sm">
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          {rank === 0 && (
            <Badge color="green" size="sm">
              Best
            </Badge>
          )}
          {isOverclockChanged && (
            <Badge color="orange" size="sm">
              {PercentageFormatter.format(option.overclock)} clock
            </Badge>
          )}
          <Text fw="bold" size="sm">
            {option.machineCount}x {building.name} per bank
          </Text>
        </Group>
        <Group gap="xs">
          {option.banksNeeded > 0 && (
            <Text size="xs" c="dimmed">
              {option.banksNeeded} bank{option.banksNeeded !== 1 ? 's' : ''}{' '}
              {isOverclockChanged && (
                <Text span c="dimmed">
                  ({Math.ceil(option.banksNeeded * option.machineCount)} machines total)
                </Text>
              )}
            </Text>
          )}
          {isOverclockChanged && (
            <Button
              size="compact-xs"
              variant="light"
              color="orange"
              onClick={() => onApplyOverclock(option.overclock)}
            >
              Apply
            </Button>
          )}
        </Group>
      </Group>

      {isOverclockChanged && option.powerDelta !== 0 && (
        <PowerDeltaIndicator
          powerDelta={option.powerDelta}
          basePower={option.totalPower - option.powerDelta}
        />
      )}

      <Table withColumnBorders withRowBorders={false} verticalSpacing={4}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              <Text size="xs" c="dimmed">
                Resource
              </Text>
            </Table.Th>
            <Table.Th>
              <Text size="xs" c="dimmed">
                Total Rate
              </Text>
            </Table.Th>
            <Table.Th>
              <Text size="xs" c="dimmed">
                Transport
              </Text>
            </Table.Th>
            <Table.Th w={32} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {ingredients.length > 0 && (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text size="xs" fw="bold" c="dimmed">
                  Ingredients
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {ingredients.map(line => (
            <LineRow key={line.resource} line={line} />
          ))}
          {products.length > 0 && (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text size="xs" fw="bold" c="dimmed">
                  Products
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {products.map(line => (
            <LineRow key={line.resource} line={line} />
          ))}
        </Table.Tbody>
      </Table>

      <Divider my="xs" />
      <SplitDiagram option={option} buildingName={building.name} />
    </Card>
  );
}

function LineRow({ line }: { line: BankOption['lines'][number] }) {
  return (
    <Table.Tr>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <FactoryItemImage id={line.resource} size={18} />
          <Text size="xs" truncate>
            {line.displayName}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="xs" fw="bold">
          <RepeatingNumber value={line.totalRate} />
          /min
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">
          {line.transportsNeeded}x {line.transportName}
        </Text>
      </Table.Td>
      <Table.Td>
        {line.isClean ? (
          <Tooltip label="Clean belt split" zIndex={500}>
            <ThemeIcon color="green" size="xs" variant="light">
              <IconCheck size={12} />
            </ThemeIcon>
          </Tooltip>
        ) : (
          <Box w={18} />
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function SplitDiagram({
  option,
  buildingName,
}: {
  option: BankOption;
  buildingName: string;
}) {
  const ingredients = option.lines.filter(l => l.type === 'ingredient');
  const products = option.lines.filter(l => l.type === 'product');

  return (
    <Group gap="xs" justify="center" wrap="nowrap">
      <Stack gap={2} align="flex-end">
        {ingredients.map(line => (
          <Text key={line.resource} size="xs" c="dimmed">
            {line.transportsNeeded > 1
              ? `${line.transportsNeeded} ${line.isFluid ? 'pipes' : 'belts'}`
              : `1 ${line.isFluid ? 'pipe' : 'belt'}`}
          </Text>
        ))}
      </Stack>

      <IconArrowRight size={14} color="var(--mantine-color-dimmed)" />

      <Badge variant="light" color="blue" size="lg">
        {option.machineCount}x {buildingName}
      </Badge>

      <IconArrowRight size={14} color="var(--mantine-color-dimmed)" />

      <Stack gap={2} align="flex-start">
        {products.map(line => (
          <Text key={line.resource} size="xs" c="dimmed">
            {line.transportsNeeded > 1
              ? `${line.transportsNeeded} ${line.isFluid ? 'pipes' : 'belts'}`
              : `1 ${line.isFluid ? 'pipe' : 'belt'}`}
          </Text>
        ))}
      </Stack>
    </Group>
  );
}

const PRIORITY_OPTIONS = [
  { value: 'logistics', label: 'Easy Logistics' },
  { value: 'power', label: 'Energy Efficient' },
  { value: 'buildings', label: 'Fewest Buildings' },
];

export function BeltPlannerModal(props: IBeltPlannerModalProps) {
  const { nodeId, recipe, overclock, buildingsAmount, amplifiedRate } = props;
  const solverId = useParams<{ id: string }>().id;
  const [opened, { open, close }] = useDisclosure(false);
  const [priority, setPriority] = useState<PlannerPriority>('logistics');
  const [targetBanks, setTargetBanks] = useState<number | string>('');

  const roundedTotal = Math.ceil(buildingsAmount - 0.0001);
  const maxBankSize = Math.min(Math.max(roundedTotal, 32), 64);
  const targetBanksNum = Number(targetBanks) || 0;
  const options = useMemo(
    () =>
      computeBeltFriendlyBanks(
        recipe,
        overclock,
        roundedTotal,
        maxBankSize,
        priority,
        amplifiedRate,
        targetBanksNum,
      ),
    [recipe, overclock, roundedTotal, maxBankSize, priority, amplifiedRate, targetBanksNum],
  );

  const handleApplyOverclock = useCallback(
    (newOverclock: number) => {
      if (!solverId) return;
      useStore.getState().updateSolverNode(solverId, nodeId, node => {
        node.overclock = newOverclock;
      });
      close();
    },
    [solverId, nodeId, close],
  );

  const topOptions = options.slice(0, 6);

  return (
    <>
      <Tooltip label="Belt planner">
        <ActionIcon color="cyan" variant="outline" onClick={open}>
          <IconLayoutGrid size={16} />
        </ActionIcon>
      </Tooltip>
      <Modal
        opened={opened}
        onClose={close}
        title="Belt Planner"
        centered
        size="lg"
        keepMounted={false}
        zIndex={400}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Best bank sizes for{' '}
            <Text span fw="bold" c="white">
              {recipe.name}
            </Text>
            {roundedTotal > 0 && (
              <>
                {' '}({roundedTotal} machines at{' '}
                {PercentageFormatter.format(overclock)})
              </>
            )}
            . Banks are scored by how cleanly throughputs fit on single belts,
            including alternate clock speeds.
          </Text>

          <Group gap="sm" align="flex-end">
            <SegmentedControl
              value={priority}
              onChange={v => setPriority(v as PlannerPriority)}
              data={PRIORITY_OPTIONS}
              size="xs"
              style={{ flex: 1 }}
            />
            <NumberInput
              placeholder="Any"
              label="Target banks"
              size="xs"
              min={1}
              max={roundedTotal}
              value={targetBanks}
              onChange={setTargetBanks}
              w={100}
              allowNegative={false}
            />
          </Group>

          {topOptions.map((option, i) => (
            <BankOptionCard
              key={`${option.machineCount}-${option.overclock}`}
              option={option}
              recipe={recipe}
              currentOverclock={overclock}
              onApplyOverclock={handleApplyOverclock}
              rank={i}
            />
          ))}
        </Stack>
      </Modal>
    </>
  );
}
