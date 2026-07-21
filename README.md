# 🎲 Jambo — Jeu de dés multijoueur en temps réel

PWA multijoueur basée sur le jeu de dés camerounais **Jambo**. Jetons virtuels (MVP).

## Stack
- **Backend** : Node.js + Express + Socket.io (port 4000)
- **Frontend** : React + Vite + PWA (port 5173)

## Lancement en développement

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend (nouveau terminal)
```bash
cd frontend
npm install
npm run dev
```

Ouvrir **http://localhost:5173** dans plusieurs onglets/navigateurs pour tester le multijoueur.

## Règles du jeu
1. Un joueur crée une room et fixe la mise en jetons
2. Les autres rejoignent via le code de room
3. Chaque joueur confirme sa mise → la partie commence
4. Tour par tour, chaque joueur lance 2 dés (10s max, sinon auto-roll)
5. **Million** = dé1 et dé2 font 1 → victoire instantanée
6. Sinon, le joueur avec la somme la plus haute gagne
7. Égalité → nouvelle manche avec le même pot
8. Le gagnant reçoit le pot **moins 10% de commission**

## Structure
```
jambo/
├── backend/
│   ├── server.js
│   ├── src/
│   │   ├── sockets/gameSocket.js   # Logique temps réel + auto-roll
│   │   └── db/schema.sql           # Schéma PostgreSQL
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/        # Home, Lobby, Game
    │   ├── components/   # Die, DiceArea, PlayerList, ResultOverlay
    │   ├── socket.js     # Singleton Socket.io
    │   └── App.jsx       # Routeur principal
    └── vite.config.js
```
