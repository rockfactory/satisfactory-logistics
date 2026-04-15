import type { JSONContent } from '@tiptap/react';

/**
 * True when the TipTap JSON contains at least one non-whitespace character.
 * Empty paragraphs, empty headings, empty task items — all count as "no
 * content", matching the user's expectation ("if I see no text, show no
 * indicator"). This is the same semantics as `editor.getText().trim()`.
 */
export function hasNotesContent(json: JSONContent | null | undefined): boolean {
  if (!json) return false;
  return extractText(json).trim().length > 0;
}

function extractText(node: JSONContent): string {
  let out = '';
  if (typeof node.text === 'string') out += node.text;
  if (Array.isArray(node.content)) {
    for (const child of node.content) out += extractText(child);
  }
  return out;
}
