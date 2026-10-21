const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.SESSION_SECRET = 'automated-test-session-secret';
const app = require('../server');

function createTestPool() {
  const state = {
    users: [],
    projects: [],
    userProjects: [],
    modules: [],
    nextUserId: 1,
    nextProjectId: 1,
    nextModuleId: 1,
    connectionError: null,
    queryError: null,
    pingError: null,
  };

  const connection = {
    async query(sql, params = []) {
      const statement = sql.replace(/\s+/g, ' ').trim();
      if (state.queryError) throw state.queryError;

      if (statement === 'SELECT id FROM users WHERE email = ?') {
        return [state.users.filter((user) => user.email === params[0]).map(({ id }) => ({ id }))];
      }
      if (statement.startsWith('INSERT INTO users ')) {
        const [username, email, password, bio, title] = params;
        const user = { id: state.nextUserId++, username, email, password, bio, title };
        state.users.push(user);
        return [{ insertId: user.id }];
      }
      if (statement === 'SELECT * FROM users WHERE email = ?') {
        return [state.users.filter((user) => user.email === params[0])];
      }
      if (statement.startsWith('SELECT id, username, email, bio, title FROM users WHERE id = ?')) {
        const user = state.users.find((entry) => entry.id === Number(params[0]));
        return [user ? [{ id: user.id, username: user.username, email: user.email, bio: user.bio, title: user.title }] : []];
      }
      if (statement.startsWith('UPDATE users SET username = ? WHERE id = ?')) {
        const user = state.users.find((entry) => entry.id === Number(params[1]));
        if (user) user.username = params[0];
        return [{ affectedRows: user ? 1 : 0 }];
      }
      if (statement.startsWith('INSERT INTO projects ')) {
        const project = { id: state.nextProjectId++, project_name: params[0] };
        state.projects.push(project);
        return [{ insertId: project.id }];
      }
      if (statement.includes('FROM projects p JOIN user_projects up')) {
        const userId = Number(params[0]);
        const projects = state.userProjects
          .filter((link) => link.user_id === userId)
          .map((link) => state.projects.find((project) => project.id === link.project_id))
          .filter(Boolean)
          .sort((a, b) => b.id - a.id)
          .map(({ id, project_name }) => ({ id, project_name }));
        return [projects];
      }
      if (statement.startsWith('INSERT INTO user_projects ')) {
        state.userProjects.push({ user_id: Number(params[0]), project_id: Number(params[1]) });
        return [{ affectedRows: 1 }];
      }
      if (statement.startsWith('SELECT project_id FROM user_projects WHERE project_id = ? AND user_id = ?')) {
        const link = state.userProjects.find((entry) => entry.project_id === Number(params[0]) && entry.user_id === Number(params[1]));
        return [link ? [{ project_id: link.project_id }] : []];
      }
      if (statement.startsWith('UPDATE projects SET project_name = ? WHERE id = ?')) {
        const project = state.projects.find((entry) => entry.id === Number(params[1]));
        if (project) project.project_name = params[0];
        return [{ affectedRows: project ? 1 : 0 }];
      }
      if (statement.startsWith('DELETE FROM modules WHERE project_id')) {
        state.modules = state.modules.filter((module) => module.project_id !== Number(params[0]));
        return [{ affectedRows: 1 }];
      }
      if (statement.startsWith('DELETE FROM user_projects WHERE project_id')) {
        state.userProjects = state.userProjects.filter((link) => link.project_id !== Number(params[0]));
        return [{ affectedRows: 1 }];
      }
      if (statement.startsWith('DELETE FROM projects WHERE id')) {
        state.projects = state.projects.filter((project) => project.id !== Number(params[0]));
        return [{ affectedRows: 1 }];
      }
      if (statement.startsWith('SELECT m.id FROM modules m JOIN user_projects up')) {
        const module = state.modules.find((entry) => entry.id === Number(params[0]));
        const moduleType = params.length === 3 ? params[1] : null;
        const userId = params.length === 3 ? params[2] : params[1];
        const owned = module
          && (!moduleType || module.module_type === moduleType)
          && state.userProjects.some((link) => link.project_id === module.project_id && link.user_id === Number(userId));
        return [owned ? [{ id: module.id }] : []];
      }
      if (statement.startsWith('SELECT id, title, data, xPos, yPos FROM modules WHERE project_id')) {
        const moduleType = params.length > 1
          ? params[1]
          : statement.includes("module_type = 'flowchart'") ? 'flowchart' : 'kanban';
        return [state.modules
          .filter((entry) => entry.project_id === Number(params[0]) && entry.module_type === moduleType)
          .sort((a, b) => b.id - a.id)
          .map(({ id, title, data, xPos, yPos }) => ({ id, title, data, xPos, yPos }))];
      }
      if (statement.startsWith('INSERT INTO modules ')) {
        const [project_id, title, data, xPos, yPos] = params;
        const module_type = params.length > 5
          ? params[5]
          : statement.includes("'flowchart'") ? 'flowchart' : 'kanban';
        const module = { id: state.nextModuleId++, project_id: Number(project_id), title, data, xPos, yPos, module_type };
        state.modules.push(module);
        return [{ insertId: module.id }];
      }
      if (statement.startsWith('UPDATE modules SET title = ?')) {
        const module = state.modules.find((entry) => entry.id === Number(params[4]));
        const moduleType = params[5];
        if (module && (!moduleType || module.module_type === moduleType)) {
          Object.assign(module, { title: params[0], data: params[1], xPos: params[2], yPos: params[3] });
        }
        return [{ affectedRows: module ? 1 : 0 }];
      }
      if (statement.startsWith('DELETE FROM modules WHERE id = ?')) {
        const priorLength = state.modules.length;
        const moduleType = params[1];
        state.modules = state.modules.filter((module) =>
          module.id !== Number(params[0]) || (moduleType && module.module_type !== moduleType));
        return [{ affectedRows: priorLength - state.modules.length }];
      }

      throw new Error(`Unmocked SQL in test: ${statement}`);
    },
    async ping() {
      if (state.pingError) throw state.pingError;
    },
    release() {},
  };

  return {
    state,
    async getConnection() {
      if (state.connectionError) throw state.connectionError;
      return connection;
    },
  };
}

async function withServer(run) {
  const pool = createTestPool();
  app.locals.pool = pool;
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    await run({ port, pool });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function request(port, route, { method = 'GET', body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const requestHeaders = { ...headers };
    if (payload !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
      requestHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({ hostname: '127.0.0.1', port, path: route, method, headers: requestHeaders, agent: false }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => {
        let parsed = text;
        try { parsed = text ? JSON.parse(text) : null; } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

function sessionCookie(response) {
  const cookies = response.headers['set-cookie'];
  assert.ok(cookies, 'expected session cookie');
  return cookies[0].split(';')[0];
}

async function register(port, { username = 'Test User', email = 'test@example.com', password = 'test-password', ...profile } = {}) {
  return request(port, '/api/register', { method: 'POST', body: { username, email, password, ...profile } });
}

test('health endpoint, static frontend, and CORS middleware', async () => {
  await withServer(async ({ port }) => {
    const health = await request(port, '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(health.body, { status: 'healthy', database: 'connected' });

    const frontend = await request(port, '/');
    assert.equal(frontend.status, 200);
    assert.match(frontend.headers['content-type'], /text\/html/);
    assert.match(frontend.body, /<html/i);

    const workspace = await request(port, '/workspace.html');
    assert.equal(workspace.status, 200);
    assert.match(workspace.body, /noteModule\.js/);
    assert.match(workspace.body, /pictureModule\.css/);
    for (const asset of [
      '/noteModule.js',
      '/noteModule.css',
      '/pictureModule.js',
      '/pictureModule.css',
    ]) {
      assert.equal((await request(port, asset)).status, 200, `${asset} should be served`);
    }

    const preflight = await request(port, '/api/me', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'GET' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers['access-control-allow-origin'], '*');
  });
});

test('registration validates input, creates a default project, rejects duplicates, and serves profile endpoints', async () => {
  await withServer(async ({ port, pool }) => {
    const unauthenticated = await request(port, '/api/me');
    assert.equal(unauthenticated.status, 401);

    const missing = await request(port, '/api/register', { method: 'POST', body: { username: 'No Email' } });
    assert.equal(missing.status, 400);

    const created = await register(port, { username: 'alice', email: 'alice@example.com', bio: 'PM', title: 'Lead' });
    assert.equal(created.status, 200);
    assert.equal(created.body.email, 'alice@example.com');
    const cookie = sessionCookie(created);
    assert.equal(pool.state.users[0].password === 'test-password', false, 'password must be hashed before persistence');
    assert.equal(pool.state.projects[0].project_name, "alice's Project");

    const duplicate = await register(port, { username: 'alice2', email: 'alice@example.com' });
    assert.equal(duplicate.status, 409);

    const profile = await request(port, '/api/me', { headers: { Cookie: cookie } });
    assert.equal(profile.status, 200);
    assert.deepEqual(profile.body, {
      id: created.body.id,
      username: 'alice',
      email: 'alice@example.com',
      bio: 'PM',
      title: 'Lead',
    });

    const invalidUpdate = await request(port, '/api/me', { method: 'PUT', headers: { Cookie: cookie }, body: { username: '  ' } });
    assert.equal(invalidUpdate.status, 400);
    const update = await request(port, '/api/me', { method: 'PUT', headers: { Cookie: cookie }, body: { username: '  Alice A.  ' } });
    assert.equal(update.status, 200);
    assert.deepEqual(update.body, { username: 'Alice A.' });
    assert.equal(pool.state.users[0].username, 'Alice A.');

    pool.state.users.length = 0;
    const missingUser = await request(port, '/api/me', { headers: { Cookie: cookie } });
    assert.equal(missingUser.status, 404);
  });
});

test('login rejects invalid credentials and logout destroys the authenticated session', async () => {
  await withServer(async ({ port }) => {
    const missing = await request(port, '/api/login', { method: 'POST', body: { email: 'x@example.com' } });
    assert.equal(missing.status, 400);
    const unknown = await request(port, '/api/login', { method: 'POST', body: { email: 'unknown@example.com', password: 'x' } });
    assert.equal(unknown.status, 401);

    await register(port, { username: 'bob', email: 'bob@example.com', password: 'correct-password' });
    const wrongPassword = await request(port, '/api/login', { method: 'POST', body: { email: 'bob@example.com', password: 'wrong-password' } });
    assert.equal(wrongPassword.status, 401);

    const login = await request(port, '/api/login', { method: 'POST', body: { email: 'bob@example.com', password: 'correct-password' } });
    assert.equal(login.status, 200);
    const cookie = sessionCookie(login);
    assert.equal((await request(port, '/api/me', { headers: { Cookie: cookie } })).status, 200);

    const logout = await request(port, '/api/logout', { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(logout.status, 200);
    assert.deepEqual(logout.body, { success: true });
    assert.equal((await request(port, '/api/me', { headers: { Cookie: cookie } })).status, 401);
  });
});

test('project routes enforce authentication and ownership for list, create, rename, and delete', async () => {
  await withServer(async ({ port, pool }) => {
    assert.equal((await request(port, '/api/projects')).status, 401);
    const first = await register(port, { username: 'first', email: 'first@example.com' });
    const firstCookie = sessionCookie(first);
    const second = await register(port, { username: 'second', email: 'second@example.com' });
    const secondCookie = sessionCookie(second);

    const invalid = await request(port, '/api/projects', { method: 'POST', headers: { Cookie: firstCookie }, body: { project_name: '   ' } });
    assert.equal(invalid.status, 400);
    const created = await request(port, '/api/projects', { method: 'POST', headers: { Cookie: firstCookie }, body: { project_name: '  Launch plan  ' } });
    assert.equal(created.status, 200);
    assert.equal(created.body.project_name, 'Launch plan');

    const listed = await request(port, '/api/projects', { headers: { Cookie: firstCookie } });
    assert.deepEqual(listed.body.map((project) => project.project_name), ['Launch plan', "first's Project"]);
    assert.deepEqual((await request(port, '/api/projects', { headers: { Cookie: secondCookie } })).body.map((project) => project.project_name), ["second's Project"]);

    const forbiddenRename = await request(port, `/api/projects/${created.body.id}`, { method: 'PUT', headers: { Cookie: secondCookie }, body: { project_name: 'Hijack' } });
    assert.equal(forbiddenRename.status, 403);
    const renamed = await request(port, `/api/projects/${created.body.id}`, { method: 'PUT', headers: { Cookie: firstCookie }, body: { project_name: 'Release plan' } });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.project_name, 'Release plan');

    const forbiddenDelete = await request(port, `/api/projects/${created.body.id}`, { method: 'DELETE', headers: { Cookie: secondCookie } });
    assert.equal(forbiddenDelete.status, 403);
    const deleted = await request(port, `/api/projects/${created.body.id}`, { method: 'DELETE', headers: { Cookie: firstCookie } });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.success, true);
    assert.equal(pool.state.projects.some((project) => project.id === created.body.id), false);
  });
});

test('Kanban board routes validate input and support authorized CRUD operations', async () => {
  await withServer(async ({ port }) => {
    assert.equal((await request(port, '/api/boards')).status, 401);
    const owner = await register(port, { username: 'owner', email: 'owner@example.com' });
    const ownerCookie = sessionCookie(owner);
    const other = await register(port, { username: 'other', email: 'other@example.com' });
    const otherCookie = sessionCookie(other);
    const project = await request(port, '/api/projects', { method: 'POST', headers: { Cookie: ownerCookie }, body: { project_name: 'Board Project' } });
    const projectId = project.body.id;

    assert.equal((await request(port, '/api/boards', { headers: { Cookie: ownerCookie } })).status, 400);
    assert.equal((await request(port, '/api/boards', { method: 'POST', headers: { Cookie: ownerCookie }, body: { projectId } })).status, 400);
    assert.equal((await request(port, '/api/boards', { method: 'POST', headers: { Cookie: ownerCookie }, body: { title: 'No project' } })).status, 400);
    assert.equal((await request(port, '/api/boards', { method: 'POST', headers: { Cookie: otherCookie }, body: { title: 'Forbidden', projectId } })).status, 403);
    assert.equal((await request(port, `/api/boards?projectId=${projectId}`, { headers: { Cookie: otherCookie } })).status, 403);

    const created = await request(port, '/api/boards', {
      method: 'POST', headers: { Cookie: ownerCookie },
      body: { title: 'Sprint board', data: '[]', xPos: 20, yPos: 40, projectId },
    });
    assert.equal(created.status, 200);
    assert.deepEqual(created.body, { id: created.body.id, title: 'Sprint board', data: '[]', xPos: 20, yPos: 40 });
    assert.equal((await request(port, `/api/boards?projectId=${projectId}`, { headers: { Cookie: ownerCookie } })).body[0].title, 'Sprint board');
    assert.equal((await request(port, `/api/boards/${created.body.id}`, { method: 'PUT', headers: { Cookie: ownerCookie }, body: { data: '[]' } })).status, 400);
    assert.equal((await request(port, `/api/boards/${created.body.id}`, { method: 'PUT', headers: { Cookie: otherCookie }, body: { title: 'Edit' } })).status, 403);

    const updated = await request(port, `/api/boards/${created.body.id}`, {
      method: 'PUT', headers: { Cookie: ownerCookie },
      body: { title: 'Updated sprint board', data: '[{"todo":true}]', xPos: 30, yPos: 60 },
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body, { id: String(created.body.id), title: 'Updated sprint board', data: '[{"todo":true}]', xPos: 30, yPos: 60 });
    assert.equal((await request(port, `/api/boards/${created.body.id}`, { method: 'DELETE', headers: { Cookie: otherCookie } })).status, 403);
    assert.equal((await request(port, `/api/boards/${created.body.id}`, { method: 'DELETE', headers: { Cookie: ownerCookie } })).body.success, true);
    assert.equal((await request(port, `/api/boards/${created.body.id}`, { method: 'DELETE', headers: { Cookie: ownerCookie } })).status, 403);
  });
});

test('flowchart routes validate input and support authorized CRUD operations', async () => {
  await withServer(async ({ port }) => {
    assert.equal((await request(port, '/api/charts')).status, 401);
    const owner = await register(port, { username: 'chart-owner', email: 'chart-owner@example.com' });
    const ownerCookie = sessionCookie(owner);
    const other = await register(port, { username: 'chart-other', email: 'chart-other@example.com' });
    const otherCookie = sessionCookie(other);
    const project = await request(port, '/api/projects', { method: 'POST', headers: { Cookie: ownerCookie }, body: { project_name: 'Chart Project' } });
    const projectId = project.body.id;

    assert.equal((await request(port, '/api/charts', { headers: { Cookie: ownerCookie } })).status, 400);
    assert.equal((await request(port, '/api/charts', { method: 'POST', headers: { Cookie: ownerCookie }, body: { projectId } })).status, 400);
    assert.equal((await request(port, '/api/charts', { method: 'POST', headers: { Cookie: ownerCookie }, body: { title: 'No project' } })).status, 400);
    assert.equal((await request(port, '/api/charts', { method: 'POST', headers: { Cookie: otherCookie }, body: { title: 'Forbidden', projectId } })).status, 403);
    assert.equal((await request(port, `/api/charts?projectId=${projectId}`, { headers: { Cookie: otherCookie } })).status, 403);

    const created = await request(port, '/api/charts', {
      method: 'POST', headers: { Cookie: ownerCookie },
      body: { title: 'Architecture map', data: '<svg></svg>', xPos: 10, yPos: 50, projectId },
    });
    assert.equal(created.status, 200);
    assert.equal((await request(port, `/api/charts?projectId=${projectId}`, { headers: { Cookie: ownerCookie } })).body[0].title, 'Architecture map');
    assert.equal((await request(port, `/api/charts/${created.body.id}`, { method: 'PUT', headers: { Cookie: ownerCookie }, body: { data: '<svg/>' } })).status, 400);
    assert.equal((await request(port, `/api/charts/${created.body.id}`, { method: 'PUT', headers: { Cookie: otherCookie }, body: { title: 'Edit' } })).status, 403);

    const updated = await request(port, `/api/charts/${created.body.id}`, {
      method: 'PUT', headers: { Cookie: ownerCookie },
      body: { title: 'Updated architecture map', data: '<svg>updated</svg>', xPos: 15, yPos: 75 },
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body, { id: String(created.body.id), title: 'Updated architecture map', data: '<svg>updated</svg>', xPos: 15, yPos: 75 });
    assert.equal((await request(port, `/api/charts/${created.body.id}`, { method: 'DELETE', headers: { Cookie: otherCookie } })).status, 403);
    assert.equal((await request(port, `/api/charts/${created.body.id}`, { method: 'DELETE', headers: { Cookie: ownerCookie } })).body.success, true);
    assert.equal((await request(port, `/api/charts/${created.body.id}`, { method: 'DELETE', headers: { Cookie: ownerCookie } })).status, 403);
  });
});

test('note and picture routes persist HTML modules with project ownership checks', async () => {
  await withServer(async ({ port, pool }) => {
    for (const { route, type, title } of [
      { route: 'notes', type: 'note', title: 'Meeting note' },
      { route: 'pictures', type: 'picture', title: 'Project picture' },
    ]) {
      assert.equal((await request(port, `/api/${route}`)).status, 401);
    }

    const owner = await register(port, { username: 'module-owner', email: 'module-owner@example.com' });
    const ownerCookie = sessionCookie(owner);
    const other = await register(port, { username: 'module-other', email: 'module-other@example.com' });
    const otherCookie = sessionCookie(other);
    const project = await request(port, '/api/projects', {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: { project_name: 'HTML modules' },
    });
    const projectId = project.body.id;

    for (const { route, type, title } of [
      { route: 'notes', type: 'note', title: 'Meeting note' },
      { route: 'pictures', type: 'picture', title: 'Project picture' },
    ]) {
      const endpoint = `/api/${route}`;
      const otherEndpoint = `/api/${route === 'notes' ? 'pictures' : 'notes'}`;
      assert.equal((await request(port, endpoint, { headers: { Cookie: ownerCookie } })).status, 400);
      assert.equal((await request(port, endpoint, {
        method: 'POST', headers: { Cookie: ownerCookie },
        body: { title: 'Missing project', data: '' },
      })).status, 400);
      assert.equal((await request(port, endpoint, {
        method: 'POST', headers: { Cookie: ownerCookie },
        body: { title: '   ', data: '', projectId },
      })).status, 400);
      assert.equal((await request(port, endpoint, {
        method: 'POST', headers: { Cookie: ownerCookie },
        body: { title, data: 12, projectId },
      })).status, 400);
      assert.equal((await request(port, endpoint, {
        method: 'POST', headers: { Cookie: otherCookie },
        body: { title, data: '<p>private</p>', projectId },
      })).status, 403);

      const created = await request(port, endpoint, {
        method: 'POST', headers: { Cookie: ownerCookie },
        body: { title, data: '<p class="saved-content">Initial HTML</p>', projectId, xPos: 25, yPos: 45 },
      });
      assert.equal(created.status, 200);
      assert.deepEqual(created.body, {
        id: created.body.id,
        title,
        data: '<p class="saved-content">Initial HTML</p>',
        xPos: 25,
        yPos: 45,
      });
      const stored = pool.state.modules.find((module) => module.id === created.body.id);
      assert.equal(stored.module_type, type);

      const loaded = await request(port, `${endpoint}?projectId=${projectId}`, { headers: { Cookie: ownerCookie } });
      assert.deepEqual(loaded.body.find((module) => module.id === created.body.id), created.body);
      const otherType = await request(port, `${otherEndpoint}?projectId=${projectId}`, { headers: { Cookie: ownerCookie } });
      assert.equal(otherType.body.some((module) => module.id === created.body.id), false);
      assert.equal((await request(port, `${endpoint}?projectId=${projectId}`, { headers: { Cookie: otherCookie } })).status, 403);
      assert.equal((await request(port, `/api/${route === 'notes' ? 'pictures' : 'notes'}/${created.body.id}`, {
        method: 'PUT', headers: { Cookie: ownerCookie },
        body: { title, data: '<p>wrong type</p>' },
      })).status, 403);
      assert.equal((await request(port, `/api/${route === 'notes' ? 'pictures' : 'notes'}/${created.body.id}`, {
        method: 'DELETE', headers: { Cookie: ownerCookie },
      })).status, 403);
      assert.equal((await request(port, `${endpoint}/${created.body.id}`, {
        method: 'PUT', headers: { Cookie: ownerCookie },
        body: { title: '', data: '<p>Updated</p>' },
      })).status, 400);
      assert.equal((await request(port, `${endpoint}/${created.body.id}`, {
        method: 'PUT', headers: { Cookie: ownerCookie },
        body: { title: 'Updated title', data: 12 },
      })).status, 400);

      const updated = await request(port, `${endpoint}/${created.body.id}`, {
        method: 'PUT', headers: { Cookie: ownerCookie },
        body: { title: `Updated ${title}`, data: '<p class="saved-content">Updated HTML</p>', xPos: 35, yPos: 55 },
      });
      assert.equal(updated.status, 200);
      assert.deepEqual(updated.body, {
        id: String(created.body.id),
        title: `Updated ${title}`,
        data: '<p class="saved-content">Updated HTML</p>',
        xPos: 35,
        yPos: 55,
      });
      const updatedStored = pool.state.modules.find((module) => module.id === created.body.id);
      assert.equal(updatedStored.module_type, type);
      assert.equal(updatedStored.title, `Updated ${title}`);
      assert.equal(updatedStored.data, '<p class="saved-content">Updated HTML</p>');
      assert.equal(updatedStored.xPos, 35);
      assert.equal(updatedStored.yPos, 55);
      assert.equal((await request(port, `${endpoint}/${created.body.id}`, {
        method: 'DELETE', headers: { Cookie: otherCookie },
      })).status, 403);
      assert.equal((await request(port, `${endpoint}/${created.body.id}`, {
        method: 'DELETE', headers: { Cookie: ownerCookie },
      })).body.success, true);
      assert.equal(pool.state.modules.some((module) => module.id === created.body.id), false);

      const defaults = await request(port, endpoint, {
        method: 'POST', headers: { Cookie: ownerCookie },
        body: { title: `  ${title} defaults  `, projectId },
      });
      assert.equal(defaults.status, 200);
      assert.deepEqual(defaults.body, {
        id: defaults.body.id,
        title: `${title} defaults`,
        data: '',
        xPos: 0,
        yPos: 0,
      });
      assert.equal(pool.state.modules.find((module) => module.id === defaults.body.id).module_type, type);
    }
  });
});

test('database failures produce API error responses for health and authenticated routes', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await withServer(async ({ port, pool }) => {
      const user = await register(port, { username: 'db-user', email: 'db-user@example.com' });
      const cookie = sessionCookie(user);
      pool.state.queryError = new Error('query failed');
      const projects = await request(port, '/api/projects', { headers: { Cookie: cookie } });
      assert.equal(projects.status, 500);
      assert.deepEqual(projects.body, { error: 'Failed to fetch projects' });
      const profile = await request(port, '/api/me', { headers: { Cookie: cookie } });
      assert.equal(profile.status, 500);
      assert.deepEqual(profile.body, { error: 'Failed to fetch user' });
      pool.state.queryError = null;

      pool.state.pingError = new Error('ping failed');
      const unhealthy = await request(port, '/api/health');
      assert.equal(unhealthy.status, 500);
      assert.deepEqual(unhealthy.body, { status: 'unhealthy', error: 'ping failed' });

      pool.state.pingError = null;
      pool.state.connectionError = new Error('database unavailable');
      const health = await request(port, '/api/health');
      assert.equal(health.status, 500);
      const login = await request(port, '/api/login', { method: 'POST', body: { email: 'x@example.com', password: 'x' } });
      assert.equal(login.status, 500);
      assert.deepEqual(login.body, { error: 'Failed to log in' });
    });
  } finally {
    console.error = originalConsoleError;
  }
});