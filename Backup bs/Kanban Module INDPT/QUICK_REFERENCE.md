# Kanban Board - Quick Reference Guide

## 🚀 Quick Start

### File Structure
```
Kanban module/
├── index.html          ← Main entry point
├── script.js           ← All JavaScript logic
├── style.css           ← All styling
├── server.js           ← Backend (empty for now)
├── kanban.sql          ← Database schema
└── DOCUMENTATION.md    ← Full guide (this file)
```

### How to Run
1. Open `index.html` in a web browser
2. Everything works immediately - no setup needed!
3. Data is stored in browser memory (RAM)

---

## 📋 Features at a Glance

| Feature | How to Use |
|---------|-----------|
| **Create Board** | Click "+ New Board" button |
| **Rename Board** | Click ✎ pencil icon next to title |
| **Move Board** | Drag the blue header bar |
| **Add Card** | Click "+ Add Card" in any column |
| **View Card** | Click the card to see details |
| **Delete Card** | Click × (on card) or in card details modal |
| **Move Card** | Drag card to different column |

---

## 🧠 Understanding the Code

### Main Data Structure
```javascript
boardsData = Map {
  'board-123' → {
    title: 'My Board',
    cards: Map {
      'todo' → [card1, card2, ...],
      'doing' → [card3, ...],
      'done' → [card4, ...]
    }
  }
}
```

### Key JavaScript Functions

| Function | What It Does | Triggered By |
|----------|-------------|--------------|
| `attachBoardTitleEditListener()` | Enable board rename | Board creation |
| `openAddCardModal()` | Show add card form | "+ Add Card" button |
| `renderCard()` | Display card in column | After card created |
| `handleCardDragStart()` | Start dragging card | Mouse down on card |
| `handleCardDrop()` | Move card to column | Release over column |
| `makeElementMovable()` | Enable board dragging | Board creation |

### Key CSS Classes

| Class | What It Styles | Notes |
|-------|----------------|-------|
| `.board-container` | Entire board | Absolute positioning for dragging |
| `.boardHandle` | Blue header bar | Flexbox for title + edit button |
| `.card` | Task card | White background, hover effects |
| `.column-list` | Card container | Drop target for drag-drop |
| `.modal` | Popup overlay | Semi-transparent background |

---

## 🔄 Application Flow

### Creating a New Board
```
Click "+ New Board"
    ↓
Generate unique ID (board-1711353600000)
    ↓
Create HTML structure (3 columns)
    ↓
Add to boardsData (memory)
    ↓
Attach event listeners
    ↓
Board appears on screen
```

### Adding a Card
```
Click "+ Add Card"
    ↓
Modal form opens
    ↓
User fills: Title, Description, Image URL
    ↓
Click "Add Card" button
    ↓
Create card object with unique ID
    ↓
Store in boardsData[boardId].cards[columnId]
    ↓
Render card visually
    ↓
Card appears in column
```

### Moving a Card Between Columns
```
Click and drag card
    ↓
dragstart event: Save card reference, show opacity change
    ↓
dragover event: Show visual feedback (blue highlight)
    ↓
drop event: 
  • Remove from old column (data + DOM)
  • Add to new column (data + DOM)
  • Re-render in new location
    ↓
Card now in different column
```

---

## 💡 Key Concepts Explained Simply

### 1. Map (Data Storage)
Think of it like a real map with locations:
```javascript
boardsData.set('board-1', {...})  // Mark location
boardsData.get('board-1')         // Find what's there
boardsData.has('board-1')         // Check if exists
boardsData.delete('board-1')      // Remove location
```

### 2. Event Listeners
Like a security guard who watches for actions:
```javascript
button.addEventListener('click', () => {
    // Runs when someone clicks the button
});
```

### 3. Dragging (Drag & Drop API)
Three-step process:
1. **dragstart** - User picks up the card
2. **dragover** - User moves over drop zone
3. **drop** - User releases the card

### 4. Synchronization
Keep two things in sync:
- **Data** (JavaScript: `boardsData`)
- **DOM** (What user sees on screen)

If one updates, update the other immediately!

### 5. Closures
Functions that "remember" their context:
```javascript
function makeBoard(boardId) {
    button.addEventListener('click', () => {
        // This remembers boardId even after function ends
        console.log(boardId);
    });
}
```

---

## 🎨 CSS Styling Highlights

### Colors Used
```css
#2196F3  /* Blue (headers, buttons) */
#f1f1f1  /* Light gray (cards, boards) */
#d0d0d0  /* Medium gray (columns) */
#ff4444  /* Red (delete buttons) */
#4CAF50  /* Green (add buttons) */
```

### Important CSS Properties
```css
position: absolute;     /* Allows dragging */
display: flex;          /* Column layouts */
transition: all 0.3s;   /* Smooth animations */
z-index: 1000;          /* Stacking order */
cursor: grab/grabbing;  /* Drag feedback */
user-select: none;      /* Disable text selection while dragging */
```

### Animations
```css
@keyframes fadeIn {     /* Modal appears */
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {    /* Modal slides down */
    from { transform: translateY(-50px); }
    to { transform: translateY(0); }
}
```

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Cards won't appear | Column too narrow | Increase `.column` width in CSS |
| Can't drag cards | Drop handler not set up | Check `dragover` has `preventDefault()` |
| Board title won't change | Modal not showing | Check `.board-title-edit-btn` click listener |
| Cards appear in wrong column | Data/DOM out of sync | Verify `renderCard()` after updating `boardsData` |
| Image doesn't show | Invalid URL | Use placeholder URL in test |

---

## 📝 Code Patterns Used

### Pattern 1: Update Data + DOM
```javascript
// ALWAYS DO BOTH!
boardsData.get(boardId).cards.get(columnId).push(card);  // Update data
renderCard(boardId, columnId, card);                     // Update DOM
```

### Pattern 2: Unique ID Generation
```javascript
const uniqueId = 'prefix-' + Date.now();
// Example: 'card-1711353600000'
```

### Pattern 3: Event Prevention
```javascript
e.preventDefault();      // Prevent default browser behavior
e.stopPropagation();     // Prevent event from bubbling up
```

### Pattern 4: Finding Elements
```javascript
document.getElementById('id')              // By ID
document.querySelector('.class')           // By selector
document.querySelectorAll('.class')        // All matching
element.closest('.parent')                 // Find parent
```

---

## 🚀 Next Steps / Enhancements

### Easy to Add
- [ ] Due dates for cards
- [ ] Card priority levels (high/medium/low)
- [ ] Card labels/tags
- [ ] Board background color
- [ ] Keyboard shortcuts (Ctrl+S to save)

### Medium Difficulty
- [ ] LocalStorage (persist data after refresh)
- [ ] Search/filter cards
- [ ] Export board as JSON
- [ ] Undo/Redo functionality

### Harder
- [ ] Backend server (Node.js)
- [ ] Database (MySQL)
- [ ] User authentication
- [ ] Multi-user collaboration
- [ ] Real-time synchronization

---

## 📚 Learning Resources

### JavaScript Concepts Used
- **DOM Manipulation**: Creating/removing elements
- **Event Handling**: Click, drag, form events
- **Data Structures**: Map, Array
- **ES6 Features**: Arrow functions, template literals, const/let

### Browser APIs Used
- **Drag and Drop API**: Moving elements
- **DOM API**: querySelector, addEventListener
- **CSS**: Animations, flexbox, absolute positioning

### Recommended Learning
1. MDN - Drag and Drop API
2. MDN - Maps in JavaScript
3. MDN - Event Delegation
4. CSS-Tricks - Flexbox Guide

---

## 🎯 Testing Checklist

- [ ] Create new board
- [ ] Rename board using ✎ button
- [ ] Drag board to new position
- [ ] Add card to "To Do"
- [ ] Add card with image URL
- [ ] Click card to see details
- [ ] Edit card (from details modal)
- [ ] Delete card (hover × button)
- [ ] Drag card from "To Do" to "Doing"
- [ ] Drag card from "Doing" to "Done"
- [ ] Drag card between different boards
- [ ] Try invalid image URL (should show placeholder)

---

## 💾 Data Format

### Board Object
```javascript
{
    title: String,
    cards: Map {
        'todo': [Cards],
        'doing': [Cards],
        'done': [Cards]
    }
}
```

### Card Object
```javascript
{
    id: String,           // Unique ID
    title: String,        // Card title
    description: String,  // Full text
    imageUrl: String      // Image URL (optional)
}
```

---

## 🔗 File Dependencies

```
index.html
    ├── style.css (styles everything)
    └── script.js (provides all functionality)
        └── Uses HTML elements from index.html
            └── Uses CSS classes from style.css
```

**Loading Order:**
1. HTML loads
2. CSS loaded (styles ready)
3. JS loaded (functionality ready)
4. User can interact

---

## 📞 Debugging Tips

### Using Browser Console (F12)
```javascript
// Check all boards
console.log(boardsData);

// Check specific board
console.log(boardsData.get('board-123'));

// List all cards in "to do" column
boardsData.forEach((board, id) => {
    console.log(id, board.cards.get('todo'));
});

// Add a debug card manually
const board = boardsData.get('board-123');
board.cards.get('todo').push({
    id: 'test-1',
    title: 'Debug Card',
    description: 'Testing',
    imageUrl: ''
});
```

### Check Elements
```javascript
// Is board in DOM?
document.querySelector('.board-container');

// How many cards rendered?
document.querySelectorAll('.card').length;

// Is column a drop zone?
const col = document.querySelector('.column-list');
col ? 'Yes' : 'No';
```

---

## 🎓 Teaching Points

If teaching someone this code, focus on:

1. **Data Structure** - Why we use Map for efficiency
2. **Event Handling** - How JavaScript listens for user actions
3. **Drag & Drop** - The three events (start, over, drop)
4. **Synchronization** - Keeping data and DOM in sync
5. **Closures** - How inner functions remember outer variables
6. **CSS Animations** - Making the UI feel polished

---

**Last Updated:** March 2026
**Version:** 1.0
**Status:** Fully Functional ✅
