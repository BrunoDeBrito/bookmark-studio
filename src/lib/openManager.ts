const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL

export async function openManager() {
  if (!isExtension) {
    window.open('/index.html', '_blank')
    return
  }
  const url = chrome.runtime.getURL('index.html')
  const [existing] = await chrome.tabs.query({ url })
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true })
    if (existing.windowId != null) {
      await chrome.windows.update(existing.windowId, { focused: true })
    }
    return
  }
  await chrome.tabs.create({ url })
}
