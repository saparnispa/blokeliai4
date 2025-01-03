document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const canvas = document.getElementById('tetrisCanvas');
    const ctx = canvas.getContext('2d');
    
    const BLOCK_SIZE = 30;
    canvas.width = 10 * BLOCK_SIZE;  // 10 columns
    canvas.height = 20 * BLOCK_SIZE; // 20 rows
    
    // Colors for different pieces
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
    
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#333';
        for (let i = 0; i <= canvas.width; i += BLOCK_SIZE) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i <= canvas.height; i += BLOCK_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
    }
    
    function drawBlock(x, y, colorIndex) {
        ctx.fillStyle = colors[colorIndex];
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
    
    socket.on('updateGame', (gameState) => {
        if (!gameState) return;
        
        drawGrid();
        
        // Draw board
        for (let y = 0; y < gameState.board.length; y++) {
            for (let x = 0; x < gameState.board[y].length; x++) {
                if (gameState.board[y][x]) {
                    drawBlock(x, y, gameState.board[y][x]);
                }
            }
        }
        
        // Draw current piece
        if (gameState.currentPiece) {
            for (let y = 0; y < gameState.currentPiece.length; y++) {
                for (let x = 0; x < gameState.currentPiece[y].length; x++) {
                    if (gameState.currentPiece[y][x]) {
                        drawBlock(gameState.currentX + x, gameState.currentY + y, 
                                gameState.currentPiece[y][x]);
                    }
                }
            }
        }
    });

    socket.on('gameEnded', () => {
        // Notify server we're ready for replay
        socket.emit('readyForReplay');
    });
    
    socket.emit('displayConnect');
});
