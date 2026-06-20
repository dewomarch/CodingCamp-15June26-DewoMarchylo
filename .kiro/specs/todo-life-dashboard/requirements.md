# Requirements Document

## Introduction

To-Do List Life Dashboard adalah sebuah web app berbasis browser yang memberikan tampilan terpadu untuk produktivitas harian. Fitur utamanya meliputi: greeting dinamis berdasarkan waktu, focus timer (Pomodoro-style), pengelolaan to-do list, dan quick links menuju website favorit. Seluruh data disimpan di browser menggunakan Local Storage — tanpa backend, tanpa framework, hanya HTML, CSS, dan Vanilla JavaScript. Tampilan terinspirasi dari Odoo 16 Community Edition dengan palet warna ungu/biru, card-based layout, dan antarmuka yang bersih dan modern.

---

## Glossary

- **Dashboard**: Halaman utama aplikasi yang menampilkan semua widget sekaligus.
- **Greeting_Widget**: Komponen yang menampilkan waktu, tanggal, dan pesan sapaan berdasarkan waktu hari.
- **Focus_Timer**: Komponen countdown timer 25 menit bergaya Pomodoro.
- **Todo_List**: Komponen pengelolaan tugas harian (tambah, edit, selesai, hapus).
- **Task**: Satu item pekerjaan dalam Todo_List yang memiliki teks deskripsi dan status selesai/belum.
- **Quick_Links**: Komponen yang menampilkan tombol-tombol menuju URL favorit yang dapat dikustomisasi.
- **Link_Item**: Satu entri dalam Quick_Links yang memiliki label dan URL.
- **Local_Storage**: Web Storage API bawaan browser untuk menyimpan data secara persisten di sisi klien.
- **Session**: Satu sesi penggunaan halaman dari saat dibuka hingga ditutup.
- **Timer_State**: Status timer yang bisa berupa `idle`, `running`, `paused`, atau `complete`.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the dashboard, so that I immediately know what time it is and feel welcomed.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM format, updated every second.
2. THE Greeting_Widget SHALL display the current date in a human-readable format (e.g., "Monday, 16 June 2025").
3. IF the current local hour is between 05 and 11 (inclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Morning".
4. IF the current local hour is between 12 and 17 (inclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. IF the current local hour is between 18 and 20 (inclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Evening".
6. IF the current local hour is 21 or greater, OR the current local hour is 4 or less, THEN THE Greeting_Widget SHALL display the greeting "Good Night".
7. THE Greeting_Widget SHALL re-evaluate and update the greeting message on every clock tick so that the correct greeting is shown when an hour boundary is crossed, without requiring a page reload.
8. IF the system clock is unavailable or returns an invalid value, THEN THE Greeting_Widget SHALL display a fallback text (e.g., "Hello!") in place of the time-based greeting.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can manage focused work sessions using the Pomodoro technique.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with a countdown value of 25 minutes (25:00) and Timer_State set to `idle` each time the page is loaded.
2. WHEN the user activates the Start button and Timer_State is `idle` or `paused`, THE Focus_Timer SHALL begin counting down from the current remaining time, one second at a time, and set Timer_State to `running`.
3. WHILE Timer_State is `running`, THE Focus_Timer SHALL update the displayed MM:SS countdown every 1000 milliseconds.
4. WHEN the user activates the Stop button and Timer_State is `running`, THE Focus_Timer SHALL pause the countdown and set Timer_State to `paused`.
5. WHEN the user activates the Reset button, THE Focus_Timer SHALL set the countdown back to 25:00 and set Timer_State to `idle`, regardless of current Timer_State.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop the countdown automatically, set Timer_State to `complete`, and display a visible completion message (e.g., "Session complete!") to indicate the session has ended.
7. WHILE Timer_State is `running`, THE Focus_Timer SHALL disable the Start button to prevent duplicate timers.
8. WHILE Timer_State is `idle` or `paused`, THE Focus_Timer SHALL disable the Stop button.
9. THE Focus_Timer SHALL display remaining time in MM:SS format at all times.
10. WHILE Timer_State is `complete`, THE Focus_Timer SHALL disable both the Start button and the Stop button, and enable only the Reset button.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, edit, mark as done, and delete tasks, with all changes saved automatically, so that I can track my daily work without losing data on page refresh.

#### Acceptance Criteria

1. THE Todo_List SHALL display all Tasks retrieved from Local_Storage when the page is loaded.
2. WHEN the user submits a non-empty task description (1–200 characters, not whitespace-only) via the input field, THE Todo_List SHALL add a new Task with status "incomplete" and persist it to Local_Storage.
3. IF the user attempts to submit an empty, whitespace-only, or overlength (greater than 200 characters) task description, THEN THE Todo_List SHALL reject the input, display a validation message indicating the reason, and not create a Task.
4. WHEN the user activates the edit action on a Task, THE Todo_List SHALL replace the task display with an inline editable field pre-filled with the current description (within the task item itself), and save the updated description (1–200 characters, not whitespace-only) to Local_Storage when the user activates the save action.
5. IF the user activates the save action on an edit with an empty, whitespace-only, or overlength (greater than 200 characters) description, THEN THE Todo_List SHALL reject the edit, display a validation message, and retain the original task description.
6. WHEN the user activates the complete action on an incomplete Task, THE Todo_List SHALL update the Task status to "complete" and persist the change to Local_Storage.
7. WHEN the user activates the complete action on a complete Task, THE Todo_List SHALL update the Task status back to "incomplete" and persist the change to Local_Storage.
8. WHEN the user activates the delete action on a Task, THE Todo_List SHALL remove the Task from the list and from Local_Storage.
9. THE Todo_List SHALL visually distinguish complete Tasks from incomplete Tasks using strikethrough text and an opacity of 0.5 or less on the task text.
10. THE Todo_List SHALL persist the full task list to Local_Storage after every add, edit, complete-toggle, or delete operation so that data is retained across page reloads.

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to add and manage favorite website shortcuts on the dashboard, so that I can open frequently used websites with a single click.

#### Acceptance Criteria

1. WHEN the page is loaded, THE Quick_Links SHALL read Link_Items from Local_Storage and display each as a clickable button.
2. WHEN the user submits a Link_Item with a valid label (1–50 non-whitespace characters) and a valid URL (non-empty after trimming, maximum 2048 characters), THE Quick_Links SHALL add the Link_Item to the list and persist it to Local_Storage.
3. IF the user submits a Link_Item with an empty or whitespace-only label or an empty or whitespace-only URL, THEN THE Quick_Links SHALL reject the input and display a validation message that identifies which field(s) failed, without creating a Link_Item.
4. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL prepend "https://" to the URL before saving.
5. WHEN the user activates a Link_Item button, THE Quick_Links SHALL open the corresponding URL in a new browser tab.
6. WHEN the user activates the delete action on a Link_Item, THE Quick_Links SHALL remove the Link_Item from the list and from Local_Storage.
7. IF the user attempts to add a Link_Item with a URL that is identical (after normalization) to a URL already in the list, THEN THE Quick_Links SHALL reject the input and display a validation message indicating a duplicate URL.
8. IF the total number of Link_Items already in the list is 50, THEN THE Quick_Links SHALL reject the add action and display a message indicating the maximum limit has been reached.
9. IF reading from Local_Storage fails (e.g., quota exceeded or access denied), THEN THE Quick_Links SHALL display an error message and initialize with an empty list.

---

### Requirement 5: Layout dan Tampilan Visual

**User Story:** As a user, I want a clean, card-based dashboard layout inspired by Odoo 16, so that the interface is easy to read and visually pleasant during long work sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL render all four widgets (Greeting_Widget, Focus_Timer, Todo_List, Quick_Links) as individual cards within a single HTML page (`index.html`).
2. THE Dashboard SHALL apply primary brand colors in the purple-to-blue hue range (hue 220°–280°) with sufficient saturation (≥50%) so that the palette is visually consistent with the Odoo 16 Community Edition identity.
3. THE Dashboard SHALL use a card-based layout where each widget is contained in a visually separated card with a box-shadow of at least 2px blur and border-radius of at least 4px.
4. THE Dashboard SHALL reference a single external CSS file at `css/style.css` for all presentation rules; no inline styles or additional stylesheets shall be used.
5. THE Dashboard SHALL reference a single external JavaScript file at `js/app.js` for all application logic; no inline scripts or additional script files shall be used.
6. WHEN the Dashboard is opened in Chrome (latest), Firefox (latest), Edge (latest), or Safari (latest), all four widgets SHALL render without layout breakage and all interactive controls SHALL respond to user input without errors.
7. WHEN the viewport width is below 768px, THE Dashboard SHALL display all cards in a single-column layout (each card occupying 100% of the viewport width).
8. WHEN the Dashboard is loaded over a connection of at least 1 Mbps with no external network requests, THE Dashboard SHALL reach interactive state within 3 seconds of the initial page request.

---

### Requirement 6: Data Persistence dan Storage

**User Story:** As a user, I want all my tasks and quick links to be saved automatically in the browser, so that my data is always available when I return to the page.

#### Acceptance Criteria

1. THE Dashboard SHALL use the browser Local_Storage API as the sole mechanism for persisting Task and Link_Item data; no cookies, IndexedDB, or remote endpoints shall be used.
2. THE Dashboard SHALL store Task data exclusively under the Local_Storage key `todo_tasks` as a JSON-serialized array; each Task object in the array SHALL contain at minimum the fields `id` (string), `text` (string), and `completed` (boolean).
3. THE Dashboard SHALL store Link_Item data exclusively under the Local_Storage key `quick_links` as a JSON-serialized array; each Link_Item object in the array SHALL contain at minimum the fields `id` (string), `label` (string), and `url` (string).
4. WHEN Local_Storage contains a previously saved task list under `todo_tasks`, THE Todo_List SHALL deserialize the JSON and render every Task with its `text` and `completed` state intact on page load.
5. WHEN Local_Storage contains a previously saved link list under `quick_links`, THE Quick_Links SHALL deserialize the JSON and render every Link_Item with its `label` and `url` intact on page load.
6. IF `todo_tasks` or `quick_links` are absent from Local_Storage, THEN THE Dashboard SHALL initialize the corresponding widget with an empty array and display a placeholder message (e.g., "No tasks yet." or "No links saved.") in the widget body.
7. THE Dashboard SHALL serialize Task and Link_Item data to JSON before writing to Local_Storage, and deserialize JSON to objects upon reading, such that for any valid object O, `deserialize(serialize(O))` produces an object with identical `id`, `text`/`label`, `url`, and `completed` field values.
8. IF JSON parsing of a Local_Storage value throws a SyntaxError, THEN THE Dashboard SHALL discard the corrupted value, initialize the affected widget with an empty list, and display an error message informing the user that saved data could not be loaded.
