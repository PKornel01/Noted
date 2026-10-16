const pictureApiBaseUrl = `${API_BASE_URL}/pictures`;
const pictureCanvas = document.getElementById('shared-canvas');
const pictureModules = new Map();
let pictureModuleSequence = 0;

async function requestPictureApi(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || `Picture request failed (${response.status})`);
    }
    return response.json();
}

async function createPictureRecord(title, data, xPos, yPos) {
    return requestPictureApi(pictureApiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, data, xPos, yPos, projectId })
    });
}

async function savePictureRecord(id, title, data, xPos, yPos) {
    return requestPictureApi(`${pictureApiBaseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, data, xPos, yPos })
    });
}

async function deletePictureRecord(id) {
    return requestPictureApi(`${pictureApiBaseUrl}/${id}`, { method: 'DELETE' });
}

function buildPictureModule(picture, id, position = {}) {
    const wrapper = document.createElement('article');
    wrapper.className = 'picture-module';
    wrapper.id = id;
    wrapper.style.left = `${position.xPos || 0}px`;
    wrapper.style.top = `${position.yPos || 0}px`;
    wrapper.innerHTML = `
        <header class="picture-module-handle">
            <span class="picture-module-title">Picture</span>
            <button class="picture-module-delete" type="button" aria-label="Delete picture" title="Delete picture">×</button>
        </header>
        <div class="picture-module-content">
            <div class="picture-module-frame">
                <img class="picture-module-image" alt="" hidden>
                <span class="picture-module-placeholder">Add a picture using an image URL.</span>
            </div>
            <form class="picture-module-form">
                <label class="picture-module-label" for="${id}-url">Image URL</label>
                <div class="picture-module-input-row">
                    <input id="${id}-url" class="picture-module-url" type="url" placeholder="https://example.com/image.jpg" required>
                    <button class="picture-module-add" type="submit">Add</button>
                </div>
            </form>
        </div>
    `;

    const content = wrapper.querySelector('.picture-module-content');
    if (picture.data) content.innerHTML = picture.data;
    pictureModules.set(id, { title: picture.title || 'Picture', persistentId: picture.id || null });
    attachPictureModuleEvents(wrapper);
    return wrapper;
}

async function persistPictureModule(wrapper) {
    const metadata = pictureModules.get(wrapper.id);
    if (!metadata) return;
    const save = async () => {
        const content = wrapper.querySelector('.picture-module-content').innerHTML;
        const xPos = Number.parseInt(wrapper.style.left, 10) || 0;
        const yPos = Number.parseInt(wrapper.style.top, 10) || 0;
        if (!metadata.persistentId) {
            const created = await createPictureRecord(metadata.title, content, xPos, yPos);
            metadata.persistentId = created.id;
        }
        await savePictureRecord(metadata.persistentId, metadata.title, content, xPos, yPos);
    };
    metadata.savePromise = (metadata.savePromise || Promise.resolve()).then(save, save);
    return metadata.savePromise;
}

function attachPictureModuleEvents(wrapper) {
    const content = wrapper.querySelector('.picture-module-content');
    const form = content.querySelector('.picture-module-form');
    const input = content.querySelector('.picture-module-url');
    const image = content.querySelector('.picture-module-image');
    const placeholder = content.querySelector('.picture-module-placeholder');
    const syncImageState = () => {
        image.hidden = !image.getAttribute('src');
        placeholder.hidden = !image.getAttribute('src');
        if (image.getAttribute('src')) input.value = image.getAttribute('src');
    };
    syncImageState();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        input.setCustomValidity('');
        if (!form.reportValidity()) return;
        const imageUrl = new URL(input.value.trim());
        if (imageUrl.protocol !== 'http:' && imageUrl.protocol !== 'https:') {
            input.setCustomValidity('Enter an HTTP or HTTPS image URL.');
            input.reportValidity();
            return;
        }
        image.src = imageUrl.href;
        image.alt = 'Picture added to workspace';
        image.hidden = false;
        placeholder.hidden = true;
        try {
            await persistPictureModule(wrapper);
        } catch (error) {
            console.error('Error saving picture:', error);
            alert(`Could not save picture: ${error.message}`);
        }
    });
    wrapper.querySelector('.picture-module-delete').addEventListener('click', async () => {
        const metadata = pictureModules.get(wrapper.id);
        try {
            if (metadata.savePromise) await metadata.savePromise;
            if (metadata.persistentId) await deletePictureRecord(metadata.persistentId);
            pictureModules.delete(wrapper.id);
            wrapper.remove();
        } catch (error) {
            console.error('Error deleting picture:', error);
            alert(`Could not delete picture: ${error.message}`);
        }
    });
    makePictureModuleMovable(wrapper);
}

function makePictureModuleMovable(wrapper) {
    const handle = wrapper.querySelector('.picture-module-handle');
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
            growCanvasIfNeeded(pictureCanvas, left + wrapper.offsetWidth, top + wrapper.offsetHeight);
        }

        async function stop() {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', stop);
            document.removeEventListener('pointercancel', stop);
            stopModuleAutoScroll();
            try {
                await persistPictureModule(wrapper);
            } catch (error) {
                console.error('Error saving picture position:', error);
                alert(`Could not save picture position: ${error.message}`);
            }
        }

        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', stop, { once: true });
        document.addEventListener('pointercancel', stop, { once: true });
    });
}

async function loadPictureModules() {
    const pictures = await requestPictureApi(`${pictureApiBaseUrl}?projectId=${encodeURIComponent(projectId)}`);
    pictures.forEach((picture) => {
        const id = `picture-${picture.id}`;
        if (document.getElementById(id)) return;
        const wrapper = buildPictureModule(picture, id, { xPos: picture.xPos, yPos: picture.yPos });
        pictureCanvas.appendChild(wrapper);
        bringModuleToFront(wrapper);
        growCanvasIfNeeded(pictureCanvas, wrapper.offsetLeft + wrapper.offsetWidth, wrapper.offsetTop + wrapper.offsetHeight);
    });
}

document.getElementById('picturemaker').addEventListener('click', async () => {
    const count = pictureCanvas.querySelectorAll('.picture-module').length;
    const isCompactViewport = window.matchMedia('(max-width: 760px)').matches;
    const width = isCompactViewport ? Math.min(360, window.innerWidth - 40) : 360;
    const id = `picture-${Date.now()}-${pictureModuleSequence++}`;
    const wrapper = buildPictureModule({ title: 'Picture', data: '' }, id, {
        xPos: isCompactViewport
            ? Math.min(16 + count * 16, Math.max(0, pictureCanvas.clientWidth - width))
            : 100 + count * 20,
        yPos: isCompactViewport
            ? Math.min(16 + count * 16, Math.max(0, pictureCanvas.clientHeight - 320))
            : 100 + count * 20
    });
    pictureCanvas.appendChild(wrapper);
    bringModuleToFront(wrapper);
    growCanvasIfNeeded(pictureCanvas, wrapper.offsetLeft + wrapper.offsetWidth, wrapper.offsetTop + wrapper.offsetHeight);
    try {
        await persistPictureModule(wrapper);
        wrapper.querySelector('.picture-module-url').focus();
    } catch (error) {
        console.error('Error creating picture module:', error);
        alert(`Could not create picture module: ${error.message}`);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadPictureModules().catch((error) => console.error('Error loading pictures:', error));
});
