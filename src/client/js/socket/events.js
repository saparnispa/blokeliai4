class SocketHandler {
    constructor(display, controls) {
        // Clear any previous game state
        localStorage.removeItem('lastGameData');
        
        this.socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });
        this.display = display;
        this.controls = controls;
        
        // Initialize game state
        this.display.hideGameElements();
        this.display.showWaitingScreen();
        
        this.setupEventListeners();
        this.setupErrorHandlers();
        
        // Debug transport type
        this.socket.on('connect', () => {
            console.log('Connected with transport:', this.socket.io.engine.transport.name);
        });
        
        // Debug transport upgrade
        this.socket.io.engine.on('upgrade', () => {
            console.log('Transport upgraded to:', this.socket.io.engine.transport.name);
        });
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
            if (reason === 'io server disconnect') {
                setTimeout(() => {
                    this.socket.connect();
                }, 1000);
            }
        });

        // Handle successful connection
        this.socket.on('connect', () => {
            console.log('Connected to server');
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
            
            if (data) {
                // Save game data to localStorage
                localStorage.setItem('lastGameData', JSON.stringify({
                    score: data.score,
                    lines: data.lines,
                    level: data.level
                }));
                
                // Use setTimeout to ensure game state is saved before redirect
                setTimeout(() => {
                    window.location.replace('http://blokeliai.site');
                }, 100);
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
            // Clear any game state
            localStorage.removeItem('lastGameData');
            
            // Notify server of disconnection
            this.socket.emit('forceDisconnect');
            
            // Disconnect socket
            this.socket.disconnect();
            
            // Ensure game elements are hidden
            this.display.hideGameElements();
            this.display.showWaitingScreen();
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
