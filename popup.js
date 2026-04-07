const $ = (id) => document.getElementById(id);

const els = {
  enable:         $("enableToggle"),
  human:          $("humanToggle"),
  schedule:       $("scheduleToggle"),
  startTime:      $("startTime"),
  endTime:        $("endTime"),
  scheduleFields: $("scheduleFields"),
  lunch:          $("lunchToggle"),
  lunchStart:     $("lunchStart"),
  lunchEnd:       $("lunchEnd"),
  lunchFields:    $("lunchFields"),
  interval:       $("intervalSlider"),
  intervalValue:  $("intervalValue"),
  statusBadge:    $("statusBadge"),
  tabCountText:   $("tabCountText"),
  daysRow:        $("daysRow")
};

// Selected days state — stored as array of day numbers (0=Sun … 6=Sat)
let selectedDays = [1, 2, 3, 4, 5];

// ── Load saved settings ──────────────────────────────────────────
chrome.storage.local.get("settings", (result) => {
  const s = result.settings || {};
  els.enable.checked    = !!s.enabled;
  els.human.checked     = s.humanTiming !== false; // default on
  els.schedule.checked  = !!s.scheduleEnabled;
  els.startTime.value   = s.startTime   || "08:00";
  els.endTime.value     = s.endTime     || "17:00";
  els.lunch.checked     = !!s.lunchEnabled;
  els.lunchStart.value  = s.lunchStart  || "12:00";
  els.lunchEnd.value    = s.lunchEnd    || "13:00";
  els.interval.value    = s.intervalMinutes || 4;
  selectedDays          = s.activeDays  || [1, 2, 3, 4, 5];
  renderDays();
  updateUI();
});

// ── Tab counter ──────────────────────────────────────────────────
chrome.tabs.query(
  { url: ["https://teams.microsoft.com/*", "https://teams.live.com/*"] },
  (tabs) => {
    const n = tabs.length;
    if (n === 0) {
      els.tabCountText.innerHTML = '<span class="tab-count none">No Teams tabs open</span>';
    } else {
      els.tabCountText.innerHTML =
        `<span class="tab-count">${n} Teams tab${n > 1 ? "s" : ""}</span> detected — pings will be sent to ${n > 1 ? "all of them" : "it"}`;
    }
  }
);

// ── Days of week buttons ─────────────────────────────────────────
function renderDays() {
  els.daysRow.querySelectorAll(".day-btn").forEach((btn) => {
    const day = parseInt(btn.dataset.day, 10);
    btn.classList.toggle("selected", selectedDays.includes(day));
  });
}

els.daysRow.addEventListener("click", (e) => {
  const btn = e.target.closest(".day-btn");
  if (!btn) return;
  const day = parseInt(btn.dataset.day, 10);
  if (selectedDays.includes(day)) {
    // Keep at least one day selected
    if (selectedDays.length > 1) selectedDays = selectedDays.filter((d) => d !== day);
  } else {
    selectedDays = [...selectedDays, day];
  }
  renderDays();
  saveAndNotify();
});

// ── UI state ─────────────────────────────────────────────────────
function updateUI() {
  els.intervalValue.textContent = Number(els.interval.value).toFixed(
    els.interval.value % 1 === 0 ? 0 : 1
  ) + " min";

  const on = els.enable.checked;
  els.statusBadge.textContent = on ? "Active" : "Off";
  els.statusBadge.className   = "status-badge" + (on ? " active" : "");

  toggle(els.scheduleFields, els.schedule.checked);
  toggle(els.lunchFields,    els.lunch.checked);
}

function toggle(el, enabled) {
  el.classList.toggle("disabled", !enabled);
}

// ── Save & notify background ─────────────────────────────────────
function saveAndNotify() {
  updateUI();
  const settings = {
    enabled:         els.enable.checked,
    humanTiming:     els.human.checked,
    scheduleEnabled: els.schedule.checked,
    startTime:       els.startTime.value,
    endTime:         els.endTime.value,
    activeDays:      selectedDays,
    lunchEnabled:    els.lunch.checked,
    lunchStart:      els.lunchStart.value,
    lunchEnd:        els.lunchEnd.value,
    intervalMinutes: parseFloat(els.interval.value)
  };
  chrome.storage.local.set({ settings });
  chrome.runtime.sendMessage({ action: "settingsUpdated", settings });
}

// ── Event listeners ───────────────────────────────────────────────
[els.enable, els.human, els.schedule, els.lunch].forEach((el) =>
  el.addEventListener("change", saveAndNotify)
);
[els.startTime, els.endTime, els.lunchStart, els.lunchEnd].forEach((el) =>
  el.addEventListener("change", saveAndNotify)
);
els.interval.addEventListener("input", saveAndNotify);
