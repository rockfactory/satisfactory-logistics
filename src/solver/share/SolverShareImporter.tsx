import { Center, Container, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 } from 'uuid';
import { supabaseClient } from '../../core/supabase';
import { useStore } from '../../core/zustand';
import { sharedSolverUUIDTranslator } from '../store/Solver';
import { ISharedSolverData } from './SolverShareButton';

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

        const { instance } = data.data as unknown as ISharedSolverData;
        if (!instance) {
          throw new Error('Shared solver not found');
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
          console.log('Already loaded shared solver');
          // TODO Update? Only if newer?
          navigate(`/factories/calculator/${existing.id}`);
          return;
        }

        useStore.getState().loadSharedSolver(instance, {
          isOwner,
          localId,
        });

        navigate(`/factories/calculator/${localId}`);
      } catch (error) {
        console.error('Error loading shared solver:', error);
        notifications.show({
          title: 'Error loading shared solver',
          message: (error as Error)?.message ?? 'Unknown error',
        });
        navigate('/factories/calculator');
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
