# Design Document — To-Do Life Dashboard

## Overview

To-Do Life Dashboard is a single-page, browser-based productivity app with zero external dependencies. It delivers four interactive widgets — Greeting, Focus Timer, To-Do List, and Quick Links — all rendered inside one `index.html` file. Presentation is controlled by a single `css/style.css` and all logic lives in a single `js/app.js`. Persistence is handled exclusively through the browser `localStorage` API.

The UI is modelled on the Odoo 16 Community Edition visual language: a purple-to-blue palette (hue 220°–280°), card-based layout with subtle shadows and rounded corners, and a clean typographic hierarchy.

### Key Constraints

| Constraint | Decision |
|---|---|
| No frameworks | Vanilla JS, no React/Vue/Angular |
| No backend | Pure client-side; all data in `localStorage` |
| Single HTML file | `index.html` contains all markup |
| Single CSS file | `css/style.css` — no inline styles |
| Single JS file | `js/app.js` — no inline scripts |
| No build step | Runs directly from the file system or any static host |

---

## Architecture

### High-Level Architecture

The application follows a **Module Pattern** with a centralized state store, keeping all four widgets loosely coupled yet sharing a single source of truth.

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                       │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │  Greeting    │  │  Focus Timer  │  │  To-Do List │  │
│  │  Widget      │  │  Widget       │  │  Widget     │  │
│  └──────────────┘  └───────────────┘  └─────────────┘  │
│  ┌────────────────────┐                                 │
│  │  Quick Links Widget│                                 │
│  └────────────────────┘                                 │
└───────────────────┬─────────────────────────────────────┘
                    │  js/app.js
        ┌───────────▼────────────┐
        │      AppState          │  (in-memory state object)
        │  tasks[]               │
        │  links[]               │
        │  timerState            │
        └───────────┬────────────┘
                    │  read / write
        ┌───────────▼────────────┐
        │    StorageService      │  (localStorage wrapper)
        │  get(key)              │
        │  set(key, value)       │
        └────────────────────────┘
```

### Architectural Decisions

**Module Pattern via IIFE / `const` objects**
Each widget is implemented as a self-contained module object with `init()`, `render()`, and handler functions. Modules communicate by calling `StorageService` and mutating `AppState`, then re-rendering themselves — no global event bus required at this scale.

**Separation of concerns**

| Layer | Responsibility |
|---|---|
| HTML (`index.html`) | Semantic structure + widget mount points |
| CSS (`css/style.css`) | All visual presentation |
| JS (`js/app.js`) | State, logic, DOM manipulation, persistence |

**No virtual DOM / diffing**
Given the small data sizes (≤200 tasks, ≤50 links), full re-renders of each widget's list on every mutation are fast and keep the code simple.

---

## Components and Interfaces

### Module Interfaces (js/app.js)

```
js/app.js
├── StorageService          — localStorage read/write/error handling
├── Utils                   — shared helpers (ID generation, date formatting, validation)
├── GreetingWidget          — time/date display + greeting logic
├── FocusTimerWidget        — Pomodoro countdown logic + button state machine
├── TodoListWidget          — task CRUD + validation + localStorage sync
├── QuickLinksWidget        — link CRUD + validation + localStorage sync
└── App.init()              — bootstraps all four widgets on DOMContentLoaded
```

#### StorageService

```js
StorageService = {
  get(key)          → any | null    // JSON.parse; returns null on SyntaxError
  set(key, value)   → boolean       // JSON.stringify; returns false on QuotaExceededError
  remove(key)       → void
}
```

#### Utils

```js
Utils = {
  generateId()          → string          // crypto.randomUUID() with Date.now() fallback
  formatClockTime(date)   → string          // zero-padded "HH:MM"
  formatDuration(seconds) → string          // zero-padded "MM:SS"
  formatDate(date)      → string          // "Monday, 16 June 2025"
  getGreeting(hour)     → string          // returns one of the four greeting strings
  validateTaskText(s)   → { valid, reason }
  validateLinkLabel(s)  → { valid, reason }
  validateLinkUrl(s)    → { valid, reason }
  normalizeUrl(s)       → string          // prepends "https://" if no scheme present
}
```

#### GreetingWidget

```js
GreetingWidget = {
  init()    → void   // starts setInterval tick
  tick()    → void   // reads Date(), updates DOM
  _render(time, date, greeting) → void
}
```

#### FocusTimerWidget

```js
FocusTimerWidget = {
  init()        → void
  start()       → void   // idle|paused → running
  stop()        → void   // running → paused
  reset()       → void   // any → idle, resets to 25:00
  _tick()       → void   // called every 1 s by setInterval
  _render()     → void   // updates display + button enabled/disabled state
  _onComplete() → void   // stops timer, sets complete state, shows message
}
```

State held privately:

```js
{ remainingSeconds: 1500, state: 'idle', intervalId: null }
```

#### TodoListWidget

```js
TodoListWidget = {
  init()                → void
  _loadFromStorage()    → Task[]
  _saveToStorage()      → void
  addTask(text)         → void
  editTask(id, text)    → void
  toggleTask(id)        → void
  deleteTask(id)        → void
  _render()             → void
  _renderItem(task)     → HTMLElement
  _showValidationMsg(reason) → void
}
```

#### QuickLinksWidget

```js
QuickLinksWidget = {
  init()                → void
  _loadFromStorage()    → LinkItem[]
  _saveToStorage()      → void
  addLink(label, url)   → void
  deleteLink(id)        → void
  _render()             → void
  _renderItem(link)     → HTMLElement
  _showValidationMsg(reason) → void
}
```

---

## Data Models

### Task

Stored under `localStorage` key: **`todo_tasks`**  
Format: JSON-serialized array of `Task` objects.

```js
{
  id:        string,   // UUID, e.g. "a1b2c3d4-..."
  text:      string,   // 1–200 characters, non-whitespace-only
  completed: boolean   // false = incomplete, true = complete
}
```

Example:

```json
[
  { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "text": "Review PR #42", "completed": false },
  { "id": "3f72f5a2-86e5-4a15-b08c-2e5b3a5c6d78", "text": "Buy groceries", "completed": true }
]
```

### LinkItem

Stored under `localStorage` key: **`quick_links`**  
Format: JSON-serialized array of `LinkItem` objects.

```js
{
  id:    string,   // UUID
  label: string,   // 1–50 characters, non-whitespace-only
  url:   string    // valid URL, always begins with "http://" or "https://"
}
```

Example:

```json
[
  { "id": "c7d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f", "label": "GitHub", "url": "https://github.com" },
  { "id": "d1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a", "label": "Gmail", "url": "https://mail.google.com" }
]
```

### Timer State (in-memory only — not persisted)

```js
{
  remainingSeconds: number,  // 0–1500
  state: 'idle' | 'running' | 'paused' | 'complete',
  intervalId: number | null  // return value of setInterval
}
```

---

## File Structure

```
project-root/
├── index.html          ← Single HTML page, all widget mount points
├── css/
│   └── style.css       ← All presentation rules
└── js/
    └── app.js          ← All application logic (modules + bootstrap)
```

### index.html Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Life Dashboard</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="dashboard-grid">

    <!-- Greeting Widget -->
    <section class="card" id="greeting-widget" aria-label="Greeting">
      <div id="greeting-time"></div>
      <div id="greeting-date"></div>
      <div id="greeting-message"></div>
    </section>

    <!-- Focus Timer Widget -->
    <section class="card" id="timer-widget" aria-label="Focus Timer">
      <h2 class="card__title">Focus Timer</h2>
      <div id="timer-display">25:00</div>
      <div id="timer-message" aria-live="polite"></div>
      <div class="timer-controls">
        <button id="timer-start">Start</button>
        <button id="timer-stop">Stop</button>
        <button id="timer-reset">Reset</button>
      </div>
    </section>

    <!-- To-Do List Widget -->
    <section class="card" id="todo-widget" aria-label="To-Do List">
      <h2 class="card__title">To-Do</h2>
      <div class="todo-input-row">
        <input id="todo-input" type="text" maxlength="200"
               placeholder="Add a task…" aria-label="Task description" />
        <button id="todo-add">Add</button>
      </div>
      <div id="todo-validation" role="alert" aria-live="assertive"></div>
      <ul id="todo-list" aria-label="Task list"></ul>
    </section>

    <!-- Quick Links Widget -->
    <section class="card" id="links-widget" aria-label="Quick Links">
      <h2 class="card__title">Quick Links</h2>
      <div class="links-input-row">
        <input id="link-label-input" type="text" maxlength="50"
               placeholder="Label" aria-label="Link label" />
        <input id="link-url-input" type="text" maxlength="2048"
               placeholder="URL" aria-label="Link URL" />
        <button id="link-add">Add</button>
      </div>
      <div id="links-validation" role="alert" aria-live="assertive"></div>
      <div id="links-list" aria-label="Saved links"></div>
    </section>

  </div>
  <script src="js/app.js"></script>
</body>
</html>
```

---

## UI/UX Design Decisions

### Color Palette (Odoo 16–inspired)

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `hsl(258, 70%, 52%)` | Buttons, accents, active states |
| `--color-primary-dark` | `hsl(258, 70%, 40%)` | Hover states |
| `--color-secondary` | `hsl(220, 65%, 54%)` | Secondary buttons, links |
| `--color-bg` | `hsl(220, 20%, 96%)` | Page background |
| `--color-card` | `#ffffff` | Card background |
| `--color-text` | `hsl(220, 25%, 18%)` | Primary text |
| `--color-text-muted` | `hsl(220, 15%, 50%)` | Timestamps, placeholders |
| `--color-success` | `hsl(145, 63%, 42%)` | Completion messages |
| `--color-danger` | `hsl(354, 70%, 54%)` | Delete buttons, error messages |
| `--color-border` | `hsl(220, 20%, 88%)` | Card borders, dividers |

All hues fall within the 220°–280° purple-to-blue range for the primary palette, satisfying Requirement 5.2.

### Card Layout

```css
.card {
  background: var(--color-card);
  border-radius: 8px;                    /* ≥ 4px per Req 5.3 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.08); /* ≥ 2px blur per Req 5.3 */
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}
```

### Grid Layout

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Responsive: single column below 768 px (Req 5.7) */
@media (max-width: 767px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

### Completed Task Visual Treatment

Tasks with `completed: true` receive:

```css
.task--complete .task__text {
  text-decoration: line-through;
  opacity: 0.45;   /* ≤ 0.5 per Req 3.9 */
}
```

### Timer Display

Large monospace display (`font-size: 3rem`) centred on the card to give clear focus during a work session.

### Accessibility

- All interactive controls have explicit `aria-label` or are labelled by a visible `<label>`.
- Validation messages use `role="alert"` / `aria-live="assertive"` so screen readers announce them immediately.
- Timer completion message uses `aria-live="polite"` to avoid interrupting ongoing narration.
- Focus order follows document flow; no `tabindex` shuffling needed.
- Colour contrast target: ≥ 4.5:1 for normal text (primary purple on white passes).

---

## State Management

There is no global reactive framework. State flows in one direction:

```
User action → Event handler → Mutate AppState → Write to localStorage → Re-render widget
```

### AppState (in-memory)

```js
const AppState = {
  tasks: [],    // Task[]
  links: [],    // LinkItem[]
};
```

Timer state is owned entirely by `FocusTimerWidget` because it is not persisted and is not shared with other widgets.

### Initialization Sequence

```
DOMContentLoaded
  └── App.init()
        ├── GreetingWidget.init()     → starts 1-second tick
        ├── FocusTimerWidget.init()   → renders 25:00, binds buttons
        ├── TodoListWidget.init()     → loads AppState.tasks from localStorage, renders
        └── QuickLinksWidget.init()   → loads AppState.links from localStorage, renders
```

### Mutation Flow Example (Add Task)

```
[User types text, clicks Add]
  → TodoListWidget event handler
  → Utils.validateTaskText(text) — reject if invalid, show message
  → new Task object created with Utils.generateId()
  → AppState.tasks.push(task)
  → StorageService.set('todo_tasks', AppState.tasks)
  → TodoListWidget._render()  ← re-renders the full list
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties cover the logic layer: formatting utilities, greeting logic, timer state machine, task/link validation, and serialization round-trips. UI rendering side-effects and localStorage I/O integration are handled through runtime error handling and manual browser verification.

---

### Property 1: Time and Date Formatting Correctness

*For any* valid `Date` object, `Utils.formatClockTime(date)` shall return a string matching the regular expression `^\d{2}:\d{2}$` (zero-padded HH:MM), and `Utils.formatDate(date)` shall return a string containing the correct day-of-week name, numeric day, month name, and 4-digit year that correspond to that `Date`.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Greeting Correctness Across All Hours

*For any* integer `hour` in [0, 23]:
- If `hour` ∈ [5, 11], `Utils.getGreeting(hour)` === `"Good Morning"`
- If `hour` ∈ [12, 17], `Utils.getGreeting(hour)` === `"Good Afternoon"`
- If `hour` ∈ [18, 20], `Utils.getGreeting(hour)` === `"Good Evening"`
- If `hour` ∈ [0, 4] ∪ [21, 23], `Utils.getGreeting(hour)` === `"Good Night"`

Every hour in the 24-hour domain maps to exactly one of the four greeting strings with no overlap or gap.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 3: Timer State Machine — Button State Invariant

*For any* timer state `s ∈ { 'idle', 'running', 'paused', 'complete' }`, after calling `FocusTimerWidget._render(s)`:
- Start button: enabled when `s ∈ {'idle', 'paused'}`, disabled when `s ∈ {'running', 'complete'}`
- Stop button: enabled when `s === 'running'`, disabled when `s ∈ {'idle', 'paused', 'complete'}`
- Reset button: always enabled

**Validates: Requirements 2.7, 2.8, 2.10**

---

### Property 4: Timer Reset Universality

*For any* `remainingSeconds` in [0, 1500] and *for any* timer state `s`, calling `reset()` shall always produce `remainingSeconds === 1500` and `state === 'idle'`, regardless of prior state.

**Validates: Requirement 2.5**

---

### Property 5: Timer Stop Preserves Remaining Time

*For any* `remainingSeconds` in [1, 1500] while the timer is in `running` state, calling `stop()` shall set `state === 'paused'` and leave `remainingSeconds` unchanged.

**Validates: Requirement 2.4**

---

### Property 6: Timer Display Format Correctness

*For any* `remainingSeconds` integer in [0, 1500], `Utils.formatDuration(remainingSeconds)` shall return a string matching `^\d{2}:\d{2}$` where the minutes portion is `Math.floor(s / 60)` (zero-padded) and the seconds portion is `s % 60` (zero-padded).

**Validates: Requirement 2.9**

---

### Property 7: Valid Task Addition — List Growth and Persistence

*For any* non-empty, non-whitespace-only string `text` of length 1–200, calling `TodoListWidget.addTask(text)` shall:
1. Increase `AppState.tasks.length` by exactly 1
2. Add a new `Task` with `text === text.trim()` and `completed === false`
3. Write a JSON array to `localStorage['todo_tasks']` that includes the new task

**Validates: Requirements 3.2, 3.10**

---

### Property 8: Invalid Task Input Rejection

*For any* string `text` that is empty, composed entirely of whitespace, or longer than 200 characters, calling `TodoListWidget.addTask(text)` shall leave `AppState.tasks` unchanged and return a non-empty validation reason string.

**Validates: Requirement 3.3**

---

### Property 9: Task Edit with Valid Input Updates Text

*For any* existing task `t` in `AppState.tasks` and *for any* valid `newText` (1–200 chars, non-whitespace-only), calling `editTask(t.id, newText)` shall update `t.text` to `newText.trim()` in both `AppState` and `localStorage`. For any invalid `newText`, `t.text` shall remain unchanged.

**Validates: Requirements 3.4, 3.5**

---

### Property 10: Task Completion Toggle Round-Trip

*For any* task `t`, calling `toggleTask(t.id)` twice in succession shall restore `t.completed` to its original value. That is, the toggle operation is its own inverse.

**Validates: Requirements 3.6, 3.7**

---

### Property 11: Task Deletion Removes from State and Storage

*For any* task list containing a task with `id === targetId`, calling `deleteTask(targetId)` shall produce a state where no element of `AppState.tasks` has `id === targetId`, and `localStorage['todo_tasks']` no longer contains an object with that `id`.

**Validates: Requirement 3.8**

---

### Property 12: Completed Task Rendering Class Invariant

*For any* `Task` object, `TodoListWidget._renderItem(task)` shall produce a DOM element that:
- Has the CSS class `task--complete` if and only if `task.completed === true`
- Does not have the CSS class `task--complete` if and only if `task.completed === false`

**Validates: Requirement 3.9**

---

### Property 13: Valid Link Addition — List Growth and Persistence

*For any* valid label (1–50 chars, non-whitespace-only) and valid URL (non-empty after trimming, ≤ 2048 chars), and provided the normalized URL is not a duplicate and the list has fewer than 50 items, calling `addLink(label, url)` shall increase `AppState.links.length` by exactly 1 and persist the new `LinkItem` to `localStorage['quick_links']`.

**Validates: Requirement 4.2**

---

### Property 14: Invalid Link Input Rejection

*For any* label that is empty or whitespace-only, or *for any* URL that is empty or whitespace-only, calling `addLink(label, url)` shall leave `AppState.links` unchanged and return a non-empty, field-specific validation reason.

**Validates: Requirement 4.3**

---

### Property 15: URL Normalization

*For any* string `url` that does not begin with `"http://"` or `"https://"`, `Utils.normalizeUrl(url)` shall return `"https://" + url`. For any URL that already begins with `"http://"` or `"https://"`, it shall be returned unchanged.

**Validates: Requirement 4.4**

---

### Property 16: Duplicate URL Rejection

*For any* `LinkItem` already present in `AppState.links`, attempting to add a new link whose URL (after normalization) is identical to the existing URL shall reject the addition and leave `AppState.links` unchanged.

**Validates: Requirement 4.7**

---

### Property 17: Link Deletion Removes from State and Storage

*For any* link list containing a `LinkItem` with `id === targetId`, calling `deleteLink(targetId)` shall produce a state where no element of `AppState.links` has `id === targetId`, and `localStorage['quick_links']` no longer contains an object with that `id`.

**Validates: Requirement 4.6**

---

### Property 18: Serialization Round-Trip Preserves All Fields

*For any* valid `Task` object `t`, `JSON.parse(JSON.stringify(t))` shall produce an object with fields `id`, `text`, and `completed` equal to those of `t`.

*For any* valid `LinkItem` object `l`, `JSON.parse(JSON.stringify(l))` shall produce an object with fields `id`, `label`, and `url` equal to those of `l`.

The combined serialize → deserialize cycle is the identity function for both data types.

**Validates: Requirements 6.2, 6.3, 6.7**

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| `localStorage.getItem` throws (access denied, private browsing restrictions) | `try/catch` in `StorageService.get()` | Widget initializes with empty array; inline error banner shown |
| `JSON.parse` throws `SyntaxError` (corrupted data) | `try/catch` in `StorageService.get()` | Returns `null`; caller treats as empty; error message displayed (Req 6.8) |
| `localStorage.setItem` throws `QuotaExceededError` | `try/catch` in `StorageService.set()` | Returns `false`; widget shows "Could not save — storage full" message |
| `new Date()` returns `Invalid Date` | `isNaN(date.getTime())` check in `GreetingWidget.tick()` | Falls back to "Hello!" greeting; clock display shows "--:--" (Req 1.8) |
| Empty / whitespace-only task description | `Utils.validateTaskText()` | Validation message in `#todo-validation`; task not created (Req 3.3) |
| Task description > 200 characters | `Utils.validateTaskText()` | Same validation message; rejected (Req 3.3) |
| Empty / whitespace-only link label or URL | `Utils.validateLinkLabel()` / `Utils.validateLinkUrl()` | Field-specific validation message; link not created (Req 4.3) |
| Duplicate URL | `QuickLinksWidget.addLink()` normalises URLs and checks for duplicates | Validation message shown; link not created (Req 4.7) |
| Quick Links list at 50 items | Count check before insert | Validation message "Maximum 50 links reached" (Req 4.8) |
| URL missing scheme | `Utils.normalizeUrl()` | Prepends "https://" automatically (Req 4.4) |
| Edit saved with invalid description | `Utils.validateTaskText()` | Validation message; original description retained (Req 3.5) |

---
