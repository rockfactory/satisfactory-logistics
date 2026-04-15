import { Checkbox, ColorInput } from '@mantine/core';
import { SettingSectionCard } from '../SettingSectionCard';
import {
  SETTINGS_SECTIONS,
  type SectionComponentProps,
} from '../settingsSections';

const section = SETTINGS_SECTIONS.find(s => s.id === 'highlighting')!;

export function UsageHighlightingSection({
  ref,
  settings,
  onChange,
}: SectionComponentProps) {
  return (
    <SettingSectionCard section={section} ref={ref}>
      <Checkbox
        label="Do not highlight 100% usage"
        description="By default factories that are at 100% usage will be highlighted with a different color. Check this to keep them in red."
        checked={settings?.noHighlight100PercentUsage}
        onChange={onChange('noHighlight100PercentUsage')}
      />
      <ColorInput
        label="Highlight 100% usage color"
        description="Color used to highlight factories that are at 100% usage. By default it's a blue (#339af0)"
        value={settings?.highlight100PercentColor ?? '#339af0'}
        onChange={onChange('highlight100PercentColor')}
        format="hex"
        swatches={[
          '#339af0',
          '#868e96',
          '#fa5252',
          '#e64980',
          '#be4bdb',
          '#7950f2',
          '#4c6ef5',
          '#228be6',
          '#15aabf',
          '#12b886',
          '#40c057',
          '#82c91e',
          '#fab005',
          '#fd7e14',
        ]}
      />
    </SettingSectionCard>
  );
}
