import { useMatch } from 'react-router-dom';

export function useCurrentFactoryId(): string | null {
  const detailMatch = useMatch('/factories/:id');
  const calculatorMatch = useMatch('/factories/:id/calculator');
  const id = detailMatch?.params.id ?? calculatorMatch?.params.id ?? null;
  if (!id || id === 'calculator' || id === 'charts') return null;
  return id;
}
