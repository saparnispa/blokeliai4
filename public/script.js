document.addEventListener('DOMContentLoaded', () => {
    const socket = io({
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true
    });
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Elements
    const desktopView = document.getElementById('desktop-view');
    const mobileView = document.getElementById('mobile-view');
    const canvas = document.getElementById('tetrisCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const qrcodeDiv = document.getElementById('qrcode');
    const controlsDiv = document.getElementById('controls');
    const timerDiv = document.getElementById('timer');
    const countdownSpan = document.getElementById('countdown');
    const playerPositionSpan = document.getElementById('player-position');
    const queueCountSpan = document.getElementById('queue-count');
    const currentScoreSpan = document.getElementById('current-score');
    const waitingMessage = document.getElementById('waiting-message');

    // Game constants
    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = 30;
    const COLORS = ['#00f3ff', '#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

    // Game variables
    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentPiece = null;
    let currentX = 0;
    let currentY = 0;
    let currentScore = 0;
    let gameInterval = null;
    let isPlaying = false;
    let currentPieceColors = [];
    let isGameOver = false;
    let isProcessingGameOver = false;

    // Tetromino shapes
    const TETROMINOES = [
        [[1, 1, 1, 1]], // I
        [[1, 1], [1, 1]], // O
        [[0, 1, 0], [1, 1, 1]], // T
        [[1, 0, 0], [1, 1, 1]], // L
        [[0, 0, 1], [1, 1, 1]], // J
        [[1, 1, 0], [0, 1, 1]], // S
        [[0, 1, 1], [1, 1, 0]]  // Z
    ];

    // Socket connection handling
    socket.on('connect', () => {
        if (isMobile && !isPlaying && !isProcessingGameOver) {
            socket.emit('joinQueue');
        } else if (!isMobile) {
            socket.emit('displayConnect');
        }
    });

    socket.on('disconnect', () => {
        if (isMobile) {
            waitingMessage.textContent = 'Prarastas ryšys su serveriu...';
            waitingMessage.classList.remove('hidden');
            controlsDiv.classList.add('hidden');
        }
    });

    socket.on('connect_error', () => {
        if (isMobile) {
            waitingMessage.textContent = 'Bandoma prisijungti iš naujo...';
            waitingMessage.classList.remove('hidden');
            controlsDiv.classList.add('hidden');
        }
    });

    // Keep connection alive
    setInterval(() => {
        if (socket.connected) {
            socket.emit('ping');
        }
    }, 15000);

    // Initialize based on device type
    function init() {
        if (isMobile) {
            desktopView.classList.add('hidden');
            mobileView.classList.remove('hidden');
            if (socket.connected && !isPlaying && !isProcessingGameOver) {
                socket.emit('joinQueue');
            }
        } else {
            mobileView.classList.add('hidden');
            desktopView.classList.remove('hidden');
            generateQRCode();
            if (socket.connected) {
                socket.emit('displayConnect');
            }
        }
        updateHighScores();
    }

    // Reset game state
    function resetGameState() {
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        currentPiece = null;
        currentX = 0;
        currentY = 0;
        currentScore = 0;
        currentPieceColors = [];
        isPlaying = false;
        isGameOver = false;
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        currentScoreSpan.textContent = '0';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw(); // Draw empty grid
    }

    // Game functions
    function createPiece() {
        const pieceIdx = Math.floor(Math.random() * TETROMINOES.length);
        currentPiece = TETROMINOES[pieceIdx];
        currentX = Math.floor(COLS / 2) - Math.floor(currentPiece[0].length / 2);
        currentY = 0;
        
        currentPieceColors = [];
        for (let y = 0; y < currentPiece.length; y++) {
            currentPieceColors[y] = [];
            for (let x = 0; x < currentPiece[y].length; x++) {
                if (currentPiece[y][x]) {
                    currentPieceColors[y][x] = Math.floor(Math.random() * COLORS.length);
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    ctx.fillStyle = COLORS[board[y][x] - 1];
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
                ctx.strokeStyle = '#333';
                ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        }

        // Draw current piece
        if (currentPiece && !isGameOver) {
            for (let y = 0; y < currentPiece.length; y++) {
                for (let x = 0; x < currentPiece[y].length; x++) {
                    if (currentPiece[y][x]) {
                        ctx.fillStyle = COLORS[currentPieceColors[y][x]];
                        ctx.fillRect(
                            (currentX + x) * BLOCK_SIZE, 
                            (currentY + y) * BLOCK_SIZE, 
                            BLOCK_SIZE - 1, 
                            BLOCK_SIZE - 1
                        );
                    }
                }
            }
        }
    }

    function moveLeft() {
        if (isPlaying && !isProcessingGameOver) {
            socket.emit('gameUpdate', { action: 'moveLeft' });
        }
    }

    function moveRight() {
        if (isPlaying && !isProcessingGameOver) {
            socket.emit('gameUpdate', { action: 'moveRight' });
        }
    }

    function moveDown() {
        if (isPlaying && !isProcessingGameOver) {
            socket.emit('gameUpdate', { action: 'moveDown' });
        }
    }

    function rotate() {
        if (isPlaying && !isProcessingGameOver) {
            socket.emit('gameUpdate', { action: 'rotate' });
        }
    }

    function drop() {
        if (isPlaying && !isProcessingGameOver) {
            socket.emit('gameUpdate', { action: 'drop' });
        }
    }

    function collision(offsetX, offsetY) {
        for (let y = 0; y < currentPiece.length; y++) {
            for (let x = 0; x < currentPiece[y].length; x++) {
                if (currentPiece[y][x]) {
                    const newX = currentX + x + offsetX;
                    const newY = currentY + y + offsetY;
                    if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                    if (newY >= 0 && board[newY][newX]) return true;
                }
            }
        }
        return false;
    }

    function freeze() {
        for (let y = 0; y < currentPiece.length; y++) {
            for (let x = 0; x < currentPiece[y].length; x++) {
                if (currentPiece[y][x]) {
                    board[currentY + y][currentX + x] = currentPieceColors[y][x] + 1;
                }
            }
        }
    }

    function clearLines() {
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell)) {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                currentScore += 100;
                currentScoreSpan.textContent = currentScore;
            }
        }
    }

    function gameOver() {
        return board[0].some(cell => cell);
    }

    function startGame() {
        resetGameState();
        isPlaying = true;
        isGameOver = false;
        isProcessingGameOver = false;
        createPiece();
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(() => moveDown(), 1000);
        draw();
        
        if (isMobile) {
            waitingMessage.classList.add('hidden');
            controlsDiv.classList.remove('hidden');
            startButton.classList.add('hidden');
            timerDiv.classList.add('hidden');
        }
    }

    async function endGame() {
        if (isProcessingGameOver) return;
        
        isGameOver = true;
        isProcessingGameOver = true;
        isPlaying = false;
        
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }

        const finalScore = currentScore;
        
        if (isMobile) {
            controlsDiv.classList.add('hidden');
            
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Score save timeout')), 5000);
                    
                    socket.emit('gameOver', { score: finalScore }, () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                });
                
                socket.emit('joinQueue');
                waitingMessage.classList.remove('hidden');
            } catch (error) {
                console.error('Failed to save score:', error);
                waitingMessage.textContent = 'Nepavyko išsaugoti rezultato';
                waitingMessage.classList.remove('hidden');
            }
        } else {
            // Desktop view - start auto-replay timer
            setTimeout(() => {
                if (!isPlaying && !isProcessingGameOver) {
                    startGame();
                }
            }, 5000);
        }
        
        isProcessingGameOver = false;
    }

    // Mobile controls
    if (isMobile) {
        document.getElementById('left-btn').addEventListener('touchstart', moveLeft);
        document.getElementById('right-btn').addEventListener('touchstart', moveRight);
        document.getElementById('down-btn').addEventListener('touchstart', moveDown);
        document.getElementById('rotate-btn').addEventListener('touchstart', rotate);
        document.getElementById('drop-btn').addEventListener('touchstart', drop);
    }

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (isMobile) return;
        
        switch (event.code) {
            case 'ArrowLeft':
                moveLeft();
                break;
            case 'ArrowRight':
                moveRight();
                break;
            case 'ArrowDown':
                moveDown();
                break;
            case 'ArrowUp':
                rotate();
                break;
            case 'Space':
                drop();
                break;
        }
    });

    // Socket events
    socket.on('queuePosition', (position) => {
        playerPositionSpan.textContent = position;
        if (position === 0) {
            startButton.classList.remove('hidden');
            timerDiv.classList.remove('hidden');
            waitingMessage.classList.add('hidden');
            startCountdown();
        }
    });

    socket.on('queueCount', (count) => {
        queueCountSpan.textContent = count;
    });

    socket.on('updateHighScores', updateHighScores);

    // Start button event
    startButton.addEventListener('click', () => {
        socket.emit('startGame');
        startGame();
    });

    // Countdown timer
    function startCountdown() {
        let timeLeft = 20;
        countdownSpan.textContent = timeLeft;
        
        const timer = setInterval(() => {
            timeLeft--;
            countdownSpan.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                if (!isPlaying && !isProcessingGameOver) {
                    socket.emit('timeExpired');
                    startButton.classList.add('hidden');
                    timerDiv.classList.add('hidden');
                    waitingMessage.classList.remove('hidden');
                    waitingMessage.textContent = 'Laikas baigėsi. Grįžtate į eilę.';
                }
            }
        }, 1000);
    }

    // High scores
    function updateHighScores() {
        fetch('/api/scores')
            .then(response => response.json())
            .then(scores => {
                const tbody = document.getElementById('scores-body');
                tbody.innerHTML = '';
                scores.forEach((score, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${score.player}</td>
                        <td>${score.score}</td>
                    `;
                    tbody.appendChild(row);
                });
            });
    }

    // Add replay handler
    socket.on('replayStart', () => {
        if (!isMobile) {
            const replayMessage = document.createElement('div');
            replayMessage.textContent = 'Rodomas paskutinis žaidimas';
            replayMessage.classList.add('replay-message');
            desktopView.appendChild(replayMessage);
            
            // Remove message after 3 seconds
            setTimeout(() => {
                replayMessage.remove();
            }, 3000);
        }
    });

    socket.on('gameEnd', (data) => {
        if (isMobile) {
            isGameOver = true;
            isProcessingGameOver = true;
            isPlaying = false;
            
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            
            socket.emit('gameEnd', {
                score: currentScore,
                lines: data.lines
            });
            
            controlsDiv.classList.add('hidden');
            waitingMessage.classList.remove('hidden');
            waitingMessage.textContent = 'Žaidimas baigtas. Jūsų rezultatas: ' + currentScore;
        }
    });

    // Update game state handler
    socket.on('updateGame', (gameState) => {
        if (!isMobile) {
            board = gameState.board;
            currentPiece = gameState.currentPiece;
            currentX = gameState.currentX;
            currentY = gameState.currentY;
            currentScore = gameState.score;
            currentScoreSpan.textContent = currentScore;
            draw();
        }
    });

    // Initialize the game
    init();
});
