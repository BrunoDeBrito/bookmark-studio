import { ext, isExtension } from './ext'

export async function openManager() {
  if (!isExtension) {
    window.open('/index.html', '_blank')
    return
  }
  const api = ext!
  const url = api.runtime.getURL('index.html')
  // Firefox rejects moz-extension:// URLs as a `url` query pattern, so filter manually.
  const tabs = await api.tabs.query({})
  const existing = tabs.find((t) => t.url === url)
  if (existing?.id) {
    await api.tabs.update(existing.id, { active: true })
    if (existing.windowId != null) {
      await api.windows.update(existing.windowId, { focused: true })
    }
    return
  }
  await api.tabs.create({ url })
}
