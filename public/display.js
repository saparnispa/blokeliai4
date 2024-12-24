document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const canvas = document.getElementById('tetrisCanvas');
    const ctx = canvas.getContext('2d');
    
    const BLOCK_SIZE = 30;
    canvas.width = 10 * BLOCK_SIZE;  // 10 columns
    canvas.height = 20 * BLOCK_SIZE;  // 20 rows
    
    function drawGrid() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#333';
        for (let x = 0; x < canvas.width; x += BLOCK_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += BLOCK_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    function drawBlock(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
    }
    
    socket.on('updateGame', (gameState) => {
        drawGrid();
        
        // Draw board
        if (gameState.board) {
            for (let y = 0; y < gameState.board.length; y++) {
                for (let x = 0; x < gameState.board[y].length; x++) {
                    if (gameState.board[y][x]) {
                        drawBlock(x, y, '#00f3ff');
                    }
                }
            }
        }
        
        // Draw current piece
        if (gameState.currentPiece) {
            for (let y = 0; y < gameState.currentPiece.length; y++) {
                for (let x = 0; x < gameState.currentPiece[y].length; x++) {
                    if (gameState.currentPiece[y][x]) {
                        drawBlock(gameState.currentX + x, gameState.currentY + y, '#fff');
                    }
                }
            }
        }
    });
});
