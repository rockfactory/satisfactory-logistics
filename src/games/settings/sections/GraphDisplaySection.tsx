import { Checkbox } from '@mantine/core';
import { SettingSectionCard } from '../SettingSectionCard';
import {
  SETTINGS_SECTIONS,
  type SectionComponentProps,
} from '../settingsSections';

const section = SETTINGS_SECTIONS.find(s => s.id === 'graph')!;

export function GraphDisplaySection({
  ref,
  settings,
  onChange,
}: SectionComponentProps) {
  return (
    <SettingSectionCard section={section} ref={ref}>
      <Checkbox
        label="Orthogonal edges"
        description="Draw graph edges as straight lines with 90° turns instead of curves. Easier to follow splits and paths between machines."
        checked={settings?.orthogonalEdges}
        onChange={onChange('orthogonalEdges')}
      />
    </SettingSectionCard>
  );
}
