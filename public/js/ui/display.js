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
        this.nextPieceCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextPieceCanvas?.getContext('2d');

        // Set next piece canvas size if it exists
        if (this.nextPieceCanvas) {
            this.nextPieceCanvas.width = 4 * BLOCK_SIZE;
            this.nextPieceCanvas.height = 4 * BLOCK_SIZE;
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
        document.getElementById('start-button')?.style.setProperty('display', 'none');
    }

    hideGameElements() {
        if (this.gameElements) {
            this.gameElements.style.display = 'none';
        }
    }
}

export { GameDisplay };
