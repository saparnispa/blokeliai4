document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    
    socket.emit('displayConnect');
    
    const BLOCK_SIZE = 30;
    const COLORS = ['#00f3ff', '#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    const GAMES_COUNT = 4;

    const games = {};
    
    // Pre-render grid pattern with exact pixel sizes
    const gridPattern = document.createElement('canvas');
    const gridCtx = gridPattern.getContext('2d');
    gridPattern.width = BLOCK_SIZE;
    gridPattern.height = BLOCK_SIZE;
    gridCtx.strokeStyle = '#333';
    gridCtx.strokeRect(0, 0, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

    for (let i = 1; i <= GAMES_COUNT; i++) {
        games[i] = {
            canvas: document.getElementById(`tetrisCanvas${i}`),
            buffer: document.createElement('canvas'),
            qrcode: document.getElementById(`qrcode${i}`),
            queueCount: document.getElementById(`queue-count${i}`),
            configPanel: document.getElementById(`config-panel${i}`),
            board: [],
            currentPiece: null,
            currentX: 0,
            currentY: 0,
            config: { rows: 20, cols: 10 },
            needsUpdate: true
        };
        
        games[i].ctx = games[i].canvas.getContext('2d', { alpha: false });
        games[i].bufferCtx = games[i].buffer.getContext('2d', { alpha: false });
        
        generateQRCode(i);
        setupConfigPanel(i);
        drawGame(i);
    }

    function setupConfigPanel(gameId) {
        const game = games[gameId];
        const panel = game.configPanel;
        panel.innerHTML = '<h3>Nustatymai</h3>';

        const rowInput = document.createElement('input');
        rowInput.type = 'number';
        rowInput.min = '5';
        rowInput.max = '30';
        rowInput.value = game.config.rows;
        rowInput.className = 'config-input';
        
        const colInput = document.createElement('input');
        colInput.type = 'number';
        colInput.min = '5';
        colInput.max = '15';
        colInput.value = game.config.cols;
        colInput.className = 'config-input';

        const rowLabel = document.createElement('label');
        rowLabel.textContent = 'Eilutės: ';
        rowLabel.appendChild(rowInput);

        const colLabel = document.createElement('label');
        colLabel.textContent = 'Stulpeliai: ';
        colLabel.appendChild(colInput);

        panel.appendChild(rowLabel);
        panel.appendChild(colLabel);

        let updateTimeout;
        function debouncedUpdateConfig() {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                const newConfig = {
                    rows: parseInt(rowInput.value),
                    cols: parseInt(colInput.value)
                };
                
                if (newConfig.rows >= 5 && newConfig.rows <= 30 &&
                    newConfig.cols >= 5 && newConfig.cols <= 15) {
                    socket.emit('updateGameConfig', {
                        gameId: gameId,
                        config: newConfig
                    });
                }
            }, 300);
        }

        rowInput.addEventListener('change', debouncedUpdateConfig);
        colInput.addEventListener('change', debouncedUpdateConfig);
    }

    function generateQRCode(gameId) {
        const controlsUrl = `${window.location.origin}/tetris${gameId}`;
        games[gameId].qrcode.innerHTML = '';
        new QRCode(games[gameId].qrcode, {
            text: controlsUrl,
            width: 128,
            height: 128,
            colorDark: "#00f3ff",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    function drawGame(gameId) {
        const game = games[gameId];
        const { rows, cols } = game.config;
        
        // Set exact pixel dimensions
        const width = cols * BLOCK_SIZE;
        const height = rows * BLOCK_SIZE;
        
        game.canvas.width = width;
        game.canvas.height = height;
        game.buffer.width = width;
        game.buffer.height = height;
        
        const ctx = game.bufferCtx;
        
        // Clear with solid black
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw board
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const pixelX = x * BLOCK_SIZE;
                const pixelY = y * BLOCK_SIZE;
                
                if (game.board[y] && game.board[y][x]) {
                    ctx.fillStyle = COLORS[game.board[y][x] - 1];
                    ctx.fillRect(pixelX, pixelY, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
                // Draw grid lines
                ctx.strokeStyle = '#333';
                ctx.strokeRect(pixelX, pixelY, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        }

        // Draw current piece with pixel-perfect positioning
        if (game.currentPiece) {
            ctx.fillStyle = COLORS[0];
            for (let y = 0; y < game.currentPiece.length; y++) {
                for (let x = 0; x < game.currentPiece[y].length; x++) {
                    if (game.currentPiece[y][x]) {
                        const pixelX = (game.currentX + x) * BLOCK_SIZE;
                        const pixelY = (game.currentY + y) * BLOCK_SIZE;
                        ctx.fillRect(pixelX, pixelY, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        ctx.strokeStyle = '#333';
                        ctx.strokeRect(pixelX, pixelY, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    }
                }
            }
        }

        // Copy buffer to main canvas
        game.ctx.drawImage(game.buffer, 0, 0);
        game.needsUpdate = false;
    }

    function gameLoop() {
        for (let i = 1; i <= GAMES_COUNT; i++) {
            if (games[i].needsUpdate) {
                drawGame(i);
            }
        }
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);

    socket.on('gameConfigs', (configs) => {
        Object.entries(configs).forEach(([gameId, config]) => {
            if (games[gameId]) {
                games[gameId].config = config;
                games[gameId].board = Array(config.rows).fill().map(() => Array(config.cols).fill(0));
                const inputs = games[gameId].configPanel.getElementsByTagName('input');
                if (inputs[0]) inputs[0].value = config.rows;
                if (inputs[1]) inputs[1].value = config.cols;
                games[gameId].needsUpdate = true;
                generateQRCode(gameId);
            }
        });
    });

    socket.on('gameConfigUpdated', (data) => {
        const { gameId, config } = data;
        if (games[gameId]) {
            games[gameId].config = config;
            games[gameId].board = Array(config.rows).fill().map(() => Array(config.cols).fill(0));
            const inputs = games[gameId].configPanel.getElementsByTagName('input');
            if (inputs[0]) inputs[0].value = config.rows;
            if (inputs[1]) inputs[1].value = config.cols;
            games[gameId].needsUpdate = true;
            generateQRCode(gameId);
        }
    });

    socket.on('updateGame', (data) => {
        const { gameId, gameState } = data;
        if (games[gameId]) {
            if (gameState.board) games[gameId].board = gameState.board;
            if (gameState.currentPiece) {
                games[gameId].currentPiece = gameState.currentPiece;
                games[gameId].currentX = gameState.currentX;
                games[gameId].currentY = gameState.currentY;
            }
            if (gameState.config) {
                games[gameId].config = gameState.config;
            }
            games[gameId].needsUpdate = true;
        }
    });

    socket.on('queueUpdate', (queues) => {
        Object.entries(queues).forEach(([gameId, data]) => {
            if (games[gameId]) {
                games[gameId].queueCount.textContent = data.count;
                if (data.config) {
                    games[gameId].config = data.config;
                    const inputs = games[gameId].configPanel.getElementsByTagName('input');
                    if (inputs[0]) inputs[0].value = data.config.rows;
                    if (inputs[1]) inputs[1].value = data.config.cols;
                    games[gameId].needsUpdate = true;
                }
            }
        });
    });

    socket.on('gameReset', (data) => {
        const { gameId, config } = data;
        if (games[gameId]) {
            if (config) {
                games[gameId].config = config;
                const inputs = games[gameId].configPanel.getElementsByTagName('input');
                if (inputs[0]) inputs[0].value = config.rows;
                if (inputs[1]) inputs[1].value = config.cols;
            }
            games[gameId].board = Array(games[gameId].config.rows).fill()
                .map(() => Array(games[gameId].config.cols).fill(0));
            games[gameId].currentPiece = null;
            games[gameId].currentX = 0;
            games[gameId].currentY = 0;
            games[gameId].needsUpdate = true;
        }
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            for (let i = 1; i <= GAMES_COUNT; i++) {
                games[i].needsUpdate = true;
            }
        }, 150);
    });

    socket.on('connect', () => {
        socket.emit('displayConnect');
    });
});
