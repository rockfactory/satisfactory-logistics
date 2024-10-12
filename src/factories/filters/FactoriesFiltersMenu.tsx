import { useStore } from '../../core/zustand';
import { AfterHeaderSticky } from '../../layout/AfterHeaderSticky';
import { FactoriesFiltersSection } from './FactoriesFiltersSection';

export interface IFactoriesFiltersMenuProps {}

export function FactoriesFiltersMenu(props: IFactoriesFiltersMenuProps) {
  const hasFactories = useStore(
    state =>
      state.games.games[state.games.selected ?? '']?.factoriesIds.length > 0,
  );

  if (!hasFactories) {
    return null;
  }

  return (
    <AfterHeaderSticky>
      <FactoriesFiltersSection />
    </AfterHeaderSticky>
  );
}
