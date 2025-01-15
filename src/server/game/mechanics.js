import { DROP_SPEEDS, LINES_PER_LEVEL, MAX_LEVEL, currentGame } from './state.js';
import { createPiece, collision, freezePiece, rotatePiece } from './pieces.js';

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
        
        // Return level up info if level changed
        if (newLevel !== currentGame.level) {
            currentGame.level = newLevel;
            currentGame.dropSpeed = DROP_SPEEDS[newLevel];
            return {
                levelUp: true,
                newLevel: currentGame.level,
                newSpeed: currentGame.dropSpeed
            };
        }
    }
    
    return { levelUp: false };
}

function dropPiece() {
    if (!currentGame.currentPiece) return null;

    if (!collision(currentGame.currentPiece, currentGame.board, currentGame.currentX, currentGame.currentY + 1)) {
        currentGame.currentY++;
        return { moved: true, gameOver: false };
    } else {
        currentGame.board = freezePiece(currentGame.currentPiece, currentGame.board, currentGame.currentX, currentGame.currentY);
        const levelInfo = clearLines();
        
        currentGame.currentPiece = currentGame.nextPiece;
        currentGame.nextPiece = createPiece();
        currentGame.currentX = 3;
        currentGame.currentY = 0;
        
        if (collision(currentGame.currentPiece, currentGame.board, currentGame.currentX, currentGame.currentY)) {
            return {
                moved: false,
                gameOver: true,
                finalScore: currentGame.score,
                finalLevel: currentGame.level,
                finalLines: currentGame.lines
            };
        }
        
        return {
            moved: false,
            gameOver: false,
            levelUp: levelInfo.levelUp,
            newLevel: levelInfo.newLevel,
            newSpeed: levelInfo.newSpeed
        };
    }
}

function moveLeft() {
    if (currentGame.currentPiece && !collision(currentGame.currentPiece, currentGame.board, currentGame.currentX - 1, currentGame.currentY)) {
        currentGame.currentX--;
        return true;
    }
    return false;
}

function moveRight() {
    if (currentGame.currentPiece && !collision(currentGame.currentPiece, currentGame.board, currentGame.currentX + 1, currentGame.currentY)) {
        currentGame.currentX++;
        return true;
    }
    return false;
}

function hardDrop() {
    if (!currentGame.currentPiece) return null;

    while (!collision(currentGame.currentPiece, currentGame.board, currentGame.currentX, currentGame.currentY + 1)) {
        currentGame.currentY++;
    }
    
    return dropPiece();
}

function rotate() {
    if (!currentGame.currentPiece) return false;
    
    const rotated = rotatePiece(currentGame.currentPiece);
    if (!collision(rotated, currentGame.board, currentGame.currentX, currentGame.currentY)) {
        currentGame.currentPiece = rotated;
        return true;
    }
    return false;
}

export {
    clearLines,
    dropPiece,
    moveLeft,
    moveRight,
    hardDrop,
    rotate
};
