// Firefox exposes the promise-based WebExtension API as `browser`; Chrome as `chrome`.
// Both share the same shape for the APIs we use, so type everything as `chrome`.
const g = globalThis as { browser?: typeof chrome; chrome?: typeof chrome }

export const ext: typeof chrome | undefined = g.browser ?? g.chrome

export const isExtension = !!ext?.runtime?.getURL

export const isFirefox = isExtension && ext!.runtime.getURL('').startsWith('moz-extension://')
