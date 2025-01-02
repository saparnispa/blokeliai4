# Multiplayer Tetris

Real-time multiplayer Tetris game built with Node.js, Express, and Socket.IO.

## Features

- Real-time multiplayer gameplay
- Player queue system
- High scores tracking
- Mobile-friendly controls
- Dynamic speed progression
- Multiple difficulty levels
- Real-time game state synchronization

## Game Mechanics

- Starting speed: 500ms (0.5 seconds)
- 10 difficulty levels
- Speed increases with each level
- Level up every 10 cleared lines
- Maximum level: 10 (50ms drop speed)

## Technical Stack

- Backend: Node.js + Express
- Real-time communication: Socket.IO
- Frontend: Pure JavaScript, HTML5, CSS3
- Deployment: Render.com

## Installation

1. Clone the repository:
```bash
git clone https://github.com/saparnisp/tetris-one.git
Install dependencies:
Code
CopyInsert
npm install
Start the server:
Code
CopyInsert
npm start
Open in browser:
Local development: http://localhost:3019
Production: https://tetris-one.onrender.com
Development
Run with hot-reload:

Code
CopyInsert
npm run dev
Controls
← : Move Left
→ : Move Right
↓ : Soft Drop
↑ : Rotate
Space : Hard Drop
Deployment
The game is automatically deployed to Render.com when changes are pushed to the main branch.

Live version: https://tetris-one.onrender.com

License
MIT License


$ git add .

Ran terminal command
~/Downloads/tetris-main-2
$ git commit -m Pagreitintas žaidimas:
- Padidintas pradinis greitis iki 0.5s
- Pagreitinti visi lygiai
- Pašalintas index.html
- Controls.html nustatytas kaip pagrindinis puslapis


git add .

git commit -m Pagreitintas žaidimas:
- Padidintas pradinis greitis iki 0.5s
- Pagreitinti visi lygiai
- Pašalintas index.html
- Controls.html nustatytas kaip pagrindinis puslapis

git push origin master