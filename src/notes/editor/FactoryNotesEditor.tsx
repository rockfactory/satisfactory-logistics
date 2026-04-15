import { useDebouncedCallback } from '@mantine/hooks';
import type { JSONContent } from '@tiptap/react';
import { useStore } from '@/core/zustand';
import { useFactory } from '@/factories/store/factoriesSlice';
import { NotesEditor } from './NotesEditor';

export interface FactoryNotesEditorProps {
  factoryId: string;
}

export function FactoryNotesEditor({ factoryId }: FactoryNotesEditorProps) {
  const factory = useFactory(factoryId);
  const updateFactory = useStore(state => state.updateFactory);

  const save = useDebouncedCallback((value: JSONContent) => {
    updateFactory(factoryId, f => {
      f.notes = value;
    });
  }, 400);

  if (!factory) return null;

  return (
    <NotesEditor
      entityKey={`factory:${factoryId}`}
      content={factory.notes ?? null}
      onChange={save}
    />
  );
}
