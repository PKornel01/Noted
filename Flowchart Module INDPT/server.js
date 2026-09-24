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

app.use(express.static('public'));

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
app.get('/api/charts', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [charts] = await connection.query(
            'SELECT id, title, data, xPos, yPos FROM modules WHERE project_id = 1 ORDER BY id DESC'
        );
        connection.release();
        res.json(charts);
    } catch (error) {
        console.error('Error fetching charts:', error);
        res.status(500).json({ error: 'Failed to fetch charts' });
    }
});

// Create a new chart (module)
app.post('/api/charts', async (req, res) => {
    try {
        const { title, projectId = 1, data = '', xPos = 0, yPos = 0 } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Chart title required' });
        }

        const connection = await pool.getConnection();
        
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
app.put('/api/charts/:chartId', async (req, res) => {
    try {
        const { chartId } = req.params;
        const { title, data, xPos = 0, yPos = 0 } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Chart title required' });
        }

        const connection = await pool.getConnection();
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
app.delete('/api/charts/:chartId', async (req, res) => {
    try {
        const { chartId } = req.params;
        const connection = await pool.getConnection();

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
// CARD ENDPOINTS (Deprecated)
// ============================================
// Cards are now stored as part of chart HTML in the data field
// Individual card operations are managed on the frontend
// When charts are updated, all card changes are saved together

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
    console.log(`📦 Charts stored as modules with HTML in data field`);
    console.log(`✅ API endpoints ready`);
});