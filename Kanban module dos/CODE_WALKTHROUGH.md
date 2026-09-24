# Code Walkthrough - Line by Line Explanation

## Table of Contents
1. [HTML Walkthrough](#html-walkthrough)
2. [CSS Walkthrough](#css-walkthrough)
3. [JavaScript Walkthrough](#javascript-walkthrough)

---

## HTML Walkthrough

### Complete HTML File

```html
<!DOCTYPE html>
```
**What it does:** Declares this is an HTML5 document
**Why:** Browser knows how to interpret the file

---

```html
<html lang="hu">
```
**What it does:** Root element, `lang="hu"` means Hungarian language
**Why:** Helps with accessibility and browser language detection
**Note:** Change "hu" to your language code (e.g., "en" for English)

---

```html
<head>
```
**What it does:** Container for metadata (not visible on page)

---

```html
<meta charset="UTF-8">
```
**What it does:** Sets character encoding to UTF-8
**Why:** Supports all international characters
**Example:** Without this, special characters would show as ??? 

---

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```
**What it does:** Makes page mobile-responsive
**Why:** Page scales correctly on phones/tablets
**Breakdown:**
- `width=device-width` - Use device's actual width
- `initial-scale=1.0` - Start at 100% zoom

---

```html
<title>Kanban Module</title>
```
**What it does:** Sets the browser tab title
**Where it appears:** Browser tab, history, bookmarks

---

```html
<link rel="stylesheet" href="style.css">
```
**What it does:** Links the CSS file
**Order matters:** MUST come before `<script>` tag
**Why:** Styles load before JavaScript runs

---

```html
<div id="sidebar">
    <button id="kanbanmaker">+ New Board</button>
</div>
```

| Element | ID | Purpose |
|---------|----|---------| 
| `<div>` | sidebar | Left fixed sidebar |
| `<button>` | kanbanmaker | Triggers board creation |

**CSS makes it fixed (stays while scrolling)**
**JavaScript listens for clicks on this button**

---

```html
<div id="sheet"></div>
```
**What it does:** Empty container for boards
**JavaScript appends:** Boards are created and inserted here
**Why empty:** Boards are created dynamically

---

```html
<script src="script.js"></script>
```
**What it does:** Loads JavaScript file
**Placement:** At END of body (good practice)
**Why at end:** HTML loads first, then JavaScript runs
**Result:** By the time script.js runs, all HTML elements exist

---

## CSS Walkthrough

### Layout Section

```css
#sidebar {
    width: 100px;
    height: 800px;
    background-color: #292626;
    position: fixed;
}
```

| Property | Value | Effect |
|----------|-------|--------|
| `width: 100px` | Fixed width | Sidebar never changes width |
| `height: 800px` | Fixed height | Sidebar has set height (can be taller) |
| `background-color: #292626` | Dark gray | Visual color |
| `position: fixed` | Fixed positioning | Stays in place while scrolling |

**Result:** Dark sidebar that never scrolls away

---

```css
#kanbanmaker {
    width: 60px;
    height: 60px;
    background-color: rgb(90, 90, 89);
    margin: 0 auto;
    margin-top: 20px;
}
```

| Property | Purpose |
|----------|---------|
| `width/height: 60px` | Makes square button |
| `background-color` | Button color |
| `margin: 0 auto` | Centers horizontally (0 top/bottom, auto left/right) |
| `margin-top: 20px` | Adds space from top of sidebar |

---

### Board Styling

```css
.board-container {
    position: absolute;
    z-index: 1;
    background-color: #f1f1f1;
    border: 1px solid #d3d3d3;
    text-align: center;
    min-width: 360px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}
```

| Property | Effect |
|----------|--------|
| `position: absolute` | Can be positioned anywhere, allows dragging |
| `z-index: 1` | Default stacking order (changed to 5 when dragging) |
| `background-color` | White-ish color |
| `border` | Gray outline |
| `min-width: 360px` | Minimum width (can grow larger) |
| `box-shadow` | Adds depth/shadow effect |

**Key insight:** `position: absolute` is why boards can be dragged freely

---

```css
.boardHandle {
    padding: 10px;
    cursor: move;
    z-index: 10;
    background-color: #2196F3;
    color: #fff;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
```

| Property | Effect |
|----------|--------|
| `cursor: move` | Shows crosshair cursor when hovering |
| `background-color: #2196F3` | Blue header color |
| `display: flex` | Enable flexible box layout |
| `justify-content: space-between` | Space title and button apart |
| `align-items: center` | Vertically center items |

**Result:** Blue header with title on left, button on right

---

### Card Styling

```css
.card {
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    user-select: none;
}
```

| Property | Effect |
|----------|--------|
| `border-radius: 4px` | Slightly rounded corners |
| `padding: 10px` | Space inside card |
| `margin-bottom: 10px` | Space below card |
| `cursor: pointer` | Shows clickable cursor |
| `transition: all 0.3s ease` | Smooth animation for changes |
| `user-select: none` | Can't select text while dragging |

---

```css
.card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    transform: translateY(-2px);
}
```

**What happens:** When you hover over a card:
- Shadow gets darker/bigger (more depth)
- Card moves up 2 pixels (visual lift)
- Happens smoothly over 0.3 seconds (from `transition`)

---

### Modal Styling

```css
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);
    animation: fadeIn 0.3s;
}
```

| Property | Effect |
|----------|--------|
| `display: none` | Hidden by default |
| `position: fixed` | Covers entire screen |
| `z-index: 1000` | Above everything else |
| `background-color: rgba(0,0,0,0.4)` | Semi-transparent black overlay |
| `animation: fadeIn 0.3s` | Fades in smoothly |

**rgba() breakdown:**
- `r` = 0 (red, 0-255)
- `g` = 0 (green, 0-255)
- `b` = 0 (blue, 0-255)
- `a` = 0.4 (alpha/transparency, 0-1)
- Result: 40% opaque black

---

### Animations

```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

**What it does:**
- Starts: `opacity: 0` (invisible)
- Ends: `opacity: 1` (fully visible)
- Duration: 0.3s (set in `.modal`)
- Result: Smooth fade-in effect

---

```css
@keyframes slideIn {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
```

**What it does:**
- Starts 50px above (invisible): `translateY(-50px)` + `opacity: 0`
- Ends at normal position (visible): `translateY(0)` + `opacity: 1`
- Result: Modal slides down while fading in

**`translateY(-50px)` means:** Move up 50 pixels (negative = up)

---

## JavaScript Walkthrough

### Part 1: Global Setup

```javascript
const btn = document.getElementById('kanbanmaker');
const container = document.getElementById('sheet');
```

**What it does:**
- `btn` = reference to "+ New Board" button
- `container` = reference to board container div
- Now we can listen for clicks and add boards here

**Why `const`?** Can't reassign (good practice for references that shouldn't change)

---

```javascript
const boardsData = new Map();
let draggedCard = null;
```

**boardsData Map:**
```
boardsData = Map {
  'board-123' → {title: 'Sprint 1', cards: Map {...}}
  'board-456' → {title: 'Sprint 2', cards: Map {...}}
}
```

**draggedCard variable:**
- Starts as `null` (no card being dragged)
- Set to card element when drag starts
- Used in drop handler to know which card moved

---

### Part 2: Button Click Listener

```javascript
btn.addEventListener('click', () => {
```

**What it does:** 
- Listens for clicks on the "+ New Board" button
- Arrow function `() => { }` runs when clicked

---

```javascript
    const boardId = 'board-' + Date.now();
```

**How it works:**
1. `Date.now()` returns: `1711353600000` (milliseconds since 1970)
2. String concatenation: `'board-' + 1711353600000`
3. Result: `'board-1711353600000'`

**Why unique?** Each board gets a different ID because current time is always changing

---

```javascript
    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'board-container';
    boardWrapper.id = boardId;
```

**What it does:**
1. Creates empty `<div>` element in memory
2. Sets CSS class: `class="board-container"`
3. Sets ID: `id="board-1711353600000"`

**Still invisible:** Just created, not added to page yet

---

```javascript
    boardWrapper.style.top = (100 + (document.querySelectorAll('.board-container').length * 20)) + "px";
    boardWrapper.style.left = (100 + (document.querySelectorAll('.board-container').length * 20)) + "px";
```

**Calculation:**
```
new board position = 100px + (number of existing boards × 20px)

Example:
- 1st board: 100 + (0 × 20) = 100px
- 2nd board: 100 + (1 × 20) = 120px
- 3rd board: 100 + (2 × 20) = 140px
```

**Result:** Each new board appears 20px further right and down (staggered)

---

```javascript
    boardWrapper.innerHTML = `
        <div class="boardHandle">
            <span class="board-title-text">⠿ Drag Board Here</span>
            <button class="board-title-edit-btn">✎</button>
        </div>
        ...
    `;
```

**What it does:** Sets entire HTML structure at once
**Template literal:** Backticks allow multi-line strings with `${variables}`

**Structure:**
- `boardHandle` = Blue header bar
- `board-title-text` = Title text (⠿ symbol)
- `board-title-edit-btn` = Edit button (✎)
- Then 3 columns (To Do, Doing, Done)

---

```javascript
    container.appendChild(boardWrapper);
```

**What it does:** 
- Takes board created in memory
- Adds it to the `#sheet` div
- **NOW** it becomes visible on page

---

```javascript
    boardsData.set(boardId, {
        cards: new Map([
            ['todo', []],
            ['doing', []],
            ['done', []]
        ]),
        title: 'Drag Board Here'
    });
```

**What it does:** Stores board data structure

**Maps within Maps:**
```
boardsData.set('board-123', {
    cards: Map {
        'todo' → []      (empty array for to-do cards)
        'doing' → []     (empty array for doing cards)
        'done' → []      (empty array for done cards)
    },
    title: 'Drag Board Here'
})
```

**Why this structure?** Easy to access cards by column:
```javascript
boardsData.get('board-123').cards.get('todo')  // Returns array
```

---

```javascript
    attachAddCardListeners(boardId);
    attachBoardTitleEditListener(boardId);
    makeElementMovable(boardWrapper);
```

**What each does:**
1. Setup click handlers for "+ Add Card" buttons
2. Setup edit listener for board title
3. Make board draggable

**Order matters:** Setup listeners AFTER creating HTML

---

### Part 3: Board Title Editing

```javascript
function attachBoardTitleEditListener(boardId) {
    const boardElement = document.getElementById(boardId);
    const editBtn = boardElement.querySelector('.board-title-edit-btn');
    const titleText = boardElement.querySelector('.board-title-text');
    
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openBoardTitleEditModal(boardId, titleText);
    });
}
```

**Breaking it down:**

1. **Get references:**
   ```javascript
   const boardElement = document.getElementById(boardId);
   ```
   Find the board by its ID

2. **Find the edit button:**
   ```javascript
   const editBtn = boardElement.querySelector('.board-title-edit-btn');
   ```
   Uses `querySelector` (CSS selector) to find first matching element

3. **Add click listener:**
   ```javascript
   editBtn.addEventListener('click', (e) => {
       e.stopPropagation();  // Don't trigger parent's drag handler
       openBoardTitleEditModal(boardId, titleText);
   });
   ```

**Why `stopPropagation()`?**
```
Without it:
  Click ✎ button
    ↓
  Button click handler runs
    ↓
  Event "bubbles up" to parent (boardHandle)
    ↓
  Parent's drag handler ALSO runs ❌ (unwanted)

With it:
  Click ✎ button
    ↓
  Button click handler runs
    ↓
  Event STOPS (doesn't bubble up) ✅
    ↓
  Drag handler doesn't run
```

---

```javascript
function openBoardTitleEditModal(boardId, titleElement) {
    const currentTitle = boardsData.get(boardId).title;
```

**Gets current title:** Looks up board in `boardsData` and retrieves title

---

```javascript
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal';
    modalOverlay.style.display = 'block';

    modalOverlay.innerHTML = `
        <div class="form-modal-content">
            <h2>Edit Board Title</h2>
            <form id="editBoardTitleForm">
                <div class="form-group">
                    <label for="boardTitleInput">Board Title:</label>
                    <input type="text" id="boardTitleInput" value="${currentTitle}" required>
                </div>
                ...
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);
```

**What it does:**
1. Creates modal overlay div
2. Sets class and style
3. Fills with HTML form (using template literal with `${currentTitle}`)
4. Adds to page

**Template literal variable:** `value="${currentTitle}"` inserts current title into input field

---

```javascript
    const form = modalOverlay.querySelector('#editBoardTitleForm');
    const input = modalOverlay.querySelector('#boardTitleInput');
    
    input.focus();
    input.select();
```

**User experience enhancements:**
- `focus()` = Click the input automatically
- `select()` = Highlight all text

**Result:** User can immediately start typing without clicking

---

```javascript
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTitle = input.value.trim();
        
        if (newTitle) {
            boardsData.get(boardId).title = newTitle;
            titleElement.textContent = '⠿ ' + newTitle;
            document.body.removeChild(modalOverlay);
        }
    });
```

**On form submit:**

1. **Stop default:** `e.preventDefault()` = Don't actually submit to server

2. **Get new title:** `input.value.trim()`
   - `.value` = What user typed
   - `.trim()` = Remove spaces from start/end

3. **Update data:** `boardsData.get(boardId).title = newTitle`
   - Finds board in memory
   - Changes its title

4. **Update DOM:** `titleElement.textContent = '⠿ ' + newTitle`
   - Changes what user sees on screen
   - Adds ⠿ symbol back

5. **Close modal:** `document.body.removeChild(modalOverlay)`
   - Removes modal from page

---

### Part 4: Adding Cards

```javascript
function attachAddCardListeners(boardId) {
    const buttons = document.querySelectorAll(`[data-board="${boardId}"].add-card-btn`);
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const columnId = btn.getAttribute('data-column');
            openAddCardModal(boardId, columnId);
        });
    });
}
```

**Selector breakdown:**
```css
[data-board="${boardId}"].add-card-btn
```
Means: Find all elements that have:
- `data-board="board-123"` attribute
- `add-card-btn` class

**For each button:**
- Get which column it's in: `btn.getAttribute('data-column')`
- Open add card form: `openAddCardModal(boardId, columnId)`

---

```javascript
function openAddCardModal(boardId, columnId) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal';
    modalOverlay.style.display = 'block';

    modalOverlay.innerHTML = `
        <div class="form-modal-content">
            <h2>Add New Card</h2>
            <form id="addCardForm">
                <div class="form-group">
                    <label for="cardTitle">Card Title:</label>
                    <input type="text" id="cardTitle" placeholder="Enter card title" required>
                </div>
                <div class="form-group">
                    <label for="cardDescription">Description:</label>
                    <textarea id="cardDescription" placeholder="Enter card description"></textarea>
                </div>
                <div class="form-group">
                    <label for="cardImage">Image URL:</label>
                    <input type="url" id="cardImage" placeholder="https://example.com/image.jpg">
                </div>
                ...
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);
```

**Similar to edit modal but:** Has fields for title, description, and image URL

---

```javascript
    const form = modalOverlay.querySelector('#addCardForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('cardTitle').value;
        const description = document.getElementById('cardDescription').value;
        const imageUrl = document.getElementById('cardImage').value;

        const newCard = {
            id: 'card-' + Date.now(),
            title: title,
            description: description,
            imageUrl: imageUrl
        };

        boardsData.get(boardId).cards.get(columnId).push(newCard);
        renderCard(boardId, columnId, newCard);
        document.body.removeChild(modalOverlay);
    });
```

**On form submit:**

1. **Get form values:**
   ```javascript
   const title = document.getElementById('cardTitle').value;
   ```

2. **Create card object:**
   ```javascript
   const newCard = {
       id: 'card-' + Date.now(),
       title: title,
       description: description,
       imageUrl: imageUrl
   };
   ```
   Unique ID based on current time

3. **Store in data:**
   ```javascript
   boardsData.get(boardId).cards.get(columnId).push(newCard);
   ```
   Find the column, add card to its array

4. **Render visually:**
   ```javascript
   renderCard(boardId, columnId, newCard);
   ```
   Create DOM element and add to page

5. **Close modal:**
   ```javascript
   document.body.removeChild(modalOverlay);
   ```

---

### Part 5: Rendering Cards

```javascript
function renderCard(boardId, columnId, card) {
    const columnList = document.querySelector(`#${boardId} [data-column="${columnId}"].column-list`);
    
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.id = card.id;
    cardElement.draggable = true;
    cardElement.innerHTML = `
        <button class="card-delete-btn">×</button>
        <div class="card-title">${card.title}</div>
    `;

    cardElement.dataset.boardId = boardId;
    cardElement.dataset.columnId = columnId;
    cardElement.dataset.cardId = card.id;
```

**Breaking it down:**

1. **Find column:** 
   ```javascript
   const columnList = document.querySelector(`#${boardId} [data-column="${columnId}"].column-list`);
   ```
   Uses board ID and column ID to find exact column

2. **Create card element:**
   ```javascript
   const cardElement = document.createElement('div');
   cardElement.className = 'card';
   cardElement.id = card.id;
   cardElement.draggable = true;
   ```
   `draggable = true` enables drag-drop

3. **Store metadata on element:**
   ```javascript
   cardElement.dataset.boardId = boardId;
   cardElement.dataset.columnId = columnId;
   cardElement.dataset.cardId = card.id;
   ```
   These become `data-boardId`, `data-columnId`, `data-cardId` attributes
   Used later to know where card came from

---

```javascript
    cardElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-delete-btn')) return;
        openCardDetailsModal(boardId, columnId, card);
    });

    const deleteBtn = cardElement.querySelector('.card-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCard(boardId, columnId, card.id);
    });
```

**Click handlers:**

1. **Card click:** Opens details modal
   - But: If clicking delete button, returns early (don't open details)

2. **Delete button click:**
   - `stopPropagation()` prevents card click handler
   - Calls `deleteCard()` function

---

```javascript
    cardElement.addEventListener('dragstart', handleCardDragStart);
    cardElement.addEventListener('dragend', handleCardDragEnd);

    columnList.appendChild(cardElement);
}
```

**Drag listeners:** Setup handlers for moving card

**Add to page:** `appendChild()` adds card to column

---

### Part 6: Drag and Drop

```javascript
let draggedCard = null;

function handleCardDragStart(e) {
    draggedCard = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}
```

**What happens when dragging starts:**

1. **Remember the card:** `draggedCard = this`
   - `this` refers to the card element being dragged
   - Stored globally so drop handler can find it

2. **Visual feedback:** `this.style.opacity = '0.5'`
   - Makes card semi-transparent
   - User sees they're dragging

3. **Tell browser:** `e.dataTransfer.effectAllowed = 'move'`
   - Type of drag operation

---

```javascript
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.style.backgroundColor = '#d0e8f2';
}
```

**While dragging over a column:**

1. **CRITICAL:** `e.preventDefault()`
   - Without this, drop won't work
   - Must call in both dragover AND drop

2. **Visual feedback:** Column background turns light blue

---

```javascript
function handleCardDrop(e) {
    e.preventDefault();
    this.style.backgroundColor = '#e8e8e8';

    if (!draggedCard) return;

    const fromBoardId = draggedCard.dataset.boardId;
    const fromColumnId = draggedCard.dataset.columnId;
    const cardId = draggedCard.dataset.cardId;
    
    const toBoardId = this.closest('.board-container').id;
    const toColumnId = this.getAttribute('data-column');

    if (fromBoardId === toBoardId && fromColumnId === toColumnId) {
        draggedCard = null;
        return;
    }

    const cardData = boardsData.get(fromBoardId).cards.get(fromColumnId);
    const cardIndex = cardData.findIndex(c => c.id === cardId);
    
    if (cardIndex > -1) {
        const card = cardData.splice(cardIndex, 1)[0];
        boardsData.get(toBoardId).cards.get(toColumnId).push(card);
        
        draggedCard.remove();
        renderCard(toBoardId, toColumnId, card);
        
        attachColumnDropListeners(toBoardId);
    }

    draggedCard = null;
}
```

**When card is dropped:**

1. **Get source info:**
   ```javascript
   const fromBoardId = draggedCard.dataset.boardId;
   const fromColumnId = draggedCard.dataset.columnId;
   const cardId = draggedCard.dataset.cardId;
   ```
   Uses data attributes stored on card

2. **Get destination info:**
   ```javascript
   const toBoardId = this.closest('.board-container').id;
   const toColumnId = this.getAttribute('data-column');
   ```
   `closest()` finds parent board container

3. **Prevent same-column drops:**
   ```javascript
   if (fromBoardId === toBoardId && fromColumnId === toColumnId) {
       return;  // Same location, do nothing
   }
   ```
    **Prevent different board drops:**
    if (fromBoardId !== toBoardId) {
        draggedCard = null;
        return;
    }


4. **Update data structure:**
   ```javascript
   const cardData = boardsData.get(fromBoardId).cards.get(fromColumnId);
   const cardIndex = cardData.findIndex(c => c.id === cardId);
   
   const card = cardData.splice(cardIndex, 1)[0];  // Remove from source
   boardsData.get(toBoardId).cards.get(toColumnId).push(card);  // Add to destination
   ```

5. **Update DOM:**
   ```javascript
   draggedCard.remove();  // Remove visual element
   renderCard(toBoardId, toColumnId, card);  // Render in new location
   ```

6. **Re-setup drop listeners:**
   ```javascript
   attachColumnDropListeners(toBoardId);
   ```

---

### Part 7: Board Dragging

```javascript
function makeElementMovable(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const handle = elmnt.querySelector('.boardHandle');

    if (handle) {
        handle.onmousedown = dragMouseDown;
    }
```

**Setup:**
- `pos1, pos2` = How far mouse moved
- `pos3, pos4` = Previous mouse position
- `handle` = The element to drag from

---

```javascript
    function dragMouseDown(e) {
        e.preventDefault();

        const allBoards = document.querySelectorAll('.board-container');
        allBoards.forEach(board => {
            board.style.zIndex = "1";
        });
        elmnt.style.zIndex = "5";

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
```

**When mouse down on handle:**

1. **Z-index management:**
   ```javascript
   allBoards.forEach(board => {
       board.style.zIndex = "1";
   });
   elmnt.style.zIndex = "5";
   ```
   Brings this board to top

2. **Save starting position:**
   ```javascript
   pos3 = e.clientX;
   pos4 = e.clientY;
   ```

3. **Start listening to mouse moves:**
   ```javascript
   document.onmousemove = elementDrag;
   document.onmouseup = closeDragElement;
   ```

---

```javascript
    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
```

**While mouse is moving:**

1. **Calculate movement:**
   ```javascript
   pos1 = pos3 - e.clientX;  // Horizontal movement
   pos2 = pos4 - e.clientY;  // Vertical movement
   ```

2. **Update current position:**
   ```javascript
   pos3 = e.clientX;  // For next calculation
   pos4 = e.clientY;
   ```

3. **Update board position:**
   ```javascript
   elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
   elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
   ```
   - `offsetTop` = Current top position
   - Subtract movement to calculate new position

---

```javascript
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
```

**When mouse is released:**
- Stop listening to movement
- Board stays in final position

---

## Quick Reference: Event Listeners

| Event | Element | Function | When Triggered |
|-------|---------|----------|-----------------|
| `click` | "+ New Board" button | Create board | User clicks |
| `click` | Edit button (✎) | Open title edit | User clicks |
| `submit` | Add card form | Create card | User submits form |
| `click` | Card | Open details | User clicks card |
| `click` | Delete button | Delete card | User clicks × |
| `dragstart` | Card | `handleCardDragStart` | User starts dragging |
| `dragover` | Column | `handleDragOver` | Card dragged over |
| `drop` | Column | `handleCardDrop` | Card released over |
| `mousedown` | Board handle | Start board drag | User clicks handle |
| `mousemove` | Document | Update board position | While dragging |
| `mouseup` | Document | End board drag | User releases mouse |

---

## Summary of Key Patterns

### 1. Store + Display Pattern
```javascript
// Step 1: Update data
boardsData.get(boardId).cards.get(columnId).push(card);

// Step 2: Update display
renderCard(boardId, columnId, card);

// Result: Data and DOM are in sync ✅
```

### 2. Event Delegation Pattern
```javascript
// Instead of adding 100 listeners to 100 cards
buttons.forEach(btn => btn.addEventListener('click', ...))

// Listen to one parent and check event.target
// (not used extensively in this app, but good to know)
```

### 3. Closure Pattern
```javascript
function attachListeners(boardId) {
    button.addEventListener('click', () => {
        // This function "remembers" boardId
        // Even after attachListeners finishes
        openModal(boardId);
    });
}
```

### 4. Prevent Default Pattern
```javascript
// Form submit normally reloads page
form.addEventListener('submit', (e) => {
    e.preventDefault();  // Stop default behavior
    // Handle ourselves
});
```

---

**This completes the line-by-line walkthrough of your Kanban application!**

Each pattern and function serves a specific purpose in creating an interactive, responsive application.
