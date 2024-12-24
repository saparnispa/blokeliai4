document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    
    const BLOCK_SIZE = 30;
    const COLORS = ['#00f3ff', '#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

    let game = {
        canvas: document.getElementById('tetrisCanvas'),
        nextPieceCanvas: document.getElementById('nextPieceCanvas'),
        board: [],
        currentPiece: null,
        nextPiece: null,
        currentX: 0,
        currentY: 0,
        score: 0,
        level: 1,
        needsUpdate: true
    };
    
    game.ctx = game.canvas.getContext('2d', { alpha: false });
    game.nextPieceCtx = game.nextPieceCanvas.getContext('2d', { alpha: false });

    // Pre-render grid pattern
    const gridPattern = document.createElement('canvas');
    const gridCtx = gridPattern.getContext('2d');
    gridPattern.width = BLOCK_SIZE;
    gridPattern.height = BLOCK_SIZE;
    gridCtx.strokeStyle = '#333';
    gridCtx.strokeRect(0, 0, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

    function drawBlock(context, x, y, color, offsetX = 0, offsetY = 0) {
        const xPos = x * BLOCK_SIZE + offsetX;
        const yPos = y * BLOCK_SIZE + offsetY;
        
        context.fillStyle = color;
        context.fillRect(xPos, yPos, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        context.drawImage(gridPattern, xPos, yPos);
    }

    function drawBoard() {
        game.ctx.fillStyle = '#000';
        game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
        
        // Draw the board
        for (let y = 0; y < game.board.length; y++) {
            for (let x = 0; x < game.board[y].length; x++) {
                if (game.board[y][x]) {
                    const color = COLORS[game.board[y][x] - 1];
                    drawBlock(game.ctx, x, y, color);
                }
            }
        }
        
        // Draw current piece
        if (game.currentPiece) {
            for (let y = 0; y < game.currentPiece.length; y++) {
                for (let x = 0; x < game.currentPiece[y].length; x++) {
                    if (game.currentPiece[y][x]) {
                        const color = COLORS[game.currentPiece[y][x] - 1];
                        drawBlock(game.ctx, game.currentX + x, game.currentY + y, color);
                    }
                }
            }
        }
    }

    function drawNextPiece() {
        if (!game.nextPiece) return;
        
        game.nextPieceCtx.fillStyle = '#000';
        game.nextPieceCtx.fillRect(0, 0, game.nextPieceCanvas.width, game.nextPieceCanvas.height);
        
        const offsetX = (game.nextPieceCanvas.width - game.nextPiece[0].length * BLOCK_SIZE) / 2;
        const offsetY = (game.nextPieceCanvas.height - game.nextPiece.length * BLOCK_SIZE) / 2;
        
        for (let y = 0; y < game.nextPiece.length; y++) {
            for (let x = 0; x < game.nextPiece[y].length; x++) {
                if (game.nextPiece[y][x]) {
                    const color = COLORS[game.nextPiece[y][x] - 1];
                    drawBlock(game.nextPieceCtx, x, y, color, offsetX, offsetY);
                }
            }
        }
    }

    function gameLoop() {
        if (game.needsUpdate) {
            drawBoard();
            drawNextPiece();
            game.needsUpdate = false;
        }
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);

    socket.on('connect', () => {
        socket.emit('displayConnect');
    });

    socket.on('gameConfig', (config) => {
        game.board = Array(config.rows).fill().map(() => Array(config.cols).fill(0));
        game.canvas.width = config.cols * BLOCK_SIZE;
        game.canvas.height = config.rows * BLOCK_SIZE;
        game.needsUpdate = true;
    });

    socket.on('updateGame', (state) => {
        if (state.board) game.board = state.board;
        if (state.currentPiece) {
            game.currentPiece = state.currentPiece;
            game.currentX = state.currentX;
            game.currentY = state.currentY;
        }
        if (state.nextPiece) {
            game.nextPiece = state.nextPiece;
        }
        if (state.score !== undefined) {
            game.score = state.score;
            document.getElementById('score').textContent = state.score;
        }
        if (state.level !== undefined) {
            game.level = state.level;
            document.getElementById('level').textContent = state.level;
        }
        game.needsUpdate = true;
    });
});
