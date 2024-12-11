import { useStore } from '@/core/zustand';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import {
  ControlledBoard,
  KanbanBoard,
  moveCard,
} from '@caldwell619/react-kanban';
import { Factory, FactoryProgressStatus } from '@/factories/Factory';
import { ProgressChip } from '@/factories/components/ProgressChip';
import './FactoriesKanban.css';
import { FactoryGridCard } from '@/factories/list/FactoryGridCard';

export const FactoriesKanban = ({
  factories,
  disableCardDrag,
}: {
  factories: Factory[];
  disableCardDrag: boolean;
}) => {
  const board: KanbanBoard<Factory> = {
    columns: ['draft', 'todo', 'in_progress', 'done'].map(status => ({
      id: status,
      title: status,
      cards: factories
        .filter(it => it.progress === status)
        .sort(
          (a, b) =>
            (a.boardIndex ?? Number.MAX_VALUE) -
            (b.boardIndex ?? Number.MAX_VALUE),
        ),
    })),
  };

  return (
    <ControlledBoard<Factory>
      renderColumnHeader={it => (
        <ProgressChip
          status={it.id as FactoryProgressStatus}
          size="lg"
          variant="light"
        />
      )}
      disableColumnDrag
      disableCardDrag={disableCardDrag}
      allowAddCard={false}
      allowAddColumn={false}
      renderCard={({ id }) => (
        <FactoryGridCard id={id} showProgressStatus={false} key={id} />
      )}
      onCardDragEnd={(movedFactory, source, destination) => {
        const { toPosition, toColumnId } = destination!;
        const { fromPosition, fromColumnId } = source!;

        if (
          fromPosition === undefined ||
          fromColumnId === undefined ||
          toPosition === undefined ||
          toColumnId === undefined
        ) {
          throw new Error();
        }

        const newBoard = moveCard(
          board,
          source,
          destination,
        ) as KanbanBoard<Factory>;

        const newToColumn = newBoard.columns.find(it => it.id === toColumnId)!;
        const newFromColumn = newBoard.columns.find(
          it => it.id === fromColumnId,
        )!;

        return useStore.getState().updateFactories(factory => {
          if (factory.id === movedFactory.id) {
            factory.progress = toColumnId as FactoryProgressStatus;
          }

          if (factory.progress === toColumnId) {
            factory.boardIndex = newToColumn.cards.findIndex(
              it => it.id === factory.id,
            );

            return;
          }

          if (factory.progress === fromColumnId) {
            factory.boardIndex = newFromColumn.cards.findIndex(
              it => it.id === factory.id,
            );

            return;
          }
        });
      }}
    >
      {board}
    </ControlledBoard>
  );
};
