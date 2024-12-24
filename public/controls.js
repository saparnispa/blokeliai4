document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let isPlaying = false;
    let touchStartTime = 0;
    let repeatInterval = null;
    const REPEAT_DELAY = 200; // ms before key repeat starts
    const REPEAT_RATE = 50;   // ms between repeats

    // Elements
    const queueCount = document.getElementById('queue-count');
    const queuePosition = document.getElementById('queue-position');
    const initialPrompt = document.getElementById('initial-prompt');
    const gameStatus = document.getElementById('game-status');
    const joinQueueBtn = document.getElementById('join-queue-btn');
    const showScoresBtn = document.getElementById('show-scores-btn');

    // Initial setup
    if (gameStatus) gameStatus.classList.add('hidden');

    // Join queue button handler
    if (joinQueueBtn) {
        joinQueueBtn.addEventListener('click', () => {
            if (initialPrompt) initialPrompt.classList.add('hidden');
            if (gameStatus) gameStatus.classList.remove('hidden');
            socket.emit('joinQueue');
        });
    }

    // Show scores button handler
    if (showScoresBtn) {
        showScoresBtn.addEventListener('click', () => {
            window.location.href = '/scores.html';
        });
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

    // Queue handling
    socket.on('queueUpdate', (data) => {
        if (queueCount) {
            queueCount.textContent = data.total || 0;
        }
        if (queuePosition) {
            if (data.position === 0) {
                queuePosition.textContent = 'Žaidžiate!';
                isPlaying = true;
            } else {
                queuePosition.textContent = data.position;
                isPlaying = false;
            }
        }
    });

    socket.on('gameStart', () => {
        isPlaying = true;
        if (queuePosition) {
            queuePosition.textContent = 'Žaidžiate!';
        }
    });

    socket.on('gameEnd', () => {
        isPlaying = false;
        if (queuePosition) {
            queuePosition.textContent = '-';
        }
        stopRepeat();
    });

    // Connect to server
    socket.emit('controlsConnect');

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
