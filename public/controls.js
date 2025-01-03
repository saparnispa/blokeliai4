document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let isPlaying = false;
    let touchStartTime = 0;
    let repeatInterval = null;
    const REPEAT_DELAY = 200; // ms before key repeat starts
    const REPEAT_RATE = 50;   // ms between repeats

    // Elements
    const waitingScreen = document.getElementById('waiting-screen');
    const gameElements = document.querySelector('.game-elements');
    const queueCount = document.getElementById('queue-count');
    const queuePosition = document.getElementById('queue-position');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const nextPieceCanvas = document.getElementById('nextPiece');
    const nextCtx = nextPieceCanvas.getContext('2d');

    // Set next piece canvas size
    const BLOCK_SIZE = 30;
    nextPieceCanvas.width = 4 * BLOCK_SIZE;
    nextPieceCanvas.height = 4 * BLOCK_SIZE;

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

    function showWaitingScreen() {
        waitingScreen.style.display = 'flex';
        gameElements.classList.remove('visible');
    }

    function hideWaitingScreen() {
        waitingScreen.style.display = 'none';
        gameElements.classList.add('visible');
    }

    function drawBlock(x, y, colorIndex) {
        nextCtx.fillStyle = colors[colorIndex];
        nextCtx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        nextCtx.strokeStyle = '#333';
        nextCtx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }

    function drawNextPiece(piece) {
        if (!piece) return;

        // Clear canvas
        nextCtx.fillStyle = '#111';
        nextCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

        // Center the piece
        const xOffset = (4 - piece[0].length) / 2;
        const yOffset = (4 - piece.length) / 2;

        // Draw piece
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    drawBlock(xOffset + x, yOffset + y, piece[y][x]);
                }
            }
        }
    }

    function updateGameInfo(gameState) {
        if (!gameState) return;

        // Update score and level
        if (scoreElement) scoreElement.textContent = gameState.score;
        if (levelElement) levelElement.textContent = gameState.level;
        if (linesElement) linesElement.textContent = gameState.lines;

        // Draw next piece
        if (gameState.nextPiece) {
            drawNextPiece(gameState.nextPiece);
        }
    }

    // Game controls
    function sendAction(action) {
        if (!isPlaying) return;
        socket.emit('gameUpdate', { action });
    }

    // Touch controls with repeat
    function startRepeat(action) {
        if (repeatInterval) clearInterval(repeatInterval);
        sendAction(action);
        touchStartTime = Date.now();
        repeatInterval = setInterval(() => {
            if (Date.now() - touchStartTime >= REPEAT_DELAY) {
                sendAction(action);
            }
        }, REPEAT_RATE);
    }

    function stopRepeat() {
        if (repeatInterval) {
            clearInterval(repeatInterval);
            repeatInterval = null;
        }
    }

    // Touch controls
    const actionMap = {
        'left': 'moveLeft',
        'right': 'moveRight',
        'down': 'moveDown',
        'rotate': 'rotate'
    };

    Object.entries(actionMap).forEach(([id, action]) => {
        const button = document.getElementById(id);
        if (button) {
            // Touch events
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (action === 'moveLeft' || action === 'moveRight' || action === 'moveDown') {
                    startRepeat(action);
                } else {
                    sendAction(action);
                }
            });

            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                stopRepeat();
            });

            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                stopRepeat();
            });

            // Mouse events (for testing on desktop)
            button.addEventListener('mousedown', () => {
                if (action === 'moveLeft' || action === 'moveRight' || action === 'moveDown') {
                    startRepeat(action);
                } else {
                    sendAction(action);
                }
            });

            button.addEventListener('mouseup', () => {
                stopRepeat();
            });

            button.addEventListener('mouseleave', () => {
                stopRepeat();
            });
        }
    });

    // Keyboard controls
    const keyState = {};
    
    function handleKeydown(event) {
        if (!isPlaying || event.repeat) return;
        
        let action = null;
        switch (event.key) {
            case 'ArrowLeft':
                action = 'moveLeft';
                break;
            case 'ArrowRight':
                action = 'moveRight';
                break;
            case 'ArrowDown':
                action = 'moveDown';
                break;
            case 'ArrowUp':
                action = 'rotate';
                break;
        }
        
        if (action) {
            event.preventDefault();
            keyState[action] = true;
            if (action === 'moveLeft' || action === 'moveRight' || action === 'moveDown') {
                startRepeat(action);
            } else {
                sendAction(action);
            }
        }
    }

    function handleKeyup(event) {
        let action = null;
        switch (event.key) {
            case 'ArrowLeft':
                action = 'moveLeft';
                break;
            case 'ArrowRight':
                action = 'moveRight';
                break;
            case 'ArrowDown':
                action = 'moveDown';
                break;
        }
        
        if (action) {
            event.preventDefault();
            keyState[action] = false;
            stopRepeat();
        }
    }

    // Socket events
    socket.on('queueUpdate', (data) => {
        if (queueCount) {
            queueCount.textContent = data.total || 0;
        }
        if (queuePosition) {
            if (data.position === 0) {
                queuePosition.textContent = 'Jūsų eilė!';
                document.getElementById('start-button').style.display = 'block';
            } else {
                queuePosition.textContent = `${data.position} vieta`;
                document.getElementById('start-button').style.display = 'none';
            }
        }
    });

    // Handle game start
    socket.on('gameStart', () => {
        isPlaying = true;
        hideWaitingScreen();
        document.querySelector('.game-elements').style.display = 'block';
        // Hide start button when game starts
        document.getElementById('start-button').style.display = 'none';
    });

    // Handle start button click (only needed when there are other players in queue)
    document.getElementById('start-button').addEventListener('click', () => {
        socket.emit('startGame');
    });

    // Handle ready to start
    socket.on('readyToStart', () => {
        document.getElementById('start-container').style.display = 'block';
        document.getElementById('waiting-text').style.display = 'none';
    });

    socket.on('gameEnd', (data) => {
        isPlaying = false;
        document.querySelector('.game-elements').style.display = 'none';
        if (data) {
            // Save game data to localStorage before redirecting
            localStorage.setItem('lastGameData', JSON.stringify({
                score: data.score,
                lines: data.lines,
                level: data.level
            }));
            
            // Disconnect and redirect to main page
            socket.disconnect();
            window.location.href = '/';
        }
    });

    // Handle close button click
    document.getElementById('closeButton').addEventListener('click', () => {
        document.getElementById('gameOverScreen').style.display = 'none';
        window.location.href = '/';
    });

    socket.on('updateGame', updateGameInfo);

    socket.on('levelUp', (data) => {
        // Flash level display
        if (levelElement) {
            levelElement.style.color = '#fff';
            setTimeout(() => {
                levelElement.style.color = '#FFC107';
            }, 500);
        }
    });

    // Connect to server
    socket.emit('controlsConnect');
    
    // Show waiting screen initially
    showWaitingScreen();

    // Event listeners
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    window.addEventListener('blur', () => {
        stopRepeat();
        Object.keys(keyState).forEach(key => keyState[key] = false);
    });
    window.addEventListener('beforeunload', () => {
        socket.disconnect();
    });

    // Prevent scrolling on mobile
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
        }
    }, { passive: false });
});
