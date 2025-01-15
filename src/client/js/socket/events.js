class SocketHandler {
    constructor(display, controls) {
        this.socket = io({
            reconnection: false, // Disable reconnection to ensure clean disconnect on refresh
            timeout: 20000
        });
        this.display = display;
        this.controls = controls;
        this.setupEventListeners();
        this.setupErrorHandlers();
    }

    setupErrorHandlers() {
        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.display.showWaitingScreen();
        });

        // Handle disconnection
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            this.display.showWaitingScreen();
            // Prevent any reconnection attempts
            this.socket.disconnect();
        });
    }

    setupEventListeners() {
        // Queue updates
        this.socket.on('queueUpdate', (data) => {
            this.display.updateQueueStatus(data);
        });

        // Game start
        this.socket.on('gameStart', () => {
            this.controls.setPlaying(true);
            this.display.hideWaitingScreen();
            this.display.showGameElements();
        });

        // Game updates
        this.socket.on('updateGame', (gameState) => {
            this.display.updateGameInfo(gameState);
        });

        // Level up
        this.socket.on('levelUp', () => {
            this.display.handleLevelUp();
        });

        // Game end
        this.socket.on('gameEnd', (data) => {
            this.controls.setPlaying(false);
            this.display.hideGameElements();
            this.display.showWaitingScreen();
            
            if (data) {
                // Save game data to localStorage
                localStorage.setItem('lastGameData', JSON.stringify({
                    score: data.score,
                    lines: data.lines,
                    level: data.level
                }));
            }
        });

        // Handle close button click
        document.getElementById('closeButton')?.addEventListener('click', () => {
            document.getElementById('gameOverScreen')?.style.setProperty('display', 'none');
            window.location.href = '/';
        });

        // Handle start button click
        document.getElementById('start-button')?.addEventListener('click', () => {
            this.socket.emit('startGame');
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.socket.disconnect();
        });
    }

    connectAsControls() {
        this.socket.emit('controlsConnect');
        this.display.showWaitingScreen();
    }

    getSocket() {
        return this.socket;
    }
}

export { SocketHandler };
