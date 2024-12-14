import { loglev } from '@/core/logger/log';
import { Center, Container, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 } from 'uuid';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { sharedSolverUUIDTranslator } from '@/solver/store/Solver';
import { ISharedSolverData } from './SolverShareButton';

const logger = loglev.getLogger('solver:importer');

export interface ISolverShareImporterPageProps {}

export function SolverShareImporterPage(props: ISolverShareImporterPageProps) {
  const navigate = useNavigate();
  const sharedId = useParams<{ sharedId: string }>()?.sharedId;

  useEffect(() => {
    async function loadSharedSolver() {
      if (!sharedId) return;
      const id = sharedSolverUUIDTranslator.toUUID(sharedId);

      try {
        const { data, error } = await supabaseClient
          .from('shared_solvers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        const { instance, factory } = data.data as unknown as ISharedSolverData;
        if (!instance) {
          throw new Error('Shared solver not found');
        }

        if (!factory) {
          throw new Error('Old shared solver format, cannot load');
        }

        const isOwner =
          useStore.getState().auth.session?.user?.id === data.user_id;

        const localId = isOwner ? instance.id : v4();

        const existing = isOwner
          ? useStore.getState().solvers.instances[id]
          : Object.entries(useStore.getState().solvers.instances).find(
              ([iid, inst]) => inst.remoteSharedId === sharedId,
            )?.[1];

        if (existing) {
          logger.info('Already loaded shared solver with id', existing.id, 'remote id is', sharedId); // prettier-ignore
          // TODO Update? Only if newer?
          useStore.getState().solvers.current = existing.id;

          navigate(`/factories/calculator`);
          return;
        }

        logger.info('Loading shared solver with id', localId, 'remote id is', sharedId, { instance }); // prettier-ignore
        useStore.getState().loadSharedSolver(instance, factory, {
          isOwner,
          localId,
          sharedId,
        });

        useStore.getState().solvers.current = localId;

        navigate(`/factories/calculator`);
      } catch (error) {
        console.error('Error loading shared solver:', error);
        notifications.show({
          title: 'Error loading shared solver',
          message: (error as Error)?.message ?? 'Unknown error',
        });
        navigate('/factories');
      }
    }

    if (sharedId) {
      loadSharedSolver();
    }
  }, [navigate, sharedId]);

  return (
    <div>
      <Container size="lg">
        <Center w="100%" p="xl">
          <Loader />
        </Center>
      </Container>
    </div>
  );
}
