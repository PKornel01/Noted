//---API helper functions---//
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        console.warn('Server not running:', error.message);
        return false;
    }
}

// Fetch all charts (modules) from the server
// Returns an array of chart objects or [] on error.
async function fetchChartsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/charts?projectId=${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch charts');
        return await response.json();
    } catch (error) {
        console.error('Error fetching charts:', error);
        return [];
    }
}

// Create a new chart row in the DB via POST
// Returns the created row (including insert id) or null on failure.
async function createChartAPI(title, projectId, data = '', xPos = 0, yPos = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/charts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, projectId, data, xPos, yPos })
        });
        if (!response.ok) throw new Error('Failed to create chart');
        return await response.json();
    } catch (error) {
        console.error('Error creating chart:', error);
        return null;
    }
}

// Update an existing chart row via PUT
// chartId is the DB id (not the DOM id)
async function saveChartAPI(chartId, title, data, xPos = 0, yPos = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/charts/${chartId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, data, xPos, yPos })
        });
        if (!response.ok) throw new Error('Failed to save chart');
        return await response.json();
    } catch (error) {
        console.error('Error saving chart:', error);
        return null;
    }
}

// Delete a chart row using the DB id
async function deleteChartAPI(chartId) {
    try {
        const response = await fetch(`${API_BASE_URL}/charts/${chartId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete chart');
        return await response.json();
    } catch (error) {
        console.error('Error deleting chart:', error);
        return null;
    }
}

// Persisting charts
async function persistChartToDB(chartElement) {
    const chartId = chartElement.id; // DOM id, e.g. 'chart-1634234'
    const meta = chartsData.get(chartId) || {};
    const title = meta.title || 'Untitled Chart';
    const xPos = parseInt(chartElement.style.left) || 0;
    const yPos = parseInt(chartElement.style.top) || 0;
    const rawContent = chartElement.querySelector('.chart-body').innerHTML;

    const width = chartElement.offsetWidth;
    const height = chartElement.offsetHeight;

    const chartHTML = `<div data-w="${width}" data-h="${height}">${rawContent}</div>`;

    // If this chart does not yet have a DB id, create it first
    let dbId = meta.persistentId;
    if (!dbId) {
        const created = await createChartAPI(title, projectId, chartHTML, xPos, yPos);
        if (created && created.id) {
            dbId = created.id;
            // store persistent id for future saves
            chartsData.set(chartId, { ...meta, persistentId: dbId });
            console.log(`🆕 Created chart in DB with id=${dbId}`);
        } else {
            console.warn('Could not create chart in DB; will retry later');
            return null;
        }
    }

    const result = await saveChartAPI(dbId, title, chartHTML, xPos, yPos);
    if (result) {
        console.log(`✅ Chart "${title}" (db id=${dbId}) saved to database`);
    }
    return result;
}

// Load saved charts
async function loadChartsFromDatabase() {
    const charts = await fetchChartsFromAPI();
    
    charts.forEach(chart => {
        const domId = 'chart-' + chart.id;
        if (!document.getElementById(domId)) {
            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'chart-container';
            chartWrapper.id = domId;
            chartWrapper.style.top = (chart.yPos || 0) + 'px';
            chartWrapper.style.left = (chart.xPos || 0) + 'px';

            const temp = document.createElement('div');
            temp.innerHTML = chart.data || '';
            const marker = temp.firstElementChild;

            let bodyContent;
            if (marker && marker.dataset.w !== undefined) {
                chartWrapper.style.width = marker.dataset.w + 'px';
                chartWrapper.style.height = marker.dataset.h + 'px';
                bodyContent = marker.innerHTML;
            } else {
                // Fallback for charts saved before size tracking existed
                chartWrapper.style.width = '300px';
                chartWrapper.style.height = '200px';
                bodyContent = chart.data || `
                    <svg class="connections-layer">
                        <defs> 
                            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                                <path d="M0,0 L0,6 L9,3 z" fill="#d035ff" />
                            </marker>
                        </defs>
                    </svg>
                `;
            }
            
            chartWrapper.innerHTML = `
            <div class="chart">
                <div class="chartHandle">
                        <div class="chart-title-group">
                            <span class="chart-title-text"></span>
                            <button class="board-title-edit-btn headerBtn chart-title-edit-btn" type="button" title="Click to edit chart name" aria-label="Edit chart title">✎</button>
                            <button class="board-delete-btn headerBtn" id="close-btn" type="button" title="Remove" aria-label="Delete chart">🗑</button>
                        </div>
                        <button class="headerBtn" id="obj-btn" type="button" title="Add Object">+ Add Object</button>
                        <button class="headerBtn" id="connect-btn" type="button" title="Connect">🔗 Connect: Off</button>
                </div>
                <div class="chart-body">
                    ${bodyContent}
                </div>
                <div class="resize-handle">
        
                </div>
            </div>
            `;

            fcontainer.appendChild(chartWrapper);
            bringModuleToFront(chartWrapper);

            chartsData.set(domId, { persistentId: chart.id, title: chart.title });
            chartWrapper.querySelector('.chart-title-text').textContent = chart.title || 'Untitled Chart';
            makeInteractive(chartWrapper);
        }
    });
}

//---Module Functions---//
const fbtn = document.getElementById('flowchartmaker');
const fcontainer = document.getElementById('shared-canvas');

const chartsData = new Map();

// Load charts when page opens
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Checking if server is running...');
    
    const serverRunning = await checkAPIHealth();
    if (!serverRunning) {
        console.warn('⚠️ Server not running. Using offline mode (data will not persist).');
    } else {
        console.log('✅ Server connected. Loading charts from database...');
        await loadChartsFromDatabase();
        console.log('Charts loaded successfully');
    }
});

function openChartTitleEditModal(chartWrapper) {
    const metadata = chartsData.get(chartWrapper.id);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="form-modal-content">
            <h2>Edit Chart Title</h2>
            <form>
                <div class="form-group">
                    <label for="boardTitleInput">Chart Title: (Max 50 characters)</label>
                    <input type="text" id="boardTitleInput" maxlength="50" required>
                </div>
                <div class="form-buttons">
                    <button type="button" class="form-cancel-btn">Cancel</button>
                    <button type="submit" class="form-submit-btn">Save</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#boardTitleInput');
    input.value = metadata.title || 'Untitled Chart';
    input.focus();
    input.select();

    const close = () => modal.remove();
    modal.querySelector('.form-cancel-btn').addEventListener('click', close);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
    modal.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const newTitle = input.value.trim();
        if (!newTitle) return;

        const previousTitle = metadata.title;
        metadata.title = newTitle;
        chartWrapper.querySelector('.chart-title-text').textContent = newTitle;
        try {
            const result = await persistChartToDB(chartWrapper);
            if (!result) throw new Error('The chart title could not be saved.');
            close();
        } catch (error) {
            metadata.title = previousTitle;
            chartWrapper.querySelector('.chart-title-text').textContent = previousTitle || 'Untitled Chart';
            console.error('Error saving chart title:', error);
            alert(`Could not save chart title: ${error.message}`);
        }
    });
}



fbtn.addEventListener('click', async () => { 
    // Create a unique ID for this chart
    const chartId = 'chart-' + Date.now();

    // Create a unique wrapper for this specific chart
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-container';
    chartWrapper.id = chartId;

    // Set a starting position so they don't all stack perfectly on top of each other
    const chartCount = document.querySelectorAll('.chart-container').length;
    const isCompactViewport = window.matchMedia('(max-width: 760px)').matches;
    if (isCompactViewport) {
        const chartWidth = Math.min(260, Math.max(150, fcontainer.clientWidth - 24));
        chartWrapper.style.width = chartWidth + 'px';
        chartWrapper.style.height = Math.min(180, Math.max(120, fcontainer.clientHeight * 0.3)) + 'px';
        chartWrapper.style.top = Math.min(16 + chartCount * 16, Math.max(0, fcontainer.clientHeight - 200)) + 'px';
        chartWrapper.style.left = Math.min(16 + chartCount * 16, Math.max(0, fcontainer.clientWidth - chartWidth)) + 'px';
    } else {
        chartWrapper.style.top = (100 + chartCount * 20) + "px";
        chartWrapper.style.left = (100 + chartCount * 20) + "px";
    }

    // Create the chart element
    chartWrapper.innerHTML = `
    <div class="chart">
        <div class="chartHandle">
                <div class="chart-title-group">
                    <span class="chart-title-text"></span>
                    <button class="board-title-edit-btn headerBtn chart-title-edit-btn" type="button" title="Click to edit chart name" aria-label="Edit chart title">✎</button>
                    <button class="board-delete-btn headerBtn" id="close-btn" type="button" title="Remove" aria-label="Delete chart">🗑</button>
                </div>
                <button class="headerBtn" id="obj-btn" type="button" title="Add Object">+ Add Object</button>
                <button class="headerBtn" id="connect-btn" type="button" title="Connect">🔗 Connect: Off</button>
        </div>
        <div class="chart-body">
            <svg class="connections-layer">
                <defs> 
                    <marker id ="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#d035ff" />
                    </marker>
                </defs>
            </svg>
        </div>
        <div class="resize-handle">
        
        </div>
    </div>
    `;
    fcontainer.appendChild(chartWrapper);
    bringModuleToFront(chartWrapper);

    chartsData.set(chartId, { title: 'Untitled Chart' });
    chartWrapper.querySelector('.chart-title-text').textContent = 'Untitled Chart';
    makeInteractive(chartWrapper);
    await persistChartToDB(chartWrapper);
});

function makeInteractive(chartWrapper) { 
    const header = chartWrapper.querySelector('.chartHandle');
    const handle = chartWrapper.querySelector('.resize-handle');
    const closeBtn = chartWrapper.querySelector('#close-btn');
    const titleEditBtn = chartWrapper.querySelector('.chart-title-edit-btn');
    const objBtn = chartWrapper.querySelector('#obj-btn');
    const connectBtn = chartWrapper.querySelector('#connect-btn');
    const workspace = chartWrapper.querySelector('.chart-body');
    const svg = chartWrapper.querySelector('.connections-layer');

    let shapeCount = 0;
    const connections = []; // { fromEl, toEl, lineEl }
    let connectMode = false;
    let pendingFrom = null; // shape waiting for its connection partner

    const Min_Width = 150;
    const Min_Height = 100;

    let dragMode = null; // 'move' or 'resize'
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    function startMove(e) {
        if (e.target.closest('.headerBtn')) return;

        e.preventDefault();
        dragMode = 'move';
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseFloat(chartWrapper.style.left || '0');
        startTop = parseFloat(chartWrapper.style.top || '0');
        activate();
    };

    function startResize(e) { 
        e.preventDefault();
        e.stopPropagation();
        dragMode = 'resize';
        startX = e.clientX;
        startY = e.clientY;
        startWidth = chartWrapper.offsetWidth;
        startHeight = chartWrapper.offsetHeight;
        activate();
    };

    function activate() { 
        chartWrapper.classList.add('active');
        bringModuleToFront(chartWrapper);
        updateModuleDragPointer(startX, startY);
        document.addEventListener('pointermove', onDrag);
        document.addEventListener('pointerup', stopDrag);
        document.addEventListener('pointercancel', stopDrag);
    };

    function onDrag(e) { 
        updateModuleDragPointer(e.clientX, e.clientY);
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (dragMode === 'move') { 
            const newLeft = Math.max(0, startLeft + dx);
            const newTop = Math.max(0, startTop + dy);

            chartWrapper.style.left = newLeft + 'px';
            chartWrapper.style.top = newTop + 'px';

            growCanvasIfNeeded(fcontainer, newLeft + chartWrapper.offsetWidth, newTop + chartWrapper.offsetHeight);
        }
        else if (dragMode === 'resize') { 
            const newWidth = Math.max(Min_Width, startWidth + dx);
            const newHeight = Math.max(Min_Height, startHeight + dy);

            chartWrapper.style.width = newWidth + 'px';
            chartWrapper.style.height = newHeight + 'px'

            growCanvasIfNeeded(fcontainer, chartWrapper.offsetLeft + newWidth, chartWrapper.offsetTop + newHeight);
        };
    };

    function stopDrag() { 
        dragMode = null;
        chartWrapper.classList.remove('active');
        document.removeEventListener('pointermove', onDrag);
        document.removeEventListener('pointerup', stopDrag);
        document.removeEventListener('pointercancel', stopDrag);
        stopModuleAutoScroll();

        persistChartToDB(chartWrapper)
    };

    header.addEventListener('pointerdown', startMove);
    handle.addEventListener('pointerdown', startResize);
    titleEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openChartTitleEditModal(chartWrapper);
    });
    closeBtn.addEventListener('click', () => { 
        chartWrapper.remove();
        deleteChartFromUI(chartWrapper.id);
    });

    connectBtn.addEventListener("click", () => {
        connectMode = !connectMode;
        connectBtn.textContent = connectMode ? '🔗 Connect: On' : '🔗 Connect: Off';
        connectBtn.classList.toggle("on", connectMode);
        workspace.classList.toggle("connect-mode", connectMode);
        if (!connectMode && pendingFrom) {
            pendingFrom.classList.remove("selected");
            pendingFrom = null;
        }
    });

    // Object modal button

    objBtn.addEventListener('click', () => { 
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal';

        modalOverlay.innerHTML = ` 
        <div class="objMenu">
            <div class="objMenuHeader">
                <h2 id=shapeMenuTitle>Shape selector</h2>
                <button class="headerBtn" id="close-objMenu" type="button" title="Close">🗑</button>
            </div>
            <div class="objMenuBody">
                <div class="objMenuItem" id="shpRoundRectangleMake">
                    <div class="shape-preview shp-preview-roundrectangle"></div>
                    <span class="shape-name">Rounded Rectangle</span>
                </div>
                <div class="objMenuItem" id="shpOvalMake">
                    <div class="shape-preview shp-preview-oval"></div>
                    <span class="shape-name">Oval</span>
                </div>
                <div class="objMenuItem" id="shpRectangleMake">
                    <div class="shape-preview shp-preview-rectangle"></div>
                    <span class="shape-name">Rectangle</span>
                </div>
                <div class="objMenuItem" id="shpDiamondMake">
                    <div class="shape-preview shp-preview-diamond"></div>
                    <span class="shape-name">Diamond</span>
                </div>
                <div class="objMenuItem" id="shpParallelogramMake">
                    <div class="shape-preview shp-preview-parallelogram"></div>
                    <span class="shape-name">Parallelogram</span>
                </div>
                <div class="objMenuItem" id="shpSmallCircleMake">
                    <div class="shape-preview shp-preview-smallcircle"></div>
                    <span class="shape-name">Small Circle</span>
                </div>
            </div>
        </div>
        `;



        document.body.appendChild(modalOverlay);

        const cancelBtn = modalOverlay.querySelector('#close-objMenu');
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });

        modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
        });



        const shapeButtons = {
        shpRoundRectangleMake: 'roundrectangle',
        shpOvalMake: 'oval',
        shpRectangleMake: 'rectangle',
        shpDiamondMake: 'diamond',
        shpParallelogramMake: 'parallelogram',
        shpSmallCircleMake: 'smallcircle'
        };

        Object.keys(shapeButtons).forEach(id => {
            modalOverlay.querySelector('#' + id).addEventListener('click', () => {
                addShape(shapeButtons[id]);
                document.body.removeChild(modalOverlay);
            });
        });
    });

    function addShape(type) { 
        shapeCount++;
        const shape = document.createElement('div');
        shape.className = `shp${type}`;
        shape.id = "shape-" + shapeCount;
        
        const label = document.createElement('span');
        label.className = 'shape-label';
        label.textContent = 'Node ' + shapeCount;
        shape.appendChild(label);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'shape-delete';
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'x';
        deleteBtn.title = 'Delete';
        shape.appendChild(deleteBtn);


        // Cascade spawn position so new shapes don't stack exactly on old ones
        const shapeWidth = 100, shapeHeight = 60;
        const maxLeft = Math.max(0, workspace.clientWidth - shapeWidth);
        const maxTop = Math.max(0, workspace.clientHeight - shapeHeight);
        const cascade = (shapeCount % 6) *26;
        shape.style.left = Math.min(maxLeft,40 + cascade) + 'px';
        shape.style.top = Math.min(maxTop, 40 + cascade) + 'px';

        workspace.appendChild(shape);
        makeShapeInteractive(shape);
        makeLabelEditable(label, shape);

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteShape(shape);
        });

        persistChartToDB(chartWrapper)
    }

    function deleteShape(shape) {
    // Walk backwards so splicing mid-loop doesn't skip the next item
        for (let i = connections.length - 1; i >= 0; i--) {
            const conn = connections[i];
            if (conn.fromEl === shape || conn.toEl === shape) {
                conn.line.remove();       // remove the visual arrow from the SVG
                connections.splice(i, 1); // remove it from the tracking array
            }
        }

        if (pendingFrom === shape) pendingFrom = null; // cancel a half-made connection if this was that shape

        shape.remove();

        persistChartToDB(chartWrapper)
    }

    let MAX_LABEL_LENGTH = 14;

    function makeLabelEditable(label) {
        label.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            label.contentEditable = "true";
            label.focus();
            document.execCommand("selectAll", false, null);
        });

        label.addEventListener('input', () => {
            const parentdiv = label.closest("div");
            if (parentdiv.classList.contains("shpsmallcircle")) {
                MAX_LABEL_LENGTH = 8;
            }
            if (label.textContent.length > MAX_LABEL_LENGTH) {
                label.textContent = label.textContent.slice(0, MAX_LABEL_LENGTH);
                placeCursorAtEnd(label);
            }

            MAX_LABEL_LENGTH = 14;
        });

        label.addEventListener("blur", () => {
            label.contentEditable = "false";
            if (label.textContent.trim() === "") {
                label.textContent = "Untitled";
            }

            persistChartToDB(chartWrapper)
        });

        label.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                label.blur();
            }
        })
    }

    function placeCursorAtEnd(el) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function makeShapeInteractive(shape) { 
        let dragging = false;
        let startX, startY, startLeft, startTop;

        shape.addEventListener('pointerdown', (e) => { 
            if (e.target.closest('.shape-delete')) {
                return;
            }

            if (e.target.isContentEditable) {
                return;
            } 

            if (connectMode) { 
                handleConnectClick(shape);
                return;
            }

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = shape.offsetLeft;
            startTop = shape.offsetTop;
            document.addEventListener('pointermove', onShapeDrag);
            document.addEventListener('pointerup', stopShapeDrag);
        });

        function onShapeDrag(e) { 
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const maxLeft = Math.max(0, workspace.clientWidth - shape.offsetWidth);
            const maxTop = Math.max(0, workspace.clientHeight - shape.offsetHeight);

            shape.style.left = Math.min(maxLeft, Math.max(0, startLeft + dx)) + 'px';
            shape.style.top = Math.min(maxTop, Math.max(0, startTop + dy)) + 'px';

            updateConnectionsFor(shape);
        }

        function stopShapeDrag() { 
            dragging = false;
            document.removeEventListener('pointermove', onShapeDrag);
            document.removeEventListener('pointerup', stopShapeDrag);

            persistChartToDB(chartWrapper);
        }
    }

    // Connect Mode

    function handleConnectClick(shape) { 
        if (!pendingFrom) { 
            pendingFrom = shape;
            shape.classList.add('selected');
            return;
        }
        if (pendingFrom === shape) { 
            pendingFrom.classList.remove('selected');
            pendingFrom = null;
            return;
        }
        createConnection(pendingFrom, shape);
        pendingFrom.classList.remove('selected');
        pendingFrom = null;
    }

    function createConnection(fromEl, toEl) { 
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#d035ff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        line.setAttribute('data-from', fromEl.id);
        line.setAttribute('data-to', toEl.id);

        svg.appendChild(line);

        const conn = {fromEl, toEl, line};
        connections.push(conn);
        updateLine(conn);

        persistChartToDB(chartWrapper)
    }

    function updateConnectionsFor(shape) { 
        connections.forEach(conn => { 
            if (conn.fromEl === shape || conn.toEl === shape) {
                updateLine(conn);
            }
        });
    };

    function centerOf(el) { 
        return {
            x: el.offsetLeft + el.offsetWidth / 2,
            y: el.offsetTop + el.offsetHeight / 2
        }
    }

    function edgePoint(center, halfW, halfH, dx, dy) {
        if (dx === 0 && dy === 0) {
            return center;
        }

        const scaleX = halfW / (Math.abs(dx) || 1e-6);
        const scaleY = halfH / (Math.abs(dy) || 1e-6);
        const scale = Math.min(scaleX, scaleY);
        return {
            x: center.x + dx * scale,
            y: center.y + dy *scale
        };
    }

    function updateLine(conn) {
        const fromCenter = centerOf(conn.fromEl);
        const toCenter = centerOf(conn.toEl);
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;

        const start = edgePoint(fromCenter, conn.fromEl.offsetWidth / 2, conn.fromEl.offsetHeight / 2, dx, dy);
        const end = edgePoint(toCenter, conn.toEl.offsetWidth / 2, conn.toEl.offsetHeight / 2, -dx, -dy);

        conn.line.setAttribute("x1", start.x);
        conn.line.setAttribute("y1", start.y);
        conn.line.setAttribute("x2", end.x);
        conn.line.setAttribute("y2", end.y);
    }

    function rehydrateExistingContent() {
    // Re-wire any shapes that came from saved HTML
    if (!svg) {
        return;
    }
    const existingShapes = workspace.querySelectorAll('[class^="shp"]');
    let maxId = 0;

    existingShapes.forEach(shape => {
        makeShapeInteractive(shape);

        const label = shape.querySelector('.shape-label');
        if (label) makeLabelEditable(label);

        const deleteBtn = shape.querySelector('.shape-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteShape(shape);
            });
        }

        // shape.id looks like "shape-7" — recover the number so future addShape() calls don't reuse an id that already exists
        const num = parseInt(shape.id.split('-')[1], 10);
        if (!isNaN(num) && num > maxId) maxId = num;
    });
    shapeCount = maxId;

    // Reconstruct the connections array from each line's data-from/data-to
    const existingLines = svg.querySelectorAll('line[data-from]');
    existingLines.forEach(line => {
        const fromEl = workspace.querySelector('#' + line.getAttribute('data-from'));
        const toEl = workspace.querySelector('#' + line.getAttribute('data-to'));
        if (fromEl && toEl) {
            const conn = { fromEl, toEl, line };
            connections.push(conn);
            updateLine(conn); // snap it to the shapes' actual current positions
        } else {
            line.remove();
        }
    });
    }

    rehydrateExistingContent();
};

async function deleteChartFromUI(chartDomId) {
    const meta = chartsData.get(chartDomId) || {};
    const dbId = meta.persistentId;

    // Remove DOM immediately for responsiveness
    const el = document.getElementById(chartDomId);
    if (el) el.remove();

    // Remove from memory
    chartsData.delete(chartDomId);

    if (dbId) {
        const result = await deleteChartAPI(dbId);
        if (result && result.success) {
            console.log(`🗑️ Deleted chart db id=${dbId}`);
        } else {
            console.warn(`Failed to delete chart db id=${dbId}`);
        }
    }
}
