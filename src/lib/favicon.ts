import { ext, isExtension, isFirefox } from './ext'

export function faviconUrl(pageUrl: string, size = 32): string {
  // Chrome serves cached favicons via the `favicon` permission; Firefox has no equivalent.
  if (isExtension && !isFirefox) {
    const url = new URL(ext!.runtime.getURL('/_favicon/'))
    url.searchParams.set('pageUrl', pageUrl)
    url.searchParams.set('size', String(size))
    return url.toString()
  }
  try {
    const host = new URL(pageUrl).hostname
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${host}`
  } catch {
    return ''
  }
}
