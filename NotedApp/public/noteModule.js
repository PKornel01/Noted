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
            <button class="note-module-delete" type="button" aria-label="Delete note" title="Delete note">×</button>
        </header>
        <div class="note-module-content" contenteditable="true" role="textbox" aria-label="Note content" aria-multiline="true" data-placeholder="Write a note..."></div>
        <footer class="note-module-footer">
            <span class="note-module-status" aria-live="polite">Saved</span>
            <button class="note-module-save" type="button">Save</button>
        </footer>
    `;
    wrapper.querySelector('.note-module-content').innerHTML = note.data || '';
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
        }
        await saveNoteRecord(metadata.persistentId, metadata.title, content, xPos, yPos);
        status.textContent = 'Saved';
    };
    metadata.savePromise = (metadata.savePromise || Promise.resolve()).then(save, save);
    return metadata.savePromise;
}

function attachNoteModuleEvents(wrapper) {
    const content = wrapper.querySelector('.note-module-content');
    const save = () => persistNoteModule(wrapper).catch((error) => {
        console.error('Error saving note:', error);
        wrapper.querySelector('.note-module-status').textContent = 'Save failed';
        alert(`Could not save note: ${error.message}`);
    });
    let saveTimer;

    content.addEventListener('input', () => {
        wrapper.querySelector('.note-module-status').textContent = 'Unsaved';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 700);
    });
    content.addEventListener('blur', () => {
        clearTimeout(saveTimer);
        if (wrapper.querySelector('.note-module-status').textContent === 'Unsaved') save();
    });
    wrapper.querySelector('.note-module-save').addEventListener('click', save);
    wrapper.querySelector('.note-module-delete').addEventListener('click', async () => {
        const metadata = noteModules.get(wrapper.id);
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
    makeNoteModuleMovable(wrapper);
}

function makeNoteModuleMovable(wrapper) {
    const handle = wrapper.querySelector('.note-module-handle');
    handle.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = wrapper.offsetLeft;
        const startTop = wrapper.offsetTop;
        bringModuleToFront(wrapper);
        updateModuleDragPointer(event.clientX, event.clientY);

        function move(moveEvent) {
            updateModuleDragPointer(moveEvent.clientX, moveEvent.clientY);
            const left = Math.max(0, startLeft + moveEvent.clientX - startX);
            const top = Math.max(0, startTop + moveEvent.clientY - startY);
            wrapper.style.left = `${left}px`;
            wrapper.style.top = `${top}px`;
            growCanvasIfNeeded(noteCanvas, left + wrapper.offsetWidth, top + wrapper.offsetHeight);
        }

        async function stop() {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', stop);
            document.removeEventListener('pointercancel', stop);
            stopModuleAutoScroll();
            try {
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
    const count = noteCanvas.querySelectorAll('.note-module').length;
    const isCompactViewport = window.matchMedia('(max-width: 760px)').matches;
    const width = isCompactViewport ? Math.min(320, window.innerWidth - 40) : 320;
    const id = `note-${Date.now()}-${noteModuleSequence++}`;
    const wrapper = buildNoteModule({ title: 'Note', data: '' }, id, {
        xPos: isCompactViewport
            ? Math.min(16 + count * 16, Math.max(0, noteCanvas.clientWidth - width))
            : 100 + count * 20,
        yPos: isCompactViewport
            ? Math.min(16 + count * 16, Math.max(0, noteCanvas.clientHeight - 220))
            : 100 + count * 20
    });
    noteCanvas.appendChild(wrapper);
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
