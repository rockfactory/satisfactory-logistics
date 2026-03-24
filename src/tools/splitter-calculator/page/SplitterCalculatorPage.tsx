import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Container,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import {
  IconMinus,
  IconPlus,
  IconCalculator,
  IconAlertCircle,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';
import { ReactFlowProvider } from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import { FactoryConveyorBelts } from '@/recipes/FactoryBuilding';
import { calculateSplitterNetwork } from '../algorithm/splitRatios';
import { applySimplfications } from '../algorithm/simplify';
import type { SplitterTarget } from '../algorithm/types';
import { SplitterGraphLayout } from '../graph/SplitterGraphLayout';
import { toReactFlowGraph } from '../graph/toReactFlow';

interface RateRow {
  id: number;
  rate: number;
  count: number;
}

let rowIdCounter = 0;
function nextRowId() {
  return rowIdCounter++;
}

const BELT_OPTIONS = FactoryConveyorBelts.map(b => ({
  label: `${b.name} (${b.conveyor!.speed}/min)`,
  value: String(b.conveyor!.speed),
})).sort((a, b) => Number(a.value) - Number(b.value));

function makeSource(rate = 60, count = 1): RateRow {
  return { id: nextRowId(), rate, count };
}
function makeTarget(rate = 30, count = 2): RateRow {
  return { id: nextRowId(), rate, count };
}

const BELT_LEGEND = [
  { name: 'Mk.1', speed: 60, color: '#868e96' },
  { name: 'Mk.2', speed: 120, color: '#51cf66' },
  { name: 'Mk.3', speed: 270, color: '#339af0' },
  { name: 'Mk.4', speed: 480, color: '#cc5de8' },
  { name: 'Mk.5', speed: 780, color: '#ff922b' },
  { name: 'Mk.6', speed: 1200, color: '#ff6b6b' },
];

function BeltLegend() {
  return (
    <Group gap="md" justify="center">
      {BELT_LEGEND.map(b => (
        <Group key={b.speed} gap={6}>
          <Box
            w={14}
            h={4}
            style={{ borderRadius: 2, backgroundColor: b.color }}
          />
          <Text size="xs" c="dimmed">
            {b.name} ({b.speed}/min)
          </Text>
        </Group>
      ))}
    </Group>
  );
}

export function SplitterCalculatorPage() {
  const [sources, setSources] = useState<RateRow[]>([makeSource()]);
  const [targets, setTargets] = useState<RateRow[]>([makeTarget()]);
  const [maxBeltSpeed, setMaxBeltSpeed] = useState(
    String(
      FactoryConveyorBelts[FactoryConveyorBelts.length - 1]?.conveyor?.speed ??
        1200,
    ),
  );
  const [allowSmart, setAllowSmart] = useState(true);
  const [useDecomposition, setUseDecomposition] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [graphData, setGraphData] = useState<{
    nodes: ReturnType<typeof toReactFlowGraph>['nodes'];
    edges: ReturnType<typeof toReactFlowGraph>['edges'];
  } | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const totalSource = useMemo(
    () => sources.reduce((sum, s) => sum + s.rate * s.count, 0),
    [sources],
  );
  const totalTarget = useMemo(
    () => targets.reduce((sum, t) => sum + t.rate * t.count, 0),
    [targets],
  );
  const hasEnoughSource = totalSource >= totalTarget - 0.01;
  const leftover = totalSource - totalTarget;

  const updateSource = useCallback(
    (index: number, field: keyof RateRow, value: number) => {
      setSources(prev => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const updateTarget = useCallback(
    (index: number, field: keyof RateRow, value: number) => {
      setTargets(prev => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const addSource = useCallback(() => {
    setSources(prev => [...prev, makeSource()]);
  }, []);

  const removeSource = useCallback((index: number) => {
    setSources(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const addTarget = useCallback(() => {
    setTargets(prev => [...prev, makeTarget(30, 1)]);
  }, []);

  const removeTarget = useCallback((index: number) => {
    setTargets(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleCalculate = useCallback(() => {
    setError(null);

    const beltSpeed = Number(maxBeltSpeed);
    const splitterTargets: SplitterTarget[] = [];
    for (const t of targets) {
      for (let i = 0; i < t.count; i++) {
        splitterTargets.push({ rate: t.rate, count: 1 });
      }
    }

    const result = calculateSplitterNetwork({
      sources: sources.map(s => ({ rate: s.rate, count: s.count })),
      targets: splitterTargets,
      maxBeltSpeed: beltSpeed,
      allowSmartSplitters: allowSmart,
      useDecomposition,
    });

    if (result.error) {
      setError(result.error);
      setGraphData(null);
      setCalculated(true);
      return;
    }

    const simplified = applySimplfications(
      result,
      beltSpeed,
      splitterTargets,
      allowSmart,
    );

    const { nodes, edges } = toReactFlowGraph(simplified, beltSpeed);
    setGraphData({ nodes, edges });
    setCalculated(true);

    const debug = {
      inputs: {
        sources: sources.map(s => ({ rate: s.rate, count: s.count })),
        targets: targets.map(t => ({ rate: t.rate, count: t.count })),
        maxBeltSpeed: beltSpeed,
      },
      graph: {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          data: { rate: n.data.holding, label: n.data.label },
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
          rate: e.data?.carrying,
          belt: e.data?.beltName,
        })),
      },
    };
    setDebugInfo(JSON.stringify(debug, null, 2));
  }, [sources, targets, maxBeltSpeed, allowSmart, useDecomposition]);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Title order={2}>Splitter Calculator</Title>
        <Text c="dimmed" size="sm">
          Calculate the optimal splitter/merger network to distribute items from
          source belts to target belts. Uses only 3-way splitters and mergers
          (matching in-game constraints).
        </Text>

        <Group align="flex-start" grow wrap="wrap">
          {/* Sources */}
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={4}>Sources</Title>
                <ActionIcon
                  variant="light"
                  color="teal"
                  onClick={addSource}
                  aria-label="Add source"
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
              {sources.map((s, i) => (
                <Group key={s.id} gap="xs">
                  <NumberInput
                    size="sm"
                    value={s.rate}
                    onChange={v => updateSource(i, 'rate', Number(v) || 0)}
                    min={1}
                    label={i === 0 ? 'Items/min' : undefined}
                    w={120}
                  />
                  <Text size="sm" mt={i === 0 ? 24 : 0}>
                    x
                  </Text>
                  <NumberInput
                    size="sm"
                    value={s.count}
                    onChange={v => updateSource(i, 'count', Number(v) || 1)}
                    min={1}
                    max={16}
                    label={i === 0 ? 'Count' : undefined}
                    w={70}
                  />
                  {sources.length > 1 && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      mt={i === 0 ? 24 : 0}
                      onClick={() => removeSource(i)}
                      aria-label="Remove source"
                    >
                      <IconMinus size={14} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
              <Text size="sm" c="dimmed">
                Total: {totalSource}/min
              </Text>
            </Stack>
          </Paper>

          {/* Targets */}
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={4}>Targets</Title>
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={addTarget}
                  aria-label="Add target"
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
              {targets.map((t, i) => (
                <Group key={t.id} gap="xs">
                  <NumberInput
                    size="sm"
                    value={t.rate}
                    onChange={v => updateTarget(i, 'rate', Number(v) || 0)}
                    min={1}
                    label={i === 0 ? 'Items/min' : undefined}
                    w={120}
                  />
                  <Text size="sm" mt={i === 0 ? 24 : 0}>
                    x
                  </Text>
                  <NumberInput
                    size="sm"
                    value={t.count}
                    onChange={v => updateTarget(i, 'count', Number(v) || 1)}
                    min={1}
                    max={16}
                    label={i === 0 ? 'Count' : undefined}
                    w={70}
                  />
                  {targets.length > 1 && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      mt={i === 0 ? 24 : 0}
                      onClick={() => removeTarget(i)}
                      aria-label="Remove target"
                    >
                      <IconMinus size={14} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
              <Text size="sm" c="dimmed">
                Total: {totalTarget}/min
              </Text>
            </Stack>
          </Paper>
        </Group>

        {/* Options */}
        <Paper p="md" withBorder>
          <Group gap="xl" wrap="wrap">
            <Select
              label="Max Belt Speed"
              data={BELT_OPTIONS}
              value={maxBeltSpeed}
              onChange={v => v && setMaxBeltSpeed(v)}
              w={220}
              size="sm"
            />
            <Switch
              label="Allow Smart Splitters"
              description="Use smart splitters to simplify unequal splits"
              checked={allowSmart}
              onChange={e => setAllowSmart(e.currentTarget.checked)}
              mt={6}
            />
            <Switch
              label="Use Alternate Solver"
              description="Decomposition-based solver that produces simpler networks"
              checked={useDecomposition}
              onChange={e => setUseDecomposition(e.currentTarget.checked)}
              mt={6}
            />
          </Group>
        </Paper>

        {/* Calculate button */}
        <Group>
          <Button
            size="md"
            leftSection={<IconCalculator size={18} />}
            onClick={handleCalculate}
            disabled={!hasEnoughSource}
          >
            Calculate
          </Button>
          {!hasEnoughSource && (
            <Text size="sm" c="red">
              Target total ({totalTarget}/min) exceeds source total (
              {totalSource}/min)
            </Text>
          )}
          {hasEnoughSource && leftover > 0.01 && (
            <Text size="sm" c="yellow">
              {leftover}/min will be routed to a Leftover output
            </Text>
          )}
        </Group>

        {/* Error */}
        {error && (
          <Alert
            color="red"
            icon={<IconAlertCircle size={16} />}
            title="Calculation Error"
          >
            {error}
          </Alert>
        )}

        {/* Graph */}
        {calculated && graphData && graphData.nodes.length > 0 && (
          <>
            <Paper withBorder p={0} style={{ overflow: 'hidden' }}>
              <ReactFlowProvider>
                <SplitterGraphLayout
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                />
              </ReactFlowProvider>
            </Paper>
            <Group justify="space-between" align="center">
              <BeltLegend />
              <Button
                variant="subtle"
                size="xs"
                color={copied ? 'teal' : 'gray'}
                leftSection={
                  copied ? <IconCheck size={14} /> : <IconCopy size={14} />
                }
                onClick={() => {
                  navigator.clipboard.writeText(debugInfo);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? 'Copied' : 'Copy Debug Info'}
              </Button>
            </Group>
          </>
        )}

        {calculated && !error && graphData?.nodes.length === 0 && (
          <Center py="xl">
            <Text c="dimmed">No network needed — direct connection.</Text>
          </Center>
        )}
      </Stack>
    </Container>
  );
}
