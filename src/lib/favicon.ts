const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL

export function faviconUrl(pageUrl: string, size = 32): string {
  if (isExtension) {
    const url = new URL(chrome.runtime.getURL('/_favicon/'))
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
