require('dotenv').config();
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

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id} (user: ${socket.userId})`);
  initGameSocket(io, socket);
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id} (user: ${socket.userId})`);
  });
});

const PORT = process.env.PORT || 4000;

migrate()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🎲 Jambo server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
