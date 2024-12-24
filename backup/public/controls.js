document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = window.gameId;

    // Elements
    const gameStatus = document.getElementById('game-status');
    const controls = document.getElementById('controls');
    const timerDiv = document.getElementById('timer');
    const countdownSpan = document.getElementById('countdown');
    const playerPositionSpan = document.getElementById('player-position');
    const currentScoreSpan = document.getElementById('current-score');
    const waitingMessage = document.getElementById('waiting-message');
    const startButton = document.getElementById('startButton');
    const queueNumberDisplay = gameStatus.querySelector('h3');
    const initialPrompt = document.getElementById('initial-prompt');
    const joinQueueBtn = document.getElementById('join-queue-btn');
    const showScoresBtn = document.getElementById('show-scores-btn');

    // Hide game status initially
    gameStatus.classList.add('hidden');

    // Join queue button handler
    joinQueueBtn.addEventListener('click', () => {
        initialPrompt.classList.add('hidden');
        gameStatus.classList.remove('hidden');
        socket.emit('joinQueue', gameId);
    });

    // Show scores button handler
    showScoresBtn.addEventListener('click', () => {
        window.location.href = '/scores.html';
    });

    // Create return to queue button
    const returnToQueueButton = document.createElement('button');
    returnToQueueButton.id = 'returnToQueueButton';
    returnToQueueButton.textContent = 'Grįžti į eilę';
    returnToQueueButton.classList.add('hidden');
    timerDiv.appendChild(returnToQueueButton);

    // Create game over elements
    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'game-over';
    gameOverDiv.classList.add('hidden');
    gameOverDiv.innerHTML = `
        <h2>Žaidimas Baigtas!</h2>
        <p>Jūsų rezultatas: <span id="final-score">0</span></p>
        <p>Pasiektas lygis: <span id="final-level">1</span></p>
        <div class="name-input">
            <input type="text" id="player-name" placeholder="Įveskite savo vardą" maxlength="20">
            <button id="submit-score">Išsaugoti</button>
        </div>
    `;
    document.body.appendChild(gameOverDiv);

    const finalScoreSpan = document.getElementById('final-score');
    const finalLevelSpan = document.getElementById('final-level');
    const playerNameInput = document.getElementById('player-name');
    const submitScoreButton = document.getElementById('submit-score');

    // Game variables
    let currentScore = 0;
    let currentLevel = 1;
    let isPlaying = false;
    let countdownTimer = null;
    let gameInterval = null;
    let fastDropInterval = null;
    let isDownKeyHeld = false;

    // Level configuration
    const LEVEL_SPEEDS = {
        1: 350,    // 1 second
        2: 300,     // 0.9 seconds
        3: 250,     // 0.8 seconds
        4: 250,     // 0.7 seconds
        5: 200,     // 0.6 seconds
        6: 200,     // 0.5 seconds
        7: 200,     // 0.4 seconds
        8: 150,     // 0.3 seconds
        9: 100,     // 0.2 seconds
        10: 50     // 0.1 seconds
    };
    const FAST_DROP_SPEED = 50;
    const POINTS_PER_LEVEL = 1000;
    const MAX_LEVEL = 10;

    // Game state
    let config = { rows: 20, cols: 10 };
    let board = Array(config.rows).fill().map(() => Array(config.cols).fill(0));
    let currentPiece = null;
    let currentPieceColor = 1;
    let currentX = 3;
    let currentY = 0;

    // Control schemes based on gameId
    const controlSchemes = {
        1: {
            left: ['ArrowLeft'],
            right: ['ArrowRight'],
            down: ['ArrowDown'],
            rotate: ['ArrowUp', ' ']
        },
        2: {
            left: ['a', 'A'],
            right: ['d', 'D'],
            down: ['s', 'S'],
            rotate: ['w', 'W']
        },
        3: {
            left: ['j', 'J'],
            right: ['l', 'L'],
            down: ['k', 'K'],
            rotate: ['i', 'I']
        },
        4: {
            left: ['ArrowLeft'],
            right: ['ArrowRight'],
            down: ['ArrowDown'],
            rotate: ['ArrowUp']
        }
    };

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

    function createPiece() {
        const pieceIdx = Math.floor(Math.random() * TETROMINOES.length);
        currentPiece = TETROMINOES[pieceIdx];
        currentPieceColor = Math.floor(Math.random() * 7) + 1;
        currentX = Math.floor(config.cols / 2) - Math.floor(currentPiece[0].length / 2);
        currentY = 0;
        emitGameState();
    }

    function emitGameState() {
        socket.emit('updateGame', {
            gameId: gameId,
            gameState: {
                board: board,
                currentPiece: currentPiece,
                currentPieceColor: currentPieceColor,
                currentX: currentX,
                currentY: currentY,
                score: currentScore,
                level: currentLevel,
                config: config
            }
        });
    }

    function updateLevel() {
        const newLevel = Math.min(Math.floor(currentScore / POINTS_PER_LEVEL) + 1, MAX_LEVEL);
        if (newLevel !== currentLevel) {
            currentLevel = newLevel;
            document.getElementById('current-level').textContent = currentLevel;
            
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = setInterval(() => {
                    if (isPlaying) moveDown();
                }, LEVEL_SPEEDS[currentLevel]);
            }
        }
    }

    function collision(offsetX, offsetY) {
        for (let y = 0; y < currentPiece.length; y++) {
            for (let x = 0; x < currentPiece[y].length; x++) {
                if (currentPiece[y][x]) {
                    const newX = currentX + x + offsetX;
                    const newY = currentY + y + offsetY;
                    if (newX < 0 || newX >= config.cols || newY >= config.rows) return true;
                    if (newY >= 0 && board[newY][newX]) return true;
                }
            }
        }
        return false;
    }

    function moveLeft() {
        if (!collision(-1, 0)) {
            currentX--;
            emitGameState();
        }
    }

    function moveRight() {
        if (!collision(1, 0)) {
            currentX++;
            emitGameState();
        }
    }

    function moveDown() {
        if (!collision(0, 1)) {
            currentY++;
            emitGameState();
        } else {
            freezePiece();
            clearLines();
            if (checkGameOver()) {
                endGame();
                return;
            }
            createPiece();
        }
    }

    function rotate() {
        const rotated = currentPiece[0].map((_, i) =>
            currentPiece.map(row => row[i]).reverse()
        );
        const prevPiece = currentPiece;
        currentPiece = rotated;
        if (collision(0, 0)) {
            currentPiece = prevPiece;
        } else {
            emitGameState();
        }
    }

    function freezePiece() {
        for (let y = 0; y < currentPiece.length; y++) {
            for (let x = 0; x < currentPiece[y].length; x++) {
                if (currentPiece[y][x]) {
                    board[currentY + y][currentX + x] = currentPieceColor;
                }
            }
        }
        emitGameState();
    }

    function clearLines() {
        let linesCleared = 0;
        let newBoard = [];
        
        for (let y = 0; y < config.rows; y++) {
            if (!board[y].every(cell => cell)) {
                newBoard.push([...board[y]]);
            } else {
                linesCleared++;
            }
        }
        
        while (newBoard.length < config.rows) {
            newBoard.unshift(Array(config.cols).fill(0));
        }
        
        if (linesCleared > 0) {
            board = newBoard;
            const points = linesCleared * 100 * currentLevel;
            currentScore += points;
            currentScoreSpan.textContent = currentScore;
            updateLevel();
            emitGameState();
        }
    }

    function checkGameOver() {
        return board[0].some(cell => cell);
    }

    function updateConfig(newConfig) {
        config = newConfig;
    }

    function updateGameState(gameState) {
        if (gameState.board) board = gameState.board;
        if (gameState.currentPiece) {
            currentPiece = gameState.currentPiece;
            currentPieceColor = gameState.currentPieceColor;
            currentX = gameState.currentX;
            currentY = gameState.currentY;
        }
        if (gameState.score !== undefined) {
            currentScore = gameState.score;
            currentScoreSpan.textContent = currentScore;
        }
        if (gameState.level !== undefined) {
            currentLevel = gameState.level;
            document.getElementById('current-level').textContent = currentLevel;
        }
        if (gameState.config) {
            config = gameState.config;
        }
    }

    function startFastDrop() {
        if (!isDownKeyHeld && isPlaying) {
            isDownKeyHeld = true;
            if (fastDropInterval) clearInterval(fastDropInterval);
            fastDropInterval = setInterval(() => {
                if (isPlaying && isDownKeyHeld) moveDown();
            }, FAST_DROP_SPEED);
        }
    }

    function stopFastDrop() {
        isDownKeyHeld = false;
        if (fastDropInterval) {
            clearInterval(fastDropInterval);
            fastDropInterval = null;
        }
    }

    function setupControls() {
        const controls = {
            'left-btn': moveLeft,
            'right-btn': moveRight,
            'down-btn': moveDown,
            'rotate-btn': rotate
        };

        Object.entries(controls).forEach(([id, action]) => {
            const button = document.getElementById(id);
            
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (isPlaying) {
                    action();
                    button.classList.add('active');
                    if (id === 'down-btn') startFastDrop();
                }
            }, { passive: false });

            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                button.classList.remove('active');
                if (id === 'down-btn') stopFastDrop();
            }, { passive: false });

            button.addEventListener('mousedown', () => {
                if (isPlaying) {
                    action();
                    button.classList.add('active');
                    if (id === 'down-btn') startFastDrop();
                }
            });

            button.addEventListener('mouseup', () => {
                button.classList.remove('active');
                if (id === 'down-btn') stopFastDrop();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (!isPlaying) return;
            
            const scheme = controlSchemes[gameId];
            
            if (scheme.left.includes(e.key)) {
                e.preventDefault();
                moveLeft();
                document.getElementById('left-btn').classList.add('active');
            }
            else if (scheme.right.includes(e.key)) {
                e.preventDefault();
                moveRight();
                document.getElementById('right-btn').classList.add('active');
            }
            else if (scheme.down.includes(e.key)) {
                e.preventDefault();
                document.getElementById('down-btn').classList.add('active');
                startFastDrop();
            }
            else if (scheme.rotate.includes(e.key)) {
                e.preventDefault();
                rotate();
                document.getElementById('rotate-btn').classList.add('active');
            }
        });

        document.addEventListener('keyup', (e) => {
            const scheme = controlSchemes[gameId];
            
            if (scheme.left.includes(e.key)) {
                document.getElementById('left-btn').classList.remove('active');
            }
            else if (scheme.right.includes(e.key)) {
                document.getElementById('right-btn').classList.remove('active');
            }
            else if (scheme.down.includes(e.key)) {
                document.getElementById('down-btn').classList.remove('active');
                stopFastDrop();
            }
            else if (scheme.rotate.includes(e.key)) {
                document.getElementById('rotate-btn').classList.remove('active');
            }
        });
    }

    function startGame() {
        isPlaying = true;
        currentScore = 0;
        currentLevel = 1;
        board = Array(config.rows).fill().map(() => Array(config.cols).fill(0));
        currentScoreSpan.textContent = '0';
        document.getElementById('current-level').textContent = '1';
        waitingMessage.classList.add('hidden');
        controls.classList.remove('hidden');
        startButton.classList.add('hidden');
        timerDiv.classList.add('hidden');
        gameOverDiv.classList.add('hidden');
        returnToQueueButton.classList.add('hidden');
        queueNumberDisplay.classList.add('hidden');
        document.getElementById('game-info').classList.remove('hidden');
        
        createPiece();
        
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            if (isPlaying) moveDown();
        }, LEVEL_SPEEDS[currentLevel]);
    }

    function endGame() {
        isPlaying = false;
        if (gameInterval) clearInterval(gameInterval);
        if (fastDropInterval) clearInterval(fastDropInterval);
        isDownKeyHeld = false;
        
        controls.classList.add('hidden');
        waitingMessage.classList.add('hidden');
        document.getElementById('game-info').classList.add('hidden');
        gameOverDiv.classList.remove('hidden');
        finalScoreSpan.textContent = currentScore;
        finalLevelSpan.textContent = currentLevel;
        
        playerNameInput.value = '';
        playerNameInput.disabled = false;
        submitScoreButton.disabled = false;
    }

    submitScoreButton.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            playerNameInput.disabled = true;
            submitScoreButton.disabled = true;
            
            socket.emit('gameOver', { 
                gameId: gameId, 
                score: currentScore,
                playerName: playerName
            });
            
            window.location.href = '/scores.html';
        }
    });

    returnToQueueButton.addEventListener('click', () => {
        socket.emit('timeExpired', gameId);
        socket.emit('joinQueue', gameId);
        startButton.classList.add('hidden');
        timerDiv.classList.add('hidden');
        returnToQueueButton.classList.add('hidden');
        waitingMessage.classList.remove('hidden');
        waitingMessage.textContent = 'Laukiama eilėje...';
        queueNumberDisplay.classList.remove('hidden');
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
    });

    function startCountdown() {
        let timeLeft = 5;
        countdownSpan.textContent = timeLeft;
        
        if (countdownTimer) clearInterval(countdownTimer);
        
        countdownTimer = setInterval(() => {
            timeLeft--;
            countdownSpan.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(countdownTimer);
                if (!isPlaying) {
                    startButton.classList.add('hidden');
                    returnToQueueButton.classList.remove('hidden');
                }
            }
        }, 1000);
    }

    socket.on('connect', () => {
        // Don't auto-join queue, wait for user to click join queue button
    });

    socket.on('queuePosition', (data) => {
        if (data.gameId === parseInt(gameId)) {
            playerPositionSpan.textContent = data.position;
            
            if (!isPlaying) {
                if (data.position === 0) {
                    startButton.classList.remove('hidden');
                    timerDiv.classList.remove('hidden');
                    returnToQueueButton.classList.add('hidden');
                    waitingMessage.classList.add('hidden');
                    gameOverDiv.classList.add('hidden');
                    startCountdown();
                } else {
                    startButton.classList.add('hidden');
                    timerDiv.classList.add('hidden');
                    returnToQueueButton.classList.add('hidden');
                    gameOverDiv.classList.add('hidden');
                    waitingMessage.classList.remove('hidden');
                    waitingMessage.textContent = 'Laukiama eilėje...';
                    if (countdownTimer) {
                        clearInterval(countdownTimer);
                        countdownTimer = null;
                    }
                }
            }
        }
    });

    socket.on('updateGame', (data) => {
        if (data.gameId === parseInt(gameId)) {
            updateGameState(data.gameState);
        }
    });

    socket.on('gameStarted', (data) => {
        if (parseInt(data.gameId) === parseInt(gameId)) {
            if (data.config) {
                updateConfig(data.config);
            }
            startGame();
        }
    });

    socket.on('gameOver', (id) => {
        if (parseInt(id) === parseInt(gameId) && isPlaying) {
            endGame();
        }
    });

    startButton.addEventListener('click', () => {
        socket.emit('startGame', gameId);
    });

    socket.on('disconnect', () => {
        if (isPlaying) {
            isPlaying = false;
            if (gameInterval) clearInterval(gameInterval);
            if (fastDropInterval) clearInterval(fastDropInterval);
        }
    });

    setupControls();
});
