const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000 ;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
// BOARD (MODULE) ENDPOINTS
// ============================================

// Get all boards from modules table
app.get('/api/boards', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [boards] = await connection.query(
            'SELECT id, title, data, xPos, yPos FROM modules WHERE project_id = 1 ORDER BY id DESC'
        );
        connection.release();
        res.json(boards);
    } catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
});

// Create a new board (module)
app.post('/api/boards', async (req, res) => {
    try {
        const { title, projectId = 1, data = '', xPos = 0, yPos = 0 } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Board title required' });
        }

        const connection = await pool.getConnection();
        
        const [result] = await connection.query(
            'INSERT INTO modules (project_id, title, data, xPos, yPos) VALUES (?, ?, ?, ?, ?)',
            [projectId, title, data, xPos, yPos]
        );
        
        connection.release();
        const boardId = result.insertId;
        
        res.json({ 
            id: boardId, 
            title: title, 
            data: data,
            xPos: xPos,
            yPos: yPos
        });
    } catch (error) {
        console.error('Error creating board:', error);
        res.status(500).json({ error: 'Failed to create board' });
    }
});

// Update board (including HTML and position)
app.put('/api/boards/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        const { title, data, xPos = 0, yPos = 0 } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Board title required' });
        }

        const connection = await pool.getConnection();
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

// Delete board
app.delete('/api/boards/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        const connection = await pool.getConnection();

        await connection.query(
            'DELETE FROM modules WHERE id = ?',
            [boardId]
        );

        connection.release();
        res.json({ success: true, id: boardId });
    } catch (error) {
        console.error('Error deleting board:', error);
        res.status(500).json({ error: 'Failed to delete board' });
    }
});

// ============================================
// CARD ENDPOINTS (Deprecated)
// ============================================
// Cards are now stored as part of board HTML in the data field
// Individual card operations are managed on the frontend
// When boards are updated, all card changes are saved together

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
app.listen(PORT, () => {
    console.log(`🚀 Kanban server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'noted'}`);
    console.log(`📦 Boards stored as modules with HTML in data field`);
    console.log(`✅ API endpoints ready`);
});