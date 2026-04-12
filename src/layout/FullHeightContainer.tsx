import { ReactNode } from 'react';
import styles from '@/layout/FullHeightContainer.module.css';

export const FullHeightContainer = ({ children }: { children: ReactNode }) => {
  return <div className={styles.fullHeightContainer}>{children}</div>;
};
