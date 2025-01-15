import { GameDisplay } from './ui/display.js';
import { initControls } from './game/controls.js';
import { SocketHandler } from './socket/events.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize game components
    const display = new GameDisplay();
    const socketHandler = new SocketHandler(display);
    const controls = initControls(socketHandler.getSocket());
    
    // Update socket handler with controls
    socketHandler.controls = controls;
    
    // Connect to server as controls
    socketHandler.connectAsControls();
});
