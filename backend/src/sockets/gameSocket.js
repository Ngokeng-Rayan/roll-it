// ─────────────────────────────────────────────────────────────────────────────
// JAMBO — backend game socket (in-memory MVP)
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const rooms       = {};   // { [roomCode]: room }
const timers      = {};   // { [roomCode]: timeoutId }
const userSockets = {};   // { [userId]: socketId }

const TURN_TIMEOUT_MS = 10_000;
const ANIM_DURATION_MS = 1_800;

// ─── helpers ─────────────────────────────────────────────────────────────────

function rollDie() {
  return crypto.randomInt(1, 7);
}

function emitToUser(io, userId, event, data) {
  const socketId = userSockets[userId];
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
}

function broadcastRoom(io, room) {
  io.to(room.roomCode).emit('room:state', sanitizeRoom(room));
}

function sanitizeRoom(room) {
  const { players, ...rest } = room;
  return { ...rest, players };
}

function clearTurnTimer(roomCode) {
  if (timers[roomCode]) {
    clearTimeout(timers[roomCode]);
    delete timers[roomCode];
  }
}

// ─── turn timer ──────────────────────────────────────────────────────────────

function startTurnTimer(io, roomCode) {
  const room = rooms[roomCode];
  if (!room || room.status !== 'IN_PROGRESS') return;

  clearTurnTimer(roomCode);

  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer) return;

  io.to(roomCode).emit('turn:start', {
    playerId: currentPlayer.id,
    pseudo: currentPlayer.pseudo,
    timeoutMs: TURN_TIMEOUT_MS,
  });

  timers[roomCode] = setTimeout(() => {
    console.log(`[AUTO-ROLL] ${currentPlayer.pseudo} ran out of time`);
    doRoll(io, roomCode, currentPlayer.id);
  }, TURN_TIMEOUT_MS);
}

// ─── roll logic ──────────────────────────────────────────────────────────────

function doRoll(io, roomCode, playerId) {
  const room = rooms[roomCode];
  if (!room || room.status !== 'IN_PROGRESS') return;

  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return;
  if (currentPlayer.hasRolled) return;

  clearTurnTimer(roomCode);

  const dice1 = rollDie();
  const dice2 = rollDie();
  const score = dice1 + dice2;
  const isMillion = dice1 === 1 && dice2 === 1;

  io.to(roomCode).emit('dice:rolling', { playerId, pseudo: currentPlayer.pseudo });

  setTimeout(() => {
    currentPlayer.dice1 = dice1;
    currentPlayer.dice2 = dice2;
    currentPlayer.score = score;
    currentPlayer.isMillion = isMillion;
    currentPlayer.hasRolled = true;

    io.to(roomCode).emit('dice:result', {
      playerId,
      pseudo: currentPlayer.pseudo,
      dice1,
      dice2,
      score,
      isMillion,
    });

    if (isMillion) {
      finishGame(io, roomCode, currentPlayer);
    } else {
      setTimeout(() => {
        advanceTurn(io, roomCode);
      }, 3000);
    }
  }, ANIM_DURATION_MS);
}

// ─── turn advancement ─────────────────────────────────────────────────────────

function advanceTurn(io, roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.currentTurnIndex++;

  if (room.currentTurnIndex >= room.players.length) {
    resolveRound(io, roomCode);
  } else {
    broadcastRoom(io, room);
    startTurnTimer(io, roomCode);
  }
}

// ─── round resolution ─────────────────────────────────────────────────────────

function resolveRound(io, roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const maxScore = Math.max(...room.players.map(p => p.score));
  const topPlayers = room.players.filter(p => p.score === maxScore);

  if (topPlayers.length > 1) {
    room.status = 'CANCELLED_TIE';
    broadcastRoom(io, room);
    io.to(roomCode).emit('game:roundTie', {
      tiedPlayerIds: topPlayers.map(p => p.id),
      tiedPseudos: topPlayers.map(p => p.pseudo),
    });

    setTimeout(() => {
      room.roundNumber++;
      room.status = 'IN_PROGRESS';
      room.currentTurnIndex = 0;
      room.players.forEach(p => {
        p.hasRolled = false;
        p.score = 0;
        p.dice1 = null;
        p.dice2 = null;
        p.isMillion = false;
      });
      broadcastRoom(io, room);
      startTurnTimer(io, roomCode);
    }, 4000);
  } else {
    finishGame(io, roomCode, topPlayers[0]);
  }
}

// ─── finish game ──────────────────────────────────────────────────────────────

function finishGame(io, roomCode, winner) {
  const room = rooms[roomCode];
  if (!room) return;

  room.status = 'FINISHED';
  room.winnerId = winner.id;

  const commission = Math.floor(room.potTotal * 0.10);
  const netPayout = room.potTotal - commission;

  broadcastRoom(io, room);

  io.to(roomCode).emit('game:finished', {
    winnerId: winner.id,
    winnerPseudo: winner.pseudo,
    potTotal: room.potTotal,
    commission,
    netPayout,
    isMillion: winner.isMillion || false,
  });
}

// ─── leave room ───────────────────────────────────────────────────────────────

function removePlayerFromRoom(io, roomCode, userId, room) {
  const pIdx = room.players.findIndex(p => p.id === userId);
  if (pIdx === -1) return false;

  room.players.splice(pIdx, 1);

  if (room.players.length === 0) {
    clearTurnTimer(roomCode);
    delete rooms[roomCode];
    return true;
  }

  if (room.creatorId === userId) {
    room.creatorId = room.players[0].id;
  }

  room.players.forEach((p, i) => { p.turnOrder = i + 1; });
  return false;
}

// ─── reconnect helper ─────────────────────────────────────────────────────────

function rejoinActiveRooms(io, socket) {
  const userId = socket.userId;
  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    const player = room.players.find(p => p.id === userId);
    if (!player) continue;

    socket.join(roomCode);
    io.to(socket.id).emit('room:state', sanitizeRoom(room));

    if (room.status === 'IN_PROGRESS' && room.currentTurnIndex < room.players.length) {
      const currentPlayer = room.players[room.currentTurnIndex];
      if (currentPlayer && currentPlayer.id === userId && !currentPlayer.hasRolled) {
        io.to(socket.id).emit('turn:start', {
          playerId: currentPlayer.id,
          pseudo: currentPlayer.pseudo,
          timeoutMs: TURN_TIMEOUT_MS,
        });
      }
    }
  }
}

// ─── socket handlers ──────────────────────────────────────────────────────────

function initGameSocket(io, socket) {
  const userId = socket.userId;
  userSockets[userId] = socket.id;

  // Rejoin any active rooms
  rejoinActiveRooms(io, socket);

  // ── GET PUBLIC ROOMS ────────────────────────────────────────────────────────
  socket.on('room:list', () => {
    const publicRooms = Object.values(rooms)
      .filter(r => r.visibility === 'public' && r.status === 'LOBBY')
      .map(r => ({
        roomCode: r.roomCode,
        stakeAmount: r.stakeAmount,
        creatorPseudo: r.players[0]?.pseudo || '?',
        playerCount: r.players.length,
        players: r.players.map(p => ({ pseudo: p.pseudo, hasPaidStake: p.hasPaidStake })),
      }));
    socket.emit('room:list', publicRooms);
  });

  // ── CREATE ROOM ────────────────────────────────────────────────────────────
  socket.on('room:create', ({ stakeAmount, pseudo, visibility }) => {
    let roomCode;
    do {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (rooms[roomCode]);

    const room = {
      roomCode,
      stakeAmount: Number(stakeAmount) || 500,
      status: 'LOBBY',
      visibility: visibility === 'public' ? 'public' : 'private',
      players: [],
      potTotal: 0,
      roundNumber: 1,
      currentTurnIndex: 0,
      winnerId: null,
      creatorId: userId,
    };

    const player = {
      id: userId,
      pseudo: pseudo || 'Joueur',
      hasPaidStake: false,
      turnOrder: 1,
      dice1: null,
      dice2: null,
      score: 0,
      hasRolled: false,
      isMillion: false,
    };

    room.players.push(player);
    rooms[roomCode] = room;
    socket.join(roomCode);

    socket.emit('room:created', { roomCode });
    broadcastRoom(io, room);

    console.log(`[CREATE] ${pseudo} created room ${roomCode} (${room.visibility}, stake: ${stakeAmount})`);
  });

  // ── JOIN ROOM (private, by code) ───────────────────────────────────────────
  socket.on('room:join', ({ roomCode, pseudo }) => {
    const room = rooms[roomCode];
    if (!room) {
      return socket.emit('error', { message: `Room "${roomCode}" introuvable.` });
    }
    if (room.status !== 'LOBBY') {
      return socket.emit('error', { message: 'Cette partie a déjà commencé.' });
    }
    if (room.players.find(p => p.id === userId)) {
      return socket.emit('error', { message: 'Vous êtes déjà dans cette room.' });
    }

    const player = {
      id: userId,
      pseudo: pseudo || 'Joueur',
      hasPaidStake: false,
      turnOrder: room.players.length + 1,
      dice1: null,
      dice2: null,
      score: 0,
      hasRolled: false,
      isMillion: false,
    };

    room.players.push(player);
    socket.join(roomCode);
    broadcastRoom(io, room);

    console.log(`[JOIN] ${pseudo} (${userId}) joined room ${roomCode}`);
  });

  // ── JOIN PUBLIC ROOM ───────────────────────────────────────────────────────
  socket.on('room:joinPublic', ({ roomCode, pseudo }) => {
    const room = rooms[roomCode];
    if (!room) {
      return socket.emit('error', { message: 'Room introuvable.' });
    }
    if (room.visibility !== 'public') {
      return socket.emit('error', { message: 'Cette room n\'est pas publique.' });
    }
    if (room.status !== 'LOBBY') {
      return socket.emit('error', { message: 'Cette partie a déjà commencé.' });
    }
    if (room.players.find(p => p.id === userId)) {
      return socket.emit('error', { message: 'Vous êtes déjà dans cette room.' });
    }

    const player = {
      id: userId,
      pseudo: pseudo || 'Joueur',
      hasPaidStake: false,
      turnOrder: room.players.length + 1,
      dice1: null,
      dice2: null,
      score: 0,
      hasRolled: false,
      isMillion: false,
    };

    room.players.push(player);
    socket.join(roomCode);
    broadcastRoom(io, room);

    console.log(`[JOIN-PUBLIC] ${pseudo} (${userId}) joined room ${roomCode}`);
  });

  // ── LEAVE ROOM ─────────────────────────────────────────────────────────────
  socket.on('room:leave', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.status !== 'LOBBY') {
      return socket.emit('error', { message: 'Impossible de quitter une partie en cours.' });
    }

    const roomEmpty = removePlayerFromRoom(io, roomCode, userId, room);
    socket.leave(roomCode);

    if (roomEmpty) {
      console.log(`[LEAVE] Room ${roomCode} deleted (empty)`);
    } else {
      broadcastRoom(io, room);
    }

    socket.emit('room:left');
    console.log(`[LEAVE] ${userId} left room ${roomCode}`);
  });

  // ── CONFIRM STAKE ──────────────────────────────────────────────────────────
  socket.on('room:confirmStake', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error', { message: 'Room introuvable.' });
    if (room.status !== 'LOBBY') return;

    const player = room.players.find(p => p.id === userId);
    if (!player) return socket.emit('error', { message: 'Vous n\'êtes pas dans cette room.' });
    if (player.hasPaidStake) return;

    player.hasPaidStake = true;
    room.potTotal += room.stakeAmount;

    console.log(`[STAKE] ${player.pseudo} confirmed stake in ${roomCode} — pot: ${room.potTotal}`);

    broadcastRoom(io, room);
  });

  // ── FORCE START (creator only) ─────────────────────────────────────────────
  socket.on('room:forceStart', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error', { message: 'Room introuvable.' });
    if (room.creatorId !== userId) {
      return socket.emit('error', { message: 'Seul le créateur peut lancer la partie.' });
    }
    if (room.status !== 'LOBBY') return;

    const unpaidPlayers = room.players.filter(p => !p.hasPaidStake);
    unpaidPlayers.forEach(p => {
      emitToUser(io, p.id, 'room:left', {});
      const sId = userSockets[p.id];
      if (sId) {
        const sock = io.sockets.sockets.get(sId);
        if (sock) sock.leave(roomCode);
      }
    });

    room.players = room.players.filter(p => p.hasPaidStake);

    if (room.players.length < 2) {
      return socket.emit('error', { message: 'Il faut au moins 2 joueurs ayant payé pour lancer.' });
    }

    room.potTotal = room.players.length * room.stakeAmount;
    room.players.forEach((p, i) => { p.turnOrder = i + 1; });

    room.status = 'IN_PROGRESS';
    room.currentTurnIndex = 0;
    broadcastRoom(io, room);
    io.to(roomCode).emit('game:started');
    console.log(`[FORCE-START] Room ${roomCode} started with ${room.players.length} players`);
    startTurnTimer(io, roomCode);
  });

  // ── DICE ROLL ──────────────────────────────────────────────────────────────
  socket.on('dice:roll', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== userId) {
      return socket.emit('error', { message: 'Ce n\'est pas votre tour.' });
    }

    doRoll(io, roomCode, userId);
  });

  // ── REMATCH ────────────────────────────────────────────────────────────────
  socket.on('room:rematch', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.creatorId !== userId) {
      return socket.emit('error', { message: 'Seul le créateur peut relancer.' });
    }
    if (room.status !== 'FINISHED') {
      return socket.emit('error', { message: 'La partie n\'est pas terminée.' });
    }

    room.status = 'LOBBY';
    room.potTotal = 0;
    room.roundNumber = 1;
    room.currentTurnIndex = 0;
    room.winnerId = null;
    room.players.forEach(p => {
      p.hasPaidStake = false;
      p.hasRolled = false;
      p.dice1 = null;
      p.dice2 = null;
      p.score = 0;
      p.isMillion = false;
    });

    broadcastRoom(io, room);
    console.log(`[REMATCH] Room ${roomCode} reset by creator`);
  });

  // ── DISCONNECT ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    delete userSockets[userId];

    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const exists = room.players.find(p => p.id === userId);
      if (!exists) continue;

      if (room.status === 'LOBBY') {
        removePlayerFromRoom(io, roomCode, userId, room);
        if (rooms[roomCode]) broadcastRoom(io, room);
        else console.log(`[DC] Room ${roomCode} deleted (empty)`);
      } else if (room.status === 'IN_PROGRESS') {
        if (room.currentTurnIndex < room.players.length &&
            room.players[room.currentTurnIndex].id === userId) {
          clearTurnTimer(roomCode);
          doRoll(io, roomCode, userId);
        }
      }
      break;
    }
  });
}

module.exports = { initGameSocket };
