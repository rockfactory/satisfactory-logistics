let _suppressDirty = 0;

export function isDirtyTrackingSuppressed(): boolean {
  return _suppressDirty > 0;
}

export function withSuppressedDirtyTracking<T>(fn: () => T): T {
  _suppressDirty += 1;
  try {
    return fn();
  } finally {
    _suppressDirty -= 1;
  }
}
