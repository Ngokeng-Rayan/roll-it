import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, disconnectSocket } from './socket';
import { useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import './index.css';

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, add };
}

export default function App() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const [view,         setView]         = useState('home');
  const [room,         setRoom]         = useState(null);
  const [myRoomCode,   setMyRoomCode]   = useState(null);

  const [rollingFor,   setRollingFor]   = useState(null);
  const [allDice,      setAllDice]      = useState({});
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [timeLeft,       setTimeLeft]       = useState(null);
  const timerRef = useRef(null);
  const [result, setResult] = useState(null);
  const viewRef = useRef(view);

  const { toasts, add: addToast } = useToasts();

  const isMyTurn = activePlayerId === user?.id && room?.status === 'IN_PROGRESS';
  const isRolling = rollingFor !== null;
  const isCreator = room?.creatorId === user?.id;

  const resetGameState = useCallback(() => {
    setResult(null);
    setAllDice({});
    setRollingFor(null);
    setActivePlayerId(null);
    setTimeLeft(null);
    clearInterval(timerRef.current);
  }, []);

  // ─── Socket wiring ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !user) return;

    const socket = getSocket();

    const handlers = {
      'room:created': ({ roomCode }) => {
        setMyRoomCode(roomCode);
      },

      'room:state': (updatedRoom) => {
        setRoom(updatedRoom);
        const currentView = viewRef.current;
        const newStatus = updatedRoom.status;
        if (newStatus === 'LOBBY' && currentView === 'game') {
          setView('lobby');
          resetGameState();
        }
        if (newStatus === 'IN_PROGRESS' && currentView !== 'game') {
          setView('game');
        }
      },

      'room:left': () => {
        setView('home');
        setRoom(null);
        resetGameState();
        setMyRoomCode(null);
      },

      'game:started': () => {
        setView('game');
        addToast('🎲 La partie commence !', 'success');
      },

      'turn:start': ({ playerId, pseudo, timeoutMs }) => {
        setActivePlayerId(playerId);
        setAllDice(prev => ({ ...prev, [playerId]: null }));

        const duration = timeoutMs / 1000;
        setTimeLeft(duration);
        clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return t - 1;
          });
        }, 1000);

        if (playerId !== user.id) {
          addToast(`Tour de ${pseudo}`, 'info');
        }
      },

      'dice:rolling': ({ playerId }) => {
        setRollingFor(playerId);
        clearInterval(timerRef.current);
        setTimeLeft(null);
      },

      'dice:result': ({ playerId, pseudo, dice1, dice2, score, isMillion }) => {
        setRollingFor(null);
        setAllDice(prev => ({
          ...prev,
          [playerId]: { dice1, dice2, score, isMillion },
        }));
        if (isMillion) {
          addToast(`💰 MILLION ! ${pseudo} gagne instantanément !`, 'warning');
        } else {
          addToast(`${pseudo} fait ${score} (${dice1}+${dice2})`, 'info');
        }
      },

      'game:roundTie': ({ tiedPseudos }) => {
        addToast(`⚖️ Égalité entre ${tiedPseudos.join(' et ')} ! Nouvelle manche…`, 'warning');
        setAllDice({});
        setActivePlayerId(null);
        setTimeLeft(null);
      },

      'game:finished': (data) => {
        clearInterval(timerRef.current);
        setTimeLeft(null);
        setActivePlayerId(null);
        setResult(data);
        addToast(`🏆 ${data.winnerPseudo} remporte la partie !`, 'success');
      },

      error: ({ message }) => {
        addToast(message, 'error');
      },
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));

    return () => {
      clearInterval(timerRef.current);
      Object.keys(handlers).forEach(ev => socket.off(ev, handlers[ev]));
    };
  }, [token, user, addToast, resetGameState]);

  viewRef.current = view;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(({ pseudo, stakeAmount, visibility }) => {
    const socket = getSocket();
    socket.emit('room:create', { stakeAmount, pseudo, visibility });
    setView('lobby');
    resetGameState();
  }, [resetGameState]);

  const handleJoinRoom = useCallback(({ pseudo, roomCode }) => {
    const socket = getSocket();
    const code = roomCode.toUpperCase();
    setMyRoomCode(code);
    socket.emit('room:join', { roomCode: code, pseudo });
    setView('lobby');
    resetGameState();
  }, [resetGameState]);

  const handleJoinPublic = useCallback(({ pseudo, roomCode }) => {
    const socket = getSocket();
    setMyRoomCode(roomCode);
    socket.emit('room:joinPublic', { roomCode, pseudo });
    setView('lobby');
    resetGameState();
  }, [resetGameState]);

  const handleLeaveRoom = useCallback(() => {
    const code = myRoomCode || room?.roomCode;
    if (!code) return;
    getSocket().emit('room:leave', { roomCode: code });
  }, [myRoomCode, room]);

  const handleForceStart = useCallback(() => {
    const code = myRoomCode || room?.roomCode;
    if (!code) return;
    getSocket().emit('room:forceStart', { roomCode: code });
  }, [myRoomCode, room]);

  const handleConfirmStake = useCallback(() => {
    const code = myRoomCode || room?.roomCode;
    if (!code) return;
    getSocket().emit('room:confirmStake', { roomCode: code });
  }, [myRoomCode, room]);

  const handleRoll = useCallback(() => {
    const code = myRoomCode || room?.roomCode;
    if (!code || !isMyTurn || isRolling) return;
    getSocket().emit('dice:roll', { roomCode: code });
  }, [myRoomCode, room, isMyTurn, isRolling]);

  const handleRematch = useCallback(() => {
    const code = myRoomCode || room?.roomCode;
    if (!code) return;
    getSocket().emit('room:rematch', { roomCode: code });
    setResult(null);
  }, [myRoomCode, room]);

  const handleHome = useCallback(() => {
    setView('home');
    setRoom(null);
    resetGameState();
    setMyRoomCode(null);
  }, [resetGameState]);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    logout();
    handleHome();
  }, [handleHome, logout]);

  // ─── Loading / Auth gate ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
      }}>
        <div className="pulse" style={{ fontSize: '2rem' }}>🎲</div>
        <p className="text-muted">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {view === 'home' && (
        <Home
          user={user}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onJoinPublic={handleJoinPublic}
          onLogout={handleLogout}
        />
      )}
      {view === 'lobby' && (
        <Lobby
          room={room}
          userId={user.id}
          isCreator={isCreator}
          onConfirmStake={handleConfirmStake}
          onLeaveRoom={handleLeaveRoom}
          onForceStart={handleForceStart}
        />
      )}
      {view === 'game' && (
        <Game
          room={room}
          myId={user.id}
          isMyTurn={isMyTurn}
          isCreator={isCreator}
          rollingFor={rollingFor}
          allDice={allDice}
          activePlayerId={activePlayerId}
          timeLeft={timeLeft}
          result={result}
          onRoll={handleRoll}
          onHome={handleHome}
          onRematch={handleRematch}
        />
      )}

      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  );
}
