import { describe, expect, test } from 'vitest';
import { toggleAsSet } from './toggleAsSet';

describe('toggleAsSet', () => {
  test('should toggle a value in an array as a set', () => {
    const items = ['a', 'b', 'c'];
    const value = 'b';
    expect(toggleAsSet(items, value, false)).toEqual(['a', 'c']);
  });

  test('should toggle to add a value in an array as a set', () => {
    const items = ['a', 'c'];
    const value = 'b';
    expect(toggleAsSet(items, value, true)).toEqual(['a', 'c', 'b']);
  });

  test('should avoid double adding a value in an array as a set', () => {
    const items = ['a', 'b', 'c'];
    const value = 'b';
    expect(toggleAsSet(items, value, true)).toEqual(['a', 'b', 'c']);
  });

  test('should avoid double removing a value in an array as a set', () => {
    const items = ['a', 'c'];
    const value = 'b';
    expect(toggleAsSet(items, value, false)).toEqual(['a', 'c']);
  });
});
