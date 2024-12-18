import { createContext, useContext } from 'react';

export const FactoryContext = createContext<string | undefined>(undefined);

export const useFactoryContext = () => {
  return useContext(FactoryContext)!;
};
