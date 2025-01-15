const DROP_SPEEDS = {
    1: 250,     // Level 1: 0.5 seconds
    2: 200,     // Level 2: 0.45 seconds
    3: 100,     // Level 3: 0.4 seconds
    4: 80,     // Level 4: 0.35 seconds
    5: 50,     // Level 5: 0.3 seconds
    6: 20,     // Level 6: 0.25 seconds
    7: 10,     // Level 7: 0.2 seconds
    8: 10,     // Level 8: 0.15 seconds
    9: 10,     // Level 9: 0.1 seconds
    10: 10      // Level 10: 0.05 seconds
};

const LINES_PER_LEVEL = 10;
const MAX_LEVEL = 10;

// Initial game state
const createInitialState = () => ({
    board: Array(35).fill().map(() => Array(10).fill(0)),
    currentPiece: null,
    nextPiece: null,
    currentX: 3,
    currentY: 0,
    score: 0,
    level: 1,
    lines: 0,
    dropSpeed: DROP_SPEEDS[1],
    lastGameState: null,
    replayTimeout: null,
    isWaitingForReplay: false
});

let currentGame = createInitialState();
let lastGameMoves = null;

// Record game moves for replay
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

function resetGame() {
    currentGame = createInitialState();
    lastGameMoves = [];
}

export {
    DROP_SPEEDS,
    LINES_PER_LEVEL,
    MAX_LEVEL,
    currentGame,
    lastGameMoves,
    recordGameMove,
    resetGame,
    createInitialState
};
