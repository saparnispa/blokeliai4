import { currentGame, lastGameMoves } from './state.js';
import { getCurrentPlayer, getDisplaySocket } from './queue.js';

let replayInterval = null;
let replayTimeout = null;

function clearReplayTimers() {
    if (replayInterval) {
        clearInterval(replayInterval);
        replayInterval = null;
    }
    if (replayTimeout) {
        clearTimeout(replayTimeout);
        replayTimeout = null;
    }
}

function startReplay() {
    const displaySocket = getDisplaySocket();
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
        if (getCurrentPlayer()) {
            console.log('Stopping replay - new player joined');
            clearReplayTimers();
            return;
        }
        
        if (moveIndex >= lastGameMoves.length) {
            // End of replay, wait 5 seconds and start again
            console.log('Replay finished, restarting in 5 seconds');
            clearInterval(replayInterval);
            replayInterval = null;
            
            replayTimeout = setTimeout(() => {
                if (!getCurrentPlayer() && getDisplaySocket()) {  // Only restart if no active player
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

function scheduleReplay(delay = 5000) {
    if (replayTimeout) {
        clearTimeout(replayTimeout);
    }
    
    replayTimeout = setTimeout(() => {
        if (!getCurrentPlayer() && getDisplaySocket()) {
            console.log('Starting scheduled replay');
            startReplay();
        }
    }, delay);
}

export {
    startReplay,
    clearReplayTimers,
    scheduleReplay
};
