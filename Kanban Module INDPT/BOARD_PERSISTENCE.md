Board Persistence

What this implements
- Boards are now saved to the MySQL `modules` table as the board's inner HTML and position.
- New boards created in the UI create a DB record (POST) and subsequent saves update that record (PUT).
- On page load the app fetches saved modules and recreates DOM from the stored innerHTML so boards appear exactly as they were when saved.

How it works (high level)
- Creating a board: UI creates a DOM board container and calls `persistBoardToDB()`.
  - If the board has no DB id yet, the client calls `POST /api/boards` to create a module row.
  - The returned DB id is stored in `boardsData[domId].persistentId`.
  - The board's `.board` innerHTML, x/y position and title are then saved.
- Saving a board: `persistBoardToDB()` sends the stored innerHTML + metadata with `PUT /api/boards/:id` using the numeric DB id.
- Loading boards on start: `loadBoardsFromDatabase()` fetches modules, builds DOM nodes with id `board-<dbId>`, injects the saved innerHTML, reconstructs a minimal in-memory `boardsData.cards` map by reading `.card` elements inside columns, and attaches listeners.

How to test locally
1. Ensure MySQL and the `Noted` database are running and `modules` table exists (see `noted.sql`).
2. Start the server:

```bash
node server.js
```

3. Open the web page (where `index.html`/`script.js` are served). Create a new board, add cards, then refresh the page — the board should reload from the DB with position and columns preserved.

Limitations & notes
- The code persists the board's HTML snapshot. Card objects (description, imageUrl) are reconstructed from DOM only where visible: title and id. If you need to persist full card metadata (description, imageUrl, etc.), store those values as `data-` attributes on the card element (e.g. `data-card-desc`, `data-card-image`) before saving, or change the API to accept structured JSON for cards.
 - The code persists the board's HTML snapshot. Card objects (description, imageUrl) are now persisted when rendered as `data-card-desc` and `data-card-image` attributes so full card metadata will be restored on load. If you need a more robust representation, consider changing the API to accept structured JSON for cards.
- DOM element ids are set to `board-<dbId>` to avoid collisions and to keep DB id separate from client DOM ids.
- If a board fails to be created on the server the client will log a warning and retry on the next save.

Files changed
- `script.js`: create/save/load logic updated.
 - `script.js`: create/save/load logic updated. Added `data-` attributes for card metadata and a board delete control that removes the row from the DB.

If you want, I can also:
- Add server endpoints to store board JSON (structured cards) instead of HTML snapshots (recommended for complex card data).

Tell me if you want me to implement the server-side JSON storage and migrate existing modules to that format.