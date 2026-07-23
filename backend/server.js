/**
 * server.js — Point d'entrée compatible Phusion Passenger (o2switch)
 *
 * Passenger démarre ce fichier et s'attend à ce que le serveur écoute
 * sur le port défini par la variable d'environnement PORT.
 * Si PORT n'est pas défini, on utilise 4000 (développement local).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { migrate } = require('./src/db/migrate');
const { socketAuth } = require('./src/middleware/auth');
const { initGameSocket } = require('./src/sockets/gameSocket');
const authRoutes = require('./src/routes/auth');

const app = express();
const server = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// En production, on restreint l'origine au seul sous-domaine autorisé.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://game.cdwfs.net']
  : ['http://localhost:5173', 'http://localhost:4000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// ─── ROUTES HTTP ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id} (user: ${socket.userId})`);
  initGameSocket(io, socket);
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id} (user: ${socket.userId})`);
  });
});

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────
// Passenger fixe automatiquement process.env.PORT.
// En local, on utilise 4000.
const PORT = process.env.PORT || 4000;

// On démarre le serveur d'abord, puis on tente la migration.
// Cela évite que Passenger voie un crash si la BDD est lente à répondre.
server.listen(PORT, () => {
  console.log(`🎲 Jambo server listening on port ${PORT}`);

  // Migration en arrière-plan — une erreur ne tue plus le process
  migrate()
    .then(() => console.log('[DB] Migration OK'))
    .catch((err) => console.error('[DB] Migration failed (server still running):', err.message));
});
