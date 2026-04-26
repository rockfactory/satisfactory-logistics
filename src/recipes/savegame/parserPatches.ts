import { ByteReader } from '@etothepii/satisfactory-file-parser';

interface ByteReaderInternals {
  bufferView: DataView;
  currentByte: number;
}

const ARRAY_FROM_DUMP_THRESHOLD_BYTES = 1024 * 1024;

let patchesInstalled = false;

/**
 * Monkey-patches two memory hot-spots in
 * `@etothepii/satisfactory-file-parser` (v4.0.1) that make endgame
 * saves OOM the worker tab:
 *
 * 1. `ByteReader.prototype.readBytes(N)` is implemented as
 *    `new Uint8Array(new Array(N).fill(0).map(p => this.readByte()))`.
 *    For N in the hundreds of MB this peaks at ~17N bytes (two
 *    N-element JS Arrays plus the final Uint8Array). The replacement
 *    copies straight from the underlying DataView buffer, peaking at N.
 *
 * 2. `PropertiesList.ParseSingleProperty` and
 *    `SaveObject.parseTrailingData` fall back to
 *    `Array.from(reader.readBytes(N))` when a property type cannot be
 *    parsed (post-1.0 game updates introducing new property kinds,
 *    mod-only types, version drift). That converts the entire byte
 *    blob into a JS Array of N SMI numbers (~8N bytes). On a real
 *    endgame save we observed this around ~71% through reading
 *    objects, where a single property's binarySize was big enough to
 *    push the worker past Chrome's tab memory limit.
 *
 *    `Array.from` is monkey-patched so that calls with a `Uint8Array`
 *    of more than 1 MB (and no map function) return `[]` instead.
 *    Our use case (recipes, used nodes, infrastructure) never reads
 *    `rawBytes` / `trailingData`, so dropping the dump is safe; the
 *    cursor still advances by N byte (the copy happens inside
 *    `readBytes` before the wrapped `Array.from` runs), so subsequent
 *    properties parse from the correct offset.
 *
 * Idempotent: calling more than once is a no-op. Designed to be invoked
 * once at worker module load.
 */
export function installSatisfactoryParserPatches(): void {
  if (patchesInstalled) return;
  patchesInstalled = true;

  ByteReader.prototype.readBytes = function readBytesPatched(
    this: ByteReader,
    count: number,
  ): Uint8Array {
    const internals = this as unknown as ByteReaderInternals;
    const sourceBuffer = internals.bufferView.buffer;
    const start = internals.bufferView.byteOffset + internals.currentByte;
    const out = new Uint8Array(count);
    out.set(new Uint8Array(sourceBuffer, start, count));
    internals.currentByte += count;
    return out;
  };

  const originalArrayFrom = Array.from.bind(Array);
  Array.from = function patchedArrayFrom(
    this: unknown,
    iterable: Iterable<unknown> | ArrayLike<unknown>,
    ...rest: unknown[]
  ): unknown[] {
    if (
      iterable instanceof Uint8Array &&
      iterable.length > ARRAY_FROM_DUMP_THRESHOLD_BYTES &&
      rest.length === 0
    ) {
      return [];
    }
    return originalArrayFrom(iterable as Iterable<unknown>, ...(rest as []));
  } as typeof Array.from;
}
