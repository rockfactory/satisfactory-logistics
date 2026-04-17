import { Outlet, useLocation } from 'react-router-dom';
import { NotesPanel } from '@/notes/NotesPanel';
import { TutorialProvider } from '@/tutorial/TutorialProvider';
import { AppContainer } from './AppContainer';
import { Footer } from './Footer';
import { Header } from './Header';

export function AppLayout() {
  const { pathname } = useLocation();

  const compactFooter =
    pathname.includes('/charts') || pathname.includes('/calculator');

  return (
    <TutorialProvider>
      <AppContainer
        header={<Header />}
        footer={<Footer compact={compactFooter} />}
      >
        <Outlet />
      </AppContainer>
      <NotesPanel />
    </TutorialProvider>
  );
}
