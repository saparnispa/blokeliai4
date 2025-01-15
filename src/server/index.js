import http from 'http';
import { Server } from 'socket.io';
import { app, initializeApp } from './app.js';
import { loadScores } from './game/scores.js';
import {
    initializeHandlers,
    handleDisplayConnect,
    handleControlsConnect,
    handleGameAction,
    handleDisconnect,
    clearDropInterval,
    handleStartGame
} from './socket/handlers.js';

// Create HTTP server
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000
});

// Debug Socket.IO events
io.engine.on("connection_error", (err) => {
    console.log("Connection error:", err.req);      // the request object
    console.log("Error message:", err.code);     // the error code, for example 1
    console.log("Error message:", err.message);  // the error message, for example "Session ID unknown"
    console.log("Error context:", err.context);  // some additional error context
});

// Initialize socket handlers
initializeHandlers(io);

// Socket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle socket errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
    
    // Setup event handlers with error catching
    const setupHandler = (event, handler) => {
        socket.on(event, (...args) => {
            try {
                handler(socket, ...args);
            } catch (error) {
                console.error(`Error handling ${event}:`, error);
                socket.emit('error', 'Internal server error');
            }
        });
    };
    
    setupHandler('displayConnect', handleDisplayConnect);
    setupHandler('controlsConnect', handleControlsConnect);
    setupHandler('gameUpdate', (socket, data) => handleGameAction(socket, data.action));
    setupHandler('startGame', handleStartGame);
    setupHandler('disconnect', handleDisconnect);
});

// Handle server-wide socket.io errors
io.engine.on('connection_error', (error) => {
    console.error('Connection error:', error);
});

// Graceful shutdown
function gracefulShutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully...`);
    clearDropInterval();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
    try {
        await initializeApp();
        await loadScores();
        
        const PORT = process.env.PORT || 3000;
        return new Promise((resolve, reject) => {
            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${PORT} still in use, shutting down...`);
                    process.exit(1);
                }
                reject(error);
            });
            
            server.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
                resolve();
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Retry server start if needed
(async () => {
    try {
        await startServer();
    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
})();
