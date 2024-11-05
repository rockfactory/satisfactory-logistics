import { StarterKit } from '@tiptap/starter-kit';
import { getTaskListExtension, RichTextEditor } from '@mantine/tiptap';
import { TaskItem } from '@tiptap/extension-task-item';
import TipTapTaskList from '@tiptap/extension-task-list';
import { useEditor } from '@tiptap/react';
import React from 'react';
import AdaQuotes from '../ada/quotes.json';
import { Placeholder } from '@tiptap/extension-placeholder';
import { rem } from '@mantine/core';

export interface INotepadProps {
  adaQuotes?: boolean;
}

const getRandomElement = function <T>(arr: T[]): T {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
};

export function Notepad(props: INotepadProps = { adaQuotes: false }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: props.adaQuotes
          ? `${getRandomElement(AdaQuotes).quote}`
          : "Let's get started pioneering!",
      }),
      getTaskListExtension(TipTapTaskList),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'test-item',
        },
      }),
    ],
    content: '',
  });

  return (
      <RichTextEditor editor={editor} style={{ minHeight: rem(300) }}>
        <RichTextEditor.Toolbar>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.TaskList />
            <RichTextEditor.TaskListLift />
            <RichTextEditor.TaskListSink />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content />
      </RichTextEditor>
  );
}
