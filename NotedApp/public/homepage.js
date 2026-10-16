const profileBtn = document.getElementById('profileBtn');
const dropdown = document.getElementById('profileDropdown');
const projectsContainer = document.getElementById('projects-container');
const createBtn = document.getElementById('create-btn')
const deleteProjectDialog = document.getElementById('delete-project-dialog');
const deleteProjectName = document.getElementById('delete-project-name');
const cancelProjectDeleteBtn = document.getElementById('cancel-project-delete');
const confirmProjectDeleteBtn = document.getElementById('confirm-project-delete');
let currentUserId = null;
let draggedProjectId = null;
let suppressProjectClickTimer = null;
let suppressProjectClickUntil = 0;

//Project Deletion
function confirmProjectDeletion(projectName) {
    deleteProjectName.textContent = projectName;
    deleteProjectDialog.returnValue = '';

    const confirmation = new Promise((resolve) => {
        deleteProjectDialog.addEventListener('close', () => {
            resolve(deleteProjectDialog.returnValue === 'confirm');
        }, { once: true });
    });

    deleteProjectDialog.showModal();
    return confirmation;
}

cancelProjectDeleteBtn.addEventListener('click', () => {
    deleteProjectDialog.close('cancel');
});

confirmProjectDeleteBtn.addEventListener('click', () => {
    deleteProjectDialog.close('confirm');
});

deleteProjectDialog.addEventListener('click', (e) => {
    if (e.target === deleteProjectDialog) {
        deleteProjectDialog.close('cancel');
    }
});

//Project Ordering
function projectOrderStorageKey() {
    return `noted-project-order:${currentUserId}`;
}

function applySavedProjectOrder(projects) {
    try {
        const savedOrder = JSON.parse(localStorage.getItem(projectOrderStorageKey()) || '[]');
        const projectsById = new Map(projects.map((project) => [String(project.id), project]));
        const orderedProjects = savedOrder
            .map((id) => projectsById.get(String(id)))
            .filter(Boolean);
        const orderedIds = new Set(orderedProjects.map((project) => String(project.id)));

        return orderedProjects.concat(projects.filter((project) => !orderedIds.has(String(project.id))));
    } catch (error) {
        console.warn('Unable to load saved project order:', error);
        return projects;
    }
}

function saveProjectOrder() {
    const order = Array.from(projectsContainer.querySelectorAll('.project-box'), (box) => box.dataset.id);
    try {
        localStorage.setItem(projectOrderStorageKey(), JSON.stringify(order));
    } catch (error) {
        console.warn('Unable to save project order:', error);
    }
}

// Initialization
async function initHomepage() {
    const res = await fetch('/api/me');
    if (!res.ok) {
        window.location.href = 'signin.html'
        return;
    }
    const user = await res.json();
    currentUserId = user.id;
    setUsername(user.username || '');

    await loadProjects();
};

async function loadProjects() {
    try {
        const res = await fetch('/api/projects');
        if (!res.ok) {
            throw new Error('Failed to load projects');
        }
        const projects = await res.json();
        renderProjects(projects);
    } catch (error) {
        console.error('Error loading projects:', error)
    }
}

function renderProjects(projects) {
    projectsContainer.innerHTML = '';

    if (projects.length === 0) {
        const notice = document.createElement('p');
        notice.id = 'projects-notice';
        notice.textContent = 'Your projects will appear here';
        projectsContainer.appendChild(notice);
        return;
    }

    applySavedProjectOrder(projects).forEach(project => {
        projectsContainer.appendChild(createProjectBox(project));
    });
}

//Project Creation
function createProjectBox(project) {
    const box = document.createElement('div');
    box.className = 'project-box';
    box.dataset.id = project.id;
    box.draggable = true;

    box.addEventListener('dragstart', (e) => {
        if (e.target.closest('button, [contenteditable="true"]')) {
            e.preventDefault();
            return;
        }

        draggedProjectId = String(project.id);
        box.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedProjectId);
        clearTimeout(suppressProjectClickTimer);
        suppressProjectClickUntil = 0;
    });

    box.addEventListener('dragend', () => {
        box.classList.remove('is-dragging');
        document.querySelectorAll('.project-box.is-drop-target').forEach((item) => item.classList.remove('is-drop-target'));
        suppressProjectClickUntil = Date.now() + 250;
        suppressProjectClickTimer = setTimeout(() => {
            draggedProjectId = null;
        }, 150);
    });

    box.addEventListener('dragover', (e) => {
        if (!draggedProjectId || draggedProjectId === String(project.id)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        box.classList.add('is-drop-target');
    });

    box.addEventListener('dragleave', (e) => {
        if (!box.contains(e.relatedTarget)) box.classList.remove('is-drop-target');
    });

    box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.classList.remove('is-drop-target');
        const source = Array.from(projectsContainer.querySelectorAll('.project-box'))
            .find((item) => item.dataset.id === draggedProjectId);
        if (!source || source === box) return;

        const rect = box.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();
        const sameRow = Math.abs(sourceRect.top - rect.top) < rect.height / 2;
        const insertBefore = sameRow
            ? e.clientX < rect.left + rect.width / 2
            : e.clientY < rect.top + rect.height / 2;
        projectsContainer.insertBefore(source, insertBefore ? box : box.nextSibling);
        saveProjectOrder();
    });

    const title = document.createElement('span');
    title.className = 'project-title';
    title.textContent = project.project_name;
    box.appendChild(title);

    const renameBtn = document.createElement('button');
    renameBtn.className = 'project-rename-btn';
    renameBtn.type = 'button';
    renameBtn.textContent = '✎';
    renameBtn.title = 'Rename';
    box.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'project-delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '🗑';
    deleteBtn.title = 'Delete';
    box.appendChild(deleteBtn);

    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const confirmed = await confirmProjectDeletion(title.textContent);
        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                throw new Error('Failed to delete project');
            }
            await loadProjects();
        } catch (error) {
            console.error('Error deleteing project:', error);
        }
    });

    box.addEventListener('click', (e) => {
        if (draggedProjectId === String(project.id) || Date.now() < suppressProjectClickUntil) {
            e.preventDefault();
            e.stopPropagation();
            draggedProjectId = null;
            clearTimeout(suppressProjectClickTimer);
            return;
        }
        window.location.href = `workspace.html?id=${project.id}`
    });

    renameBtn.addEventListener('click', (e) => {
       e.stopPropagation();
       title.contentEditable = 'true';
       title.focus();
       document.execCommand('selectAll', false, null);
    });

    title.addEventListener('click', (e) => {
        if (title.isContentEditable) {
            e.stopPropagation();
        }
    });

    title.addEventListener('blur', async () => {
        if (title.contentEditable !== 'true') {
            return
        }
        title.contentEditable = 'false';

        const newName = title.textContent.trim() || 'Untitled Project';
        title.textContent = newName;

        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: newName })
            });
            if (!res.ok) {
                throw new Error('Failed to rename');
            }
        } catch (error) {
            console.error('Error renaming project:', error);
        }
    });

    title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            title.blur();
        }
    });

    return box;
}

//Create Button
createBtn.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_name: 'Untitled Project'})
        });
        if (!res.ok) {
            throw new Error('Failed to create project');
        }
        await loadProjects();
    } catch (error) {
        console.error('Error creating project:', error)
    }
});

//Profile Dropdown
profileBtn.addEventListener('click', () => {
    dropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

//Rename User
const nameInput = document.getElementById( 'nameInput' );
const navbarUserName = document.getElementById('navbarUserName');

function setUsername(username) {
    nameInput.value = username;
    navbarUserName.textContent = username;
}

nameInput.addEventListener('blur', async () => {
    const newName = nameInput.value.trim();
    if (!newName) {
        nameInput.value = navbarUserName.textContent;
        return;
    }

    try {
        const res = await fetch('/api/me', {
            method: 'PUT',
            headers: { 'Content-Type' : 'application/json' },
            body: JSON.stringify({ username: newName })
        });
        if (!res.ok) {
            throw new Error('Failed to update username');
        }
        setUsername(newName);
    } catch (error) {
        nameInput.value = navbarUserName.textContent;
        console.error( 'Error updating username:', error);
    }
});

nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        nameInput.blur();
    }
});

//Profile Picture
const defaultAvatar = "default-avatar.png"; // defautlt profile picture
const userAvatarUrl = null;

function setAvatar(url) {
    const finalUrl = url || defaultAvatar;
    document.getElementById('avatarImg').src = finalUrl;
    document.getElementById('dropdownAvatarImg').src = finalUrl;
}

setAvatar(userAvatarUrl);

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', {method: 'POST' });
    window.location.href = '/signin.html';
});

initHomepage();