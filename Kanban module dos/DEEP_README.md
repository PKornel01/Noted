Kanban Module — Deep Dive & Tutorials

Overview
--------
This repository implements a lightweight browser-based Kanban/board module with a simple Node/Express + MySQL backend. Boards are stored in the `modules` table with the board HTML serialized into the `data` field. The frontend is plain JavaScript and manipulates DOM elements to create boards, add/edit/delete cards, drag/drop cards between columns, and move whole boards around the page.

Key files
---------
- server.js — Express server and API endpoints (`/api/boards`, `/api/health`).
- script.js — Frontend logic: board creation, rendering, persistence, drag/drop, modals.
- index.html, style.css — UI and styles.
- noted.sql — SQL schema for `modules` table.
- package.json — project metadata (dependencies if any).

Architecture
------------
- Backend: Node.js + Express. Uses `mysql2/promise` and a connection pool. Endpoints:
  - `GET /api/boards` — returns rows from `modules` (for `project_id = 1`).
  - `POST /api/boards` — creates a new module row, returns insert id and stored values.
  - `PUT /api/boards/:boardId` — updates `title`, `data`, `xPos`, `yPos` for the module.
  - `DELETE /api/boards/:boardId` — removes a module row.
  - `GET /api/health` — simple DB ping.

- Frontend: single-page, modular functions in `script.js`:
  - `boardsData` (Map): runtime in-memory store. Keys are DOM ids like `board-123`.
  - `persistBoardToDB(boardElement)`: extracts `.board` innerHTML and sends it to the backend (first creates row if needed).
  - `loadBoardsFromDatabase()`: fetches saved rows and injects board HTML; this project re-renders cards after injection to attach event listeners.
  - Card lifecycle functions: `openAddCardModal`, `renderCard`, `deleteCard`, `openCardDetailsModal`.
  - Drag/drop: `handleCardDragStart`, `handleCardDrop`, `attachColumnDropListeners`.
  - Board movement: `makeElementMovable`.

Database schema
---------------
See `noted.sql`. The relevant table:

CREATE TABLE modules (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    project_id INT NOT NULL,
    data LONGTEXT,
    xPos BIGINT DEFAULT 0,
    yPos BIGINT DEFAULT 0,
    title TINYTEXT
);

Notes: the `data` field currently stores HTML (the board's inner `.board` markup). This simplifies persistence but makes programmatic querying and migration harder than a JSON-based approach.

Quickstart (developer)
-----------------------
1. Install dependencies (if any) and prepare DB:

```powershell
# From project root
npm install
# Create DB / table using MySQL client
# Example: mysql -u root -p < noted.sql
```

2. Create a `.env` with DB connection values (optional). Defaults are host=localhost, user=root, password=, database=noted.

3. Start the server:

```powershell
node server.js
# or use nodemon if installed:
# npx nodemon server.js
```

4. Open `index.html` in your browser (or navigate to `http://localhost:3000/index.html` if serving static files). The frontend attempts to connect to `http://localhost:3000/api`.

5. Create a board using the UI and interact (add cards, drag/drop, edit title). Data is saved automatically.

API Reference (examples)
------------------------
- Fetch all boards
  - GET http://localhost:3000/api/boards
- Create board (body JSON)
  - POST http://localhost:3000/api/boards
  - { "title": "Board title", "projectId": 1, "data": "<div>...board html...</div>", "xPos": 0, "yPos": 0 }
- Update board
  - PUT http://localhost:3000/api/boards/:boardId
  - { "title":"New title", "data": "...", "xPos": 100, "yPos": 200 }
- Delete board
  - DELETE http://localhost:3000/api/boards/:boardId

Developer deep-dive — how the important flows work
--------------------------------------------------
1) Creating a new board (frontend)
- UI: clicking the `#kanbanmaker` button creates a new DOM `.board-container` and sets `innerHTML` with four columns and `add-card` buttons.
- The code sets up a `boardsData` entry with a Map of columns to arrays and `title`.
- It calls `attachAddCardListeners(boardId)`, `attachBoardControlsListeners(boardId)`, `makeElementMovable(boardWrapper)`, then `persistBoardToDB(boardWrapper)` to create the server row.

2) Adding a card
- `attachAddCardListeners` installs click handlers on `.add-card-btn` elements that call `openAddCardModal(boardId, columnId)`.
- `openAddCardModal` shows a modal form; on submit it creates a `newCard` object with `id`, `title`, `description`, `imageUrl`.
- It pushes the card into `boardsData.get(boardId).cards.get(columnId)` and calls `renderCard(boardId, columnId, newCard)` which creates the `.card` element and attaches:
  - click handler to open `openCardDetailsModal` (unless delete button clicked)
  - delete button handler (calls `deleteCard`)
  - dragstart/dragend to support dragging
- After rendering, the board is persisted via `persistBoardToDB`.

3) Persisting boards
- `persistBoardToDB(boardElement)` takes the `boardElement.querySelector('.board').innerHTML` and saves it in the DB `data` column via `createBoardAPI` (if no persistent id) or `saveBoardAPI`.
- Important: Because the app stores HTML, any runtime-only attributes (like event handlers) are not persisted. When loading, the app must re-attach behavior.

4) Loading boards
- `loadBoardsFromDatabase()` fetches server rows and inserts the stored HTML into `.board`.
- This code then reconstructs a `cardsMap` by scanning `.card` elements and reading their DOM/`data-*` attributes.
- To ensure event handlers are attached, the loader clears the `.column-list` elements and re-renders each card with `renderCard` so the right event listeners and dataset fields are set.

Key implementation detail / gotcha
--------------------------------
- Saved board HTML is inert when re-inserted: elements created from raw HTML will not have JavaScript listeners attached. Always re-create interactive elements using `renderCard` (or re-bind handlers) after injecting HTML. The code has been updated to do exactly that.
- Since `data` is HTML, migrating to JSON would be advantageous for clearer structure and safer persistence.

Tutorials
---------
1) Quick hands-on (5 minutes)
- Start server, open UI, click `Create Board`, add a card in "To Do", drag it to "Doing", edit the board title, then refresh the page — your board should persist.

2) Debugging a non-responsive card (common bug)
- Open DevTools Console. If clicking a card does nothing, check:
  - Are there JavaScript errors in console? Trace them to `script.js` line numbers.
  - Does the card element exist with expected `data-*` attributes? Inspect the element.
  - Confirm `renderCard` was used to create the card; if the card came from raw HTML, re-rendering is required.
- Quick fix: in `loadBoardsFromDatabase()` ensure `renderCard` is called for each card (this repo's loader already does that).

3) Adding a new feature: persist cards as JSON
- Replace storing `board.querySelector('.board').innerHTML` with a JSON structure describing columns and card objects.
- Update backend `modules.data` to expect JSON (or migrate:
  - When reading, detect if `data` is HTML (contains `<`) and convert to JSON on first load.
- Benefits: easier queries, safer content, simpler programmatic updates.

Security & hardening notes
--------------------------
- Currently HTML stored in DB can contain user-provided content (card titles/descriptions). If any user content is inserted into `data` as raw HTML, it can cause XSS. Consider storing structured data (JSON) and escaping/sanitizing on render.
- Validate inputs on backend endpoints (server.js currently checks `title` but not `data` content length/format).

Troubleshooting checklist
-------------------------
- Server not running: check `node server.js` output and `npm install` success.
- DB connection errors: verify `.env` values or default credentials.
- No event handlers after load: ensure `renderCard` runs for loaded cards (search `loadBoardsFromDatabase` in `script.js`).

Next steps / recommended improvements
-----------------------------------
- Migrate to structured JSON for `modules.data`.
- Add unit tests for loader and persistence flows.
- Extract common DOM creation functions and reduce innerHTML insertion to limit XSS risks.
- Add a small integration test to spin up the server and verify endpoints.

Where to look in code
---------------------
- Board creation: `script.js` around the `btn.addEventListener('click'...` block.
- Persisting: `persistBoardToDB` in `script.js`.
- Loading: `loadBoardsFromDatabase` in `script.js`.
- Card rendering: `renderCard` in `script.js`.
- Server API: `server.js`.

If you want, I can:
- Expand this guide into separate files: `QUICKSTART.md`, `DEVELOPER_GUIDE.md`, `API_REFERENCE.md`.
- Create a migration script to convert saved HTML boards into structured JSON.
- Add inline comments to `script.js` explaining key functions in place.

---
File created: DEEP_README.md

Core concepts (how to think about this app)
-----------------------------------------
- Single source of truth at runtime: `boardsData` — a Map keyed by DOM id (e.g. `board-1634234`). This is the structure your app manipulates while the page is open.
- Persistence model: the app serializes the visual board into HTML (the `.board` innerHTML) and stores that HTML in the DB `modules.data` field. On load, the stored HTML is injected back into the DOM.
- Behavior reattachment: because event listeners aren't preserved when you write raw HTML into the DOM, you must re-create interactive nodes (or re-bind handlers) after injection. The code solves this by scanning the injected DOM and using `renderCard()` to create interactive nodes.
- Minimal backend: the server stores and returns persisted blobs (HTML) and metadata (title, xPos, yPos). The backend is intentionally simple — it does not interpret or mutate the board content.

Why this design?
- Fast to implement: storing HTML avoids creating a full JSON schema and mapping between UI and storage.
- Trade-offs: storing HTML is brittle for migrations, searching, and security (XSS). For learn-and-replicate purposes it's instructive because it shows how a minimal persistence layer can be connected to a dynamic DOM app.

Detailed code walkthrough (function-by-function)
-----------------------------------------------
Below are the core functions and the mental model to recreate them.

1) Initialization and bootstrap
- `document.addEventListener('DOMContentLoaded', ...)` (in `script.js`): checks server health via `checkAPIHealth()` and calls `loadBoardsFromDatabase()` if the server is reachable. This is the app's entrypoint. See [script.js](script.js).

2) `loadBoardsFromDatabase()` (script.js)
- Fetches persisted rows via `fetchBoardsFromAPI()`.
- For each row it:
  - Builds a container DOM node (`.board-container`) and fills it with the saved `data` HTML inside the `.board` wrapper.
  - Reconstructs the runtime `cardsMap` by scanning `.column-list` children and reading `data-*` attributes (if present).
  - IMPORTANT: it clears `.column-list` elements and calls `renderCard()` for each card object in the `cardsMap`. This ensures each card element is created programmatically so event listeners (click, delete, dragstart) are attached. See [script.js](script.js) `loadBoardsFromDatabase` and `renderCard`.

3) `renderCard(boardId, columnId, card)` (script.js)
- Responsible for creating a fully interactive `.card` element and appending it to the column list.
- Sets dataset fields (`data-board-id`, `data-column-id`, `data-card-id`, `data-card-desc`, `data-card-image`) so drag/drop and modal code can read the card's metadata.
- Attaches the `click` handler that calls `openCardDetailsModal` and `dragstart`/`dragend` handlers used by the drag/drop flow.
- When re-creating a board from DB, always use `renderCard` instead of inserting raw markup. See [script.js](script.js) `renderCard`.

4) `attachAddCardListeners(boardId)` + `openAddCardModal(boardId, columnId)`
- `attachAddCardListeners` finds the `.add-card-btn` elements for a given board and binds click listeners that call `openAddCardModal`.
- The modal returns a new card object on submit. The app adds that card to `boardsData.get(boardId).cards.get(columnId)` and calls `renderCard` to insert it into the DOM, then persists the board.

5) `persistBoardToDB(boardElement)`
- Serializes the live board DOM to HTML using `boardElement.querySelector('.board').innerHTML` and makes a `POST` (create) if the board has no `persistentId`, otherwise `PUT` (update). See [script.js](script.js) `persistBoardToDB` and the API helpers at the top of the file.
- Note: because only HTML is stored, any runtime-only JS state (like Map references or event listeners) must be reconstructed when loading.

6) Drag & drop lifecycle
- `handleCardDragStart(e)` marks `draggedCard = this` and stores minimal HTML in the dataTransfer.
- Column lists have `dragover`, `dragleave`, and `drop` handlers (added by `attachColumnDropListeners(boardId)`). On `drop`, the code:
  - Validates source/destination
  - Removes card from source column in `boardsData`
  - Inserts card object into destination column in `boardsData`
  - Removes the dragged DOM element and calls `renderCard` in the destination to create a fresh interactive node
  - Persists the destination board via `persistBoardToDB`

7) Board movement (`makeElementMovable(elmnt)`)
- Attaches `onmousedown` on the board handle to capture pointer movement and set the board's `top`/`left` as the mouse moves.
- On mouseup, it calls `persistBoardToDB(elmnt)` to update the stored position.

Replication guide — build this yourself (step-by-step)
----------------------------------------------------
If you want to recreate the app from scratch, follow these steps and implement the corresponding function names listed.

Step 1 — Minimal server
- Create `server.js` with Express and endpoints: `GET /api/boards`, `POST /api/boards`, `PUT /api/boards/:id`, `DELETE /api/boards/:id`, and `GET /api/health`. Use the `mysql2/promise` pool pattern. See [server.js](server.js).

Step 2 — Database
- Create `modules` table like `noted.sql`. Keep `data` as LONGTEXT initially.

Step 3 — Frontend skeleton
- Create `index.html` with a container element (`#sheet`) and a `#kanbanmaker` button.
- Load `script.js` and `style.css`.

Step 4 — Runtime store
- Add `const boardsData = new Map()` to `script.js`. Design each board entry to be `{ cards: Map(columnId => [cards]), title: string, persistentId?: number }`.

Step 5 — Create board DOM + persist
- Implement the `btn.addEventListener('click', ...)` logic to create `.board-container` and initialize `boardsData` entry. Call `attachAddCardListeners`, `attachBoardControlsListeners`, `makeElementMovable`, then create the DB row via `persistBoardToDB`.

Step 6 — Card lifecycle
- Implement `attachAddCardListeners` and `openAddCardModal` which create new card objects and call `renderCard`. Implement `renderCard` to attach the required dataset fields and handlers.

Step 7 — Load on start
- Implement `loadBoardsFromDatabase` to fetch from the API, insert HTML, reconstruct `boardsData`, clear column-lists, and call `renderCard` for each card so all behavior is attached.

Step 8 — Polish and edge cases
- Add `deleteCard`, `deleteBoardFromUI`, and graceful error handling across API calls.
- Add checks to avoid creating duplicate DOM nodes if the same board id already exists on the page.

Exercises for learning
----------------------
- Exercise 1: Replace HTML persistence with JSON. Convert `persistBoardToDB` to build a JSON structure, update server endpoints to accept/return JSON, and migrate existing HTML rows by parsing them on load.
- Exercise 2: Implement optimistic UI updates: update `boardsData` and DOM first, then make the API call; on failure, roll back and display an error.
- Exercise 3: Add per-card timestamps and a small search UI that scans `boardsData` (this demonstrates the advantage of JSON over HTML storage).

Further reading and study tips
----------------------------
- Practice by implementing a minimal version that only supports creating a board and adding cards. Then add drag/drop in a second pass.
- Read about event delegation: instead of binding listeners to many nodes, attach a listener at a parent and route events. This reduces re-binding when recreating nodes.
- Study XSS and DOMPurify when you need to accept user HTML; prefer storing data and escaping on render.

Wrap-up
-------
I expanded the deep readme with conceptual explanations, a code walkthrough you can follow in `script.js`, and a replication guide with exercises. If you'd like, I can now:
- Split this content into separate files for Quickstart, Developer Guide, and API Reference.
- Add inline comments in `script.js` near each function so you can learn from code + explanation side-by-side.
- Start implementing an exercise (e.g., JSON persistence migration).

Which of those do you want next?

Simple walkthrough — explained like you're five
------------------------------------------------
This section explains the app like a tiny helper would, using very small steps and clear mapping to the code so you can copy it yourself.

Big picture (one sentence)
- The page shows boxes (boards) with lists of little notes (cards). The page remembers boards by talking to a small server that saves and gives back the board HTML.

Step 0 — Things you need
- A computer with Node.js and MySQL running.
- Files to look at: `server.js` (server), `script.js` (browser code), `noted.sql` (database table), `index.html` (page).

Step 1 — Start the app (what happens first)
- When the page opens the browser runs the code in `script.js` and listens for the event called `DOMContentLoaded`.
  - In code: see `document.addEventListener('DOMContentLoaded', ...)` in [script.js](script.js).
  - The code asks the server, "Are you alive?" (it calls `checkAPIHealth()` which calls `GET /api/health`). The server answers if the database is available. The server code is in [server.js](server.js).

Step 2 — Load saved boards (how saved boards appear)
- If the server answered yes, the browser asks the server for all boards (`fetchBoardsFromAPI()` → `GET /api/boards`).
  - The server looks in the `modules` table and returns rows. See `GET /api/boards` in [server.js](server.js).
  - The browser gets a list of saved boards. The loader function is `loadBoardsFromDatabase()` in [script.js](script.js).
  - For each saved board the code makes a new box on the page (`.board-container`) and puts the saved HTML inside the `.board` area.

Step 3 — Make loaded boards work (very important)
- Raw saved HTML has no buttons that work because JavaScript cannot hang onto event listeners when HTML is saved and reinserted.
- So after the saved HTML is put in place, the code:
  1. Builds a simple memory picture of the cards (a Map called `cardsMap`).
  2. Clears the column content (`listEl.innerHTML = ''`).
  3. Re-creates each card by calling `renderCard(boardId, columnId, card)` which builds the card element with the right buttons and event listeners.
  - See `loadBoardsFromDatabase()` and `renderCard()` in [script.js](script.js).

Step 4 — Adding a new card (how the + button works)
- When you click a plus button, the code that runs is in `attachAddCardListeners(boardId)` which finds the `+ Add Card` buttons and attaches a click handler.
  - That click handler opens a small form (`openAddCardModal`) where you type a title and optional description.
  - On submit the code makes a card object `{ id, title, description, imageUrl }`, pushes it into the `boardsData` Map for this board, and calls `renderCard()` to show it.
  - After that the board is saved on the server via `persistBoardToDB(boardElement)` which sends the board HTML to the server.
  - Look at `attachAddCardListeners`, `openAddCardModal`, and `persistBoardToDB` in [script.js](script.js).

Step 5 — How a card is built and why we re-create it
- `renderCard(boardId, columnId, card)` does the real work:
  - It creates a `.card` element, sets `cardElement.id`, sets `cardElement.dataset.*` values so the code knows which board and column this card belongs to.
  - It adds a delete button and a click handler that opens the card details modal.
  - It adds `dragstart` and `dragend` handlers so you can move the card.
  - Because we always use `renderCard` to create cards, every card will have working buttons and dragging.
  - See `renderCard` in [script.js](script.js).

Step 6 — Drag and drop (moving cards inside a board)
- When you start dragging a card the browser runs `handleCardDragStart` which remembers "this card is being dragged".
  - Each column listens for `dragover` and `drop` (set up by `attachColumnDropListeners(boardId)`).
  - On `drop`, `handleCardDrop` removes the card from the source column in the `boardsData` Map, re-creates it in the destination by calling `renderCard`, and saves the board.
  - The important thing: the code changes both the page (DOM) and the memory map (`boardsData`) so the saved HTML will match what you see.
  - See `handleCardDragStart`, `attachColumnDropListeners`, and `handleCardDrop` in [script.js](script.js).

Step 7 — Deleting a card or board
- Delete card: the delete button calls `deleteCard(boardId, columnId, cardId)`. That removes the card from `boardsData`, removes it from the page, and saves the board.
- Delete board: clicking the board trash calls `deleteBoardFromUI(boardDomId)` which removes the DOM and calls the server to remove the row.
  - See `deleteCard` and `deleteBoardFromUI` in [script.js](script.js).

Step 8 — Moving a whole board (drag the board)
- Boards can be moved by grabbing the board handle. `makeElementMovable(elmnt)` listens for mouse movement and sets `elmnt.style.top` and `elmnt.style.left` as you move.
  - On mouse release it calls `persistBoardToDB` to save the new position.
  - See `makeElementMovable` in [script.js](script.js).

Why we save HTML and what to watch out for
- We save the HTML because it is quick: the server just stores a blob of text. But that text does not include the event listeners that make buttons work.
- That's why the loader re-creates cards with `renderCard` and rewires any `data-board` attributes for add buttons so `attachAddCardListeners` can find them.

If you want to copy this yourself (mini recipe)
1. Make a simple Node server with these endpoints: `GET /api/boards`, `POST /api/boards`, `PUT /api/boards/:id`, `DELETE /api/boards/:id`, `GET /api/health`. See [server.js](server.js).
2. Make a web page with a container `#sheet` and a `#kanbanmaker` button.
3. In the page JavaScript make a `boardsData = new Map()` and `persistBoardToDB` that stores `board.querySelector('.board').innerHTML`.
4. Implement `renderCard` to create card nodes and attach listeners.
5. Implement `loadBoardsFromDatabase` to fetch rows, insert HTML, then clear column lists and call `renderCard` for each card.

Where to look in the code (quick links)
- Entry & load: `document.addEventListener('DOMContentLoaded', ...)` and `loadBoardsFromDatabase()` — [script.js](script.js)
- Create / save: `persistBoardToDB()` + `createBoardAPI()` / `saveBoardAPI()` — [script.js](script.js)
- Card UI: `renderCard()`, `openAddCardModal()`, `attachAddCardListeners()` — [script.js](script.js)
- Drag/drop: `handleCardDragStart()`, `handleCardDrop()`, `attachColumnDropListeners()` — [script.js](script.js)
- Server endpoints: [server.js](server.js)

Finished — what I changed here
- I added this very simple, step-by-step walkthrough so you can read a small sentence and then open the exact function in the code to see how it works.

Next: I can add inline comments in `script.js` next to each function so the code and explanation sit side-by-side. Want me to do that now?
