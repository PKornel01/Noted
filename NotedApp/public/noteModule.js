const noteApiBaseUrl = `${API_BASE_URL}/notes`;
const noteCanvas = document.getElementById('shared-canvas');
const noteModules = new Map();
let noteModuleSequence = 0;

async function requestNoteApi(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || `Note request failed (${response.status})`);
    }
    return response.json();
}

async function createNoteRecord(title, data, xPos, yPos) {
    return requestNoteApi(noteApiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, data, xPos, yPos, projectId })
    });
}

async function saveNoteRecord(id, title, data, xPos, yPos) {
    return requestNoteApi(`${noteApiBaseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, data, xPos, yPos })
    });
}

async function deleteNoteRecord(id) {
    return requestNoteApi(`${noteApiBaseUrl}/${id}`, { method: 'DELETE' });
}

function buildNoteModule(note, id, position = {}) {
    const wrapper = document.createElement('article');
    wrapper.className = 'note-module';
    wrapper.id = id;
    wrapper.style.left = `${position.xPos || 0}px`;
    wrapper.style.top = `${position.yPos || 0}px`;
    wrapper.innerHTML = `
        <header class="note-module-handle">
            <span class="note-module-title">Note</span>
            <button class="board-title-edit-btn note-module-title-edit-btn" type="button" title="Click to edit note title" aria-label="Edit note title">✎</button>
            <button class="board-delete-btn note-module-delete" type="button" aria-label="Delete note" title="Delete note">🗑</button>
        </header>
        <div class="note-module-content" contenteditable="true" role="textbox" aria-label="Note content" aria-multiline="true" data-placeholder="Write a note..."></div>
        <footer class="note-module-footer">
            <span class="note-module-status" aria-live="polite">Saved</span>
            <button class="note-module-save" type="button">Save</button>
        </footer>
        <button class="note-module-resize" type="button" aria-label="Resize note" title="Resize note"></button>
    `;
    wrapper.querySelector('.note-module-content').innerHTML = note.data || '';
    wrapper.querySelector('.note-module-title').textContent = note.title || 'Note';
    noteModules.set(id, { title: note.title || 'Note', persistentId: note.id || null });
    attachNoteModuleEvents(wrapper);
    return wrapper;
}

async function persistNoteModule(wrapper) {
    const metadata = noteModules.get(wrapper.id);
    if (!metadata) return;
    const save = async () => {
        const content = wrapper.querySelector('.note-module-content').innerHTML;
        const xPos = Number.parseInt(wrapper.style.left, 10) || 0;
        const yPos = Number.parseInt(wrapper.style.top, 10) || 0;
        const status = wrapper.querySelector('.note-module-status');
        status.textContent = 'Saving...';

        if (!metadata.persistentId) {
            const created = await createNoteRecord(metadata.title, content, xPos, yPos);
            metadata.persistentId = created.id;
        } else {
            await saveNoteRecord(metadata.persistentId, metadata.title, content, xPos, yPos);
        }
        status.textContent = 'Saved';
    };
    // Queue saves so rapid edits or drags cannot finish out of order.
    metadata.savePromise = (metadata.savePromise || Promise.resolve()).then(save, save);
    return metadata.savePromise;
}

function attachNoteModuleEvents(wrapper) {
    const content = wrapper.querySelector('.note-module-content');
    const saveButton = wrapper.querySelector('.note-module-save');
    let saveTimer;
    const save = async () => {
        clearTimeout(saveTimer);
        saveButton.disabled = true;
        try {
            await persistNoteModule(wrapper);
        } catch (error) {
            console.error('Error saving note:', error);
            wrapper.querySelector('.note-module-status').textContent = 'Save failed';
            alert(`Could not save note: ${error.message}`);
        } finally {
            saveButton.disabled = false;
        }
    };

    content.addEventListener('input', () => {
        wrapper.querySelector('.note-module-status').textContent = 'Unsaved';
        clearTimeout(saveTimer);
        // Wait for typing to pause before saving, while blur still saves immediately.
        saveTimer = setTimeout(save, 700);
    });
    content.addEventListener('blur', () => {
        clearTimeout(saveTimer);
        if (wrapper.querySelector('.note-module-status').textContent === 'Unsaved') save();
    });
    saveButton.addEventListener('click', save);
    wrapper.querySelector('.note-module-title-edit-btn').addEventListener('click', () => {
        openNoteTitleEditModal(wrapper);
    });
    wrapper.querySelector('.note-module-delete').addEventListener('click', async () => {
        const metadata = noteModules.get(wrapper.id);
        const confirmed = await confirmWorkspaceDeletion(
            'Delete note?',
            `Are you sure you want to delete "${metadata.title}"? This cannot be undone.`
        );
        if (!confirmed) return;
        try {
            if (metadata.savePromise) await metadata.savePromise;
            if (metadata.persistentId) await deleteNoteRecord(metadata.persistentId);
            noteModules.delete(wrapper.id);
            wrapper.remove();
        } catch (error) {
            console.error('Error deleting note:', error);
            alert(`Could not delete note: ${error.message}`);
        }
    });
    makeNoteModuleResizable(wrapper);
    makeNoteModuleMovable(wrapper);
}

function makeNoteModuleResizable(wrapper) {
    const handle = wrapper.querySelector('.note-module-resize');
    let startX;
    let startY;
    let startWidth;
    let startHeight;

    function resizeTo(width, height) {
        const styles = getComputedStyle(wrapper);
        wrapper.style.width = `${Math.max(parseFloat(styles.minWidth), width)}px`;
        wrapper.style.height = `${Math.max(parseFloat(styles.minHeight), height)}px`;
        growCanvasIfNeeded(noteCanvas, wrapper.offsetLeft + wrapper.offsetWidth, wrapper.offsetTop + wrapper.offsetHeight);
    }

    function stopResize() {
        document.removeEventListener('pointermove', resize);
        document.removeEventListener('pointerup', stopResize);
        document.removeEventListener('pointercancel', stopResize);
    }

    function resize(event) {
        resizeTo(startWidth + event.clientX - startX, startHeight + event.clientY - startY);
    }

    handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        startX = event.clientX;
        startY = event.clientY;
        startWidth = wrapper.offsetWidth;
        startHeight = wrapper.offsetHeight;
        bringModuleToFront(wrapper);
        document.addEventListener('pointermove', resize);
        document.addEventListener('pointerup', stopResize);
        document.addEventListener('pointercancel', stopResize);
    });

    handle.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 20 : 10;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            resizeTo(wrapper.offsetWidth + (event.key === 'ArrowRight' ? step : 0), wrapper.offsetHeight + (event.key === 'ArrowDown' ? step : 0));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            resizeTo(wrapper.offsetWidth - (event.key === 'ArrowLeft' ? step : 0), wrapper.offsetHeight - (event.key === 'ArrowUp' ? step : 0));
        }
    });
}

function openNoteTitleEditModal(wrapper) {
    const metadata = noteModules.get(wrapper.id);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="form-modal-content">
            <h2>Edit Note Title</h2>
            <form>
                <div class="form-group">
                    <label for="boardTitleInput">Note Title: (Max 50 characters)</label>
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
    input.value = metadata.title;
    input.focus();
    input.select();

    const close = () => modal.remove();
    modal.querySelector('.form-cancel-btn').addEventListener('click', close);
    modal.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const newTitle = input.value.trim();
        if (!newTitle) return;

        const previousTitle = metadata.title;
        metadata.title = newTitle;
        wrapper.querySelector('.note-module-title').textContent = newTitle;
        try {
            await persistNoteModule(wrapper);
            close();
        } catch (error) {
            // Keep the displayed title consistent with the last successfully saved title.
            metadata.title = previousTitle;
            wrapper.querySelector('.note-module-title').textContent = previousTitle;
            console.error('Error saving note title:', error);
            alert(`Could not save note title: ${error.message}`);
        }
    });
}

function makeNoteModuleMovable(wrapper) {
    const handle = wrapper.querySelector('.note-module-handle');
    handle.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        event.preventDefault();
        const moduleRect = wrapper.getBoundingClientRect();
        const pointerOffsetX = event.clientX - moduleRect.left;
        const pointerOffsetY = event.clientY - moduleRect.top;
        setModuleDragPositionUpdater(() => positionModuleUnderPointer(wrapper, noteCanvas, pointerOffsetX, pointerOffsetY));
        bringModuleToFront(wrapper);
        updateModuleDragPointer(event.clientX, event.clientY);

        function move(moveEvent) {
            updateModuleDragPointer(moveEvent.clientX, moveEvent.clientY);
            positionModuleUnderPointer(wrapper, noteCanvas, pointerOffsetX, pointerOffsetY);
        }

        async function stop() {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', stop);
            document.removeEventListener('pointercancel', stop);
            stopModuleAutoScroll();
            try {
                // Persist the final position after the pointer gesture ends.
                await persistNoteModule(wrapper);
            } catch (error) {
                console.error('Error saving note position:', error);
                alert(`Could not save note position: ${error.message}`);
            }
        }

        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', stop, { once: true });
        document.addEventListener('pointercancel', stop, { once: true });
    });
}

async function loadNoteModules() {
    const notes = await requestNoteApi(`${noteApiBaseUrl}?projectId=${encodeURIComponent(projectId)}`);
    notes.forEach((note) => {
        const id = `note-${note.id}`;
        if (document.getElementById(id)) return;
        const wrapper = buildNoteModule(note, id, { xPos: note.xPos, yPos: note.yPos });
        noteCanvas.appendChild(wrapper);
        bringModuleToFront(wrapper);
        growCanvasIfNeeded(noteCanvas, wrapper.offsetLeft + wrapper.offsetWidth, wrapper.offsetTop + wrapper.offsetHeight);
    });
}

document.getElementById('notemaker').addEventListener('click', async () => {
    const id = `note-${Date.now()}-${noteModuleSequence++}`;
    const wrapper = buildNoteModule({ title: 'Note', data: '' }, id);
    noteCanvas.appendChild(wrapper);
    centerModuleInWorkspaceView(noteCanvas, wrapper);
    bringModuleToFront(wrapper);
    growCanvasIfNeeded(noteCanvas, wrapper.offsetLeft + wrapper.offsetWidth, wrapper.offsetTop + wrapper.offsetHeight);
    try {
        await persistNoteModule(wrapper);
        wrapper.querySelector('.note-module-content').focus();
    } catch (error) {
        console.error('Error creating note:', error);
        wrapper.querySelector('.note-module-status').textContent = 'Save failed';
        alert(`Could not create note: ${error.message}`);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadNoteModules().catch((error) => console.error('Error loading notes:', error));
});
