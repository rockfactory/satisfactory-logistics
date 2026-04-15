import { getTaskListExtension, RichTextEditor } from '@mantine/tiptap';
import { Placeholder } from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TipTapTaskList from '@tiptap/extension-task-list';
import { type JSONContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef } from 'react';
import { getRandomAdaQuote } from './adaQuotes';

export interface NotesEditorProps {
  entityKey: string;
  content: JSONContent | null;
  onChange: (value: JSONContent) => void;
  placeholder?: string;
}

const EMPTY_CONTENT: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

function NotesEditorControls() {
  return (
    <RichTextEditor.ControlsGroup>
      <RichTextEditor.Bold />
      <RichTextEditor.Italic />
      <RichTextEditor.Strikethrough />
      <RichTextEditor.Code />
      <RichTextEditor.H2 />
      <RichTextEditor.BulletList />
      <RichTextEditor.OrderedList />
      <RichTextEditor.TaskList />
    </RichTextEditor.ControlsGroup>
  );
}

export function NotesEditor({
  entityKey,
  content,
  onChange,
  placeholder,
}: NotesEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Pick a random ADA quote per entity; falls back to the explicit
  // placeholder prop if the caller wants to override.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pick once per entity switch
  const resolvedPlaceholder = useMemo(
    () => placeholder ?? `${getRandomAdaQuote()}  — ADA`,
    [entityKey, placeholder],
  );

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit,
      getTaskListExtension(TipTapTaskList),
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
    ],
    content: content ?? EMPTY_CONTENT,
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current(ed.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.focus('end', { scrollIntoView: false });
  }, [editor]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: entityKey forces reset on entity switch even if content is identical
  useEffect(() => {
    if (!editor) return;
    const next = content ?? EMPTY_CONTENT;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [entityKey, editor, content]);

  return (
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar sticky stickyOffset={0}>
        <NotesEditorControls />
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content />
    </RichTextEditor>
  );
}
