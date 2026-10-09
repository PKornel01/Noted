# 🖥️ Backend Setup & Database Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Server Configuration](#server-configuration)
5. [API Documentation](#api-documentation)
6. [Architecture](#architecture)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 14+ installed
- MySQL 5.7+ installed and running
- Basic command line knowledge

### 5-Minute Setup
```bash
# 1. Install dependencies
npm install

# 2. Setup database
mysql -u root -p < kanban.sql

# 3. Create .env file
copy .env.example .env
# Edit .env with your database credentials

# 4. Start server
npm start
```

Server will run at `http://localhost:3000`

---

## Installation

### Step 1: Install Node.js Dependencies

```bash
npm install
```

**What gets installed:**
- `express` - Web framework
- `mysql2` - Database driver
- `cors` - Cross-Origin Resource Sharing
- `dotenv` - Environment variables
- `nodemon` (dev) - Auto-restart on changes

### Step 2: Verify Installation

```bash
npm list
```

Should show all dependencies installed.

### Step 3: Check Node Version

```bash
node --version
```

Should be v14 or higher.

---

## Database Setup

### Step 1: Create Database

**Option A: Using XAMPP phpMyAdmin (Recommended)**
1. Start XAMPP Control Panel
2. Click "Start" next to Apache and MySQL
3. Click "Admin" button next to MySQL (opens phpMyAdmin in browser)
4. Click "Import" tab
5. Click "Choose File" and select `kanban.sql`
6. Click "Import" button
7. Done! Database is created with all tables

**Option B: Using MySQL Command Line (PowerShell)**
```powershell
# Make sure MySQL is running in XAMPP Control Panel first

# Step 1: Navigate to correct folder
cd "C:\Users\felhasznalo\Desktop\Kanban module"

# Step 2: Run this command
Get-Content kanban.sql | C:\xampp\mysql\bin\mysql -u root -p

# When prompted for password, just press Enter (XAMPP default has no password)
```

**Note:** The `<` operator doesn't work in PowerShell, use `Get-Content ... |` instead.

**Option C: Using MySQL Workbench**
1. Open MySQL Workbench
2. File → Open SQL Script
3. Select `kanban.sql`
4. Execute

**Option D: Manual Creation**
```sql
CREATE DATABASE kanban_db;
USE kanban_db;

CREATE TABLE kanbanmodule (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status ENUM('todo', 'doing', 'done') DEFAULT 'todo',
    expandinfo LONGTEXT,
    expandreference VARCHAR(500),
    boardtitle VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_board (boardtitle),
    INDEX idx_status (status)
);
```

### Step 2: Verify Database

```powershell
# PowerShell: Use full path to mysql
C:\xampp\mysql\bin\mysql -u root -p -e "USE kanban_db; SHOW TABLES; SELECT COUNT(*) FROM kanbanmodule;"

# When prompted for password, press Enter (XAMPP default)
```

Should show:
- Tables created ✓
- Sample data inserted (4 rows) ✓

### Step 3: Create .env File

**Copy template:**
```bash
copy .env.example .env
```

**Edit .env with your credentials:**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=kanban_db
PORT=3000
NODE_ENV=development
```

---

## Server Configuration

### Environment Variables

**Required (.env file):**
```
DB_HOST       Database server address
DB_USER       MySQL username
DB_PASSWORD   MySQL password
DB_NAME       Database name (kanban_db)
```

**Optional (.env file):**
```
PORT          Server port (default: 3000)
NODE_ENV      'development' or 'production'
```

### Running the Server

**Development Mode (with auto-restart):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

**Custom Port:**
```bash
PORT=8080 npm start
```

### Server Output

When started, you'll see:
```
🚀 Kanban server running on http://localhost:3000
📊 Database: kanban_db
✅ API endpoints ready
```

---

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Response Format
All endpoints return JSON:
```json
{
    "id": "board-123",
    "title": "My Board",
    "status": "todo",
    "description": "Card details...",
    "imageUrl": "https://..."
}
```

---

### 🟢 BOARD ENDPOINTS

#### Get All Boards
```
GET /api/boards
```

**Response:**
```json
[
    {
        "id": "board-123",
        "title": "Sprint 1"
    },
    {
        "id": "board-456",
        "title": "Bug Fixes"
    }
]
```

---

#### Create Board
```
POST /api/boards
```

**Request Body:**
```json
{
    "title": "New Board"
}
```

**Response:**
```json
{
    "id": "board-1711353600000",
    "title": "New Board"
}
```

**JavaScript Example:**
```javascript
fetch('http://localhost:3000/api/boards', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: 'My New Board'
    })
})
.then(res => res.json())
.then(data => console.log('Board created:', data));
```

---

#### Update Board Title
```
PUT /api/boards/:boardId
```

**Request Body:**
```json
{
    "title": "Updated Title"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/boards/board-123 \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title"}'
```

---

### 🔵 CARD ENDPOINTS

#### Get Cards for Board
```
GET /api/boards/:boardId/cards
```

**Response:**
```json
[
    {
        "id": "card-1",
        "title": "Task 1",
        "status": "todo",
        "description": "Full description",
        "imageUrl": "https://..."
    },
    {
        "id": "card-2",
        "title": "Task 2",
        "status": "doing",
        "description": "",
        "imageUrl": ""
    }
]
```

---

#### Create Card
```
POST /api/boards/:boardId/cards
```

**Request Body:**
```json
{
    "title": "New Task",
    "description": "Task description",
    "imageUrl": "https://example.com/image.jpg",
    "columnId": "todo"
}
```

**Response:**
```json
{
    "id": "card-1711353600000",
    "title": "New Task",
    "description": "Task description",
    "imageUrl": "https://example.com/image.jpg",
    "status": "todo"
}
```

**JavaScript Example:**
```javascript
fetch('http://localhost:3000/api/boards/board-123/cards', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: 'New Card',
        description: 'Card details',
        imageUrl: 'https://example.com/pic.jpg',
        columnId: 'todo'
    })
})
.then(res => res.json())
.then(data => console.log('Card created:', data));
```

---

#### Update Card
```
PUT /api/cards/:cardId
```

**Request Body:**
```json
{
    "title": "Updated Title",
    "description": "Updated description",
    "imageUrl": "https://...",
    "status": "doing"
}
```

**Common Use - Move Card:**
```javascript
// Move card from "todo" to "doing"
fetch('http://localhost:3000/api/cards/card-123', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: 'Task',
        status: 'doing'
    })
});
```

---

#### Delete Card
```
DELETE /api/cards/:cardId
```

**Response:**
```json
{
    "success": true,
    "id": "card-123"
}
```

**JavaScript Example:**
```javascript
fetch('http://localhost:3000/api/cards/card-123', {
    method: 'DELETE'
})
.then(res => res.json())
.then(data => console.log('Card deleted:', data));
```

---

### 🟡 HEALTH CHECK

#### Server Status
```
GET /api/health
```

**Response (Healthy):**
```json
{
    "status": "healthy",
    "database": "connected"
}
```

**Response (Unhealthy):**
```json
{
    "status": "unhealthy",
    "error": "Error message"
}
```

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────┐
│              CLIENT (Browser)                    │
│  • index.html, script.js, style.css             │
│  • Displays UI                                   │
│  • Handles user interactions                     │
│  • Makes API calls                               │
└──────────────────┬───────────────────────────────┘
                   │ HTTP/CORS
                   ▼
┌──────────────────────────────────────────────────┐
│         SERVER (Express.js on Node.js)          │
│  • Receives API requests                        │
│  • Validates data                               │
│  • Processes business logic                     │
│  • Executes database queries                    │
└──────────────────┬───────────────────────────────┘
                   │ SQL Queries
                   ▼
┌──────────────────────────────────────────────────┐
│          DATABASE (MySQL)                        │
│  • Stores board data                            │
│  • Stores card data                             │
│  • Manages relationships                        │
│  • Ensures data integrity                       │
└──────────────────────────────────────────────────┘
```

### Request Flow

```
1. Browser: User clicks + Add Card button
        │
        ▼
2. Frontend: Show form modal
        │
        ▼
3. User: Enter card details and submit
        │
        ▼
4. Frontend: Make POST request to server
        │
        ▼
5. Server: Receive request, validate data
        │
        ▼
6. Server: Execute INSERT query on database
        │
        ▼
7. Database: Store new card, return success
        │
        ▼
8. Server: Send JSON response to frontend
        │
        ▼
9. Frontend: Receive response, update display
        │
        ▼
10. Browser: User sees new card on screen ✓
```

### Database Schema

```
┌─────────────────────────────┐
│    kanbanmodule Table       │
├─────────────────────────────┤
│ id (VARCHAR 50)      [PK]   │ ← Unique card ID
│ title (VARCHAR 255)         │ ← Card title
│ status (ENUM)               │ ← todo/doing/done
│ expandinfo (LONGTEXT)       │ ← Description
│ expandreference (VARCHAR)   │ ← Image URL
│ boardtitle (VARCHAR 255)    │ ← Board name
│ created_at (TIMESTAMP)      │ ← Created date
│ updated_at (TIMESTAMP)      │ ← Last updated
│                             │
│ Indexes:                    │
│ ├─ idx_board                │ ← Fast board lookups
│ └─ idx_status               │ ← Fast status queries
└─────────────────────────────┘
```

### Data Flow Example: Creating a Card

**Step 1: Frontend Sends Request**
```javascript
const newCard = {
    title: "Design UI",
    description: "Create mockups",
    imageUrl: "https://example.com/image.jpg",
    columnId: "todo"
};

fetch('http://localhost:3000/api/boards/board-123/cards', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(newCard)
});
```

**Step 2: Server Receives Request**
```javascript
app.post('/api/boards/:boardId/cards', async (req, res) => {
    const { boardId } = req.params;
    const { title, description, imageUrl, columnId } = req.body;
    // Validate data
    // Generate ID
    // Execute SQL INSERT
});
```

**Step 3: Database Executes Query**
```sql
INSERT INTO kanbanmodule 
(id, title, status, expandinfo, expandreference, boardtitle) 
VALUES 
('card-1711353600000', 'Design UI', 'todo', 'Create mockups', 'https://...', 'board-123')
```

**Step 4: Server Sends Response**
```json
{
    "id": "card-1711353600000",
    "title": "Design UI",
    "description": "Create mockups",
    "imageUrl": "https://example.com/image.jpg",
    "status": "todo"
}
```

**Step 5: Frontend Updates Display**
```javascript
.then(res => res.json())
.then(data => {
    // Card is now in database
    // Update display
    // Show to user
});
```

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Cause:** MySQL not running or credentials wrong

**Solution:**
```bash
# Check if MySQL is running
mysql -u root -p -e "SELECT 1"

# If fails, start MySQL:
# Windows: net start MySQL80
# Mac: brew services start mysql
# Linux: sudo service mysql start

# Check .env file has correct credentials
# Edit .env and verify:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_password
```

---

### Issue: "Table doesn't exist"

**Cause:** Database schema not created

**Solution:**
```bash
# Re-run SQL schema
mysql -u root -p < kanban.sql

# Verify table exists
mysql -u root -p kanban_db -e "SHOW TABLES;"
```

---

### Issue: "Port 3000 already in use"

**Cause:** Another application using port 3000

**Solution:**
```bash
# Use different port
PORT=3001 npm start

# Or kill process using port:
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

---

### Issue: "CORS error in browser"

**Cause:** Frontend and backend on different origins

**Solution:**
CORS is already enabled in `server.js`:
```javascript
app.use(cors());
```

If still having issues, check:
- Frontend making requests to correct URL
- Server is running
- No typos in API endpoints

---

### Issue: "npm ERR! Cannot find module 'express'"

**Cause:** Dependencies not installed

**Solution:**
```bash
npm install
```

---

## Connecting Frontend to Backend

### Update script.js to Use API

**Current (In-Memory Storage):**
```javascript
boardsData.set(boardId, {...});  // Stores in RAM
```

**New (Database Storage):**
```javascript
// Create board
fetch('http://localhost:3000/api/boards', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title: boardTitle})
})
.then(res => res.json())
.then(board => {
    boardsData.set(board.id, board);
    // Render board
});
```

See `BACKEND_INTEGRATION.md` for complete integration guide.

---

## Performance Tips

### Database Optimization

```sql
-- Add indexes for faster queries
CREATE INDEX idx_board ON kanbanmodule(boardtitle);
CREATE INDEX idx_status ON kanbanmodule(status);
```

### Connection Pooling

Server uses connection pool:
```javascript
const pool = mysql.createPool({
    connectionLimit: 10,  // Max 10 connections
    queueLimit: 0         // Wait unlimited
});
```

---

## Security Notes

**Current Implementation:**
- ✅ Input validation
- ✅ CORS enabled
- ✅ SQL queries parameterized

**For Production, Add:**
- 🔒 User authentication
- 🔒 Request validation
- 🔒 Rate limiting
- 🔒 HTTPS/SSL
- 🔒 Environment variables
- 🔒 Error logging

---

## Development vs Production

**Development:**
```bash
npm run dev
```
- Uses nodemon (auto-restart)
- Shows all errors
- Better for debugging

**Production:**
```bash
npm start
```
- Runs once
- Error handling only
- Better performance

---

## Next Steps

1. ✅ Install Node.js dependencies
2. ✅ Setup MySQL database
3. ✅ Create .env configuration
4. ✅ Start server (npm start)
5. → Integrate frontend with API (see BACKEND_INTEGRATION.md)
6. → Deploy to production

---

**Backend setup complete! Next, update your frontend to use the API endpoints.** 🚀
