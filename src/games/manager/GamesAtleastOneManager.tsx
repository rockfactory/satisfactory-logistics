import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';

const logger = loglev.getLogger('games:atleast-one');

export interface IGamesAtleastOneManagerProps {}

/**
 * Ensures there is always at least one game AND that one is selected.
 * Creates a default game if none exist, or auto-selects the first available
 * game when the current selection is missing (e.g. after deleting the active game).
 */
export function GamesAtleastOneManager(props: IGamesAtleastOneManagerProps) {
  const gamesCount = useStore(state => Object.keys(state.games.games).length);
  const selected = useStore(state => state.games.selected);
  const navigate = useNavigate();

  // biome-ignore lint/correctness/useExhaustiveDependencies: gamesCount and selected are triggers, state is read live from the store.
  useEffect(() => {
    const state = useStore.getState();
    const gameIds = Object.keys(state.games.games);

    logger.debug(
      `Checking game selection (count=${gameIds.length}, selected=${state.games.selected ?? 'null'})`,
    );

    if (gameIds.length === 0) {
      const newGameId = v4();
      logger.info(`No games found, creating default "First Game" (${newGameId})`);
      state.createGame(newGameId, {
        name: 'First Game',
      });
      navigate('/factories');
      return;
    }

    const currentSelected = state.games.selected;
    if (!currentSelected || !state.games.games[currentSelected]) {
      const fallbackId = gameIds[0];
      logger.info(
        `Selected game is ${currentSelected ? 'missing' : 'null'}, falling back to first available game (${fallbackId})`,
      );
      state.selectGame(fallbackId);
    }
  }, [gamesCount, selected, navigate]);

  return null;
}
