document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = window.gameId;
    
    const BLOCK_SIZE = 30;
    const COLORS = ['#00f3ff', '#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

    let game = {
        canvas: document.getElementById('tetrisCanvas'),
        buffer: document.createElement('canvas'),
        board: [],
        currentPiece: null,
        currentPieceColor: 1,
        currentX: 0,
        currentY: 0,
        config: window.gridConfig || { rows: 35, cols: 12 },
        needsUpdate: true
    };
    
    game.ctx = game.canvas.getContext('2d', { alpha: false });
    game.bufferCtx = game.buffer.getContext('2d', { alpha: false });

    game.board = Array(game.config.rows).fill().map(() => Array(game.config.cols).fill(0));

    function resizeCanvas() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Calculate block size while maintaining pixel perfection
        const maxBlockSize = Math.min(
            Math.floor(windowWidth / game.config.cols),
            Math.floor(windowHeight / game.config.rows)
        );
        
        const width = game.config.cols * maxBlockSize;
        const height = game.config.rows * maxBlockSize;
        
        game.canvas.width = width;
        game.canvas.height = height;
        game.buffer.width = width;
        game.buffer.height = height;
        
        game.canvas.style.position = 'absolute';
        game.canvas.style.left = `${Math.floor((windowWidth - width) / 2)}px`;
        game.canvas.style.top = `${Math.floor((windowHeight - height) / 2)}px`;
        
        game.blockSize = maxBlockSize;
        game.needsUpdate = true;
    }
    
    function drawGame() {
        if (!game.needsUpdate) return;

        const ctx = game.bufferCtx;
        const width = game.canvas.width;
        const height = game.canvas.height;
        const blockSize = game.blockSize;
        
        // Clear with solid black
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw board with pixel-perfect positioning
        for (let y = 0; y < game.config.rows; y++) {
            for (let x = 0; x < game.config.cols; x++) {
                const pixelX = x * blockSize;
                const pixelY = y * blockSize;
                
                if (game.board[y] && game.board[y][x]) {
                    ctx.fillStyle = COLORS[game.board[y][x] - 1];
                    ctx.fillRect(pixelX, pixelY, blockSize - 1, blockSize - 1);
                }
                // Draw grid lines
                ctx.strokeStyle = '#333';
                ctx.strokeRect(pixelX, pixelY, blockSize - 1, blockSize - 1);
            }
        }

        // Draw current piece with pixel-perfect positioning
        if (game.currentPiece) {
            ctx.fillStyle = COLORS[game.currentPieceColor - 1];
            for (let y = 0; y < game.currentPiece.length; y++) {
                for (let x = 0; x < game.currentPiece[y].length; x++) {
                    if (game.currentPiece[y][x]) {
                        const pixelX = (game.currentX + x) * blockSize;
                        const pixelY = (game.currentY + y) * blockSize;
                        ctx.fillRect(pixelX, pixelY, blockSize - 1, blockSize - 1);
                        ctx.strokeStyle = '#333';
                        ctx.strokeRect(pixelX, pixelY, blockSize - 1, blockSize - 1);
                    }
                }
            }
        }

        // Copy buffer to main canvas
        game.ctx.drawImage(game.buffer, 0, 0);
        game.needsUpdate = false;
    }

    function gameLoop() {
        drawGame();
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);

    socket.on('connect', () => {
        socket.emit('displayConnect');
        socket.emit('updateGameConfig', {
            gameId: gameId,
            config: game.config
        });
    });

    socket.on('updateGame', (data) => {
        if (data.gameId === gameId) {
            if (data.gameState.board) game.board = data.gameState.board;
            if (data.gameState.currentPiece) {
                game.currentPiece = data.gameState.currentPiece;
                game.currentPieceColor = data.gameState.currentPieceColor;
                game.currentX = data.gameState.currentX;
                game.currentY = data.gameState.currentY;
            }
            game.needsUpdate = true;
        }
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 150);
    });
    
    resizeCanvas();
});
