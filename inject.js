// inject.js — MAIN world, document_start.
// Runs before Teams loads, so all overrides are in place before Teams
// registers any listeners.

(function () {
  "use strict";

  // ── 1. Make ALL events appear trusted ───────────────────────────
  // Teams checks event.isTrusted on its idle-reset handlers.
  // Synthetic events are always isTrusted=false — they get ignored.
  // Overriding the getter on the prototype makes every event, including
  // our synthetic ones, appear as genuine user input.
  Object.defineProperty(Event.prototype, "isTrusted", {
    get: function () { return true; },
    configurable: false
  });

  // ── 2. Neuter the IdleDetector API ──────────────────────────────
  // Teams uses this (Chrome 94+) for system-wide idle detection
  // (screen lock, no keyboard/mouse at OS level).
  const FakeIdleDetector = class IdleDetector extends EventTarget {
    constructor() {
      super();
      this.userState   = "active";
      this.screenState = "unlocked";
    }
    start() {
      queueMicrotask(() => this.dispatchEvent(new Event("change")));
      return Promise.resolve();
    }
    static requestPermission() { return Promise.resolve("granted"); }
  };

  try {
    Object.defineProperty(window, "IdleDetector", {
      value: FakeIdleDetector,
      writable: false,
      configurable: false
    });
  } catch (_) {}

  // ── 3. Page Visibility API ───────────────────────────────────────
  // Teams checks hidden / visibilityState to detect backgrounded tabs.
  try {
    Object.defineProperty(document, "hidden",          { get: () => false,     configurable: false });
    Object.defineProperty(document, "visibilityState", { get: () => "visible", configurable: false });
  } catch (_) {}

  // Silently swallow any visibilitychange listeners Teams registers.
  const _addEventListener    = EventTarget.prototype.addEventListener;
  const _removeEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === "visibilitychange" && this === document) return;
    return _addEventListener.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    if (type === "visibilitychange" && this === document) return;
    return _removeEventListener.call(this, type, listener, options);
  };

  // ── 4. Page Lifecycle freeze / resume ───────────────────────────
  _addEventListener.call(window, "freeze", (e) => e.stopImmediatePropagation(), true);
  _addEventListener.call(window, "resume", (e) => e.stopImmediatePropagation(), true);

  // ── 5. hasFocus() ───────────────────────────────────────────────
  Document.prototype.hasFocus = () => true;

  // ── 6. Internal activity loop ────────────────────────────────────
  // Runs directly in the page (MAIN world) every 60 s.
  // Because isTrusted is now always true, these events fully reset
  // Teams' idle timer — no background alarm ping required.
  // The background alarm is a belt-and-suspenders backup.
  //
  // We store the interval ID on window so content.js can pause/resume
  // by dispatching a CustomEvent.
  let _paused = false;

  function fireActivity() {
    if (_paused) return;
    const vw = window.innerWidth  || 1200;
    const vh = window.innerHeight || 800;
    const r  = () => Math.random();

    // All five event types Teams watches for activity
    const evts = [
      new MouseEvent("mousemove",  { bubbles: true, cancelable: true, clientX: r() * vw, clientY: r() * vh }),
      new MouseEvent("mousedown",  { bubbles: true, cancelable: true, clientX: r() * vw, clientY: r() * vh }),
      new MouseEvent("mouseup",    { bubbles: true, cancelable: true, clientX: r() * vw, clientY: r() * vh }),
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Shift", code: "ShiftLeft", keyCode: 16 }),
      new KeyboardEvent("keyup",   { bubbles: true, cancelable: true, key: "Shift", code: "ShiftLeft", keyCode: 16 }),
      new TouchEvent("touchstart", { bubbles: true, cancelable: true }),
      new Event("scroll",          { bubbles: true }),
    ];

    for (const e of evts) document.dispatchEvent(e);
  }

  // Start immediately, then every 60 seconds
  // (Teams idle timer = 5 min, so 60 s gives plenty of margin)
  window.__teamsActiveInterval = setInterval(fireActivity, 60_000);
  fireActivity();

  // Allow content.js to pause/resume via CustomEvent on the document
  _addEventListener.call(document, "__teamsActivePause",  () => { _paused = true;  }, false);
  _addEventListener.call(document, "__teamsActiveResume", () => { _paused = false; fireActivity(); }, false);
})();
