import { useStore } from '@/core/zustand';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';

export interface IGamesAtleastOneManagerProps {}

/**
 * Create a new game if no game exists
 */
export function GamesAtleastOneManager(props: IGamesAtleastOneManagerProps) {
  const gamesCount = useStore(state => Object.keys(state.games.games).length);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Games count:', gamesCount);
    if (gamesCount === 0) {
      useStore.getState().createGame(v4(), {
        name: 'First Game',
      });
      navigate('/factories');
    }
  }, [gamesCount, navigate]);

  return null;
}
