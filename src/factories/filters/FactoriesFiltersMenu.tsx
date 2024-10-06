import { useSelector } from 'react-redux';
import { RootState } from '../../core/store';
import { AfterHeaderSticky } from '../../layout/AfterHeaderSticky';
import { FactoriesFiltersSection } from './FactoriesFiltersSection';

export interface IFactoriesFiltersMenuProps {}

export function FactoriesFiltersMenu(props: IFactoriesFiltersMenuProps) {
  const hasFactories = useSelector(
    (state: RootState) => state.factories.present.factories.length > 0,
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
