chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL("index.html");
  const [existing] = await chrome.tabs.query({ url });
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url });
});
