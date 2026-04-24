import { Checkbox, Select, Stack } from '@mantine/core';
import { DEFAULT_SHOW_OUTPUT_FACTORIES_NODES } from '@/games/Game';
import { SettingSectionCard } from '../SettingSectionCard';
import {
  SETTINGS_SECTIONS,
  type SectionComponentProps,
} from '../settingsSections';
import { SHOW_OUTPUT_FACTORIES_NODES_OPTIONS } from '../showOutputFactoriesNodesOptions';

const section = SETTINGS_SECTIONS.find(s => s.id === 'graph')!;

const SELECT_DATA = SHOW_OUTPUT_FACTORIES_NODES_OPTIONS.map(o => ({
  value: o.value,
  label: o.label,
}));

export function GraphDisplaySection({
  ref,
  settings,
  onChange,
}: SectionComponentProps) {
  const currentMode =
    settings?.showOutputFactoriesNodes ?? DEFAULT_SHOW_OUTPUT_FACTORIES_NODES;
  const description =
    SHOW_OUTPUT_FACTORIES_NODES_OPTIONS.find(o => o.value === currentMode)
      ?.description ??
    'Show nodes representing downstream factories that consume this output.';

  return (
    <SettingSectionCard section={section} ref={ref}>
      <Stack gap="sm">
        <Checkbox
          label="Orthogonal edges"
          description="Draw graph edges as straight lines with 90° turns instead of curves. Easier to follow splits and paths between machines."
          checked={settings?.orthogonalEdges}
          onChange={onChange('orthogonalEdges')}
        />
        <Checkbox
          label="Disable edge animation"
          description="Stop the moving dot along graph edges. Helps on large factories and lower-end hardware. Always disabled when the OS reports prefers-reduced-motion."
          checked={settings?.disableEdgeAnimation}
          onChange={onChange('disableEdgeAnimation')}
        />
        <Select
          label="Show Output Factories Nodes"
          description={description}
          data={SELECT_DATA}
          value={currentMode}
          allowDeselect={false}
          onChange={value => {
            if (value == null) return;
            onChange('showOutputFactoriesNodes')(value);
          }}
        />
      </Stack>
    </SettingSectionCard>
  );
}
