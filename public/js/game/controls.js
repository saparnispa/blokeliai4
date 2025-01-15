const REPEAT_DELAY = 200; // ms before key repeat starts
const REPEAT_RATE = 50;   // ms between repeats

let isPlaying = false;
let touchStartTime = 0;
let repeatInterval = null;
let keyState = {};

function initControls(socket) {
    // Action mapping for buttons
    const actionMap = {
        'left': 'moveLeft',
        'right': 'moveRight',
        'down': 'moveDown',
        'rotate': 'rotate'
    };

    function sendAction(action) {
        if (!isPlaying) return;
        socket.emit('gameUpdate', { action });
    }

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

    // Touch and mouse controls
    document.querySelectorAll('.btn[data-action]').forEach(button => {
        const action = actionMap[button.dataset.action];
        if (action) {
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

    // Event listeners
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    window.addEventListener('blur', () => {
        stopRepeat();
        Object.keys(keyState).forEach(key => keyState[key] = false);
    });

    // Prevent scrolling on mobile
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
        }
    }, { passive: false });

    return {
        setPlaying: (playing) => {
            isPlaying = playing;
        },
        cleanup: () => {
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('keyup', handleKeyup);
            stopRepeat();
        }
    };
}

export { initControls };
