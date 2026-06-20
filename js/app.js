// js/app.js — To-Do Life Dashboard

// ---------------------------------------------------------------------------
// StorageService — single point of contact for all localStorage reads/writes.
// Requirements: 6.1, 6.7, 6.8
// ---------------------------------------------------------------------------

const StorageService = {
  /**
   * Read a value from localStorage and JSON-parse it.
   * Returns null if the key is absent, if access is denied, or if the stored
   * value is corrupted JSON (SyntaxError).
   *
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch {
      // Covers both access-denied throws and JSON SyntaxError (Req 6.8)
      return null;
    }
  },

  /**
   * JSON-stringify a value and write it to localStorage.
   * Returns true on success, false if the write throws (e.g. QuotaExceededError).
   *
   * @param {string} key
   * @param {any} value
   * @returns {boolean}
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      // Covers QuotaExceededError and any other write-time error
      return false;
    }
  },

  /**
   * Remove a key from localStorage.
   * Silently swallows any errors (e.g. access denied in private browsing).
   *
   * @param {string} key
   * @returns {void}
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently ignore — nothing meaningful to return
    }
  },
};

// ---------------------------------------------------------------------------
// Remaining modules (Utils, GreetingWidget, FocusTimerWidget, TodoListWidget,
// QuickLinksWidget) will be implemented in subsequent tasks.
// ---------------------------------------------------------------------------

const App = {
  init() {
    // GreetingWidget.init();
    // FocusTimerWidget.init();
    // TodoListWidget.init();
    // QuickLinksWidget.init();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
