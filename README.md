# Tetris

Klasikinis Tetris žaidimas su eilės sistema - Classic Tetris game with a queue system.

## Apie projektą / About

Tai yra vieno žaidėjo Tetris žaidimas su eilės sistema. Žaidėjai gali prisijungti prie eilės ir žaisti savo ruožtu.

This is a single-player Tetris game with a queue system. Players can join the queue and take turns playing the game.

## Technologijos / Technologies

- Node.js (v20.x)
- Express.js
- Socket.IO
- Redis (rezultatų saugojimui / for score persistence)

## Projekto struktūra / Project Structure

```
├── public/                 # Statiniai failai / Static files
│   ├── controls.html      # Žaidimo valdymo sąsaja / Game controls
│   ├── display.html       # Žaidimo rodymo sąsaja / Game display
│   ├── scores.html        # Rezultatų rodymas / High scores
│   ├── style.css         # Stiliai / Global styles
│   ├── tetris.js         # Žaidimo logika / Game logic
│   ├── controls.js       # Valdymo logika / Controls logic
│   ├── display.js        # Rodymo logika / Display logic
│   └── scores.js         # Rezultatų logika / Scores logic
├── server.js             # Serverio failas / Server file
└── package.json          # Projekto priklausomybės / Dependencies
```

## Diegimas / Installation

1. Klonuokite repozitoriją / Clone the repository
2. Įdiekite priklausomybes / Install dependencies:
```bash
npm install
```

## Paleidimas / Running

Paleisti serverį lokaliai / Run the server locally:

```bash
npm start
```

Serveris pasileis 3000 prievade / Server will start on port 3000 (http://localhost:3000)

## Žaidimo valdymas / Game Controls

- ⬅️ Judėti kairėn / Move left
- ➡️ Judėti dešinėn / Move right
- ⬇️ Greitai leisti žemyn / Soft drop
- ⬆️ Pasukti / Rotate
- Tarpas / Space: Numesti / Hard drop

## Rezultatai / Scores

Geriausi rezultatai saugomi ir rodomi rezultatų puslapyje. Galite juos peržiūrėti paspaudę "Rezultatai" mygtuką.

High scores are saved and displayed on the scores page. You can view them by clicking the "Scores" button.
