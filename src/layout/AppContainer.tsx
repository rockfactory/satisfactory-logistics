import { ReactNode } from 'react';
import styles from './AppContainer.module.css';

interface IAppContainerProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export const AppContainer = ({
  footer,
  header,
  children,
}: IAppContainerProps) => {
  return (
    <div className={styles.appContainer}>
      {header}
      <div className={styles.appContainerPageContent}>{children}</div>
      {footer}
    </div>
  );
};
