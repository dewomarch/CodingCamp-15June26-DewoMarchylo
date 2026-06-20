# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a zero-dependency, single-page productivity dashboard using Vanilla JS, plain HTML, and a single CSS file. The app delivers four widgets (Greeting, Focus Timer, To-Do List, Quick Links) with localStorage persistence, full validation, and property-based + unit tests via fast-check and Vitest.

---

## Tasks

- [x] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` with all four widget mount points (`#greeting-widget`, `#timer-widget`, `#todo-widget`, `#links-widget`)
  - Create `css/style.css` (empty placeholder with CSS custom-property token block)
  - Create `js/app.js` (empty placeholder with `DOMContentLoaded` bootstrap stub)
  - Set up Vitest + fast-check dev-only test environment: `package.json` (scripts only), `vitest.config.js`, and `tests/` directory
  - _Requirements: 5.1, 5.4, 5.5_

- [ ] 2. Implement `StorageService` and `Utils` modules
  - [x] 2.1 Implement `StorageService` (`get`, `set`, `remove`) with `try/catch` around all localStorage calls; `get` returns `null` on `SyntaxError`, `set` returns `false` on `QuotaExceededError`
    - _Requirements: 6.1, 6.7, 6.8_

  - [-] 2.2 Implement `Utils` helpers: `generateId`, `formatTime(h, m, s)`, `formatDate(date)`, `getGreeting(hour)`, `validateTaskText`, `validateLinkLabel`, `validateLinkUrl`, `normalizeUrl`
    - `formatTime` must zero-pad to MM:SS
    - `getGreeting` must cover all 24 hours with no overlap or gap
    - `normalizeUrl` prepends `"https://"` when no scheme is present
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.3, 3.5, 4.3, 4.4_

- [ ] 3. Implement `GreetingWidget`
  - [~] 3.1 Implement `GreetingWidget.init()` and `tick()`: reads `new Date()`, calls `Utils.formatTime`, `Utils.formatDate`, `Utils.getGreeting`, writes to `#greeting-time`, `#greeting-date`, `#greeting-message`; start `setInterval` at 1000 ms
    - If `date.getTime()` is `NaN`, display `"--:--"` and `"Hello!"` fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 4. Implement `FocusTimerWidget`
  - [~] 4.1 Implement timer state machine: `init()`, `start()`, `stop()`, `reset()`, `_tick()`, `_render()`, `_onComplete()`
    - Initial state: `{remainingSeconds: 1500, state: 'idle', intervalId: null}`
    - `start`: transitions `idle|paused → running`, starts `setInterval`
    - `stop`: transitions `running → paused`, clears interval, leaves `remainingSeconds` unchanged
    - `reset`: transitions any → `idle`, sets `remainingSeconds = 1500`, clears interval
    - `_onComplete`: fires when `remainingSeconds === 0`, sets `state = 'complete'`, shows completion message
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [~] 4.2 Implement `FocusTimerWidget._render()`: updates `#timer-display` and button enabled/disabled state per timer state
    - Start enabled: `idle | paused`; disabled: `running | complete`
    - Stop enabled: `running`; disabled: `idle | paused | complete`
    - Reset always enabled
    - _Requirements: 2.7, 2.8, 2.9, 2.10_

- [ ] 5. Checkpoint — Ensure `StorageService`, `Utils`, `GreetingWidget`, and `FocusTimerWidget` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement `TodoListWidget`
  - [~] 6.1 Implement `_loadFromStorage()` and `_saveToStorage()`: use `StorageService.get('todo_tasks')` / `set('todo_tasks', ...)`; fall back to `[]` on `null`; display error banner if storage throws
    - _Requirements: 3.1, 3.10, 6.1, 6.2, 6.4, 6.6, 6.8_

  - [~] 6.2 Implement `addTask(text)`: validate with `Utils.validateTaskText`; on valid input push a new `Task` object (`{id, text: text.trim(), completed: false}`) to `AppState.tasks`, call `_saveToStorage()`, call `_render()`; on invalid input call `_showValidationMsg`
    - _Requirements: 3.2, 3.3_

  - [~] 6.5 Implement `editTask(id, text)`: validate `newText`; on valid input find task by `id`, update `text = newText.trim()`, save, re-render; on invalid retain original and show validation message
    - _Requirements: 3.4, 3.5_

  - [~] 6.7 Implement `toggleTask(id)`: flip `task.completed`, save, re-render
    - _Requirements: 3.6, 3.7, 3.10_

  - [~] 6.9 Implement `deleteTask(id)`: filter out task by `id`, save, re-render
    - _Requirements: 3.8, 3.10_

  - [~] 6.11 Implement `_render()` and `_renderItem(task)`: build `<li>` for each task; apply `task--complete` class when `task.completed === true`; wire edit, toggle, and delete buttons inline
    - _Requirements: 3.9_

- [ ] 7. Implement `QuickLinksWidget`
  - [~] 7.1 Implement `_loadFromStorage()` and `_saveToStorage()`: use `StorageService`; fall back to `[]`; display error banner on failure
    - _Requirements: 4.1, 4.9, 6.1, 6.3, 6.5, 6.6, 6.8_

  - [~] 7.2 Implement `addLink(label, url)`: validate label (`Utils.validateLinkLabel`) and URL (`Utils.validateLinkUrl`); normalize with `Utils.normalizeUrl`; check for duplicate (normalized URL already in `AppState.links`) and 50-item cap; on success push new `LinkItem`, save, re-render; on failure call `_showValidationMsg`
    - _Requirements: 4.2, 4.3, 4.4, 4.7, 4.8_

  - [~] 7.6 Implement `deleteLink(id)`: filter out link by `id`, save, re-render
    - _Requirements: 4.6_

  - [~] 7.8 Implement `_render()` and `_renderItem(link)`: build a `<button>` for each link; clicking calls `window.open(link.url, '_blank')`; include delete button per item
    - _Requirements: 4.1, 4.5_

- [ ] 8. Checkpoint — Ensure all widget tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement CSS styling (`css/style.css`)
  - [~] 9.1 Define CSS custom properties (color tokens, spacing) and base reset
    - Use purple-to-blue palette: primary `hsl(258, 70%, 52%)`, secondary `hsl(220, 65%, 54%)`, bg `hsl(220, 20%, 96%)`
    - _Requirements: 5.2_

  - [~] 9.2 Implement `.dashboard-grid` responsive grid layout: 2-column above 768 px, single-column below
    - _Requirements: 5.1, 5.3, 5.7_

  - [~] 9.3 Implement `.card` base styles: `border-radius: 8px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`, `padding: 1.5rem`
    - _Requirements: 5.3_

  - [~] 9.4 Implement widget-specific styles: timer display (monospace, 3rem), `task--complete` strikethrough + opacity ≤ 0.5, input/button states, validation message styles, link button styles
    - _Requirements: 3.9, 5.2_

- [ ] 10. Wire `App.init()` and integration
  - [~] 10.1 Implement `App.init()`: called on `DOMContentLoaded`; calls `GreetingWidget.init()`, `FocusTimerWidget.init()`, `TodoListWidget.init()`, `QuickLinksWidget.init()` in order
    - _Requirements: 5.1, 5.6_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP — the core functionality will work without them, but correctness guarantees and regression safety will be lower.
- Each property test must run minimum 100 iterations via `fc.assert(fc.property(...))`.
- Add the tag comment `// Feature: todo-life-dashboard, Property N: <title>` at the top of each property test.
- StorageService must be the single point of contact for all localStorage reads and writes; widgets must not call `localStorage` directly.
- Timer state is in-memory only — do not attempt to persist it to localStorage.
- All CSS must live in `css/style.css`; all JS in `js/app.js`. No inline styles or scripts.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "2.6", "3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "6.1", "7.1", "9.1"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "4.6", "4.7", "6.2", "7.2", "9.2", "9.3"] },
    { "id": 5, "tasks": ["6.3", "6.4", "6.5", "7.3", "7.4", "7.5", "7.6", "7.8", "9.4"] },
    { "id": 6, "tasks": ["6.6", "6.7", "6.9", "6.11", "7.7", "7.9", "7.10"] },
    { "id": 7, "tasks": ["6.8", "6.10", "6.12", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3"] }
  ]
}
```
