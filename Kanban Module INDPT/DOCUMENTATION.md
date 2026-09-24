# Kanban Board Application - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Features](#features)
4. [Architecture & Data Flow](#architecture--data-flow)
5. [File Explanations](#file-explanations)
6. [JavaScript Functions](#javascript-functions)
7. [CSS Styling](#css-styling)
8. [User Guide](#user-guide)
9. [Advanced Concepts](#advanced-concepts)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This Kanban Board Application is a fully interactive task management tool built with vanilla JavaScript, HTML, and CSS. It allows users to create multiple movable boards, add cards to different columns (To Do, Doing, Done), drag cards between columns, and manage card details.

**Key Technologies:**
- HTML5 (Semantic markup)
- CSS3 (Flexbox, animations, transitions)
- Vanilla JavaScript (ES6+, no frameworks)
- HTML5 Drag and Drop API

**Browser Compatibility:**
- Chrome 65+
- Firefox 60+
- Safari 12+
- Edge 79+

---

## Project Structure

```
Kanban module/
├── index.html          # Main HTML file
├── script.js           # All JavaScript logic
├── style.css           # All styling and layouts
├── server.js           # (Empty for now - for backend)
├── kanban.sql          # Database schema
└── DOCUMENTATION.md    # This file
```

### File Sizes & Role
- **index.html** (~500 bytes): Entry point, loads CSS and JS
- **script.js** (~8KB): Core application logic
- **style.css** (~5KB): All visual styling
- **server.js** (empty): Ready for Node.js backend
- **kanban.sql**: MySQL table structure for persistence

---

## Features

### Current Features ✅

| Feature | Description |
|---------|-------------|
| **Create Boards** | Click "+ New Board" button to create new Kanban boards |
| **Edit Board Title** | Click the ✎ pencil icon to rename your board |
| **Drag Boards** | Grab the blue header to move boards around |
| **Add Cards** | Click "+ Add Card" in any column to create new tasks |
| **Card Details** | Click a card to see full title, description, and image |
| **Delete Cards** | Click × button or delete from card details modal |
| **Drag Cards** | Move cards between columns (To Do → Doing → Done) |
| **Visual Feedback** | Cards highlight on drag, columns change color on hover |
| **Data Persistence** | All card data stored in memory (in `boardsData` Map) |

### Potential Features for Future

- [ ] Local Storage (save data even after refresh)
- [ ] Database integration (SQL backend)
- [ ] User authentication
- [ ] Card filters and search
- [ ] Due dates and reminders
- [ ] Collaboration (multiple users)
- [ ] Board templates
- [ ] Card history/undo feature

---

## Architecture & Data Flow

### Overall Application Structure

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                          │
│                   (Entry Point)                          │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ↓                         ↓
  ┌──────────┐            ┌─────────────┐
  │style.css │            │ script.js   │
  │(Visual)  │            │(Logic)      │
  └──────────┘            └─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────▼────────┐      ┌────────▼──────┐
            │   boardsData   │      │  Event        │
            │   (In-Memory   │      │  Listeners    │
            │    Storage)    │      │               │
            └────────────────┘      └───────────────┘
```

### Data Storage Model

The application uses a Map-based data structure:

```javascript
boardsData = new Map([
  ['board-1711353600000', {
    title: 'Sprint 1',
    cards: Map([
      ['todo', [
        { id: 'card-1', title: 'Task 1', description: '...', imageUrl: '...' },
        { id: 'card-2', title: 'Task 2', description: '...', imageUrl: '...' }
      ]],
      ['doing', [
        { id: 'card-3', title: 'Task 3', description: '...', imageUrl: '...' }
      ]],
      ['done', [
        { id: 'card-4', title: 'Task 4', description: '...', imageUrl: '...' }
      ]]
    ])
  }],
  ['board-1711353650000', {
    // Another board...
  }]
])
```

### Information Flow Diagram

```
User Action (Click, Drag, etc.)
           ↓
Event Listener Triggered
           ↓
JavaScript Function Executes
           ↓
    ┌──────┴──────┐
    ↓             ↓
Update Data   Update DOM
(boardsData)  (Visual)
    │             │
    └──────┬──────┘
           ↓
Synchronized State
(Data matches what user sees)
```

---

## File Explanations

### 1. index.html

**Purpose:** The HTML skeleton of the application.

```html
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanban Module</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="sidebar">
        <button id="kanbanmaker">+ New Board</button>
    </div>

    <div id="sheet"></div>

    <script src="script.js"></script>
</body>
</html>
```

**Key Elements:**

| Element | ID/Class | Purpose |
|---------|----------|---------|
| `<div id="sidebar">` | - | Left sidebar with fixed width |
| `<button id="kanbanmaker">` | - | Main button to create new boards |
| `<div id="sheet">` | - | Main container where boards are placed |
| `<script src="script.js">` | - | Loads all JavaScript |
| `<link rel="stylesheet">` | - | Loads all CSS |

**Why this structure?**
- Clean separation of concerns (HTML, CSS, JS)
- `sidebar` stays fixed while `sheet` scrolls
- `id="kanbanmaker"` referenced in JavaScript for easy selection
- `id="sheet"` is where boards are dynamically inserted

---

### 2. script.js

**Purpose:** All application logic and interactivity.

**File Size:** ~8KB (about 300 lines)

**Main Sections:**

1. **Global Variables**
   - `boardsData`: Stores all boards and cards
   - `draggedCard`: Tracks card being dragged

2. **Board Creation**
   - `btn.addEventListener('click', ...)`: Listens for new board button
   - Creates unique board ID using `Date.now()`

3. **Board Title Editing**
   - `attachBoardTitleEditListener()`: Adds edit functionality
   - `openBoardTitleEditModal()`: Creates edit form

4. **Card Management**
   - `attachAddCardListeners()`: Adds event listeners
   - `openAddCardModal()`: Form to create card
   - `renderCard()`: Displays card in column
   - `openCardDetailsModal()`: Shows card info
   - `deleteCard()`: Removes card

5. **Drag and Drop**
   - `handleCardDragStart()`: When dragging starts
   - `handleCardDragEnd()`: When dragging ends
   - `handleDragOver()`: While dragging over column
   - `handleCardDrop()`: When card is dropped
   - `attachColumnDropListeners()`: Setup drop zones

6. **Board Movement**
   - `makeElementMovable()`: Makes boards draggable
   - Uses mouse events (mousedown, mousemove, mouseup)

---

### 3. style.css

**Purpose:** All visual styling and animations.

**File Size:** ~5KB (about 200 lines)

**Main Style Groups:**

| Section | Elements | Purpose |
|---------|----------|---------|
| **Layout** | `#sidebar`, `#sheet` | Page structure |
| **Buttons** | `#kanbanmaker`, `.add-card-btn` | Button styling |
| **Cards** | `.card`, `.card-title` | Card appearance |
| **Columns** | `.column`, `.column-list` | Column styling |
| **Board** | `.board-container`, `.boardHandle` | Board styling |
| **Modals** | `.modal`, `.modal-content` | Popup styling |
| **Forms** | `.form-group`, `.form-buttons` | Form styling |
| **Animations** | `@keyframes fadeIn`, `@keyframes slideIn` | Smooth transitions |

**Key CSS Features:**

1. **Flexbox Layout**
   ```css
   .boardHandle {
       display: flex;
       justify-content: space-between;
       align-items: center;
   }
   ```

2. **Animations**
   ```css
   @keyframes fadeIn {
       from { opacity: 0; }
       to { opacity: 1; }
   }
   ```

3. **Transitions**
   ```css
   .card {
       transition: all 0.3s ease;
   }
   ```

---

## JavaScript Functions

### 1. Board Creation & Management

#### `btn.addEventListener('click', () => { ... })`
**Triggers:** When user clicks "+ New Board" button

**What it does:**
1. Creates unique board ID: `'board-' + Date.now()`
2. Creates DOM structure with 3 columns (To Do, Doing, Done)
3. Initializes data in `boardsData` Map
4. Attaches event listeners

**Code Flow:**
```javascript
const boardId = 'board-' + Date.now();  // Create unique ID
const boardWrapper = document.createElement('div');  // Create container
boardWrapper.innerHTML = `...`;  // Add HTML structure
container.appendChild(boardWrapper);  // Add to page
boardsData.set(boardId, { ... });  // Store data
attachAddCardListeners(boardId);  // Add listeners
attachBoardTitleEditListener(boardId);  // Add title edit
makeElementMovable(boardWrapper);  // Make draggable
```

---

#### `attachBoardTitleEditListener(boardId)`
**Purpose:** Enable board title editing

**Parameters:**
- `boardId` (string): ID of the board to edit

**What it does:**
1. Finds the edit button (✎)
2. Listens for click
3. Opens edit modal when clicked

**Key line:**
```javascript
e.stopPropagation();  // Don't drag board when clicking button
```

---

#### `openBoardTitleEditModal(boardId, titleElement)`
**Purpose:** Show modal for editing board name

**Parameters:**
- `boardId` (string): Board to edit
- `titleElement` (DOM element): The title text element

**What it does:**
1. Gets current title from `boardsData`
2. Creates modal with input field
3. Pre-fills current title
4. Auto-focuses input
5. On submit: updates both data and DOM

**User Experience:**
```
Click ✎ button
     ↓
Modal appears with current title
     ↓
Text auto-selected (user can type immediately)
     ↓
Click Save
     ↓
Title updates everywhere
```

---

### 2. Card Management Functions

#### `attachAddCardListeners(boardId)`
**Purpose:** Setup click handlers for "+ Add Card" buttons

**What it does:**
1. Finds all "+ Add Card" buttons for this board
2. Adds click listener to each
3. Calls `openAddCardModal()` on click

```javascript
buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const columnId = btn.getAttribute('data-column');
        openAddCardModal(boardId, columnId);
    });
});
```

---

#### `openAddCardModal(boardId, columnId)`
**Purpose:** Show form to create new card

**What it does:**
1. Creates modal with form fields:
   - Card Title (required)
   - Description (optional)
   - Image URL (optional)
2. On submit:
   - Creates card object with unique ID
   - Stores in `boardsData`
   - Renders card visually
   - Closes modal

**Card Object Structure:**
```javascript
{
    id: 'card-1711353600123',
    title: 'My Task',
    description: 'Full description here',
    imageUrl: 'https://example.com/image.jpg'
}
```

---

#### `renderCard(boardId, columnId, card)`
**Purpose:** Display card in column

**What it does:**
1. Creates card DOM element
2. Sets `draggable="true"` for drag-drop
3. Stores board/column info on element
4. Adds click listener (open details)
5. Adds delete button listener
6. Attaches drag event listeners
7. Appends to column

**Element Structure:**
```html
<div class="card" draggable="true" id="card-123" data-boardId="board-123" data-columnId="todo" data-cardId="card-123">
    <button class="card-delete-btn">×</button>
    <div class="card-title">My Task</div>
</div>
```

---

#### `openCardDetailsModal(boardId, columnId, card)`
**Purpose:** Show full card information

**Displays:**
- Card title as header
- Card image (with fallback)
- Card description
- Close and Delete buttons

**Image Handling:**
```html
<img src="${card.imageUrl}" 
     alt="Card image" 
     onerror="this.src='https://via.placeholder.com/400x300?text=Image+Not+Found'">
```

If image URL is broken, shows placeholder.

---

#### `deleteCard(boardId, columnId, cardId)`
**Purpose:** Remove card from board

**What it does:**
1. Finds card in `boardsData`
2. Removes from array: `cards.splice(index, 1)`
3. Removes from DOM: `cardElement.remove()`

**Can be called from:**
- Card's × delete button
- Card details modal's Delete button

---

### 3. Drag and Drop Functions

#### `handleCardDragStart(e)`
**Triggers:** When user starts dragging a card

**What it does:**
1. Saves reference to card: `draggedCard = this`
2. Makes card semi-transparent: `opacity = '0.5'`
3. Sets drag effect to "move": `dropEffect = 'move'`

**Why store `draggedCard`?**
- HTML5 drag-drop API has limitations
- `dataTransfer` can't store complex objects
- Global variable is simplest solution

---

#### `handleDragOver(e)`
**Triggers:** While dragging card over a column

**What it does:**
1. `e.preventDefault()` - **CRITICAL** for drop to work
2. Shows visual feedback by changing column color to light blue
3. Sets `dropEffect = 'move'` to show valid drop target

**Why preventDefault()?**
By default, HTML elements aren't drop targets. We must preventDefault to allow drops.

---

#### `handleCardDrop(e)`
**Triggers:** When card is released over a column

**What it does:**
1. Gets source info (where card came from)
2. Gets destination info (where it's being dropped)
3. Prevents drop on same column
4. **Updates data structure:**
   - Removes from source column
   - Adds to destination column
5. **Updates DOM:**
   - Removes visual card from old location
   - Renders in new location
6. Re-attaches drop listeners to destination board

**Critical Code:**
```javascript
// Remove from source
const card = cardData.splice(cardIndex, 1)[0];

// Add to destination
boardsData.get(toBoardId).cards.get(toColumnId).push(card);

// Update DOM
draggedCard.remove();
renderCard(toBoardId, toColumnId, card);
```

This keeps **data synchronized with DOM** - very important!

---

#### `attachColumnDropListeners(boardId)`
**Purpose:** Make columns accept drops

**What it does:**
1. Finds all column-list divs in board
2. Adds three event listeners:
   - `dragover`: Called while dragging
   - `drop`: Called on release
   - `dragleave`: Called when leaving column

Called when:
- Board is created
- Card is dropped (to re-setup listeners)

---

### 4. Board Dragging Function

#### `makeElementMovable(elmnt)`
**Purpose:** Make boards draggable with mouse

**What it does:**
1. Finds `.boardHandle` element
2. Listens for mousedown on handle
3. Calculates position changes on mousemove
4. Updates board position with CSS
5. Stops on mouseup

**How it works:**
```
mousedown event
    ↓
Save starting mouse position (pos3, pos4)
    ↓
Start listening to mousemove
    ↓
On mousemove:
    Calculate how far mouse moved
    Update board.style.top and board.style.left
    ↓
On mouseup:
    Stop listening to mousemove
```

**Z-Index Management:**
```javascript
// Make this board the top-most
elmnt.style.zIndex = "5";

// Bring other boards to background
allBoards.forEach(board => {
    board.style.zIndex = "1";
});
```

This ensures the board you're dragging is always on top.

---

## CSS Styling

### Layout Structure

#### Sidebar
```css
#sidebar {
    width: 100px;
    position: fixed;  /* Stays in place while scrolling */
    background-color: #292626;  /* Dark gray */
}
```

#### Main Content Area
```css
#sheet {
    margin-left: 120px;  /* Make room for sidebar */
    padding: 20px;
}
```

### Board Styling

#### Board Container
```css
.board-container {
    position: absolute;  /* Can be moved anywhere */
    background-color: #f1f1f1;
    border: 1px solid #d3d3d3;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    min-width: 360px;
}
```

**Why `position: absolute`?** Allows free movement with drag handlers.

#### Board Handle (Header)
```css
.boardHandle {
    padding: 10px;
    cursor: move;  /* Shows move cursor */
    background-color: #2196F3;  /* Blue */
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
```

### Column Styling

```css
.column {
    width: 80px;
    height: 380px;
    background-color: #d0d0d0;
}

.column-list {
    min-height: 300px;
    background-color: #e8e8e8;
    padding: 5px;
    border-radius: 4px;
}
```

**Why min-height?** Ensures column is always droppable, even when empty.

### Card Styling

#### Normal Card
```css
.card {
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
}
```

#### Card Hover
```css
.card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    transform: translateY(-2px);  /* Slight lift effect */
}
```

#### Delete Button (Hidden by Default)
```css
.card-delete-btn {
    opacity: 0;  /* Hidden */
    transition: opacity 0.3s;
}

.card:hover .card-delete-btn {
    opacity: 1;  /* Visible on hover */
}
```

**User Experience:** Delete button only shows when needed.

#### Dragging a Card
```css
.card[draggable="true"] {
    cursor: grab;  /* Shows grab hand */
}

.card[draggable="true"]:active {
    cursor: grabbing;  /* Shows grabbing hand */
}
```

### Modal Styling

#### Modal Overlay
```css
.modal {
    position: fixed;
    z-index: 1000;  /* Above everything */
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);  /* Semi-transparent */
    animation: fadeIn 0.3s;
}
```

#### Modal Content
```css
.modal-content {
    margin: 5% auto;
    padding: 20px;
    border: 1px solid #888;
    border-radius: 8px;
    max-width: 500px;
    animation: slideIn 0.3s;
}
```

### Animations

#### Fade In
```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

Applied to: Modal overlay

#### Slide In
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

Applied to: Modal content

---

## User Guide

### Creating a New Board

**Step 1:** Click the "+ New Board" button in the left sidebar
- A new Kanban board appears on the page
- It has three columns: To Do, Doing, Done
- Default title is "Drag Board Here"

**Step 2:** Move the board (optional)
- Click and drag the blue header to reposition
- The board stays above other boards while dragging

### Editing Board Title

**Step 1:** Click the ✎ (pencil) icon next to the board title
- A modal opens with the current title

**Step 2:** Edit the title
- Text is automatically selected
- Type your new board name
- Click "Save"

**Result:** The board title updates everywhere

### Adding Cards

**Step 1:** Click "+ Add Card" in the column you want
- Modal opens with form fields
- Title is required
- Description and Image URL are optional

**Step 2:** Fill in the form
```
Card Title:      "Fix Login Bug"
Description:     "The login form doesn't validate emails properly"
Image URL:       "https://example.com/bug.png"
```

**Step 3:** Click "Add Card"
- Card appears at the bottom of the column
- Modal closes

### Viewing Card Details

**Step 1:** Click on any card
- Modal opens showing:
  - Large title
  - Full description
  - Image (if provided)
  - Close and Delete buttons

**Step 2:** View or manage the card
- See full information
- Delete if needed
- Close when done

### Deleting Cards

**Method 1 - From Card View:**
1. Click on card
2. Click "Delete Card" button

**Method 2 - From Column View:**
1. Hover over card (× button appears)
2. Click ×

### Moving Cards Between Columns

**Step 1:** Hover over a card
- Notice the cursor changes to "grab" (open hand)

**Step 2:** Click and drag the card
- Card becomes semi-transparent
- Cursor changes to "grabbing" (closed hand)

**Step 3:** Drag over a column
- Column highlights in light blue
- This shows it's a valid drop target

**Step 4:** Release the card
- Card disappears from old column
- Card appears in new column

### Example Workflow

```
1. Create board titled "My Project"
2. Add cards to "To Do":
   - Design UI
   - Setup database
   - Create API

3. Drag "Setup database" from To Do to Doing
   (You're working on it now)

4. Drag "Design UI" from To Do to Doing
   (You started working on it)

5. Click "Design UI" to see details
   - See notes about design requirements
   - See design mockup image

6. Finish "Design UI" and drag to Done

7. Continue with other tasks...
```

---

## Advanced Concepts

### 1. Map vs Object

**Why use Map instead of Object?**

```javascript
// Using Object (old way)
const boardsData = {};
boardsData['board-1'] = {...};  // String keys only
boardsData.size;  // undefined - no easy way to count

// Using Map (modern way)
const boardsData = new Map();
boardsData.set('board-1', {...});  // Any type of key
boardsData.size;  // 1 - easy counting
boardsData.has('board-1');  // true - built-in checking
boardsData.get('board-1');  // Get value
boardsData.delete('board-1');  // Delete entry
```

**Benefits of Map:**
- Methods for common operations (get, set, has, delete)
- Maintains insertion order
- Can use any type as key (not just strings)
- Better for data-heavy applications

### 2. Unique ID Generation

```javascript
const boardId = 'board-' + Date.now();
```

**How it works:**
- `Date.now()` returns milliseconds since 1970
- Millisecond precision is usually unique enough
- Prefix ('board-', 'card-') makes IDs human-readable

**Example:** `'board-1711353600123'`

**Why not use random numbers?**
- Not guaranteed unique
- Could have collisions

**Better option (if you need better uniqueness):**
```javascript
const boardId = 'board-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
```

### 3. Event Propagation

**Problem:** When you click the edit button, it also triggers the board drag handler.

**Solution:** `e.stopPropagation()`

```javascript
editBtn.addEventListener('click', (e) => {
    e.stopPropagation();  // Stops event from bubbling up
    // Handle edit...
});
```

**Event Bubbling:**
```
User clicks edit button
        ↓
Edit button click event fires
        ↓
Event bubbles up to parent (boardHandle)
        ↓
Without stopPropagation: Parent's drag handler also runs ❌
With stopPropagation: Only edit handler runs ✅
```

### 4. Drag and Drop API

**Three main event types:**

1. **dragstart** - On the draggable element
   ```javascript
   element.addEventListener('dragstart', (e) => {
       e.dataTransfer.effectAllowed = 'move';
   });
   ```

2. **dragover** - On the drop target
   ```javascript
   dropZone.addEventListener('dragover', (e) => {
       e.preventDefault();  // REQUIRED to allow drop
   });
   ```

3. **drop** - On the drop target
   ```javascript
   dropZone.addEventListener('drop', (e) => {
       e.preventDefault();
       // Handle the drop
   });
   ```

**Important:** You MUST call `preventDefault()` in both dragover and drop for drops to work!

### 5. Data Synchronization Pattern

This app uses a synchronization pattern:

```
User Action
    ↓
Update JavaScript Data Structure (boardsData)
    ↓
Update DOM (what user sees)
    ↓
Data = DOM (synchronized)
```

**Why this matters:**
- If data and DOM are out of sync, bugs occur
- When you add a card: update data THEN update DOM
- When you move a card: update data THEN update DOM
- Always do both!

**Anti-pattern (DON'T DO THIS):**
```javascript
// ❌ Wrong - only updates DOM, data is stale
card.remove();  // Remove from view
// But boardsData still has the card!
```

**Correct pattern:**
```javascript
// ✅ Right - update both
boardsData.get(boardId).cards.get(columnId).splice(index, 1);  // Data
cardElement.remove();  // DOM
```

### 6. Closure and Function Context

**Example:**
```javascript
function attachAddCardListeners(boardId) {
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // This function remembers boardId from parent scope
            openAddCardModal(boardId, columnId);
        });
    });
}
```

**How it works:**
- The click handler "closes over" boardId
- Even after attachAddCardListeners finishes, the handler remembers boardId
- This is called a "closure"

**Without closures:**
- Every event handler would need to find the boardId by traversing DOM
- Much more complex and error-prone

---

## Troubleshooting

### Issue: Cards don't appear after adding them

**Possible causes:**
1. Board container width too small
2. Column not wide enough
3. CSS conflict hiding cards

**Debug steps:**
```javascript
// In browser console:
console.log(boardsData);  // Check if card is in data
document.querySelector('.card');  // Check if card is in DOM
```

**Solution:**
- Check `.card` width and `.column-list` width in CSS
- Ensure `display: block` or `display: flex`

### Issue: Can't drag cards between columns

**Possible causes:**
1. `dragover` or `drop` event not prevented
2. Drop listeners not attached
3. JavaScript error in drag handlers

**Debug steps:**
```javascript
// Check if listeners are attached
const column = document.querySelector('.column-list');
console.log(column);  // Should exist

// Test drag manually
// Check browser console for errors (F12)
```

**Solution:**
- Verify `e.preventDefault()` in both dragover and drop
- Check browser console for JavaScript errors
- Ensure `attachColumnDropListeners()` is called

### Issue: Board title won't change

**Possible causes:**
1. Edit modal not opening
2. Form not submitting
3. Data not updating

**Debug steps:**
```javascript
// Try clicking edit button
// Check if modal appears
// Check console for errors

// Manually update in console:
boardsData.get('board-xxx').title = 'New Title';
```

**Solution:**
- Ensure `.board-title-edit-btn` exists in DOM
- Check CSS z-index (modal z-index should be > 1000)
- Verify form submit event listener is attached

### Issue: Boards don't move (drag board by header)

**Possible causes:**
1. `makeElementMovable()` not called
2. Mouse events not working
3. CSS position absolute not set

**Debug steps:**
```javascript
// Check if function called
boardWrapper.classList.contains('board-container');  // Should be true
getComputedStyle(boardWrapper).position;  // Should be "absolute"
```

**Solution:**
- Verify `makeElementMovable(boardWrapper)` is called after creating board
- Check that `.board-container` has `position: absolute` in CSS
- Ensure no CSS `overflow: hidden` on parent

### Issue: Multiple boards stacking on top of each other

**Possible causes:**
1. Z-index not managed correctly
2. Boards positioned at same coordinates

**Debug steps:**
```javascript
// Check positions
const boards = document.querySelectorAll('.board-container');
boards.forEach(b => {
    console.log(`top: ${b.style.top}, left: ${b.style.left}`);
});
```

**Solution:**
- Boards have staggered positions using:
  ```javascript
  boardWrapper.style.top = (100 + (document.querySelectorAll('.board-container').length * 20)) + "px";
  ```
- Each new board is 20px further right and down
- This is intentional - you can adjust the multiplier (20) if needed

### Issue: Image in card details doesn't load

**Possible causes:**
1. Invalid image URL
2. CORS (Cross-Origin Resource Sharing) blocked
3. Image doesn't exist anymore

**Solution:**
- Verify URL is correct
- Check if image works in browser directly
- Use a test image: `https://via.placeholder.com/400x300?text=Test`
- The app has fallback to placeholder if URL is broken

### Issue: Dragging card also drags the board

**Possible causes:**
1. Drop handlers not preventing default
2. Event bubbling not stopped correctly

**Debug steps:**
```javascript
// Check if dragstart fires
// Console should show drag events
element.addEventListener('dragstart', (e) => {
    console.log('Drag started');
});
```

**Solution:**
- Ensure `e.preventDefault()` in dragstart
- Ensure `stopPropagation()` in edit button click
- Check that card is actually inside column, not overlapping board header

---

## Performance Considerations

### Current Limitations

1. **Memory Usage**
   - All data stored in browser memory (RAM)
   - Resets on page refresh
   - Good for: Quick testing, small projects
   - Bad for: Large projects, persistence

2. **DOM Manipulation**
   - Creating/removing elements is relatively slow
   - OK for <100 cards per board
   - Might be slow with thousands of cards

3. **Event Listeners**
   - Adding listeners dynamically is fine for current scale
   - Could optimize by using event delegation

### Optimization Tips

**If adding many cards:**
```javascript
// Instead of:
for (let i = 0; i < 100; i++) {
    renderCard(boardId, columnId, card);  // 100 DOM operations
}

// Better:
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
    // Build cards in memory first
}
fragment.appendChild(allCards);  // 1 DOM operation
```

**For better persistence:**
```javascript
// Save to localStorage before page unload
window.addEventListener('beforeunload', () => {
    localStorage.setItem('boardsData', JSON.stringify(Array.from(boardsData)));
});

// Load on page load
const saved = localStorage.getItem('boardsData');
if (saved) {
    // Restore from JSON
}
```

---

## Future Enhancement Ideas

### 1. Local Storage Persistence
```javascript
// Auto-save to localStorage every 30 seconds
setInterval(() => {
    const dataToSave = Array.from(boardsData.entries());
    localStorage.setItem('kanban', JSON.stringify(dataToSave));
}, 30000);
```

### 2. Card Priority Levels
```javascript
card = {
    id: 'card-1',
    title: 'Task',
    priority: 'high',  // or 'medium', 'low'
    dueDate: '2026-03-30'
};

// Color code cards by priority
.card.priority-high { border-left: 4px solid #ff4444; }
.card.priority-medium { border-left: 4px solid #ffaa00; }
.card.priority-low { border-left: 4px solid #44aa44; }
```

### 3. Search & Filter
```javascript
function searchCards(query) {
    const results = [];
    boardsData.forEach((board, boardId) => {
        board.cards.forEach((cardsInColumn, columnId) => {
            const matches = cardsInColumn.filter(card =>
                card.title.toLowerCase().includes(query.toLowerCase())
            );
            results.push({boardId, columnId, cards: matches});
        });
    });
    return results;
}
```

### 4. Undo/Redo
```javascript
const history = [];
const historyIndex = 0;

function saveState() {
    history.push(JSON.parse(JSON.stringify(boardsData)));
    historyIndex++;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        boardsData = history[historyIndex];
        // Re-render everything
    }
}
```

### 5. Keyboard Shortcuts
```javascript
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveAllData();  // Ctrl+S to save
    }
    if (e.key === 'Escape') {
        closeAllModals();  // ESC to close
    }
});
```

---

## Summary

This Kanban Board Application demonstrates:

✅ **DOM Manipulation** - Creating/removing elements dynamically
✅ **Event Handling** - Click, drag, and input events
✅ **Data Structures** - Using Map for efficient storage
✅ **Drag and Drop API** - HTML5 native drag-drop
✅ **Closures** - Functions remembering their context
✅ **State Management** - Keeping data and DOM synchronized
✅ **CSS Styling** - Animations, flexbox, responsive design
✅ **User Experience** - Modals, feedback, smooth interactions

**Key Takeaways:**
1. Always keep data and DOM synchronized
2. Use event.preventDefault() and stopPropagation() when needed
3. Unique IDs are essential for tracking elements
4. User feedback (animations, colors) makes apps feel polished
5. Well-organized code is easier to maintain and extend

---

**For questions or improvements, refer to the relevant section above!**
