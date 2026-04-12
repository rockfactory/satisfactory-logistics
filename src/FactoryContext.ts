import { createContext, useContext } from 'react';

export const FactoryContext = createContext<string | undefined>(undefined);

export const useFactoryContext = () => {
  const ctx = useContext(FactoryContext);
  if (!ctx) {
    throw new Error(
      'useFactoryContext must be used within a FactoryContext.Provider',
    );
  }
  return ctx;
};
