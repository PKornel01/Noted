(async function requireLogin() {
    const res = await fetch('/api/me');
    if (!res.ok) window.location.href = '/login.html';
})();
// Base URL for the backend API
const API_BASE_URL = 'http://localhost:3000/api';

// ============================================
// API HELPER FUNCTIONS
// ============================================

// Check if backend API and database are reachable
// Returns true when server responds OK, false otherwise.
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        console.warn('Server not running:', error.message);
        return false;
    }
}

// Fetch all boards (modules) from the server
// Returns an array of board rows or [] on error.
async function fetchBoardsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/boards`);
        if (!response.ok) throw new Error('Failed to fetch boards');
        return await response.json();
    } catch (error) {
        console.error('Error fetching boards:', error);
        return [];
    }
}

// Create a new board row in the DB via POST
// Returns the created row (including insert id) or null on failure.
async function createBoardAPI(title, projectId = 1, data = '', xPos = 0, yPos = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, projectId, data, xPos, yPos })
        });
        if (!response.ok) throw new Error('Failed to create board');
        return await response.json();
    } catch (error) {
        console.error('Error creating board:', error);
        return null;
    }
}

// Update an existing board row via PUT
// boardId is the DB id (not the DOM id)
async function saveBoardAPI(boardId, title, data, xPos = 0, yPos = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, data, xPos, yPos })
        });
        if (!response.ok) throw new Error('Failed to save board');
        return await response.json();
    } catch (error) {
        console.error('Error saving board:', error);
        return null;
    }
}

// Delete a board row using the DB id
async function deleteBoardAPI(boardId) {
    try {
        const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete board');
        return await response.json();
    } catch (error) {
        console.error('Error deleting board:', error);
        return null;
    }
}

// ============================================
// BOARD PERSISTENCE FUNCTIONS
// ============================================

// Persist a board to the database.
// Steps:
// 1) Read the DOM board HTML: boardElement.querySelector('.board').innerHTML
// 2) If no DB id exists, call createBoardAPI to insert and save the db id
// 3) Call saveBoardAPI to update the stored HTML and position
// Note: we store HTML (a blob). Event listeners are not persisted and
// must be re-attached when the board is loaded.
async function persistBoardToDB(boardElement) {
    const boardId = boardElement.id; // DOM id, e.g. 'board-1634234'
    const meta = boardsData.get(boardId) || {};
    const title = meta.title || 'Untitled Board';
    const xPos = parseInt(boardElement.style.left) || 0;
    const yPos = parseInt(boardElement.style.top) || 0;
    const boardHTML = boardElement.querySelector('.board').innerHTML;

    // If this board does not yet have a DB id, create it first
    let dbId = meta.persistentId;
    if (!dbId) {
        const created = await createBoardAPI(title, 1, boardHTML, xPos, yPos);
        if (created && created.id) {
            dbId = created.id;
            // store persistent id for future saves
            boardsData.get(boardId).persistentId = dbId;
            console.log(`🆕 Created board in DB with id=${dbId}`);
        } else {
            console.warn('Could not create board in DB; will retry later');
            return null;
        }
    }

    const result = await saveBoardAPI(dbId, title, boardHTML, xPos, yPos);
    if (result) {
        console.log(`✅ Board "${title}" (db id=${dbId}) saved to database`);
    }
    return result;
}

// Load saved boards from the server and reconstruct interactive UI.
// Important subtleties:
// - The saved HTML blob does not include JS event listeners.
// - We clear column HTML and re-create card nodes with `renderCard`
//   so click/drag/delete handlers are attached.
async function loadBoardsFromDatabase() {
    const boards = await fetchBoardsFromAPI();
    
    boards.forEach(board => {
        const domId = 'board-' + board.id;
        if (!document.getElementById(domId)) {
            const boardWrapper = document.createElement('div');
            boardWrapper.className = 'board-container';
            boardWrapper.id = domId;
            boardWrapper.style.top = (board.yPos || 0) + 'px';
            boardWrapper.style.left = (board.xPos || 0) + 'px';
            
            boardWrapper.innerHTML = `
                <div class="boardHandle">
                    <span class="board-title-text">⠿ ${board.title}</span>
                    <button class="board-title-edit-btn" title="Click to edit board name">✎</button>
                    <button class="board-delete-btn" title="Delete board">🗑</button>
                </div>
                <div class="board">
                    ${board.data || `
                        <div class="column">
                            <h3>To Do</h3>
                            <div class="column-list" data-column="todo"></div>
                            <button class="add-card-btn" data-board="${domId}" data-column="todo">+ Add Card</button>
                        </div>
                        <div class="column">
                            <h3>Doing</h3>
                            <div class="column-list" data-column="doing"></div>
                            <button class="add-card-btn" data-board="${domId}" data-column="doing">+ Add Card</button>
                        </div>
                        <div class="column">
                            <h3>Done</h3>
                            <div class="column-list" data-column="done"></div>
                            <button class="add-card-btn" data-board="${domId}" data-column="done">+ Add Card</button>
                        </div>
                        <div class="column">
                            <h3>Delayed</h3>
                            <div class="column-list" data-column="delayed"></div>
                            <button class="add-card-btn" data-board="${domId}" data-column="delayed">+ Add Card</button>
                        </div>
                    `}
                </div>
            `;

            container.appendChild(boardWrapper);

            // Ensure any add-card buttons inside loaded HTML point to the
            // runtime DOM id for this board (domId). Persisted HTML may
            // contain the original client-side id which won't match.
            const loadedAddBtns = boardWrapper.querySelectorAll('.add-card-btn');
            loadedAddBtns.forEach(b => b.setAttribute('data-board', domId));

            // Reconstruct in-memory data structure from saved DOM
            const cardsMap = new Map([
                ['todo', []],
                ['doing', []],
                ['done', []],
                ['delayed', []]
            ]);

            // For every column-list, gather .card children
            const columnLists = boardWrapper.querySelectorAll('.column-list');
            columnLists.forEach(col => {
                const colName = col.getAttribute('data-column') || 'todo';
                const cardEls = Array.from(col.querySelectorAll('.card'));
                const colCards = cardEls.map(cardEl => {
                    return {
                        id: cardEl.id || ('card-' + Date.now()),
                        title: (cardEl.querySelector('.card-title') && cardEl.querySelector('.card-title').textContent) || 'Untitled',
                        description: cardEl.dataset.cardDesc || '',
                        imageUrl: cardEl.dataset.cardImage || ''
                    };
                });
                cardsMap.set(colName, colCards);
            });

            boardsData.set(domId, {
                cards: cardsMap,
                title: board.title,
                persistentId: board.id
            });

            // Clear any pre-rendered card HTML from the saved `data` and
            // re-render cards using `renderCard` so all event listeners
            // (click, delete, drag) are properly attached.
            const listsToRender = boardWrapper.querySelectorAll('.column-list');
            listsToRender.forEach(listEl => {
                const colName = listEl.getAttribute('data-column') || 'todo';
                // Remove any existing children that came from the saved HTML
                listEl.innerHTML = '';
                const cardsForCol = cardsMap.get(colName) || [];
                cardsForCol.forEach(cardObj => {
                    renderCard(domId, colName, cardObj);
                });
            });

            attachAddCardListeners(domId);
            attachBoardControlsListeners(domId);
            makeElementMovable(boardWrapper);
        }
    });
}

// ============================================
//----------------------------------------------------------------------------------------------------------

// Main controls in the page
const btn = document.getElementById('kanbanmaker');
const container = document.getElementById('sheet');

// Runtime in-memory store for boards and cards.
// Key: DOM id like 'board-123' -> value: { cards: Map(column->Array), title, persistentId }
const boardsData = new Map(); // boardId -> { cards: Map(columnId -> [cards]) }


// Load boards when page opens
// App entry: when DOM is ready, check API and load boards if available.
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Checking if server is running...');
    
    const serverRunning = await checkAPIHealth();
    if (!serverRunning) {
        console.warn('⚠️ Server not running. Using offline mode (data will not persist).');
    } else {
        console.log('✅ Server connected. Loading boards from database...');
        await loadBoardsFromDatabase();
        console.log('Boards loaded successfully');
    }
});

// Create a new board when the "kanbanmaker" button is clicked
btn.addEventListener('click', async () => {
    // Create a unique ID for this board
    const boardId = 'board-' + Date.now();

    // Create a unique wrapper for this specific board
    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'board-container';
    boardWrapper.id = boardId;
    
    // Set a starting position so they don't all stack perfectly on top of each other
    boardWrapper.style.top = (100 + (document.querySelectorAll('.board-container').length * 20)) + "px";
    boardWrapper.style.left = (100 + (document.querySelectorAll('.board-container').length * 20)) + "px";

    boardWrapper.innerHTML = `
        <div class="boardHandle">
            <span class="board-title-text">⠿ Drag Board Here</span>
            <button class="board-title-edit-btn" title="Click to edit board name">✎</button>
            <button class="board-delete-btn" title="Delete board">🗑</button>
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
            <div class="column">
                <h3>Delayed</h3>
                <div class="column-list" data-column="delayed"></div>
                <button class="add-card-btn" data-board="${boardId}" data-column="delayed">+ Add Card</button>
            </div>
        </div>
    `;

    container.appendChild(boardWrapper);

    // Initialize board data storage
    boardsData.set(boardId, {
        cards: new Map([
            ['todo', []],
            ['doing', []],
            ['done', []],
            ['delayed', []],
        ]),
        title: 'Drag Board Here'
    });
    
        // Attach event listeners for controls and add-card buttons
        attachAddCardListeners(boardId);
        attachBoardControlsListeners(boardId);
    
    // Initialize the movement logic after creating the element
    makeElementMovable(boardWrapper);
    
    // Save the new board to database
    await persistBoardToDB(boardWrapper);
});

// ============================================
// BOARD TITLE EDITING
// ============================================

// Small helper: open the title edit modal when edit button clicked
function attachBoardTitleEditListener(boardId) {
    const boardElement = document.getElementById(boardId);
    const editBtn = boardElement.querySelector('.board-title-edit-btn');
    const titleText = boardElement.querySelector('.board-title-text');
    
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent board from being dragged
        openBoardTitleEditModal(boardId, titleText);
    });
}

// Attach board controls: title edit + delete
// Attach listeners for board-level controls: edit title, delete board
function attachBoardControlsListeners(boardId) {
    const boardElement = document.getElementById(boardId);
    if (!boardElement) return;

    const editBtn = boardElement.querySelector('.board-title-edit-btn');
    const deleteBtn = boardElement.querySelector('.board-delete-btn');
    const titleText = boardElement.querySelector('.board-title-text');

    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openBoardTitleEditModal(boardId, titleText);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteBoardFromUI(boardId);
        });
    }
}

async function deleteBoardFromUI(boardDomId) {
    const meta = boardsData.get(boardDomId) || {};
    const dbId = meta.persistentId;

    // Remove DOM immediately for responsiveness
    const el = document.getElementById(boardDomId);
    if (el) el.remove();

    // Remove from memory
    boardsData.delete(boardDomId);

    if (dbId) {
        const result = await deleteBoardAPI(dbId);
        if (result && result.success) {
            console.log(`🗑️ Deleted board db id=${dbId}`);
        } else {
            console.warn(`Failed to delete board db id=${dbId}`);
        }
    }
}

// Show a modal to edit the board title, update `boardsData` and persist
function openBoardTitleEditModal(boardId, titleElement) {
    const currentTitle = boardsData.get(boardId).title;
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal';
    modalOverlay.style.display = 'block';

    modalOverlay.innerHTML = `
        <div class="form-modal-content">
            <h2>Edit Board Title</h2>
            <form id="editBoardTitleForm">
                <div class="form-group">
                    <label for="boardTitleInput">Board Title: (Max 50 characters)</label>
                    <input type="text" id="boardTitleInput" value="${currentTitle}" required>
                </div>
                <div class="form-buttons">
                    <button type="button" class="form-cancel-btn">Cancel</button>
                    <button type="submit" class="form-submit-btn">Save</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    const form = modalOverlay.querySelector('#editBoardTitleForm');
    const input = modalOverlay.querySelector('#boardTitleInput');
    
    // Focus and select the input
    input.focus();
    input.select();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newTitle = input.value.trim();
        
        if (newTitle) {
            // Update data
            boardsData.get(boardId).title = newTitle;
            
            // Update DOM
            titleElement.textContent = '⠿ ' + newTitle;
            
            // Save to database
            const boardElement = document.getElementById(boardId);
            await persistBoardToDB(boardElement);
            
            // Close modal
            document.body.removeChild(modalOverlay);
        }
    });

    // Handle cancel button
    const cancelBtn = modalOverlay.querySelector('.form-cancel-btn');
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });

    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });

    const boardTitleMaxLength = 50; // Limit title to 50 characters
    document.getElementById('boardTitleInput').addEventListener('input', function() {
        if (this.value.length > boardTitleMaxLength) {
            this.value = this.value.slice(0, boardTitleMaxLength);
        }
    });
}

// ============================================
// ADD CARD FUNCTIONALITY
// ============================================



// Find all + Add Card buttons for the given board and attach handlers
function attachAddCardListeners(boardId) {
    const buttons = document.querySelectorAll(`[data-board="${boardId}"].add-card-btn`);
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const columnId = btn.getAttribute('data-column');
            openAddCardModal(boardId, columnId);
        });
    });
}

// Show modal that collects card title/description/image and creates a card
function openAddCardModal(boardId, columnId) {

    

    // Create modal for adding a new card
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal';
    modalOverlay.style.display = 'block';

    modalOverlay.innerHTML = `
        <div class="form-modal-content">
            <h2>Add New Card</h2>
            <form id="addCardForm">
                <div class="form-group">
                    <label for="cardTitle">Card Title: (Max 15 characters)</label>
                    <input type="text" id="cardTitle" placeholder="Enter card title" required>
                </div>
                <div class="form-group">
                    <label for="cardDescription">Description: (Max 150 characters)</label>
                    <textarea id="cardDescription" placeholder="Enter card description"></textarea>
                </div>
                <div class="form-group">
                    <label for="cardImage">Image URL:</label>
                    <input type="url" id="cardImage" placeholder="https://example.com/image.jpg">
                </div>
                <div class="form-buttons">
                    <button type="button" class="form-cancel-btn">Cancel</button>
                    <button type="submit" class="form-submit-btn">Add Card</button>
                </div>
            </form>
        </div>
    `;

    

    document.body.appendChild(modalOverlay);

    // Handle form submission
    const form = modalOverlay.querySelector('#addCardForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('cardTitle').value;
        const description = document.getElementById('cardDescription').value;
        const imageUrl = document.getElementById('cardImage').value;

        // Create the new card
        const newCard = {
            id: 'card-' + Date.now(),
            title: title,
            description: description,
            imageUrl: imageUrl
        };

        // Add to board data
        boardsData.get(boardId).cards.get(columnId).push(newCard);

        // Render the card
        renderCard(boardId, columnId, newCard);

        // Save board to database
        const boardElement = document.getElementById(boardId);
        await persistBoardToDB(boardElement);

        // Close modal
        document.body.removeChild(modalOverlay);
    });

    // Handle cancel button
    const cancelBtn = modalOverlay.querySelector('.form-cancel-btn');
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });

    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });

    const cardTitleMaxLength = 15; // Limit title to 15 characters
    document.getElementById('cardTitle').addEventListener('input', function() {
        if (this.value.length > cardTitleMaxLength) {
            this.value = this.value.slice(0, cardTitleMaxLength);
        }
    });

    const cardDescriptionMaxLength = 150; // Limit description to 150 characters
    document.getElementById('cardDescription').addEventListener('input', function() {
        if (this.value.length > cardDescriptionMaxLength) {
            this.value = this.value.slice(0, cardDescriptionMaxLength);
        }
    });
}

// ============================================
// RENDER CARD
// ============================================

// Render a single card object into the DOM, attach all card handlers
// This function must be used for cards coming from saved HTML so event
// listeners and dataset attributes are created.
function renderCard(boardId, columnId, card) {
    const columnList = document.querySelector(`#${boardId} [data-column="${columnId}"].column-list`);
    
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.id = card.id;
    cardElement.draggable = true; // Make card draggable
    cardElement.innerHTML = `
        <button class="card-delete-btn">×</button>
        <div class="card-title">${card.title}</div>
    `;

    // Store the board ID and column ID on the card element for drag-drop
    cardElement.dataset.boardId = boardId;
    cardElement.dataset.columnId = columnId;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.cardDesc = card.description || '';
    cardElement.dataset.cardImage = card.imageUrl || '';

    // Click card to view details
    cardElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-delete-btn')) return;
        openCardDetailsModal(boardId, columnId, card);
    });

    // Delete card button
    const deleteBtn = cardElement.querySelector('.card-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCard(boardId, columnId, card.id);
    });

    // Drag and drop events
    cardElement.addEventListener('dragstart', handleCardDragStart);
    cardElement.addEventListener('dragend', handleCardDragEnd);

    columnList.appendChild(cardElement);
    
    // Update board height after card is added
    updateBoardHeight(boardId);
}

// ============================================
// CARD DETAILS MODAL
// ============================================

// Show a details modal for a card (view image, description, delete)
function openCardDetailsModal(boardId, columnId, card) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal';
    modalOverlay.style.display = 'block';

    let imageHtml = '';
    if (card.imageUrl) {
        imageHtml = `<img src="${card.imageUrl}" alt="Card image" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Not+Found'">`;
    }

    const descriptionText = card.description || 'No description provided';
    // Convert newlines to <br> tags and escape HTML
    const formattedDescription = descriptionText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

    modalOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">${card.title}</div>
            <div class="modal-body">
                ${imageHtml}
                <p class="card-description-formatted" style="
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    line-height: 1.6;
                    max-width: 100%;
                    padding: 12px 0;
                    margin: 8px 0;
                    font-size: 14px;
                    color: #333;
                ">${formattedDescription}</p>
            </div>
            <div class="modal-buttons">
                <button class="modal-close-btn">Close</button>
                <button class="modal-delete-btn">Delete Card</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    // Close button
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });

    // Delete button in details modal
    const deleteBtn = modalOverlay.querySelector('.modal-delete-btn');
    deleteBtn.addEventListener('click', () => {
        deleteCard(boardId, columnId, card.id);
        document.body.removeChild(modalOverlay);
    });

    // Close when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}

// ============================================
// DELETE CARD
// ============================================

// Remove a card from both the in-memory store and the DOM, then persist
async function deleteCard(boardId, columnId, cardId) {
    // Remove from data
    const cards = boardsData.get(boardId).cards.get(columnId);
    const index = cards.findIndex(c => c.id === cardId);
    if (index > -1) {
        cards.splice(index, 1);
    }

    // Remove from DOM
    const cardElement = document.getElementById(cardId);
    if (cardElement) {
        cardElement.remove();
    }
    
    // Update board height after card is deleted
    updateBoardHeight(boardId);
    
    // Save board to database
    const boardElement = document.getElementById(boardId);
    await persistBoardToDB(boardElement);
}

// ============================================
// AUTO-EXPAND BOARD
// ============================================

// Adjust the board's minHeight based on its columns' content
function updateBoardHeight(boardId) {
    const boardElement = document.getElementById(boardId).querySelector('.board');
    if (!boardElement) return;
    
    // Get all columns in the board
    const columns = boardElement.querySelectorAll('.column');
    
    // Find the maximum height needed
    let maxHeight = 400; // Minimum height
    
    columns.forEach(column => {
        const columnList = column.querySelector('.column-list');
        if (columnList) {
            // Calculate required height:
            // column header (30px) + column list content + button (30px) + padding/gaps (40px)
            const contentHeight = columnList.scrollHeight + 100;
            maxHeight = Math.max(maxHeight, contentHeight);
        }
    });
    
    // Apply the new height with smooth transition
    boardElement.style.minHeight = maxHeight + 'px';
}

// ============================================
// MAKE ELEMENT MOVABLE
// ============================================

// Global variable to track which card is being dragged
let draggedCard = null;

// When user starts dragging a card, remember which card it is
function handleCardDragStart(e) {
    draggedCard = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

// Reset style when dragging ends
function handleCardDragEnd(e) {
    this.style.opacity = '1';
}

// Attach drag-drop listeners to column lists
// Attach drag/drop listeners to all column lists inside a board
function attachColumnDropListeners(boardId) {
    const columnLists = document.querySelectorAll(`#${boardId} .column-list`);
    
    columnLists.forEach(columnList => {
        columnList.addEventListener('dragover', handleDragOver);
        columnList.addEventListener('drop', handleCardDrop);
        columnList.addEventListener('dragleave', handleDragLeave);
    });
}

// Visual feedback for dragover
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.style.backgroundColor = '#d0e8f2'; // Highlight on drag over
}

// Reset column background when drag leaves
function handleDragLeave(e) {
    this.style.backgroundColor = '#e8e8e8'; // Reset color when leaving
}

// Handle card drop into a column: move data in `boardsData`, re-render
function handleCardDrop(e) {
    e.preventDefault();
    this.style.backgroundColor = '#e8e8e8'; // Reset color

    if (!draggedCard) return;

    const fromBoardId = draggedCard.dataset.boardId;
    const fromColumnId = draggedCard.dataset.columnId;
    const cardId = draggedCard.dataset.cardId;
    
    const toBoardId = this.closest('.board-container').id;
    const toColumnId = this.getAttribute('data-column');

    // Prevent dropping on the same column
    if (fromBoardId === toBoardId && fromColumnId === toColumnId) {
        draggedCard = null;
        return;
    }

    //Prevent dropping on a different board
    if (fromBoardId !== toBoardId) {
        draggedCard = null;
        return;
    }

    // Get the card data
    const cardData = boardsData.get(fromBoardId).cards.get(fromColumnId);
    const cardIndex = cardData.findIndex(c => c.id === cardId);
    
    if (cardIndex > -1) {
        // Remove from source column
        const card = cardData.splice(cardIndex, 1)[0];
        
        // Add to destination column
        boardsData.get(toBoardId).cards.get(toColumnId).push(card);
        
        // Remove from DOM
        draggedCard.remove();
        
        // Update source board height after removal
        updateBoardHeight(fromBoardId);
        
        // Render in new column
        renderCard(toBoardId, toColumnId, card);
        
        // Re-attach drop listeners to the destination board
        attachColumnDropListeners(toBoardId);
        
        // Save board to database
        const boardElement = document.getElementById(toBoardId);
        persistBoardToDB(boardElement);
    }

    draggedCard = null;
}

// Make the entire board draggable by its handle and persist position
function makeElementMovable(elmnt) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const handle = elmnt.querySelector('.boardHandle');

  if (handle) {
    // If present, the handle is where you move the DIV from:
    handle.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e.preventDefault();

    // 1. Get all boards on the page
    const allBoards = document.querySelectorAll('.board-container');

    // 2. Set all boards to a lower baseline z-index
    allBoards.forEach(board => {
        board.style.zIndex = "1"; 
    });

    // 3. Set THIS specific board to a much higher value
    elmnt.style.zIndex = "5";

    // Get mouse position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call function whenever cursor moves
    document.onmousemove = elementDrag;

  }

  function elementDrag(e) {
    e.preventDefault();
    // Calculate new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";

  }

  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
    
    // Save board position to database
    persistBoardToDB(elmnt);
  }

  // Attach drop listeners for cards in this board
  attachColumnDropListeners(elmnt.id);
}