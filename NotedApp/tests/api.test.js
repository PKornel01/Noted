const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const http = require('node:http');
const net = require('node:net');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const { port } = server.address();
      server.close((err) => {
        if (err) return reject(err);
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

function buildApp() {
  const app = express();
  const users = [];
  const projects = [];
  const modules = [];
  const sessionStore = new session.MemoryStore();

  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
    store: sessionStore,
  }));

  function requireAuth(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
  }

  app.get('/api/health', async (req, res) => {
    res.json({ status: 'healthy', database: 'connected' });
  });

  app.post('/api/register', async (req, res) => {
    const { username, email, password, bio, title } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = { id: users.length + 1, username: username || null, email, password: hashed, bio: bio || null, title: title || null };
    users.push(user);

    const project = { id: projects.length + 1, project_name: `${user.username || user.email}'s Project` };
    projects.push(project);

    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username, email: user.email });
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users.find((entry) => entry.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username, email: user.email });
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  app.get('/api/me', requireAuth, (req, res) => {
    const user = users.find((entry) => entry.id === req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, username: user.username, email: user.email, bio: user.bio, title: user.title });
  });

  app.get('/api/projects', requireAuth, (req, res) => {
    const userProjects = projects.filter((project) => {
      const projectOwner = project.userId === req.session.userId;
      return projectOwner || true;
    });
    const owned = userProjects.filter((project) => project.userId === req.session.userId);
    res.json(owned.map((project) => ({ id: project.id, project_name: project.project_name })));
  });

  app.post('/api/projects', requireAuth, (req, res) => {
    const { project_name } = req.body || {};
    if (!project_name || !project_name.trim()) {
      return res.status(400).json({ error: 'Project name required' });
    }

    const project = { id: projects.length + 1, project_name: project_name.trim(), userId: req.session.userId };
    projects.push(project);
    res.json({ id: project.id, project_name: project.project_name });
  });

  app.get('/api/boards', requireAuth, (req, res) => {
    const projectId = Number(req.query.projectId);
    const list = modules.filter((entry) => entry.projectId === projectId && entry.module_type === 'kanban');
    res.json(list.map((entry) => ({ id: entry.id, title: entry.title, data: entry.data, xPos: entry.xPos, yPos: entry.yPos })));
  });

  app.post('/api/boards', requireAuth, (req, res) => {
    const { title, data, xPos, yPos, projectId } = req.body || {};
    if (!title || !projectId) {
      return res.status(400).json({ error: 'Board title required' });
    }

    const project = projects.find((entry) => entry.id === Number(projectId));
    if (!project || project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to add to this project' });
    }

    const board = { id: modules.length + 1, projectId: Number(projectId), title, data: data || '', xPos: xPos || 0, yPos: yPos || 0, module_type: 'kanban' };
    modules.push(board);
    res.json({ id: board.id, title, data: board.data, xPos: board.xPos, yPos: board.yPos });
  });

  app.put('/api/boards/:boardId', requireAuth, (req, res) => {
    const item = modules.find((entry) => entry.id === Number(req.params.boardId) && entry.module_type === 'kanban');
    if (!item) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const project = projects.find((entry) => entry.id === item.projectId);
    if (!project || project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this board' });
    }

    item.title = req.body.title || item.title;
    item.data = req.body.data || item.data;
    item.xPos = req.body.xPos ?? item.xPos;
    item.yPos = req.body.yPos ?? item.yPos;
    res.json({ id: item.id, title: item.title, data: item.data, xPos: item.xPos, yPos: item.yPos });
  });

  app.delete('/api/boards/:boardId', requireAuth, (req, res) => {
    const index = modules.findIndex((entry) => entry.id === Number(req.params.boardId) && entry.module_type === 'kanban');
    if (index === -1) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const board = modules[index];
    const project = projects.find((entry) => entry.id === board.projectId);
    if (!project || project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this board' });
    }
    modules.splice(index, 1);
    res.json({ success: true, id: board.id });
  });

  app.get('/api/charts', requireAuth, (req, res) => {
    const projectId = Number(req.query.projectId);
    const list = modules.filter((entry) => entry.projectId === projectId && entry.module_type === 'flowchart');
    res.json(list.map((entry) => ({ id: entry.id, title: entry.title, data: entry.data, xPos: entry.xPos, yPos: entry.yPos })));
  });

  app.post('/api/charts', requireAuth, (req, res) => {
    const { title, data, xPos, yPos, projectId } = req.body || {};
    if (!title || !projectId) {
      return res.status(400).json({ error: 'Chart title required' });
    }
    const project = projects.find((entry) => entry.id === Number(projectId));
    if (!project || project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to add to this project' });
    }

    const chart = { id: modules.length + 1, projectId: Number(projectId), title, data: data || '', xPos: xPos || 0, yPos: yPos || 0, module_type: 'flowchart' };
    modules.push(chart);
    res.json({ id: chart.id, title, data: chart.data, xPos: chart.xPos, yPos: chart.yPos });
  });

  app.put('/api/charts/:chartId', requireAuth, (req, res) => {
    const item = modules.find((entry) => entry.id === Number(req.params.chartId) && entry.module_type === 'flowchart');
    if (!item) {
      return res.status(404).json({ error: 'Chart not found' });
    }
    const project = projects.find((entry) => entry.id === item.projectId);
    if (!project || project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this chart' });
    }

    item.title = req.body.title || item.title;
    item.data = req.body.data || item.data;
    item.xPos = req.body.xPos ?? item.xPos;
    item.yPos = req.body.yPos ?? item.yPos;
    res.json({ id: item.id, title: item.title, data: item.data, xPos: item.xPos, yPos: item.yPos });
  });

  app.delete('/api/charts/:chartId', requireAuth, (req, res) => {
    const index = modules.findIndex((entry) => entry.id === Number(req.params.chartId) && entry.module_type === 'flowchart');
    if (index === -1) {
      return res.status(404).json({ error: 'Chart not found' });
    }
    const chart = modules[index];
    const project = projects.find((entry) => entry.id === chart.projectId);
    if (!project || project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this chart' });
    }
    modules.splice(index, 1);
    res.json({ success: true, id: chart.id });
  });

  return app;
}

async function startTestServer() {
  const port = await getFreePort();
  const app = buildApp();
  const server = app.listen(port);
  await new Promise((resolve) => server.on('listening', resolve));
  return { server, port };
}

async function requestJson(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const body = options.body !== undefined ? JSON.stringify(options.body) : undefined;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (body !== undefined) headers['Content-Length'] = Buffer.byteLength(body);

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: options.method || 'GET',
      headers,
    }, (res) => {
      let text = '';
      res.on('data', (chunk) => {
        text += chunk.toString();
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: text ? JSON.parse(text) : null,
        });
      });
    });

    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function getSessionCookie(response) {
  const rawCookie = response.headers['set-cookie'];
  assert.ok(rawCookie, 'Expected set-cookie header from a session-enabled route');
  return Array.isArray(rawCookie) ? rawCookie[0].split(';')[0] : rawCookie.split(';')[0];
}

test('GET /api/health returns healthy status', async () => {
  const { server, port } = await startTestServer();
  try {
    const result = await requestJson(port, '/api/health');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { status: 'healthy', database: 'connected' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/register and GET /api/me return the authenticated user', async () => {
  const { server, port } = await startTestServer();
  try {
    const register = await requestJson(port, '/api/register', {
      method: 'POST',
      body: { username: 'alice', email: 'alice@example.com', password: 'very-secret', bio: 'Product manager', title: 'PM' },
    });

    assert.equal(register.status, 200);
    assert.equal(register.body.email, 'alice@example.com');

    const cookie = getSessionCookie(register);
    const me = await requestJson(port, '/api/me', { headers: { Cookie: cookie } });

    assert.equal(me.status, 200);
    assert.equal(me.body.username, 'alice');
    assert.equal(me.body.email, 'alice@example.com');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/login and POST /api/logout handle session flow', async () => {
  const { server, port } = await startTestServer();
  try {
    await requestJson(port, '/api/register', {
      method: 'POST',
      body: { username: 'bob', email: 'bob@example.com', password: 'super-secret' },
    });

    const login = await requestJson(port, '/api/login', {
      method: 'POST',
      body: { email: 'bob@example.com', password: 'super-secret' },
    });

    assert.equal(login.status, 200);
    assert.equal(login.body.email, 'bob@example.com');

    const cookie = getSessionCookie(login);
    const logout = await requestJson(port, '/api/logout', {
      method: 'POST',
      headers: { Cookie: cookie },
    });

    assert.equal(logout.status, 200);
    assert.equal(logout.body.success, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('project routes require auth and create project data', async () => {
  const { server, port } = await startTestServer();
  try {
    const unauth = await requestJson(port, '/api/projects');
    assert.equal(unauth.status, 401);

    const register = await requestJson(port, '/api/register', {
      method: 'POST',
      body: { username: 'charlie', email: 'charlie@example.com', password: 'strong-pass' },
    });
    const cookie = getSessionCookie(register);

    const createProject = await requestJson(port, '/api/projects', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { project_name: 'Launch plan' },
    });

    assert.equal(createProject.status, 200);
    assert.equal(createProject.body.project_name, 'Launch plan');

    const list = await requestJson(port, '/api/projects', { headers: { Cookie: cookie } });
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body));
    assert.equal(list.body[0].project_name, 'Launch plan');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('kanban and flowchart module routes support create, update, and delete operations', async () => {
  const { server, port } = await startTestServer();
  try {
    const register = await requestJson(port, '/api/register', {
      method: 'POST',
      body: { username: 'dan', email: 'dan@example.com', password: 'dan-pass' },
    });
    const cookie = getSessionCookie(register);

    const project = await requestJson(port, '/api/projects', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { project_name: 'Roadmap' },
    });
    const projectId = project.body.id;

    const boardCreate = await requestJson(port, '/api/boards', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { title: 'Sprint board', data: '[]', xPos: 20, yPos: 40, projectId },
    });

    assert.equal(boardCreate.status, 200);
    assert.equal(boardCreate.body.title, 'Sprint board');

    const boards = await requestJson(port, `/api/boards?projectId=${projectId}`, { headers: { Cookie: cookie } });
    assert.equal(boards.status, 200);
    assert.equal(boards.body[0].title, 'Sprint board');

    const boardUpdate = await requestJson(port, `/api/boards/${boardCreate.body.id}`, {
      method: 'PUT',
      headers: { Cookie: cookie },
      body: { title: 'Updated sprint board', data: '[{"todo":true}]', xPos: 30, yPos: 60 },
    });
    assert.equal(boardUpdate.status, 200);
    assert.equal(boardUpdate.body.title, 'Updated sprint board');

    const chartCreate = await requestJson(port, '/api/charts', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { title: 'Architecture Map', data: '<svg></svg>', xPos: 10, yPos: 50, projectId },
    });
    assert.equal(chartCreate.status, 200);
    assert.equal(chartCreate.body.title, 'Architecture Map');

    const charts = await requestJson(port, `/api/charts?projectId=${projectId}`, { headers: { Cookie: cookie } });
    assert.equal(charts.status, 200);
    assert.equal(charts.body[0].title, 'Architecture Map');

    const chartUpdate = await requestJson(port, `/api/charts/${chartCreate.body.id}`, {
      method: 'PUT',
      headers: { Cookie: cookie },
      body: { title: 'Updated architecture map', data: '<svg>updated</svg>', xPos: 15, yPos: 75 },
    });
    assert.equal(chartUpdate.status, 200);
    assert.equal(chartUpdate.body.title, 'Updated architecture map');

    const boardDelete = await requestJson(port, `/api/boards/${boardCreate.body.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(boardDelete.status, 200);
    assert.equal(boardDelete.body.success, true);

    const chartDelete = await requestJson(port, `/api/charts/${chartCreate.body.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(chartDelete.status, 200);
    assert.equal(chartDelete.body.success, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
