const DEFAULT_SETTINGS = {
  enabled:         false,
  humanTiming:     true,
  scheduleEnabled: false,
  startTime:       "08:00",
  endTime:         "17:00",
  activeDays:      [1, 2, 3, 4, 5],
  lunchEnabled:    false,
  lunchStart:      "12:00",
  lunchEnd:        "13:00",
  intervalMinutes: 2
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("settings", (result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  });
});

// Re-arm on service worker restart
chrome.storage.local.get("settings", (result) => {
  const settings = result.settings || DEFAULT_SETTINGS;
  if (settings.enabled) {
    startAlarm(settings);
    notifyTabs(isAllowedNow(settings) ? "resume" : "pause");
  }
});

// ── Alarm handler ────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "keepAlive") return;

  chrome.storage.local.get("settings", (result) => {
    const s = result.settings || DEFAULT_SETTINGS;
    if (!s.enabled) return;

    // Tell inject.js to pause or resume based on schedule
    notifyTabs(isAllowedNow(s) ? "resume" : "pause");

    startAlarm(s);
  });
});

// ── Popup messages ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "settingsUpdated") return true;

  const s = message.settings;
  if (s.enabled) {
    startAlarm(s);
    notifyTabs(isAllowedNow(s) ? "resume" : "pause");
  } else {
    chrome.alarms.clear("keepAlive");
    notifyTabs("pause");
  }

  sendResponse({ ok: true });
  return true;
});

// ── Helpers ───────────────────────────────────────────────────────
function startAlarm(settings) {
  // Check every minute so schedule transitions are responsive
  chrome.alarms.create("keepAlive", { periodInMinutes: 1 });
}

function notifyTabs(action) {
  chrome.tabs.query(
    { url: ["https://teams.microsoft.com/*", "https://teams.live.com/*"] },
    (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action }).catch(() => {});
      }
    }
  );
}

function isAllowedNow(s) {
  const now     = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const day     = now.getDay();

  // Work hours + days — only checked when schedule is enabled
  if (s.scheduleEnabled) {
    const allowedDays = s.activeDays || [1, 2, 3, 4, 5];
    if (!allowedDays.includes(day)) return false;
    if (!inRange(minutes, s.startTime, s.endTime)) return false;
  }

  // Lunch break is independent of the schedule toggle
  if (s.lunchEnabled && inRange(minutes, s.lunchStart, s.lunchEnd)) return false;

  return true;
}

function inRange(current, startStr, endStr) {
  const toMin = (str) => { const [h, m] = str.split(":").map(Number); return h * 60 + m; };
  const start = toMin(startStr), end = toMin(endStr);
  return start <= end
    ? current >= start && current <= end
    : current >= start || current <= end; // overnight
}
