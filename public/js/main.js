import { GameDisplay } from './ui/display.js';
import { initControls } from './game/controls.js';
import { SocketHandler } from './socket/events.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize game components
    const display = new GameDisplay();
    const controls = initControls(null); // Initialize controls first
    const socketHandler = new SocketHandler(display, controls); // Pass both display and controls
    
    // Update controls with socket
    controls.socket = socketHandler.getSocket();
    
    // Connect to server as controls
    socketHandler.connectAsControls();
});
