# How to Modify & Extend Your Kanban Board

This guide shows you how to make common modifications to your application.

---

## Table of Contents
1. [Color & Style Changes](#color--style-changes)
2. [Adding Features](#adding-features)
3. [Modifying Existing Features](#modifying-existing-features)
4. [Performance Improvements](#performance-improvements)
5. [Debugging Tips](#debugging-tips)

---

## Color & Style Changes

### Change Sidebar Color

**File:** `style.css`

**Find:**
```css
#sidebar {
    background-color: #292626;  /* Dark gray */
}
```

**Change to:**
```css
#sidebar {
    background-color: #1976d2;  /* Blue */
}
```

**Common colors:**
- `#ff6b6b` - Red
- `#4CAF50` - Green
- `#FFC107` - Yellow
- `#9C27B0` - Purple
- `#00BCD4` - Cyan

---

### Change Header/Board Handle Color

**Find:**
```css
.boardHandle {
    background-color: #2196F3;  /* Blue */
}
```

**Change to any color you want:**
```css
.boardHandle {
    background-color: #27AE60;  /* Green */
}
```

---

### Change Button Colors

**Add Card Button:**
```css
.add-card-btn {
    background-color: #4CAF50;  /* Green */
}

.add-card-btn:hover {
    background-color: #45a049;  /* Darker green */
}
```

**Delete Button:**
```css
.card-delete-btn {
    background-color: #ff4444;  /* Red */
}

.card-delete-btn:hover {
    background-color: #cc0000;  /* Darker red */
}
```

---

### Change Card Styling

**Make cards bigger:**
```css
.card {
    padding: 15px;  /* Was 10px - more spacing inside */
    margin-bottom: 15px;  /* Was 10px - more space between cards */
}
```

**Remove card shadow:**
```css
.card {
    box-shadow: none;  /* Was: 0 2px 4px rgba(0,0,0,0.1) */
}
```

**Make cards more rounded:**
```css
.card {
    border-radius: 12px;  /* Was 4px - more rounded corners */
}
```

**Change card border:**
```css
.card {
    border: 2px solid #2196F3;  /* Thicker blue border */
}
```

---

### Change Modal Colors

**Background overlay darkness:**
```css
.modal {
    background-color: rgba(0,0,0,0.8);  /* More opaque - was 0.4 */
}
```

Higher number (closer to 1) = darker overlay

---

## Adding Features

### Add a "Completed" Column (4th Column)

**File:** `script.js`

**Find in button click listener:**
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

**Change to:**
```javascript
boardsData.set(boardId, {
    cards: new Map([
        ['todo', []],
        ['doing', []],
        ['done', []],
        ['completed', []]  // Add new column
    ]),
    title: 'Drag Board Here'
});
```

**Also find the HTML that creates columns:**
```javascript
boardWrapper.innerHTML = `
    <div class="boardHandle">
        ...
    </div>
    
    <div class="board">
        <div class="column">
            <h3>To Do</h3>
            <div class="column-list" data-column="todo"></div>
            <button class="add-card-btn" data-board="${boardId}" data-column="todo">+ Add Card</button>
        </div>
        <div class="column">
            <h3>Doing</h3>
            <div class="column-list" data-column="doing"></div>
            <button class="add-card-btn" data-board="${boardId}" data-column="doing">+ Add Card</button>
        </div>
        <div class="column">
            <h3>Done</h3>
            <div class="column-list" data-column="done"></div>
            <button class="add-card-btn" data-board="${boardId}" data-column="done">+ Add Card</button>
        </div>
    </div>
`;
```

**Add after Done column:**
```javascript
        <div class="column">
            <h3>Completed</h3>
            <div class="column-list" data-column="completed"></div>
            <button class="add-card-btn" data-board="${boardId}" data-column="completed">+ Add Card</button>
        </div>
```

---

### Add Priority Levels to Cards

**File:** `script.js`

**Find in `openAddCardModal()` where form is created:**
```html
<div class="form-group">
    <label for="cardImage">Image URL:</label>
    <input type="url" id="cardImage" placeholder="https://example.com/image.jpg">
</div>
```

**Add before the buttons:**
```html
<div class="form-group">
    <label for="cardPriority">Priority:</label>
    <select id="cardPriority">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
    </select>
</div>
```

**Then in form submit handler:**
```javascript
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('cardTitle').value;
    const description = document.getElementById('cardDescription').value;
    const imageUrl = document.getElementById('cardImage').value;
    const priority = document.getElementById('cardPriority').value;  // Get priority

    const newCard = {
        id: 'card-' + Date.now(),
        title: title,
        description: description,
        imageUrl: imageUrl,
        priority: priority  // Add to card
    };
    // ... rest of code
});
```

**In `renderCard()` function, update the card HTML:**
```javascript
cardElement.innerHTML = `
    <button class="card-delete-btn">×</button>
    <div class="card-priority priority-${card.priority}"></div>
    <div class="card-title">${card.title}</div>
`;
```

**Add CSS styling for priorities in `style.css`:**
```css
.card-priority {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    border-radius: 4px 0 0 4px;
}

.card-priority.priority-high {
    background-color: #ff4444;  /* Red */
}

.card-priority.priority-medium {
    background-color: #ffaa00;  /* Orange */
}

.card-priority.priority-low {
    background-color: #44aa44;  /* Green */
}
```

---

### Add Due Date to Cards

**In `openAddCardModal()` form:**
```html
<div class="form-group">
    <label for="cardDueDate">Due Date:</label>
    <input type="date" id="cardDueDate">
</div>
```

**In form submit:**
```javascript
const newCard = {
    id: 'card-' + Date.now(),
    title: title,
    description: description,
    imageUrl: imageUrl,
    dueDate: document.getElementById('cardDueDate').value  // Add this
};
```

**In `renderCard()` to show due date:**
```javascript
let dueDateHtml = '';
if (card.dueDate) {
    dueDateHtml = `<div class="card-due-date">${card.dueDate}</div>`;
}

cardElement.innerHTML = `
    <button class="card-delete-btn">×</button>
    <div class="card-title">${card.title}</div>
    ${dueDateHtml}
`;
```

---

### Add Delete Board Button

**In board header creation, update:**
```javascript
<div class="boardHandle">
    <span class="board-title-text">⠿ Drag Board Here</span>
    <button class="board-title-edit-btn" title="Click to edit board name">✎</button>
    <button class="board-delete-btn" title="Click to delete board">🗑️</button>
</div>
```

**Add CSS styling:**
```css
.board-delete-btn {
    background-color: rgba(255, 255, 255, 0.3);
    color: #fff;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
}

.board-delete-btn:hover {
    background-color: rgba(255, 68, 68, 0.8);
}
```

**Add delete handler in board creation:**
```javascript
attachAddCardListeners(boardId);
attachBoardTitleEditListener(boardId);

// Add this:
const deleteBtn = boardWrapper.querySelector('.board-delete-btn');
deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Delete this board?')) {
        boardsData.delete(boardId);
        boardWrapper.remove();
    }
});

makeElementMovable(boardWrapper);
```

---

## Modifying Existing Features

### Change Default Board Title

**File:** `script.js`

**Find:**
```javascript
boardsData.set(boardId, {
    cards: new Map([...]),
    title: 'Drag Board Here'  // ← Change this
});
```

**Change to:**
```javascript
boardsData.set(boardId, {
    cards: new Map([...]),
    title: 'New Board'  // Or whatever you want
});
```

---

### Change Initial Board Position (Stagger Amount)

**Find:**
```javascript
boardWrapper.style.top = (100 + (document.querySelectorAll('.board-container').length * 20)) + "px";
boardWrapper.style.left = (100 + (document.querySelectorAll('.board-container').length * 20)) + "px";
```

**The `* 20` controls the stagger distance:**
- Change to `* 10` for closer spacing
- Change to `* 50` for further spacing
- Change to `* 0` for all boards at same position

**Change the `100` for starting position:**
```javascript
// Further right and down:
boardWrapper.style.top = (200 + ...) + "px";
boardWrapper.style.left = (200 + ...) + "px";
```

---

### Change Button Text

**In board creation HTML:**
```javascript
<button class="add-card-btn" ...>+ Add Card</button>
```

**Change to:**
```javascript
<button class="add-card-btn" ...>+ New Task</button>
```

**Or in sidebar:**
```html
<button id="kanbanmaker">+ New Board</button>
```

**Change to:**
```html
<button id="kanbanmaker">+ Create Board</button>
```

---

### Make Cards Wider

**File:** `style.css`

**Find:**
```css
.column {
    width: 80px;
}
```

**Change to:**
```css
.column {
    width: 150px;  /* Wider cards */
}
```

**Also update board minimum width:**
```css
.board-container {
    min-width: 500px;  /* Was 360px - accounts for wider columns */
}
```

---

### Change Animation Speed

**Find animations:**
```css
.card {
    transition: all 0.3s ease;  /* Change 0.3s */
}

.modal {
    animation: fadeIn 0.3s;  /* Change 0.3s */
}
```

**Slower:**
```css
transition: all 1s ease;      /* Takes 1 second */
animation: fadeIn 1s;
```

**Faster:**
```css
transition: all 0.1s ease;    /* Takes 0.1 second */
animation: fadeIn 0.1s;
```

---

### Change Form Field Labels

**In `openAddCardModal()`:**
```javascript
<label for="cardTitle">Card Title:</label>
```

**Change to:**
```javascript
<label for="cardTitle">Task Name:</label>
```

---

## Performance Improvements

### Pre-load Sample Data (For Testing)

**In `script.js`, after `const boardsData = new Map();`:**

```javascript
// Add sample data
function createSampleBoard() {
    const boardId = 'sample-' + Date.now();
    
    const sampleCards = {
        todo: [
            { id: 'c1', title: 'Design Homepage', description: 'Create mockups', imageUrl: '' },
            { id: 'c2', title: 'Setup Database', description: 'PostgreSQL setup', imageUrl: '' }
        ],
        doing: [
            { id: 'c3', title: 'Build API', description: 'Node.js backend', imageUrl: '' }
        ],
        done: [
            { id: 'c4', title: 'Setup Project', description: 'Git repo ready', imageUrl: '' }
        ]
    };
    
    boardsData.set(boardId, {
        title: 'Sample Project',
        cards: new Map([
            ['todo', sampleCards.todo],
            ['doing', sampleCards.doing],
            ['done', sampleCards.done]
        ])
    });
    
    // Render the board...
    // (Would need to create HTML and render)
}

// Call it on page load (optional):
// createSampleBoard();
```

---

### Limit Cards per Column (Optional)

**In `handleCardDrop()`, before adding card:**

```javascript
const destinationCards = boardsData.get(toBoardId).cards.get(toColumnId);

if (toColumnId === 'doing' && destinationCards.length >= 3) {
    alert('Maximum 3 cards in Doing column!');
    draggedCard = null;
    return;
}
```

---

## Debugging Tips

### Log all actions to console

**Add at top of key functions:**

```javascript
function renderCard(boardId, columnId, card) {
    console.log(`Rendering card "${card.title}" to ${boardId}/${columnId}`);
    // ... rest of function
}

function handleCardDrop(e) {
    console.log('Card dropped!');
    console.log('From:', draggedCard.dataset.boardId, draggedCard.dataset.columnId);
    console.log('To:', this.closest('.board-container').id, this.getAttribute('data-column'));
    // ... rest of function
}
```

### Check Data Integrity

**In browser console (F12):**

```javascript
// View all boards
console.table(Array.from(boardsData.entries()));

// View specific board
boardsData.forEach((board, id) => {
    console.log(`Board: ${id}`);
    board.cards.forEach((cards, columnId) => {
        console.log(`  ${columnId}: ${cards.length} cards`);
    });
});

// Count total cards
let total = 0;
boardsData.forEach(board => {
    board.cards.forEach(cards => {
        total += cards.length;
    });
});
console.log(`Total cards: ${total}`);
```

---

### Test Drag and Drop

Add visual feedback:

```javascript
function handleCardDragStart(e) {
    console.log('Drag started on:', e.target.innerText);
    draggedCard = this;
    this.style.opacity = '0.5';
    // ...
}

function handleDragOver(e) {
    console.log('Dragging over column:', this.getAttribute('data-column'));
    // ...
}

function handleCardDrop(e) {
    console.log('Dropped!');
    // ...
}
```

---

## Common Modification Checklist

- [ ] Changed colors to match brand
- [ ] Added new column
- [ ] Added priority/due date feature
- [ ] Changed default text
- [ ] Made board wider/narrower
- [ ] Adjusted animation speed
- [ ] Tested all features still work
- [ ] Checked console for errors (F12)

---

## Testing After Changes

Always test:

1. **Create new board** - Does it appear?
2. **Add card** - Form submits? Card appears?
3. **View card details** - Image loads?
4. **Delete card** - Disappears completely?
5. **Drag card** - Moves to new column? Data updates?
6. **Drag board** - Moves around? Z-index works?
7. **Edit title** - Updates everywhere?
8. **Check console** - Any errors? (F12)

---

## When Things Break

1. **Check browser console** (F12) for errors
2. **Verify HTML syntax** - Missing closing tags?
3. **Verify CSS syntax** - Missing semicolons?
4. **Check if DOM changed** - Did you update the right element?
5. **Verify data structure** - Is data still valid?
6. **Test in isolation** - Does just that feature work?
7. **Undo recent changes** - Which change broke it?

---

## Safe Editing Tips

1. **Make one change at a time**
2. **Test after each change**
3. **Keep backup of working code**
4. **Use browser DevTools** (F12) to test
5. **Comment out code instead of deleting**

Example:
```javascript
// TESTING - commented out old version
// boardsData.set(boardId, { cards: new Map([...]) });

// NEW VERSION
boardsData.set(boardId, { 
    cards: new Map([...]),
    title: 'New Board'  // Added title
});
```

---

**Happy modifying! Feel free to experiment and break things (you can always reload the page!) 🚀**
