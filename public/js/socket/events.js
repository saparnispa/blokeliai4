class SocketHandler {
    constructor(display, controls) {
        this.socket = io();
        this.display = display;
        this.controls = controls;
        this.setupEventListeners();
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
            
            if (data) {
                // Save game data to localStorage before redirecting
                localStorage.setItem('lastGameData', JSON.stringify({
                    score: data.score,
                    lines: data.lines,
                    level: data.level
                }));
                
                // Disconnect and redirect to main page
                this.socket.disconnect();
                window.location.href = '/';
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
