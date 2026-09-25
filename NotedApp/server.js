const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt')
const session = require('express-session')
const path = require('path');
require('dotenv').config();

//DIAGNOSTICS
process.on('exit', (code) => {
    console.log('🛑 Process is exiting with code:', code);
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled promise rejection:', reason);
});

const app = express();
const PORT = process.env.Port || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true
    }
}));
app.use(express.static(path.join(__dirname, 'public')));

//app.use(express.static('public'));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'noted',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ============================================
// Auth MIDDLEWARE
// ============================================

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({error: 'Not authenticated'})
    }
    next();
}

// ============================================
// Auth ENDPOINTS
// ============================================

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, bio, title} = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required}'});
        }

        const connection = await pool.getConnection();

        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email])
        if (existing.length > 0) {
            connection.release();
            return res.status(409).json({ error: 'An account with that email already exists'})
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await connection.query(
            'INSERT INTO users (username, email, password, bio, title) VALUES (?, ?, ?, ?, ?)',
            [username || null, email, passwordHash, bio || null, title || null]
        );
        const userId = result.insertId;

        const [projectResult] = await connection.query(
            'INSERT INTO projects (project_name) VALUES (?)',
            [`${username || email}'s Project`]
        );  
        const projectId = projectResult.insertId;

        await connection.query(
            'INSERT INTO user_projects (user_id, project_id) VALUES (?, ?)',
            [userId, projectId]
        );

        connection.release();

        req.session.userId = userId;
        res.json({ id: userId, username, email })
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required'})
        }

        const connection = await pool.getConnection();
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email])
        connection.release();

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password'})
        }

        const user = users[0];
        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.status(401).json({ error: 'Invalid email or password'})
        }

        req.session.userId = user.id;
        res.json({ id: user.id, username: user.username, email: user.email })
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to log in'});
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Failed to log out'});
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/me', requireAuth, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT id, username, email, bio, title FROM users WHERE id = ?',
            [req.session.userId]
        );
        connection.release();

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found'});
        }
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
})

// ============================================
// Kanban Module ENDPOINTS
// ============================================

app.get('/api/boards', requireAuth, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [projects] = await connection.query(
            'SELECT project_id FROM user_projects WHERE user_id = ? LIMIT 1',
            [req.session.userId]
        );
        if (projects.length === 0) {
            connection.release();
            return res.json([]);
        }
        const projectId = projects[0].project_id;

        const [boards] = await connection.query(
            'SELECT id, title, data, xPos, yPos FROM modules WHERE project_id = ? ORDER BY id DESC',
            [projectId]
        );
        connection.release();
        res.json(boards);
    } catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
});

app.post('/api/boards', requireAuth, async (req, res) => {
    try {
        const { title, data = '', xPos = 0, yPos = 0 } = req.body;
        if (!title) return res.status(400).json({ error: 'Board title required' });

        const connection = await pool.getConnection();
        const [projects] = await connection.query(
            'SELECT project_id FROM user_projects WHERE user_id = ? LIMIT 1',
            [req.session.userId]
        );
        if (projects.length === 0) {
            connection.release();
            return res.status(400).json({ error: 'No project found for this user' })
        }
        const projectId = projects[0].project_id;

        const [result] = await connection.query(
            'INSERT INTO modules (project_id, title, data, xPos, yPos) VALUES (?, ?, ?, ?, ?)',
            [projectId, title, data, xPos, yPos]
        );
        connection.release();

        res.json({ id: result.insertId, title, data, xPos, yPos });
    } catch (error) {
        console.error('Error creating board:', error);
        res.status(500).json({ error: 'Failed to create board' });
    }
});

app.put('/api/boards/:boardId', requireAuth,async (req, res) => {
    try {
        const { boardId } = req.params;
        const { title, data, xPos = 0, yPos = 0 } = req.body;
        if (!title) return res.status(400).json({ error: 'Board title required' });

        const connection = await pool.getConnection();
        const [owned] = await connection.query(
            `SELECT m.id FROM modules m
             JOIN user_projects up ON up.project_id = m.project_id
             WHERE m.id = ? AND up.user_id = ?`,
            [boardId, req.session.userId]
        );
        if (owned.length === 0) {
            connection.release();
            return res.status(403).json({ error: 'Not authorized to edit this board' });
        }

        await connection.query(
            'UPDATE modules SET title = ?, data = ?, xPos = ?, yPos = ? WHERE id = ?',
            [title, data || '', xPos, yPos, boardId]
        );
        connection.release();
        res.json({ id: boardId, title, data, xPos, yPos });
    } catch (error) {
        console.error('Error updating board:', error);
        res.status(500).json({ error: 'Failed to update board' });
    }
});

app.delete('/api/boards/:boardId', requireAuth, async (req, res) => {
    try {
        const { boardId } = req.params;
        const connection = await pool.getConnection();
        const [owned] = await connection.query(
            `SELECT m.id FROM modules m
             JOIN user_projects up ON up.project_id = m.project_id
             WHERE m.id = ? AND up.user_id = ?`,
            [boardId, req.session.userId]
        );
        if (owned.length ===0) {
            connection.release();
            return res.status(403).json({ error: 'Not authorized to delete this board' })
        }

        await connection.query('DELETE FROM modules WHERE id = ?', [boardId]);
        connection.release();
        res.json({ success: true, id: boardId });
    } catch (error) {
        console.error('Error deleting board:', error);
        res.status(500).json({ error: 'Failed to delete board' });
    }
});

// ============================================
// FlowChart Module ENDPOINTS
// ============================================

// Get all boards from modules table
app.get('/api/charts', requireAuth, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [projects] = await connection.query(
            'SELECT project_id FROM user_projects WHERE user_id = ? LIMIT 1',
            [req.session.userId]
        );
        if (projects.length === 0) {
            connection.release();
            return res.json([]);
        }
        const projectId = projects[0].project_id;

        const [charts] = await connection.query(
            'SELECT id, title, data, xPos, yPos FROM modules WHERE project_id = ? ORDER BY id DESC',
            [projectId]
        );
        connection.release();
        res.json(charts);
    } catch (error) {
        console.error('Error fetching charts:', error);
        res.status(500).json({ error: 'Failed to fetch charts' });
    }
});

// Create a new chart (module)
app.post('/api/charts', requireAuth, async (req, res) => {
    try {
        const { title, data = '', xPos = 0, yPos = 0 } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Chart title required' });
        }

        const connection = await pool.getConnection();
        const [projects] = await connection.query(
            'SELECT project_id FROM user_projects WHERE user_id = ? LIMIT 1',
            [req.session.userId]
        );
        if (projects.length === 0) {
            connection.release();
            return res.status(400).json({ error: 'No project found for this user' });
        }
        const projectId = projects[0].project_id;
        
        const [result] = await connection.query(
            'INSERT INTO modules (project_id, title, data, xPos, yPos) VALUES (?, ?, ?, ?, ?)',
            [projectId, title, data, xPos, yPos]
        );
        
        connection.release();
        const chartId = result.insertId;
        
        res.json({ 
            id: chartId, 
            title: title, 
            data: data,
            xPos: xPos,
            yPos: yPos
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        res.status(500).json({ error: 'Failed to create chart' });
    }
});

// Update chart (including HTML and position)
app.put('/api/charts/:chartId', requireAuth, async (req, res) => {
    try {
        const { chartId } = req.params;
        const { title, data, xPos = 0, yPos = 0 } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Chart title required' });
        }

        const connection = await pool.getConnection();
        const [owned] = await connection.query(
            `SELECT m.id FROM modules m
             JOIN user_projects up ON up.project_id = m.project_id
             WHERE m.id = ? AND up.user_id = ?`,
            [chartId, req.session.userId]
        );
        if (owned.length === 0) {
            connection.release();
            return res.status(403).json({ error: 'Not authorized to edit this chart' });
        }

        await connection.query(
            'UPDATE modules SET title = ?, data = ?, xPos = ?, yPos = ? WHERE id = ?',
            [title, data || '', xPos, yPos, chartId]
        );
        connection.release();
        res.json({ id: chartId, title, data, xPos, yPos });
    } catch (error) {
        console.error('Error updating chart:', error);
        res.status(500).json({ error: 'Failed to update chart' });
    }
});

// Delete chart
app.delete('/api/charts/:chartId', requireAuth, async (req, res) => {
    try {
        const { chartId } = req.params;
        const connection = await pool.getConnection();
        const [owned] = await connection.query(
            `SELECT m.id FROM modules m
             JOIN user_projects up ON up.project_id = m.project_id
             WHERE m.id = ? AND up.user_id = ?`,
            [chartId, req.session.userId]
        );
        if (owned.length === 0) {
            connection.release();
            return res.status(403).json({ error: 'Not authorized to delete this chart' });
        }

        await connection.query(
            'DELETE FROM modules WHERE id = ?',
            [chartId]
        );

        connection.release();
        res.json({ success: true, id: chartId });
    } catch (error) {
        console.error('Error deleting chart:', error);
        res.status(500).json({ error: 'Failed to delete chart' });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        res.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server

const server = app.listen(PORT, () => {
    console.log(`🚀 Noted server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'noted'}`);
    console.log(`✅ API endpoints ready`);
});

server.on('error', (err) => {
    console.error('💥 Server error:', err);
});

server.on('close', () => {
    console.log('🛑 Server closed');
});