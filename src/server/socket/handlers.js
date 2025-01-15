import { currentGame, recordGameMove, resetGame } from '../game/state.js';
import { createPiece } from '../game/pieces.js';
import { dropPiece, moveLeft, moveRight, rotate } from '../game/mechanics.js';
import { addScore } from '../game/scores.js';
import { 
    addToQueue, 
    removePlayer, 
    getQueueStatus, 
    getNextPlayer,
    setDisplaySocket,
    getDisplaySocket,
    getCurrentPlayer,
    clearCurrentPlayer,
    getAllQueueStatuses
} from '../game/queue.js';
import { startReplay, clearReplayTimers, scheduleReplay } from '../game/replay.js';

let io;
let dropInterval = null;

function initializeHandlers(ioServer) {
    io = ioServer;
}

function clearDropInterval() {
    if (dropInterval) {
        clearInterval(dropInterval);
        dropInterval = null;
    }
}

function startNewGame() {
    console.log('Starting new game...');
    resetGame();
    currentGame.currentPiece = createPiece();
    currentGame.nextPiece = createPiece();
    
    clearDropInterval();
    
    // Initial game state update
    console.log('Sending initial game state:', currentGame);
    io.emit('updateGame', currentGame);
    
    // Start drop interval
    dropInterval = setInterval(() => {
        console.log('Drop interval tick - current piece:', currentGame.currentPiece);
        const result = dropPiece();
        if (result) {
            recordGameMove();
            if (result.gameOver) {
                handleGameOver(result);
            } else {
                io.emit('updateGame', currentGame);
                if (result.levelUp) {
                    io.to(getCurrentPlayer()).emit('levelUp', {
                        level: currentGame.level,
                        speed: currentGame.dropSpeed
                    });
                }
            }
        }
    }, currentGame.dropSpeed);
}

async function handleGameOver(result) {
    const currentPlayerId = getCurrentPlayer();
    if (currentPlayerId) {
        io.to(currentPlayerId).emit('gameEnd', {
            score: result.finalScore,
            level: result.finalLevel,
            lines: result.finalLines
        });
        
        try {
            await addScore({
                points: result.finalScore,
                lines: result.finalLines,
                timestamp: new Date().toISOString()
            });
            
            clearCurrentPlayer();
            clearDropInterval();
            io.emit('updateGame', currentGame);
            
            // Start game for next player in queue
            const nextPlayer = getNextPlayer();
            if (nextPlayer) {
                io.to(nextPlayer).emit('gameStart');
                startNewGame();
            } else if (getDisplaySocket()) {
                scheduleReplay();
            }
            
        } catch (error) {
            console.error('Error handling game over:', error);
        }
    }
}

function handleDisplayConnect(socket) {
    console.log('Display connected:', socket.id);
    setDisplaySocket(socket);
    socket.emit('gameConfig', { rows: 20, cols: 10 });
    
    if (!getCurrentPlayer()) {
        startReplay();
    }
}

function handleControlsConnect(socket) {
    console.log('Controls connected:', socket.id);
    clearReplayTimers();
    
    // If this socket was the current player (e.g. on refresh), remove them first
    if (getCurrentPlayer() === socket.id) {
        console.log('Current player reconnected - removing from game');
        removePlayer(socket.id);
        clearDropInterval();
        
        // Get next player and start their game
        const nextPlayer = getNextPlayer();
        if (nextPlayer) {
            io.to(nextPlayer).emit('gameStart');
            startNewGame();
        } else if (getDisplaySocket()) {
            scheduleReplay();
        }
    }
    
    // Add the socket to queue (will be at the end)
    if (addToQueue(socket.id)) {
        console.log('Added to queue:', socket.id);
        if (!getCurrentPlayer()) {
            console.log('No current player, checking for next player...');
            const nextPlayer = getNextPlayer(); // This sets currentPlayer
            console.log('Next player:', nextPlayer);
            if (nextPlayer === socket.id) {
                console.log('Starting game for new player:', socket.id);
                io.to(nextPlayer).emit('gameStart');
                startNewGame(); // Start the game immediately when sending gameStart
            }
        }
        
        // Update all clients with new queue status
        getAllQueueStatuses().forEach(({ playerId, status }) => {
            io.to(playerId).emit('queueUpdate', status);
        });
    }
}

function handleStartGame(socket) {
    console.log('Start game requested by:', socket.id);
    console.log('Current player:', getCurrentPlayer());
    
    if (socket.id === getCurrentPlayer()) {
        console.log('Starting new game...');
        startNewGame();
        io.emit('updateGame', currentGame);
    } else {
        console.log('Start game request denied - not current player');
    }
}

function handleGameAction(socket, action) {
    if (socket.id !== getCurrentPlayer() || !currentGame.currentPiece) {
        console.log('Game action rejected:', { 
            socketId: socket.id, 
            currentPlayer: getCurrentPlayer(),
            hasPiece: !!currentGame.currentPiece,
            action 
        });
        return;
    }
    
    let needsUpdate = true;
    let result = null;
    
    switch (action) {
        case 'moveLeft':
            needsUpdate = moveLeft();
            break;
            
        case 'moveRight':
            needsUpdate = moveRight();
            break;
            
        case 'moveDown':
            result = dropPiece();
            if (result && result.gameOver) {
                handleGameOver(result);
                return;
            }
            break;
            
        case 'rotate':
            needsUpdate = rotate();
            break;
            
        default:
            needsUpdate = false;
    }
    
    if (needsUpdate || result) {
        recordGameMove();
        io.emit('updateGame', currentGame);
    }
}

function handleDisconnect(socket) {
    console.log('Client disconnected:', socket.id);
    
    if (socket.id === getDisplaySocket()?.id) {
        setDisplaySocket(null);
        clearReplayTimers();
    }
    
    if (removePlayer(socket.id)) {
        clearDropInterval();
        
        // Update remaining players' queue positions
        getAllQueueStatuses().forEach(({ playerId, status }) => {
            io.to(playerId).emit('queueUpdate', status);
        });
        
        // Get next player or schedule replay
        const nextPlayer = getNextPlayer();
        if (nextPlayer) {
            io.to(nextPlayer).emit('gameStart');
            startNewGame(); // Reset and start game for next player
        } else if (getDisplaySocket()) {
            scheduleReplay();
        }
    }
}

export {
    initializeHandlers,
    handleDisplayConnect,
    handleControlsConnect,
    handleGameAction,
    handleDisconnect,
    startNewGame,
    clearDropInterval,
    handleStartGame
};
