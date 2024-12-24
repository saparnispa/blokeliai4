const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const compression = require('compression');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Port configuration for deployment
const PORT = process.env.PORT || 3019;

// Game state
let currentGame = {
    board: Array(20).fill().map(() => Array(10).fill(0)),
    currentPiece: null,
    nextPiece: null,
    currentX: 3,
    currentY: 0,
    score: 0,
    level: 1,
    lines: 0
};

// Game intervals
let dropInterval = null;
const DROP_SPEEDS = {
    1: 1000,    // 1 second
    2: 900,     // 0.9 seconds
    3: 800,     // 0.8 seconds
    4: 700,     // 0.7 seconds
    5: 600,     // 0.6 seconds
    6: 500,     // 0.5 seconds
    7: 400,     // 0.4 seconds
    8: 300,     // 0.3 seconds
    9: 200,     // 0.2 seconds
    10: 100     // 0.1 seconds
};

// Tetris pieces
const TETROMINOES = [
    [[1, 1, 1, 1]],  // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]], // J
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]]  // Z
];

// Game functions
function createPiece() {
    const pieceIdx = Math.floor(Math.random() * TETROMINOES.length);
    const colorIdx = Math.floor(Math.random() * 7) + 1;
    const piece = TETROMINOES[pieceIdx].map(row => 
        row.map(cell => cell ? colorIdx : 0)
    );
    return piece;
}

function collision(piece, x, y) {
    for (let row = 0; row < piece.length; row++) {
        for (let col = 0; col < piece[row].length; col++) {
            if (piece[row][col]) {
                const newX = x + col;
                const newY = y + row;
                if (newX < 0 || newX >= 10 || newY >= 20) return true;
                if (newY >= 0 && currentGame.board[newY][newX]) return true;
            }
        }
    }
    return false;
}

function freezePiece() {
    const piece = currentGame.currentPiece;
    for (let row = 0; row < piece.length; row++) {
        for (let col = 0; col < piece[row].length; col++) {
            if (piece[row][col]) {
                currentGame.board[currentGame.currentY + row][currentGame.currentX + col] = piece[row][col];
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    for (let row = currentGame.board.length - 1; row >= 0; row--) {
        if (currentGame.board[row].every(cell => cell !== 0)) {
            currentGame.board.splice(row, 1);
            currentGame.board.unshift(Array(10).fill(0));
            linesCleared++;
            row++; // Check the same row again
        }
    }
    if (linesCleared > 0) {
        currentGame.lines += linesCleared;
        currentGame.score += linesCleared * 100 * currentGame.level;
        const newLevel = Math.floor(currentGame.lines / 10) + 1;
        
        // Update drop speed if level changed
        if (newLevel !== currentGame.level && newLevel <= 10) {
            currentGame.level = newLevel;
            if (dropInterval) {
                clearInterval(dropInterval);
                dropInterval = setInterval(() => {
                    if (currentGame.currentPiece) {
                        if (!collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY + 1)) {
                            currentGame.currentY++;
                            io.emit('updateGame', currentGame);
                        } else {
                            freezePiece();
                            clearLines();
                            currentGame.currentPiece = currentGame.nextPiece;
                            currentGame.nextPiece = createPiece();
                            currentGame.currentX = 3;
                            currentGame.currentY = 0;
                            
                            if (collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY)) {
                                if (currentPlayer) {
                                    io.to(currentPlayer).emit('gameEnd');
                                    currentGame.currentPiece = null;
                                    currentGame.nextPiece = null;
                                    if (dropInterval) {
                                        clearInterval(dropInterval);
                                        dropInterval = null;
                                    }
                                    currentPlayer = null;
                                    updateQueue();
                                }
                            }
                            io.emit('updateGame', currentGame);
                        }
                    }
                }, DROP_SPEEDS[currentGame.level]);
            }
        }
    }
}

function rotatePiece(piece) {
    const newPiece = piece[0].map((_, i) =>
        piece.map(row => row[i]).reverse()
    );
    return newPiece;
}

function startNewGame() {
    currentGame = {
        board: Array(20).fill().map(() => Array(10).fill(0)),
        currentPiece: createPiece(),
        nextPiece: createPiece(),
        currentX: 3,
        currentY: 0,
        score: 0,
        level: 1,
        lines: 0
    };
    
    // Start automatic dropping
    if (dropInterval) {
        clearInterval(dropInterval);
    }
    
    dropInterval = setInterval(() => {
        if (currentGame.currentPiece) {
            if (!collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY + 1)) {
                currentGame.currentY++;
                io.emit('updateGame', currentGame);
            } else {
                freezePiece();
                clearLines();
                currentGame.currentPiece = currentGame.nextPiece;
                currentGame.nextPiece = createPiece();
                currentGame.currentX = 3;
                currentGame.currentY = 0;
                
                if (collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY)) {
                    if (currentPlayer) {
                        io.to(currentPlayer).emit('gameEnd');
                        currentGame.currentPiece = null;
                        currentGame.nextPiece = null;
                        if (dropInterval) {
                            clearInterval(dropInterval);
                            dropInterval = null;
                        }
                        currentPlayer = null;
                        updateQueue();
                    }
                }
                io.emit('updateGame', currentGame);
            }
        }
    }, DROP_SPEEDS[currentGame.level]);
}

// Queue system
let playerQueue = [];
let currentPlayer = null;

// High scores
let scores = [];
const MAX_SCORES = 100;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// Load scores from file
async function loadScores() {
    try {
        const data = await fs.readFile(SCORES_FILE, 'utf8');
        scores = JSON.parse(data).slice(0, MAX_SCORES);
    } catch (error) {
        console.error('Error loading scores:', error);
        scores = [];
    }
}

// Save scores to file
async function saveScores() {
    try {
        await fs.writeFile(SCORES_FILE, JSON.stringify(scores));
    } catch (error) {
        console.error('Error saving scores:', error);
    }
}

// Add new score
function addScore(score) {
    const newScore = {
        points: score.points,
        lines: score.lines,
        timestamp: new Date().toISOString()
    };
    
    scores.unshift(newScore);
    scores = scores.slice(0, MAX_SCORES);
    saveScores();
    io.emit('updateHighScores');
}

// Queue management
function updateQueue() {
    if (!currentPlayer && playerQueue.length > 0) {
        currentPlayer = playerQueue.shift();
        startNewGame(); // Initialize new game when player starts
        io.to(currentPlayer).emit('gameStart');
        io.emit('updateGame', currentGame);
    }
    
    // Send queue position to all players
    playerQueue.forEach((playerId, index) => {
        io.to(playerId).emit('queueUpdate', {
            position: index + 1,
            total: playerQueue.length
        });
    });
    
    // Send playing status to current player
    if (currentPlayer) {
        io.to(currentPlayer).emit('queueUpdate', {
            position: 0,
            total: playerQueue.length
        });
    }
}

// Middleware
app.use(compression());
app.use(express.static('public'));

// Socket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('displayConnect', () => {
        socket.emit('gameConfig', { rows: 20, cols: 10 });
        socket.emit('updateGame', currentGame);
    });
    
    socket.on('controlsConnect', () => {
        playerQueue.push(socket.id);
        updateQueue();
    });
    
    socket.on('gameUpdate', (data) => {
        if (socket.id !== currentPlayer || !currentGame.currentPiece) return;
        
        let needsUpdate = true;
        
        switch (data.action) {
            case 'moveLeft':
                if (!collision(currentGame.currentPiece, currentGame.currentX - 1, currentGame.currentY)) {
                    currentGame.currentX--;
                }
                break;
                
            case 'moveRight':
                if (!collision(currentGame.currentPiece, currentGame.currentX + 1, currentGame.currentY)) {
                    currentGame.currentX++;
                }
                break;
                
            case 'moveDown':
                if (!collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY + 1)) {
                    currentGame.currentY++;
                } else {
                    freezePiece();
                    clearLines();
                    currentGame.currentPiece = currentGame.nextPiece;
                    currentGame.nextPiece = createPiece();
                    currentGame.currentX = 3;
                    currentGame.currentY = 0;
                    
                    if (collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY)) {
                        socket.emit('gameEnd');
                        currentGame.currentPiece = null;
                        currentGame.nextPiece = null;
                        updateQueue();
                    }
                }
                break;
                
            case 'rotate':
                const rotated = rotatePiece(currentGame.currentPiece);
                if (!collision(rotated, currentGame.currentX, currentGame.currentY)) {
                    currentGame.currentPiece = rotated;
                }
                break;
                
            case 'drop':
                while (!collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY + 1)) {
                    currentGame.currentY++;
                }
                freezePiece();
                clearLines();
                currentGame.currentPiece = currentGame.nextPiece;
                currentGame.nextPiece = createPiece();
                currentGame.currentX = 3;
                currentGame.currentY = 0;
                
                if (collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY)) {
                    socket.emit('gameEnd');
                    currentGame.currentPiece = null;
                    currentGame.nextPiece = null;
                    updateQueue();
                }
                break;
                
            default:
                needsUpdate = false;
        }
        
        if (needsUpdate) {
            io.emit('updateGame', currentGame);
        }
    });
    
    socket.on('gameOver', (finalScore) => {
        if (socket.id === currentPlayer) {
            addScore({
                points: currentGame.score,
                lines: currentGame.lines,
                timestamp: new Date().toISOString()
            });
            currentPlayer = null;
            startNewGame();
            io.emit('updateGame', currentGame);
            updateQueue();
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.id === currentPlayer) {
            if (dropInterval) {
                clearInterval(dropInterval);
                dropInterval = null;
            }
            currentPlayer = null;
            updateQueue();
        } else {
            const index = playerQueue.indexOf(socket.id);
            if (index > -1) {
                playerQueue.splice(index, 1);
                updateQueue();
            }
        }
    });
});

// Initialize app
async function initializeApp() {
    await loadScores();
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Graceful shutdown
function gracefulShutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

initializeApp();
