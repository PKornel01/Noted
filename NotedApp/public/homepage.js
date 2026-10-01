const profileBtn = document.getElementById('profileBtn');
const dropdown = document.getElementById('profileDropdown');
const projectsContainer = document.getElementById('projects-container');
const createBtn = document.getElementById('create-btn')

async function initHomepage() {
    const res = await fetch('/api/me');
    if (!res.ok) {
        window.location.href = 'signin.html'
        return;
    }
    const user = await res.json();
    document.getElementById('nameInput').value = user.username || '';

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

    projects.forEach(project => {
        projectsContainer.appendChild(createProjectBox(project));
    });
}

function createProjectBox(project) {
    const box = document.createElement('div');
    box.className = 'project-box';
    box.dataset.id = project.id;

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

    box.addEventListener('click', () => {
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

profileBtn.addEventListener('click', () => {
    dropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

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