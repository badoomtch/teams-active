// content.js — isolated world, document_idle.
// Bridges the background service worker ↔ inject.js (MAIN world).

// Relay enable/pause signals from the background via CustomEvents
// that inject.js listens for on the document.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pause") {
    document.dispatchEvent(new CustomEvent("__teamsActivePause"));
  } else if (message.action === "resume") {
    document.dispatchEvent(new CustomEvent("__teamsActiveResume"));
  }
  sendResponse({ ok: true });
  return true;
});
