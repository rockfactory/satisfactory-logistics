import {
  type ComboboxItem,
  type ComboboxLikeRenderOptionInput,
  Group,
  Select,
  type SelectProps,
  Tooltip,
} from '@mantine/core';
import { IconHandStop, IconWorld } from '@tabler/icons-react';
import { type ReactNode, useCallback, useMemo } from 'react';
import { MANUAL_SOURCE_ID, WORLD_SOURCE_ID } from '@/factories/Factory';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';

interface VirtualSourceEntry {
  value: string;
  label: string;
  icon: ReactNode;
}

/**
 * Sentinel "factories" that are always offered as input sources, in addition
 * to real user-defined factories. Drives both the dropdown options and the
 * "needs at least one real factory" tooltip threshold so they stay in sync.
 */
const VIRTUAL_SOURCES: readonly VirtualSourceEntry[] = [
  { value: WORLD_SOURCE_ID, label: 'World', icon: <IconWorld size={16} /> },
  {
    value: MANUAL_SOURCE_ID,
    label: 'Manual',
    icon: <IconHandStop size={16} />,
  },
];

const VIRTUAL_SOURCE_BY_VALUE = new Map(VIRTUAL_SOURCES.map(s => [s.value, s]));

export interface IFactorySelectInputProps extends SelectProps {
  exceptId?: string;
  showOnlyIds?: string[] | null;
  /** To provide note handling */
  worldSection?: ReactNode;
  /** Optional leftSection content for Manual sources */
  manualSection?: ReactNode;
  /** Rendered as the leftSection when a real factory is selected */
  factorySection?: ReactNode;
}

export function FactorySelectInput(props: IFactorySelectInputProps) {
  const {
    exceptId,
    showOnlyIds,
    worldSection,
    manualSection,
    factorySection,
    ...inputProps
  } = props;

  const factories = useGameFactories();

  const data = useMemo(
    () => [
      ...VIRTUAL_SOURCES.map(s => ({ value: s.value, label: s.label })),
      ...factories
        .filter(
          f =>
            f.name &&
            f.id !== exceptId &&
            (!showOnlyIds || showOnlyIds.includes(f.id)),
        )
        .map(f => ({ value: f.id, label: f.name! })),
    ],
    [factories, exceptId, showOnlyIds],
  );

  const renderOption = useCallback(
    (value: ComboboxLikeRenderOptionInput<ComboboxItem>) => {
      const virtual = VIRTUAL_SOURCE_BY_VALUE.get(value.option.value);
      if (virtual) {
        return (
          <Group gap="xs">
            {virtual.icon}
            {virtual.label}
          </Group>
        );
      }
      return value.option.label;
    },
    [],
  );

  const leftSection = useMemo(() => {
    if (inputProps.value === WORLD_SOURCE_ID) {
      return worldSection ?? <IconWorld size={16} />;
    }
    if (inputProps.value === MANUAL_SOURCE_ID) {
      return manualSection ?? <IconHandStop size={16} />;
    }
    if (inputProps.value) return factorySection;
    return undefined;
  }, [inputProps.value, worldSection, manualSection, factorySection]);

  return (
    <Tooltip
      disabled={data.length > VIRTUAL_SOURCES.length}
      label={'Add a second factory and set its name to use it as an input.'}
      position="left"
      withArrow
    >
      <Select
        data={data}
        renderOption={renderOption}
        // Not accessible, but it's faster
        comboboxProps={{
          keepMounted: false,
          width: 250,
          position: 'bottom-start',
        }}
        leftSection={leftSection}
        // label="Factories"
        searchable
        placeholder={'Select factory'}
        {...inputProps}
      />
    </Tooltip>
  );
}
