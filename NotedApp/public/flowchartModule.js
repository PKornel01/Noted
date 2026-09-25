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

// Fetch all charts (modules) from the server
// Returns an array of chart objects or [] on error.
async function fetchChartsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/charts`);
        if (!response.ok) throw new Error('Failed to fetch charts');
        return await response.json();
    } catch (error) {
        console.error('Error fetching charts:', error);
        return [];
    }
}

// Create a new chart row in the DB via POST
// Returns the created row (including insert id) or null on failure.
async function createChartAPI(title, projectId = 1, data = '', xPos = 0, yPos = 0) {
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

// ============================================
// CHART PERSISTENCE FUNCTIONS
// ============================================

// Persist a chart to the database.
// Steps:
// 1) Read the DOM chart HTML: chartElement.querySelector('.chart').innerHTML
// 2) If no DB id exists, call createChartAPI to insert and save the db id
// 3) Call saveChartAPI to update the stored HTML and position
// Note: we store HTML (a blob). Event listeners are not persisted and
// must be re-attached when the chart is loaded.
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
        const created = await createChartAPI(title, 1, chartHTML, xPos, yPos);
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

//------------------------------------------------ Load Charts

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
                                <path d="M0,0 L0,6 L9,3 z" fill="#5b8cff" />
                            </marker>
                        </defs>
                    </svg>
                `;
            }
            
            chartWrapper.innerHTML = `
            <div class="chart">
                <div class="chart-header">
                    <section id="btnContainer"> 
                        <button class="headerBtn" id="obj-btn" type="button" title="Add Object">[+]</button>
                        <button class="headerBtn" id="connectBtn" type="button" title="Connect">[🔗 Connect: Off]</button>
                        <button class="headerBtn" id="close-btn" type="button" title="Remove">[x]</button>
                    </section>
                </div>
                <div class="chart-body">
                    ${chart.data || `
                        <svg class="connections-layer">
                            <defs> 
                                <marker id ="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#5b8cff" />
                                </marker>
                            </defs>
                        </svg>
                    `}
                </div>
                <div class="resize-handle">
        
                </div>
            </div>
            `;

            container.appendChild(chartWrapper);

            chartsData.set(domId, { persistentId: chart.id, title: chart.title });
            makeInteractive(chartWrapper);
        }
    });
}

//------------------------------------------------------------

const btn = document.getElementById('flowchartmaker');
const container = document.getElementById('sheet');

const chartsData = new Map(); // chartId -> { persistentId: dbId }
let containerCount = 0;

// Load charts when page opens
// App entry: when DOM is ready, check API and load charts if available.
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



btn.addEventListener('click', async () => { 
    // Create a unique ID for this chart
    const chartId = 'chart-' + Date.now();

    containerCount++; // For z-index stacking

    // Create a unique wrapper for this specific chart
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-container';
    chartWrapper.id = chartId;

    // Set a starting position so they don't all stack perfectly on top of each other
    chartWrapper.style.top = (100 + (document.querySelectorAll('.chart-container').length * 20)) + "px";
    chartWrapper.style.left = (100 + (document.querySelectorAll('.chart-container').length * 20)) + "px";

    // Create the chart element
    chartWrapper.innerHTML = `
    <div class="chart">
        <div class="chart-header">
            <section id="btnContainer"> 
                <button class="headerBtn" id="obj-btn" type="button" title="Add Object">[+]</button>
                <button class="headerBtn" id="connectBtn" type="button" title="Connect">[🔗 Connect: Off]</button>
                <button class="headerBtn" id="close-btn" type="button" title="Remove">[x]</button>
            </section>
        </div>
        <div class="chart-body">
            <svg class="connections-layer">
                <defs> 
                    <marker id ="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#5b8cff" />
                    </marker>
                </defs>
            </svg>
        </div>
        <div class="resize-handle">
        
        </div>
    </div>
    `;
    container.appendChild(chartWrapper);

    chartsData.set(chartId, { title: 'Untitled Chart' });
    makeInteractive(chartWrapper);
    await persistChartToDB(chartWrapper);
});

function makeInteractive(chartWrapper) { 
    const header = chartWrapper.querySelector('.chart-header');
    const handle = chartWrapper.querySelector('.resize-handle');
    const closeBtn = chartWrapper.querySelector('#close-btn');
    const objBtn = chartWrapper.querySelector('#obj-btn');
    const connectBtn = chartWrapper.querySelector('#connectBtn');
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
        if (e.target.closest('.close-btn')) return;

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
        e.stopPropagation(); // Prevent triggering move
        dragMode = 'resize';
        startX = e.clientX;
        startY = e.clientY;
        startWidth = chartWrapper.offsetWidth;
        startHeight = chartWrapper.offsetHeight;
        activate();
    };

    function activate() { 
        chartWrapper.classList.add('active');
        bringToFront(chartWrapper);
        document.addEventListener('pointermove', onDrag);
        document.addEventListener('pointerup', stopDrag);
    };

    function onDrag(e) { 
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (dragMode === 'move') { 
            const bounds = container.getBoundingClientRect();
            const maxLeft = Math.max(0, bounds.width - chartWrapper.offsetWidth);
            const maxTop = Math.max(0, bounds.height - chartWrapper.offsetHeight);
            chartWrapper.style.left = Math.min(maxLeft, Math.max(0, startLeft + dx)) + 'px';
            chartWrapper.style.top = Math.min(maxTop, Math.max(0, startTop + dy)) + 'px';

        }
        else if (dragMode === 'resize') { 
            chartWrapper.style.width = Math.max(Min_Width, startWidth + dx) + 'px';
            chartWrapper.style.height = Math.max(Min_Height, startHeight + dy) + 'px';
        };
    };

    function stopDrag() { 
        dragMode = null;
        chartWrapper.classList.remove('active');
        document.removeEventListener('pointermove', onDrag);
        document.removeEventListener('pointerup', stopDrag);

        persistChartToDB(chartWrapper)
    };

    header.addEventListener('pointerdown', startMove);
    handle.addEventListener('pointerdown', startResize);
    closeBtn.addEventListener('click', () => { 
        chartWrapper.remove();
        deleteChartFromUI(chartWrapper.id);
    });

    connectBtn.addEventListener("click", () => {
        connectMode = !connectMode;
        connectBtn.textContent = connectMode ? '[🔗 Connect: On]' : '[🔗 Connect: Off]';
        connectBtn.classList.toggle("on", connectMode);
        workspace.classList.toggle("connect-mode", connectMode);
        if (!connectMode && pendingFrom) {
            pendingFrom.classList.remove("selected");
            pendingFrom = null;
        }
    });

    //object modal button

    objBtn.addEventListener('click', () => { 
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal';

        modalOverlay.innerHTML = ` 
        <div class="objMenu">
            <div class="objMenuHeader"> 
                <button class="headerBtn" id="close-objMenu" type="button" title="Close">[x]</button>
            </div>
            <div class="objMenuBody">
                <div class="objMenuItem" id="shpRoundRectangleMake">Rounded Rectangle</div>
                <div class="objMenuItem" id="shpOvalMake">Oval</div>
                <div class="objMenuItem" id="shpRectangleMake">Rectangle</div>
                <div class="objMenuItem" id="shpDiamondMake">Diamond</div>
                <div class="objMenuItem" id="shpParallelogramMake">Parallelogram</div>
                <div class="objMenuItem" id="shpSmallCircleMake">Small Circle</div>
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
                document.body.removeChild(modalOverlay); // close after picking
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
        label.textContent = 'Node ' + shapeCount; // will change below
        shape.appendChild(label); // text now lives in a child, not shape.textContent

        const deleteBtn = document.createElement('button'); // ADD
        deleteBtn.className = 'shape-delete';
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'X';
        deleteBtn.title = 'Delete';
        shape.appendChild(deleteBtn);


        // Cascade spawn position so new shapes don't stack exactly on old ones
        const shapeWidth = 100, shapeHeight = 60; // match the size from your CSS
        const maxLeft = Math.max(0, workspace.clientWidth - shapeWidth);
        const maxTop = Math.max(0, workspace.clientHeight - shapeHeight);
        const cascade = (shapeCount % 6) *26;
        shape.style.left = Math.min(maxLeft,40 + cascade) + 'px';
        shape.style.top = Math.min(maxTop, 40 + cascade) + 'px';

        workspace.appendChild(shape);
        makeShapeInteractive(shape);
        makeLabelEditable(label, shape);

        deleteBtn.addEventListener('click', (e) => { // ADD
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
            /*
            shape.style.left = (startLeft + dx) + 'px';
            shape.style.top = (startTop + dy) + 'px';
            */

            const maxLeft = Math.max(0, workspace.clientWidth - shape.offsetWidth);
            const maxTop = Math.max(0, workspace.clientHeight - shape.offsetHeight);

            shape.style.left = Math.min(maxLeft, Math.max(0, startLeft + dx)) + 'px';
            shape.style.top = Math.min(maxTop, Math.max(0, startTop + dy)) + 'px';

            // The key line for "connected in real time": every drag frame,
            // re-draw any connection line that touches this shape.
            updateConnectionsFor(shape);
        }

        function stopShapeDrag() { 
            dragging = false;
            document.removeEventListener('pointermove', onShapeDrag);
            document.removeEventListener('pointerup', stopShapeDrag);

            persistChartToDB(chartWrapper);
        }
    }

    //Connect Mode

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
        line.setAttribute('stroke', '#5b8cff');
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
    // Re-wire any shapes that came from saved HTML — does nothing
    // for a freshly created, empty chart, so it's safe to always call.
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

        // shape.id looks like "shape-7" — recover the number so future
        // addShape() calls don't reuse an id that already exists
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
            line.remove(); // orphaned — its shape no longer exists, clean it up
        }
    });
    }

    rehydrateExistingContent();
};

function bringToFront(element) { 
    containerCount++;
    element.style.zIndex = containerCount;
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

async function deleteShape(chartId) {
    // Remove from data
    const cards = chartsData.get(chartId).shape.get();
    const index = shape.findIndex(c => c.id === shapeId);
    if (index > -1) {
        shape.splice(index, 1);
    }

    // Remove from DOM
    const shapeElement = document.getElementById(shapeId);
    if (shapeElement) {
        shapeElement.remove();
    }
    
    // Save board to database
    const chartElement = document.getElementById(chartId);
    await persistBoardToDB(chartElement);
}
