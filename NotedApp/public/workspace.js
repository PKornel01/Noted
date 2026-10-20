(async function requireLogin() {
    const res = await fetch('/api/me');
    if (!res.ok) window.location.href = '/signin.html';
})();
const API_BASE_URL = 'http://localhost:3000/api';

const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');

if (!projectId) {
    window.location.href = '/homepage.html';
}

const sheetEl = document.getElementById('sheet');
const sidebar = document.getElementById('sidebar');
const workspaceBrand = document.getElementById('workspace-brand');
const workspaceInfoButton = document.getElementById('workspace-info-button');
const workspaceInfoDialog = document.getElementById('workspace-info-dialog');
const initialPixelRatio = window.devicePixelRatio || 1;
let moduleDragPointerX = null;
let moduleDragPointerY = null;
let moduleAutoScrollFrame = null;

function updateSidebarZoomCompensation() {
    const scale = initialPixelRatio / (window.devicePixelRatio || initialPixelRatio);
    [sidebar, workspaceBrand, workspaceInfoButton].forEach((element) => {
        if (element) element.style.setProperty('--sidebar-scale', String(scale));
    });
}

updateSidebarZoomCompensation();
window.addEventListener('resize', updateSidebarZoomCompensation);

workspaceInfoButton.addEventListener('click', () => {
    const activeDevice = window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
    setWorkspaceInfoDevice(activeDevice);
    workspaceInfoDialog.showModal();
});

workspaceInfoDialog.querySelector('.workspace-info-close').addEventListener('click', () => {
    workspaceInfoDialog.close();
});

workspaceInfoDialog.addEventListener('click', (event) => {
    if (event.target === workspaceInfoDialog) workspaceInfoDialog.close();
});

workspaceInfoDialog.querySelectorAll('.workspace-info-tab').forEach((tab) => {
    tab.addEventListener('click', () => setWorkspaceInfoDevice(tab.dataset.device));
});

function setWorkspaceInfoDevice(device) {
    workspaceInfoDialog.querySelectorAll('.workspace-info-tab').forEach((tab) => {
        tab.setAttribute('aria-pressed', String(tab.dataset.device === device));
    });
    workspaceInfoDialog.querySelectorAll('.workspace-info-content').forEach((section) => {
        section.hidden = section.dataset.deviceContent !== device;
    });
}

function bringModuleToFront(element) {
    const modules = document.querySelectorAll(
        '#shared-canvas > .board-container, #shared-canvas > .chart-container, #shared-canvas > .note-module, #shared-canvas > .picture-module'
    );
    const highestZIndex = Array.from(modules).reduce((highest, module) => {
        const zIndex = Number.parseInt(module.style.zIndex, 10) || 0;
        return Math.max(highest, zIndex);
    }, 0);

    element.style.zIndex = String(highestZIndex + 1);
}

function updateModuleDragPointer(clientX, clientY) {
    moduleDragPointerX = clientX;
    moduleDragPointerY = clientY;
    if (moduleAutoScrollFrame === null) {
        moduleAutoScrollFrame = requestAnimationFrame(autoScrollWorkspace);
    }
}

function autoScrollWorkspace() {
    if (moduleDragPointerY === null) {
        moduleAutoScrollFrame = null;
        return;
    }

    const edgeSize = 56;
    const maxScrollStep = 18;
    const pane = document.getElementById('shared-pane');
    const paneRect = pane.getBoundingClientRect();
    const paneCanScrollRight = pane.scrollLeft + pane.clientWidth < pane.scrollWidth;
    const paneCanScrollLeft = pane.scrollLeft > 0;
    const paneCanScrollDown = pane.scrollTop + pane.clientHeight < pane.scrollHeight;
    const paneCanScrollUp = pane.scrollTop > 0;
    const visiblePaneLeft = Math.max(0, paneRect.left);
    const visiblePaneRight = Math.min(window.innerWidth, paneRect.right);
    const visiblePaneTop = Math.max(0, paneRect.top);
    const visiblePaneBottom = Math.min(window.innerHeight, paneRect.bottom);

    if (visiblePaneRight > visiblePaneLeft && moduleDragPointerX >= visiblePaneRight - edgeSize && paneCanScrollRight) {
        pane.scrollLeft += maxScrollStep;
    } else if (visiblePaneRight > visiblePaneLeft && moduleDragPointerX <= visiblePaneLeft + edgeSize && paneCanScrollLeft) {
        pane.scrollLeft -= maxScrollStep;
    }

    if (visiblePaneBottom > visiblePaneTop && moduleDragPointerY >= visiblePaneBottom - edgeSize && paneCanScrollDown) {
        pane.scrollTop += maxScrollStep;
    } else if (visiblePaneBottom > visiblePaneTop && moduleDragPointerY <= visiblePaneTop + edgeSize && paneCanScrollUp) {
        pane.scrollTop -= maxScrollStep;
    }

    moduleAutoScrollFrame = requestAnimationFrame(autoScrollWorkspace);
}

function stopModuleAutoScroll() {
    moduleDragPointerX = null;
    moduleDragPointerY = null;
    if (moduleAutoScrollFrame !== null) {
        cancelAnimationFrame(moduleAutoScrollFrame);
        moduleAutoScrollFrame = null;
    }
}

function growCanvasIfNeeded(canvas, neededWidth, neededHeight) {
    const padding = 40;
    if (neededWidth + padding > canvas.offsetWidth) {
        canvas.style.width = (neededWidth + padding) + 'px';
    }
    if (neededHeight + padding > canvas.offsetHeight) {
        canvas.style.height = (neededHeight + padding) + 'px';
    }
}