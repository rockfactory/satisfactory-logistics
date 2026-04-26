// Browser shim for Node's `stream/web`.
//
// `@etothepii/satisfactory-file-parser` calls `require('stream/web')`
// optimistically (Node-first). In the browser Vite externalises the
// import to an empty object instead of throwing, so the library's own
// `web-streams-polyfill` / `globalThis.ReadableStream` fallback never
// fires and `streamWeb.ReadableStream` ends up `undefined`. Aliasing
// `stream/web` to this file in `vite.config.ts` makes the WHATWG
// globals available where the library expects them.
export const ReadableStream = globalThis.ReadableStream;
export const WritableStream = globalThis.WritableStream;
export const TransformStream = globalThis.TransformStream;
export const ByteLengthQueuingStrategy = globalThis.ByteLengthQueuingStrategy;
export const CountQueuingStrategy = globalThis.CountQueuingStrategy;
