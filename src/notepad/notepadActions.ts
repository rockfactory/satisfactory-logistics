import { useStore } from '@/core/zustand';
import { createActions } from '@/core/zustand-helpers/actions';

import dayjs from 'dayjs';
import { cloneDeep, omit } from 'lodash';
import { v4 } from 'uuid';
import { Note } from '@/notepad/notepadSlice.ts';

export const notepadActions = createActions({
  addNotepad:
    (note?: Partial<Omit<Note, 'id'>>) =>
      (state, get) => {
        get().addNote(v4(), note);
      },
});

