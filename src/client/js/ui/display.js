const BLOCK_SIZE = 30;

const colors = {
    0: '#111',      // Empty cell
    1: '#00f0f0',   // I piece (cyan)
    2: '#0000f0',   // J piece (blue)
    3: '#f0a000',   // L piece (orange)
    4: '#f0f000',   // O piece (yellow)
    5: '#00f000',   // S piece (green)
    6: '#f00000',   // Z piece (red)
    7: '#a000f0'    // T piece (purple)
};

class GameDisplay {
    constructor() {
        // Elements
        this.waitingScreen = document.getElementById('waiting-screen');
        this.gameElements = document.querySelector('.game-elements');
        this.queueCount = document.getElementById('queue-count');
        this.queuePosition = document.getElementById('queue-position');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        
        // Main game board canvas
        this.boardCanvas = document.getElementById('gameBoard');
        this.boardCtx = this.boardCanvas?.getContext('2d');
        
        // Next piece preview canvas
        this.nextPieceCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextPieceCanvas?.getContext('2d');

        // Set canvas sizes
        if (this.nextPieceCanvas) {
            this.nextPieceCanvas.width = 4 * BLOCK_SIZE;
            this.nextPieceCanvas.height = 4 * BLOCK_SIZE;
        }
        
        if (this.boardCanvas) {
            this.boardCanvas.width = 10 * BLOCK_SIZE;  // Standard Tetris board width
            this.boardCanvas.height = 20 * BLOCK_SIZE; // Standard Tetris board height
            
            // Initialize with empty board
            this.boardCtx.fillStyle = colors[0];
            this.boardCtx.fillRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);
        }
    }

    showWaitingScreen() {
        if (this.waitingScreen) {
            this.waitingScreen.style.display = 'flex';
        }
        if (this.gameElements) {
            this.gameElements.classList.remove('visible');
        }
    }

    hideWaitingScreen() {
        if (this.waitingScreen) {
            this.waitingScreen.style.display = 'none';
        }
        if (this.gameElements) {
            this.gameElements.classList.add('visible');
        }
    }

    drawBlock(x, y, colorIndex) {
        if (!this.nextCtx) return;

        this.nextCtx.fillStyle = colors[colorIndex];
        this.nextCtx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        this.nextCtx.strokeStyle = '#333';
        this.nextCtx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }

    drawNextPiece(piece) {
        if (!this.nextCtx || !piece) return;

        // Clear canvas
        this.nextCtx.fillStyle = '#111';
        this.nextCtx.fillRect(0, 0, this.nextPieceCanvas.width, this.nextPieceCanvas.height);

        // Center the piece
        const xOffset = (4 - piece[0].length) / 2;
        const yOffset = (4 - piece.length) / 2;

        // Draw piece
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    this.drawBlock(xOffset + x, yOffset + y, piece[y][x]);
                }
            }
        }
    }

    drawBoard(board) {
        if (!this.boardCtx) return;

        // Clear the board
        this.boardCtx.fillStyle = colors[0];
        this.boardCtx.fillRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);

        // Draw the board state
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                const colorIndex = board[y][x];
                if (colorIndex !== 0) {
                    this.drawBoardBlock(x, y, colorIndex);
                }
            }
        }
    }

    drawBoardBlock(x, y, colorIndex) {
        if (!this.boardCtx) return;

        this.boardCtx.fillStyle = colors[colorIndex];
        this.boardCtx.fillRect(
            x * BLOCK_SIZE,
            y * BLOCK_SIZE,
            BLOCK_SIZE - 1,
            BLOCK_SIZE - 1
        );
        
        // Add block border
        this.boardCtx.strokeStyle = '#333';
        this.boardCtx.strokeRect(
            x * BLOCK_SIZE,
            y * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        );
    }

    drawCurrentPiece(piece, x, y) {
        if (!this.boardCtx) return;

        for (let py = 0; py < piece.length; py++) {
            for (let px = 0; px < piece[py].length; px++) {
                if (piece[py][px] !== 0) {
                    this.drawBoardBlock(x + px, y + py, piece[py][px]);
                }
            }
        }
    }

    updateGameInfo(gameState) {
        if (!gameState) return;

        // Update score and level
        if (this.scoreElement) {
            this.scoreElement.textContent = gameState.score;
        }
        if (this.levelElement) {
            this.levelElement.textContent = gameState.level;
        }
        if (this.linesElement) {
            this.linesElement.textContent = gameState.lines;
        }

        // Draw game board
        if (gameState.board) {
            this.drawBoard(gameState.board);
        }

        // Draw current piece
        if (gameState.currentPiece && gameState.currentPiecePosition) {
            this.drawCurrentPiece(
                gameState.currentPiece,
                gameState.currentPiecePosition.x,
                gameState.currentPiecePosition.y
            );
        }

        // Draw next piece
        if (gameState.nextPiece) {
            this.drawNextPiece(gameState.nextPiece);
        }
    }

    updateQueueStatus(data) {
        if (this.queueCount) {
            this.queueCount.textContent = data.total || 0;
        }
        if (this.queuePosition) {
            if (data.position === 0) {
                this.queuePosition.textContent = 'Jūsų eilė!';
                document.getElementById('start-button')?.style.setProperty('display', 'block');
            } else {
                this.queuePosition.textContent = `${data.position} vieta`;
                document.getElementById('start-button')?.style.setProperty('display', 'none');
            }
        }
    }

    handleLevelUp() {
        if (this.levelElement) {
            this.levelElement.style.color = '#fff';
            setTimeout(() => {
                this.levelElement.style.color = '#FFC107';
            }, 500);
        }
    }

    showGameElements() {
        if (this.gameElements) {
            this.gameElements.style.display = 'block';
        }
    }

    hideGameElements() {
        if (this.gameElements) {
            this.gameElements.style.display = 'none';
        }
    }
}

export { GameDisplay };
