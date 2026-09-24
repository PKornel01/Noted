# Kanban Board - Visual & Diagram Guide

This guide uses ASCII diagrams to visualize how the application works.

---

## Table of Contents
1. [Application Layout](#application-layout)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Feature Workflows](#feature-workflows)
4. [JavaScript Function Map](#javascript-function-map)
5. [Event Flow Charts](#event-flow-charts)

---

## Application Layout

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Window                          │
├──────────┬────────────────────────────────────────────────────┤
│ SIDEBAR  │                      MAIN CONTENT                   │
│          │                                                       │
│  [+NEW]  │  ┌──────────────────────┐  ┌──────────────────────┐ │
│  BOARD   │  │   BOARD 1: Sprint    │  │   BOARD 2: Bugs    │ │
│          │  │  ✎ [Edit Title]     │  │  ✎ [Edit Title]    │ │
│  ────    │  │  ═══════════════════│  │ ══════════════════ │ │
│          │  │ TO DO │ DOING│ DONE │  │TO DO│DOING│DONE   │ │
│          │  │───────┼──────┼──────│  │─────┼─────┼────  │ │
│          │  │[Card1]│[Card3]│      │  │     │     │      │ │
│          │  │[Card2]│       │      │  │     │     │      │ │
│          │  │       │       │      │  │     │     │      │ │
│          │  │ [+ADD]│ [+ADD]│[+ADD]│  │[+AD]│[+AD]│[+ADD]│ │
│          │  │       │       │      │  │     │     │      │ │
│          │  └──────────────────────┘  └──────────────────────┘ │
│          │                                                       │
└──────────┴────────────────────────────────────────────────────┘
```

### Sidebar
```
┌──────────────┐
│   SIDEBAR    │  Width: 100px
│   (Fixed)    │  Position: fixed
│              │  Background: Dark gray
├──────────────┤
│              │
│   [+ NEW]    │  ← Click to create board
│    BOARD     │
│              │
└──────────────┘
```

### Single Board
```
┌──────────────────────────────────┐
│ ⠿ Board Title         [✎][🗑️]    │  ← Drag from here
├──────────────────────────────────┤
│  [TO DO]   [DOING]    [DONE]     │
│  ────────  ────────   ────────   │
│  ┌──────┐  ┌──────┐   ┌──────┐  │
│  │Card  │  │Card  │   │Card  │  │
│  │ 1    │  │  3   │   │  4   │  │
│  │[×]   │  │[×]   │   │[×]   │  │
│  └──────┘  └──────┘   └──────┘  │
│  ┌──────┐                        │
│  │Card  │                        │
│  │  2   │                        │
│  │[×]   │                        │
│  └──────┘                        │
│  [+ ADD]   [+ ADD]   [+ ADD]     │
└──────────────────────────────────┘
```

---

## Data Flow Diagrams

### Data Structure Hierarchy
```
┌─────────────────────────────────────────────────────────────┐
│                      boardsData (Map)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  board-123                      board-456                   │
│  ┌────────────────────┐        ┌────────────────────┐      │
│  │ title: "Sprint 1"  │        │ title: "Bugs"      │      │
│  │ cards: (Map)       │        │ cards: (Map)       │      │
│  │                    │        │                    │      │
│  │  todo: [          │        │  todo: [          │      │
│  │    {              │        │    {              │      │
│  │      id: 'c1'    │        │      id: 'c5'     │      │
│  │      title: '...'│        │      title: '...' │      │
│  │      desc: '...' │        │      desc: '...'  │      │
│  │      image: '...'│        │      image: '...' │      │
│  │    }             │        │    }              │      │
│  │  ]              │        │  ]               │      │
│  │                    │        │                    │      │
│  │  doing: [...]      │        │  doing: [...]      │      │
│  │  done: [...]       │        │  done: [...]       │      │
│  │                    │        │                    │      │
│  └────────────────────┘        └────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Creating a Board (Data Flow)
```
┌──────────────────────────────────────────┐
│ User clicks "+ New Board" button         │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ Generate unique ID:                      │
│ boardId = 'board-' + Date.now()         │
│ Example: 'board-1711353600000'           │
└──────────────────┬───────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     │                           │
     ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ Create DOM:      │      │ Create Data:     │
│ • HTML structure │      │ boardsData.set() │
│ • Add to page    │      │ Initialize cards │
│ • Add listeners  │      │ Set title        │
└──────────────────┘      └──────────────────┘
     │                           │
     └─────────────┬─────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Board visible and    │
        │ fully functional     │
        └──────────────────────┘
```

### Adding a Card (Data → DOM Sync)
```
User Action (Click + Add Card button)
        │
        ▼
    ┌─────────────────────────────┐
    │ Modal Form Opens            │
    │ • Title input               │
    │ • Description input         │
    │ • Image URL input           │
    └─────────────────────────────┘
        │
        │ (User fills form)
        │
        ▼
    Form Submit Event
        │
        ├─► e.preventDefault() (stop reload)
        │
        ├─► Get form values
        │   • title
        │   • description
        │   • imageUrl
        │
        ├─► Create card object
        │   { id, title, description, imageUrl }
        │
        ├─────────────────────────────────────────┐
        │                                         │
        ▼                                         ▼
    ┌──────────────────────────┐      ┌──────────────────────────┐
    │ UPDATE DATA STRUCTURE    │      │ UPDATE VISUAL (DOM)      │
    │                          │      │                          │
    │ boardsData               │      │ renderCard():            │
    │ .get(boardId)            │      │ • Create card element    │
    │ .cards                   │      │ • Add CSS class          │
    │ .get(columnId)           │      │ • Add event listeners    │
    │ .push(newCard)           │      │ • Append to column       │
    │                          │      │                          │
    └──────────────────────────┘      └──────────────────────────┘
        │                                     │
        └─────────────────┬───────────────────┘
                          │
                          ▼
                ┌──────────────────────┐
                │ DATA = DOM ✓         │
                │ (Synchronized)       │
                │                      │
                │ Close modal          │
                │ Card is visible      │
                └──────────────────────┘
```

---

## Feature Workflows

### Creating & Moving a Board
```
BEFORE:                          AFTER:
┌────────────────────────┐      ┌────────────────────────┐
│ Board at (100, 100)    │      │ Board at (250, 300)    │
└────────────────────────┘      └────────────────────────┘
          │                                  │
          └──────────────────────────────────┘
              User drags board header


DRAG SEQUENCE:
└─────────────────────────────────────────────────┐
│ 1. mousedown event on header                    │
│    • Save starting position (pos3, pos4)        │
│    • Raise z-index to 5                         │
│                                                  │
│ 2. mousemove events (repeat many times)         │
│    • Calculate: pos1 = pos3 - currentX          │
│    • Calculate: pos2 = pos4 - currentY          │
│    • Update: board.style.top/left               │
│    • Board follows mouse                        │
│                                                  │
│ 3. mouseup event                                │
│    • Stop listening to mousemove                │
│    • Board stays in final position              │
└─────────────────────────────────────────────────┘
```

### Moving a Card Between Columns
```
INITIAL STATE:
┌──────────────────────────────────────┐
│ TO DO       │ DOING      │ DONE       │
│ ┌────────┐  │            │            │
│ │ Task 1 │  │            │            │
│ └────────┘  │            │            │
│             │            │            │
└──────────────────────────────────────┘

ACTION: Drag Task 1 from TO DO to DOING

DRAG SEQUENCE:
┌──────────────────────────────────────────────────────────┐
│ dragstart: │ dragover: │  dragover: │ drop:             │
│            │           │            │                   │
│ Task 1     │ DOING     │ DOING      │ Update data:      │
│ becomes    │ column    │ column     │ • Remove from     │
│ 50%        │ highlights│ highlights │   TO DO array     │
│ transparent│ (light    │ (light     │ • Add to DOING    │
│            │  blue)    │ blue)      │   array           │
│            │           │            │                   │
│            │           │            │ Update DOM:       │
│            │           │            │ • Remove Task 1   │
│            │           │            │   from TO DO      │
│            │           │            │ • Render Task 1   │
│            │           │            │   in DOING        │
└──────────────────────────────────────────────────────────┘

FINAL STATE:
┌──────────────────────────────────────┐
│ TO DO       │ DOING      │ DONE       │
│             │ ┌────────┐  │            │
│             │ │ Task 1 │  │            │
│             │ └────────┘  │            │
│             │            │            │
└──────────────────────────────────────┘
```

### Viewing Card Details (Modal)
```
CARD VISIBLE:                   MODAL APPEARS:
┌──────────────────────┐       ┌────────────────────────────────┐
│ TO DO                │       │ OVERLAY: black background       │
│ ┌──────────────┐     │       │ (semi-transparent)              │
│ │ ┌──────────┐ │     │       │ ┌──────────────────────────────┐│
│ │ │  Task 1  │ │────┼───►   │ │ MODAL WINDOW:                  ││
│ │ │ [×]      │ │     │       │ │ ┌────────────────────────────┐││
│ │ └──────────┘ │     │       │ │ │ Task 1                     │││
│ └──────────────┘     │       │ │ │ ══════════════════════════ │││
│                      │       │ │ │ [Task image here]          │││
└──────────────────────┘       │ │ │                            │││
                               │ │ │ Full description:          │││
                               │ │ │ This is a detailed...      │││
                               │ │ │                            │││
                               │ │ │ [Close]  [Delete]          │││
                               │ │ └────────────────────────────┘││
                               │ └──────────────────────────────┘│
                               └────────────────────────────────┘
```

---

## JavaScript Function Map

### Function Organization
```
┌─────────────────────────────────────────────────────────────┐
│                     GLOBAL SCOPE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  const boardsData = new Map()    ← Data storage           │
│  let draggedCard = null          ← Drag state             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                   EVENT LISTENERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  btn.addEventListener('click', () => {...})                │
│  │                                                          │
│  ├─► attachAddCardListeners()                              │
│  ├─► attachBoardTitleEditListener()                        │
│  └─► makeElementMovable()                                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│              BOARD MANAGEMENT FUNCTIONS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ├─ attachBoardTitleEditListener()                          │
│  │  └─ openBoardTitleEditModal()                            │
│  │                                                          │
│  └─ makeElementMovable()                                    │
│     ├─ dragMouseDown()                                      │
│     ├─ elementDrag()                                        │
│     └─ closeDragElement()                                   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                CARD MANAGEMENT FUNCTIONS                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ├─ attachAddCardListeners()                                │
│  │  └─ openAddCardModal()                                   │
│  │                                                          │
│  ├─ renderCard()                                            │
│  │  └─ Adds click & delete listeners                        │
│  │                                                          │
│  ├─ openCardDetailsModal()                                  │
│  │                                                          │
│  └─ deleteCard()                                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│              DRAG & DROP FUNCTIONS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ├─ handleCardDragStart()                                   │
│  ├─ handleCardDragEnd()                                     │
│  ├─ handleDragOver()                                        │
│  ├─ handleCardDrop()                                        │
│  │                                                          │
│  └─ attachColumnDropListeners()                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Function Call Hierarchy
```
btn.addEventListener('click')
    │
    ├─► Create board HTML
    │
    ├─► Store in boardsData
    │
    ├─► attachAddCardListeners(boardId)
    │   └─► (click listener for each add card button)
    │       └─► openAddCardModal()
    │           ├─► form.addEventListener('submit')
    │           │   └─► renderCard()
    │           │       ├─► cardElement.addEventListener('click')
    │           │       │   └─► openCardDetailsModal()
    │           │       │
    │           │       ├─► deleteBtn.addEventListener('click')
    │           │       │   └─► deleteCard()
    │           │       │
    │           │       ├─► cardElement.addEventListener('dragstart')
    │           │       │   └─► handleCardDragStart()
    │           │       │
    │           │       └─► cardElement.addEventListener('dragend')
    │           │           └─► handleCardDragEnd()
    │           │
    │           └─► (cancel button listener)
    │
    ├─► attachBoardTitleEditListener(boardId)
    │   └─► editBtn.addEventListener('click')
    │       └─► openBoardTitleEditModal()
    │           └─► form.addEventListener('submit')
    │               └─► Update boardsData & DOM
    │
    └─► makeElementMovable(boardWrapper)
        ├─► handle.onmousedown = dragMouseDown
        │   ├─► document.onmousemove = elementDrag
        │   └─► document.onmouseup = closeDragElement
        │
        └─► attachColumnDropListeners(boardId)
            └─► columnList.addEventListener('dragover')
            └─► columnList.addEventListener('drop')
                └─► handleCardDrop()
                    ├─► Remove card from source
                    ├─► Add card to destination
                    ├─► Remove from DOM
                    ├─► renderCard() in new location
                    └─► Re-attach drop listeners
```

---

## Event Flow Charts

### Complete Event Flow for Adding Card

```
STEP 1: User clicks "+ Add Card" button
┌─────────────────────────────┐
│ Event: click                │
│ Target: .add-card-btn       │
│ Handler: Arrow function     │
│ Action: Get boardId,        │
│         Get columnId        │
│         Call openAddCardModal()
└──────────────┬──────────────┘
               │
STEP 2: openAddCardModal() runs
┌──────────────────────────────────┐
│ Creates modal with form           │
│ Appends to document.body          │
│ Modal now visible on page         │
└──────────────┬────────────────────┘
               │
STEP 3: User fills form
┌──────────────────────────────────┐
│ User types in input fields:      │
│ • Card Title                     │
│ • Description                    │
│ • Image URL                      │
└──────────────┬────────────────────┘
               │
STEP 4: User clicks "Add Card" button
┌──────────────────────────────────┐
│ Event: submit (form)             │
│ Handler: form.addEventListener() │
│ Action: Prevent default reload   │
│         Get form values          │
│         Create card object       │
└──────────────┬────────────────────┘
               │
STEP 5: Update data
┌──────────────────────────────────┐
│ boardsData.get(boardId)          │
│   .cards.get(columnId)           │
│   .push(newCard)                 │
│ Card stored in memory            │
└──────────────┬────────────────────┘
               │
STEP 6: Render card visually
┌──────────────────────────────────┐
│ renderCard(boardId, columnId,    │
│             card)                │
│ • Create div element             │
│ • Add CSS classes                │
│ • Add event listeners            │
│ • Append to column               │
│ Card now visible on page         │
└──────────────┬────────────────────┘
               │
STEP 7: Close modal
┌──────────────────────────────────┐
│ document.body.removeChild()      │
│ Modal removed from page          │
│ Back to normal board view        │
└──────────────────────────────────┘
```

### Complete Event Flow for Dragging Card

```
SEQUENCE                          STATE

User positions mouse on card
│
▼
┌─────────────────────────────────────────────────┐
│ mousedown event fires                           │
│ • dragstart event triggered                     │
│ • draggedCard = this (save reference)          │
│ • card.style.opacity = '0.5' (fade)            │
│ Status: User holding card                       │
└────────────────┬────────────────────────────────┘
                 │
User moves mouse over columns
│
▼
┌─────────────────────────────────────────────────┐
│ dragover events fire repeatedly                 │
│ • e.preventDefault() (CRITICAL!)                │
│ • column.style.backgroundColor = light blue    │
│ Status: Card semi-transparent, column glowing  │
└────────────────┬────────────────────────────────┘
                 │
User releases mouse over column
│
▼
┌─────────────────────────────────────────────────┐
│ drop event fires                                │
│ • Get source board & column                     │
│ • Get destination board & column                │
│ • Check not same location                       │
│ • Find card in data                             │
│ • Remove from source array                      │
│ • Add to destination array                      │
│ • Remove card from DOM                          │
│ • Render card in new column                     │
│ • Re-attach drop listeners                      │
│ Status: Card moved, data synchronized          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ dragend event fires                             │
│ • card.style.opacity = '1' (restore)           │
│ Status: Back to normal                          │
└─────────────────────────────────────────────────┘
```

---

## CSS Cascade

### Styling Priority
```
Inline Styles (highest priority)
│
├─ element.style.opacity = '0.5'
│
▼
Selector Specificity
│
├─ #kanbanmaker (ID selector)
│ └─ .board-container (class selector)
│    └─ div (element selector) (lowest priority)
│
▼
Cascade Order (in CSS file)
│
├─ Earlier rules can be overridden
│ by later rules with same specificity
│
└─ .card:hover overrides .card

Media Queries (applies if condition met)
│
├─ @media (max-width: 768px)
│
▼
Final Computed Style
│
└─ What browser actually renders
```

---

## Performance Diagram

### Memory Usage
```
Browser RAM
┌──────────────────────────────────────┐
│                                      │
│  boardsData (Map)                    │
│  ├─ board-1 → {...}  (100 bytes)    │
│  ├─ board-2 → {...}  (100 bytes)    │
│  └─ board-3 → {...}  (100 bytes)    │
│                                      │
│  DOM Elements                        │
│  ├─ Boards (3) × small overhead     │
│  ├─ Columns (9) × small overhead    │
│  ├─ Cards (100) × small overhead    │
│  └─ Modals (0 when closed)          │
│                                      │
│  Event Listeners (many, lightweight) │
│                                      │
│  Total: Usually < 1 MB for typical  │
│         board configurations        │
│                                      │
└──────────────────────────────────────┘

Data per Card: ~200 bytes
Example:
  100 cards × 200 bytes = 20 KB
  1000 cards × 200 bytes = 200 KB
  10000 cards × 200 bytes = 2 MB
```

---

## Browser Compatibility Matrix

```
┌─────────────┬─────────┬─────────┬─────────┬─────────┐
│ Feature     │ Chrome  │ Firefox │ Safari  │ Edge    │
├─────────────┼─────────┼─────────┼─────────┼─────────┤
│ ES6         │ 65+     │ 60+     │ 12+     │ 79+     │
│ Map/Set     │ 51+     │ 24+     │ 10+     │ 15+     │
│ Drag/Drop   │ All     │ All     │ All     │ All     │
│ Flexbox     │ 52+     │ 28+     │ 10.1+   │ 12+     │
│ Animations  │ All     │ All     │ All     │ All     │
│ Template    │ 41+     │ 34+     │ 9.1+    │ 12+     │
│ Literals    │         │         │         │         │
│ querySelector│ 10+     │ 3.5+    │ 3.1+    │ All     │
└─────────────┴─────────┴─────────┴─────────┴─────────┘

✓ = Fully supported
✗ = Not supported
○ = Partially supported
```

---

## Synchronization Guarantee

```
Invariant: At all times, data === display

Safe Operation Pattern:
┌──────────────────────────────────────┐
│ 1. Validate input                   │
│ 2. Update data structure (RAM)       │
│ 3. Update DOM (visual)              │
│ 4. Verify sync (assertions)         │
│ 5. Continue                         │
└──────────────────────────────────────┘

Example: Adding card
┌──────────────────────────────────────┐
│ boardsData.get(boardId)             │
│ .cards.get(columnId)                │
│ .push(newCard)              ← Data  │
│                                      │
│ renderCard(...)             ← Visual│
│                                      │
│ // Now guaranteed in sync ✓         │
└──────────────────────────────────────┘

Anti-Pattern (WRONG):
┌──────────────────────────────────────┐
│ boardsData.get(...).push(newCard)   │
│ // STOP! User might see nothing     │
│ // if DOM update fails             │
│                                      │
│ renderCard(...) // Too late!        │
└──────────────────────────────────────┘
```

---

## Debugging Workflow

```
Issue Detected
│
▼
┌────────────────────────────────────────────┐
│ Step 1: Reproduce issue                    │
│ • What action causes it?                   │
│ • Always happens?                          │
│ • Works in specific browsers?              │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ Step 2: Check browser console (F12)        │
│ • Any JavaScript errors?                   │
│ • Any network errors?                      │
│ • Any warnings?                            │
└────────────────┬───────────────────────────┘
                 │
                 ├─► Error? → Fix error
                 ├─► Warning? → Investigate
                 └─► Nothing? → Continue
                 │
                 ▼
┌────────────────────────────────────────────┐
│ Step 3: Check data (in console)            │
│ • console.log(boardsData)                  │
│ • Is data structure valid?                 │
│ • Are values expected?                     │
└────────────────┬───────────────────────────┘
                 │
                 ├─► Bad data? → Find where it changed
                 └─► Good data? → Continue
                 │
                 ▼
┌────────────────────────────────────────────┐
│ Step 4: Check DOM (in console)             │
│ • document.querySelector(...)              │
│ • Is element there?                        │
│ • Is CSS applied?                          │
│ • Are values correct?                      │
└────────────────┬───────────────────────────┘
                 │
                 ├─► Missing? → Check append code
                 ├─► Wrong CSS? → Check style.css
                 └─► Wrong value? → Check update code
                 │
                 ▼
┌────────────────────────────────────────────┐
│ Step 5: Add debug logging                  │
│ • console.log() at key points              │
│ • Trace execution flow                     │
│ • Identify where it diverges               │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ Step 6: Fix identified issue               │
│ • Modify code                              │
│ • Test fix                                 │
│ • Verify no side effects                   │
└────────────────────────────────────────────┘
```

---

**Visual guides complete! Use these diagrams to understand the flow of your application.**
