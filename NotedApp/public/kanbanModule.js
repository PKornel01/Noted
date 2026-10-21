//Api health check
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        console.warn('Server not running:', error.message);
        return false;
    }
}

//---API helper functions---//
// Fetch all board modules from the server
async function fetchBoardsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/boards?projectId=${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch boards');
        return await response.json();
    } catch (error) {
        console.error('Error fetching boards:', error);
        return [];
    }
}

// Create a new board row in the database with POST
async function createBoardAPI(title, projectId, data = '', xPos = 0, yPos = 0) {
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

// Update an existing board with PUT
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

// Delete a board with DELETE
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

// Persisting board to database
async function persistBoardToDB(boardElement) {
    const boardId = boardElement.id;
    const meta = boardsData.get(boardId) || {};
    const title = meta.title || 'Untitled Board';
    const xPos = parseInt(boardElement.style.left) || 0;
    const yPos = parseInt(boardElement.style.top) || 0;
    const boardHTML = boardElement.querySelector('.board').innerHTML;

    let dbId = meta.persistentId;
    if (!dbId) {
        const created = await createBoardAPI(title, projectId, boardHTML, xPos, yPos);
        if (created && created.id) {
            dbId = created.id;
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

// Load saved boards from the server and reconstruct interactive UI
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

            kcontainer.appendChild(boardWrapper);
            bringModuleToFront(boardWrapper);
            growCanvasIfNeeded(
                kcontainer,
                boardWrapper.offsetLeft + boardWrapper.offsetWidth,
                boardWrapper.offsetTop + boardWrapper.offsetHeight
            );

            const loadedAddBtns = boardWrapper.querySelectorAll('.add-card-btn');
            loadedAddBtns.forEach(b => b.setAttribute('data-board', domId));

            const cardsMap = new Map([
                ['todo', []],
                ['doing', []],
                ['done', []],
                ['delayed', []]
            ]);

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

            // Clear any pre-rendered card HTML from the saved data and re-render cards
            const listsToRender = boardWrapper.querySelectorAll('.column-list');
            listsToRender.forEach(listEl => {
                const colName = listEl.getAttribute('data-column') || 'todo';
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

//---Module functions---//
const kbtn = document.getElementById('kanbanmaker');
const kcontainer = document.getElementById('shared-canvas');

const boardsData = new Map();

// Load Boards
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

//Createing a new board
kbtn.addEventListener('click', async () => {
    // Create a unique ID for this board
    const boardId = 'board-' + Date.now();

    // Create a unique wrapper for this specific board
    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'board-container';
    boardWrapper.id = boardId;
    
    boardWrapper.innerHTML = `
        <div class="boardHandle">
            <span class="board-title-text">⠿ Title</span>
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

    kcontainer.appendChild(boardWrapper);
    centerModuleInWorkspaceView(kcontainer, boardWrapper);
    bringModuleToFront(boardWrapper);
    growCanvasIfNeeded(
        kcontainer,
        boardWrapper.offsetLeft + boardWrapper.offsetWidth,
        boardWrapper.offsetTop + boardWrapper.offsetHeight
    );

    // Initialize board data storage
    boardsData.set(boardId, {
        cards: new Map([
            ['todo', []],
            ['doing', []],
            ['done', []],
            ['delayed', []],
        ]),
        title: 'Title'
    });
    
        // Attach event listeners for controls and add-card buttons
        attachAddCardListeners(boardId);
        attachBoardControlsListeners(boardId);
    
    // Initialize the movement logic after creating the element
    makeElementMovable(boardWrapper);
    
    // Save the new board to database
    await persistBoardToDB(boardWrapper);
});

// Board title editing
function attachBoardTitleEditListener(boardId) {
    const boardElement = document.getElementById(boardId);
    const editBtn = boardElement.querySelector('.board-title-edit-btn');
    const titleText = boardElement.querySelector('.board-title-text');
    
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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
    const confirmed = await confirmWorkspaceDeletion(
        'Delete Kanban board?',
        `Are you sure you want to delete "${meta.title || 'this board'}" and all its cards? This cannot be undone.`
    );
    if (!confirmed) return;

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

// Card Functionality
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

function setupCardImagePreview(modalOverlay, imageInput, initialUrl = '') {
    const preview = modalOverlay.querySelector('.card-image-preview');

    const updatePreview = () => {
        const imageUrl = imageInput.value.trim();
        preview.hidden = true;
        preview.removeAttribute('src');
        if (imageUrl) preview.src = imageUrl;
    };

    preview.addEventListener('load', () => {
        preview.hidden = false;
        modalOverlay.classList.add('has-image-preview');
    });
    preview.addEventListener('error', () => {
        preview.hidden = true;
        modalOverlay.classList.remove('has-image-preview');
    });
    imageInput.addEventListener('input', updatePreview);
    imageInput.value = initialUrl;
    modalOverlay.classList.remove('has-image-preview');
    updatePreview();
}

// Show modal that collects card title/description/image and creates a card
function openAddCardModal(boardId, columnId) {

    // Create modal for adding a new card
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal card-form-modal';
    modalOverlay.style.display = 'flex';

    modalOverlay.innerHTML = `
        <div class="form-modal-content">
            <h2>Add New Card</h2>
            <form id="addCardForm">
                <div class="form-group">
                    <label for="cardTitle">Card Title: (Max 15 characters)</label>
                    <input type="text" id="cardTitle" placeholder="Enter card title" required>
                </div>
                <div class="form-group">
                    <label for="cardDescription">Description: (Max 350 characters)</label>
                    <textarea id="cardDescription" placeholder="Enter card description"></textarea>
                </div>
                <div class="form-group">
                    <label for="cardImage">Image URL:</label>
                    <img class="card-image-preview" alt="Image preview" hidden>
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
    setupCardImagePreview(modalOverlay, form.querySelector('#cardImage'));
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

    const cardDescriptionMaxLength = 350; // Limit description to 150 characters
    document.getElementById('cardDescription').addEventListener('input', function() {
        if (this.value.length > cardDescriptionMaxLength) {
            this.value = this.value.slice(0, cardDescriptionMaxLength);
        }
    });
}

// Card Rendering
// Render a single card object into the DOM, attach all card handlers
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


// Card details modal
// Edit a card's title, description, and image URL.
function openCardDetailsModal(boardId, columnId, card) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal card-form-modal';
    modalOverlay.style.display = 'flex';

    modalOverlay.innerHTML = `
        <div class="form-modal-content">
            <h2>Edit Card</h2>
            <form id="editCardForm">
                <div class="form-group">
                    <label for="cardTitle">Card Title: (Max 15 characters)</label>
                    <input type="text" id="cardTitle" placeholder="Enter card title" required maxlength="15">
                </div>
                <div class="form-group">
                    <label for="cardDescription">Description: (Max 350 characters)</label>
                    <textarea id="cardDescription" placeholder="Enter card description" maxlength="350"></textarea>
                </div>
                <div class="form-group">
                    <label for="cardImage">Image URL:</label>
                    <img class="card-image-preview" alt="Image preview" hidden>
                    <input type="url" id="cardImage" placeholder="https://example.com/image.jpg">
                </div>
                <div class="form-buttons">
                    <button type="button" class="form-cancel-btn">Cancel</button>
                    <button type="button" class="modal-delete-btn">Delete Card</button>
                    <button type="submit" class="form-submit-btn">Save</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    const form = modalOverlay.querySelector('#editCardForm');
    const titleInput = form.querySelector('#cardTitle');
    const descriptionInput = form.querySelector('#cardDescription');
    const imageInput = form.querySelector('#cardImage');
    titleInput.value = card.title || '';
    descriptionInput.value = card.description || '';
    setupCardImagePreview(modalOverlay, imageInput, card.imageUrl || '');
    titleInput.focus();

    const closeModal = () => {
        document.body.removeChild(modalOverlay);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        if (!title) {
            titleInput.focus();
            return;
        }

        card.title = title;
        card.description = descriptionInput.value;
        card.imageUrl = imageInput.value.trim();

        const cardElement = document.getElementById(card.id);
        if (cardElement) {
            cardElement.querySelector('.card-title').textContent = card.title;
            cardElement.dataset.cardDesc = card.description;
            cardElement.dataset.cardImage = card.imageUrl;
        }

        await persistBoardToDB(document.getElementById(boardId));
        closeModal();
    });

    modalOverlay.querySelector('.form-cancel-btn').addEventListener('click', closeModal);
    modalOverlay.querySelector('.modal-delete-btn').addEventListener('click', async () => {
        if (await deleteCard(boardId, columnId, card.id)) closeModal();
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}


// Delete Card
// Remove a card from both the in-memory store and the DOM, then persist
async function deleteCard(boardId, columnId, cardId) {
    const cardTitle = document.getElementById(cardId)?.querySelector('.card-title')?.textContent || 'this card';
    const confirmed = await confirmWorkspaceDeletion(
        'Delete Kanban card?',
        `Are you sure you want to delete "${cardTitle}"? This cannot be undone.`
    );
    if (!confirmed) return false;

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
    return true;
}

// Board auto expand
// Adjust the board's minHeight based on its columns' content
function updateBoardHeight(boardId) {
    const boardWrapper = document.getElementById(boardId);
    const boardElement = boardWrapper && boardWrapper.querySelector('.board');
    if (!boardElement) return;

    const previousTransition = boardElement.style.transition;
    boardElement.style.transition = 'none';
    boardElement.style.minHeight = '';
    void boardElement.offsetHeight;

    if (window.matchMedia('(max-width: 420px)').matches) {
        boardElement.style.minHeight = '0px';
        boardElement.style.transition = previousTransition;
        growCanvasIfNeeded(
            kcontainer,
            boardWrapper.offsetLeft + boardWrapper.offsetWidth,
            boardWrapper.offsetTop + boardWrapper.offsetHeight
        );
        return;
    }
    
    // Get all columns in the board
    const columns = boardElement.querySelectorAll('.column');
    
    // Find the maximum height needed
    let maxHeight = window.matchMedia('(max-width: 760px)').matches ? 220 : 400;
    
    columns.forEach(column => {
        const columnList = column.querySelector('.column-list');
        if (columnList) {
            // Calculate required height:
            const contentHeight = columnList.scrollHeight + 100;
            maxHeight = Math.max(maxHeight, contentHeight);
        }
    });
    
    // Measure after clearing the previous height so empty space is not counted as card content.
    boardElement.style.minHeight = maxHeight + 'px';
    boardElement.style.transition = previousTransition;
    growCanvasIfNeeded(
        kcontainer,
        boardWrapper.offsetLeft + boardWrapper.offsetWidth,
        boardWrapper.offsetTop + boardWrapper.offsetHeight
    );
}

// Make element moveable
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
    this.style.backgroundColor = '#d0e8f241'; // Highlight on drag over
}

// Reset column background when drag leaves
function handleDragLeave(e) {
    this.style.backgroundColor = '#d0d0d000'; // Reset color when leaving
}

// Handle card drop into a column: move data in `boardsData`, re-render
function handleCardDrop(e) {
    e.preventDefault();
    this.style.backgroundColor = '#d0d0d000'; // Reset color

    if (!draggedCard) return;

    const fromBoardId = draggedCard.dataset.boardId;
    const fromColumnId = draggedCard.dataset.columnId;
    const cardId = draggedCard.dataset.cardId;
    
    const toBoardId = this.closest('.board-container').id;
    const toColumnId = this.getAttribute('data-column');

    // Prevent dropping on a different board
    if (fromBoardId !== toBoardId) {
        draggedCard = null;
        return;
    }

    if (fromColumnId === toColumnId) {
        const targetCard = e.target.closest('.card');

        if (!targetCard) {
            this.appendChild(draggedCard);
        } else if (targetCard !== draggedCard && targetCard.parentElement === this) {
            const targetRect = targetCard.getBoundingClientRect();
            const insertBeforeTarget = e.clientY < targetRect.top + targetRect.height / 2;
            this.insertBefore(draggedCard, insertBeforeTarget ? targetCard : targetCard.nextSibling);
        }

        const cardData = boardsData.get(fromBoardId).cards.get(fromColumnId);
        const cardsById = new Map(cardData.map(card => [card.id, card]));
        const reorderedCards = Array.from(this.querySelectorAll('.card'))
            .map(cardElement => cardsById.get(cardElement.dataset.cardId))
            .filter(Boolean);
        const orderChanged = reorderedCards.some((card, index) => card.id !== cardData[index].id);

        if (orderChanged) {
            cardData.splice(0, cardData.length, ...reorderedCards);
            updateBoardHeight(fromBoardId);
            persistBoardToDB(document.getElementById(fromBoardId));
        }

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
  const handle = elmnt.querySelector('.boardHandle');
  let pointerOffsetX = 0;
  let pointerOffsetY = 0;

  if (handle) {
    handle.addEventListener('pointerdown', startBoardDrag);
  }

  function startBoardDrag(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const moduleRect = elmnt.getBoundingClientRect();
    pointerOffsetX = e.clientX - moduleRect.left;
    pointerOffsetY = e.clientY - moduleRect.top;
    setModuleDragPositionUpdater(() => positionModuleUnderPointer(elmnt, kcontainer, pointerOffsetX, pointerOffsetY));
    bringModuleToFront(elmnt);
    updateModuleDragPointer(e.clientX, e.clientY);
    document.addEventListener('pointermove', dragBoard);
    document.addEventListener('pointerup', stopBoardDrag);
    document.addEventListener('pointercancel', stopBoardDrag);
  }

  function dragBoard(e) {
    e.preventDefault();
    updateModuleDragPointer(e.clientX, e.clientY);
    positionModuleUnderPointer(elmnt, kcontainer, pointerOffsetX, pointerOffsetY);
  }

  function stopBoardDrag() {
    document.removeEventListener('pointermove', dragBoard);
    document.removeEventListener('pointerup', stopBoardDrag);
    document.removeEventListener('pointercancel', stopBoardDrag);
    stopModuleAutoScroll();
    persistBoardToDB(elmnt);
  }

  // Attach drop listeners for cards in this board
  attachColumnDropListeners(elmnt.id);
}