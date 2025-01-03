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
const PORT = process.env.PORT || 3027;

// Game state
let currentGame = {
    board: Array(20).fill().map(() => Array(10).fill(0)),
    currentPiece: null,
    nextPiece: null,
    currentX: 3,
    currentY: 0,
    score: 0,
    level: 1,
    lines: 0,
    dropSpeed: 500, // Starting speed in milliseconds
    lastGameState: null,  // Store the last game state for replay
    replayTimeout: null,   // Store timeout reference
    isWaitingForReplay: false
};

let displaySocket = null;
let lastGameMoves = null;  // Store all moves of the last game
let replayInterval = null;
let replayTimeout = null;

// Record each game move
function recordGameMove() {
    if (!lastGameMoves) {
        lastGameMoves = [];
    }
    
    lastGameMoves.push({
        board: JSON.parse(JSON.stringify(currentGame.board)),
        piece: currentGame.currentPiece ? JSON.parse(JSON.stringify(currentGame.currentPiece)) : null,
        nextPiece: currentGame.nextPiece ? JSON.parse(JSON.stringify(currentGame.nextPiece)) : null,
        x: currentGame.currentX,
        y: currentGame.currentY,
        score: currentGame.score,
        level: currentGame.level,
        lines: currentGame.lines
    });
}

// Start replay of the last game
function startReplay() {
    if (!lastGameMoves || !displaySocket || replayInterval) return;
    
    let moveIndex = 0;
    
    // Reset game state for replay
    currentGame.board = Array(20).fill().map(() => Array(10).fill(0));
    currentGame.score = 0;
    currentGame.level = 1;
    currentGame.lines = 0;
    
    console.log('Starting replay with', lastGameMoves.length, 'moves');
    displaySocket.emit('replayStart');
    
    replayInterval = setInterval(() => {
        // Stop replay if a player joins
        if (currentPlayer) {
            console.log('Stopping replay - new player joined');
            clearInterval(replayInterval);
            replayInterval = null;
            return;
        }
        
        if (moveIndex >= lastGameMoves.length) {
            // End of replay, wait 5 seconds and start again
            console.log('Replay finished, restarting in 5 seconds');
            clearInterval(replayInterval);
            replayInterval = null;
            
            if (replayTimeout) {
                clearTimeout(replayTimeout);
            }
            
            replayTimeout = setTimeout(() => {
                if (!currentPlayer && displaySocket) {  // Only restart if no active player
                    console.log('Restarting replay');
                    startReplay();
                }
            }, 5000);
            return;
        }
        
        const move = lastGameMoves[moveIndex];
        currentGame.board = JSON.parse(JSON.stringify(move.board));
        currentGame.currentPiece = move.piece ? JSON.parse(JSON.stringify(move.piece)) : null;
        currentGame.nextPiece = move.nextPiece ? JSON.parse(JSON.stringify(move.nextPiece)) : null;
        currentGame.currentX = move.x;
        currentGame.currentY = move.y;
        currentGame.score = move.score;
        currentGame.level = move.level;
        currentGame.lines = move.lines;
        
        displaySocket.emit('updateGame', currentGame);
        moveIndex++;
    }, 100);  // Update every 100ms for smooth replay
}

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
function removePlayer(playerId) {
    // Remove from queue if present
    const queueIndex = playerQueue.indexOf(playerId);
    if (queueIndex > -1) {
        playerQueue.splice(queueIndex, 1);
    }
    
    // If it's the current player, end their game
    if (playerId === currentPlayer) {
        currentPlayer = null;
        if (dropInterval) {
            clearInterval(dropInterval);
            dropInterval = null;
        }
        updateQueue();
    }
    
    // If no players left and display is connected, start replay
    if (playerQueue.length === 0 && !currentPlayer && displaySocket) {
        if (replayTimeout) {
            clearTimeout(replayTimeout);
        }
        replayTimeout = setTimeout(() => {
            if (!currentPlayer && displaySocket) {
                startReplay();
            }
        }, 5000);
    }
}

function updateQueue() {
    if (!currentPlayer && playerQueue.length > 0) {
        // Stop any ongoing replay when new player starts
        if (replayInterval) {
            clearInterval(replayInterval);
            replayInterval = null;
        }
        if (replayTimeout) {
            clearTimeout(replayTimeout);
            replayTimeout = null;
        }
        
        // Send ready status to first player
        io.to(playerQueue[0]).emit('queueUpdate', {
            position: 0,
            total: playerQueue.length
        });
    }
    
    // Send queue position to all players
    playerQueue.forEach((playerId, index) => {
        if (playerId !== playerQueue[0]) {
            io.to(playerId).emit('queueUpdate', {
                position: index + 1,
                total: playerQueue.length
            });
        }
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/play', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controls.html'));
});

app.get('/scores', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scores.html'));
});

app.get('/api/scores', async (req, res) => {
    try {
        const scores = await loadScores();
        res.json(scores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load scores' });
    }
});

// Game intervals
let dropInterval = null;
const DROP_SPEEDS = {
    1: 500,     // Level 1: 0.5 seconds
    2: 450,     // Level 2: 0.45 seconds
    3: 400,     // Level 3: 0.4 seconds
    4: 350,     // Level 4: 0.35 seconds
    5: 300,     // Level 5: 0.3 seconds
    6: 250,     // Level 6: 0.25 seconds
    7: 200,     // Level 7: 0.2 seconds
    8: 150,     // Level 8: 0.15 seconds
    9: 100,     // Level 9: 0.1 seconds
    10: 50      // Level 10: 0.05 seconds
};

const LINES_PER_LEVEL = 10; // Number of lines needed to level up
const MAX_LEVEL = 10;

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
        // Update score based on number of lines cleared and current level
        const scoreMultiplier = [0, 100, 300, 500, 800]; // Bonus for multiple lines
        currentGame.score += scoreMultiplier[linesCleared] * currentGame.level;
        currentGame.lines += linesCleared;
        
        // Calculate new level
        const newLevel = Math.min(Math.floor(currentGame.lines / LINES_PER_LEVEL) + 1, MAX_LEVEL);
        
        // If level changed, update drop speed
        if (newLevel !== currentGame.level) {
            currentGame.level = newLevel;
            currentGame.dropSpeed = DROP_SPEEDS[newLevel];
            
            // Update drop interval
            if (dropInterval) {
                clearInterval(dropInterval);
                dropInterval = setInterval(dropPiece, currentGame.dropSpeed);
            }
            
            // Emit level up event
            if (currentPlayer) {
                io.to(currentPlayer).emit('levelUp', {
                    level: currentGame.level,
                    speed: currentGame.dropSpeed
                });
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

function dropPiece() {
    if (currentGame.currentPiece) {
        if (!collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY + 1)) {
            currentGame.currentY++;
            recordGameMove();
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
                    io.to(currentPlayer).emit('gameEnd', {
                        score: currentGame.score,
                        level: currentGame.level,
                        lines: currentGame.lines
                    });
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
        lines: 0,
        dropSpeed: DROP_SPEEDS[1],
        lastGameState: null,  // Store the last game state for replay
        replayTimeout: null,   // Store timeout reference
        isWaitingForReplay: false
    };
    
    // Start automatic dropping
    if (dropInterval) {
        clearInterval(dropInterval);
    }
    
    dropInterval = setInterval(dropPiece, currentGame.dropSpeed);
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('displayConnect', () => {
        console.log('Display connected:', socket.id);
        displaySocket = socket;
        socket.emit('gameConfig', { rows: 20, cols: 10 });
        
        // If we have recorded moves and no active game, start replay immediately
        if (lastGameMoves && lastGameMoves.length > 0 && !currentPlayer) {
            console.log('Starting replay on display connect');
            // Clear any existing replay
            if (replayInterval) {
                clearInterval(replayInterval);
                replayInterval = null;
            }
            if (replayTimeout) {
                clearTimeout(replayTimeout);
                replayTimeout = null;
            }
            startReplay();
        }
        
        // Handle game ended event
        socket.on('readyForReplay', () => {
            if (!currentPlayer && lastGameMoves && lastGameMoves.length > 0) {
                startReplay();
            }
        });
    });

    socket.on('controlsConnect', () => {
        console.log('Controls connected:', socket.id);
        // Stop any ongoing replay when new player connects
        if (replayInterval) {
            clearInterval(replayInterval);
            replayInterval = null;
        }
        if (replayTimeout) {
            clearTimeout(replayTimeout);
            replayTimeout = null;
        }
        
        // Add player to queue if not already in it
        if (!playerQueue.includes(socket.id)) {
            playerQueue.push(socket.id);
            
            // If there's no current player and this is the only player in queue,
            // start the game automatically
            if (!currentPlayer && playerQueue.length === 1) {
                currentPlayer = playerQueue.shift();
                startNewGame();
                io.to(currentPlayer).emit('gameStart');
            } else {
                updateQueue();
            }
        }
    });

    socket.on('startGame', () => {
        // Only start if this player is first in queue
        if (playerQueue[0] === socket.id && !currentPlayer) {
            currentPlayer = playerQueue.shift();
            startNewGame();
            io.to(currentPlayer).emit('gameStart');
            updateQueue();
        }
    });

    // Record moves during the game
    socket.on('gameUpdate', (data) => {
        if (socket.id !== currentPlayer || !currentGame.currentPiece) return;
        
        let needsUpdate = true;
        
        switch (data.action) {
            case 'moveLeft':
                if (!collision(currentGame.currentPiece, currentGame.currentX - 1, currentGame.currentY)) {
                    currentGame.currentX--;
                    recordGameMove();
                }
                break;
                
            case 'moveRight':
                if (!collision(currentGame.currentPiece, currentGame.currentX + 1, currentGame.currentY)) {
                    currentGame.currentX++;
                    recordGameMove();
                }
                break;
                
            case 'moveDown':
                if (!collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY + 1)) {
                    currentGame.currentY++;
                    recordGameMove();
                } else {
                    freezePiece();
                    clearLines();
                    currentGame.currentPiece = currentGame.nextPiece;
                    currentGame.nextPiece = createPiece();
                    currentGame.currentX = 3;
                    currentGame.currentY = 0;
                    recordGameMove();
                    
                    if (collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY)) {
                        socket.emit('gameEnd', {
                            score: currentGame.score,
                            level: currentGame.level,
                            lines: currentGame.lines
                        });
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
                    recordGameMove();
                }
                break;
                
            case 'drop':
                while (!collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY + 1)) {
                    currentGame.currentY++;
                    recordGameMove();
                }
                freezePiece();
                clearLines();
                currentGame.currentPiece = currentGame.nextPiece;
                currentGame.nextPiece = createPiece();
                currentGame.currentX = 3;
                currentGame.currentY = 0;
                recordGameMove();
                
                if (collision(currentGame.currentPiece, currentGame.currentX, currentGame.currentY)) {
                    socket.emit('gameEnd', {
                        score: currentGame.score,
                        level: currentGame.level,
                        lines: currentGame.lines
                    });
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

    socket.on('gameOver', async (data) => {
        try {
            await addScore({
                points: currentGame.score,
                lines: currentGame.lines,
                timestamp: new Date().toISOString()
            });
            
            // Reset current game state
            currentGame.board = Array(20).fill().map(() => Array(10).fill(0));
            currentGame.currentPiece = null;
            currentGame.nextPiece = null;
            currentGame.currentX = 3;
            currentGame.currentY = 0;
            currentGame.score = 0;
            currentGame.level = 1;
            currentGame.lines = 0;
            
            updateQueue();
            io.emit('updateGame', currentGame);
            
            // Clear any existing timeouts/intervals
            if (replayInterval) {
                clearInterval(replayInterval);
                replayInterval = null;
            }
            if (replayTimeout) {
                clearTimeout(replayTimeout);
                replayTimeout = null;
            }
            
            // Start replay after 5 seconds if display is connected and no active player
            if (displaySocket && !currentPlayer) {
                console.log('Starting replay in 5 seconds...');
                replayTimeout = setTimeout(() => {
                    if (!currentPlayer && displaySocket) {
                        console.log('Starting replay now');
                        startReplay();
                    }
                }, 5000);
            }
            
        } catch (error) {
            console.error('Error handling game over:', error);
        }
    });

    socket.on('gameEnd', async (data) => {
        if (socket.id === currentPlayer) {
            try {
                await addScore({
                    points: data.score,
                    lines: data.lines,
                    timestamp: new Date().toISOString()
                });
                
                // Reset current game state
                currentGame.board = Array(20).fill().map(() => Array(10).fill(0));
                currentGame.currentPiece = null;
                currentGame.nextPiece = null;
                currentGame.currentX = 3;
                currentGame.currentY = 0;
                currentGame.score = 0;
                currentGame.level = 1;
                currentGame.lines = 0;
                
                updateQueue();
                io.emit('updateGame', currentGame);
                
                // Clear any existing timeouts/intervals
                if (replayInterval) {
                    clearInterval(replayInterval);
                    replayInterval = null;
                }
                if (replayTimeout) {
                    clearTimeout(replayTimeout);
                    replayTimeout = null;
                }
                
                // Start replay after 5 seconds if display is connected and no active player
                if (displaySocket && !currentPlayer) {
                    console.log('Starting replay in 5 seconds...');
                    replayTimeout = setTimeout(() => {
                        if (!currentPlayer && displaySocket) {
                            console.log('Starting replay now');
                            startReplay();
                        }
                    }, 5000);
                }
                
            } catch (error) {
                console.error('Error handling game end:', error);
            }
        }
    });

    socket.on('startGame', () => {
        // Clear any ongoing replay
        if (replayInterval) {
            clearInterval(replayInterval);
            replayInterval = null;
        }
        if (replayTimeout) {
            clearTimeout(replayTimeout);
            replayTimeout = null;
        }
        
        // Reset move recording for new game
        lastGameMoves = [];
        startNewGame();
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.id === displaySocket?.id) {
            displaySocket = null;
            if (replayInterval) {
                clearInterval(replayInterval);
                replayInterval = null;
            }
            if (replayTimeout) {
                clearTimeout(replayTimeout);
                replayTimeout = null;
            }
        }
        removePlayer(socket.id);
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
