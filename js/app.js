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
// Utils — shared helpers for ID generation, formatting, validation, and URL
// normalization.
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.3, 3.5, 4.3, 4.4, 7.2, 7.3
// ---------------------------------------------------------------------------

const Utils = {
  /**
   * Generate a unique ID string.
   * Uses crypto.randomUUID() when available; falls back to a Date.now()-based
   * hex string in environments where crypto.randomUUID is not present.
   *
   * @returns {string}
   */
  generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback: Date.now() + random hex
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  },

  /**
   * Format a Date object into a zero-padded "HH:MM" clock string.
   * This is used by the Greeting widget because Requirement 1.1 expects
   * current time, not timer duration.
   *
   * @param {Date} date
   * @returns {string} e.g. "14:05"
   */
  formatClockTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  },

  /**
   * Format hours, minutes, and seconds into a zero-padded "MM:SS" string.
   * The hours parameter is accepted but not included in the output; the
   * display format is minutes:seconds (matching the Pomodoro timer use-case
   * where remainingSeconds is decomposed into h, m, s before calling this).
   *
   * @param {number} h - hours (accepted, not used in output)
   * @param {number} m - minutes (0–59)
   * @param {number} s - seconds (0–59)
   * @returns {string} e.g. "04:59"
   */
  formatTime(h, m, s) {
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
  },

  /**
   * Format a Date object as a human-readable string.
   * Example output: "Monday, 16 June 2025"
   *
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  },

  /**
   * Return a greeting string for the given hour of the day (0–23).
   * Covers all 24 hours with no overlap and no gap:
   *   05–11 → "Good Morning"
   *   12–17 → "Good Afternoon"
   *   18–20 → "Good Evening"
   *   00–04, 21–23 → "Good Night"
   *
   * @param {number} hour - integer in [0, 23]
   * @returns {string}
   */
  getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night'; // covers 0–4 and 21–23
  },

  /**
   * Validate a task text string.
   * Valid if: 1–200 characters, non-whitespace-only.
   *
   * @param {string} s
   * @returns {{ valid: boolean, reason: string }}
   */
  validateTaskText(s) {
    if (typeof s !== 'string' || s.trim().length === 0) {
      return { valid: false, reason: 'Task description cannot be empty.' };
    }
    if (s.length > 200) {
      return { valid: false, reason: 'Task description must be 200 characters or fewer.' };
    }
    return { valid: true, reason: '' };
  },

  /**
   * Validate a quick-link label string.
   * Valid if: 1–50 characters, non-whitespace-only.
   *
   * @param {string} s
   * @returns {{ valid: boolean, reason: string }}
   */
  validateLinkLabel(s) {
    if (typeof s !== 'string' || s.trim().length === 0) {
      return { valid: false, reason: 'Link label cannot be empty.' };
    }
    if (s.length > 50) {
      return { valid: false, reason: 'Link label must be 50 characters or fewer.' };
    }
    return { valid: true, reason: '' };
  },

  /**
   * Validate a quick-link URL string.
   * Valid if: non-empty after trimming, max 2048 characters.
   *
   * @param {string} s
   * @returns {{ valid: boolean, reason: string }}
   */
  validateLinkUrl(s) {
    if (typeof s !== 'string' || s.trim().length === 0) {
      return { valid: false, reason: 'Link URL cannot be empty.' };
    }
    if (s.length > 2048) {
      return { valid: false, reason: 'Link URL must be 2048 characters or fewer.' };
    }
    return { valid: true, reason: '' };
  },

  /**
   * Normalize a URL by prepending "https://" if no scheme is present.
   * A scheme is considered present when the URL starts with "http://" or
   * "https://". URLs that already carry either scheme are returned unchanged.
   *
   * @param {string} s
   * @returns {string}
   */
  normalizeUrl(s) {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return s;
    }
    return `https://${s}`;
  },

  /**
   * Normalize task text for duplicate detection.
   * Trims edges, lowercases, and collapses internal whitespace so visually
   * identical task text is treated as a duplicate (Challenge: Prevent duplicate tasks).
   *
   * @param {string} s
   * @returns {string}
   */
  normalizeTaskText(s) {
    return String(s).trim().replace(/\s+/g, ' ').toLowerCase();
  },

  /**
   * Validate a custom greeting name.
   * Empty names are allowed so the user can clear the saved name.
   *
   * @param {string} s
   * @returns {{ valid: boolean, reason: string }}
   */
  validateName(s) {
    if (typeof s !== 'string') {
      return { valid: false, reason: 'Name must be text.' };
    }
    if (s.length > 50) {
      return { valid: false, reason: 'Name must be 50 characters or fewer.' };
    }
    return { valid: true, reason: '' };
  },

  /**
   * Validate a Pomodoro duration in minutes.
   * Valid range is 1–120 minutes to keep the timer useful and bounded.
   *
   * @param {string|number} value
   * @returns {{ valid: boolean, reason: string, minutes: number }}
   */
  validatePomodoroMinutes(value) {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      return { valid: false, reason: 'Pomodoro time must be between 1 and 120 minutes.', minutes: 25 };
    }
    return { valid: true, reason: '', minutes };
  },
};


// ---------------------------------------------------------------------------
// ThemeWidget — Light / Dark mode challenge.
// Stores the selected theme and applies it by toggling a class on <body>.
// Requirements: 7.1, 7.5
// ---------------------------------------------------------------------------

const ThemeWidget = {
  /** @type {'light'|'dark'} */
  _theme: 'light',

  /**
   * Initialise the theme toggle.
   * Uses a saved preference when available; otherwise falls back to the system
   * dark-mode preference through window.matchMedia().
   *
   * @returns {void}
   */
  init() {
    const savedTheme = StorageService.get('dashboard_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this._theme = savedTheme;
    } else if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this._theme = 'dark';
    }

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggle());

    this._applyTheme();
  },

  /**
   * Toggle between light and dark modes.
   *
   * @returns {void}
   */
  toggle() {
    this._theme = this._theme === 'dark' ? 'light' : 'dark';
    StorageService.set('dashboard_theme', this._theme);
    this._applyTheme();
  },

  /**
   * Apply the selected theme to the document body and update button state.
   *
   * @returns {void}
   */
  _applyTheme() {
    document.body.classList.toggle('theme-dark', this._theme === 'dark');

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = this._theme === 'dark' ? 'Light Mode' : 'Dark Mode';
      toggleBtn.setAttribute('aria-pressed', String(this._theme === 'dark'));
    }
  },
};

// ---------------------------------------------------------------------------
// GreetingWidget — displays current time, date, and a contextual greeting.
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
// ---------------------------------------------------------------------------

const GreetingWidget = {
  /** @type {string} */
  _name: '',
  /**
   * Start the widget: run an immediate tick then schedule one every 1000 ms.
   *
   * @returns {void}
   */
  init() {
    this._name = this._loadName();

    const nameInput = document.getElementById('name-input');
    const saveBtn   = document.getElementById('name-save');

    if (nameInput) nameInput.value = this._name;
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveName(nameInput ? nameInput.value : ''));
    if (nameInput) {
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.saveName(nameInput.value);
      });
    }

    this.tick();
    setInterval(() => this.tick(), 1000);
  },

  /**
   * Read the current time, compute formatted values, and write them to the DOM.
   * Falls back to "--:--" / "Hello!" when Date() is invalid (Req 1.8).
   *
   * @returns {void}
   */
  tick() {
    const date = new Date();

    if (isNaN(date.getTime())) {
      // System clock unavailable or returned an invalid value (Req 1.8)
      this._render('--:--', '', 'Hello!');
      return;
    }

    const h = date.getHours();

    const timeStr    = Utils.formatClockTime(date);
    const dateStr    = Utils.formatDate(date);
    const greetStr   = Utils.getGreeting(h);

    this._render(timeStr, dateStr, this._formatGreeting(greetStr));
  },

  /**
   * Load the saved custom name used in the greeting message.
   *
   * @returns {string}
   */
  _loadName() {
    const savedName = StorageService.get('dashboard_user_name');
    return typeof savedName === 'string' ? savedName : '';
  },

  /**
   * Save a custom name for the greeting widget.
   * Empty names are accepted and simply remove the name from the greeting.
   *
   * @param {string} name
   * @returns {void}
   */
  saveName(name) {
    const { valid, reason } = Utils.validateName(name);
    if (!valid) {
      this._showValidationMsg(reason);
      return;
    }

    this._name = name.trim();
    StorageService.set('dashboard_user_name', this._name);
    this._showValidationMsg(this._name ? 'Name saved.' : 'Name cleared.');
    this.tick();
  },

  /**
   * Append the saved custom name to the time-based greeting.
   *
   * @param {string} greeting
   * @returns {string}
   */
  _formatGreeting(greeting) {
    return this._name ? `${greeting}, ${this._name}` : greeting;
  },

  /**
   * Write the three values into the corresponding DOM elements.
   *
   * @param {string} time     — e.g. "14:05"
   * @param {string} dateStr  — e.g. "Monday, 16 June 2025"
   * @param {string} greeting — e.g. "Good Afternoon"
   * @returns {void}
   */
  _render(time, dateStr, greeting) {
    const timeEl    = document.getElementById('greeting-time');
    const dateEl    = document.getElementById('greeting-date');
    const messageEl = document.getElementById('greeting-message');

    if (timeEl)    timeEl.textContent    = time;
    if (dateEl)    dateEl.textContent    = dateStr;
    if (messageEl) messageEl.textContent = greeting;
  },

  /**
   * Display a validation / success message inside `#greeting-validation`.
   *
   * @param {string} reason
   * @returns {void}
   */
  _showValidationMsg(reason) {
    const el = document.getElementById('greeting-validation');
    if (!el) return;
    el.textContent = reason;
    setTimeout(() => { el.textContent = ''; }, 3000);
  },
};

// ---------------------------------------------------------------------------
// FocusTimerWidget — 25-minute countdown timer with idle/running/paused/complete
// state machine.
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
// ---------------------------------------------------------------------------

const FocusTimerWidget = {
  /** @type {{ remainingSeconds: number, state: 'idle'|'running'|'paused'|'complete', intervalId: number|null }} */
  _state: {
    remainingSeconds: 1500,
    state: 'idle',
    intervalId: null,
  },

  /** @type {number} */
  _durationMinutes: 25,

  /**
   * Initialise the widget: set initial state, render, and wire up button click
   * handlers.
   *
   * @returns {void}
   */
  init() {
    this._durationMinutes = this._loadDurationMinutes();
    this._state.remainingSeconds = this._durationMinutes * 60;
    this._state.state = 'idle';
    this._state.intervalId = null;

    const startBtn  = document.getElementById('timer-start');
    const stopBtn   = document.getElementById('timer-stop');
    const resetBtn  = document.getElementById('timer-reset');
    const applyBtn  = document.getElementById('timer-apply');
    const minutesEl = document.getElementById('timer-minutes');

    if (minutesEl) minutesEl.value = String(this._durationMinutes);
    if (startBtn)  startBtn.addEventListener('click', () => this.start());
    if (stopBtn)   stopBtn.addEventListener('click',  () => this.stop());
    if (resetBtn)  resetBtn.addEventListener('click', () => this.reset());
    if (applyBtn)  applyBtn.addEventListener('click', () => this.applyDuration(minutesEl ? minutesEl.value : 25));
    if (minutesEl) {
      minutesEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.applyDuration(minutesEl.value);
      });
    }

    this._render();
  },

  /**
   * Load the saved Pomodoro duration in minutes.
   * Falls back to the default 25 minutes when storage is empty or invalid.
   *
   * @returns {number}
   */
  _loadDurationMinutes() {
    const savedMinutes = StorageService.get('pomodoro_minutes');
    const result = Utils.validatePomodoroMinutes(savedMinutes);
    return result.valid ? result.minutes : 25;
  },

  /**
   * Transition idle|paused → running.
   * Starts a 1-second interval that calls _tick().
   *
   * @returns {void}
   */
  start() {
    if (this._state.state !== 'idle' && this._state.state !== 'paused') return;

    this._state.state = 'running';
    this._state.intervalId = setInterval(() => this._tick(), 1000);
    this._render();
  },

  /**
   * Transition running → paused.
   * Clears the interval but leaves remainingSeconds unchanged.
   *
   * @returns {void}
   */
  stop() {
    if (this._state.state !== 'running') return;

    clearInterval(this._state.intervalId);
    this._state.intervalId = null;
    this._state.state = 'paused';
    this._render();
  },

  /**
   * Transition any → idle.
   * Clears the interval, resets countdown to 25:00, clears completion message.
   *
   * @returns {void}
   */
  reset() {
    clearInterval(this._state.intervalId);
    this._state.intervalId = null;
    this._state.remainingSeconds = this._durationMinutes * 60;
    this._state.state = 'idle';

    const messageEl = document.getElementById('timer-message');
    if (messageEl) messageEl.textContent = '';

    this._render();
  },

  /**
   * Called every 1 s by setInterval while running.
   * Decrements remainingSeconds; fires _onComplete when it reaches 0.
   *
   * @returns {void}
   */
  _tick() {
    this._state.remainingSeconds -= 1;

    if (this._state.remainingSeconds <= 0) {
      this._state.remainingSeconds = 0;
      this._onComplete();
    } else {
      this._render();
    }
  },

  /**
   * Apply a custom Pomodoro duration.
   * The duration can be changed only while the timer is not running to avoid
   * unexpected jumps during an active focus session.
   *
   * @param {string|number} value
   * @returns {void}
   */
  applyDuration(value) {
    if (this._state.state === 'running') {
      this._showValidationMsg('Stop the timer before changing duration.');
      return;
    }

    const result = Utils.validatePomodoroMinutes(value);
    if (!result.valid) {
      this._showValidationMsg(result.reason);
      return;
    }

    this._durationMinutes = result.minutes;
    StorageService.set('pomodoro_minutes', this._durationMinutes);
    this.reset();
    this._showValidationMsg('Pomodoro time saved.');
  },

  /**
   * Update the timer display and button disabled states to reflect current
   * widget state.
   *
   * Button rules:
   *   idle     → Start enabled,  Stop disabled,  Reset enabled
   *   running  → Start disabled, Stop enabled,   Reset enabled
   *   paused   → Start enabled,  Stop disabled,  Reset enabled
   *   complete → Start disabled, Stop disabled,  Reset enabled
   *
   * @returns {void}
   */
  _render() {
    const { remainingSeconds, state } = this._state;

    // Update countdown display
    const displayEl = document.getElementById('timer-display');
    if (displayEl) {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      displayEl.textContent = Utils.formatTime(0, minutes, seconds);
    }

    // Update button disabled states
    const startBtn = document.getElementById('timer-start');
    const stopBtn  = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');

    if (startBtn) startBtn.disabled = (state === 'running' || state === 'complete');
    if (stopBtn)  stopBtn.disabled  = (state !== 'running');
    if (resetBtn) resetBtn.disabled = false;

    const minutesEl = document.getElementById('timer-minutes');
    if (minutesEl && document.activeElement !== minutesEl) {
      minutesEl.value = String(this._durationMinutes);
    }
  },

  /**
   * Called when remainingSeconds reaches 0.
   * Stops the interval, sets state to 'complete', shows completion message.
   *
   * @returns {void}
   */
  _onComplete() {
    clearInterval(this._state.intervalId);
    this._state.intervalId = null;
    this._state.state = 'complete';

    const messageEl = document.getElementById('timer-message');
    if (messageEl) messageEl.textContent = 'Session complete! 🎉';

    this._render();
  },

  /**
   * Display a validation / status message inside `#timer-validation`.
   *
   * @param {string} reason
   * @returns {void}
   */
  _showValidationMsg(reason) {
    const el = document.getElementById('timer-validation');
    if (!el) return;
    el.textContent = reason;
    setTimeout(() => { el.textContent = ''; }, 3000);
  },
};

// ---------------------------------------------------------------------------
// AppState — centralized in-memory state shared across widgets.
// ---------------------------------------------------------------------------

const AppState = {
  tasks: [],  // Task[]
  links: [],  // LinkItem[]
};

// ---------------------------------------------------------------------------
// TodoListWidget — task CRUD + validation + localStorage sync.
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10,
//               6.1, 6.2, 6.4, 6.6, 6.8
// ---------------------------------------------------------------------------

const TodoListWidget = {
  /**
   * Initialise the widget: load persisted tasks, render the list, and wire up
   * the Add button and Enter-key handler on the input field.
   *
   * @returns {void}
   */
  init() {
    AppState.tasks = this._loadFromStorage();
    this._render();

    const addBtn   = document.getElementById('todo-add');
    const inputEl  = document.getElementById('todo-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addTask(inputEl ? inputEl.value : '');
        if (inputEl) inputEl.value = '';
      });
    }

    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.addTask(inputEl.value);
          inputEl.value = '';
        }
      });
    }
  },

  /**
   * Load the task list from localStorage.
   *
   * - Calls `StorageService.get('todo_tasks')`.
   * - Returns the parsed array on success.
   * - Returns `[]` if the result is `null` (key absent or corrupted JSON —
   *   StorageService already handles SyntaxError by returning null, satisfying
   *   Req 6.8).
   * - If StorageService itself propagates an unexpected error (e.g. access
   *   denied in a non-standard browser), catches it, displays an error banner
   *   inside `#todo-widget`, and returns `[]`.
   *
   * @returns {Array<{id: string, text: string, completed: boolean}>}
   */
  _loadFromStorage() {
    let data;
    try {
      data = StorageService.get('todo_tasks');
    } catch (err) {
      // Unexpected propagation from StorageService (e.g. access denied)
      this._showErrorBanner('Could not load tasks — storage unavailable.');
      return [];
    }

    if (data === null) {
      // Key absent OR JSON was corrupted (StorageService returned null)
      // If it was a corruption case we surface the error message per Req 6.8.
      // We cannot distinguish absence from corruption here — StorageService
      // already swallows the SyntaxError and returns null.  Show no banner for
      // plain absence; the placeholder ("No tasks yet.") covers that case.
      return [];
    }

    if (!Array.isArray(data)) {
      // Stored value exists but is not an array — treat as corrupted
      this._showErrorBanner('Saved task data was corrupted and could not be loaded.');
      return [];
    }

    return data;
  },

  /**
   * Persist the current task list to localStorage.
   *
   * - Calls `StorageService.set('todo_tasks', AppState.tasks)`.
   * - If `set` returns `false` (QuotaExceededError), displays a "storage full"
   *   error banner inside `#todo-widget`.
   *
   * @returns {void}
   */
  _saveToStorage() {
    const ok = StorageService.set('todo_tasks', AppState.tasks);
    if (ok === false) {
      this._showErrorBanner('Could not save — storage full.');
    }
  },

  /**
   * Add a new task after validating the input text.
   *
   * @param {string} text
   * @returns {void}
   */
  addTask(text) {
    const { valid, reason } = Utils.validateTaskText(text);
    if (!valid) {
      this._showValidationMsg(reason);
      return;
    }

    if (this._hasDuplicateText(text)) {
      this._showValidationMsg('A task with this description already exists.');
      return;
    }

    /** @type {{ id: string, text: string, completed: boolean }} */
    const task = {
      id: Utils.generateId(),
      text: text.trim(),
      completed: false,
    };

    AppState.tasks.push(task);
    this._saveToStorage();
    this._render();
  },

  /**
   * Edit an existing task's text by id.
   *
   * @param {string} id
   * @param {string} newText
   * @returns {void}
   */
  editTask(id, newText) {
    const { valid, reason } = Utils.validateTaskText(newText);
    if (!valid) {
      this._showValidationMsg(reason);
      return;
    }

    if (this._hasDuplicateText(newText, id)) {
      this._showValidationMsg('A task with this description already exists.');
      return;
    }

    const task = AppState.tasks.find((t) => t.id === id);
    if (task) {
      task.text = newText.trim();
      this._saveToStorage();
      this._render();
    }
  },

  /**
   * Check whether a task text already exists.
   * Used by the Prevent duplicate tasks challenge for both add and edit flows.
   *
   * @param {string} text
   * @param {string|null} excludeId
   * @returns {boolean}
   */
  _hasDuplicateText(text, excludeId = null) {
    const normalizedText = Utils.normalizeTaskText(text);
    return AppState.tasks.some((task) => {
      return task.id !== excludeId && Utils.normalizeTaskText(task.text) === normalizedText;
    });
  },

  /**
   * Toggle the `completed` state of a task by id.
   *
   * @param {string} id
   * @returns {void}
   */
  toggleTask(id) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this._saveToStorage();
      this._render();
    }
  },

  /**
   * Delete a task by id.
   *
   * @param {string} id
   * @returns {void}
   */
  deleteTask(id) {
    AppState.tasks = AppState.tasks.filter((t) => t.id !== id);
    this._saveToStorage();
    this._render();
  },

  /**
   * Re-render the full task list inside `#todo-list`.
   * Shows a "No tasks yet." placeholder when the list is empty (Req 6.6).
   *
   * @returns {void}
   */
  _render() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (AppState.tasks.length === 0) {
      const placeholder = document.createElement('li');
      placeholder.className = 'todo-placeholder';
      placeholder.textContent = 'No tasks yet.';
      listEl.appendChild(placeholder);
      return;
    }

    AppState.tasks.forEach((task) => {
      listEl.appendChild(this._renderItem(task));
    });
  },

  /**
   * Build a `<li>` element representing a single task.
   * Applies the `task--complete` CSS class when `task.completed === true`
   * (Req 3.9).
   *
   * @param {{ id: string, text: string, completed: boolean }} task
   * @returns {HTMLElement}
   */
  _renderItem(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' task--complete' : '');
    li.dataset.id = task.id;

    // --- task text span ---
    const textSpan = document.createElement('span');
    textSpan.className = 'task__text';
    textSpan.textContent = task.text;

    // --- toggle (complete) button ---
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'task__toggle';
    toggleBtn.setAttribute('aria-label', task.completed ? 'Mark incomplete' : 'Mark complete');
    toggleBtn.textContent = task.completed ? '↩' : '✓';
    toggleBtn.addEventListener('click', () => this.toggleTask(task.id));

    // --- edit button ---
    const editBtn = document.createElement('button');
    editBtn.className = 'task__edit';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => this._startInlineEdit(li, task));

    // --- delete button ---
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task__delete';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

    li.appendChild(textSpan);
    li.appendChild(toggleBtn);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    return li;
  },

  /**
   * Replace the task's text span with an inline edit input + save/cancel
   * buttons, pre-filled with the current description (Req 3.4).
   *
   * @param {HTMLElement} li
   * @param {{ id: string, text: string, completed: boolean }} task
   * @returns {void}
   */
  _startInlineEdit(li, task) {
    // Clear the li and replace with an edit form
    li.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task__edit-input';
    input.value = task.text;
    input.maxLength = 200;
    input.setAttribute('aria-label', 'Edit task description');

    const saveBtn = document.createElement('button');
    saveBtn.className = 'task__save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      this.editTask(task.id, input.value);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'task__cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this._render());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.editTask(task.id, input.value);
      if (e.key === 'Escape') this._render();
    });

    li.appendChild(input);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);
    input.focus();
  },

  /**
   * Display a validation message inside `#todo-validation`.
   *
   * @param {string} reason
   * @returns {void}
   */
  _showValidationMsg(reason) {
    const el = document.getElementById('todo-validation');
    if (!el) return;
    el.textContent = reason;
    // Auto-clear after 4 seconds so the message doesn't linger
    setTimeout(() => { el.textContent = ''; }, 4000);
  },

  /**
   * Display an error banner inside `#todo-widget`.
   * The banner is prepended to the widget so it's immediately visible.
   *
   * @param {string} message
   * @returns {void}
   */
  _showErrorBanner(message) {
    const widget = document.getElementById('todo-widget');
    if (!widget) return;

    // Avoid duplicate banners
    const existing = widget.querySelector('.error-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = message;

    // Insert after the h2 title if present, otherwise prepend
    const title = widget.querySelector('.card__title');
    if (title && title.nextSibling) {
      widget.insertBefore(banner, title.nextSibling);
    } else {
      widget.prepend(banner);
    }
  },
};

// ---------------------------------------------------------------------------
// QuickLinksWidget — link CRUD + validation + localStorage sync.
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9,
//               6.1, 6.3, 6.5, 6.6, 6.8
// ---------------------------------------------------------------------------

const QuickLinksWidget = {
  /**
   * Initialise the widget: load persisted links, render the list, and wire up
   * the Add button click handler.
   *
   * @returns {void}
   */
  init() {
    AppState.links = this._loadFromStorage();
    this._render();

    const addBtn      = document.getElementById('link-add');
    const labelInput  = document.getElementById('link-label-input');
    const urlInput    = document.getElementById('link-url-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addLink(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
        if (labelInput) labelInput.value = '';
        if (urlInput)   urlInput.value   = '';
      });
    }
  },

  /**
   * Load the link list from localStorage.
   *
   * - Calls `StorageService.get('quick_links')`.
   * - Returns the parsed array on success.
   * - Returns `[]` if the result is `null` (key absent or corrupted JSON —
   *   StorageService already handles SyntaxError by returning null, satisfying
   *   Req 6.8).
   * - If StorageService itself propagates an unexpected error (e.g. access
   *   denied in a non-standard browser), catches it, displays an error banner
   *   inside `#links-widget`, and returns `[]`.
   *
   * @returns {Array<{id: string, label: string, url: string}>}
   */
  _loadFromStorage() {
    let data;
    try {
      data = StorageService.get('quick_links');
    } catch (err) {
      // Unexpected propagation from StorageService (e.g. access denied)
      // Requirements: 4.9, 6.8
      this._showErrorBanner('Could not load links — storage unavailable.');
      return [];
    }

    if (data === null) {
      // Key absent OR JSON was corrupted (StorageService returned null).
      // Plain absence: no banner — the placeholder ("No links saved.") covers that.
      // Corruption: StorageService already swallowed the SyntaxError and returned
      // null; we cannot distinguish the two cases here without further inspection.
      return [];
    }

    if (!Array.isArray(data)) {
      // Stored value exists but is not an array — treat as corrupted (Req 6.8)
      this._showErrorBanner('Saved link data was corrupted and could not be loaded.');
      return [];
    }

    return data;
  },

  /**
   * Persist the current link list to localStorage.
   *
   * - Calls `StorageService.set('quick_links', AppState.links)`.
   * - If `set` returns `false` (QuotaExceededError), displays a "storage full"
   *   error banner inside `#links-widget`.
   *
   * @returns {void}
   */
  _saveToStorage() {
    const ok = StorageService.set('quick_links', AppState.links);
    if (ok === false) {
      this._showErrorBanner('Could not save — storage full.');
    }
  },

  /**
   * Add a new link after validating the label and URL.
   *
   * @param {string} label
   * @param {string} url
   * @returns {void}
   */
  addLink(label, url) {
    // Validate label
    const labelResult = Utils.validateLinkLabel(label);
    if (!labelResult.valid) {
      this._showValidationMsg(labelResult.reason);
      return;
    }

    // Validate URL
    const urlResult = Utils.validateLinkUrl(url);
    if (!urlResult.valid) {
      this._showValidationMsg(urlResult.reason);
      return;
    }

    // Normalize URL — prepend "https://" if no scheme is present (Req 4.4)
    const normalizedUrl = Utils.normalizeUrl(url.trim());

    // Reject duplicate URLs (Req 4.7)
    const isDuplicate = AppState.links.some(
      (link) => link.url === normalizedUrl
    );
    if (isDuplicate) {
      this._showValidationMsg('A link with this URL already exists.');
      return;
    }

    // Enforce maximum of 50 links (Req 4.8)
    if (AppState.links.length >= 50) {
      this._showValidationMsg('Maximum 50 links reached.');
      return;
    }

    /** @type {{ id: string, label: string, url: string }} */
    const linkItem = {
      id:    Utils.generateId(),
      label: label.trim(),
      url:   normalizedUrl,
    };

    AppState.links.push(linkItem);
    this._saveToStorage();
    this._render();
  },

  /**
   * Delete a link by id.
   *
   * @param {string} id
   * @returns {void}
   */
  deleteLink(id) {
    AppState.links = AppState.links.filter((l) => l.id !== id);
    this._saveToStorage();
    this._render();
  },

  /**
   * Open a saved link in a new browser tab.
   * Uses `window.open` so the rendered Link_Item can remain a button, matching
   * Requirement 4.5 and the design's button-based Quick Links interaction.
   *
   * @param {string} url
   * @returns {void}
   */
  openLink(url) {
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (openedWindow) openedWindow.opener = null;
  },

  /**
   * Re-render the full link list inside `#links-list`.
   * Shows a "No links saved." placeholder when the list is empty (Req 6.6).
   *
   * @returns {void}
   */
  _render() {
    const listEl = document.getElementById('links-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (AppState.links.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'links-placeholder';
      placeholder.textContent = 'No links saved.';
      listEl.appendChild(placeholder);
      return;
    }

    AppState.links.forEach((link) => {
      listEl.appendChild(this._renderItem(link));
    });
  },

  /**
   * Build a container element representing a single link item.
   * The label is rendered as a clickable `<button>` that opens in a new tab
   * through `openLink()` (Req 4.5).
   *
   * @param {{ id: string, label: string, url: string }} link
   * @returns {HTMLElement}
   */
  _renderItem(link) {
    const item = document.createElement('div');
    item.className = 'link-item';
    item.dataset.id = link.id;

    // Link button — opens in new tab (Req 4.5)
    const linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.className = 'link-item__button';
    linkBtn.textContent = link.label;
    linkBtn.setAttribute('aria-label', `Open ${link.label}`);
    linkBtn.addEventListener('click', () => this.openLink(link.url));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'link-item__delete';
    deleteBtn.setAttribute('aria-label', `Delete ${link.label}`);
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => this.deleteLink(link.id));

    item.appendChild(linkBtn);
    item.appendChild(deleteBtn);

    return item;
  },

  /**
   * Display a validation message inside `#links-validation`.
   *
   * @param {string} reason
   * @returns {void}
   */
  _showValidationMsg(reason) {
    const el = document.getElementById('links-validation');
    if (!el) return;
    el.textContent = reason;
    // Auto-clear after 4 seconds so the message doesn't linger
    setTimeout(() => { el.textContent = ''; }, 4000);
  },

  /**
   * Display an error banner inside `#links-widget`.
   * The banner is prepended to the widget so it's immediately visible.
   *
   * @param {string} message
   * @returns {void}
   */
  _showErrorBanner(message) {
    const widget = document.getElementById('links-widget');
    if (!widget) return;

    // Avoid duplicate banners
    const existing = widget.querySelector('.error-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = message;

    // Insert after the h2 title if present, otherwise prepend
    const title = widget.querySelector('.card__title');
    if (title && title.nextSibling) {
      widget.insertBefore(banner, title.nextSibling);
    } else {
      widget.prepend(banner);
    }
  },
};

// ---------------------------------------------------------------------------
// App — bootstrap all dashboard widgets after the DOM is ready.
// Requirements: 5.1, 5.5, 5.6
// ---------------------------------------------------------------------------

const App = {
  /**
   * Initialise all widgets in document order.
   *
   * @returns {void}
   */
  init() {
    ThemeWidget.init();
    GreetingWidget.init();
    FocusTimerWidget.init();
    TodoListWidget.init();
    QuickLinksWidget.init();
  }
};

// Wait until `index.html` has loaded before querying widget elements.
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
